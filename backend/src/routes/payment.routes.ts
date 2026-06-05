import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getRazorpayClient, razorpayKeyId } from "../config/razorpay";
import { requireAuth } from "../middlewares/requireAuth";
import { getReferrerIdByCode, getWalletBalance, normalizeAmount } from "../modules/referrals/referral.utils";
import { prisma } from "../utils/prisma";

export const paymentRouter = Router();
export const paymentWebhookRouter = Router();

type CheckoutProductRow = {
  id: string;
  title: string;
  listPrice: number | string;
  salePrice: number | string;
  isActive: number | boolean;
};

type CheckoutPackageRow = {
  id: string;
  productId: string;
  title: string;
  price: number | string;
  isActive: number | boolean;
};

type PaymentOrderRow = {
  id: string;
  userId: string;
  productId: string;
  amountPaise: number | string;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: string;
  referralCodeSnapshot: string | null;
  walletAmountPaiseSnapshot: number | string;
};

type WebhookPaymentOrderRow = {
  id: string;
  status: string;
  razorpayPaymentId: string | null;
};

type PaymentEventRow = {
  id: string;
  status: string;
};

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().max(max).optional()
  );

const createOrderSchema = z.object({
  productId: z.string().trim().min(1, "productId is required").max(191),
  packageId: optionalTrimmedString(191),
  referralCode: z.string().trim().min(4).max(40).optional(),
  includeDefaultOffer: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return value;
  }, z.boolean().optional()),
  walletUseAmount: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return value;
    },
    z.coerce.number().nonnegative().optional()
  ),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().trim().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().trim().min(1, "razorpay_signature is required"),
});

const toHeaderValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const verifyWebhookSignature = (rawBody: Buffer, signature: string, secret: string): boolean => {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
};

const readNestedRecord = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const next = (value as Record<string, unknown>)[key];
  if (!next || typeof next !== "object" || Array.isArray(next)) return null;
  return next as Record<string, unknown>;
};

const readNestedString = (value: unknown, key: string): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>)[key];
  const text = String(raw || "").trim();
  return text || null;
};

const extractWebhookContext = (payload: Record<string, unknown>, rawBody: Buffer) => {
  const eventType = readNestedString(payload, "event") || "unknown";
  const payloadRecord = readNestedRecord(payload, "payload");
  const paymentEntity = readNestedRecord(readNestedRecord(payloadRecord, "payment"), "entity");
  const orderEntity = readNestedRecord(readNestedRecord(payloadRecord, "order"), "entity");
  const razorpayOrderId = readNestedString(paymentEntity, "order_id") || readNestedString(orderEntity, "id");
  const razorpayPaymentId = readNestedString(paymentEntity, "id");
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const createdAt = readNestedString(payload, "created_at");
  const razorpayEventId =
    readNestedString(payload, "id") ||
    readNestedString(payload, "event_id") ||
    [eventType, razorpayOrderId || "no-order", razorpayPaymentId || "no-payment", createdAt || bodyHash].join(":");

  return {
    eventType,
    razorpayEventId,
    razorpayOrderId,
    razorpayPaymentId,
  };
};

const updatePaymentEvent = async (
  eventId: string,
  status: "PROCESSED" | "IGNORED" | "FAILED",
  processedAt: Date,
  paymentOrderId: string | null,
  errorMessage: string | null = null
) => {
  await prisma.$executeRawUnsafe(
    `
      UPDATE PaymentEvent
      SET status = ?, processedAt = ?, paymentOrderId = ?, errorMessage = ?, updatedAt = ?
      WHERE id = ?
    `,
    status,
    processedAt,
    paymentOrderId,
    errorMessage,
    processedAt,
    eventId
  );
};

const isDuplicatePaymentEventError = (error: unknown): boolean => {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return message.includes("duplicate") && message.includes("paymentevent_razorpayeventid_key");
};

const REFERRAL_DISCOUNT_SLABS = [
  { min: 249, max: 500, friendDiscount: 10 },
  { min: 501, max: 1000, friendDiscount: 40 },
  { min: 1001, max: 2000, friendDiscount: 80 },
  { min: 2001, max: 3000, friendDiscount: 160 },
  { min: 3001, max: 4000, friendDiscount: 240 },
  { min: 4001, max: 5000, friendDiscount: 320 },
  { min: 5001, max: 6000, friendDiscount: 400 },
  { min: 6001, max: 8000, friendDiscount: 480 },
  { min: 8001, max: 10000, friendDiscount: 640 },
  { min: 10001, max: Number.POSITIVE_INFINITY, friendDiscount: 800 },
];

