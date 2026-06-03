import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { requireTeacherHubEnabled } from "../middlewares/requireTeacherHubEnabled";
import { teacherBillingService } from "../modules/teacher-hub/teacher-billing.service";
import { teacherBoardService } from "../modules/teacher-hub/teacher-board.service";
import { teacherContentService } from "../modules/teacher-hub/teacher-content.service";
import { teacherEnrollmentService } from "../modules/teacher-hub/teacher-enrollment.service";
import { teacherNoticeService } from "../modules/teacher-hub/teacher-notice.service";
import { teacherRequirementService } from "../modules/teacher-hub/teacher-requirement.service";

export const studentTeacherHubRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT), requireTeacherHubEnabled("student")] as const;

const requirementSchema = z.object({
  board: z.string().trim().max(120).optional(),
  classLevel: z.coerce.number().int().min(1).max(12).optional(),
  subject: z.string().trim().min(1).max(120),
  modeWanted: z.enum(["ONE_TO_ONE", "BATCH"]).default("ONE_TO_ONE"),
  goals: z.string().trim().max(4000).optional(),
});

const orderVerifySchema = z.object({
  orderId: z.string().trim().min(1),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

studentTeacherHubRouter.get("/teacher-hub/bootstrap", ...ensureStudent, async (_req, res) => {
  res.json({
    ok: true,
    phase: "phase-1",
    flow: {
      studentHome: "/teacher-hub-student.html",
      requirementsPage: "/teacher-hub-student-requirements.html",
      enrollmentsPage: "/teacher-hub-student-enrollments.html",
      noticesPage: "/teacher-hub-student-notices.html",
      contentPage: "/teacher-hub-student-content.html",
    },
  });
});

studentTeacherHubRouter.get("/teacher-hub/requirements", ...ensureStudent, async (req, res, next) => {
  try {
    const requirements = await teacherRequirementService.listStudentRequirements(req.user!.userId);
    res.json({ ok: true, requirements });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.post("/teacher-hub/requirements", ...ensureStudent, async (req, res, next) => {
  try {
    const input = requirementSchema.parse(req.body || {});
    const requirement = await teacherRequirementService.createRequirement(req.user!.userId, input);
    res.status(201).json({ ok: true, requirement });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.get("/teacher-hub/enrollments", ...ensureStudent, async (req, res, next) => {
  try {
    const enrollments = await teacherEnrollmentService.listStudentEnrollments(req.user!.userId);
    res.json({ ok: true, enrollments });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.get("/teacher-hub/notices", ...ensureStudent, async (req, res, next) => {
  try {
    const notices = await teacherNoticeService.listStudentNotices(req.user!.userId);
    res.json({ ok: true, notices });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.post("/teacher-hub/notices/:noticeId/read", ...ensureStudent, async (req, res, next) => {
  try {
    const payload = await teacherNoticeService.markRead(req.user!.userId, req.params.noticeId);
    res.json({ ok: true, receipt: payload });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.get("/teacher-hub/content", ...ensureStudent, async (req, res, next) => {
  try {
    const content = await teacherContentService.listStudentContent(req.user!.userId);
    res.json({ ok: true, content });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.get("/teacher-hub/boards/:boardId", ...ensureStudent, async (req, res, next) => {
  try {
    const board = await teacherBoardService.getStudentBoard(req.user!.userId, req.params.boardId);
    res.json({ ok: true, ...board });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.get(
  "/teacher-hub/enrollments/:enrollmentId/orders/preview",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const preview = await teacherBillingService.previewEnrollmentOrder(req.user!.userId, req.params.enrollmentId);
      res.json({ ok: true, preview });
    } catch (error) {
      next(error);
    }
  }
);

studentTeacherHubRouter.post(
  "/teacher-hub/enrollments/:enrollmentId/orders",
  ...ensureStudent,
  async (req, res, next) => {
    try {
      const order = await teacherBillingService.createPendingOrder(req.user!.userId, req.params.enrollmentId);
      res.status(201).json({ ok: true, order });
    } catch (error) {
      next(error);
    }
  }
);

studentTeacherHubRouter.post("/teacher-hub/orders/:orderId/payment-order", ...ensureStudent, async (req, res, next) => {
  try {
    const payment = await teacherBillingService.createRazorpayOrder(req.user!.userId, req.params.orderId);
    res.status(201).json({ ok: true, ...payment });
  } catch (error) {
    next(error);
  }
});

studentTeacherHubRouter.post("/teacher-hub/orders/verify", ...ensureStudent, async (req, res, next) => {
  try {
    const input = orderVerifySchema.parse(req.body || {});
    const order = await teacherBillingService.verifyPayment(req.user!.userId, input);
    res.json({ ok: true, order });
  } catch (error) {
    next(error);
  }
});
