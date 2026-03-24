import {
  Prisma,
  TuitionDifficultyMode,
  TuitionSessionStatus,
  TuitionSpeedMode,
} from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import {
  buildTuitionTeacherAssistantPayload,
  tuitionAiProvider,
} from "./tuition-ai.provider";
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

type AssistantPayload = {
  replyText: string;
  chapterTitle: string;
  recapPoints?: string[];
  nextSuggestedAction?: string | null;
  progressUpdate?: string | null;
  boardTitle?: string | null;
  boardLines?: string[];
  formulas?: string[];
  steps?: string[];
  exampleTitle?: string | null;
  exampleSteps?: string[];
};

type HomeworkTask = {
  id: string;
  type: string;
  prompt: string;
  expectedFormat: string;
  scaffolding?: string[];
};

type HomeworkPayload = {
  title: string;
  chapterTitle: string;
  subjectName: string | null;
  responseLanguage: string;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  instructions: string;
  tasks: HomeworkTask[];
  recapPoints: string[];
  submissionTip?: string | null;
};

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

const toAssistantPayload = (value: unknown): AssistantPayload | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const replyText = String(candidate.replyText || "").trim();
  const chapterTitle = String(candidate.chapterTitle || "").trim();
  if (!replyText || !chapterTitle) return null;
  const toStringArray = (input: unknown): string[] =>
    Array.isArray(input) ? input.map((item) => String(item || "").trim()).filter(Boolean) : [];
  return {
    replyText,
    chapterTitle,
    recapPoints: toStringArray(candidate.recapPoints),
    nextSuggestedAction: String(candidate.nextSuggestedAction || "").trim() || null,
    progressUpdate: String(candidate.progressUpdate || "").trim() || null,
    boardTitle: String(candidate.boardTitle || "").trim() || null,
    boardLines: toStringArray(candidate.boardLines),
    formulas: toStringArray(candidate.formulas),
    steps: toStringArray(candidate.steps),
    exampleTitle: String(candidate.exampleTitle || "").trim() || null,
    exampleSteps: toStringArray(candidate.exampleSteps),
  };
};

const serializeMessage = (message: {
  id: string;
  role: string;
  content: string;
  contextSnapshotJson?: Prisma.JsonValue | null;
  createdAt: Date;
}) => {
  const context =
    message.contextSnapshotJson && typeof message.contextSnapshotJson === "object"
      ? (message.contextSnapshotJson as Record<string, unknown>)
      : null;
  const assistant = toAssistantPayload(context?.assistant);
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    structured: assistant,
  };
};

