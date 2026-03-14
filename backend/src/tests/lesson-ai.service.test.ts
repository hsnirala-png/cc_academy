import assert from "node:assert/strict";
import test from "node:test";
import { AiConversationMode, AiMessageRole } from "@prisma/client";
import { createLessonAiService } from "../modules/ai/lesson-ai.service";
import {
  lessonAiFallbackMessage,
  lessonAiSelectionNeedsMoreContextMessage,
} from "../modules/ai/lesson-ai.provider";
import { AppError } from "../utils/appError";

const createInMemoryRepository = () => {
  const conversations: Array<{
    id: string;
    userId: string;
    lessonId: string;
    title: string;
    mode: AiConversationMode;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const messages: Array<{
    id: string;
    conversationId: string;
    role: AiMessageRole;
    content: string;
    contextSnapshotJson: unknown;
    tokenUsage: number | null;
    createdAt: Date;
  }> = [];

  const attachMessages = <T extends { id: string }>(conversation: T | null) => {
    if (!conversation) return null;
    return {
      ...conversation,
      messages: messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    };
  };

  return {
    raw: {
      conversations,
      messages,
    },
    repository: {
      async findLatestConversation(userId: string, lessonId: string, mode: AiConversationMode) {
        const conversation = [...conversations]
          .filter((item) => item.userId === userId && item.lessonId === lessonId && item.mode === mode)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] || null;
        return attachMessages(conversation);
      },
      async createConversation(input: {
        userId: string;
        lessonId: string;
        title: string;
        mode: AiConversationMode;
      }) {
        const conversation = {
          id: `conv_${conversations.length + 1}`,
          userId: input.userId,
          lessonId: input.lessonId,
          title: input.title,
          mode: input.mode,
          createdAt: new Date(Date.now() + conversations.length),
          updatedAt: new Date(Date.now() + conversations.length),
        };
        conversations.push(conversation);
        return attachMessages(conversation)!;
      },
      async getConversation(userId: string, lessonId: string, conversationId: string) {
        const conversation =
          conversations.find(
            (item) => item.id === conversationId && item.userId === userId && item.lessonId === lessonId
          ) || null;
        return attachMessages(conversation);
      },
      async createMessage(input: {
        conversationId: string;
        role: AiMessageRole;
        content: string;
        contextSnapshotJson?: unknown;
        tokenUsage?: number | null;
      }) {
        const message = {
          id: `msg_${messages.length + 1}`,
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          contextSnapshotJson: input.contextSnapshotJson ?? null,
          tokenUsage: input.tokenUsage ?? null,
          createdAt: new Date(Date.now() + messages.length),
        };
        messages.push(message);
        const conversation = conversations.find((item) => item.id === input.conversationId);
        if (conversation) {
          conversation.updatedAt = new Date(message.createdAt);
        }
        return message;
      },
    },
  };
};

