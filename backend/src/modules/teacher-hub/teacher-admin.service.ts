import { prisma } from "../../utils/prisma";

const profileModel = () => (prisma as any).teacherProfile;
const offeringModel = () => (prisma as any).teacherOffering;
const enrollmentModel = () => (prisma as any).teacherEnrollment;
const moderationModel = () => (prisma as any).teacherModerationFlag;
const payoutModel = () => (prisma as any).teacherPayout;
const billingCycleModel = () => (prisma as any).teacherBillingCycle;
const auditLogModel = () => (prisma as any).teacherAuditLog;

export const teacherAdminService = {
  async getOverview() {
    const [teachers, approvedTeachers, offerings, enrollments, flags, payouts, billingCycles] = await Promise.all([
      profileModel().count(),
      profileModel().count({ where: { status: "APPROVED" } }),
      offeringModel().count(),
      enrollmentModel().count(),
      moderationModel().count({ where: { status: "OPEN" } }),
      payoutModel().count(),
      billingCycleModel().count(),
    ]);
    return {
      teachers,
      approvedTeachers,
      offerings,
      enrollments,
      openModerationFlags: flags,
      payouts,
      billingCycles,
    };
  },

  async listModerationFlags() {
    const rows = await moderationModel().findMany({
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map((item: any) => ({
      id: item.id,
      teacherProfileId: item.teacherProfileId || null,
      enrollmentId: item.enrollmentId || null,
      contentItemId: item.contentItemId || null,
      noticeId: item.noticeId || null,
      scopeType: item.scopeType,
      reason: item.reason,
      details: item.details || null,
      status: item.status,
      createdBy: item.createdBy || null,
      createdAt: item.createdAt?.toISOString?.() || null,
      updatedAt: item.updatedAt?.toISOString?.() || null,
    }));
  },

  async createModerationFlag(input: any) {
    const row = await moderationModel().create({
      data: {
        teacherProfileId: input.teacherProfileId || null,
        enrollmentId: input.enrollmentId || null,
        contentItemId: input.contentItemId || null,
        noticeId: input.noticeId || null,
        scopeType: String(input.scopeType || "CONTENT").trim().toUpperCase(),
        reason: String(input.reason || "Manual review").trim() || "Manual review",
        details: String(input.details || "").trim() || null,
        status: String(input.status || "OPEN").trim().toUpperCase(),
        createdBy: input.createdBy || null,
      },
    });
    return {
      id: row.id,
      scopeType: row.scopeType,
      reason: row.reason,
      status: row.status,
    };
  },

  async updateModerationFlag(flagId: string, status: string) {
    const row = await moderationModel().update({
      where: { id: flagId },
      data: { status: String(status || "").trim().toUpperCase() || "OPEN" },
    });
    return {
      id: row.id,
      status: row.status,
      updatedAt: row.updatedAt?.toISOString?.() || null,
    };
  },

  async writeAuditLog(input: {
    actorUserId?: string | null;
    scopeType: string;
    scopeId: string;
    action: string;
    summary: string;
    detailsJson?: Record<string, unknown> | null;
  }) {
    return auditLogModel().create({
      data: {
        actorUserId: input.actorUserId || null,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        action: input.action,
        summary: input.summary,
        detailsJson: input.detailsJson || null,
      },
    });
  },
};
