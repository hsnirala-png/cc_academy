import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../utils/appError";
import { getRazorpayClient, razorpayKeyId } from "../../config/razorpay";
import { prisma } from "../../utils/prisma";
import { calculateTeacherHubPlatformFee } from "../../utils/teacherHubPolicy";
import { teacherEnrollmentService } from "./teacher-enrollment.service";

const orderModel = () => (prisma as any).teacherOrder;
const offeringModel = () => (prisma as any).teacherOffering;
const billingCycleModel = () => (prisma as any).teacherBillingCycle;
const ledgerModel = () => (prisma as any).teacherLedgerEntry;

const serializeOrder = (item: any) => ({
  id: item.id,
  studentUserId: item.studentUserId,
  teacherEnrollmentId: item.teacherEnrollmentId,
  teacherOfferingId: item.teacherOfferingId,
  billingCycle: item.billingCycle,
  grossAmount: Number(item.grossAmount || 0),
  platformFeeAmount: Number(item.platformFeeAmount || 0),
  netTeacherAmount: Number(item.netTeacherAmount || 0),
  paymentStatus: item.paymentStatus,
  cycleStart: item.cycleStart?.toISOString?.() || null,
  cycleEnd: item.cycleEnd?.toISOString?.() || null,
  isDemo: Boolean(item.isDemo),
  razorpayOrderId: item.razorpayOrderId || null,
  razorpayPaymentId: item.razorpayPaymentId || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherBillingService = {
  async previewEnrollmentOrder(studentUserId: string, enrollmentId: string) {
    const enrollment = await teacherEnrollmentService.requireStudentEnrollment(studentUserId, enrollmentId);
    const offering = await offeringModel().findUnique({ where: { id: enrollment.teacherOfferingId } });
    if (!offering) throw new AppError("Teacher offering not found.", 404);
    const grossAmount = enrollment.billingCycle === "DEMO"
      ? Number(offering.demoPrice || 0)
      : Number(offering.cyclePrice || 0);
    const platformFeeAmount = calculateTeacherHubPlatformFee(grossAmount);
    return {
      teacherEnrollmentId: enrollment.id,
      billingCycle: enrollment.billingCycle,
      grossAmount,
      platformFeeAmount,
      netTeacherAmount: Number((grossAmount - platformFeeAmount).toFixed(2)),
    };
  },

  async createPendingOrder(studentUserId: string, enrollmentId: string) {
    const preview = await this.previewEnrollmentOrder(studentUserId, enrollmentId);
    const enrollment = await teacherEnrollmentService.requireStudentEnrollment(studentUserId, enrollmentId);
    const row = await orderModel().create({
      data: {
        studentUserId,
        teacherEnrollmentId: enrollment.id,
        teacherOfferingId: enrollment.teacherOfferingId,
        billingCycle: preview.billingCycle,
        grossAmount: preview.grossAmount,
        platformFeeAmount: preview.platformFeeAmount,
        netTeacherAmount: preview.netTeacherAmount,
        cycleStart: enrollment.currentCycleStart ? new Date(enrollment.currentCycleStart) : null,
        cycleEnd: enrollment.currentCycleEnd ? new Date(enrollment.currentCycleEnd) : null,
        isDemo: preview.billingCycle === "DEMO",
      },
    });
    return serializeOrder(row);
  },

  async createRazorpayOrder(studentUserId: string, orderId: string) {
    const order = await orderModel().findFirst({
      where: { id: orderId, studentUserId },
    });
    if (!order) throw new AppError("Teacher Hub order not found.", 404);
    const amountInPaise = Math.round(Number(order.grossAmount || 0) * 100);
    const razorpay = getRazorpayClient();
    const paymentOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `teacher_hub_${Date.now()}`,
      notes: {
        teacherHubOrderId: order.id,
      },
    });
    const updated = await orderModel().update({
      where: { id: order.id },
      data: { razorpayOrderId: paymentOrder.id },
    });
    return {
      order: serializeOrder(updated),
      payment: {
        key: razorpayKeyId,
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
      },
    };
  },

  async verifyPayment(studentUserId: string, input: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const payload = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(String(input.razorpay_signature || ""));
    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer);
    if (!isValid) throw new AppError("Invalid Teacher Hub payment signature.", 400);

    const result = await prisma.$transaction(async (tx) => {
      const txOrderModel = () => (tx as any).teacherOrder;
      const txBillingCycleModel = () => (tx as any).teacherBillingCycle;
      const txLedgerModel = () => (tx as any).teacherLedgerEntry;

      const order = await txOrderModel().findFirst({
        where: { id: input.orderId, studentUserId },
      });
      if (!order) throw new AppError("Teacher Hub order not found.", 404);
      if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpay_order_id) {
        throw new AppError("Teacher Hub payment order mismatch.", 400, "TEACHER_HUB_ORDER_MISMATCH");
      }

      if (order.paymentStatus === "PAID") {
        if (order.razorpayPaymentId && order.razorpayPaymentId !== input.razorpay_payment_id) {
          throw new AppError(
            "Teacher Hub payment has already been processed with a different payment id.",
            409,
            "TEACHER_HUB_ORDER_ALREADY_PROCESSED"
          );
        }
        return {
          order: {
            ...serializeOrder(order),
            alreadyProcessed: true,
          },
        };
      }

      const updateResult = await txOrderModel().updateMany({
        where: {
          id: order.id,
          studentUserId,
          paymentStatus: { not: "PAID" },
          razorpayOrderId: input.razorpay_order_id,
        },
        data: {
          paymentStatus: "PAID",
          razorpayPaymentId: input.razorpay_payment_id,
        },
      });

      if (!updateResult.count) {
        const latest = await txOrderModel().findFirst({
          where: { id: input.orderId, studentUserId },
        });
        if (latest?.paymentStatus === "PAID") {
          return {
            order: {
              ...serializeOrder(latest),
              alreadyProcessed: true,
            },
          };
        }
        throw new AppError("Teacher Hub payment verification could not be completed.", 409);
      }

      const updated = await txOrderModel().findUnique({ where: { id: order.id } });
      if (!updated) throw new AppError("Teacher Hub order not found.", 404);

      const billingCycle = await txBillingCycleModel().findFirst({
        where: { teacherEnrollmentId: updated.teacherEnrollmentId, status: "OPEN" },
        orderBy: [{ createdAt: "desc" }],
      });
      if (billingCycle) {
        const existingLedger = await txLedgerModel().findFirst({
          where: {
            teacherOrderId: updated.id,
            entryType: "ORDER_CAPTURED",
          },
        });
        if (!existingLedger) {
          await txBillingCycleModel().update({
            where: { id: billingCycle.id },
            data: {
              grossAmount: Number(billingCycle.grossAmount || 0) + Number(updated.grossAmount || 0),
              platformFeeAmount:
                Number(billingCycle.platformFeeAmount || 0) + Number(updated.platformFeeAmount || 0),
              netAmount: Number(billingCycle.netAmount || 0) + Number(updated.netTeacherAmount || 0),
            },
          });
          await txLedgerModel().create({
            data: {
              teacherProfileId: billingCycle.teacherProfileId,
              billingCycleId: billingCycle.id,
              teacherOrderId: updated.id,
              entryType: "ORDER_CAPTURED",
              amount: Number(updated.netTeacherAmount || 0),
              note: "Teacher Hub order payment captured.",
            },
          });
        }
      }

      return {
        order: serializeOrder(updated),
      };
    });

    return result.order;
  },
};
