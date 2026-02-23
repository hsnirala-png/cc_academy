import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { getWalletBalance, normalizeAmount, toISO } from "../modules/referrals/referral.utils";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";
import { ensureReferralStorageReady } from "../utils/referralStorage";

export const adminReferralsRouter = Router();

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

adminReferralsRouter.use("/referrals", async (_req, _res, next) => {
  try {
    await ensureReferralStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const listWithdrawalQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  search: optionalTrimmedString(191),
});

const listPayoutMethodQuerySchema = z.object({
  verified: z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  search: optionalTrimmedString(191),
});

const adminActionSchema = z.object({
  note: optionalTrimmedString(500),
});

const verifyMethodSchema = z.object({
  verified: z.boolean(),
});

adminReferralsRouter.get("/referrals/overview", ...ensureAdmin, async (_req, res, next) => {
  try {
    const [
      pendingRows,
      approvedRows,
      bonusRows,
      referrersRows,
      methodsRows,
      studentsRows,
      txnRows,
    ] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS countPending, COALESCE(SUM(amount), 0) AS pendingAmount FROM ReferralWithdrawal WHERE status = 'PENDING'`
      ) as Promise<Array<{ countPending: number | string; pendingAmount: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS countApproved, COALESCE(SUM(amount), 0) AS approvedAmount FROM ReferralWithdrawal WHERE status = 'APPROVED'`
      ) as Promise<Array<{ countApproved: number | string; approvedAmount: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) AS totalBonus FROM ReferralTransaction WHERE type = 'REFERRAL_BONUS'`
      ) as Promise<Array<{ totalBonus: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS totalReferrers FROM User WHERE referralCode IS NOT NULL AND referralCode <> ''`
      ) as Promise<Array<{ totalReferrers: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS verifiedMethods FROM ReferralPayoutMethod WHERE isVerified = 1`
      ) as Promise<Array<{ verifiedMethods: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS totalStudents FROM User WHERE role = 'STUDENT'`
      ) as Promise<Array<{ totalStudents: number | string }>>,
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) AS totalLedger FROM ReferralTransaction`
      ) as Promise<Array<{ totalLedger: number | string }>>,
    ]);

    res.json({
      overview: {
        totalStudents: Number(studentsRows[0]?.totalStudents || 0),
        totalReferrers: Number(referrersRows[0]?.totalReferrers || 0),
        pendingWithdrawalCount: Number(pendingRows[0]?.countPending || 0),
        pendingWithdrawalAmount: normalizeAmount(pendingRows[0]?.pendingAmount || 0),
        approvedWithdrawalCount: Number(approvedRows[0]?.countApproved || 0),
        approvedWithdrawalAmount: normalizeAmount(approvedRows[0]?.approvedAmount || 0),
        totalReferralBonus: normalizeAmount(bonusRows[0]?.totalBonus || 0),
        verifiedPayoutMethods: Number(methodsRows[0]?.verifiedMethods || 0),
        totalLedgerBalance: normalizeAmount(txnRows[0]?.totalLedger || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.get("/referrals/withdrawals", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = listWithdrawalQuerySchema.parse(req.query || {});
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      whereParts.push("w.status = ?");
      params.push(input.status);
    }

    if (input.search) {
      whereParts.push("(u.name LIKE ? OR u.mobile LIKE ? OR u.referralCode LIKE ?)");
      params.push(`%${input.search}%`, `%${input.search}%`, `%${input.search}%`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT w.id, w.userId, w.amount, w.status, w.requestedAt, w.reviewedAt, w.reviewedBy, w.adminNote,
               u.name AS studentName, u.mobile AS studentMobile, u.referralCode,
               pm.type AS payoutType, pm.bankName, pm.accountNo, pm.ifsc, pm.place, pm.upiId, pm.isVerified
        FROM ReferralWithdrawal w
        INNER JOIN User u ON u.id = w.userId
        INNER JOIN ReferralPayoutMethod pm ON pm.id = w.payoutMethodId
        ${whereClause}
        ORDER BY w.requestedAt DESC
        LIMIT 500
      `,
      ...params
    )) as Array<Record<string, unknown>>;

    res.json({
      withdrawals: rows.map((item) => ({
        id: String(item.id || ""),
        userId: String(item.userId || ""),
        amount: normalizeAmount(item.amount),
        status: String(item.status || "PENDING"),
        requestedAt: toISO(item.requestedAt as Date | string | null),
        reviewedAt: toISO(item.reviewedAt as Date | string | null),
        reviewedBy: item.reviewedBy ? String(item.reviewedBy) : null,
        adminNote: item.adminNote ? String(item.adminNote) : null,
        student: {
          name: String(item.studentName || ""),
          mobile: String(item.studentMobile || ""),
          referralCode: item.referralCode ? String(item.referralCode) : null,
        },
        payoutMethod: {
          type: String(item.payoutType || "BANK"),
          bankName: item.bankName ? String(item.bankName) : null,
          accountNo: item.accountNo ? String(item.accountNo) : null,
          ifsc: item.ifsc ? String(item.ifsc) : null,
          place: item.place ? String(item.place) : null,
          upiId: item.upiId ? String(item.upiId) : null,
          isVerified: Boolean(item.isVerified),
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.post("/referrals/withdrawals/:id/approve", ...ensureAdmin, async (req, res, next) => {
  try {
    const withdrawalId = String(req.params.id || "").trim();
    if (!withdrawalId) throw new AppError("Withdrawal id is required.", 400);
    const input = adminActionSchema.parse(req.body || {});

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, userId, amount, status
        FROM ReferralWithdrawal
        WHERE id = ?
        LIMIT 1
      `,
      withdrawalId
    )) as Array<{ id: string; userId: string; amount: number | string; status: string }>;

    const withdrawal = rows[0];
    if (!withdrawal) throw new AppError("Withdrawal request not found.", 404);
    if (withdrawal.status !== "PENDING") {
      throw new AppError("Only pending withdrawals can be approved.", 400);
    }

    const amount = normalizeAmount(withdrawal.amount);
    const walletBalance = await getWalletBalance(withdrawal.userId);
    if (walletBalance < amount) {
      throw new AppError("Student wallet balance is lower than requested amount.", 400);
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `
          UPDATE ReferralWithdrawal
          SET status = 'APPROVED', reviewedAt = ?, reviewedBy = ?, adminNote = ?, updatedAt = ?
          WHERE id = ?
        `,
        now,
        req.user!.userId,
        input.note ?? null,
        now,
        withdrawalId
      ),
      prisma.$executeRawUnsafe(
        `
          INSERT INTO ReferralTransaction
          (
            id,
            userId,
            amount,
            type,
            description,
            purchaseId,
            withdrawalId,
            createdAt
          )
          VALUES (?, ?, ?, 'WITHDRAWAL', ?, NULL, ?, ?)
        `,
        randomUUID(),
        withdrawal.userId,
        -amount,
        input.note ?? "Withdrawal approved by admin.",
        withdrawalId,
        now
      ),
    ]);

    res.json({ message: "Withdrawal approved successfully." });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.post("/referrals/withdrawals/:id/reject", ...ensureAdmin, async (req, res, next) => {
  try {
    const withdrawalId = String(req.params.id || "").trim();
    if (!withdrawalId) throw new AppError("Withdrawal id is required.", 400);
    const input = adminActionSchema.parse(req.body || {});

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, status FROM ReferralWithdrawal WHERE id = ? LIMIT 1`,
      withdrawalId
    )) as Array<{ id: string; status: string }>;

    const withdrawal = rows[0];
    if (!withdrawal) throw new AppError("Withdrawal request not found.", 404);
    if (withdrawal.status !== "PENDING") {
      throw new AppError("Only pending withdrawals can be rejected.", 400);
    }

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        UPDATE ReferralWithdrawal
        SET status = 'REJECTED', reviewedAt = ?, reviewedBy = ?, adminNote = ?, updatedAt = ?
        WHERE id = ?
      `,
      now,
      req.user!.userId,
      input.note ?? null,
      now,
      withdrawalId
    );

    res.json({ message: "Withdrawal rejected." });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.get("/referrals/payout-methods", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = listPayoutMethodQuerySchema.parse(req.query || {});
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (typeof input.verified === "boolean") {
      whereParts.push("pm.isVerified = ?");
      params.push(input.verified ? 1 : 0);
    }

    if (input.search) {
      whereParts.push("(u.name LIKE ? OR u.mobile LIKE ? OR u.referralCode LIKE ? OR pm.upiId LIKE ?)");
      params.push(`%${input.search}%`, `%${input.search}%`, `%${input.search}%`, `%${input.search}%`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT pm.id, pm.userId, pm.type, pm.bankName, pm.accountNo, pm.ifsc, pm.place, pm.upiId,
               pm.isVerified, pm.verifiedAt, pm.verifiedBy, pm.createdAt, pm.updatedAt,
               u.name AS studentName, u.mobile AS studentMobile, u.referralCode
        FROM ReferralPayoutMethod pm
        INNER JOIN User u ON u.id = pm.userId
        ${whereClause}
        ORDER BY pm.createdAt DESC
        LIMIT 500
      `,
      ...params
    )) as Array<Record<string, unknown>>;

    res.json({
      payoutMethods: rows.map((item) => ({
        id: String(item.id || ""),
        userId: String(item.userId || ""),
        type: String(item.type || "BANK"),
        bankName: item.bankName ? String(item.bankName) : null,
        accountNo: item.accountNo ? String(item.accountNo) : null,
        ifsc: item.ifsc ? String(item.ifsc) : null,
        place: item.place ? String(item.place) : null,
        upiId: item.upiId ? String(item.upiId) : null,
        isVerified: Boolean(item.isVerified),
        verifiedAt: toISO(item.verifiedAt as Date | string | null),
        verifiedBy: item.verifiedBy ? String(item.verifiedBy) : null,
        createdAt: toISO(item.createdAt as Date | string | null),
        updatedAt: toISO(item.updatedAt as Date | string | null),
        student: {
          name: String(item.studentName || ""),
          mobile: String(item.studentMobile || ""),
          referralCode: item.referralCode ? String(item.referralCode) : null,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.post("/referrals/payout-methods/:id/verify", ...ensureAdmin, async (req, res, next) => {
  try {
    const methodId = String(req.params.id || "").trim();
    if (!methodId) throw new AppError("Payout method id is required.", 400);

    const input = verifyMethodSchema.parse(req.body || {});

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id FROM ReferralPayoutMethod WHERE id = ? LIMIT 1`,
      methodId
    )) as Array<{ id: string }>;

    if (!rows[0]) throw new AppError("Payout method not found.", 404);

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        UPDATE ReferralPayoutMethod
        SET isVerified = ?, verifiedAt = ?, verifiedBy = ?, updatedAt = ?
        WHERE id = ?
      `,
      input.verified ? 1 : 0,
      input.verified ? now : null,
      input.verified ? req.user!.userId : null,
      now,
      methodId
    );

    res.json({ message: input.verified ? "Payout method verified." : "Payout method unverified." });
  } catch (error) {
    next(error);
  }
});

adminReferralsRouter.get("/referrals/students", ...ensureAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const params: unknown[] = [];
    let whereClause = "WHERE u.role = 'STUDENT'";

    if (search) {
      whereClause += " AND (u.name LIKE ? OR u.mobile LIKE ? OR u.referralCode LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          u.id,
          u.name,
          u.mobile,
          u.referralCode,
          (SELECT COUNT(*) FROM User x WHERE x.referrerId = u.id) AS referredCount,
          (SELECT COALESCE(SUM(t.amount), 0) FROM ReferralTransaction t WHERE t.userId = u.id AND t.type = 'REFERRAL_BONUS') AS totalEarned,
          (SELECT COALESCE(SUM(w.amount), 0) FROM ReferralWithdrawal w WHERE w.userId = u.id AND w.status = 'APPROVED') AS totalWithdrawn,
          (SELECT COALESCE(SUM(t2.amount), 0) FROM ReferralTransaction t2 WHERE t2.userId = u.id) AS walletBalance,
          u.createdAt
        FROM User u
        ${whereClause}
        ORDER BY u.createdAt DESC
        LIMIT 500
      `,
      ...params
    )) as Array<Record<string, unknown>>;

    res.json({
      students: rows.map((item) => ({
        id: String(item.id || ""),
        name: String(item.name || ""),
        mobile: String(item.mobile || ""),
        referralCode: item.referralCode ? String(item.referralCode) : null,
        referredCount: Number(item.referredCount || 0),
        totalEarned: normalizeAmount(item.totalEarned),
        totalWithdrawn: normalizeAmount(item.totalWithdrawn),
        walletBalance: normalizeAmount(item.walletBalance),
        createdAt: toISO(item.createdAt as Date | string | null),
      })),
    });
  } catch (error) {
    next(error);
  }
});
