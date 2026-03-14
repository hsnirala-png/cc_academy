import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../utils/appError";
import {
  createLessonAiRealtimeService,
  lessonAiVoiceContextRequiredMessage,
  lessonAiVoiceUnavailableMessage,
} from "../modules/ai/lesson-ai-realtime.service";

test("lesson AI voice session creation returns a grounded realtime session payload", async () => {
  const observed: Array<{ instructions: string; model: string; voice: string }> = [];
  const service = createLessonAiRealtimeService({
    model: "gpt-realtime",
    voice: "marin",
    loadLessonContext: async () => ({
      lessonId: "lesson_voice",
      lessonTitle: "Development and Learning",
      chapterTitle: "Chapter 1",
      courseTitle: "PSTET-2",
      transcriptText: "Development prepares the base for learning, and learning strengthens development.",
      transcriptSegments: [],
    }),
    realtimeClient: {
      async createSession(input) {
        observed.push(input);
        return {
          clientSecret: "rt_secret_123",
          expiresAt: "2026-03-14T12:00:00.000Z",
          sessionId: "sess_123",
        };
      },
    },
  });

  const payload = await service.createVoiceSession("user_1", "lesson_voice", {
    responseLanguage: "Hindi",
  });

  assert.equal(payload.clientSecret, "rt_secret_123");
  assert.equal(payload.session.model, "gpt-realtime");
  assert.equal(payload.session.voice, "marin");
  assert.equal(payload.session.preferredLanguage, "Hindi");
  assert.equal(payload.context.lessonId, "lesson_voice");
  assert.equal(observed.length, 1);
  assert.match(observed[0]?.instructions || "", /live voice tutoring session/i);
  assert.match(observed[0]?.instructions || "", /Preferred spoken answer language for this session: Hindi/i);
  assert.match(observed[0]?.instructions || "", /Development prepares the base for learning/i);
});

test("lesson AI voice session blocks lessons without transcript context", async () => {
  const service = createLessonAiRealtimeService({
    loadLessonContext: async () => ({
      lessonId: "lesson_empty",
      lessonTitle: "Empty Lesson",
      chapterTitle: "Chapter 2",
      courseTitle: "PSTET-1",
      transcriptText: "",
      transcriptSegments: [],
    }),
    realtimeClient: {
      async createSession() {
        throw new Error("should not be called");
      },
    },
  });

  await assert.rejects(
    () => service.createVoiceSession("user_2", "lesson_empty"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.message === lessonAiVoiceContextRequiredMessage
  );
});

test("lesson AI voice session returns controlled unavailable error when provider is not configured", async () => {
  const service = createLessonAiRealtimeService({
    loadLessonContext: async () => ({
      lessonId: "lesson_voice_down",
      lessonTitle: "Voice Lesson",
      chapterTitle: "Chapter 3",
      courseTitle: "PSTET-2",
      transcriptText: "Observation supports learning in this lesson.",
      transcriptSegments: [],
    }),
    realtimeClient: {
      async createSession() {
        throw new AppError(lessonAiVoiceUnavailableMessage, 503, "LESSON_AI_VOICE_UNAVAILABLE");
      },
    },
  });

  await assert.rejects(
    () => service.createVoiceSession("user_3", "lesson_voice_down"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 503 &&
      error.message === lessonAiVoiceUnavailableMessage
  );
});
