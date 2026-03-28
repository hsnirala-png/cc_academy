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
  title?: string | null;
  chapterTitle: string;
  topicTitle?: string | null;
  subjectName?: string | null;
  explanationLanguage?: string | null;
  boardLanguage?: string | null;
  voiceLanguage?: string | null;
  curriculumBoard?: string | null;
  recapPoints?: string[];
  nextSuggestedAction?: string | null;
  progressUpdate?: string | null;
  practiceQuestion?: string | null;
  diagramInstructions?: string[];
  boardTitle?: string | null;
  boardLines?: string[];
  formulas?: string[];
  steps?: string[];
  exampleTitle?: string | null;
  exampleSteps?: string[];
  teacherMode?: string | null;
  speechChunks?: Array<{
    id: string;
    kind: string;
    text: string;
  }>;
  boardActions?: Array<{
    id: string;
    type: string;
    lane: string;
    text?: string | null;
    label?: string | null;
    targetId?: string | null;
    fromLabel?: string | null;
    toLabel?: string | null;
    accent?: string | null;
  }>;
  teachingSteps?: Array<{
    id: string;
    title: string;
    speechChunkId?: string | null;
    actionIds: string[];
    autoDelayMs?: number | null;
  }>;
};

type AssistantSpeechChunk = NonNullable<AssistantPayload["speechChunks"]>[number];
type AssistantBoardAction = NonNullable<AssistantPayload["boardActions"]>[number];
type AssistantTeachingStep = NonNullable<AssistantPayload["teachingSteps"]>[number];

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

const normalizeSessionTitle = (value: string | null | undefined): string =>
  String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