const pickFriendDiscountByAmount = (amount: number): number => {
  const safeAmount = normalizeAmount(amount);
  if (safeAmount <= 0) return 0;
  const matched = REFERRAL_DISCOUNT_SLABS.find((slab) => safeAmount >= slab.min && safeAmount <= slab.max);
  return normalizeAmount(matched?.friendDiscount ?? 0);
};

const getCheckoutSelection = async (productId: string, packageId?: string | null) => {
  const productRows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, title, listPrice, salePrice, isActive
      FROM Product
      WHERE id = ?
      LIMIT 1
    `,
    productId
  )) as CheckoutProductRow[];
  const product = productRows[0];
  if (!product) return { error: "Product not found.", product: null, selectedPackage: null };
  if (!Boolean(Number(product.isActive) === 1 || product.isActive === true)) {
    return { error: "This product is currently inactive.", product: null, selectedPackage: null };
  }

  let selectedPackage: CheckoutPackageRow | null = null;
  const normalizedPackageId = String(packageId || "").trim();
  if (normalizedPackageId) {
    const packageRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, productId, title, price, isActive
        FROM ProductPackage
        WHERE id = ?
          AND productId = ?
        LIMIT 1
      `,
      normalizedPackageId,
      productId
    ).catch((error: unknown) => {
      const message = String((error as { message?: string })?.message || "").toLowerCase();
      const missingTable =
        (message.includes("1146") || message.includes("p2010")) && message.includes("productpackage");
      if (missingTable) return [];
      throw error;
    })) as CheckoutPackageRow[];
    selectedPackage = packageRows[0] || null;
    if (!selectedPackage) return { error: "Selected package not found for this product.", product: null, selectedPackage: null };
    if (!Boolean(Number(selectedPackage.isActive) === 1 || selectedPackage.isActive === true)) {
      return { error: "Selected package is currently inactive.", product: null, selectedPackage: null };
    }
  }

  return { error: "", product, selectedPackage };
};

