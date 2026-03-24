import { TuitionDifficultyMode, TuitionSpeedMode } from "@prisma/client";
import { AppError } from "../../utils/appError";

export const tuitionAiVoiceUnavailableMessage =
  "Tuition voice tutor is unavailable right now. Please try again later.";

type TuitionVoiceContext = {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  chapterTitle: string;
  syllabusTitle?: string | null;
};

type TuitionTeacherContext = {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  chapterTitle: string;
  responseLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  studentPrompt: string;
  messageNumber: number;
};

type TuitionVoiceSessionInput = {
  context: TuitionVoiceContext;
  responseLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
};

type TuitionRealtimeSessionRequest = {
  model: string;
  voice: string;
  instructions: string;
};

type TuitionRealtimeSessionResponse = {
  clientSecret: string;
  expiresAt: string | null;
  sessionId: string | null;
};

type TuitionRealtimeClient = {
  createSession(input: TuitionRealtimeSessionRequest): Promise<TuitionRealtimeSessionResponse>;
};

const normalizeText = (value: string | null | undefined): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeResponseLanguage = (value: string | null | undefined): string => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "HINDI") return "Hindi";
  if (normalized === "PUNJABI") return "Punjabi";
  return "English";
};

const toIsoString = (value: string | number | null | undefined): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestampMs = value > 10_000_000_000 ? value : value * 1000;
    return new Date(timestampMs).toISOString();
  }
  const text = normalizeText(String(value || ""));
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const speedGuidance: Record<TuitionSpeedMode, string> = {
  SLOW: "Speak patiently, pause between ideas, and explain the chapter in small steps.",
  NORMAL: "Keep a balanced teaching pace with clear explanation and one direct example.",
  FAST: "Speak concisely, stay focused, and move quickly to the key application of the topic.",
};

const difficultyGuidance: Record<TuitionDifficultyMode, string> = {
  EASY: "Use simpler spoken wording, direct classroom examples, and gentle follow-up questions.",
  MEDIUM: "Use standard textbook depth with one clear example and one short check-for-understanding prompt.",
  HARD: "Use more reasoning, comparison, and application while staying inside the current chapter.",
};

const lessonSpeedGuidance: Record<TuitionSpeedMode, string> = {
  SLOW: "Break the explanation into smaller steps.",
  NORMAL: "Keep the explanation balanced and practical.",
  FAST: "Keep the explanation compact and move quickly to application.",
};

const lessonDifficultyGuidance: Record<TuitionDifficultyMode, string> = {
  EASY: "Use plain wording, direct examples, and one-step practice.",
  MEDIUM: "Use standard textbook depth with one worked example.",
  HARD: "Include deeper reasoning, comparison, and one application prompt.",
};

export type TuitionBoardPayload = {
  boardTitle: string;
  boardLines: string[];
  formulas: string[];
  steps: string[];
  exampleTitle: string | null;
  exampleSteps: string[];
};

export type TuitionTeacherAssistantPayload = {
  replyText: string;
  chapterTitle: string;
  recapPoints: string[];
  nextSuggestedAction: string | null;
  progressUpdate: string | null;
  boardTitle: string;
  boardLines: string[];
  formulas: string[];
  steps: string[];
  exampleTitle: string | null;
  exampleSteps: string[];
};

const buildBoardLineCount = (speedMode: TuitionSpeedMode, difficultyMode: TuitionDifficultyMode): number => {
  if (speedMode === TuitionSpeedMode.FAST) return 3;
  if (speedMode === TuitionSpeedMode.SLOW) return difficultyMode === TuitionDifficultyMode.HARD ? 5 : 4;
  return difficultyMode === TuitionDifficultyMode.HARD ? 4 : 3;
};

const buildStepCount = (speedMode: TuitionSpeedMode, difficultyMode: TuitionDifficultyMode): number => {
  if (speedMode === TuitionSpeedMode.SLOW) return difficultyMode === TuitionDifficultyMode.HARD ? 5 : 4;
  if (speedMode === TuitionSpeedMode.FAST) return 2;
  return difficultyMode === TuitionDifficultyMode.HARD ? 4 : 3;
};

