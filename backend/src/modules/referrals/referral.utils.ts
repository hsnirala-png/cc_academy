import { randomInt } from "node:crypto";
import {
  ensureStudentCodeForUser,
  getUserIdByStudentCode,
  isStudentCode,
} from "../students/student-id.utils";
import { prisma } from "../../utils/prisma";

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const normalizeAmount = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(parsed);
};

type WalletSumRow = {
  balance: number | string | null;
};

type UserReferralRow = {
  id: string;
  mobile: string;
  referralCode: string | null;
  role: string;
};

const randomDigits = (length: number): string => {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += String(randomInt(0, 10));
  }
  return output;
};

const buildReferralCodeCandidate = (mobile: string): string => {
  const tail = String(mobile || "").replace(/\D/g, "").slice(-6) || randomDigits(6);
  return `CC${tail}${randomDigits(2)}`;
};

export const getWalletBalance = async (userId: string): Promise<number> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM ReferralTransaction
      WHERE userId = ?
    `,
    userId
  )) as WalletSumRow[];

  return normalizeAmount(rows[0]?.balance ?? 0);
};

export const ensureUserReferralCode = async (userId: string): Promise<string> => {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, mobile, referralCode, role FROM User WHERE id = ? LIMIT 1`,
    userId
  )) as UserReferralRow[];

  const user = rows[0];
  if (!user) {
    throw new Error("User not found for referral code generation.");
  }

  if (String(user.role || "").toUpperCase() === "STUDENT") {
    const studentCode = await ensureStudentCodeForUser(user.id);
    const existing = String(user.referralCode || "").trim().toUpperCase();
    if (existing !== studentCode) {
      await prisma
        .$executeRawUnsafe(
          `UPDATE User SET referralCode = ? WHERE id = ?`,
          studentCode,
          user.id
        )
        .catch(() => undefined);
    }
    return studentCode;
  }

  const existingCode = String(user.referralCode || "").trim();
  if (existingCode) return existingCode;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = buildReferralCodeCandidate(user.mobile);
    const conflictRows = (await prisma.$queryRawUnsafe(
      `SELECT id FROM User WHERE referralCode = ? LIMIT 1`,
      candidate
    )) as Array<{ id: string }>;

    if (conflictRows.length) continue;

    await prisma.$executeRawUnsafe(
      `UPDATE User SET referralCode = ? WHERE id = ? AND (referralCode IS NULL OR referralCode = '')`,
      candidate,
      userId
    );

    return candidate;
  }

  throw new Error("Unable to generate unique referral code. Please retry.");
};

export const getFortnightlyEligibility = async (
  userId: string
): Promise<{ canWithdraw: boolean; nextWithdrawalAt: string | null; lastWithdrawalAt: string | null }> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT requestedAt
      FROM ReferralWithdrawal
      WHERE userId = ?
      ORDER BY requestedAt DESC
      LIMIT 1
    `,
    userId
  )) as Array<{ requestedAt: Date | string }>;

  const lastRaw = rows[0]?.requestedAt;
  if (!lastRaw) {
    return { canWithdraw: true, nextWithdrawalAt: null, lastWithdrawalAt: null };
  }

  const lastDate = new Date(lastRaw);
  if (Number.isNaN(lastDate.getTime())) {
    return { canWithdraw: true, nextWithdrawalAt: null, lastWithdrawalAt: null };
  }

  const nextDate = new Date(lastDate.getTime());
  nextDate.setDate(nextDate.getDate() + 14);
  const canWithdraw = nextDate.getTime() <= Date.now();

  return {
    canWithdraw,
    nextWithdrawalAt: canWithdraw ? null : nextDate.toISOString(),
    lastWithdrawalAt: lastDate.toISOString(),
  };
};

export const getReferrerIdByCode = async (referralCode: string): Promise<string | null> => {
  const code = String(referralCode || "").trim().toUpperCase();
  if (!code) return null;

  if (isStudentCode(code)) {
    const studentUserId = await getUserIdByStudentCode(code);
    if (studentUserId) return studentUserId;
  }

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM User WHERE referralCode = ? LIMIT 1`,
    code
  )) as Array<{ id: string }>;

  return rows[0]?.id || null;
};

export const toISO = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};