const hasAnyProductPurchase = async (userId: string): Promise<boolean> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id
      FROM ProductPurchase
      WHERE userId = ?
      LIMIT 1
    `,
    userId
  )) as Array<{ id: string }>;
  return rows.length > 0;
};

const resolveReferrerForFriendOffer = async (buyerUserId: string, referralCode: string) => {
  const normalizedReferralCode = String(referralCode || "").trim().toUpperCase();
  if (!normalizedReferralCode) {
    return { referrerId: null as string | null, appliedReferralCode: null as string | null };
  }

  const referredByUserId = await getReferrerIdByCode(normalizedReferralCode);
  if (!referredByUserId) return { error: "Invalid student ID / referral code.", referrerId: null, appliedReferralCode: null };
  if (referredByUserId === buyerUserId) return { error: "You cannot use your own student ID.", referrerId: null, appliedReferralCode: null };

  const friendHasPurchase = await hasAnyProductPurchase(referredByUserId);
  if (!friendHasPurchase) {
    return {
      error: "Friend offer is valid only for student IDs that have completed at least one paid purchase.",
      referrerId: null,
      appliedReferralCode: null,
    };
  }

  return { error: "", referrerId: referredByUserId, appliedReferralCode: normalizedReferralCode };
};

const buildOfferPricing = (
  product: CheckoutProductRow,
  includeDefaultOffer: boolean,
  applyFriendOffer: boolean,
  selectedPackage?: CheckoutPackageRow | null
) => {
  const listPrice = normalizeAmount(selectedPackage?.price ?? product.listPrice);
  const salePrice = normalizeAmount(selectedPackage?.price ?? product.salePrice);
  const effectiveSalePrice = normalizeAmount(Math.min(salePrice > 0 ? salePrice : listPrice, listPrice));
  if (listPrice <= 0 || effectiveSalePrice <= 0) return { error: "Product pricing is invalid.", payableAmount: 0 };

  const currentPrice = includeDefaultOffer ? effectiveSalePrice : listPrice;
  const friendDiscountConfigured = pickFriendDiscountByAmount(currentPrice);
  const friendDiscountApplied = applyFriendOffer ? normalizeAmount(Math.min(currentPrice, friendDiscountConfigured)) : 0;
  return {
    error: "",
    payableAmount: normalizeAmount(Math.max(0, currentPrice - friendDiscountApplied)),
  };
};

const resolveWalletAdjustment = (payableAmount: number, walletBalance: number, walletUseAmount?: number) => {
  const payableBeforeWallet = normalizeAmount(Math.max(0, payableAmount));
  const walletAvailable = normalizeAmount(Math.max(0, walletBalance));
  const walletRequested = normalizeAmount(Math.max(0, walletUseAmount ?? 0));
  const walletUsed = normalizeAmount(Math.min(payableBeforeWallet, walletAvailable, walletRequested));
  return {
    walletUsed,
    payableAfterWallet: normalizeAmount(Math.max(0, payableBeforeWallet - walletUsed)),
  };
};

export const loadVerifiedPaymentOrderForPurchase = async ({
  userId,
  productId,
  paymentOrderId,
  expectedAmountPaise,
  expectedReferralCodeSnapshot,
  expectedWalletAmountPaise,
}: {
  userId: string;
  productId: string;
  paymentOrderId: string;
  expectedAmountPaise: number;
  expectedReferralCodeSnapshot?: string | null;
  expectedWalletAmountPaise?: number;
}): Promise<{ ok: true; order: PaymentOrderRow } | { ok: false; message: string }> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, userId, productId, amountPaise, currency, razorpayOrderId, razorpayPaymentId, status,
             referralCodeSnapshot, walletAmountPaiseSnapshot
      FROM PaymentOrder
      WHERE id = ?
      LIMIT 1
    `,
    paymentOrderId
  )) as PaymentOrderRow[];
  const order = rows[0];
  if (!order) return { ok: false, message: "Verified payment order is required." };
  if (order.userId !== userId) return { ok: false, message: "Payment order does not belong to this student." };
  if (order.productId !== productId) return { ok: false, message: "Payment order does not match this product." };
  if (String(order.status || "").toUpperCase() !== "VERIFIED") return { ok: false, message: "Payment order is not verified or was already used." };
  if (String(order.currency || "INR").toUpperCase() !== "INR") return { ok: false, message: "Payment currency mismatch." };
  if (Number(order.amountPaise || 0) !== expectedAmountPaise) return { ok: false, message: "Payment amount mismatch." };
  const expectedReferralCode = String(expectedReferralCodeSnapshot || "").trim().toUpperCase();
  const actualReferralCode = String(order.referralCodeSnapshot || "").trim().toUpperCase();
  if (actualReferralCode !== expectedReferralCode) return { ok: false, message: "Payment referral snapshot mismatch." };
  if (Number(order.walletAmountPaiseSnapshot || 0) !== Number(expectedWalletAmountPaise || 0)) {
    return { ok: false, message: "Payment wallet snapshot mismatch." };
  }
  if (!String(order.razorpayPaymentId || "").trim()) return { ok: false, message: "Verified payment id is missing." };
  return { ok: true, order };
};

