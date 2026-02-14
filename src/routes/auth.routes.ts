import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  mobile: z.string().regex(/^\d{10,15}$/, "Mobile must be 10-15 digits"),
  password: z.string().min(1, "Password is required"),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const orFilters =
      input.email !== undefined
        ? [{ mobile: input.mobile }, { email: input.email }]
        : [{ mobile: input.mobile }];

    const existingUser = await prisma.user.findFirst({
      where: { OR: orFilters },
      select: { id: true },
    });

    if (existingUser) {
      res.status(409).json({
        message: "Mobile number or Email already in use. Please change one.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        passwordHash,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
      },
    });

    const token = signToken(user.id, user.role);

    res.status(201).json({ token, user });
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

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});
