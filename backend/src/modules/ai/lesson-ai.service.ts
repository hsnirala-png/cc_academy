import { AiConversationMode, AiMessageRole, Prisma, PrismaClient } from "@prisma/client";
import { lessonService } from "../lessons/lesson.service";
import { AppError } from "../../utils/appError";
import { prisma as defaultPrisma } from "../../utils/prisma";
import {
  createLessonAiProvider,
  lessonAiFallbackMessage,
  lessonAiSelectionNeedsMoreContextMessage,
  lessonAiUnavailableMessage,
  LessonAiContext,
  LessonAiHistoryMessage,
  LessonAiProvider,
} from "./lesson-ai.provider";

type LessonPayload = Awaited<ReturnType<typeof lessonService.getLessonForUser>>;

type AiConversationRecord = {
  id: string;
  userId: string;
  lessonId: string;
  title: string;
  mode: AiConversationMode;
  createdAt: Date;
  updatedAt: Date;
  messages: AiMessageRecord[];
};

type AiMessageRecord = {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  contextSnapshotJson: unknown;
  tokenUsage: number | null;
  createdAt: Date;
};

type LessonAiRepository = {
  findLatestConversation(userId: string, lessonId: string, mode: AiConversationMode): Promise<AiConversationRecord | null>;
  createConversation(input: {
    userId: string;
    lessonId: string;
    title: string;
    mode: AiConversationMode;
  }): Promise<AiConversationRecord>;
  getConversation(userId: string, lessonId: string, conversationId: string): Promise<AiConversationRecord | null>;
  createMessage(input: {
    conversationId: string;
    role: AiMessageRole;
    content: string;
    contextSnapshotJson?: unknown;
    tokenUsage?: number | null;
  }): Promise<AiMessageRecord>;
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_SELECTION_LENGTH = 3000;
const MAX_CONTEXT_EXCERPT_LENGTH = 1800;
const MIN_SELECTION_LENGTH = 20;
const MIN_SELECTION_WORDS = 4;
const LESSON_AI_STORAGE_UNAVAILABLE_CODE = "LESSON_AI_STORAGE_UNAVAILABLE";

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim();

const clipText = (value: string, limit: number) => {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
};

const normalizeRequestType = (value?: string) => String(value || "CHAT").trim().toUpperCase() || "CHAT";

const resolveResponseLanguage = (requestType: string, content: string) => {
  const normalizedType = normalizeRequestType(requestType);
  if (normalizedType.includes("PUNJABI")) return "Punjabi";
  if (normalizedType.includes("HINDI")) return "Hindi";
  if (normalizedType.includes("ENGLISH")) return "English";

  const normalizedContent = normalizeText(content).toLowerCase();
  if (normalizedContent.includes(" in punjabi")) return "Punjabi";
  if (normalizedContent.includes(" in hindi")) return "Hindi";
  if (normalizedContent.includes(" in english")) return "English";
  return null;
};

const selectionNeedsClarification = (value: string) => {
  const text = normalizeText(value);
  if (!text) return true;
  const words = text.split(/\s+/).filter(Boolean);
  return text.length < MIN_SELECTION_LENGTH || words.length < MIN_SELECTION_WORDS;
};

const parseTranscriptSegments = (value: unknown): LessonAiContext["transcriptSegments"] => {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { segments?: unknown[] }).segments)
      ? (value as { segments: unknown[] }).segments
      : [];

  return source
    .map((item) => ({
      startMs: Math.max(0, Number((item as { startMs?: unknown; start?: unknown }).startMs ?? (item as { start?: unknown }).start ?? 0)),
      endMs: Math.max(0, Number((item as { endMs?: unknown; end?: unknown }).endMs ?? (item as { end?: unknown }).end ?? 0)),
      text: normalizeText((item as { text?: unknown }).text),
    }))
    .filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs > item.startMs && item.text);
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

