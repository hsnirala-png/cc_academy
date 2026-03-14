import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { Role } from "@prisma/client";
import { signToken } from "../utils/jwt";
import { createStudentAiRouter } from "../routes/student.ai.routes";
import { errorHandler } from "../middlewares/errorHandler";
import { AppError } from "../utils/appError";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

type RouterService = NonNullable<Parameters<typeof createStudentAiRouter>[0]>;

const createServer = async (service: RouterService) => {
  const app = express();
  app.use(express.json());
  app.use("/student", createStudentAiRouter(service));
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
};

const requestJson = async ({
  baseUrl,
  path,
  method = "GET",
  token,
  body,
}: {
  baseUrl: string;
  path: string;
  method?: string;
  token?: string;
  body?: unknown;
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { response, payload };
};

const createServiceStub = (
  overrides: Partial<RouterService> = {}
): RouterService => ({
  async getOrCreateConversation() {
    throw new Error("should not be called");
  },
  async getConversation() {
    throw new Error("should not be called");
  },
  async sendMessage() {
    throw new Error("should not be called");
  },
  async createVoiceSession() {
    throw new Error("should not be called");
  },
  ...overrides,
});

test("student AI routes block unauthorized requests", async () => {
  const { server, baseUrl } = await createServer(createServiceStub());

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations",
      method: "POST",
    });
    assert.equal(response.status, 401);
    assert.equal(payload.message, "Unauthorized");
  } finally {
    server.close();
  }
});

test("student AI conversation creation succeeds for valid student request", async () => {
  const token = signToken("user_1", Role.STUDENT);
  const { server, baseUrl } = await createServer(createServiceStub({
    async getOrCreateConversation(userId, lessonId) {
      assert.equal(userId, "user_1");
      assert.equal(lessonId, "lesson_1");
      return {
        conversation: {
          id: "conv_1",
          userId,
          lessonId,
          title: "Lesson AI Teacher",
          mode: "LESSON_CHAT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
        context: {
          lessonId,
          lessonTitle: "Sample Lesson",
          chapterTitle: "Sample Chapter",
          courseTitle: "Sample Course",
          hasTranscript: true,
        },
      };
    },
  }));

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations",
      method: "POST",
      token,
    });
    assert.equal(response.status, 201);
    assert.equal(payload.conversation.id, "conv_1");
    assert.equal(payload.context.lessonId, "lesson_1");
  } finally {
    server.close();
  }
});

test("student AI routes block admin users", async () => {
  const token = signToken("admin_1", Role.ADMIN);
  const { server, baseUrl } = await createServer(createServiceStub());

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations",
      method: "POST",
      token,
    });
    assert.equal(response.status, 403);
    assert.equal(payload.message, "Forbidden");
  } finally {
    server.close();
  }
});

test("student cannot fetch another user's AI conversation", async () => {
  const token = signToken("user_1", Role.STUDENT);
  const { server, baseUrl } = await createServer(createServiceStub({
    async getConversation() {
      throw new AppError("Conversation not found.", 404);
    },
  }));

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations/conv_other",
      token,
    });
    assert.equal(response.status, 404);
    assert.equal(payload.message, "Conversation not found.");
  } finally {
    server.close();
  }
});

test("student AI route blocks lesson mismatch between path and conversation", async () => {
  const token = signToken("user_1", Role.STUDENT);
  const { server, baseUrl } = await createServer(createServiceStub({
    async sendMessage() {
      throw new AppError("Conversation not found.", 404);
    },
  }));

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_2/conversations/conv_1/messages",
      method: "POST",
      token,
      body: {
        content: "Explain this lesson",
      },
    });
    assert.equal(response.status, 404);
    assert.equal(payload.message, "Conversation not found.");
  } finally {
    server.close();
  }
});

test("student AI routes return controlled service errors without crashing", async () => {
  const token = signToken("user_1", Role.STUDENT);
  const { server, baseUrl } = await createServer(createServiceStub({
    async getOrCreateConversation() {
      throw new AppError("Lesson AI storage is not ready right now. Please try again later.", 503);
    },
  }));

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations",
      method: "POST",
      token,
    });
    assert.equal(response.status, 503);
    assert.equal(payload.message, "Lesson AI storage is not ready right now. Please try again later.");
  } finally {
    server.close();
  }
});

