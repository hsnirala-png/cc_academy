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

const createServer = async (service: Parameters<typeof createStudentAiRouter>[0]) => {
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

test("student AI routes block unauthorized requests", async () => {
  const { server, baseUrl } = await createServer({
    async getOrCreateConversation() {
      throw new Error("should not be called");
    },
    async getConversation() {
      throw new Error("should not be called");
    },
    async sendMessage() {
      throw new Error("should not be called");
    },
  });

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
  const { server, baseUrl } = await createServer({
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
    async getConversation() {
      throw new Error("not used");
    },
    async sendMessage() {
      throw new Error("not used");
    },
  });

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
  const { server, baseUrl } = await createServer({
    async getOrCreateConversation() {
      throw new Error("should not be called");
    },
    async getConversation() {
      throw new Error("should not be called");
    },
    async sendMessage() {
      throw new Error("should not be called");
    },
  });

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
  const { server, baseUrl } = await createServer({
    async getOrCreateConversation() {
      throw new Error("not used");
    },
    async getConversation() {
      throw new AppError("Conversation not found.", 404);
    },
    async sendMessage() {
      throw new Error("not used");
    },
  });

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
  const { server, baseUrl } = await createServer({
    async getOrCreateConversation() {
      throw new Error("not used");
    },
    async getConversation() {
      throw new Error("not used");
    },
    async sendMessage() {
      throw new AppError("Conversation not found.", 404);
    },
  });

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
  const { server, baseUrl } = await createServer({
    async getOrCreateConversation() {
      throw new AppError("Lesson AI storage is not ready right now. Please try again later.", 503);
    },
    async getConversation() {
      throw new Error("not used");
    },
    async sendMessage() {
      throw new Error("not used");
    },
  });

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
