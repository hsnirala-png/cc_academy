import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireTeacherAccess } from "../middlewares/requireTeacherAccess";
import { requireTeacherHubEnabled } from "../middlewares/requireTeacherHubEnabled";
import { teacherBatchService } from "../modules/teacher-hub/teacher-batch.service";
import { teacherBoardService } from "../modules/teacher-hub/teacher-board.service";
import { teacherContentService } from "../modules/teacher-hub/teacher-content.service";
import { teacherEnrollmentService } from "../modules/teacher-hub/teacher-enrollment.service";
import { teacherKycService } from "../modules/teacher-hub/teacher-kyc.service";
import { teacherNoticeService } from "../modules/teacher-hub/teacher-notice.service";
import { teacherOfferingService } from "../modules/teacher-hub/teacher-offering.service";
import { teacherPayoutService } from "../modules/teacher-hub/teacher-payout.service";
import { teacherProfileService } from "../modules/teacher-hub/teacher-profile.service";

export const teacherHubRouter = Router();

const ensureTeacher = [requireAuth, requireTeacherAccess] as const;
const ensureTeacherCandidate = [requireAuth, requireTeacherHubEnabled("teacher")] as const;

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(191),
  headline: z.string().trim().max(191).optional(),
  bio: z.string().trim().max(8000).optional(),
  canTeachOneToOne: z.coerce.boolean().optional(),
  canTeachBatch: z.coerce.boolean().optional(),
  subjects: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  boards: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  classLevels: z.array(z.coerce.number().int().min(1).max(12)).max(20).optional(),
});

const kycSchema = z.object({
  legalName: z.string().trim().max(191).optional(),
  documentType: z.string().trim().max(80).optional(),
  documentNumberMasked: z.string().trim().max(80).optional(),
});

const payoutAccountSchema = z.object({
  accountType: z.string().trim().min(1).max(40),
  accountLabelMasked: z.string().trim().min(1).max(191),
});

const offeringSchema = z.object({
  mode: z.enum(["ONE_TO_ONE", "BATCH"]).default("ONE_TO_ONE"),
  title: z.string().trim().min(1).max(191),
  board: z.string().trim().max(120).optional(),
  classLevel: z.coerce.number().int().min(1).max(12).optional(),
  subject: z.string().trim().min(1).max(120),
  billingCycle: z.enum(["DEMO", "WEEKLY", "FORTNIGHTLY", "MONTHLY"]).default("MONTHLY"),
  cyclePrice: z.coerce.number().min(0),
  demoPrice: z.coerce.number().min(0).optional(),
  batchCapacity: z.coerce.number().int().min(1).max(500).optional(),
  isPublished: z.coerce.boolean().optional(),
  status: z.string().trim().max(40).optional(),
  description: z.string().trim().max(5000).optional(),
  cancellationPolicy: z.string().trim().max(5000).optional(),
  refundPolicy: z.string().trim().max(5000).optional(),
  noShowPolicy: z.string().trim().max(5000).optional(),
  lateJoinPolicy: z.string().trim().max(5000).optional(),
});

const batchSchema = z.object({
  teacherOfferingId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(191),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
  status: z.string().trim().max(40).optional(),
});

const boardSchema = z.object({
  enrollmentId: z.string().trim().max(191).optional(),
  batchId: z.string().trim().max(191).optional(),
  title: z.string().trim().max(191).optional(),
});

const boardSessionSchema = z.object({
  status: z.string().trim().max(40).optional(),
  summary: z.string().trim().max(4000).optional(),
});

const whiteboardSchema = z.object({
  sessionId: z.string().trim().max(191).optional(),
  title: z.string().trim().max(191).optional(),
  payloadJson: z.record(z.string(), z.any()).optional(),
});

const boardFileSchema = z.object({
  sessionId: z.string().trim().max(191).optional(),
  title: z.string().trim().max(191).optional(),
  fileName: z.string().trim().min(1).max(191),
  mimeType: z.string().trim().min(1).max(191),
  fileBase64: z.string().trim().min(1),
});

const contentSchema = z.object({
  enrollmentId: z.string().trim().max(191).optional(),
  batchId: z.string().trim().max(191).optional(),
  contentType: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(191),
  body: z.string().trim().max(10000).optional(),
  visibility: z.string().trim().max(40).optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(191),
        mimeType: z.string().trim().min(1).max(191),
        fileBase64: z.string().trim().min(1),
      })
    )
    .max(10)
    .optional(),
});

const noticeSchema = z.object({
  targetType: z.enum(["ENROLLMENT", "BATCH"]).default("ENROLLMENT"),
  targetId: z.string().trim().min(1).max(191),
  title: z.string().trim().min(1).max(191),
  body: z.string().trim().min(1).max(5000),
});

