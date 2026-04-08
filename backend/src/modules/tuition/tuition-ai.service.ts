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
import {
  generateSpeechMp3Buffer,
  transcribeMp3WithTimestamps,
  type TimedTranscriptItem,
} from "../../services/openaiTts";
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
  teachingDepth?: string | null;
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
  teacherIntro?: string | null;
  teacherExplanation?: string | null;
  teacherCheckQuestion?: string | null;
  boardState?: {
    title?: string | null;
    currentConcept?: string | null;
    anchors?: string[];
    formula?: string | null;
    example?: string | null;
    diagramLabels?: string[];
    recapKeywords?: string[];
    highlight?: string | null;
  } | null;
  teacherState?: {
    currentTeachingPhase?: string | null;
    currentConcept?: string | null;
    currentConceptIndex?: number | null;
    pausedForStudentQuestion?: boolean;
    resumePoint?: number | null;
    currentConversationTurn?: number | null;
    selectedLanguage?: string | null;
    teachingDepth?: string | null;
  } | null;
  interactionHints?: string[];
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

type TuitionTeacherSpeechTrack = {
  engine: "openai_tts_whisper_word_timestamps";
  syncType: "exact_timestamp_words";
  mimeType: "audio/mpeg";
  audioBase64: string;
  sourceText: string;
  words: TimedTranscriptItem[];
  segments: TimedTranscriptItem[];
  language: "ENGLISH" | "HINDI" | "PUNJABI";
  messageId: string;
};

type TeacherContextSnapshot = ReturnType<typeof resolveTeacherContext>;
type PromotedLessonDoubtInsight = {
  questionText: string;
  clarificationText: string;
  occurrenceCount: number;
  importanceScore: number;
};

const PROMOTED_DOUBT_MIN_OCCURRENCES = 2;
const PROMOTED_DOUBT_MIN_IMPORTANCE = 4;
const PROMOTED_DOUBT_LIMIT = 3;

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const normalized = String(value || "").normalize("NFC").trim();
  return normalized || null;
};

const normalizeSessionTitle = (value: string | null | undefined): string =>
  String(value || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const normalizeCacheKeyPart = (value: string | number | null | undefined): string =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

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

const normalizeTeachingDepth = (value: string | null | undefined): "BASIC" | "MODERATE" | "ADVANCED" => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "ADVANCED") return "ADVANCED";
  return "MODERATE";
};

const isTeacherCommandPrompt = (value: string | null | undefined): boolean =>
  /^__.*TUITION_AI_TEACHER__$/i.test(String(value || "").trim());

const getPromptType = (value: string | null | undefined): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "EMPTY";
  if (normalized === "__START_TUITION_AI_TEACHER__") return "START";
  if (normalized === "__CONTINUE_TUITION_AI_TEACHER__") return "CONTINUE";
  if (normalized === "__REPEAT_TUITION_AI_TEACHER__") return "REPEAT";
  if (normalized === "__SIMPLER_TUITION_AI_TEACHER__") return "SIMPLER";
  if (normalized === "__EXAMPLE_TUITION_AI_TEACHER__") return "EXAMPLE";
  if (normalized === "__CHECK_TUITION_AI_TEACHER__") return "CHECK";
  return "DOUBT";
};

const buildLessonCacheKey = (input: {
  syllabusChapterId?: string | null;
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  topicTitle: string;
  explanationLanguage: string;
  boardLanguage: string;
  voiceLanguage: string;
  teachingDepth: string;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  promptType: string;
  promptText: string;
  previousTeachingPhase?: string | null;
  previousConceptIndex?: number | null;
}) =>
  [
    normalizeCacheKeyPart(input.syllabusChapterId),
    normalizeCacheKeyPart(input.boardName),
    normalizeCacheKeyPart(input.classLevel),
    normalizeCacheKeyPart(input.subjectName),
    normalizeCacheKeyPart(input.topicTitle),
    normalizeCacheKeyPart(input.explanationLanguage),
    normalizeCacheKeyPart(input.boardLanguage),
    normalizeCacheKeyPart(input.voiceLanguage),
    normalizeCacheKeyPart(input.teachingDepth),
    normalizeCacheKeyPart(input.speedMode),
    normalizeCacheKeyPart(input.difficultyMode),
    normalizeCacheKeyPart(input.promptType),
    normalizeCacheKeyPart(input.previousTeachingPhase),
    normalizeCacheKeyPart(input.previousConceptIndex),
    normalizeCacheKeyPart(input.promptText),
  ].join("|");

