import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { teacherProfileService } from "./teacher-profile.service";

const payoutAccountModel = () => (prisma as any).teacherPayoutAccount;
const payoutModel = () => (prisma as any).teacherPayout;
const billingCycleModel = () => (prisma as any).teacherBillingCycle;
const kycModel = () => (prisma as any).teacherKyc;

const serializePayoutAccount = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  accountType: item.accountType,
  accountLabelMasked: item.accountLabelMasked,
  isVerified: Boolean(item.isVerified),
  verifiedByAdminId: item.verifiedByAdminId || null,
  verifiedAt: item.verifiedAt?.toISOString?.() || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

const serializePayout = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  payoutAccountId: item.payoutAccountId || null,
  cycleCount: Number(item.cycleCount || 0),
  grossAmount: Number(item.grossAmount || 0),
  platformFeeAmount: Number(item.platformFeeAmount || 0),
  adjustmentAmount: Number(item.adjustmentAmount || 0),
  netAmount: Number(item.netAmount || 0),
  status: item.status,
  releasedAt: item.releasedAt?.toISOString?.() || null,
  approvedByAdminId: item.approvedByAdminId || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherPayoutService = {
  async getOwnPayoutAccount(userId: string) {
    const profile = await teacherProfileService.getProfileByUserId(userId);
    if (!profile?.id) return null;
    const teacherProfileId = profile.id;
    const row = await payoutAccountModel().findFirst({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return row ? serializePayoutAccount(row) : null;
  },

  async upsertOwnPayoutAccount(userId: string, input: any) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const existing = await payoutAccountModel().findFirst({
      where: { teacherProfileId, accountType: String(input.accountType || "BANK").trim().toUpperCase() },
    });
    const payload = {
      teacherProfileId,
      accountType: String(input.accountType || "BANK").trim().toUpperCase(),
      accountLabelMasked: String(input.accountLabelMasked || "").trim() || "Masked Account",
      accountMetaJson: input.accountMetaJson || null,
      isVerified: existing ? existing.isVerified : false,
    };
    const row = existing
      ? await payoutAccountModel().update({
          where: { id: existing.id },
          data: payload,
        })
      : await payoutAccountModel().create({ data: payload });
    return serializePayoutAccount(row);
  },

  async listAdminPayoutAccounts() {
    const rows = await payoutAccountModel().findMany({ orderBy: [{ updatedAt: "desc" }] });
    return rows.map(serializePayoutAccount);
  },

  async verifyPayoutAccount(accountId: string, adminUserId: string, isVerified: boolean) {
    const row = await payoutAccountModel().update({
      where: { id: accountId },
      data: {
        isVerified: Boolean(isVerified),
        verifiedByAdminId: adminUserId,
        verifiedAt: isVerified ? new Date() : null,
      },
    });
    return serializePayoutAccount(row);
  },

  async listOwnPayouts(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await payoutModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializePayout);
  },

  async listAdminPayouts() {
    const rows = await payoutModel().findMany({
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializePayout);
  },

  async createPayoutForTeacher(teacherProfileId: string) {
    const kyc = await kycModel().findFirst({ where: { teacherProfileId } });
    const payoutAccount = await payoutAccountModel().findFirst({
      where: { teacherProfileId, isVerified: true },
      orderBy: [{ updatedAt: "desc" }],
    });
    if (!kyc || kyc.verificationStatus !== "APPROVED") {
      throw new AppError("Approved KYC is required before payout release.", 400);
    }
    if (!payoutAccount) {
      throw new AppError("A verified payout account is required before payout release.", 400);
    }
    const payout = await prisma.$transaction(async (tx) => {
      const txBillingCycleModel = () => (tx as any).teacherBillingCycle;
      const txPayoutModel = () => (tx as any).teacherPayout;
      const txLedgerModel = () => (tx as any).teacherLedgerEntry;

      const cycles = await txBillingCycleModel().findMany({
        where: {
          teacherProfileId,
          status: "COMPLETED",
        },
        orderBy: [{ endsOn: "asc" }],
      });
      if (!cycles.length) throw new AppError("No completed billing cycles are available for payout.", 400);

      const cycleIds = cycles.map((item: any) => item.id);
      const claimed = await txBillingCycleModel().updateMany({
        where: {
          id: { in: cycleIds },
          teacherProfileId,
          status: "COMPLETED",
        },
        data: {
          status: "PAYOUT_PENDING",
        },
      });
      if (claimed.count !== cycleIds.length) {
        throw new AppError(
          "Some billing cycles are already included in another payout.",
          409,
          "TEACHER_HUB_PAYOUT_CYCLE_CONFLICT"
        );
      }

      const grossAmount = cycles.reduce((sum: number, item: any) => sum + Number(item.grossAmount || 0), 0);
      const platformFeeAmount = cycles.reduce((sum: number, item: any) => sum + Number(item.platformFeeAmount || 0), 0);
      const netAmount = cycles.reduce((sum: number, item: any) => sum + Number(item.netAmount || 0), 0);

      const created = await txPayoutModel().create({
        data: {
          teacherProfileId,
          payoutAccountId: payoutAccount.id,
          cycleCount: cycles.length,
          grossAmount,
          platformFeeAmount,
          adjustmentAmount: 0,
          netAmount,
          status: "PENDING",
        },
      });

      await Promise.all(
        cycleIds.map((billingCycleId: string) =>
          txLedgerModel().create({
            data: {
              teacherProfileId,
              billingCycleId,
              entryType: "PAYOUT_RESERVED",
              amount: 0,
              note: created.id,
            },
          })
        )
      );

      return created;
    });
    return serializePayout(payout);
  },

  async updatePayoutStatus(payoutId: string, status: string, adminUserId: string) {
    const normalized = String(status || "").trim().toUpperCase() || "PENDING";
    const row = await prisma.$transaction(async (tx) => {
      const txPayoutModel = () => (tx as any).teacherPayout;
      const txBillingCycleModel = () => (tx as any).teacherBillingCycle;
      const txLedgerModel = () => (tx as any).teacherLedgerEntry;

      const payout = await txPayoutModel().findUnique({ where: { id: payoutId } });
      if (!payout) throw new AppError("Teacher payout not found.", 404, "TEACHER_HUB_PAYOUT_NOT_FOUND");

      const cycleLinks = await txLedgerModel().findMany({
        where: {
          entryType: "PAYOUT_RESERVED",
          note: payout.id,
        },
      });
      const cycleIds = cycleLinks.map((item: any) => item.billingCycleId).filter(Boolean);

      if (cycleIds.length) {
        if (normalized === "RELEASED") {
          await txBillingCycleModel().updateMany({
            where: {
              id: { in: cycleIds },
              status: "PAYOUT_PENDING",
            },
            data: {
              status: "PAID",
            },
          });
        } else if (normalized === "REJECTED") {
          await txBillingCycleModel().updateMany({
            where: {
              id: { in: cycleIds },
              status: "PAYOUT_PENDING",
            },
            data: {
              status: "COMPLETED",
            },
          });
        }
      }

      return txPayoutModel().update({
        where: { id: payoutId },
        data: {
          status: normalized,
          approvedByAdminId: adminUserId,
          releasedAt: normalized === "RELEASED" ? new Date() : null,
        },
      });
    });
    return serializePayout(row);
  },
};