paymentWebhookRouter.post("/", async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
    if (!rawBody) {
      res.status(400).json({ message: "Webhook raw body is required." });
      return;
    }

    const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
    if (!webhookSecret) {
      res.status(500).json({ message: "Razorpay webhook verification is not configured." });
      return;
    }

    const signature = toHeaderValue(req.headers.razorpay_signature);
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      res.status(400).json({ message: "Invalid Razorpay webhook signature." });
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
    } catch {
      res.status(400).json({ message: "Invalid Razorpay webhook payload." });
      return;
    }

    const context = extractWebhookContext(payload, rawBody);
    const existingEvents = (await prisma.$queryRawUnsafe(
      `
        SELECT id, status
        FROM PaymentEvent
        WHERE razorpayEventId = ?
        LIMIT 1
      `,
      context.razorpayEventId
    )) as PaymentEventRow[];

    if (existingEvents.length) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const now = new Date();
    const paymentEventId = randomUUID();
    try {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO PaymentEvent
          (
            id,
            razorpayEventId,
            eventType,
            razorpayOrderId,
            razorpayPaymentId,
            paymentOrderId,
            status,
            payloadJson,
            signature,
            receivedAt,
            processedAt,
            errorMessage,
            createdAt,
            updatedAt
          )
          VALUES (?, ?, ?, ?, ?, NULL, 'RECEIVED', ?, ?, ?, NULL, NULL, ?, ?)
        `,
        paymentEventId,
        context.razorpayEventId,
        context.eventType,
        context.razorpayOrderId,
        context.razorpayPaymentId,
        JSON.stringify(payload),
        signature || null,
        now,
        now,
        now
      );
    } catch (error) {
      if (isDuplicatePaymentEventError(error)) {
        res.json({ received: true, duplicate: true });
        return;
      }
      throw error;
    }

    const supportedEvents = new Set(["payment.captured", "order.paid", "payment.failed"]);
    if (!supportedEvents.has(context.eventType)) {
      await updatePaymentEvent(paymentEventId, "IGNORED", new Date(), null, "Unsupported webhook event type.");
      res.json({ received: true, processed: false });
      return;
    }

    if (!context.razorpayOrderId) {
      await updatePaymentEvent(paymentEventId, "FAILED", new Date(), null, "Webhook payload is missing Razorpay order id.");
      res.status(400).json({ received: true, message: "Webhook payload is missing Razorpay order id." });
      return;
    }

    const orderRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, status, razorpayPaymentId
        FROM PaymentOrder
        WHERE razorpayOrderId = ?
        LIMIT 1
      `,
      context.razorpayOrderId
    )) as WebhookPaymentOrderRow[];
    const paymentOrder = orderRows[0] || null;

    if (!paymentOrder) {
      await updatePaymentEvent(paymentEventId, "IGNORED", new Date(), null, "Matching PaymentOrder was not found.");
      res.json({ received: true, processed: false });
      return;
    }

    const currentStatus = String(paymentOrder.status || "").toUpperCase();
    const processedAt = new Date();

    if (context.eventType === "payment.captured" || context.eventType === "order.paid") {
      if (currentStatus === "PENDING") {
        await prisma.$executeRawUnsafe(
          `
            UPDATE PaymentOrder
            SET status = 'VERIFIED',
                razorpayPaymentId = COALESCE(?, razorpayPaymentId),
                verifiedAt = COALESCE(verifiedAt, ?),
                lastWebhookEventAt = ?,
                updatedAt = ?
            WHERE id = ?
              AND status = 'PENDING'
          `,
          context.razorpayPaymentId,
          processedAt,
          processedAt,
          processedAt,
          paymentOrder.id
        );
        await updatePaymentEvent(paymentEventId, "PROCESSED", processedAt, paymentOrder.id);
        res.json({ received: true, processed: true });
        return;
      }

      if (currentStatus === "VERIFIED" || currentStatus === "USED") {
        await prisma.$executeRawUnsafe(
          `
            UPDATE PaymentOrder
            SET lastWebhookEventAt = ?, updatedAt = ?
            WHERE id = ?
          `,
          processedAt,
          processedAt,
          paymentOrder.id
        );
        await updatePaymentEvent(paymentEventId, "IGNORED", processedAt, paymentOrder.id, "PaymentOrder already verified or used.");
        res.json({ received: true, processed: false });
        return;
      }

      await updatePaymentEvent(paymentEventId, "IGNORED", processedAt, paymentOrder.id, `PaymentOrder status is ${currentStatus}.`);
      res.json({ received: true, processed: false });
      return;
    }

    if (context.eventType === "payment.failed") {
      if (currentStatus === "PENDING") {
        await prisma.$executeRawUnsafe(
          `
            UPDATE PaymentOrder
            SET status = 'FAILED',
                failedAt = COALESCE(failedAt, ?),
                lastWebhookEventAt = ?,
                updatedAt = ?
            WHERE id = ?
              AND status = 'PENDING'
          `,
          processedAt,
          processedAt,
          processedAt,
          paymentOrder.id
        );
        await updatePaymentEvent(paymentEventId, "PROCESSED", processedAt, paymentOrder.id);
        res.json({ received: true, processed: true });
        return;
      }

      await prisma.$executeRawUnsafe(
        `
          UPDATE PaymentOrder
          SET lastWebhookEventAt = ?, updatedAt = ?
          WHERE id = ?
        `,
        processedAt,
        processedAt,
        paymentOrder.id
      );
      await updatePaymentEvent(paymentEventId, "IGNORED", processedAt, paymentOrder.id, "PaymentOrder is not pending; failure did not downgrade status.");
      res.json({ received: true, processed: false });
      return;
    }

    await updatePaymentEvent(paymentEventId, "IGNORED", processedAt, paymentOrder.id, "No webhook action was taken.");
    res.json({ received: true, processed: false });
  } catch (error) {
    next(error);
  }
});