const buildDoubtInsightKey = (input: {
  syllabusChapterId?: string | null;
  subjectName?: string | null;
  topicTitle: string;
  explanationLanguage: string;
  boardLanguage: string;
  voiceLanguage: string;
  teachingDepth: string;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  questionText: string;
  previousTeachingPhase?: string | null;
  previousConceptIndex?: number | null;
}) =>
  [
    normalizeCacheKeyPart(input.syllabusChapterId),
    normalizeCacheKeyPart(input.subjectName),
    normalizeCacheKeyPart(input.topicTitle),
    normalizeCacheKeyPart(input.explanationLanguage),
    normalizeCacheKeyPart(input.boardLanguage),
    normalizeCacheKeyPart(input.voiceLanguage),
    normalizeCacheKeyPart(input.teachingDepth),
    normalizeCacheKeyPart(input.speedMode),
    normalizeCacheKeyPart(input.difficultyMode),
    normalizeCacheKeyPart(input.previousTeachingPhase),
    normalizeCacheKeyPart(input.previousConceptIndex),
    normalizeCacheKeyPart(input.questionText),
  ].join("|");

const buildImportanceScore = (questionText: string, occurrenceCount: number): number => {
  const normalized = String(questionText || "").toLowerCase();
  let score = Math.max(1, occurrenceCount);
  if (/[?]|why|how|difference|compare|reason|concept|explain|doubt|क्यों|कैसे|अंतर|समझ|ਫਰਕ|ਕਿਉਂ|ਕਿਵੇਂ/u.test(normalized)) {
    score += 2;
  }
  if (normalized.length > 80) {
    score += 1;
  }
  return score;
};

const toStringArray = (input: unknown): string[] =>
  Array.isArray(input) ? input.map((item) => String(item || "").trim()).filter(Boolean) : [];

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toAssistantPayload = (value: unknown): AssistantPayload | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const replyText = String(candidate.replyText || "").trim();
  const chapterTitle = String(candidate.chapterTitle || "").trim();
  if (!replyText || !chapterTitle) return null;
  const toBoardState = (input: unknown): AssistantPayload["boardState"] => {
    if (!input || typeof input !== "object") return null;
    const candidateState = input as Record<string, unknown>;
    return {
      title: String(candidateState.title || "").trim() || null,
      currentConcept: String(candidateState.currentConcept || "").trim() || null,
      anchors: toStringArray(candidateState.anchors),
      formula: String(candidateState.formula || "").trim() || null,
      example: String(candidateState.example || "").trim() || null,
      diagramLabels: toStringArray(candidateState.diagramLabels),
      recapKeywords: toStringArray(candidateState.recapKeywords),
      highlight: String(candidateState.highlight || "").trim() || null,
    };
  };
  const toTeacherState = (input: unknown): AssistantPayload["teacherState"] => {
    if (!input || typeof input !== "object") return null;
    const candidateState = input as Record<string, unknown>;
    return {
      currentTeachingPhase: String(candidateState.currentTeachingPhase || "").trim() || null,
      currentConcept: String(candidateState.currentConcept || "").trim() || null,
      currentConceptIndex: toFiniteNumber(candidateState.currentConceptIndex),
      pausedForStudentQuestion: Boolean(candidateState.pausedForStudentQuestion),
      resumePoint: toFiniteNumber(candidateState.resumePoint),
      currentConversationTurn: toFiniteNumber(candidateState.currentConversationTurn),
      selectedLanguage: String(candidateState.selectedLanguage || "").trim() || null,
      teachingDepth: String(candidateState.teachingDepth || "").trim() || null,
    };
  };
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
    teachingDepth: String(candidate.teachingDepth || "").trim() || null,
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
    teacherIntro: String(candidate.teacherIntro || "").trim() || null,
    teacherExplanation: String(candidate.teacherExplanation || "").trim() || null,
    teacherCheckQuestion: String(candidate.teacherCheckQuestion || "").trim() || null,
    boardState: toBoardState(candidate.boardState),
    teacherState: toTeacherState(candidate.teacherState),
    interactionHints: toStringArray(candidate.interactionHints),
    speechChunks: toSpeechChunks(candidate.speechChunks),
    boardActions: toBoardActions(candidate.boardActions),
    teachingSteps: toTeachingSteps(candidate.teachingSteps),
  };
};

const toOpenAiLanguageHint = (value: string | null | undefined): "en" | "hi" | "pa" => {
  const normalized = normalizeTeachingLanguageCode(value);
  if (normalized === "HINDI") return "hi";
  if (normalized === "PUNJABI") return "pa";
  return "en";
};

