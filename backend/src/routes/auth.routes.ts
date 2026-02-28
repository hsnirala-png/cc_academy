import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import {
  ensureUserReferralCode,
  getReferrerIdByCode,
} from "../modules/referrals/referral.utils";
import { ensureStudentCodeForUser } from "../modules/students/student-id.utils";
import { ensureMockTestRegistrationStorageReady } from "../utils/mockTestRegistrationStorage";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
  state: z.string().trim().min(2, "State is required").max(120),
  city: z.string().trim().min(2, "City is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referralCode: z.string().trim().min(4).max(40).optional(),
});

const mockReferralRegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
  email: z.string().trim().email("Enter a valid email").max(191),
  password: z.string().min(8, "Password must be at least 8 characters").max(191),
  referralCode: z.string().trim().min(4).max(64).optional(),
  mockTestId: z.string().trim().min(1).max(191).optional(),
});

const loginSchema = z.object({
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
  password: z.string().min(1, "Password is required"),
});

const checkMobileSchema = z.object({
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
});

const safeEnsureReferralCode = async (userId: string): Promise<string | null> => {
  try {
    return await ensureUserReferralCode(userId);
  } catch {
    return null;
  }
};

const safeEnsureStudentCode = async (userId: string): Promise<string | null> => {
  try {
    return await ensureStudentCodeForUser(userId);
  } catch {
    return null;
  }
};

const toDateOnly = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