test("lesson AI message flow stores user and assistant messages", async () => {
  const memory = createInMemoryRepository();
  let providerCallCount = 0;
  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_1",
      lessonTitle: "Child Pedagogy",
      chapterTitle: "Chapter 1",
      courseTitle: "PSTET-2",
      transcriptText: "Learning starts from observation and guided practice.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply() {
        providerCallCount += 1;
        return {
          content: "Based on this lesson, learning starts from observation and guided practice.",
          tokenUsage: 42,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_1", "lesson_1");
  assert.equal(created.conversation.lessonId, "lesson_1");

  const reply = await service.sendMessage("user_1", "lesson_1", created.conversation.id, {
    content: "What is the main idea here?",
    requestType: "CHAT",
  });

  assert.equal(providerCallCount, 1);
  assert.equal(reply.conversation.messages.length, 2);
  assert.equal(reply.conversation.messages[0]?.role, "USER");
  assert.equal(reply.conversation.messages[1]?.role, "ASSISTANT");
  assert.equal(memory.raw.messages.length, 2);
  assert.equal(memory.raw.messages[0]?.role, AiMessageRole.USER);
  assert.equal(memory.raw.messages[1]?.role, AiMessageRole.ASSISTANT);
});

test("lesson AI falls back safely when transcript context is missing", async () => {
  const memory = createInMemoryRepository();
  let providerWasCalled = false;
  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_empty",
      lessonTitle: "Empty Lesson",
      chapterTitle: "Chapter 2",
      courseTitle: "PSTET-1",
      transcriptText: "",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply() {
        providerWasCalled = true;
        return {
          content: "This should not be used.",
          tokenUsage: 10,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_2", "lesson_empty");
  const reply = await service.sendMessage("user_2", "lesson_empty", created.conversation.id, {
    content: "Summarize this lesson.",
    requestType: "SUMMARIZE",
  });

  assert.equal(providerWasCalled, false);
  assert.equal(reply.assistantMessage.content, "The current lesson does not contain enough information to answer that safely.");
  assert.equal(reply.conversation.messages.length, 2);
});

test("lesson AI provider history excludes prior assistant replies", async () => {
  const memory = createInMemoryRepository();
  const observedHistories: Array<Array<{ role: string; content: string }>> = [];
  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_history",
      lessonTitle: "History Safe Lesson",
      chapterTitle: "Chapter 3",
      courseTitle: "PSTET-2",
      transcriptText: "Observation, examples, and guided practice are discussed in this lesson.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedHistories.push(input.history.map((item) => ({ role: item.role, content: item.content })));
        return {
          content: "Grounded reply.",
          tokenUsage: 12,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_3", "lesson_history");
  await service.sendMessage("user_3", "lesson_history", created.conversation.id, {
    content: "What is the topic?",
    requestType: "CHAT",
  });
  await service.sendMessage("user_3", "lesson_history", created.conversation.id, {
    content: "Summarize again.",
    requestType: "SUMMARIZE",
  });

  assert.equal(observedHistories.length, 2);
  assert.deepEqual(
    observedHistories[1]?.map((item) => item.role),
    ["USER", "USER"]
  );
});

test("lesson AI returns an assistant fallback when provider is unavailable", async () => {
  const memory = createInMemoryRepository();
  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_provider_down",
      lessonTitle: "Unavailable Provider Lesson",
      chapterTitle: "Chapter 4",
      courseTitle: "PSTET-1",
      transcriptText: "This lesson has transcript text for grounding.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply() {
        throw new AppError("Lesson AI provider is unavailable.", 503);
      },
    },
  });

  const created = await service.getOrCreateConversation("user_4", "lesson_provider_down");
  const reply = await service.sendMessage("user_4", "lesson_provider_down", created.conversation.id, {
    content: "Explain this lesson.",
    requestType: "CHAT",
  });

  assert.equal(reply.assistantMessage.role, "ASSISTANT");
  assert.equal(reply.assistantMessage.content, "Lesson AI is temporarily unavailable. Please try again later.");
  assert.equal(reply.conversation.messages.length, 2);
});

test("lesson AI passes language-aware explain requests to the provider", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    responseLanguage?: string | null;
    selectedText?: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_lang",
      lessonTitle: "Language Lesson",
      chapterTitle: "Chapter 5",
      courseTitle: "PSTET-2",
      transcriptText: "Learning happens through observation, explanation, and practice in this lesson.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          responseLanguage: input.responseLanguage,
          selectedText: input.selectedText,
        });
        return {
          content: "Punjabi explanation.",
          tokenUsage: 21,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_lang", "lesson_lang");
  await service.sendMessage("user_lang", "lesson_lang", created.conversation.id, {
    content: "Explain the current lesson like an exam teacher in Punjabi.",
    requestType: "EXPLAIN_LESSON_PUNJABI",
  });

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "EXPLAIN_LESSON_PUNJABI");
  assert.equal(observedCalls[0]?.responseLanguage, "Punjabi");
  assert.equal(observedCalls[0]?.selectedText, "");
});