const normalizeTeachingLanguageCode = (value: string | null | undefined): "ENGLISH" | "HINDI" | "PUNJABI" => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "HINDI") return "HINDI";
  if (normalized === "PUNJABI") return "PUNJABI";
  return "ENGLISH";
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
  const toSpeechChunks = (
    input: unknown
  ): AssistantSpeechChunk[] =>
    Array.isArray(input)
      ? input
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const candidateItem = item as Record<string, unknown>;
            const text = String(candidateItem.text || "").trim();
            if (!text) return null;
            return {
              id: String(candidateItem.id || `speech-${index + 1}`).trim() || `speech-${index + 1}`,
              kind: String(candidateItem.kind || "EXPLAIN").trim() || "EXPLAIN",
              text,
            };
          })
          .filter(Boolean) as AssistantSpeechChunk[]
      : [];
  const toBoardActions = (
    input: unknown
  ): AssistantBoardAction[] =>
    Array.isArray(input)
      ? input
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const action = item as Record<string, unknown>;
            const type = String(action.type || "").trim();
            const lane = String(action.lane || "").trim();
            if (!type || !lane) return null;
            return {
              id: String(action.id || `action-${index + 1}`).trim() || `action-${index + 1}`,
              type,
              lane,
              text: String(action.text || "").trim() || null,
              label: String(action.label || "").trim() || null,
              targetId: String(action.targetId || "").trim() || null,
              fromLabel: String(action.fromLabel || "").trim() || null,
              toLabel: String(action.toLabel || "").trim() || null,
              accent: String(action.accent || "").trim() || null,
            };
          })
          .filter(Boolean) as AssistantBoardAction[]
      : [];
  const toTeachingSteps = (
    input: unknown
  ): AssistantTeachingStep[] =>
    Array.isArray(input)
      ? input
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const step = item as Record<string, unknown>;
            const title = String(step.title || "").trim();
            const actionIds = toStringArray(step.actionIds);
            if (!title || !actionIds.length) return null;
            const autoDelayMs = Number(step.autoDelayMs);
            return {
              id: String(step.id || `teaching-step-${index + 1}`).trim() || `teaching-step-${index + 1}`,
              title,
              speechChunkId: String(step.speechChunkId || "").trim() || null,
              actionIds,
              autoDelayMs: Number.isFinite(autoDelayMs) && autoDelayMs > 0 ? autoDelayMs : null,
            };
          })
          .filter(Boolean) as AssistantTeachingStep[]
      : [];
  return {
    replyText,
    title: String(candidate.title || "").trim() || null,
    chapterTitle,
    topicTitle: String(candidate.topicTitle || "").trim() || null,
    subjectName: String(candidate.subjectName || "").trim() || null,
    explanationLanguage: String(candidate.explanationLanguage || "").trim() || null,
    boardLanguage: String(candidate.boardLanguage || "").trim() || null,
    voiceLanguage: String(candidate.voiceLanguage || "").trim() || null,
    curriculumBoard: String(candidate.curriculumBoard || "").trim() || null,
    recapPoints: toStringArray(candidate.recapPoints),
    nextSuggestedAction: String(candidate.nextSuggestedAction || "").trim() || null,
    progressUpdate: String(candidate.progressUpdate || "").trim() || null,
    practiceQuestion: String(candidate.practiceQuestion || "").trim() || null,
    diagramInstructions: toStringArray(candidate.diagramInstructions),
    boardTitle: String(candidate.boardTitle || "").trim() || null,
    boardLines: toStringArray(candidate.boardLines),
    formulas: toStringArray(candidate.formulas),
    steps: toStringArray(candidate.steps),
    exampleTitle: String(candidate.exampleTitle || "").trim() || null,
    exampleSteps: toStringArray(candidate.exampleSteps),
    teacherMode: String(candidate.teacherMode || "").trim() || null,
    speechChunks: toSpeechChunks(candidate.speechChunks),
    boardActions: toBoardActions(candidate.boardActions),
    teachingSteps: toTeachingSteps(candidate.teachingSteps),
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

const serializeSession = (session: TuitionSessionRecord) => {
  const latestAssistant =
    [...session.messages]
      .reverse()
      .map((message) => serializeMessage(message).structured)
      .find(Boolean) || null;
  const chapterTitle = session.syllabusChapter.name;
  const topicTitle = latestAssistant?.topicTitle || latestAssistant?.title || session.title || chapterTitle;
  const explanationLanguage = normalizeTeachingLanguageCode(
    latestAssistant?.explanationLanguage || session.responseLanguage || session.profile.preferredLanguage || "ENGLISH"
  );
  const boardLanguage = normalizeTeachingLanguageCode(
    latestAssistant?.boardLanguage || latestAssistant?.explanationLanguage || explanationLanguage
  );
  const voiceLanguage = normalizeTeachingLanguageCode(
    latestAssistant?.voiceLanguage || latestAssistant?.explanationLanguage || explanationLanguage
  );
  return {
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
    teacherContext: {
      subject: latestAssistant?.subjectName || session.profile.subject?.name || null,
      topic: topicTitle,
      explanationLanguage,
      boardLanguage,
      voiceLanguage,
      curriculumBoard: latestAssistant?.curriculumBoard || session.profile.board?.name || null,
    },
    messages: session.messages.map(serializeMessage),
    chapterContext: {
      boardName: session.profile.board?.name || null,
      classLevel: session.profile.classLevel ?? null,
      subjectName: session.profile.subject?.name || null,
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

const resolveTeacherContext = (input: {
  boardName?: string | null;
  preferredLanguage?: string | null;
  subjectName?: string | null;
  chapterTitle: string;
  responseLanguage?: string | null;
  explanationLanguage?: string | null;
  boardLanguage?: string | null;
  voiceLanguage?: string | null;
  subject?: string | null;
  topic?: string | null;
  curriculumBoard?: string | null;
}) => {
  const explanationLanguage = normalizeTeachingLanguageCode(
    input.explanationLanguage || input.responseLanguage || input.preferredLanguage || "ENGLISH"
  );
  const boardLanguage = normalizeTeachingLanguageCode(input.boardLanguage || explanationLanguage);
  const voiceLanguage = normalizeTeachingLanguageCode(input.voiceLanguage || explanationLanguage);
  return {
    subjectName: normalizeOptionalText(input.subject || input.subjectName),
    topicTitle: normalizeOptionalText(input.topic) || input.chapterTitle,
    explanationLanguage,
    boardLanguage,
    voiceLanguage,
    curriculumBoard: normalizeOptionalText(input.curriculumBoard || input.boardName),
  };
};

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
      whiteboard: "live-board-mvp",
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
      explanationLanguage?: string | null;
      boardLanguage?: string | null;
      voiceLanguage?: string | null;
      subject?: string | null;
      topic?: string | null;
      curriculumBoard?: string | null;
      resume?: boolean;
    }
  ) {
    const chapter = await tuitionSyllabusService.resolveOwnedChapter(userId, syllabusChapterId);
    const profile = await tuitionProfileService.getOrCreateProfile(userId);
    const speedMode = normalizeSpeedMode(input.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode);
    const teacherContext = resolveTeacherContext({
      boardName: profile.board?.name || null,
      preferredLanguage: profile.preferredLanguage,
      subjectName: profile.subject?.name || null,
      chapterTitle: chapter.name,
      ...input,
    });
    const responseLanguage = teacherContext.explanationLanguage;
    const shouldResume = input.resume !== false;

    let session =
      shouldResume
        ? await prisma.tuitionSession.findFirst({
            where: {
              userId,
              syllabusChapterId,
              title: teacherContext.topicTitle,
              status: {
                in: [TuitionSessionStatus.ACTIVE, TuitionSessionStatus.PAUSED],
              },
            },
            orderBy: { updatedAt: "desc" },
            include: sessionInclude,
          })
        : null;

    if (!session && shouldResume) {
      session = await prisma.tuitionSession.findFirst({
        where: {
          userId,
          syllabusChapterId,
          status: {
            in: [TuitionSessionStatus.ACTIVE, TuitionSessionStatus.PAUSED],
          },
        },
        orderBy: { updatedAt: "desc" },
        include: sessionInclude,
      });

      if (session && normalizeSessionTitle(session.title) !== normalizeSessionTitle(teacherContext.topicTitle)) {
        session = null;
      }
    }

    if (session) {
      session = await prisma.tuitionSession.update({
        where: { id: session.id },
        data: {
          status: TuitionSessionStatus.ACTIVE,
          speedMode,
          difficultyMode,
          responseLanguage,
          title: teacherContext.topicTitle,
        },
        include: sessionInclude,
      });
    } else {
      session = await prisma.tuitionSession.create({
        data: {
          userId,
          profileId: profile.id,
          syllabusChapterId,
          title: teacherContext.topicTitle,
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
      explanationLanguage?: string | null;
      boardLanguage?: string | null;
      voiceLanguage?: string | null;
      subject?: string | null;
      topic?: string | null;
      curriculumBoard?: string | null;
      speedMode?: string | null;
      difficultyMode?: string | null;
    }
  ) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const content = String(input.content || "").trim();
    if (!content) {
      throw new AppError("Message content is required.", 400);
    }

    const teacherContext = resolveTeacherContext({
      boardName: session.profile.board?.name || null,
      preferredLanguage: session.profile.preferredLanguage,
      subjectName: session.profile.subject?.name || null,
      chapterTitle: session.syllabusChapter.name,
      responseLanguage: session.responseLanguage,
      ...input,
    });
    const responseLanguage = teacherContext.explanationLanguage;
    const speedMode = normalizeSpeedMode(input.speedMode || session.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode || session.difficultyMode);

    await prisma.tuitionSession.update({
      where: { id: session.id },
      data: {
        status: TuitionSessionStatus.ACTIVE,
        responseLanguage,
        speedMode,
        difficultyMode,
        title: teacherContext.topicTitle,
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
    const assistantPayload = await buildTuitionTeacherAssistantPayload({
      boardName: refreshed.profile.board?.name || null,
      classLevel: refreshed.profile.classLevel,
      subjectName: teacherContext.subjectName || refreshed.profile.subject?.name || null,
      topicTitle: teacherContext.topicTitle,
      explanationLanguage: teacherContext.explanationLanguage,
      boardLanguage: teacherContext.boardLanguage,
      voiceLanguage: teacherContext.voiceLanguage,
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
          teacherContext,
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
      explanationLanguage?: string | null;
      boardLanguage?: string | null;
      voiceLanguage?: string | null;
      subject?: string | null;
      topic?: string | null;
      curriculumBoard?: string | null;
      speedMode?: string | null;
      difficultyMode?: string | null;
    }
  ) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const teacherContext = resolveTeacherContext({
      boardName: session.profile.board?.name || null,
      preferredLanguage: session.profile.preferredLanguage,
      subjectName: session.profile.subject?.name || null,
      chapterTitle: session.syllabusChapter.name,
      responseLanguage: session.responseLanguage,
      ...input,
    });
    const responseLanguage = teacherContext.explanationLanguage;
    const speedMode = normalizeSpeedMode(input.speedMode || session.speedMode);
    const difficultyMode = normalizeDifficultyMode(input.difficultyMode || session.difficultyMode);

    const updatedSession = await prisma.tuitionSession.update({
      where: { id: session.id },
      data: {
        status: TuitionSessionStatus.ACTIVE,
        responseLanguage,
        speedMode,
        difficultyMode,
        title: teacherContext.topicTitle,
      },
      include: sessionInclude,
    });

    const voicePayload = await tuitionAiProvider.createVoiceSession({
      context: {
        boardName: updatedSession.profile.board?.name || null,
        classLevel: updatedSession.profile.classLevel,
        subjectName: teacherContext.subjectName || updatedSession.profile.subject?.name || null,
        topicTitle: teacherContext.topicTitle,
        syllabusTitle: updatedSession.syllabusChapter.syllabus.title,
        voiceLanguage: teacherContext.voiceLanguage,
      },
      voiceLanguage: teacherContext.voiceLanguage,
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