type MockRegistrationGateRow = {
  id: string;
  mockTestId: string;
  examType: string | null;
  subject: string | null;
  streamChoice: string | null;
  scheduledDate: string | Date | null;
  scheduledTimeSlot: string | null;
};

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: { mobile: input.mobile },
      select: { id: true },
    });

    if (existingUser) {
      res.status(409).json({
        message: "Mobile number already in use. Please use another number.",
      });
      return;
    }

    const normalizedReferralCode = String(input.referralCode || "").trim();
    let referrerId: string | null = null;
    if (normalizedReferralCode) {
      referrerId = await getReferrerIdByCode(normalizedReferralCode);
      if (!referrerId) {
        res.status(400).json({ message: "Invalid referral code." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        state: input.state,
        city: input.city,
        passwordHash,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        state: true,
        city: true,
        role: true,
      },
    });

    const token = signToken(user.id, user.role);
    if (referrerId && referrerId !== user.id) {
      await prisma.$executeRawUnsafe(
        `UPDATE User SET referrerId = ? WHERE id = ?`,
        referrerId,
        user.id
      );
    }
    const referralCode = await safeEnsureReferralCode(user.id);
    const studentCode = await safeEnsureStudentCode(user.id);

    res.status(201).json({
      token,
      user: {
        ...user,
        referralCode,
        studentCode,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/mock-referral-register", async (req, res, next) => {
  try {
    const input = mockReferralRegisterSchema.parse(req.body);

    await ensureMockTestRegistrationStorageReady();

    let gate: MockRegistrationGateRow | null = null;

    if (input.mockTestId) {
      const gateRows = (await prisma.$queryRawUnsafe(
        `
          SELECT
            g.id,
            g.mockTestId,
            mt.examType,
            mt.subject,
            mt.streamChoice,
            g.scheduledDate,
            g.scheduledTimeSlot
          FROM MockTestRegistrationGate g
          INNER JOIN MockTest mt ON mt.id = g.mockTestId
          WHERE g.isActive = 1
            AND mt.isActive = 1
            AND g.mockTestId = ?
          LIMIT 1
        `,
        input.mockTestId
      )) as MockRegistrationGateRow[];
      gate = gateRows[0] || null;
      if (!gate?.mockTestId) {
        res.status(404).json({ message: "Mock registration is not available for this mock test." });
        return;
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ mobile: input.mobile }, { email: input.email }],
      },
      select: {
        id: true,
        mobile: true,
        email: true,
      },
    });

    if (existingUser) {
      const message =
        existingUser.mobile === input.mobile
          ? "Mobile number is already registered. Please login to continue."
          : "Email is already registered. Please use another email or login first.";
      res.status(409).json({ message, code: "MOCK_ACCOUNT_EXISTS" });
      return;
    }

    const normalizedReferralCode = String(input.referralCode || "").trim();
    let referrerId: string | null = null;
    if (normalizedReferralCode) {
      referrerId = await getReferrerIdByCode(normalizedReferralCode);
      if (!referrerId) {
        res.status(400).json({ message: "Invalid referral code." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        state: "Pending",
        city: "Pending",
        passwordHash,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        state: true,
        city: true,
        role: true,
      },
    });

    if (referrerId && referrerId !== user.id) {
      await prisma.$executeRawUnsafe(`UPDATE User SET referrerId = ? WHERE id = ?`, referrerId, user.id);
    }

    let referralBonusAwarded = false;
    if (gate) {
      const gateExamType = String(gate.examType || "").trim().toUpperCase() || "PSTET_1";
      const gateSubject = String(gate.subject || "").trim().toUpperCase();
      const gateStream = String(gate.streamChoice || "").trim().toUpperCase();
      const derivedGateStreamChoice =
        gateStream === "SCIENCE_MATH" || gateStream === "SOCIAL_STUDIES"
          ? gateStream
          : gateSubject === "SCIENCE_MATH" || gateSubject === "SOCIAL_STUDIES"
          ? gateSubject
          : "";
      const effectiveDate = String(
        toDateOnly(gate.scheduledDate) || new Date().toISOString().slice(0, 10)
      ).trim();
      const effectiveTimeSlot = String(gate.scheduledTimeSlot || "09:00").trim() || "09:00";
      const preferredDate = new Date(`${effectiveDate}T00:00:00.000Z`);
      const friendReferralCode = String(input.referralCode || "").trim().toUpperCase();
      const now = new Date();

      await prisma.$executeRawUnsafe(
        `
          INSERT INTO MockTestRegistrationEntry (
            id, gateId, mockTestId, userId, fullName, mobile, email, friendReferralCode, referredByUserId, noFriendReferral, preferredExamType, preferredStreamChoice, preferredDate, preferredTimeSlot, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        `${user.id}:${gate.id}`,
        gate.id,
        gate.mockTestId,
        user.id,
        input.name.trim(),
        input.mobile.trim(),
        input.email.trim(),
        friendReferralCode || null,
        referrerId,
        friendReferralCode ? 0 : 1,
        gateExamType,
        derivedGateStreamChoice || null,
        preferredDate,
        effectiveTimeSlot,
        now,
        now
      );

      if (referrerId && referrerId !== user.id && friendReferralCode) {
        const existingReferralRows = (await prisma.$queryRawUnsafe(
          `
            SELECT referrerUserId
            FROM MockTestRegistrationReferralBonus
            WHERE gateId = ?
              AND referredUserId = ?
            LIMIT 1
          `,
          gate.id,
          user.id
        )) as Array<{ referrerUserId: string }>;
        if (!String(existingReferralRows[0]?.referrerUserId || "").trim()) {
          await prisma.$executeRawUnsafe(
            `
              INSERT INTO MockTestRegistrationReferralBonus (
                id, gateId, mockTestId, referrerUserId, referredUserId, referralCodeUsed, createdAt
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            `${gate.id}:${user.id}`,
            gate.id,
            gate.mockTestId,
            referrerId,
            user.id,
            friendReferralCode,
            now
          );
          referralBonusAwarded = true;
        }
      }
    }

    const token = signToken(user.id, user.role);
    const referralCode = await safeEnsureReferralCode(user.id);
    const studentCode = await safeEnsureStudentCode(user.id);

    res.status(201).json({
      token,
      user: {
        ...user,
        referralCode,
        studentCode,
      },
      referralBonusAwarded,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { mobile: input.mobile },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid mobile or password" });
      return;
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid mobile or password" });
      return;
    }

    const token = signToken(user.id, user.role);
    const studentCode = user.role === Role.STUDENT ? await safeEnsureStudentCode(user.id) : null;

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        state: user.state,
        city: user.city,
        role: user.role,
        studentCode,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/check-mobile", async (req, res, next) => {
  try {
    const input = checkMobileSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { mobile: input.mobile },
      select: { id: true, role: true },
    });

    res.json({
      exists: Boolean(existingUser),
      role: existingUser?.role || null,
    });
  } catch (error) {
    next(error);
  }
});
