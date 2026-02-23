import { z } from "zod";

const parseEmptyAsUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalStreamChoiceSchema = z.preprocess(
  (value) => {
    if (value === "") return undefined;
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value;
  },
  z.enum(["SCIENCE_MATH", "SOCIAL_STUDIES"]).nullable().optional()
);

const optionalLanguageModeSchema = z.preprocess(
  (value) => {
    if (value === "") return undefined;
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value;
  },
  z.enum(["PUNJABI", "ENGLISH", "HINDI"]).nullable().optional()
);

export const adminCreateMockTestSchema = z.object({
  title: z.string().trim().min(2).max(180),
  examType: z.enum(["PSTET_1", "PSTET_2"]),
  subject: z.enum([
    "PUNJABI",
    "ENGLISH",
    "CHILD_PEDAGOGY",
    "MATHS_EVS",
    "SCIENCE_MATH",
    "SOCIAL_STUDIES",
  ]),
  streamChoice: optionalStreamChoiceSchema,
  languageMode: optionalLanguageModeSchema,
  accessCode: z.enum(["DEMO", "MOCK", "LESSON"]).optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateMockTestSchema = adminCreateMockTestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No mock test updates provided");

export const adminCreateQuestionSchema = z.object({
  questionText: z.string().trim().min(2),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  isActive: z.boolean().optional(),
});

export const adminUpdateQuestionSchema = adminCreateQuestionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No question updates provided");

export const adminBulkImportQuestionRowSchema = z.object({
  questionText: z.string().trim().min(2),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  isActive: z.boolean().optional(),
});

export const adminBulkImportQuestionsSchema = z.object({
  rows: z.array(adminBulkImportQuestionRowSchema).min(1).max(5000),
  replaceExisting: z.boolean().optional(),
});

export const adminAttemptsFilterSchema = z.object({
  examType: z.preprocess(parseEmptyAsUndefined, z.enum(["PSTET_1", "PSTET_2"]).optional()),
  subject: z.preprocess(
    parseEmptyAsUndefined,
    z
      .enum([
        "PUNJABI",
        "ENGLISH",
        "CHILD_PEDAGOGY",
        "MATHS_EVS",
        "SCIENCE_MATH",
        "SOCIAL_STUDIES",
      ])
      .optional()
  ),
  studentId: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(2).max(64).optional()),
  dateFrom: z.preprocess(parseEmptyAsUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(parseEmptyAsUndefined, z.coerce.date().optional()),
  minScore: z.preprocess(parseEmptyAsUndefined, z.coerce.number().min(0).max(100).optional()),
})
  .refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    "dateFrom cannot be after dateTo"
  );

export const studentMockTestsQuerySchema = z.object({
  examType: z.enum(["PSTET_1", "PSTET_2"]),
  subject: z.enum([
    "PUNJABI",
    "ENGLISH",
    "CHILD_PEDAGOGY",
    "MATHS_EVS",
    "SCIENCE_MATH",
    "SOCIAL_STUDIES",
  ]),
  streamChoice: optionalStreamChoiceSchema,
  languageMode: optionalLanguageModeSchema,
});

export const studentStartAttemptSchema = z.object({
  mockTestId: z.string().cuid(),
});

export const studentSaveAnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOption: z.enum(["A", "B", "C", "D"]),
});
