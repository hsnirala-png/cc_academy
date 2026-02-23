import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureUserReferralCode } from "../modules/referrals/referral.utils";
import { ensureStudentCodeForUser } from "../modules/students/student-id.utils";
import { prisma } from "../utils/prisma";

export const meRouter = Router();

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

meRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        state: true,
        city: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const studentCode = user.role === Role.STUDENT ? await safeEnsureStudentCode(user.id) : null;
    const referralCode = user.role === Role.STUDENT ? await safeEnsureReferralCode(user.id) : null;

    res.json({
      user: {
        ...user,
        studentCode,
        referralCode,
      },
    });
  } catch (error) {
    next(error);
  }
});
