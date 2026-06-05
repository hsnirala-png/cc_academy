import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { requireTeacherHubEnabled } from "../middlewares/requireTeacherHubEnabled";
import { teacherAdminService } from "../modules/teacher-hub/teacher-admin.service";
import { teacherFeatureFlagService } from "../modules/teacher-hub/teacher-feature-flag.service";
import { teacherKycService } from "../modules/teacher-hub/teacher-kyc.service";
import { teacherOfferingService } from "../modules/teacher-hub/teacher-offering.service";
import { teacherPayoutService } from "../modules/teacher-hub/teacher-payout.service";
import { teacherProfileService } from "../modules/teacher-hub/teacher-profile.service";

export const adminTeacherHubRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN), requireTeacherHubEnabled("admin")] as const;

const featureFlagSchema = z.object({
  scopeType: z.enum(["GLOBAL", "ADMIN", "USER", "TEACHER"]),
  userId: z.string().trim().max(191).optional(),
  teacherProfileId: z.string().trim().max(191).optional(),
  isEnabled: z.coerce.boolean(),
  note: z.string().trim().max(4000).optional(),
});

const teacherStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]),
});

const verificationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

const moderationSchema = z.object({
  teacherProfileId: z.string().trim().max(191).optional(),
  enrollmentId: z.string().trim().max(191).optional(),
  contentItemId: z.string().trim().max(191).optional(),
  noticeId: z.string().trim().max(191).optional(),
  scopeType: z.string().trim().min(1).max(40),
  reason: z.string().trim().min(1).max(191),
  details: z.string().trim().max(5000).optional(),
  status: z.string().trim().max(40).optional(),
});

const offeringAdminSchema = z.object({
  status: z.string().trim().max(40).optional(),
  isPublished: z.coerce.boolean().optional(),
});

const payoutStatusSchema = z.object({
  status: z.enum(["PENDING", "HELD", "RELEASED", "REJECTED"]),
});

adminTeacherHubRouter.get("/teacher-hub/overview", ...ensureAdmin, async (_req, res, next) => {
  try {
    const overview = await teacherAdminService.getOverview();
    res.json({ ok: true, overview });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/feature-flags", ...ensureAdmin, async (_req, res, next) => {
  try {
    const flags = await teacherFeatureFlagService.listFlags();
    res.json({ ok: true, flags });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.post("/teacher-hub/feature-flags", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = featureFlagSchema.parse(req.body || {});
    const flag = await teacherFeatureFlagService.upsertFlag({
      ...input,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ ok: true, flag });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/teachers", ...ensureAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim().toUpperCase();
    const teachers = await teacherProfileService.listProfiles({
      status: status || null,
    });
    res.json({ ok: true, teachers });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch("/teacher-hub/teachers/:teacherProfileId/status", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = teacherStatusSchema.parse(req.body || {});
    const teacher = await teacherProfileService.updateStatus(req.params.teacherProfileId, input.status);
    await teacherAdminService.writeAuditLog({
      actorUserId: req.user!.userId,
      scopeType: "TEACHER_PROFILE",
      scopeId: req.params.teacherProfileId,
      action: "STATUS_UPDATE",
      summary: `Teacher profile status set to ${input.status}.`,
    });
    res.json({ ok: true, teacher });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/kyc", ...ensureAdmin, async (_req, res, next) => {
  try {
    const items = await teacherKycService.listForAdmin();
    res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch("/teacher-hub/kyc/:kycId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = verificationSchema.parse(req.body || {});
    const kyc = await teacherKycService.updateVerificationStatus(req.params.kycId, input.status, req.user!.userId);
    res.json({ ok: true, kyc });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/payout-accounts", ...ensureAdmin, async (_req, res, next) => {
  try {
    const accounts = await teacherPayoutService.listAdminPayoutAccounts();
    res.json({ ok: true, accounts });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch(
  "/teacher-hub/payout-accounts/:accountId/verify",
  ...ensureAdmin,
  async (req, res, next) => {
    try {
      const input = z.object({ isVerified: z.coerce.boolean() }).parse(req.body || {});
      const account = await teacherPayoutService.verifyPayoutAccount(
        req.params.accountId,
        req.user!.userId,
        input.isVerified
      );
      res.json({ ok: true, account });
    } catch (error) {
      next(error);
    }
  }
);

adminTeacherHubRouter.get("/teacher-hub/offerings", ...ensureAdmin, async (_req, res, next) => {
  try {
    const offerings = await teacherOfferingService.listAdminOfferings();
    res.json({ ok: true, offerings });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch("/teacher-hub/offerings/:offeringId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = offeringAdminSchema.parse(req.body || {});
    const offering = await teacherOfferingService.adminUpdateOffering(req.params.offeringId, input);
    res.json({ ok: true, offering });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/payouts", ...ensureAdmin, async (_req, res, next) => {
  try {
    const payouts = await teacherPayoutService.listAdminPayouts();
    res.json({ ok: true, payouts });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.post("/teacher-hub/payouts", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = z.object({ teacherProfileId: z.string().trim().min(1) }).parse(req.body || {});
    const payout = await teacherPayoutService.createPayoutForTeacher(input.teacherProfileId);
    res.status(201).json({ ok: true, payout });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch("/teacher-hub/payouts/:payoutId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = payoutStatusSchema.parse(req.body || {});
    const payout = await teacherPayoutService.updatePayoutStatus(
      req.params.payoutId,
      input.status,
      req.user!.userId
    );
    res.json({ ok: true, payout });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.get("/teacher-hub/moderation", ...ensureAdmin, async (_req, res, next) => {
  try {
    const flags = await teacherAdminService.listModerationFlags();
    res.json({ ok: true, flags });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.post("/teacher-hub/moderation", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = moderationSchema.parse(req.body || {});
    const flag = await teacherAdminService.createModerationFlag({
      ...input,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ ok: true, flag });
  } catch (error) {
    next(error);
  }
});

adminTeacherHubRouter.patch("/teacher-hub/moderation/:flagId", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = z.object({ status: z.string().trim().min(1).max(40) }).parse(req.body || {});
    const flag = await teacherAdminService.updateModerationFlag(req.params.flagId, input.status);
    res.json({ ok: true, flag });
  } catch (error) {
    next(error);
  }
});