test("lesson AI asks for a clearer transcript selection when the excerpt is too short", async () => {
  const memory = createInMemoryRepository();
  let providerWasCalled = false;

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_selection",
      lessonTitle: "Selection Lesson",
      chapterTitle: "Chapter 6",
      courseTitle: "PSTET-1",
      transcriptText: "Children learn through guided examples and repeated practice in this lesson.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply() {
        providerWasCalled = true;
        return {
          content: "This should not be used.",
          tokenUsage: 9,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_selection", "lesson_selection");
  const reply = await service.sendMessage("user_selection", "lesson_selection", created.conversation.id, {
    content: "Explain the selected lesson text like a teacher.",
    selectedText: "practice",
    requestType: "EXPLAIN_SELECTION",
  });

  assert.equal(providerWasCalled, false);
  assert.equal(reply.assistantMessage.content, lessonAiSelectionNeedsMoreContextMessage);
});

test("lesson AI summary requests stay grounded in the current lesson context", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    responseLanguage?: string | null;
    transcriptText: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_summary",
      lessonTitle: "Summary Lesson",
      chapterTitle: "Chapter 7",
      courseTitle: "PSTET-2",
      transcriptText: "This lesson explains observation, classroom examples, and guided practice for revision.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          responseLanguage: input.responseLanguage,
          transcriptText: input.context.transcriptText,
        });
        return {
          content: "Study Notes:\n- Concept: observation\n- Simple explanation: guided practice\n- Exam point: revise examples",
          tokenUsage: 18,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_summary", "lesson_summary");
  const reply = await service.sendMessage("user_summary", "lesson_summary", created.conversation.id, {
    content: "Create short, exam-focused study notes for this lesson using only the lesson context.",
    requestType: "SUMMARIZE",
  });

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "SUMMARIZE");
  assert.equal(
    observedCalls[0]?.transcriptText,
    "This lesson explains observation, classroom examples, and guided practice for revision."
  );
  assert.match(reply.assistantMessage.content, /Study Notes:/);
});

test("manual lesson doubt uses EXPLAIN_LESSON for grounded paraphrased concept explanation", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    userMessage: string;
    transcriptText: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_manual",
      lessonTitle: "Manual Doubt Lesson",
      chapterTitle: "Chapter 8",
      courseTitle: "PSTET-2",
      transcriptText: "Children learn through observation, guided explanation, and repeated practice in this lesson.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          userMessage: input.userMessage,
          transcriptText: input.context.transcriptText,
        });
        return {
          content: "Concept: observation and practice\nSimple explanation: the lesson says learning improves through guided explanation and repeated practice.\nExam point: connect learning with guided practice.",
          tokenUsage: 24,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_manual", "lesson_manual");
  const reply = await service.sendMessage("user_manual", "lesson_manual", created.conversation.id, {
    content: "How does this lesson explain that children improve learning by practice?",
    requestType: "EXPLAIN_LESSON",
  });

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "EXPLAIN_LESSON");
  assert.match(observedCalls[0]?.transcriptText || "", /guided explanation, and repeated practice/i);
  assert.match(reply.assistantMessage.content, /Simple explanation:/);
});

test("manual English doubt can stay grounded against Punjabi transcript content", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    responseLanguage?: string | null;
    transcriptText: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_cross_language",
      lessonTitle: "Punjabi Transcript Lesson",
      chapterTitle: "Chapter 9",
      courseTitle: "PSTET-2",
      transcriptText:
        "ਵਿਕਾਸ ਅਤੇ ਸਿੱਖਣ ਦਾ ਆਪਸੀ ਸੰਬੰਧ ਗਹਿਰਾ ਅਤੇ ਅਟੁੱਟ ਹੈ। ਵਿਕਾਸ ਸਿੱਖਣ ਲਈ ਆਧਾਰ ਤਿਆਰ ਕਰਦਾ ਹੈ, ਜਦਕਿ ਸਿੱਖਣ ਵਿਕਾਸ ਨੂੰ ਹੋਰ ਮਜ਼ਬੂਤ ਕਰਦਾ ਹੈ।",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          responseLanguage: input.responseLanguage,
          transcriptText: input.context.transcriptText,
        });
        return {
          content:
            "Concept: development and learning are deeply connected.\nSimple explanation: the lesson says development prepares the base for learning, and learning strengthens development.\nExam point: revise the two-way relationship between development and learning.",
          tokenUsage: 19,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_cross_language", "lesson_cross_language");
  const reply = await service.sendMessage(
    "user_cross_language",
    "lesson_cross_language",
    created.conversation.id,
    {
      content: "How does this lesson connect development with learning?",
      requestType: "EXPLAIN_LESSON",
    }
  );

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "EXPLAIN_LESSON");
  assert.equal(observedCalls[0]?.responseLanguage, null);
  assert.match(observedCalls[0]?.transcriptText || "", /ਵਿਕਾਸ ਅਤੇ ਸਿੱਖਣ/);
  assert.match(reply.assistantMessage.content, /development and learning are deeply connected/i);
});

