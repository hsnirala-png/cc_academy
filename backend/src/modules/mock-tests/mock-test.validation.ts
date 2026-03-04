import { z } from "zod";

const parseEmptyAsUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const normalizeMockSubjectValue = (value: unknown): unknown => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^\d+\s*[\.\-:)]\s*/, "")
    .replace(/\s+/g, " ");

  if (!raw) return value;
  if (raw === "MATHEMATICS") return "MATHS";
  if (raw === "CHILD PEDAGOGY" || raw === "CHILD DEVELOPMENT & PEDAGOGY") {
    return "CHILD_PEDAGOGY";
  }
  if (raw === "SCIENCE/MATH" || raw === "SCIENCE & MATH") return "SCIENCE_MATH";
  if (raw === "SOCIAL STUDIES" || raw === "SOCIAL STUDY") return "SOCIAL_STUDIES";
  if (raw === "MATHS/EVS" || raw === "MATHS EVS" || raw === "MATHEMATICS/EVS") {
    return "MATHS_EVS";
  }
  if (raw.includes("EVS") && !raw.includes("MATH")) return "EVS";
  if ((raw.includes("MATH") || raw.includes("MATHEMAT")) && raw.includes("EVS")) {
    return "MATHS_EVS";
  }
  if (raw.includes("MATH") || raw.includes("MATHEMAT")) return "MATHS";
  return raw.replace(/\s+/g, "_");
};

const mockSubjectSchema = z.preprocess(
  normalizeMockSubjectValue,
  z.enum([
    "PUNJABI",
    "ENGLISH",
    "CHILD_PEDAGOGY",
    "MATHS",
    "EVS",
    "MATHS_EVS",
    "SCIENCE_MATH",
    "SOCIAL_STUDIES",
  ])
);

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
  z.enum(["PUNJABI", "ENGLISH", "HINDI", "BILINGUAL"]).nullable().optional()
);

const optionalSectionLabelSchema = z.preprocess(
  parseEmptyAsUndefined,
  z.string().trim().max(120).optional()
);

export const adminCreateMockTestSchema = z.object({
  title: z.string().trim().min(2).max(180),
  examType: z.enum(["PSTET_1", "PSTET_2"]),
  subject: mockSubjectSchema,
  streamChoice: optionalStreamChoiceSchema,
  languageMode: optionalLanguageModeSchema,
  accessCode: z.enum(["DEMO", "MOCK", "LESSON"]).optional(),
  mockCategory: z.enum(["FREE", "PREMIUM"]).optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateMockTestSchema = adminCreateMockTestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No mock test updates provided");

export const adminCreateQuestionSchema = z.object({
  questionText: z.string().trim().min(2),
  questionTextAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(2).optional()),
  optionA: z.string().trim().min(1),
  optionAAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionB: z.string().trim().min(1),
  optionBAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionC: z.string().trim().min(1),
  optionCAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionD: z.string().trim().min(1),
  optionDAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  explanationAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  sectionLabel: optionalSectionLabelSchema,
  displayOrder: z.coerce.number().int().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateQuestionSchema = adminCreateQuestionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No question updates provided");

export const adminBulkImportQuestionRowSchema = z.object({
  questionText: z.string().trim().min(2),
  questionTextAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(2).optional()),
  optionA: z.string().trim().min(1),
  optionAAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionB: z.string().trim().min(1),
  optionBAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionC: z.string().trim().min(1),
  optionCAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  optionD: z.string().trim().min(1),
  optionDAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().min(1).optional()),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  explanationAlt: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  sectionLabel: optionalSectionLabelSchema,
  isActive: z.boolean().optional(),
});

export const adminBulkImportQuestionsSchema = z.object({
  rows: z.array(adminBulkImportQuestionRowSchema).min(1).max(5000),
  replaceExisting: z.boolean().optional(),
});

const mockTestSectionTypeSchema = z.enum([
  "COMPREHENSION",
  "GENERAL_MCQ",
  "GRAMMAR",
  "MATH_FORMULA",
  "SCIENCE_EQUATION",
  "CUSTOM",
]);

export const adminCreateMockTestSectionSchema = z.object({
  sectionLabel: z.string().trim().min(1).max(120),
  sectionType: mockTestSectionTypeSchema.default("GENERAL_MCQ"),
  transcriptText: z.preprocess(parseEmptyAsUndefined, z.string().trim().optional()),
  audioUrl: z.preprocess(parseEmptyAsUndefined, z.string().trim().max(512).optional()),
  questionLimit: z.coerce.number().int().min(1).max(5000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateMockTestSectionSchema = adminCreateMockTestSectionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No section updates provided");

export const adminAttemptsFilterSchema = z.object({
  examType: z.preprocess(parseEmptyAsUndefined, z.enum(["PSTET_1", "PSTET_2"]).optional()),
  subject: z.preprocess(
    (value) => {
      const normalized = parseEmptyAsUndefined(value);
      if (normalized === undefined) return undefined;
      return normalizeMockSubjectValue(normalized);
    },
    mockSubjectSchema.optional()
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
  subject: mockSubjectSchema,
  streamChoice: optionalStreamChoiceSchema,
  languageMode: optionalLanguageModeSchema,
});

export const studentStartAttemptSchema = z.object({
  mockTestId: z.string().cuid(),
  confirmChanceUse: z.coerce.boolean().optional(),
});

export const studentSaveAnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOption: z.enum(["A", "B", "C", "D"]),
});
