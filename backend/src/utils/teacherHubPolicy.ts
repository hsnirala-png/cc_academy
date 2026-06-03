export const TEACHER_HUB_PLATFORM_FEE_PERCENT = 12;

export const TEACHER_HUB_BILLING_CYCLE_DAYS: Record<string, number> = {
  DEMO: 1,
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
};

export const resolveTeacherHubCycleDays = (billingCycle: string): number =>
  TEACHER_HUB_BILLING_CYCLE_DAYS[String(billingCycle || "").trim().toUpperCase()] || 30;

export const calculateTeacherHubPlatformFee = (grossAmount: number): number =>
  Number(((Math.max(0, grossAmount) * TEACHER_HUB_PLATFORM_FEE_PERCENT) / 100).toFixed(2));
