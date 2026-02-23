import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ensureUserReferralCode } from "../modules/referrals/referral.utils";
import { ensureStudentCodeForUser, ensureStudentCodesForUsers } from "../modules/students/student-id.utils";
import { AppError } from "../utils/appError";
import { ensureMockTestAccessStorageReady } from "../utils/mockTestAccessStorage";
import { prisma } from "../utils/prisma";

export const adminRouter = Router();

const optionalString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const optionalDate = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.date().optional()
);

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().int().min(1).optional()
);

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean().optional());

const classCreateSchema = z.object({
  name: z.string().trim().min(2, "Class name is required").max(120),
  description: optionalString(1200),
  instructor: optionalString(120),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).default("ONLINE"),
  startDate: z.coerce.date(),
  endDate: optionalDate,
  seats: optionalInt,
  isActive: optionalBoolean,
});

const classUpdateSchema = classCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No class updates provided");

const planCreateSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  description: optionalString(1200),
  price: z.coerce.number().positive("Price must be greater than 0"),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day"),
  isActive: optionalBoolean,
});

const planUpdateSchema = planCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "No subscription updates provided");

const assignCourseSchema = z.object({
  courseId: z.string().trim().min(1),
});

const assignProductSchema = z.object({
  productId: z.string().trim().min(1),
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

const ensureAdmin = [requireAuth, requireRole(Role.ADMIN)] as const;

type ClassCreateInput = {
  name: string;
  description?: string;
  instructor?: string;
  mode: "ONLINE" | "OFFLINE" | "HYBRID";
  startDate: Date;
  endDate?: Date;
  seats?: number;
  isActive?: boolean;
};

type ClassUpdateInput = Partial<ClassCreateInput>;

type PlanCreateInput = {
  title: string;
  description?: string;
  price: number;
  durationDays: number;
  isActive?: boolean;
};

type PlanUpdateInput = Partial<PlanCreateInput>;

const serializeClass = (item: {
  id: string;
  name: string;
  description: string | null;
  instructor: string | null;
  mode: string;
  startDate: Date;
  endDate: Date | null;
  seats: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { subscriptions: number };
}) => ({
  ...item,
  startDate: item.startDate.toISOString(),
  endDate: item.endDate ? item.endDate.toISOString() : null,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const serializePlan = (item: {
  id: string;
  title: string;
  description: string | null;
  price: { toNumber: () => number };
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { subscriptions: number };
}) => ({
  ...item,
  price: item.price.toNumber(),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

adminRouter.get("/overview", ...ensureAdmin, async (_req, res, next) => {
  try {
    const [
      studentsTotal,
      classesTotal,
      classesActive,
      plansTotal,
      plansActive,
      subscriptionsTotal,
      subscriptionsActive,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.coachingClass.count(),
      prisma.coachingClass.count({ where: { isActive: true } }),
      prisma.subscriptionPlan.count(),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
      prisma.studentSubscription.count(),
      prisma.studentSubscription.count({ where: { status: "ACTIVE" } }),
    ]);

    res.json({
      overview: {
        studentsTotal,
        classesTotal,
        classesActive,
        plansTotal,
        plansActive,
        subscriptionsTotal,
        subscriptionsActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users", ...ensureAdmin, async (_req, res, next) => {
  try {
    await ensureMockTestAccessStorageReady();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        state: true,
        city: true,
        role: true,
        enrollments: {
          select: {
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    const studentUserIds = users
      .filter((user) => user.role === Role.STUDENT)
      .map((user) => user.id);
    const studentCodeMap = await ensureStudentCodesForUsers(studentUserIds);

    const assignedProductMap = new Map<
      string,
      Array<{
        id: string;
        title: string;
        isActive: boolean;
        assignedAt: string;
        assignedBy: { id: string; name: string } | null;
      }>
    >();
    if (studentUserIds.length) {
      const placeholders = studentUserIds.map(() => "?").join(", ");
      const rows = (await prisma.$queryRawUnsafe(
        `
          SELECT
            spa.userId,
            spa.productId,
            spa.createdAt AS assignedAt,
            spa.assignedBy,
            p.title AS productTitle,
            p.isActive AS productIsActive,
            u.name AS assignedByName
          FROM StudentProductAccess spa
          INNER JOIN Product p ON p.id = spa.productId
          LEFT JOIN User u ON u.id = spa.assignedBy
          WHERE spa.userId IN (${placeholders})
          ORDER BY spa.createdAt DESC
        `,
        ...studentUserIds
      )) as Array<{
        userId: string;
        productId: string;
        assignedAt: Date | string;
        assignedBy: string | null;
        productTitle: string;
        productIsActive: number | boolean;
        assignedByName: string | null;
      }>;

      rows.forEach((row) => {
        const list = assignedProductMap.get(row.userId) || [];
        list.push({
          id: row.productId,
          title: row.productTitle,
          isActive: Boolean(Number(row.productIsActive) === 1 || row.productIsActive === true),
          assignedAt: new Date(String(row.assignedAt)).toISOString(),
          assignedBy: row.assignedBy
            ? { id: row.assignedBy, name: String(row.assignedByName || "") }
            : null,
        });
        assignedProductMap.set(row.userId, list);
      });
    }

    const usersWithMeta = await Promise.all(
      users.map(async (user) => {
        const studentCode = user.role === Role.STUDENT ? studentCodeMap.get(user.id) || null : null;
        const referralCode =
          user.role === Role.STUDENT
            ? await safeEnsureReferralCode(user.id)
            : null;
        return {
          ...user,
          studentCode,
          referralCode,
          assignedProducts: assignedProductMap.get(user.id) || [],
        };
      })
    );

    res.json({ users: usersWithMeta });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:userId/enrollments", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = assignCourseSchema.parse(req.body);
    const userId = String(req.params.userId || "").trim();
    if (!userId) {
      throw new AppError("Invalid student.", 400);
    }

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new AppError("Student not found.", 404);
    }

    const course = await prisma.course.findUnique({
      where: { id: input.courseId },
      select: { id: true, title: true, isActive: true },
    });
    if (!course) {
      throw new AppError("Course not found.", 404);
    }

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: student.id,
        courseId: course.id,
      },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: student.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    const studentCode = await safeEnsureStudentCode(student.id);
    const referralCode = await safeEnsureReferralCode(student.id);

    res.json({
      message: "Course assigned to student.",
      student: {
        id: student.id,
        studentCode,
        referralCode,
      },
      enrollments: enrollments.map((item) => ({
        id: item.id,
        enrolledAt: item.enrolledAt.toISOString(),
        course: item.course,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:userId/product-access", ...ensureAdmin, async (req, res, next) => {
  try {
    await ensureMockTestAccessStorageReady();
    const input = assignProductSchema.parse(req.body);
    const userId = String(req.params.userId || "").trim();
    if (!userId) {
      throw new AppError("Invalid student.", 400);
    }

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new AppError("Student not found.", 404);
    }

    const productRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, title, isActive
        FROM Product
        WHERE id = ?
        LIMIT 1
      `,
      input.productId
    )) as Array<{ id: string; title: string; isActive: number | boolean }>;
    const product = productRows[0];
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO StudentProductAccess (id, userId, productId, assignedBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          assignedBy = VALUES(assignedBy),
          updatedAt = VALUES(updatedAt)
      `,
      randomUUID(),
      student.id,
      product.id,
      req.user!.userId,
      now,
      now
    );

    const assignedRows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          spa.productId,
          spa.createdAt AS assignedAt,
          spa.assignedBy,
          p.title AS productTitle,
          p.isActive AS productIsActive,
          u.name AS assignedByName
        FROM StudentProductAccess spa
        INNER JOIN Product p ON p.id = spa.productId
        LEFT JOIN User u ON u.id = spa.assignedBy
        WHERE spa.userId = ?
        ORDER BY spa.createdAt DESC
      `,
      student.id
    )) as Array<{
      productId: string;
      assignedAt: Date | string;
      assignedBy: string | null;
      productTitle: string;
      productIsActive: number | boolean;
      assignedByName: string | null;
    }>;

    res.json({
      message: "Product access assigned to student.",
      studentId: student.id,
      assignedProducts: assignedRows.map((item) => ({
        id: item.productId,
        title: item.productTitle,
        isActive: Boolean(Number(item.productIsActive) === 1 || item.productIsActive === true),
        assignedAt: new Date(String(item.assignedAt)).toISOString(),
        assignedBy: item.assignedBy
          ? { id: item.assignedBy, name: String(item.assignedByName || "") }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/classes", ...ensureAdmin, async (_req, res, next) => {
  try {
    const classes = await prisma.coachingClass.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    res.json({ classes: classes.map(serializeClass) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/classes", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = classCreateSchema.parse(req.body) as ClassCreateInput;
    if (input.endDate && input.endDate < input.startDate) {
      throw new AppError("Class end date must be after start date", 400);
    }

    const classItem = await prisma.coachingClass.create({
      data: {
        name: input.name,
        description: input.description,
        instructor: input.instructor,
        mode: input.mode,
        startDate: input.startDate,
        endDate: input.endDate,
        seats: input.seats,
        isActive: input.isActive ?? true,
      },
    });

    res.status(201).json({ classItem: serializeClass(classItem) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/classes/:classId", ...ensureAdmin, async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const updates = classUpdateSchema.parse(req.body) as ClassUpdateInput;
    const existing = await prisma.coachingClass.findUnique({ where: { id: classId } });

    if (!existing) {
      throw new AppError("Class not found", 404);
    }

    const nextStartDate = updates.startDate ?? existing.startDate;
    const nextEndDate = updates.endDate ?? existing.endDate ?? undefined;
    if (nextEndDate && nextEndDate < nextStartDate) {
      throw new AppError("Class end date must be after start date", 400);
    }

    const classItem = await prisma.coachingClass.update({
      where: { id: classId },
      data: {
        name: updates.name,
        description: updates.description,
        instructor: updates.instructor,
        mode: updates.mode,
        startDate: updates.startDate,
        endDate: updates.endDate,
        seats: updates.seats,
        isActive: updates.isActive,
      },
    });

    res.json({ classItem: serializeClass(classItem) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/classes/:classId", ...ensureAdmin, async (req, res, next) => {
  try {
    const classId = req.params.classId;
    await prisma.coachingClass.delete({ where: { id: classId } });
    res.json({ message: "Class deleted" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/subscriptions", ...ensureAdmin, async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    res.json({ plans: plans.map(serializePlan) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/subscriptions", ...ensureAdmin, async (req, res, next) => {
  try {
    const input = planCreateSchema.parse(req.body) as PlanCreateInput;
    const plan = await prisma.subscriptionPlan.create({
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        durationDays: input.durationDays,
        isActive: input.isActive ?? true,
      },
    });

    res.status(201).json({ plan: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/subscriptions/:planId", ...ensureAdmin, async (req, res, next) => {
  try {
    const planId = req.params.planId;
    const updates = planUpdateSchema.parse(req.body) as PlanUpdateInput;
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

    if (!existing) {
      throw new AppError("Subscription plan not found", 404);
    }

    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        title: updates.title,
        description: updates.description,
        price: updates.price,
        durationDays: updates.durationDays,
        isActive: updates.isActive,
      },
    });

    res.json({ plan: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/subscriptions/:planId", ...ensureAdmin, async (req, res, next) => {
  try {
    const planId = req.params.planId;
    const subscribers = await prisma.studentSubscription.count({
      where: { planId },
    });

    if (subscribers > 0) {
      throw new AppError(
        "Cannot delete plan with active/past subscriptions. Set it inactive instead.",
        409
      );
    }

    await prisma.subscriptionPlan.delete({ where: { id: planId } });
    res.json({ message: "Subscription plan deleted" });
  } catch (error) {
    next(error);
  }
});
