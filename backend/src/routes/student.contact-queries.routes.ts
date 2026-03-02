import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";

export const studentContactQueriesRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT, Role.ADMIN)] as const;

const createConversationSchema = z.object({
  subject: z.string().trim().min(2, "Subject is required.").max(191),
  message: z.string().trim().min(2, "Message is required.").max(5000),
  sourcePage: z.string().trim().max(191).optional(),
  sourceUrl: z.string().trim().max(1000).optional(),
});

const replySchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(5000),
});

const summarizeMessage = (value: string) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
};

const serializeConversation = (item: {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  sourcePage: string | null;
  sourceUrl: string | null;
  status: string;
  latestMessageText: string | null;
  repliedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages: number };
}) => ({
  id: item.id,
  userId: item.userId,
  name: item.name,
  email: item.email,
  sourcePage: item.sourcePage,
  sourceUrl: item.sourceUrl,
  status: item.status,
  latestMessageText: item.latestMessageText,
  repliedAt: item.repliedAt ? item.repliedAt.toISOString() : null,
  closedAt: item.closedAt ? item.closedAt.toISOString() : null,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
  messageCount: Number(item._count?.messages || 0),
});

const serializeMessage = (item: {
  id: string;
  senderType: "VISITOR" | "ADMIN";
  senderName: string;
  senderEmail: string | null;
  body: string;
  createdAt: Date;
}) => ({
  id: item.id,
  senderType: item.senderType,
  senderName: item.senderName,
  senderEmail: item.senderEmail,
  body: item.body,
  createdAt: item.createdAt.toISOString(),
});

const loadStudentRecord = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
    },
  });
  if (!user) throw new AppError("Student account not found.", 404);
  return user;
};

const ensureConversationBelongsToStudent = async (conversationId: string, userId: string) => {
  const conversation = await prisma.contactConversation.findFirst({
    where: {
      id: conversationId,
      user: { is: { id: userId } },
    },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!conversation) throw new AppError("Conversation not found.", 404);
  return conversation;
};

studentContactQueriesRouter.get("/contact-queries", ...ensureStudent, async (req, res, next) => {
  try {
    const conversations = await prisma.contactConversation.findMany({
      where: { user: { is: { id: req.user!.userId } } },
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { messages: true } } },
      take: 100,
    });

    const overview = {
      OPEN: 0,
      REPLIED: 0,
      CLOSED: 0,
    };
    conversations.forEach((item) => {
      overview[item.status] += 1;
    });

    res.json({
      conversations: conversations.map(serializeConversation),
      overview,
    });
  } catch (error) {
    next(error);
  }
});

studentContactQueriesRouter.get("/contact-queries/:id", ...ensureStudent, async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || "").trim();
    if (!conversationId) throw new AppError("Conversation id is required.", 400);
    const conversation = await ensureConversationBelongsToStudent(conversationId, req.user!.userId);
    res.json({
      conversation: serializeConversation(conversation),
      messages: conversation.messages.map(serializeMessage),
    });
  } catch (error) {
    next(error);
  }
});

studentContactQueriesRouter.post("/contact-queries", ...ensureStudent, async (req, res, next) => {
  try {
    const input = createConversationSchema.parse(req.body || {});
    const student = await loadStudentRecord(req.user!.userId);
    const subject = input.subject.trim();
    const initialMessage = `${subject}\n\n${input.message.trim()}`;
    const conversation = await prisma.contactConversation.create({
      data: {
        user: { connect: { id: student.id } },
        name: student.name,
        email: student.email || `${student.mobile}@ccacademy.local`,
        sourcePage: input.sourcePage || "student-support",
        sourceUrl: input.sourceUrl,
        status: "OPEN",
        latestMessageText: summarizeMessage(initialMessage),
        messages: {
          create: {
            senderType: "VISITOR",
            senderName: student.name,
            senderEmail: student.email || null,
            body: initialMessage,
          },
        },
      },
      include: { _count: { select: { messages: true } } },
    });

    res.status(201).json({
      message: "Conversation started successfully.",
      conversation: serializeConversation(conversation),
    });
  } catch (error) {
    next(error);
  }
});

studentContactQueriesRouter.post("/contact-queries/:id/messages", ...ensureStudent, async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || "").trim();
    if (!conversationId) throw new AppError("Conversation id is required.", 400);
    const input = replySchema.parse(req.body || {});
    const student = await loadStudentRecord(req.user!.userId);
    await ensureConversationBelongsToStudent(conversationId, req.user!.userId);
    const now = new Date();

    const [, message] = await prisma.$transaction([
      prisma.contactConversation.update({
        where: { id: conversationId },
        data: {
          status: "OPEN",
          latestMessageText: summarizeMessage(input.message),
          closedAt: null,
          updatedAt: now,
        },
      }),
      prisma.contactMessage.create({
        data: {
          conversationId,
          senderType: "VISITOR",
          senderName: student.name,
          senderEmail: student.email || null,
          body: input.message,
        },
      }),
    ]);

    res.status(201).json({
      message: "Message sent successfully.",
      reply: serializeMessage(message),
    });
  } catch (error) {
    next(error);
  }
});