const createPrismaLessonAiRepository = (db: PrismaClient): LessonAiRepository => ({
  async findLatestConversation(userId, lessonId, mode) {
    return db.aiConversation.findFirst({
      where: {
        userId,
        lessonId,
        mode,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  },

  async createConversation(input) {
    try {
      return await db.aiConversation.create({
        data: {
          userId: input.userId,
          lessonId: input.lessonId,
          title: input.title,
          mode: input.mode,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await db.aiConversation.findFirst({
          where: {
            userId: input.userId,
            lessonId: input.lessonId,
            mode: input.mode,
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });
        if (existing) return existing;
      }
      throw error;
    }
  },

  async getConversation(userId, lessonId, conversationId) {
    return db.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        lessonId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  },

  async createMessage(input) {
    return db.aiMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        contextSnapshotJson:
          (input.contextSnapshotJson ?? undefined) as import("@prisma/client").Prisma.InputJsonValue | undefined,
        tokenUsage: input.tokenUsage ?? null,
      },
    });
  },
});

const serializeMessage = (message: AiMessageRecord) => ({
  id: message.id,
  conversationId: message.conversationId,
  role: message.role,
  content: message.content,
  contextSnapshotJson: message.contextSnapshotJson ?? null,
  tokenUsage: message.tokenUsage ?? null,
  createdAt: message.createdAt.toISOString(),
});

const serializeConversation = (conversation: AiConversationRecord) => ({
  id: conversation.id,
  userId: conversation.userId,
  lessonId: conversation.lessonId,
  title: conversation.title,
  mode: conversation.mode,
  createdAt: conversation.createdAt.toISOString(),
  updatedAt: conversation.updatedAt.toISOString(),
  messages: Array.isArray(conversation.messages) ? conversation.messages.map(serializeMessage) : [],
});

const serializeContext = (context: LessonAiContext) => ({
  lessonId: context.lessonId,
  lessonTitle: context.lessonTitle,
  chapterTitle: context.chapterTitle,
  courseTitle: context.courseTitle,
  hasTranscript: Boolean(normalizeText(context.transcriptText) || context.transcriptSegments.length),
});

const buildContextSnapshot = (
  context: LessonAiContext,
  {
    selectedText = "",
    requestType = "CHAT",
    responseLanguage = null,
  }: {
    selectedText?: string;
    requestType?: string;
    responseLanguage?: string | null;
  } = {}
) => {
  const transcriptSource =
    normalizeText(context.transcriptText) ||
    context.transcriptSegments
      .map((segment) => normalizeText(segment.text))
      .filter(Boolean)
      .join("\n");

  return {
    requestType,
    responseLanguage,
    lessonId: context.lessonId,
    lessonTitle: context.lessonTitle,
    chapterTitle: context.chapterTitle,
    courseTitle: context.courseTitle,
    selectedText: clipText(selectedText, MAX_SELECTION_LENGTH) || null,
    transcriptExcerpt: clipText(transcriptSource, MAX_CONTEXT_EXCERPT_LENGTH) || null,
  };
};

const hasGroundingContext = (context: LessonAiContext) =>
  Boolean(normalizeText(context.transcriptText) || context.transcriptSegments.length);

const normalizeLessonAiStorageError = (error: unknown): AppError | null => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      "Lesson AI storage is not ready right now. Please try again later.",
      503,
      LESSON_AI_STORAGE_UNAVAILABLE_CODE
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022" || error.code === "P2024") {
      return new AppError(
        "Lesson AI storage is not ready right now. Please try again later.",
        503,
        LESSON_AI_STORAGE_UNAVAILABLE_CODE
      );
    }
  }

  const message = String((error as { message?: string })?.message || "").toLowerCase();
  if (
    message.includes("aiconversation") ||
    message.includes("aimessage") ||
    message.includes("database schema mismatch")
  ) {
    return new AppError(
      "Lesson AI storage is not ready right now. Please try again later.",
      503,
      LESSON_AI_STORAGE_UNAVAILABLE_CODE
    );
  }

  return null;
};

const toHistoryMessages = (messages: AiMessageRecord[]): LessonAiHistoryMessage[] =>
  messages
    .map((message) => ({
      role: (message.role === AiMessageRole.ASSISTANT ? "ASSISTANT" : "USER") as LessonAiHistoryMessage["role"],
      content: normalizeText(message.content),
    }))
    .filter((message) => message.role === "USER" && Boolean(message.content));

