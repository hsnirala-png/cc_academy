import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";

export const adminContactQueriesRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const listQuerySchema = z.object({
  status: z.enum(["OPEN", "REPLIED", "CLOSED"]).optional(),
  search: optionalTrimmedString(191),
});

const replySchema = z.object({
  message: z.string().trim().min(1, "Reply is required.").max(5000),
  status: z.enum(["OPEN", "REPLIED", "CLOSED"]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "REPLIED", "CLOSED"]),
});

const summarizeMessage = (value: string) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
};

const serializeConversation = (item: {
  id: string;
  name: string;
  email: string;
  sourcePage: string | null;
  sourceUrl: string | null;
  status: "OPEN" | "REPLIED" | "CLOSED";
  latestMessageText: string | null;
  repliedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages: number };
}) => ({
  id: item.id,
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

const resolveConversationStatusUpdate = (status: "OPEN" | "REPLIED" | "CLOSED", now: Date) => {
  if (status === "CLOSED") {
    return { status, repliedAt: now, closedAt: now };
  }
  if (status === "REPLIED") {
    return { status, repliedAt: now, closedAt: null };
  }
  return { status, closedAt: null };
};

adminContactQueriesRouter.get("/contact-queries", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = listQuerySchema.parse(req.query || {});
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search } },
              { email: { contains: input.search } },
              { latestMessageText: { contains: input.search } },
            ],
          }
        : {}),
    };

    const [conversations, totals] = await Promise.all([
      prisma.contactConversation.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        include: { _count: { select: { messages: true } } },
        take: 200,
      }),
      prisma.contactConversation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const overview = {
      OPEN: 0,
      REPLIED: 0,
      CLOSED: 0,
    };
    totals.forEach((item) => {
      overview[item.status] = Number(item._count._all || 0);
    });

    res.json({
      conversations: conversations.map(serializeConversation),
      overview,
    });
  } catch (error) {
    next(error);
  }
});

adminContactQueriesRouter.get("/contact-queries/:id", ...ensureAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) throw new AppError("Conversation id is required.", 400);

    const conversation = await prisma.contactConversation.findUnique({
      where: { id },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) throw new AppError("Contact conversation not found.", 404);

    res.json({
      conversation: serializeConversation(conversation),
      messages: conversation.messages.map(serializeMessage),
    });
  } catch (error) {
    next(error);
  }
});

adminContactQueriesRouter.post("/contact-queries/:id/messages", ...ensureAdmin, async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || "").trim();
    if (!conversationId) throw new AppError("Conversation id is required.", 400);
    const input = replySchema.parse(req.body || {});

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true, email: true },
    });

    if (!adminUser) throw new AppError("Admin user not found.", 404);

    const existing = await prisma.contactConversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!existing) throw new AppError("Contact conversation not found.", 404);

    const now = new Date();
    const status = input.status || "REPLIED";

    const [, message] = await prisma.$transaction([
      prisma.contactConversation.update({
        where: { id: conversationId },
        data: {
          latestMessageText: summarizeMessage(input.message),
          ...resolveConversationStatusUpdate(status, now),
        },
      }),
      prisma.contactMessage.create({
        data: {
          conversationId,
          senderType: "ADMIN",
          senderName: adminUser.name,
          senderEmail: adminUser.email,
          body: input.message,
        },
      }),
    ]);

    res.status(201).json({
      message: "Reply saved successfully.",
      reply: serializeMessage(message),
    });
  } catch (error) {
    next(error);
  }
});

adminContactQueriesRouter.patch("/contact-queries/:id/status", ...ensureAdmin, async (req, res, next) => {
  try {
    const conversationId = String(req.params.id || "").trim();
    if (!conversationId) throw new AppError("Conversation id is required.", 400);
    const input = statusSchema.parse(req.body || {});
    const now = new Date();

    const updated = await prisma.contactConversation.update({
      where: { id: conversationId },
      data: resolveConversationStatusUpdate(input.status, now),
      include: { _count: { select: { messages: true } } },
    });

    res.json({
      message: "Conversation status updated.",
      conversation: serializeConversation(updated),
    });
  } catch (error) {
    next(error);
  }
});
