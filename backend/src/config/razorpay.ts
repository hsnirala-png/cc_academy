import { AppError } from "../utils/appError";

type RazorpayOrderRequest = {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayClient = {
  orders: {
    create(order: RazorpayOrderRequest): Promise<RazorpayOrderResponse>;
  };
};

let razorpayInstance: RazorpayClient | null = null;

export const razorpayKeyId = String(process.env.RAZORPAY_KEY_ID || "").trim();

const getRazorpayCtor = (): new (options: { key_id: string; key_secret: string }) => RazorpayClient => {
  try {
    // Lazy load so non-payment APIs continue working even if SDK is absent.
    const loaded = require("razorpay");
    return (loaded?.default || loaded) as new (options: {
      key_id: string;
      key_secret: string;
    }) => RazorpayClient;
  } catch {
    throw new AppError(
      "Payment gateway SDK is not installed on server. Please run npm install razorpay.",
      503,
      "PAYMENT_SDK_MISSING"
    );
  }
};

export const getRazorpayClient = (): RazorpayClient => {
  if (razorpayInstance) return razorpayInstance;

  const keyId = razorpayKeyId;
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new AppError("Payment gateway is not configured.", 500, "PAYMENT_CONFIG_MISSING");
  }

  const RazorpayCtor = getRazorpayCtor();
  razorpayInstance = new RazorpayCtor({
    key_id: keyId,
    key_secret: keySecret,
  });
  return razorpayInstance;
};

export default getRazorpayClient;