test("manual doubt still falls back when the concept is not supported by the lesson", async () => {
  const memory = createInMemoryRepository();

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_unsupported",
      lessonTitle: "Unsupported Concept Lesson",
      chapterTitle: "Chapter 10",
      courseTitle: "PSTET-1",
      transcriptText: "This lesson explains observation and guided classroom practice.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply() {
        return {
          content: lessonAiFallbackMessage,
          tokenUsage: 11,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_unsupported", "lesson_unsupported");
  const reply = await service.sendMessage("user_unsupported", "lesson_unsupported", created.conversation.id, {
    content: "What does this lesson say about photosynthesis?",
    requestType: "EXPLAIN_LESSON",
  });

  assert.equal(reply.assistantMessage.content, lessonAiFallbackMessage);
});

test("lesson AI MCQ requests stay grounded in the current lesson context", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    transcriptText: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_mcq",
      lessonTitle: "MCQ Lesson",
      chapterTitle: "Chapter 11",
      courseTitle: "PSTET-2",
      transcriptText:
        "Observation supports learning. Guided explanation strengthens understanding. Repeated practice improves retention. Teacher support builds confidence.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          transcriptText: input.context.transcriptText,
        });
        return {
          content:
            "3 MCQs:\n1. According to this lesson, which point is correct?\nA. Observation supports learning.\nB. Guided explanation strengthens understanding.\nC. Repeated practice improves retention.\nD. Teacher support builds confidence.\n\n2. Which idea is emphasized in this lesson?\nA. Guided explanation strengthens understanding.\nB. Repeated practice improves retention.\nC. Teacher support builds confidence.\nD. Observation supports learning.\n\n3. Which idea should a student revise from this lesson?\nA. Repeated practice improves retention.\nB. Teacher support builds confidence.\nC. Observation supports learning.\nD. Guided explanation strengthens understanding.\n\nCorrect Answers:\n1. A\n2. A\n3. A",
          tokenUsage: 26,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_mcq", "lesson_mcq");
  const reply = await service.sendMessage("user_mcq", "lesson_mcq", created.conversation.id, {
    content: "Ask 3 MCQs from this lesson only. Give 4 options each and place the correct answers after all 3 questions.",
    requestType: "ASK_3_MCQS",
  });

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "ASK_3_MCQS");
  assert.match(observedCalls[0]?.transcriptText || "", /Observation supports learning/i);
  assert.match(reply.assistantMessage.content, /3 MCQs:/);
  assert.match(reply.assistantMessage.content, /Correct Answers:/);
});

test("lesson AI key exam points requests stay grounded in the current lesson context", async () => {
  const memory = createInMemoryRepository();
  const observedCalls: Array<{
    requestType?: string;
    transcriptText: string;
  }> = [];

  const service = createLessonAiService({
    repository: memory.repository,
    loadLessonContext: async () => ({
      lessonId: "lesson_key_points",
      lessonTitle: "Key Points Lesson",
      chapterTitle: "Chapter 12",
      courseTitle: "PSTET-1",
      transcriptText:
        "Development prepares the base for learning. Learning strengthens development. Teachers should consider age, readiness, and individual differences.",
      transcriptSegments: [],
    }),
    provider: {
      async generateReply(input) {
        observedCalls.push({
          requestType: input.requestType,
          transcriptText: input.context.transcriptText,
        });
        return {
          content:
            "Key Exam Points:\n- Development prepares the base for learning.\n- Learning strengthens development.\n- Teachers should consider age, readiness, and individual differences.",
          tokenUsage: 17,
          provider: "test",
          model: "fake",
        };
      },
    },
  });

  const created = await service.getOrCreateConversation("user_key_points", "lesson_key_points");
  const reply = await service.sendMessage("user_key_points", "lesson_key_points", created.conversation.id, {
    content: "Give key exam points from this lesson only. Keep them short, high-yield, and easy to revise.",
    requestType: "KEY_EXAM_POINTS",
  });

  assert.equal(observedCalls.length, 1);
  assert.equal(observedCalls[0]?.requestType, "KEY_EXAM_POINTS");
  assert.match(observedCalls[0]?.transcriptText || "", /Development prepares the base for learning/i);
  assert.match(reply.assistantMessage.content, /Key Exam Points:/);
});
