import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getRazorpayClient, razorpayKeyId } from "../config/razorpay";

export const paymentRouter = Router();

const createOrderSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().trim().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().trim().min(1, "razorpay_signature is required"),
});

paymentRouter.post("/order", async (req, res, next) => {
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

paymentRouter.post("/verify", async (req, res, next) => {
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

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