teacherHubRouter.get("/teacher-hub/dashboard", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const profile = await teacherProfileService.getProfileByUserId(req.user!.userId);
    if (!profile) {
      res.json({
        ok: true,
        profile: null,
        counts: {
          offerings: 0,
          enrollments: 0,
          notices: 0,
          content: 0,
          payouts: 0,
        },
      });
      return;
    }
    const [offerings, enrollments, notices, content, payouts] = await Promise.all([
      teacherOfferingService.listOwnOfferings(req.user!.userId),
      teacherEnrollmentService.listTeacherEnrollments(req.user!.userId),
      teacherNoticeService.listTeacherNotices(req.user!.userId),
      teacherContentService.listTeacherContent(req.user!.userId),
      teacherPayoutService.listOwnPayouts(req.user!.userId),
    ]);
    res.json({
      ok: true,
      profile,
      counts: {
        offerings: offerings.length,
        enrollments: enrollments.length,
        notices: notices.length,
        content: content.length,
        payouts: payouts.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/bootstrap", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const profile = await teacherProfileService.getProfileByUserId(req.user!.userId);
    res.json({
      ok: true,
      phase: "phase-1",
      profile,
      access: {
        canManageProfile: true,
        hasApprovedTeacherAccess: profile?.status === "APPROVED",
      },
      flow: {
        dashboardPage: "/teacher-hub-teacher-dashboard.html",
        profilePage: "/teacher-hub-teacher-profile.html",
        offeringsPage: "/teacher-hub-teacher-offerings.html",
        boardPage: "/teacher-hub-teacher-board.html",
      },
    });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/profile", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const [profile, kyc, payoutAccount] = await Promise.all([
      teacherProfileService.getProfileByUserId(req.user!.userId),
      teacherKycService.getOwnKyc(req.user!.userId),
      teacherPayoutService.getOwnPayoutAccount(req.user!.userId),
    ]);
    res.json({ ok: true, profile, kyc, payoutAccount });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.put("/teacher-hub/profile", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body || {});
    const profile = await teacherProfileService.upsertOwnProfile(req.user!.userId, input);
    res.json({ ok: true, profile });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.put("/teacher-hub/kyc", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const input = kycSchema.parse(req.body || {});
    const kyc = await teacherKycService.upsertOwnKyc(req.user!.userId, input);
    res.json({ ok: true, kyc });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.put("/teacher-hub/payout-account", ...ensureTeacherCandidate, async (req, res, next) => {
  try {
    const input = payoutAccountSchema.parse(req.body || {});
    const payoutAccount = await teacherPayoutService.upsertOwnPayoutAccount(req.user!.userId, input);
    res.json({ ok: true, payoutAccount });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/offerings", ...ensureTeacher, async (req, res, next) => {
  try {
    const offerings = await teacherOfferingService.listOwnOfferings(req.user!.userId);
    res.json({ ok: true, offerings });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/offerings", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = offeringSchema.parse(req.body || {});
    const offering = await teacherOfferingService.upsertOwnOffering(req.user!.userId, input);
    res.status(201).json({ ok: true, offering });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.patch("/teacher-hub/offerings/:offeringId", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = offeringSchema.partial().parse(req.body || {});
    const offering = await teacherOfferingService.upsertOwnOffering(
      req.user!.userId,
      input,
      req.params.offeringId
    );
    res.json({ ok: true, offering });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/batches", ...ensureTeacher, async (req, res, next) => {
  try {
    const batches = await teacherBatchService.listTeacherBatches(req.user!.userId);
    res.json({ ok: true, batches });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/batches", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = batchSchema.parse(req.body || {});
    const batch = await teacherBatchService.createBatch(req.user!.userId, input);
    res.status(201).json({ ok: true, batch });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/enrollments", ...ensureTeacher, async (req, res, next) => {
  try {
    const enrollments = await teacherEnrollmentService.listTeacherEnrollments(req.user!.userId);
    res.json({ ok: true, enrollments });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/boards", ...ensureTeacher, async (req, res, next) => {
  try {
    const boards = await teacherBoardService.listTeacherBoards(req.user!.userId);
    res.json({ ok: true, boards });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/boards", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = boardSchema.parse(req.body || {});
    const board = await teacherBoardService.createBoard(req.user!.userId, input);
    res.status(201).json({ ok: true, board });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/boards/:boardId", ...ensureTeacher, async (req, res, next) => {
  try {
    const payload = await teacherBoardService.getTeacherBoard(req.user!.userId, req.params.boardId);
    res.json({ ok: true, ...payload });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/boards/:boardId/sessions", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = boardSessionSchema.parse(req.body || {});
    const session = await teacherBoardService.createSession(req.user!.userId, req.params.boardId, input);
    res.status(201).json({ ok: true, session });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/boards/:boardId/whiteboard", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = whiteboardSchema.parse(req.body || {});
    const artifact = await teacherBoardService.saveWhiteboard(req.user!.userId, req.params.boardId, input);
    res.status(201).json({ ok: true, artifact });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/boards/:boardId/files", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = boardFileSchema.parse(req.body || {});
    const artifact = await teacherBoardService.uploadBoardFile(req.user!.userId, req.params.boardId, input);
    res.status(201).json({ ok: true, artifact });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/content", ...ensureTeacher, async (req, res, next) => {
  try {
    const content = await teacherContentService.listTeacherContent(req.user!.userId);
    res.json({ ok: true, content });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/content", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = contentSchema.parse(req.body || {});
    const content = await teacherContentService.createContent(req.user!.userId, input);
    res.status(201).json({ ok: true, content });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/notices", ...ensureTeacher, async (req, res, next) => {
  try {
    const notices = await teacherNoticeService.listTeacherNotices(req.user!.userId);
    res.json({ ok: true, notices });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.post("/teacher-hub/notices", ...ensureTeacher, async (req, res, next) => {
  try {
    const input = noticeSchema.parse(req.body || {});
    const notice = await teacherNoticeService.createNotice(req.user!.userId, input);
    res.status(201).json({ ok: true, notice });
  } catch (error) {
    next(error);
  }
});

teacherHubRouter.get("/teacher-hub/payouts", ...ensureTeacher, async (req, res, next) => {
  try {
    const [payouts, payoutAccount] = await Promise.all([
      teacherPayoutService.listOwnPayouts(req.user!.userId),
      teacherPayoutService.getOwnPayoutAccount(req.user!.userId),
    ]);
    res.json({ ok: true, payouts, payoutAccount });
  } catch (error) {
    next(error);
  }
});