const buildSubjectFormulas = (subjectName: string, chapterTitle: string): string[] => {
  const normalizedSubject = normalizeText(subjectName).toUpperCase();
  if (normalizedSubject === "MATHS" || normalizedSubject === "MATHEMATICS") {
    return [
      `Key relation for ${chapterTitle}: identify the known value, apply the rule, then simplify carefully.`,
      `Check the final answer by reversing the step or substituting the value back.`,
    ];
  }
  if (normalizedSubject === "SCIENCE") {
    return [
      `Scientific rule: observation -> reason -> conclusion for ${chapterTitle}.`,
      `Whenever possible, connect the concept with one measurable example or daily-life effect.`,
    ];
  }
  if (normalizedSubject === "ENGLISH" || normalizedSubject === "HINDI" || normalizedSubject === "PUNJABI") {
    return [
      `Language focus: keyword -> meaning -> sentence use for ${chapterTitle}.`,
      `Writing rule: point -> example -> clear conclusion.`,
    ];
  }
  return [`Board formula: main idea -> supporting point -> chapter example for ${chapterTitle}.`];
};

export const buildTuitionBoardPayload = (input: TuitionTeacherContext): TuitionBoardPayload => {
  const subjectName = normalizeText(input.subjectName) || "this subject";
  const boardName = normalizeText(input.boardName);
  const classLabel = input.classLevel ? `Class ${input.classLevel}` : "school";
  const lineCount = buildBoardLineCount(input.speedMode, input.difficultyMode);
  const stepCount = buildStepCount(input.speedMode, input.difficultyMode);

  const boardLineTemplates = [
    `${input.chapterTitle} for ${boardName ? `${boardName} ` : ""}${classLabel} ${subjectName}.`,
    input.difficultyMode === TuitionDifficultyMode.EASY
      ? `Start with the simplest meaning of ${input.chapterTitle}.`
      : `Define the core idea of ${input.chapterTitle} in textbook language.`,
    input.speedMode === TuitionSpeedMode.SLOW
      ? "Unpack one small sub-topic at a time on the board."
      : "Keep the board focused on the most important chapter points.",
    input.difficultyMode === TuitionDifficultyMode.HARD
      ? "Add one comparison or reasoning link that shows deeper understanding."
      : "Include one classroom example linked directly to the chapter.",
    `Student question focus: ${normalizeText(input.studentPrompt) || "Explain the chapter clearly."}`,
  ];

  const steps = Array.from({ length: stepCount }, (_, index) => {
    const stepNumber = index + 1;
    if (input.difficultyMode === TuitionDifficultyMode.HARD) {
      return `Step ${stepNumber}: connect the chapter idea to a reason, comparison, or application.`;
    }
    if (input.difficultyMode === TuitionDifficultyMode.EASY) {
      return `Step ${stepNumber}: write one simple point and explain it in plain words.`;
    }
    return `Step ${stepNumber}: write the main point, then add one short supporting explanation.`;
  });

  const exampleSteps =
    input.speedMode === TuitionSpeedMode.FAST
      ? [
          `Identify the chapter idea used in ${input.chapterTitle}.`,
          "Write one short worked answer with the final conclusion.",
        ]
      : [
          `Identify the idea from ${input.chapterTitle} that the example is testing.`,
          "Show the first worked step clearly on the board.",
          input.difficultyMode === TuitionDifficultyMode.HARD
            ? "Add the reasoning behind the step and check the result."
            : "Finish with a short conclusion or textbook-style answer.",
        ];

  return {
    boardTitle: `${input.chapterTitle} Board Notes`,
    boardLines: boardLineTemplates.slice(0, lineCount),
    formulas: buildSubjectFormulas(subjectName, input.chapterTitle),
    steps,
    exampleTitle:
      input.difficultyMode === TuitionDifficultyMode.HARD
        ? `${input.chapterTitle} Worked Reasoning Example`
        : `${input.chapterTitle} Worked Example`,
    exampleSteps,
  };
};

export const buildTuitionTeacherAssistantPayload = (
  input: TuitionTeacherContext
): TuitionTeacherAssistantPayload => {
  const language = normalizeResponseLanguage(input.responseLanguage);
  const boardPayload = buildTuitionBoardPayload(input);
  return {
    chapterTitle: input.chapterTitle,
    replyText:
      `${input.chapterTitle}: ${lessonSpeedGuidance[input.speedMode]} ${lessonDifficultyGuidance[input.difficultyMode]} ` +
      `Answer the student prompt "${normalizeText(input.studentPrompt)}" without leaving the current chapter. ` +
      `Keep the explanation in ${language} mode where possible.`,
    recapPoints: [
      `Stay focused on ${input.chapterTitle}.`,
      lessonSpeedGuidance[input.speedMode],
      lessonDifficultyGuidance[input.difficultyMode],
    ],
    nextSuggestedAction:
      input.messageNumber > 3
        ? "Ask the student to explain the board summary in one sentence."
        : "Ask one short follow-up about the same chapter point.",
    progressUpdate: null,
    boardTitle: boardPayload.boardTitle,
    boardLines: boardPayload.boardLines,
    formulas: boardPayload.formulas,
    steps: boardPayload.steps,
    exampleTitle: boardPayload.exampleTitle,
    exampleSteps: boardPayload.exampleSteps,
  };
};

