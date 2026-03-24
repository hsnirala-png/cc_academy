import {
  Prisma,
  TuitionDifficultyMode,
  TuitionHomeworkStatus,
  TuitionSpeedMode,
} from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { tuitionAiService } from "./tuition-ai.service";
import { tuitionProfileService } from "./tuition-profile.service";
import { tuitionProgressService } from "./tuition-progress.service";
import { tuitionSyllabusService } from "./tuition-syllabus.service";

const homeworkInclude = {
  profile: {
    include: {
      board: true,
      subject: true,
    },
  },
  syllabusChapter: {
    include: {
      syllabus: true,
    },
  },
  session: {
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  submissions: {
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.TuitionHomeworkInclude;

type HomeworkRecord = Prisma.TuitionHomeworkGetPayload<{
  include: typeof homeworkInclude;
}>;

type HomeworkSubmissionRecord = Prisma.TuitionHomeworkSubmissionGetPayload<{}>;

const normalizeOptionalText = (value: string | null | undefined): string | null =>
  String(value || "").trim() || null;

const serializeSubmission = (submission: HomeworkSubmissionRecord) => ({
  id: submission.id,
  answerPayload: submission.answerPayload,
  notes: submission.notes || null,
  evaluationPayload: submission.evaluationPayload || null,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
});

const serializeHomework = (homework: HomeworkRecord) => ({
  id: homework.id,
  title: homework.title,
  instructions: homework.instructions || null,
  status: homework.status,
  speedMode: homework.speedMode,
  difficultyMode: homework.difficultyMode,
  responseLanguage: homework.responseLanguage || null,
  assignmentPayload: homework.assignmentPayload,
  sourceContextJson: homework.sourceContextJson || null,
  chapter: {
    id: homework.syllabusChapter.id,
    title: homework.syllabusChapter.name,
    syllabusId: homework.syllabusChapter.syllabusId,
    syllabusTitle: homework.syllabusChapter.syllabus.title,
  },
  profile: {
    id: homework.profile.id,
    boardCode: homework.profile.board?.code || null,
    boardName: homework.profile.board?.name || null,
    classLevel: homework.profile.classLevel ?? null,
    subjectCode: homework.profile.subject?.code || null,
    subjectName: homework.profile.subject?.name || null,
    preferredLanguage: homework.profile.preferredLanguage || null,
  },
  session: homework.session
    ? {
        id: homework.session.id,
        title: homework.session.title,
        status: homework.session.status,
        speedMode: homework.session.speedMode,
        difficultyMode: homework.session.difficultyMode,
        responseLanguage: homework.session.responseLanguage,
        messageCount: homework.session.messages.length,
      }
    : null,
  latestSubmission: homework.submissions[0] ? serializeSubmission(homework.submissions[0]) : null,
  submissionCount: homework.submissions.length,
  submissions: homework.submissions.map(serializeSubmission),
  createdAt: homework.createdAt,
  updatedAt: homework.updatedAt,
});

const resolveOwnedHomework = async (userId: string, homeworkId: string) => {
  const homework = await prisma.tuitionHomework.findFirst({
    where: {
      id: homeworkId,
      userId,
    },
    include: homeworkInclude,
  });

  if (!homework) {
    throw new AppError("Tuition homework was not found.", 404);
  }

  return homework;
};

const resolveOwnedSessionForHomework = async (
  userId: string,
  syllabusChapterId: string,
  sessionId?: string | null
) => {
  if (sessionId) {
    const session = await prisma.tuitionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        syllabusChapterId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 6,
        },
      },
    });

    if (!session) {
      throw new AppError("Selected tuition session was not found for this chapter.", 404);
    }

    return session;
  }

  return prisma.tuitionSession.findFirst({
    where: {
      userId,
      syllabusChapterId,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 6,
      },
    },
  });
};

export const tuitionHomeworkService = {
  async generateHomework(
    userId: string,
    syllabusChapterId: string,
    input: {
      sessionId?: string | null;
      responseLanguage?: string | null;
      speedMode?: string | null;
      difficultyMode?: string | null;
    }
  ) {
    const chapter = await tuitionSyllabusService.resolveOwnedChapter(userId, syllabusChapterId);
    const profile = await tuitionProfileService.getOrCreateProfile(userId);

    const session = await resolveOwnedSessionForHomework(userId, syllabusChapterId, input.sessionId);
    const speedMode = tuitionAiService.normalizeSpeedMode(input.speedMode || session?.speedMode);
    const difficultyMode = tuitionAiService.normalizeDifficultyMode(
      input.difficultyMode || session?.difficultyMode
    );
    const responseLanguage = tuitionAiService.normalizeOptionalText(
      input.responseLanguage || session?.responseLanguage || profile.preferredLanguage || "ENGLISH"
    );

    const recentMessages = (session?.messages || [])
      .slice(-4)
      .map((message) => String(message.content || "").trim())
      .filter(Boolean);

    const homeworkPayload = tuitionAiService.buildHomeworkPayload({
      boardName: profile.board?.name || null,
      classLevel: profile.classLevel,
      subjectName: profile.subject?.name || null,
      chapterName: chapter.name,
      responseLanguage,
      speedMode,
      difficultyMode,
      recentMessages,
    });

    const homework = await prisma.tuitionHomework.create({
      data: {
        userId,
        profileId: profile.id,
        syllabusChapterId,
        sessionId: session?.id || null,
        title: homeworkPayload.title,
        instructions: homeworkPayload.instructions,
        speedMode,
        difficultyMode,
        responseLanguage,
        status: TuitionHomeworkStatus.GENERATED,
        assignmentPayload: homeworkPayload,
        sourceContextJson: {
          recentMessages,
          sessionId: session?.id || null,
          responseLanguage,
          speedMode,
          difficultyMode,
        },
      },
      include: homeworkInclude,
    });

    return serializeHomework(homework);
  },

  async listHomework(userId: string) {
    const homework = await prisma.tuitionHomework.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: homeworkInclude,
      take: 20,
    });

    return homework.map(serializeHomework);
  },

  async getHomework(userId: string, homeworkId: string) {
    const homework = await resolveOwnedHomework(userId, homeworkId);
    return serializeHomework(homework);
  },

  async submitHomework(
    userId: string,
    homeworkId: string,
    input: {
      answers: Array<{
        questionId: string;
        response: string;
      }>;
      notes?: string | null;
    }
  ) {
    const homework = await resolveOwnedHomework(userId, homeworkId);
    if (!input.answers.length) {
      throw new AppError("Add at least one homework answer before submitting.", 400);
    }

    const submission = await prisma.tuitionHomeworkSubmission.create({
      data: {
        homeworkId: homework.id,
        userId,
        answerPayload: {
          answers: input.answers.map((item) => ({
            questionId: String(item.questionId || "").trim(),
            response: String(item.response || "").trim(),
          })),
        },
        notes: normalizeOptionalText(input.notes),
      },
    });

    await prisma.tuitionHomework.update({
      where: { id: homework.id },
      data: {
        status: TuitionHomeworkStatus.SUBMITTED,
      },
    });

    const progress = await tuitionProgressService.bumpForHomeworkSubmission(
      userId,
      homework.syllabusChapterId
    );

    const refreshed = await resolveOwnedHomework(userId, homeworkId);

    return {
      homework: serializeHomework(refreshed),
      submission: serializeSubmission(submission),
      progress,
    };
  },
};