export const createLessonAiService = ({
  repository = createPrismaLessonAiRepository(defaultPrisma),
  provider = createLessonAiProvider(),
  loadLessonContext = defaultLessonContextLoader,
}: {
  repository?: LessonAiRepository;
  provider?: LessonAiProvider;
  loadLessonContext?: (userId: string, lessonId: string) => Promise<LessonAiContext>;
} = {}) => {
  const ensureAccessibleContext = async (userId: string, lessonId: string) => {
    const context = await loadLessonContext(userId, lessonId);
    if (!context.lessonId) {
      throw new AppError("Lesson not found.", 404);
    }
    return context;
  };

  return {
    async getOrCreateConversation(userId: string, lessonId: string) {
      try {
        const context = await ensureAccessibleContext(userId, lessonId);
        const existing = await repository.findLatestConversation(userId, lessonId, AiConversationMode.LESSON_CHAT);
        const conversation =
          existing ||
          (await repository.createConversation({
            userId,
            lessonId,
            title: context.lessonTitle || "Lesson AI Teacher",
            mode: AiConversationMode.LESSON_CHAT,
          }));

        return {
          conversation: serializeConversation(conversation),
          context: serializeContext(context),
        };
      } catch (error) {
        throw normalizeLessonAiStorageError(error) || error;
      }
    },

    async getConversation(userId: string, lessonId: string, conversationId: string) {
      try {
        const context = await ensureAccessibleContext(userId, lessonId);
        const conversation = await repository.getConversation(userId, lessonId, conversationId);
        if (!conversation) {
          throw new AppError("Conversation not found.", 404);
        }

        return {
          conversation: serializeConversation(conversation),
          context: serializeContext(context),
        };
      } catch (error) {
        throw normalizeLessonAiStorageError(error) || error;
      }
    },

    async sendMessage(
      userId: string,
      lessonId: string,
      conversationId: string,
      input: {
        content: string;
        selectedText?: string;
        requestType?: string;
      }
    ) {
      try {
        const context = await ensureAccessibleContext(userId, lessonId);
        const conversation = await repository.getConversation(userId, lessonId, conversationId);
        if (!conversation) {
          throw new AppError("Conversation not found.", 404);
        }

        const content = normalizeText(input.content);
        if (!content) {
          throw new AppError("Message is required.", 400);
        }
        if (content.length > MAX_MESSAGE_LENGTH) {
          throw new AppError(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`, 400);
        }

        const requestType = normalizeRequestType(input.requestType);
        const selectedText = clipText(String(input.selectedText || ""), MAX_SELECTION_LENGTH);
        const responseLanguage = resolveResponseLanguage(requestType, content);
        const userMessage = await repository.createMessage({
          conversationId: conversation.id,
          role: AiMessageRole.USER,
          content,
          contextSnapshotJson: buildContextSnapshot(context, {
            selectedText,
            requestType,
            responseLanguage,
          }),
        });

        let assistantContent = lessonAiFallbackMessage;
        let tokenUsage: number | null = null;
        if (requestType === "EXPLAIN_SELECTION" && selectionNeedsClarification(selectedText)) {
          assistantContent = lessonAiSelectionNeedsMoreContextMessage;
        } else if (hasGroundingContext(context)) {
          try {
            const providerResult = await provider.generateReply({
              context,
              userMessage: content,
              selectedText,
              history: [...toHistoryMessages(conversation.messages), { role: "USER", content }],
              requestType,
              responseLanguage,
            });
            assistantContent = normalizeText(providerResult.content) || lessonAiFallbackMessage;
            tokenUsage = providerResult.tokenUsage ?? null;
          } catch (error) {
            assistantContent = lessonAiUnavailableMessage;
            tokenUsage = null;
            const storageError = normalizeLessonAiStorageError(error);
            if (storageError && storageError.code === LESSON_AI_STORAGE_UNAVAILABLE_CODE) {
              throw storageError;
            }
          }
        }

        const assistantMessage = await repository.createMessage({
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: assistantContent,
          contextSnapshotJson: buildContextSnapshot(context, {
            selectedText,
            requestType,
            responseLanguage,
          }),
          tokenUsage,
        });

        const refreshedConversation = await repository.getConversation(userId, lessonId, conversation.id);
        if (!refreshedConversation) {
          throw new AppError("Conversation not found.", 404);
        }

        return {
          conversation: serializeConversation(refreshedConversation),
          context: serializeContext(context),
          userMessage: serializeMessage(userMessage),
          assistantMessage: serializeMessage(assistantMessage),
        };
      } catch (error) {
        throw normalizeLessonAiStorageError(error) || error;
      }
    },
  };
};

export const lessonAiService = createLessonAiService();