const buildTeacherSpeechSourceText = (assistant: AssistantPayload): string =>
  [assistant.teacherIntro, assistant.teacherExplanation, assistant.teacherCheckQuestion]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ");

const tuitionSpeechTrackCache = new Map<string, TuitionTeacherSpeechTrack>();
const tuitionSpeechTrackPendingCache = new Map<string, Promise<TuitionTeacherSpeechTrack>>();

const buildSpeechTrackCacheKey = (
  messageId: string,
  voiceLanguage: TuitionTeacherSpeechTrack["language"],
  sourceText: string
) => `${messageId}:${voiceLanguage}:${sourceText}`;

const createSpeechTrack = async (input: {
  messageId: string;
  sourceText: string;
  voiceLanguage: TuitionTeacherSpeechTrack["language"];
}): Promise<TuitionTeacherSpeechTrack> => {
  const audioBuffer = await generateSpeechMp3Buffer(input.sourceText, {
    model: process.env.OPENAI_TUITION_SYNC_TTS_MODEL || process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TUITION_SYNC_TTS_VOICE || process.env.OPENAI_REALTIME_VOICE || "marin",
    languageHint: toOpenAiLanguageHint(input.voiceLanguage),
  });

  const timing = await transcribeMp3WithTimestamps(audioBuffer, input.sourceText, {
    mimeType: "audio/mpeg",
    fileName: `tuition-teacher-${input.messageId}.mp3`,
    languageHint: toOpenAiLanguageHint(input.voiceLanguage),
  });

  if (!timing.words.length) {
    throw new AppError(
      "Exact speech sync is blocked because word timestamps were not returned for this teacher explanation.",
      422,
      "TUITION_TEACHER_WORD_TIMESTAMPS_MISSING"
    );
  }

  return {
    engine: "openai_tts_whisper_word_timestamps",
    syncType: "exact_timestamp_words",
    mimeType: "audio/mpeg",
    audioBase64: audioBuffer.toString("base64"),
    sourceText: input.sourceText,
    words: timing.words,
    segments: timing.segments,
    language: input.voiceLanguage,
    messageId: input.messageId,
  };
};

const getOrCreateSpeechTrack = async (input: {
  messageId: string;
  sourceText: string;
  voiceLanguage: TuitionTeacherSpeechTrack["language"];
}) => {
  const cacheKey = buildSpeechTrackCacheKey(input.messageId, input.voiceLanguage, input.sourceText);
  const cached = tuitionSpeechTrackCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const pending =
    tuitionSpeechTrackPendingCache.get(cacheKey) ||
    createSpeechTrack(input)
      .then((speechTrack) => {
        tuitionSpeechTrackCache.set(cacheKey, speechTrack);
        tuitionSpeechTrackPendingCache.delete(cacheKey);
        return speechTrack;
      })
      .catch((error) => {
        tuitionSpeechTrackPendingCache.delete(cacheKey);
        throw error;
      });
  tuitionSpeechTrackPendingCache.set(cacheKey, pending);
  return pending;
};

const prewarmSpeechTrackForAssistant = (input: {
  messageId: string;
  assistantPayload: AssistantPayload;
  fallbackLanguage?: string | null;
}) => {
  const sourceText = buildTeacherSpeechSourceText(input.assistantPayload);
  if (!sourceText) return;
  const voiceLanguage = normalizeTeachingLanguageCode(
    input.assistantPayload.voiceLanguage ||
      input.assistantPayload.explanationLanguage ||
      input.fallbackLanguage ||
      "ENGLISH"
  );
  void getOrCreateSpeechTrack({
    messageId: input.messageId,
    sourceText,
    voiceLanguage,
  }).catch(() => {
    // Warmup should never fail the main teacher response path.
  });
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

const firstNonEmptySentence = (value: string | null | undefined): string => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const parts = normalized.split(/(?<=[.!?।॥])\s+/u).filter(Boolean);
  const first = String(parts[0] || normalized).trim();
  if (first.length <= 220) return first;
  return `${first.slice(0, 217).trim()}...`;
};

const buildPromotedDoubtExplanation = (
  languageCode: string | null | undefined,
  questionText: string,
  clarificationText: string
): string => {
  const safeQuestion = String(questionText || "").replace(/\s+/g, " ").trim();
  const safeClarification = String(clarificationText || "").replace(/\s+/g, " ").trim();
  const normalizedLanguage = normalizeTeachingLanguageCode(languageCode);
  if (normalizedLanguage === "HINDI") {
    return `यहाँ एक आम शंका यह होती है: ${safeQuestion} ${safeClarification}`.trim();
  }
  if (normalizedLanguage === "PUNJABI") {
    return `ਇੱਥੇ ਵਿਦਿਆਰਥੀਆਂ ਦਾ ਇੱਕ ਆਮ ਸ਼ੱਕ ਇਹ ਹੁੰਦਾ ਹੈ: ${safeQuestion} ${safeClarification}`.trim();
  }
  return `A common student doubt here is: ${safeQuestion} ${safeClarification}`.trim();
};

