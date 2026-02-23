declare module "razorpay" {
  type RazorpayOrderCreateRequestBody = {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  };

  type RazorpayOrder = {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string | null;
    status: string;
    attempts: number;
    created_at: number;
  };

  class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: {
      create(params: RazorpayOrderCreateRequestBody): Promise<RazorpayOrder>;
    };
  }

  export default Razorpay;
}
