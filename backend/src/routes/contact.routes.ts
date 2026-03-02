import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

export const contactRouter = Router();

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const createContactSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(191),
  email: z.string().trim().email("Enter a valid email address.").max(191),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
  sourcePage: optionalTrimmedString(191),
  sourceUrl: optionalTrimmedString(1000),
});

const summarizeMessage = (value: string) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
};

contactRouter.post("/contact", async (req, res, next) => {
  try {
    const input = createContactSchema.parse(req.body || {});
    const conversation = await prisma.contactConversation.create({
      data: {
        name: input.name,
        email: input.email,
        sourcePage: input.sourcePage,
        sourceUrl: input.sourceUrl,
        latestMessageText: summarizeMessage(input.message),
        messages: {
          create: {
            senderType: "VISITOR",
            senderName: input.name,
            senderEmail: input.email,
            body: input.message,
          },
        },
      },
    });

    res.status(201).json({
      message: "Your message has been sent to the admin team.",
      conversation: {
        id: conversation.id,
        status: conversation.status,
        createdAt: conversation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});
