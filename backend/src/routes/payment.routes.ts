import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getRazorpayClient, razorpayKeyId } from "../config/razorpay";
import { requireAuth } from "../middlewares/requireAuth";

export const paymentRouter = Router();

type PaymentRecord = {
  userId: string;
  orderId: string;
  paymentId?: string;
  amountInPaise: number;
  currency: string;
  verifiedAt?: number;
  consumedAt?: number;
  createdAt: number;
};

const PAYMENT_RECORD_TTL_MS = 2 * 60 * 60 * 1000;
// Phase 2B-1 safety gate only. Phase 2B-2 should replace this in-memory record
// with a durable PaymentOrder table and server-computed Razorpay order amount.
const pendingPaymentRecords = new Map<string, PaymentRecord>();
const verifiedPaymentRecords = new Map<string, PaymentRecord>();

const createOrderSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().trim().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().trim().min(1, "razorpay_signature is required"),
});

const cleanupPaymentRecords = () => {
  const cutoff = Date.now() - PAYMENT_RECORD_TTL_MS;
  for (const [key, record] of pendingPaymentRecords.entries()) {
    if (record.createdAt < cutoff) pendingPaymentRecords.delete(key);
  }
  for (const [key, record] of verifiedPaymentRecords.entries()) {
    if ((record.verifiedAt || record.createdAt) < cutoff) verifiedPaymentRecords.delete(key);
  }
};

const getPaymentKey = (userId: string, orderId: string, paymentId = "") =>
  `${userId}:${orderId}:${paymentId}`;

export const consumeVerifiedPaymentEvidence = ({
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  expectedAmountInPaise,
  expectedCurrency = "INR",
}: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  expectedAmountInPaise: number;
  expectedCurrency?: string;
}) => {
  cleanupPaymentRecords();
  const orderId = String(razorpayOrderId || "").trim();
  const paymentId = String(razorpayPaymentId || "").trim();
  if (!userId || !orderId || !paymentId) {
    return { ok: false, message: "Verified payment evidence is required." };
  }

  const key = getPaymentKey(userId, orderId, paymentId);
  const record = verifiedPaymentRecords.get(key);
  if (!record || record.consumedAt) {
    return { ok: false, message: "Payment must be verified before purchase completion." };
  }

  if (record.userId !== userId || record.orderId !== orderId || record.paymentId !== paymentId) {
    return { ok: false, message: "Payment evidence does not match this student." };
  }

  if (record.currency !== expectedCurrency) {
    return { ok: false, message: "Payment currency mismatch." };
  }

  if (record.amountInPaise !== expectedAmountInPaise) {
    return { ok: false, message: "Payment amount mismatch." };
  }

  record.consumedAt = Date.now();
  verifiedPaymentRecords.set(key, record);
  return { ok: true, message: "Payment evidence accepted." };
};

paymentRouter.post("/order", requireAuth, async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body || {});
    const amountInPaise = Math.round(Number(input.amount) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      res.status(400).json({ message: "Invalid amount." });
      return;
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    cleanupPaymentRecords();
    pendingPaymentRecords.set(getPaymentKey(req.user!.userId, String(order.id)), {
      userId: req.user!.userId,
      orderId: String(order.id),
      amountInPaise: Number(order.amount || amountInPaise),
      currency: String(order.currency || "INR"),
      createdAt: Date.now(),
    });

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
    });
  } catch (error) {
    next(error);
  }
});

paymentRouter.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const input = verifyPaymentSchema.parse(req.body || {});
    const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!secret) {
      res.status(500).json({ message: "Payment verification is not configured." });
      return;
    }

    const payload = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(input.razorpay_signature);
    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      res.status(400).json({ success: false, message: "Invalid payment signature." });
      return;
    }

    cleanupPaymentRecords();
    const pendingKey = getPaymentKey(req.user!.userId, input.razorpay_order_id);
    const pendingRecord = pendingPaymentRecords.get(pendingKey);
    if (!pendingRecord) {
      res.status(400).json({ success: false, message: "Payment order was not created for this student." });
      return;
    }

    verifiedPaymentRecords.set(
      getPaymentKey(req.user!.userId, input.razorpay_order_id, input.razorpay_payment_id),
      {
        ...pendingRecord,
        paymentId: input.razorpay_payment_id,
        verifiedAt: Date.now(),
      }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
