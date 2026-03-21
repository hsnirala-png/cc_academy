import {
  AiMessageRole,
  Prisma,
  TuitionDifficultyMode,
  TuitionSessionStatus,
  TuitionSpeedMode,
} from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { buildTuitionAssistantReply, createTuitionAiProvider } from "./tuition-ai.provider";
import { tuitionProfileService } from "./tuition-profile.service";
import { tuitionProgressService } from "./tuition-progress.service";
import { tuitionSyllabusService } from "./tuition-syllabus.service";

const sessionInclude = {
  syllabusChapter: {
    include: {
      syllabus: true,
    },
  },
  profile: {
    include: {
      board: true,
      subject: true,
    },
  },
  messages: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.TuitionSessionInclude;

type TuitionSessionRecord = Prisma.TuitionSessionGetPayload<{
  include: typeof sessionInclude;
}>;

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const normalizeSpeedMode = (value: string | null | undefined): TuitionSpeedMode => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === TuitionSpeedMode.SLOW) return TuitionSpeedMode.SLOW;
  if (normalized === TuitionSpeedMode.FAST) return TuitionSpeedMode.FAST;
  return TuitionSpeedMode.NORMAL;
};

const normalizeDifficultyMode = (value: string | null | undefined): TuitionDifficultyMode => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === TuitionDifficultyMode.EASY) return TuitionDifficultyMode.EASY;
  if (normalized === TuitionDifficultyMode.HARD) return TuitionDifficultyMode.HARD;
  return TuitionDifficultyMode.MEDIUM;
};

const serializeMessage = (message: {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: Date;
}) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
});

const serializeSession = (
  session: TuitionSessionRecord
) => ({
  id: session.id,
  title: session.title,
  status: session.status,
  speedMode: session.speedMode,
  difficultyMode: session.difficultyMode,
  responseLanguage: session.responseLanguage,
  chapter: {
    id: session.syllabusChapter.id,
    title: session.syllabusChapter.name,
    syllabusId: session.syllabusChapter.syllabusId,
    syllabusTitle: session.syllabusChapter.syllabus.title,
  },
  profile: {
    id: session.profile.id,
    boardCode: session.profile.board?.code || null,
    boardName: session.profile.board?.name || null,
    classLevel: session.profile.classLevel ?? null,
    subjectCode: session.profile.subject?.code || null,
    subjectName: session.profile.subject?.name || null,
    preferredLanguage: session.profile.preferredLanguage || null,
  },
  messages: session.messages.map(serializeMessage),
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const resolveOwnedSession = async (userId: string, chapterId: string, sessionId: string) => {
  const session = await prisma.tuitionSession.findFirst({
    where: {
      id: sessionId,
      userId,
      syllabusChapterId: chapterId,
    },
    include: sessionInclude,
  });

  if (!session) {
    throw new AppError("Tuition session was not found.", 404);
  }

  return session;
};

export const tuitionAiService = {
  async getBootstrapMeta() {
    return {
      phase: "phase-2",
      teaching: "text-first",
      provider: createTuitionAiProvider(),
      whiteboard: "not-enabled",
    };
  },

  async createOrResumeSession(
    userId: string,
    syllabusChapterId: string,
    input: {
      speedMode?: string | null;
      difficultyMode?: string | null;
      responseLanguage?: string | null;
      resume?: boolean;
    }
  ) {
    const chapter = await tuitionSyllabusService.resolveOwnedChapter(userId, syllabusChapterId);
    const profile = await tuitionProfileService.getOrCreateProfile(userId);
    const speedMode = normalizeSpeedMode(input.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode);
    const responseLanguage = normalizeOptionalText(
      input.responseLanguage || profile.preferredLanguage || "ENGLISH"
    );
    const shouldResume = input.resume !== false;

    let session =
      shouldResume
        ? await prisma.tuitionSession.findFirst({
            where: {
              userId,
              syllabusChapterId,
              status: {
                in: [TuitionSessionStatus.ACTIVE, TuitionSessionStatus.PAUSED],
              },
            },
            orderBy: { updatedAt: "desc" },
            include: sessionInclude,
          })
        : null;

    if (session) {
      session = await prisma.tuitionSession.update({
        where: { id: session.id },
        data: {
          status: TuitionSessionStatus.ACTIVE,
          speedMode,
          difficultyMode,
          responseLanguage,
          title: chapter.name,
        },
        include: sessionInclude,
      });
    } else {
      session = await prisma.tuitionSession.create({
        data: {
          userId,
          profileId: profile.id,
          syllabusChapterId,
          title: chapter.name,
          speedMode,
          difficultyMode,
          responseLanguage,
          status: TuitionSessionStatus.ACTIVE,
        },
        include: sessionInclude,
      });
    }

    const progress = await tuitionProgressService.markSessionStarted(userId, syllabusChapterId, session.id);

    return {
      session: serializeSession(session),
      progress,
      provider: createTuitionAiProvider(),
    };
  },

  async getSession(userId: string, syllabusChapterId: string, sessionId: string) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const progress = await tuitionProgressService.getChapterProgress(userId, syllabusChapterId);
    return {
      session: serializeSession(session),
      progress,
      provider: createTuitionAiProvider(),
    };
  },

  async sendMessage(
    userId: string,
    syllabusChapterId: string,
    sessionId: string,
    input: {
      content: string;
      responseLanguage?: string | null;
      speedMode?: string | null;
      difficultyMode?: string | null;
    }
  ) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const content = String(input.content || "").trim();
    if (!content) {
      throw new AppError("Message content is required.", 400);
    }

    const responseLanguage = normalizeOptionalText(
      input.responseLanguage || session.responseLanguage || session.profile.preferredLanguage || "ENGLISH"
    );
    const speedMode = normalizeSpeedMode(input.speedMode || session.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode || session.difficultyMode);

    await prisma.tuitionSession.update({
      where: { id: session.id },
      data: {
        status: TuitionSessionStatus.ACTIVE,
        responseLanguage,
        speedMode,
        difficultyMode,
      },
    });

    await prisma.tuitionMessage.create({
      data: {
        sessionId: session.id,
        role: AiMessageRole.USER,
        content,
      },
    });

    const refreshed = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const assistantContent = buildTuitionAssistantReply({
      boardName: refreshed.profile.board?.name || null,
      classLevel: refreshed.profile.classLevel,
      subjectName: refreshed.profile.subject?.name || null,
      chapterName: refreshed.syllabusChapter.name,
      responseLanguage,
      speedMode,
      difficultyMode,
      studentPrompt: content,
      messageNumber: refreshed.messages.length + 1,
    });

    const assistantMessage = await prisma.tuitionMessage.create({
      data: {
        sessionId: refreshed.id,
        role: AiMessageRole.ASSISTANT,
        content: assistantContent,
        contextSnapshotJson: {
          boardCode: refreshed.profile.board?.code || null,
          classLevel: refreshed.profile.classLevel,
          subjectCode: refreshed.profile.subject?.code || null,
          syllabusChapterId: refreshed.syllabusChapter.id,
        },
      },
    });

    const updatedSession = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const progress = await tuitionProgressService.bumpForMessage(userId, syllabusChapterId, sessionId);

    return {
      session: serializeSession(updatedSession),
      assistantMessage: serializeMessage(assistantMessage),
      progress,
      provider: createTuitionAiProvider(),
    };
  },

  async getPhaseStatus() {
    return this.getBootstrapMeta();
  },
};