export const buildTuitionRealtimeVoiceInstructions = (input: TuitionVoiceSessionInput): string => {
  const language = normalizeResponseLanguage(input.responseLanguage);
  const board = normalizeText(input.context.boardName);
  const subject = normalizeText(input.context.subjectName) || "the selected subject";
  const classLabel = input.context.classLevel ? `Class ${input.context.classLevel}` : "school";
  const syllabusTitle = normalizeText(input.context.syllabusTitle);

  return [
    "You are a live tuition voice tutor for one student.",
    "Stay chapter-focused and teach like a patient school tutor, not a competitive exam coach or test-prep mentor.",
    `Teach only the chapter "${input.context.chapterTitle}" for ${board ? `${board} ` : ""}${classLabel} ${subject}.`,
    syllabusTitle ? `The chapter belongs to the syllabus "${syllabusTitle}".` : "",
    `Speak in ${language}.`,
    speedGuidance[input.speedMode],
    difficultyGuidance[input.difficultyMode],
    "Keep the session conversational and interactive.",
    "Use spoken explanations, quick checks, and short examples tied to the same chapter.",
    "Do not switch to other chapters, exam strategy, whiteboard-style output, or homework grading.",
    "If the student is confused, restate the same idea more simply before moving on.",
  ]
    .filter(Boolean)
    .join(" ");
};

const createOpenAiRealtimeClient = (): TuitionRealtimeClient => {
  const apiKey = normalizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return {
      async createSession() {
        throw new AppError(
          tuitionAiVoiceUnavailableMessage,
          503,
          "TUITION_AI_VOICE_UNAVAILABLE"
        );
      },
    };
  }

  return {
    async createSession(input) {
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: input.model,
            instructions: input.instructions,
            audio: {
              input: {
                turn_detection: {
                  type: "server_vad",
                },
              },
              output: {
                voice: input.voice,
              },
            },
          },
        }),
      });

      let payload: Record<string, any> = {};
      try {
        payload = (await response.json()) as Record<string, any>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new AppError(
          normalizeText(payload?.error?.message) || tuitionAiVoiceUnavailableMessage,
          response.status >= 400 && response.status < 500 ? 502 : 503,
          "TUITION_AI_VOICE_SESSION_FAILED"
        );
      }

      const clientSecret = normalizeText(payload?.client_secret?.value || payload?.value);
      if (!clientSecret) {
        throw new AppError(
          tuitionAiVoiceUnavailableMessage,
          503,
          "TUITION_AI_VOICE_UNAVAILABLE"
        );
      }

      return {
        clientSecret,
        expiresAt: toIsoString(payload?.client_secret?.expires_at ?? payload?.expires_at),
        sessionId: normalizeText(payload?.id) || null,
      };
    },
  };
};

export const createTuitionAiProvider = ({
  realtimeClient = createOpenAiRealtimeClient(),
  model = normalizeText(process.env.OPENAI_REALTIME_MODEL) || "gpt-realtime",
  voice = normalizeText(process.env.OPENAI_REALTIME_VOICE) || "marin",
} = {}) => ({
  async createVoiceSession(input: TuitionVoiceSessionInput) {
    const instructions = buildTuitionRealtimeVoiceInstructions(input);
    const session = await realtimeClient.createSession({
      model,
      voice,
      instructions,
    });

    return {
      clientSecret: session.clientSecret,
      expiresAt: session.expiresAt,
      session: {
        id: session.sessionId,
        model,
        voice,
        responseLanguage: normalizeResponseLanguage(input.responseLanguage),
        speedMode: input.speedMode,
        difficultyMode: input.difficultyMode,
      },
      context: {
        chapterTitle: input.context.chapterTitle,
        boardName: input.context.boardName || null,
        classLevel: input.context.classLevel ?? null,
        subjectName: input.context.subjectName || null,
        syllabusTitle: input.context.syllabusTitle || null,
      },
      instructions,
    };
  },
});

export const tuitionAiProvider = createTuitionAiProvider();
