export type AttemptScore = {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  remarkText: string;
};

type ThresholdRule = {
  min: number;
  max: number;
  remark: string;
};

const THRESHOLDS_30: ThresholdRule[] = [
  { min: 28, max: 30, remark: "Excellent" },
  { min: 25, max: 27, remark: "Very Good" },
  { min: 22, max: 24, remark: "Good" },
  { min: 15, max: 21, remark: "Need to work more" },
  { min: 10, max: 14, remark: "Poor" },
  { min: 0, max: 9, remark: "Very Poor" },
];

const THRESHOLDS_60: ThresholdRule[] = [
  { min: 56, max: 60, remark: "Excellent" },
  { min: 50, max: 55, remark: "Very Good" },
  { min: 44, max: 49, remark: "Good" },
  { min: 30, max: 43, remark: "Need to work more" },
  { min: 20, max: 29, remark: "Poor" },
  { min: 0, max: 19, remark: "Very Poor" },
];

const pickThresholds = (totalQuestions: number): ThresholdRule[] => {
  if (totalQuestions === 60) return THRESHOLDS_60;
  return THRESHOLDS_30;
};

export const getRemarkText = (correctCount: number, totalQuestions: number): string => {
  const normalizedCorrect = Math.max(0, Math.min(correctCount, totalQuestions));
  const thresholds = pickThresholds(totalQuestions);
  const matched = thresholds.find(
    (rule) => normalizedCorrect >= rule.min && normalizedCorrect <= rule.max
  );
  return matched?.remark ?? "Very Poor";
};

export const calculateAttemptScore = (
  correctCount: number,
  totalQuestions: number
): AttemptScore => {
  const boundedCorrect = Math.max(0, Math.min(correctCount, totalQuestions));
  const scorePercent = Number(((boundedCorrect / totalQuestions) * 100).toFixed(2));
  return {
    correctCount: boundedCorrect,
    totalQuestions,
    scorePercent,
    remarkText: getRemarkText(boundedCorrect, totalQuestions),
  };
};