paymentRouter.post("/order", requireAuth, async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body || {});
    const userId = req.user!.userId;
    const { product, selectedPackage, error } = await getCheckoutSelection(input.productId, input.packageId);
    if (error || !product) {
      res.status(400).json({ message: error || "Unable to load product." });
      return;
    }

    const includeDefaultOffer = input.includeDefaultOffer !== false;
    const friendOffer = await resolveReferrerForFriendOffer(userId, input.referralCode || "");
    if (friendOffer.error) {
      res.status(400).json({ message: friendOffer.error });
      return;
    }

    const pricing = buildOfferPricing(product, includeDefaultOffer, Boolean(friendOffer.appliedReferralCode), selectedPackage);
    if (pricing.error) {
      res.status(400).json({ message: pricing.error });
      return;
    }

    const walletBalance = await getWalletBalance(userId);
    const wallet = resolveWalletAdjustment(pricing.payableAmount, walletBalance, input.walletUseAmount);
    const amountInPaise = Math.round(wallet.payableAfterWallet * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      res.status(400).json({ message: "Payment order is not required for this purchase amount." });
      return;
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        productId: input.productId,
        userId,
      },
    });

    const paymentOrderId = randomUUID();
    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO PaymentOrder
        (id, userId, productId, amountPaise, currency, razorpayOrderId, razorpayPaymentId, status, referralCodeSnapshot, walletAmountPaiseSnapshot, createdAt, updatedAt, verifiedAt, usedAt)
        VALUES (?, ?, ?, ?, ?, ?, NULL, 'PENDING', ?, ?, ?, ?, NULL, NULL)
      `,
      paymentOrderId,
      userId,
      input.productId,
      Number(order.amount || amountInPaise),
      String(order.currency || "INR"),
      String(order.id),
      friendOffer.appliedReferralCode || null,
      Math.round(wallet.walletUsed * 100),
      now,
      now
    );

    res.status(201).json({
      paymentOrderId,
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
    const userId = req.user!.userId;
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

    const orderRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, userId, productId, amountPaise, currency, razorpayOrderId, razorpayPaymentId, status,
               referralCodeSnapshot, walletAmountPaiseSnapshot
        FROM PaymentOrder
        WHERE razorpayOrderId = ?
          AND userId = ?
        LIMIT 1
      `,
      input.razorpay_order_id,
      userId
    )) as PaymentOrderRow[];
    const paymentOrder = orderRows[0];
    if (!paymentOrder) {
      res.status(400).json({ success: false, message: "Payment order was not created for this student." });
      return;
    }

    const status = String(paymentOrder.status || "").toUpperCase();
    if (status === "VERIFIED" || status === "USED") {
      if (String(paymentOrder.razorpayPaymentId || "") !== input.razorpay_payment_id) {
        res.status(400).json({ success: false, message: "Payment id does not match this order." });
        return;
      }
      res.json({
        success: true,
        paymentOrderId: paymentOrder.id,
        paymentEvidence: {
          paymentOrderId: paymentOrder.id,
        },
      });
      return;
    }

    if (status !== "PENDING") {
      res.status(400).json({ success: false, message: "Payment order is not pending." });
      return;
    }

    const now = new Date();
    await prisma.$executeRawUnsafe(
      `
        UPDATE PaymentOrder
        SET status = 'VERIFIED', razorpayPaymentId = ?, verifiedAt = ?, updatedAt = ?
        WHERE id = ?
          AND status = 'PENDING'
      `,
      input.razorpay_payment_id,
      now,
      now,
      paymentOrder.id
    );

    res.json({
      success: true,
      paymentOrderId: paymentOrder.id,
      paymentEvidence: {
        paymentOrderId: paymentOrder.id,
      },
    });
  } catch (error) {
    next(error);
  }
});