const serializeSession = (session: TuitionSessionRecord) => ({
  id: session.id,
  title: session.title,
  status: session.status,
  speedMode: session.speedMode,
  difficultyMode: session.difficultyMode,
  responseLanguage: session.responseLanguage,
  messageCount: session.messages.length,
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
  chapterContext: {
    boardName: session.profile.board?.name || null,
    classLevel: session.profile.classLevel ?? null,
    subjectName: session.profile.subject?.name || null,
  },
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

const speedNotes: Record<TuitionSpeedMode, string> = {
  SLOW: "Explain in smaller steps and pause after each idea.",
  NORMAL: "Keep the explanation balanced and practical.",
  FAST: "Keep the explanation compact and move quickly to application.",
};

const difficultyNotes: Record<TuitionDifficultyMode, string> = {
  EASY: "Use simpler words, direct examples, and one-step practice.",
  MEDIUM: "Use standard school-level depth with one worked example.",
  HARD: "Include deeper reasoning, an extra comparison, and a tougher practice prompt.",
};

const buildHomeworkPayload = (input: {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  chapterName: string;
  responseLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  recentMessages?: string[];
}): HomeworkPayload => {
  const language = String(input.responseLanguage || "ENGLISH").trim().toUpperCase();
  const classText = input.classLevel ? `Class ${input.classLevel}` : "school";
  const boardText = input.boardName ? `${input.boardName} ` : "";
  const subjectName = input.subjectName || null;
  const subjectText = String(subjectName || "General Studies").trim();
  const recapPoints = [
    `Stay inside the chapter "${input.chapterName}".`,
    speedNotes[input.speedMode],
    difficultyNotes[input.difficultyMode],
  ];
  const recentFocus = (input.recentMessages || [])
    .map((message) => String(message || "").trim())
    .filter(Boolean)
    .slice(-2);
  if (recentFocus.length) {
    recapPoints.push(`Recent class focus: ${recentFocus.join(" | ")}`);
  }

  const taskCount =
    input.speedMode === TuitionSpeedMode.SLOW
      ? 5
      : input.speedMode === TuitionSpeedMode.FAST
        ? input.difficultyMode === TuitionDifficultyMode.HARD
          ? 3
          : 2
        : input.difficultyMode === TuitionDifficultyMode.HARD
          ? 4
          : 3;

  const buildScaffolding = (type: string): string[] => {
    if (input.speedMode !== TuitionSpeedMode.SLOW) return [];
    if (type === "guided_practice") {
      return [
        "Start with one textbook fact from the chapter.",
        "Add one example from class or daily life.",
        "Finish with one concluding line.",
      ];
    }
    if (type === "application") {
      return [
        "Identify the idea from the chapter first.",
        "Explain how it fits the situation.",
      ];
    }
    return ["Keep the answer short and chapter-specific."];
  };

  const buildPromptByType = (type: string): string => {
    if (subjectText.toUpperCase() === "SCIENCE" || subjectText.toUpperCase() === "MATHS") {
      if (type === "concept_check") {
        return `Write the main idea of ${input.chapterName} in ${input.difficultyMode === TuitionDifficultyMode.EASY ? "2-3 simple lines" : "4-5 clear lines"}.`;
      }
      if (type === "guided_practice") {
        return input.difficultyMode === TuitionDifficultyMode.HARD
          ? `Solve one reasoning-based practice question from ${input.chapterName} and justify each step.`
          : `Answer one direct practice question from ${input.chapterName} with the method or explanation used.`;
      }
      if (type === "application") {
        return `Give one real-life example where the idea from ${input.chapterName} is used and explain why it fits.`;
      }
      return `List ${input.difficultyMode === TuitionDifficultyMode.HARD ? "two comparisons or cause-effect links" : "two key takeaways"} from ${input.chapterName}.`;
    }

    if (["ENGLISH", "HINDI", "PUNJABI"].includes(subjectText.toUpperCase())) {
      if (type === "concept_check") {
        return `Summarize the topic from ${input.chapterName} in your own words.`;
      }
      if (type === "guided_practice") {
        return input.difficultyMode === TuitionDifficultyMode.HARD
          ? `Write a short paragraph using the core idea from ${input.chapterName} and explain your word choice.`
          : `Write 4-5 sentences using the key idea from ${input.chapterName}.`;
      }
      if (type === "application") {
        return `Give one example sentence or short response that applies the chapter idea in a daily-life situation.`;
      }
      return `List important words, meanings, or expressions from ${input.chapterName} and use at least one in a sentence.`;
    }

    if (type === "concept_check") {
      return `Explain the key point of ${input.chapterName} in a short answer.`;
    }
    if (type === "guided_practice") {
      return input.difficultyMode === TuitionDifficultyMode.HARD
        ? `Write a deeper reasoning answer connected to ${input.chapterName}.`
        : `Write one standard textbook answer from ${input.chapterName}.`;
    }
    if (type === "application") {
      return `Connect the chapter idea from ${input.chapterName} to a current or daily-life example.`;
    }
    return `List important facts or comparisons from ${input.chapterName}.`;
  };

  const taskTypes = ["concept_check", "guided_practice", "application", "recap", "reflection"];
  const tasks = Array.from({ length: taskCount }, (_, index) => {
    const type = taskTypes[index] || "practice";
    return {
      id: `task-${index + 1}`,
      type,
      prompt: buildPromptByType(type),
      expectedFormat:
        type === "guided_practice"
          ? input.difficultyMode === TuitionDifficultyMode.HARD
            ? "Step-by-step answer with reasoning"
            : "Short answer with one worked explanation"
          : type === "application"
            ? "Example plus explanation"
            : "Short written response",
      scaffolding: buildScaffolding(type),
    };
  });

  return {
    title: `${input.chapterName} Homework`,
    chapterTitle: input.chapterName,
    subjectName,
    responseLanguage: language,
    speedMode: input.speedMode,
    difficultyMode: input.difficultyMode,
    instructions:
      `Complete this ${boardText}${classText} ${subjectText} homework in ${language}. ` +
      `Keep every answer tied to ${input.chapterName}. ${speedNotes[input.speedMode]} ${difficultyNotes[input.difficultyMode]}`,
    tasks,
    recapPoints,
    submissionTip:
      input.difficultyMode === TuitionDifficultyMode.HARD
        ? "Show your reasoning, not just the final answer."
        : "Keep the answers clear, neat, and focused on the chapter idea.",
  };
};

const formatAssistantContent = (payload: AssistantPayload) =>
  [
    payload.replyText,
    payload.recapPoints?.length ? `Recap:\n- ${payload.recapPoints.join("\n- ")}` : "",
    payload.boardTitle ? `Board focus: ${payload.boardTitle}` : "",
    payload.nextSuggestedAction ? `Next step: ${payload.nextSuggestedAction}` : "",
    payload.progressUpdate ? `Progress: ${payload.progressUpdate}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

export const tuitionAiService = {
  async getBootstrapMeta() {
    return {
      phase: "phase-6",
      teaching: "text-first",
      provider: {
        provider: "tuition-openai-realtime-ready",
        model: String(process.env.OPENAI_REALTIME_MODEL || "gpt-realtime").trim() || "gpt-realtime",
        mode: "text-and-voice",
      },
      board: "enabled",
      whiteboard: "not-enabled",
      homework: "enabled",
      voice: "enabled",
    };
  },

  normalizeSpeedMode,
  normalizeDifficultyMode,
  normalizeOptionalText,

  buildHomeworkPayload(input: {
    boardName?: string | null;
    classLevel?: number | null;
    subjectName?: string | null;
    chapterName: string;
    responseLanguage?: string | null;
    speedMode: TuitionSpeedMode;
    difficultyMode: TuitionDifficultyMode;
    recentMessages?: string[];
  }) {
    return buildHomeworkPayload(input);
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
      resumed: shouldResume && Boolean(session.messages.length || session.updatedAt > session.createdAt),
      provider: await this.getBootstrapMeta(),
    };
  },

  async getSession(userId: string, syllabusChapterId: string, sessionId: string) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const progress = await tuitionProgressService.getChapterProgress(userId, syllabusChapterId);
    return {
      session: serializeSession(session),
      progress,
      provider: await this.getBootstrapMeta(),
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
        role: "USER",
        content,
      },
    });

    const refreshed = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const assistantPayload = buildTuitionTeacherAssistantPayload({
      boardName: refreshed.profile.board?.name || null,
      classLevel: refreshed.profile.classLevel,
      subjectName: refreshed.profile.subject?.name || null,
      chapterTitle: refreshed.syllabusChapter.name,
      responseLanguage,
      speedMode,
      difficultyMode,
      studentPrompt: content,
      messageNumber: refreshed.messages.length + 1,
    });

    const progress = await tuitionProgressService.bumpForMessage(userId, syllabusChapterId, sessionId);
    assistantPayload.progressUpdate = tuitionProgressService.formatProgressUpdate(progress);

    const assistantMessage = await prisma.tuitionMessage.create({
      data: {
        sessionId: refreshed.id,
        role: "ASSISTANT",
        content: formatAssistantContent(assistantPayload),
        contextSnapshotJson: {
          boardCode: refreshed.profile.board?.code || null,
          classLevel: refreshed.profile.classLevel,
          subjectCode: refreshed.profile.subject?.code || null,
          syllabusChapterId: refreshed.syllabusChapter.id,
          assistant: assistantPayload,
        },
      },
    });

    const updatedSession = await resolveOwnedSession(userId, syllabusChapterId, sessionId);

    return {
      session: serializeSession(updatedSession),
      assistantMessage: serializeMessage(assistantMessage),
      progress,
      provider: await this.getBootstrapMeta(),
    };
  },

  async createVoiceSession(
    userId: string,
    syllabusChapterId: string,
    sessionId: string,
    input: {
      responseLanguage?: string | null;
      speedMode?: string | null;
      difficultyMode?: string | null;
    }
  ) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const responseLanguage = normalizeOptionalText(
      input.responseLanguage || session.responseLanguage || session.profile.preferredLanguage || "ENGLISH"
    );
    const speedMode = normalizeSpeedMode(input.speedMode || session.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode || session.difficultyMode);

    const updatedSession = await prisma.tuitionSession.update({
      where: { id: session.id },
      data: {
        status: TuitionSessionStatus.ACTIVE,
        responseLanguage,
        speedMode,
        difficultyMode,
      },
      include: sessionInclude,
    });

    const voicePayload = await tuitionAiProvider.createVoiceSession({
      context: {
        boardName: updatedSession.profile.board?.name || null,
        classLevel: updatedSession.profile.classLevel,
        subjectName: updatedSession.profile.subject?.name || null,
        chapterTitle: updatedSession.syllabusChapter.name,
        syllabusTitle: updatedSession.syllabusChapter.syllabus.title,
      },
      responseLanguage,
      speedMode,
      difficultyMode,
    });

    return {
      clientSecret: voicePayload.clientSecret,
      expiresAt: voicePayload.expiresAt,
      session: {
        ...voicePayload.session,
        tuitionSessionId: updatedSession.id,
        chapterId: updatedSession.syllabusChapter.id,
      },
      context: {
        ...voicePayload.context,
        tuitionSessionId: updatedSession.id,
      },
      provider: await this.getBootstrapMeta(),
    };
  },
};