const buildPromotedDoubtHint = (languageCode: string | null | undefined, questionText: string): string => {
  const safeQuestion = String(questionText || "").replace(/\s+/g, " ").trim();
  const normalizedLanguage = normalizeTeachingLanguageCode(languageCode);
  if (normalizedLanguage === "HINDI") {
    return `अगर यह शंका अभी भी है, तो पूछो: ${safeQuestion}`;
  }
  if (normalizedLanguage === "PUNJABI") {
    return `ਜੇ ਇਹ ਸ਼ੱਕ ਅਜੇ ਵੀ ਹੈ, ਤਾਂ ਪੁੱਛੋ: ${safeQuestion}`;
  }
  return `If this still feels unclear, ask: ${safeQuestion}`;
};

const enrichAssistantPayloadWithPromotedDoubts = (
  assistantPayload: AssistantPayload,
  promotedDoubts: PromotedLessonDoubtInsight[]
): AssistantPayload => {
  if (!promotedDoubts.length) {
    return assistantPayload;
  }

  const topDoubt = promotedDoubts[0];
  const promotedExplanation = buildPromotedDoubtExplanation(
    assistantPayload.explanationLanguage,
    topDoubt.questionText,
    topDoubt.clarificationText
  );
  const existingExplanation = String(assistantPayload.teacherExplanation || "").trim();
  const shouldAppendExplanation =
    Boolean(existingExplanation) &&
    !existingExplanation.includes(topDoubt.questionText) &&
    !existingExplanation.includes(topDoubt.clarificationText);
  const interactionHints = Array.from(
    new Set([
      ...(Array.isArray(assistantPayload.interactionHints) ? assistantPayload.interactionHints : []),
      ...promotedDoubts.slice(0, 2).map((doubt) =>
        buildPromotedDoubtHint(assistantPayload.explanationLanguage, doubt.questionText)
      ),
    ].filter(Boolean))
  ).slice(0, 6);

  return {
    ...assistantPayload,
    teacherExplanation: shouldAppendExplanation
      ? `${existingExplanation} ${promotedExplanation}`.trim()
      : assistantPayload.teacherExplanation,
    interactionHints,
  };
};

const serializeMessages = (messages: TuitionSessionRecord["messages"]) => messages.map(serializeMessage);

const findLatestStructuredAssistant = (messages: TuitionSessionRecord["messages"]) =>
  [...messages]
    .reverse()
    .map((message) => serializeMessage(message).structured)
    .find(Boolean) || null;

const findPreviousStructuredAssistant = (messages: TuitionSessionRecord["messages"]) =>
  [...messages]
    .reverse()
    .filter((message) => message.role === "ASSISTANT")
    .map((message) => serializeMessage(message).structured)
    .find(Boolean) || null;

const getAssistantCacheContext = (input: {
  refreshed: TuitionSessionRecord;
  teacherContext: TeacherContextSnapshot;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  content: string;
  previousAssistant: AssistantPayload | null;
}) => ({
  profileId: input.refreshed.profile.id,
  syllabusChapterId: input.refreshed.syllabusChapter.id,
  boardName: input.refreshed.profile.board?.name || null,
  classLevel: input.refreshed.profile.classLevel ?? null,
  subjectName: input.teacherContext.subjectName || input.refreshed.profile.subject?.name || null,
  topicTitle: input.teacherContext.topicTitle,
  explanationLanguage: input.teacherContext.explanationLanguage,
  boardLanguage: input.teacherContext.boardLanguage,
  voiceLanguage: input.teacherContext.voiceLanguage,
  teachingDepth: input.teacherContext.teachingDepth,
  speedMode: input.speedMode,
  difficultyMode: input.difficultyMode,
  promptType: getPromptType(input.content),
  promptText: input.content,
  previousTeachingPhase: input.previousAssistant?.teacherState?.currentTeachingPhase || null,
  previousConceptIndex: input.previousAssistant?.teacherState?.currentConceptIndex ?? null,
});

const findReusableLessonCache = async (input: ReturnType<typeof getAssistantCacheContext>) =>
  prisma.tuitionLessonCache.findUnique({
    where: {
      normalizedCacheKey: buildLessonCacheKey(input),
    },
  });