test("student AI message route returns structured MCQ payload when available", async () => {
  const token = signToken("user_1", Role.STUDENT);
  let receivedInput: { responseLanguage?: string } | null = null;
  const { server, baseUrl } = await createServer(createServiceStub({
    async sendMessage(_userId, _lessonId, _conversationId, input) {
      receivedInput = input as { responseLanguage?: string };
      return {
        conversation: {
          id: "conv_1",
          userId: "user_1",
          lessonId: "lesson_1",
          title: "Lesson AI Teacher",
          mode: "LESSON_CHAT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
        context: {
          lessonId: "lesson_1",
          lessonTitle: "Sample Lesson",
          chapterTitle: "Sample Chapter",
          courseTitle: "Sample Course",
          hasTranscript: true,
        },
        userMessage: {
          id: "msg_user",
          conversationId: "conv_1",
          role: "USER",
          content: "Ask 3 MCQs from this lesson",
          contextSnapshotJson: null,
          tokenUsage: null,
          createdAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: "msg_assistant",
          conversationId: "conv_1",
          role: "ASSISTANT",
          content: "Opened 3 grounded lesson MCQs in the popup.",
          contextSnapshotJson: null,
          tokenUsage: 12,
          createdAt: new Date().toISOString(),
        },
        mcqSet: {
          title: "3 Lesson MCQs",
          questions: [
            {
              id: "q1",
              question: "According to this lesson, which point is correct?",
              options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
                { key: "C", text: "Option C" },
                { key: "D", text: "Option D" },
              ],
              correctAnswer: "A",
              explanation: "Grounded explanation.",
            },
            {
              id: "q2",
              question: "Which idea is emphasized?",
              options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
                { key: "C", text: "Option C" },
                { key: "D", text: "Option D" },
              ],
              correctAnswer: "B",
              explanation: "Grounded explanation.",
            },
            {
              id: "q3",
              question: "Which idea should be revised?",
              options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
                { key: "C", text: "Option C" },
                { key: "D", text: "Option D" },
              ],
              correctAnswer: "C",
              explanation: "Grounded explanation.",
            },
          ],
        },
      };
    },
  }));

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/conversations/conv_1/messages",
      method: "POST",
      token,
      body: {
        content: "Ask 3 MCQs from this lesson",
        requestType: "ASK_3_MCQS",
        responseLanguage: "Hindi",
      },
    });
    assert.equal(response.status, 201);
    assert.equal((receivedInput as { responseLanguage?: string } | null)?.responseLanguage, "Hindi");
    assert.equal(payload.mcqSet.title, "3 Lesson MCQs");
    assert.equal(payload.mcqSet.questions.length, 3);
    assert.equal(payload.mcqSet.questions[0].options.length, 4);
  } finally {
    server.close();
  }
});

test("student AI voice session blocks unauthorized requests", async () => {
  const { server, baseUrl } = await createServer(createServiceStub());

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/voice-session",
      method: "POST",
    });
    assert.equal(response.status, 401);
    assert.equal(payload.message, "Unauthorized");
  } finally {
    server.close();
  }
});

test("student AI voice session blocks admin users", async () => {
  const token = signToken("admin_voice", Role.ADMIN);
  const { server, baseUrl } = await createServer(createServiceStub());

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/voice-session",
      method: "POST",
      token,
    });
    assert.equal(response.status, 403);
    assert.equal(payload.message, "Forbidden");
  } finally {
    server.close();
  }
});

test("student AI voice session enforces lesson access", async () => {
  const token = signToken("user_voice", Role.STUDENT);
  const { server, baseUrl } = await createServer(
    createServiceStub({
      async createVoiceSession() {
        throw new AppError("Lesson not found.", 404);
      },
    })
  );

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_missing/voice-session",
      method: "POST",
      token,
      body: {
        responseLanguage: "Punjabi",
      },
    });
    assert.equal(response.status, 404);
    assert.equal(payload.message, "Lesson not found.");
  } finally {
    server.close();
  }
});

test("student AI voice session returns a grounded realtime payload", async () => {
  const token = signToken("user_voice_ok", Role.STUDENT);
  let receivedLanguage = "";
  const { server, baseUrl } = await createServer(
    createServiceStub({
      async createVoiceSession(_userId, lessonId, input) {
        receivedLanguage = String(input?.responseLanguage || "");
        return {
          clientSecret: "rt_secret_123",
          expiresAt: "2026-03-14T12:00:00.000Z",
          session: {
            id: "sess_123",
            model: "gpt-realtime",
            voice: "marin",
            lessonId,
            preferredLanguage: "English",
          },
          context: {
            lessonId,
            lessonTitle: "Sample Lesson",
            chapterTitle: "Sample Chapter",
            courseTitle: "Sample Course",
            hasTranscript: true,
          },
        };
      },
    })
  );

  try {
    const { response, payload } = await requestJson({
      baseUrl,
      path: "/student/ai/lesson/lesson_1/voice-session",
      method: "POST",
      token,
      body: {
        responseLanguage: "English",
      },
    });
    assert.equal(response.status, 201);
    assert.equal(receivedLanguage, "English");
    assert.equal(payload.clientSecret, "rt_secret_123");
    assert.equal(payload.session.model, "gpt-realtime");
    assert.equal(payload.context.lessonId, "lesson_1");
  } finally {
    server.close();
  }
});
