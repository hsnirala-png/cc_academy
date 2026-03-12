import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { lessonAiService } from "../modules/ai/lesson-ai.service";

const ensureStudent = [requireAuth, requireRole(Role.STUDENT)] as const;

const conversationMessageSchema = z.object({
  content: z.string().trim().min(1, "Message is required.").max(4000, "Message is too long."),
  selectedText: z.string().trim().max(3000, "Selected text is too long.").optional(),
  requestType: z.string().trim().max(40).optional(),
});

type LessonAiRouteService = Pick<
  typeof lessonAiService,
  "getOrCreateConversation" | "getConversation" | "sendMessage"
>;

export const createStudentAiRouter = (service: LessonAiRouteService = lessonAiService) => {
  const router = Router();

  router.post("/ai/lesson/:lessonId/conversations", ...ensureStudent, async (req, res, next) => {
    try {
      const payload = await service.getOrCreateConversation(req.user!.userId, String(req.params.lessonId || "").trim());
      res.status(201).json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.get("/ai/lesson/:lessonId/conversations/:conversationId", ...ensureStudent, async (req, res, next) => {
    try {
      const payload = await service.getConversation(
        req.user!.userId,
        String(req.params.lessonId || "").trim(),
        String(req.params.conversationId || "").trim()
      );
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/ai/lesson/:lessonId/conversations/:conversationId/messages",
    ...ensureStudent,
    async (req, res, next) => {
      try {
        const input = conversationMessageSchema.parse(req.body || {});
        const payload = await service.sendMessage(
          req.user!.userId,
          String(req.params.lessonId || "").trim(),
          String(req.params.conversationId || "").trim(),
          input
        );
        res.status(201).json(payload);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

export const studentAiRouter = createStudentAiRouter();