const findPromotedLessonDoubts = async (input: {
  refreshed: TuitionSessionRecord;
  teacherContext: TeacherContextSnapshot;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
}) => {
  const doubts = await prisma.tuitionLessonDoubt.findMany({
    where: {
      syllabusChapterId: input.refreshed.syllabusChapter.id,
      subjectName: input.teacherContext.subjectName || input.refreshed.profile.subject?.name || "General Studies",
      topicTitle: input.teacherContext.topicTitle,
      explanationLanguage: input.teacherContext.explanationLanguage,
      boardLanguage: input.teacherContext.boardLanguage,
      voiceLanguage: input.teacherContext.voiceLanguage,
      teachingDepth: input.teacherContext.teachingDepth,
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      occurrenceCount: { gte: PROMOTED_DOUBT_MIN_OCCURRENCES },
      importanceScore: { gte: PROMOTED_DOUBT_MIN_IMPORTANCE },
    },
    orderBy: [{ importanceScore: "desc" }, { occurrenceCount: "desc" }, { updatedAt: "desc" }],
    take: PROMOTED_DOUBT_LIMIT,
  });

  return doubts
    .map((doubt) => {
      const answerPayload = toAssistantPayload(doubt.answerPayloadJson);
      const clarificationText = firstNonEmptySentence(
        answerPayload?.teacherExplanation ||
          answerPayload?.boardState?.currentConcept ||
          answerPayload?.replyText ||
          ""
      );
      if (!clarificationText) return null;
      return {
        questionText: String(doubt.questionText || "").trim(),
        clarificationText,
        occurrenceCount: doubt.occurrenceCount,
        importanceScore: doubt.importanceScore,
      } satisfies PromotedLessonDoubtInsight;
    })
    .filter(Boolean) as PromotedLessonDoubtInsight[];
};

const promoteLessonDoubtsIntoCaches = async (input: {
  refreshed: TuitionSessionRecord;
  teacherContext: TeacherContextSnapshot;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
}) => {
  const promotedDoubts = await findPromotedLessonDoubts(input);
  if (!promotedDoubts.length) {
    return 0;
  }

  const caches = await prisma.tuitionLessonCache.findMany({
    where: {
      syllabusChapterId: input.refreshed.syllabusChapter.id,
      subjectName: input.teacherContext.subjectName || input.refreshed.profile.subject?.name || "General Studies",
      topicTitle: input.teacherContext.topicTitle,
      explanationLanguage: input.teacherContext.explanationLanguage,
      boardLanguage: input.teacherContext.boardLanguage,
      voiceLanguage: input.teacherContext.voiceLanguage,
      teachingDepth: input.teacherContext.teachingDepth,
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      promptType: { in: ["START", "CONTINUE", "REPEAT", "EXAMPLE", "CHECK"] },
    },
    select: {
      id: true,
      assistantPayloadJson: true,
      boardPayloadJson: true,
    },
  });

  if (!caches.length) {
    return 0;
  }

  await Promise.all(
    caches.map(async (cache) => {
      const assistantPayload = toAssistantPayload(cache.assistantPayloadJson);
      if (!assistantPayload) return;
      const enrichedPayload = enrichAssistantPayloadWithPromotedDoubts(assistantPayload, promotedDoubts);
      await prisma.tuitionLessonCache.update({
        where: { id: cache.id },
        data: {
          assistantPayloadJson: enrichedPayload as Prisma.InputJsonValue,
          boardPayloadJson: (enrichedPayload.boardState || cache.boardPayloadJson || null) as Prisma.InputJsonValue,
          lastUsedAt: new Date(),
        },
      });
    })
  );

  return caches.length;
};

const saveLessonCache = async (
  input: ReturnType<typeof getAssistantCacheContext>,
  assistantPayload: AssistantPayload
) => {
  const normalizedCacheKey = buildLessonCacheKey(input);
  return prisma.tuitionLessonCache.upsert({
    where: { normalizedCacheKey },
    update: {
      assistantPayloadJson: assistantPayload as Prisma.InputJsonValue,
      boardPayloadJson: (assistantPayload.boardState || null) as Prisma.InputJsonValue,
      promptText: input.promptText,
      promptType: input.promptType,
      previousTeachingPhase: input.previousTeachingPhase,
      previousConceptIndex: input.previousConceptIndex,
      lastUsedAt: new Date(),
      hitCount: { increment: 1 },
    },
    create: {
      profileId: input.profileId,
      syllabusChapterId: input.syllabusChapterId,
      boardName: input.boardName,
      classLevel: input.classLevel,
      subjectName: input.subjectName || "General Studies",
      topicTitle: input.topicTitle,
      explanationLanguage: input.explanationLanguage,
      boardLanguage: input.boardLanguage,
      voiceLanguage: input.voiceLanguage,
      teachingDepth: input.teachingDepth,
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      promptType: input.promptType,
      promptText: input.promptText,
      normalizedCacheKey,
      previousTeachingPhase: input.previousTeachingPhase,
      previousConceptIndex: input.previousConceptIndex,
      assistantPayloadJson: assistantPayload as Prisma.InputJsonValue,
      boardPayloadJson: (assistantPayload.boardState || null) as Prisma.InputJsonValue,
      lastUsedAt: new Date(),
      hitCount: 1,
    },
  });
};

