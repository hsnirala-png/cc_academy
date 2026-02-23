import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import {
  ensureUserReferralCode,
  getFortnightlyEligibility,
  getWalletBalance,
  normalizeAmount,
  toISO,
} from "../modules/referrals/referral.utils";
import { AppError } from "../utils/appError";
import { prisma } from "../utils/prisma";
import { ensureReferralStorageReady } from "../utils/referralStorage";

export const referralsRouter = Router();

const ensureStudent = [requireAuth, requireRole(Role.STUDENT)] as const;
const MIN_WITHDRAWAL_AMOUNT = 50;

referralsRouter.use("/referrals", async (_req, _res, next) => {
  try {
    await ensureReferralStorageReady();
    next();
  } catch (error) {
    next(error);
  }
});

const addPayoutMethodSchema = z
  .object({
    type: z.enum(["BANK", "UPI"]),
    bankName: z.string().trim().max(191).optional(),
    accountNo: z.string().trim().max(64).optional(),
    ifsc: z.string().trim().max(32).optional(),
    place: z.string().trim().max(120).optional(),
    upiId: z.string().trim().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "BANK") {
      if (!value.bankName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankName"], message: "Bank name is required." });
      if (!value.accountNo) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountNo"], message: "Account number is required." });
      if (!value.ifsc) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ifsc"], message: "IFSC is required." });
      if (!value.place) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["place"], message: "Place is required." });
    }

    if (value.type === "UPI") {
      const upi = String(value.upiId || "").trim();
      if (!upi) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["upiId"], message: "UPI ID is required." });
      } else if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/i.test(upi)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["upiId"], message: "UPI ID format is invalid." });
      }
    }
  });

const withdrawalSchema = z.object({
  amount: z.coerce.number().min(MIN_WITHDRAWAL_AMOUNT),
  payoutMethodId: z.string().trim().min(1),
});

type FriendsCountRow = { totalFriends: number | string | null };
type TotalEarnRow = { totalEarns: number | string | null };
type TotalWithdrawalRow = { totalWithdrawals: number | string | null };

const loadReferralTransactions = async (userId: string): Promise<Array<Record<string, unknown>>> => {
  try {
    return (await prisma.$queryRawUnsafe(
      `
        SELECT t.id, t.amount, t.type, t.description, t.createdAt,
               p.title AS productTitle
        FROM ReferralTransaction t
        LEFT JOIN ProductPurchase pp ON pp.id = t.purchaseId
        LEFT JOIN Product p ON p.id = pp.productId
        WHERE t.userId = ?
        ORDER BY t.createdAt DESC
        LIMIT 40
      `,
      userId
    )) as Array<Record<string, unknown>>;
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingPurchaseTable = message.includes("1146") && message.includes("productpurchase");
    const missingProductTable = message.includes("1146") && message.includes("product");
    if (!missingPurchaseTable && !missingProductTable) throw error;

    return (await prisma.$queryRawUnsafe(
      `
        SELECT t.id, t.amount, t.type, t.description, t.createdAt,
               NULL AS productTitle
        FROM ReferralTransaction t
        WHERE t.userId = ?
        ORDER BY t.createdAt DESC
        LIMIT 40
      `,
      userId
    )) as Array<Record<string, unknown>>;
  }
};

