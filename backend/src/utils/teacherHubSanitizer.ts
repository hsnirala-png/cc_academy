import { AppError } from "./appError";

const FORBIDDEN_PATTERNS = [
  /\b(?:https?:\/\/|www\.)/i,
  /\b(?:wa\.me|whatsapp|telegram|t\.me|meet\.google|zoom\.us|teams\.microsoft)\b/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s-]{7,}\d)/,
];

export const sanitizeTeacherHubText = (value: unknown, fieldLabel = "content"): string => {
  const text = String(value || "").trim();
  if (!text) return "";
  const blocked = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(text));
  if (blocked) {
    throw new AppError(
      `${fieldLabel} contains blocked contact details or outside links.`,
      400,
      "TEACHER_HUB_BLOCKED_CONTACT"
    );
  }
  return text;
};

export const sanitizeTeacherHubOptionalText = (value: unknown, fieldLabel = "content"): string | null => {
  const text = String(value || "").trim();
  if (!text) return null;
  return sanitizeTeacherHubText(text, fieldLabel);
};