const recordLessonDoubt = async (input: {
  userId: string;
  sessionId: string;
  refreshed: TuitionSessionRecord;
  teacherContext: TeacherContextSnapshot;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  questionText: string;
  assistantPayload: AssistantPayload;
  previousAssistant: AssistantPayload | null;
}) => {
  if (isTeacherCommandPrompt(input.questionText)) {
    return {
      recorded: false,
      doubtId: null,
      importanceScore: null,
      occurrenceCount: null,
    };
  }
  const normalizedQuestionKey = buildDoubtInsightKey({
    syllabusChapterId: input.refreshed.syllabusChapter.id,
    subjectName: input.teacherContext.subjectName || input.refreshed.profile.subject?.name || null,
    topicTitle: input.teacherContext.topicTitle,
    explanationLanguage: input.teacherContext.explanationLanguage,
    boardLanguage: input.teacherContext.boardLanguage,
    voiceLanguage: input.teacherContext.voiceLanguage,
    teachingDepth: input.teacherContext.teachingDepth,
    speedMode: input.speedMode,
    difficultyMode: input.difficultyMode,
    questionText: input.questionText,
    previousTeachingPhase: input.previousAssistant?.teacherState?.currentTeachingPhase || null,
    previousConceptIndex: input.previousAssistant?.teacherState?.currentConceptIndex ?? null,
  });
  const existing = await prisma.tuitionLessonDoubt.findUnique({
    where: { normalizedQuestionKey },
  });
  const nextOccurrenceCount = (existing?.occurrenceCount || 0) + 1;
  const importanceScore = buildImportanceScore(input.questionText, nextOccurrenceCount);
  const cache = await findReusableLessonCache(
    getAssistantCacheContext({
      refreshed: input.refreshed,
      teacherContext: input.teacherContext,
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      content: input.questionText,
      previousAssistant: input.previousAssistant,
    })
  );
  const doubt = await prisma.tuitionLessonDoubt.upsert({
    where: { normalizedQuestionKey },
    update: {
      sessionId: input.sessionId,
      lessonCacheId: cache?.id || null,
      answerPayloadJson: input.assistantPayload as Prisma.InputJsonValue,
      occurrenceCount: nextOccurrenceCount,
      importanceScore,
      lastAskedAt: new Date(),
    },
    create: {
      userId: input.userId,
      sessionId: input.sessionId,
      syllabusChapterId: input.refreshed.syllabusChapter.id,
      lessonCacheId: cache?.id || null,
      subjectName: input.teacherContext.subjectName || input.refreshed.profile.subject?.name || "General Studies",
      topicTitle: input.teacherContext.topicTitle,
      explanationLanguage: input.teacherContext.explanationLanguage,
      boardLanguage: input.teacherContext.boardLanguage,
      voiceLanguage: input.teacherContext.voiceLanguage,
      teachingDepth: input.teacherContext.teachingDepth,
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      questionText: input.questionText,
      normalizedQuestionKey,
      answerPayloadJson: input.assistantPayload as Prisma.InputJsonValue,
      previousTeachingPhase: input.previousAssistant?.teacherState?.currentTeachingPhase || null,
      previousConceptIndex: input.previousAssistant?.teacherState?.currentConceptIndex ?? null,
      occurrenceCount: nextOccurrenceCount,
      importanceScore,
      lastAskedAt: new Date(),
    },
  });
  return {
    recorded: true,
    doubtId: doubt.id,
    importanceScore,
    occurrenceCount: nextOccurrenceCount,
  };
};

const resolveSessionModes = (input: {
  speedMode?: string | TuitionSpeedMode | null;
  difficultyMode?: string | TuitionDifficultyMode | null;
  fallbackSpeedMode?: TuitionSpeedMode;
  fallbackDifficultyMode?: TuitionDifficultyMode;
}) => ({
  speedMode: normalizeSpeedMode(input.speedMode || input.fallbackSpeedMode),
  difficultyMode: normalizeDifficultyMode(input.difficultyMode || input.fallbackDifficultyMode),
});

