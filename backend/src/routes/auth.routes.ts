import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import {
  ensureUserReferralCode,
  getReferrerIdByCode,
} from "../modules/referrals/referral.utils";
import { ensureStudentCodeForUser } from "../modules/students/student-id.utils";
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