referralsRouter.get("/referrals/me", ...ensureStudent, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const referralCode = await ensureUserReferralCode(userId);

    const [
      friendsCountRows,
      earningsRows,
      withdrawalsRows,
      payoutMethodRows,
      transactionRows,
      friendRows,
      withdrawalRows,
      eligibility,
      walletBalance,
    ] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS totalFriends FROM User WHERE referrerId = ?`,
        userId
      ) as Promise<FriendsCountRow[]>,
      prisma.$queryRawUnsafe(
        `
          SELECT COALESCE(SUM(amount), 0) AS totalEarns
          FROM ReferralTransaction
          WHERE userId = ? AND type = 'REFERRAL_BONUS'
        `,
        userId
      ) as Promise<TotalEarnRow[]>,
      prisma.$queryRawUnsafe(
        `
          SELECT COALESCE(SUM(amount), 0) AS totalWithdrawals
          FROM ReferralWithdrawal
          WHERE userId = ? AND status = 'APPROVED'
        `,
        userId
      ) as Promise<TotalWithdrawalRow[]>,
      prisma.$queryRawUnsafe(
        `
          SELECT id, type, bankName, accountNo, ifsc, place, upiId, isVerified, verifiedAt, createdAt, updatedAt
          FROM ReferralPayoutMethod
          WHERE userId = ?
          ORDER BY createdAt DESC
        `,
        userId
      ) as Promise<Array<Record<string, unknown>>>,
      loadReferralTransactions(userId),
      prisma.$queryRawUnsafe(
        `
          SELECT id, name, mobile, createdAt
          FROM User
          WHERE referrerId = ?
          ORDER BY createdAt DESC
          LIMIT 200
        `,
        userId
      ) as Promise<Array<Record<string, unknown>>>,
      prisma.$queryRawUnsafe(
        `
          SELECT w.id, w.amount, w.status, w.requestedAt, w.reviewedAt, w.adminNote,
                 pm.type AS payoutType,
                 pm.bankName,
                 pm.accountNo,
                 pm.upiId
          FROM ReferralWithdrawal w
          INNER JOIN ReferralPayoutMethod pm ON pm.id = w.payoutMethodId
          WHERE w.userId = ?
          ORDER BY w.requestedAt DESC
          LIMIT 40
        `,
        userId
      ) as Promise<Array<Record<string, unknown>>>,
      getFortnightlyEligibility(userId),
      getWalletBalance(userId),
    ]);

    const payoutMethods = payoutMethodRows.map((item) => ({
      id: String(item.id || ""),
      type: String(item.type || "BANK"),
      bankName: item.bankName ? String(item.bankName) : null,
      accountNo: item.accountNo ? String(item.accountNo) : null,
      ifsc: item.ifsc ? String(item.ifsc) : null,
      place: item.place ? String(item.place) : null,
      upiId: item.upiId ? String(item.upiId) : null,
      isVerified: Boolean(item.isVerified),
      verifiedAt: toISO(item.verifiedAt as Date | string | null),
      createdAt: toISO(item.createdAt as Date | string | null),
      updatedAt: toISO(item.updatedAt as Date | string | null),
    }));

    const hasVerifiedPayoutMethod = payoutMethods.some((item) => item.isVerified);
    const canWithdraw = eligibility.canWithdraw && hasVerifiedPayoutMethod && walletBalance >= MIN_WITHDRAWAL_AMOUNT;

    const host = req.get("host") || "";
    const referralLink = `${req.protocol}://${host}/index.html?ref=${encodeURIComponent(referralCode)}`;

    res.json({
      referral: {
        referralCode,
        referralLink,
        totalFriends: Number(friendsCountRows[0]?.totalFriends || 0),
        totalEarns: normalizeAmount(earningsRows[0]?.totalEarns || 0),
        totalWithdrawals: normalizeAmount(withdrawalsRows[0]?.totalWithdrawals || 0),
        walletBalance,
        minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
        canWithdraw,
        nextWithdrawalAt: eligibility.nextWithdrawalAt,
        lastWithdrawalAt: eligibility.lastWithdrawalAt,
      },
      payoutMethods,
      transactions: transactionRows.map((item) => ({
        id: String(item.id || ""),
        amount: normalizeAmount(item.amount),
        type: String(item.type || ""),
        description: item.description ? String(item.description) : null,
        productTitle: item.productTitle ? String(item.productTitle) : null,
        createdAt: toISO(item.createdAt as Date | string | null),
      })),
      referredFriends: friendRows.map((item) => ({
        id: String(item.id || ""),
        name: String(item.name || ""),
        mobile: String(item.mobile || ""),
        joinedAt: toISO(item.createdAt as Date | string | null),
      })),
      withdrawals: withdrawalRows.map((item) => ({
        id: String(item.id || ""),
        amount: normalizeAmount(item.amount),
        status: String(item.status || "PENDING"),
        requestedAt: toISO(item.requestedAt as Date | string | null),
        reviewedAt: toISO(item.reviewedAt as Date | string | null),
        adminNote: item.adminNote ? String(item.adminNote) : null,
        payoutType: item.payoutType ? String(item.payoutType) : null,
        bankName: item.bankName ? String(item.bankName) : null,
        accountNo: item.accountNo ? String(item.accountNo) : null,
        upiId: item.upiId ? String(item.upiId) : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

referralsRouter.post("/referrals/payout-methods", ...ensureStudent, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const input = addPayoutMethodSchema.parse(req.body || {});
    const id = randomUUID();
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ReferralPayoutMethod
        (
          id,
          userId,
          type,
          bankName,
          accountNo,
          ifsc,
          place,
          upiId,
          isVerified,
          verifiedAt,
          verifiedBy,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      userId,
      input.type,
      input.type === "BANK" ? input.bankName || null : null,
      input.type === "BANK" ? input.accountNo || null : null,
      input.type === "BANK" ? String(input.ifsc || "").toUpperCase() : null,
      input.type === "BANK" ? input.place || null : null,
      input.type === "UPI" ? input.upiId || null : null,
      false,
      null,
      null,
      now,
      now
    );

    res.status(201).json({
      message: "Payout method added. It must be verified by admin before withdrawals.",
      payoutMethod: {
        id,
        type: input.type,
        isVerified: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

referralsRouter.post("/referrals/withdrawals", ...ensureStudent, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const input = withdrawalSchema.parse(req.body || {});
    const amount = normalizeAmount(input.amount);

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      throw new AppError(`Minimum withdrawal amount is \u20B9${MIN_WITHDRAWAL_AMOUNT}.`, 400);
    }

    const payoutMethodRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, isVerified
        FROM ReferralPayoutMethod
        WHERE id = ? AND userId = ?
        LIMIT 1
      `,
      input.payoutMethodId,
      userId
    )) as Array<{ id: string; isVerified: boolean | number }>;

    const payoutMethod = payoutMethodRows[0];
    if (!payoutMethod) {
      throw new AppError("Payout method not found.", 404);
    }

    if (!Boolean(payoutMethod.isVerified)) {
      throw new AppError("Payout method is not verified yet.", 400);
    }

    const walletBalance = await getWalletBalance(userId);
    if (walletBalance < amount) {
      throw new AppError("Insufficient referral wallet balance.", 400);
    }

    const eligibility = await getFortnightlyEligibility(userId);
    if (!eligibility.canWithdraw) {
      throw new AppError(
        `Next withdrawal can be requested after ${eligibility.nextWithdrawalAt}.`,
        400
      );
    }

    const now = new Date();
    const withdrawalId = randomUUID();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ReferralWithdrawal
        (
          id,
          userId,
          payoutMethodId,
          amount,
          status,
          requestedAt,
          reviewedAt,
          reviewedBy,
          adminNote,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, NULL, NULL, ?, ?)
      `,
      withdrawalId,
      userId,
      input.payoutMethodId,
      amount,
      now,
      now,
      now
    );

    const nextDate = new Date(now.getTime());
    nextDate.setDate(nextDate.getDate() + 14);

    res.status(201).json({
      message: "Withdrawal request submitted successfully.",
      withdrawal: {
        id: withdrawalId,
        amount,
        status: "PENDING",
        requestedAt: now.toISOString(),
      },
      nextWithdrawalAt: nextDate.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