const serializeSession = (session: TuitionSessionRecord) => {
  const latestAssistant = findLatestStructuredAssistant(session.messages);
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
  const teachingDepth = normalizeTeachingDepth(latestAssistant?.teachingDepth || "MODERATE");
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
      teachingDepth,
      curriculumBoard: latestAssistant?.curriculumBoard || session.profile.board?.name || null,
    },
    messages: serializeMessages(session.messages),
    chapterContext: {
      boardName: session.profile.board?.name || null,
      classLevel: session.profile.classLevel ?? null,
      subjectName: session.profile.subject?.name || null,
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

const sessionMatchesTeacherContext = (
  session: TuitionSessionRecord,
  teacherContext: {
    subjectName: string | null;
    topicTitle: string;
    explanationLanguage: "ENGLISH" | "HINDI" | "PUNJABI";
    boardLanguage: "ENGLISH" | "HINDI" | "PUNJABI";
    voiceLanguage: "ENGLISH" | "HINDI" | "PUNJABI";
    teachingDepth: "BASIC" | "MODERATE" | "ADVANCED";
  }
): boolean => {
  const serialized = serializeSession(session);
  return (
    normalizeSessionTitle(serialized.teacherContext.topic) === normalizeSessionTitle(teacherContext.topicTitle) &&
    normalizeSessionTitle(serialized.teacherContext.subject) === normalizeSessionTitle(teacherContext.subjectName) &&
    normalizeTeachingLanguageCode(serialized.teacherContext.explanationLanguage) ===
      normalizeTeachingLanguageCode(teacherContext.explanationLanguage) &&
    normalizeTeachingLanguageCode(serialized.teacherContext.boardLanguage) ===
      normalizeTeachingLanguageCode(teacherContext.boardLanguage) &&
    normalizeTeachingLanguageCode(serialized.teacherContext.voiceLanguage) ===
      normalizeTeachingLanguageCode(teacherContext.voiceLanguage) &&
    normalizeTeachingDepth(serialized.teacherContext.teachingDepth) ===
      normalizeTeachingDepth(teacherContext.teachingDepth)
  );
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
  teachingDepth?: string | null;
  subject?: string | null;
  topic?: string | null;
  curriculumBoard?: string | null;
}) => {
  const explanationLanguage = normalizeTeachingLanguageCode(
    input.explanationLanguage || input.responseLanguage || input.preferredLanguage || "ENGLISH"
  );
  const boardLanguage = normalizeTeachingLanguageCode(input.boardLanguage || explanationLanguage);
  const voiceLanguage = normalizeTeachingLanguageCode(input.voiceLanguage || explanationLanguage);
  const teachingDepth = normalizeTeachingDepth(input.teachingDepth);
  return {
    subjectName: normalizeOptionalText(input.subject || input.subjectName),
    topicTitle: normalizeOptionalText(input.topic) || input.chapterTitle,
    explanationLanguage,
    boardLanguage,
    voiceLanguage,
    teachingDepth,
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
      teachingDepth?: string | null;
      resume?: boolean;
    }
  ) {
    const chapter = await tuitionSyllabusService.resolveOwnedChapter(userId, syllabusChapterId);
    const profile = await tuitionProfileService.getOrCreateProfile(userId);
    const { speedMode, difficultyMode } = resolveSessionModes(input);
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

    if (session && !sessionMatchesTeacherContext(session, teacherContext)) {
      session = null;
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
      teachingDepth?: string | null;
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
    const { speedMode, difficultyMode } = resolveSessionModes({
      speedMode: input.speedMode,
      difficultyMode: input.difficultyMode,
      fallbackSpeedMode: session.speedMode,
      fallbackDifficultyMode: session.difficultyMode,
    });

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
    const previousAssistant = findPreviousStructuredAssistant(refreshed.messages);
    const cacheContext = getAssistantCacheContext({
      refreshed,
      teacherContext,
      speedMode,
      difficultyMode,
      content,
      previousAssistant,
    });
    const cachedLesson = await findReusableLessonCache(cacheContext);
    let activeLessonCacheId = cachedLesson?.id || null;
    const promotedDoubts = cacheContext.promptType === "DOUBT"
      ? []
      : await findPromotedLessonDoubts({
          refreshed,
          teacherContext,
          speedMode,
          difficultyMode,
        });
    let assistantPayload =
      (cachedLesson?.assistantPayloadJson ? toAssistantPayload(cachedLesson.assistantPayloadJson) : null) || null;

    if (assistantPayload) {
      assistantPayload = enrichAssistantPayloadWithPromotedDoubts(assistantPayload, promotedDoubts);
      await prisma.tuitionLessonCache.update({
        where: { id: cachedLesson!.id },
        data: {
          assistantPayloadJson: assistantPayload as Prisma.InputJsonValue,
          lastUsedAt: new Date(),
          hitCount: { increment: 1 },
        },
      });
    } else {
      assistantPayload = await buildTuitionTeacherAssistantPayload({
        boardName: refreshed.profile.board?.name || null,
        classLevel: refreshed.profile.classLevel,
        subjectName: teacherContext.subjectName || refreshed.profile.subject?.name || null,
        topicTitle: teacherContext.topicTitle,
        explanationLanguage: teacherContext.explanationLanguage,
        boardLanguage: teacherContext.boardLanguage,
        voiceLanguage: teacherContext.voiceLanguage,
        teachingDepth: teacherContext.teachingDepth,
        speedMode,
        difficultyMode,
        studentPrompt: content,
        messageNumber: refreshed.messages.length + 1,
        previousAssistant: previousAssistant as any,
      });
      assistantPayload = enrichAssistantPayloadWithPromotedDoubts(assistantPayload, promotedDoubts);
      const savedLessonCache = await saveLessonCache(cacheContext, assistantPayload);
      activeLessonCacheId = savedLessonCache.id;
    }

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
    prewarmSpeechTrackForAssistant({
      messageId: assistantMessage.id,
      assistantPayload,
      fallbackLanguage: responseLanguage,
    });

    const updatedSession = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const doubtRecord = await recordLessonDoubt({
      userId,
      sessionId,
      refreshed,
      teacherContext,
      speedMode,
      difficultyMode,
      questionText: content,
      assistantPayload,
      previousAssistant,
    });
    const promotedCacheCount =
      doubtRecord.recorded &&
      Number(doubtRecord.occurrenceCount || 0) >= PROMOTED_DOUBT_MIN_OCCURRENCES &&
      Number(doubtRecord.importanceScore || 0) >= PROMOTED_DOUBT_MIN_IMPORTANCE
        ? await promoteLessonDoubtsIntoCaches({
            refreshed,
            teacherContext,
            speedMode,
            difficultyMode,
          })
        : 0;

    return {
      session: serializeSession(updatedSession),
      assistantMessage: serializeMessage(assistantMessage),
      progress,
      cache: {
        hit: Boolean(cachedLesson),
        source: cachedLesson ? "saved_lesson_cache" : "generated",
        promptType: cacheContext.promptType,
        lessonCacheId: activeLessonCacheId,
        doubtRecorded: doubtRecord.recorded,
        doubtId: doubtRecord.doubtId,
        doubtOccurrenceCount: doubtRecord.occurrenceCount,
        doubtImportanceScore: doubtRecord.importanceScore,
        promotedDoubtCount: promotedDoubts.length,
        promotedCacheCount,
      },
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
      teachingDepth?: string | null;
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
      teachingDepth: teacherContext.teachingDepth,
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

  async createTeacherSpeechTrack(
    userId: string,
    syllabusChapterId: string,
    sessionId: string,
    input: {
      messageId?: string | null;
    } = {}
  ) {
    const session = await resolveOwnedSession(userId, syllabusChapterId, sessionId);
    const assistantMessages = [...session.messages].filter((message) => message.role === "ASSISTANT");
    const targetMessage =
      (input.messageId
        ? assistantMessages.find((message) => message.id === input.messageId)
        : null) || assistantMessages.at(-1);

    if (!targetMessage) {
      throw new AppError("No teacher explanation is available for speech sync.", 404);
    }

    const structuredAssistant = serializeMessage(targetMessage).structured;
    if (!structuredAssistant) {
      throw new AppError("Teacher speech track is unavailable for this message.", 422);
    }

    const sourceText = buildTeacherSpeechSourceText(structuredAssistant);
    if (!sourceText) {
      throw new AppError("Teacher speech text is empty for this message.", 422);
    }

    const voiceLanguage = normalizeTeachingLanguageCode(
      structuredAssistant.voiceLanguage ||
        structuredAssistant.explanationLanguage ||
        session.responseLanguage ||
        session.profile.preferredLanguage ||
        "ENGLISH"
    );
    const speechTrack = await getOrCreateSpeechTrack({
      messageId: targetMessage.id,
      sourceText,
      voiceLanguage,
    });
    return { speechTrack };
  },
};

