import { lessonService } from "../lessons/lesson.service";
import { AppError } from "../../utils/appError";
import { buildRealtimeVoiceTutorInstructions, LessonAiContext } from "./lesson-ai.provider";

type CreateRealtimeSessionInput = {
  instructions: string;
  model: string;
  voice: string;
};

type CreateRealtimeSessionResult = {
  clientSecret: string;
  expiresAt: string | null;
  sessionId: string | null;
};

type LessonAiRealtimeClient = {
  createSession(input: CreateRealtimeSessionInput): Promise<CreateRealtimeSessionResult>;
};

const VOICE_TUTOR_UNAVAILABLE_MESSAGE =
  "Voice tutor is unavailable right now. Please try again later.";
const VOICE_TUTOR_CONTEXT_REQUIRED_MESSAGE =
  "Voice tutor needs transcript text for this lesson before it can start.";

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim();

const normalizeResponseLanguage = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "punjabi") return "Punjabi";
  if (normalized === "hindi") return "Hindi";
  if (normalized === "english") return "English";
  return null;
};

const parseTranscriptSegments = (value: unknown): LessonAiContext["transcriptSegments"] => {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { segments?: unknown[] }).segments)
      ? (value as { segments: unknown[] }).segments
      : [];

  return source
    .map((item) => ({
      startMs: Math.max(
        0,
        Number(
          (item as { startMs?: unknown; start?: unknown }).startMs ??
            (item as { start?: unknown }).start ??
            0
        )
      ),
      endMs: Math.max(
        0,
        Number(
          (item as { endMs?: unknown; end?: unknown }).endMs ??
            (item as { end?: unknown }).end ??
            0
        )
      ),
      text: normalizeText((item as { text?: unknown }).text),
    }))
    .filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs > item.startMs && item.text);
};

const detectLessonLanguage = (context: LessonAiContext) => {
  const transcriptSource =
    normalizeText(context.transcriptText) ||
    context.transcriptSegments
      .map((segment) => normalizeText(segment.text))
      .filter(Boolean)
      .join("\n");
  if (/[\u0A00-\u0A7F]/.test(transcriptSource)) return "Punjabi";
  if (/[\u0900-\u097F]/.test(transcriptSource)) return "Hindi";
  return "English";
};

const hasGroundingContext = (context: LessonAiContext) =>
  Boolean(
    normalizeText(context.transcriptText) ||
      context.transcriptSegments.some((segment) => Boolean(normalizeText(segment.text)))
  );

const toIsoString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestampMs = value > 10_000_000_000 ? value : value * 1000;
    return new Date(timestampMs).toISOString();
  }

  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const defaultLessonContextLoader = async (userId: string, lessonId: string): Promise<LessonAiContext> => {
  const payload = await lessonService.getLessonForUser(userId, lessonId);
  return {
    lessonId: String(payload.lesson.id || lessonId).trim(),
    lessonTitle: normalizeText(payload.lesson.title),
    chapterTitle: normalizeText(payload.chapter?.title),
    courseTitle: normalizeText(payload.course?.title),
    transcriptText: normalizeText(payload.lesson.transcriptText),
    transcriptSegments: parseTranscriptSegments(payload.lesson.transcriptSegments),
  };
};

const createOpenAiRealtimeClient = (): LessonAiRealtimeClient => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return {
      async createSession() {
        throw new AppError(VOICE_TUTOR_UNAVAILABLE_MESSAGE, 503, "LESSON_AI_VOICE_UNAVAILABLE");
      },
    };
  }

  return {
    async createSession(input: CreateRealtimeSessionInput) {
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
          String(payload?.error?.message || "").trim() || VOICE_TUTOR_UNAVAILABLE_MESSAGE,
          response.status >= 400 && response.status < 500 ? 502 : 503,
          "LESSON_AI_VOICE_SESSION_FAILED"
        );
      }

      const clientSecret = String(payload?.client_secret?.value || payload?.value || "").trim();
      if (!clientSecret) {
        throw new AppError(VOICE_TUTOR_UNAVAILABLE_MESSAGE, 503, "LESSON_AI_VOICE_UNAVAILABLE");
      }

      return {
        clientSecret,
        expiresAt: toIsoString(payload?.client_secret?.expires_at ?? payload?.expires_at),
        sessionId: String(payload?.id || "").trim() || null,
      };
    },
  };
};

export const createLessonAiRealtimeService = ({
  realtimeClient = createOpenAiRealtimeClient(),
  loadLessonContext = defaultLessonContextLoader,
  model = String(process.env.OPENAI_REALTIME_MODEL || "gpt-realtime").trim() || "gpt-realtime",
  voice = String(process.env.OPENAI_REALTIME_VOICE || "marin").trim() || "marin",
}: {
  realtimeClient?: LessonAiRealtimeClient;
  loadLessonContext?: (userId: string, lessonId: string) => Promise<LessonAiContext>;
  model?: string;
  voice?: string;
} = {}) => ({
  async createVoiceSession(
    userId: string,
    lessonId: string,
    input: {
      responseLanguage?: string | null;
    } = {}
  ) {
    const context = await loadLessonContext(userId, lessonId);
    if (!context.lessonId) {
      throw new AppError("Lesson not found.", 404);
    }
    if (!hasGroundingContext(context)) {
      throw new AppError(VOICE_TUTOR_CONTEXT_REQUIRED_MESSAGE, 409, "LESSON_AI_VOICE_CONTEXT_REQUIRED");
    }

    const preferredLanguage = normalizeResponseLanguage(input.responseLanguage) || detectLessonLanguage(context);
    const instructions = buildRealtimeVoiceTutorInstructions({
      context,
      responseLanguage: preferredLanguage,
    });
    const session = await realtimeClient.createSession({
      instructions,
      model,
      voice,
    });

    return {
      clientSecret: session.clientSecret,
      expiresAt: session.expiresAt,
      session: {
        id: session.sessionId,
        model,
        voice,
        lessonId: context.lessonId,
        preferredLanguage,
      },
      context: {
        lessonId: context.lessonId,
        lessonTitle: context.lessonTitle,
        chapterTitle: context.chapterTitle,
        courseTitle: context.courseTitle,
        hasTranscript: true,
      },
    };
  },
});

export const lessonAiRealtimeService = createLessonAiRealtimeService();

export const lessonAiVoiceUnavailableMessage = VOICE_TUTOR_UNAVAILABLE_MESSAGE;
export const lessonAiVoiceContextRequiredMessage = VOICE_TUTOR_CONTEXT_REQUIRED_MESSAGE;
