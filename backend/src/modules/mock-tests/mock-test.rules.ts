import { ExamType, MockSubject, StreamChoice } from "@prisma/client";
import { AppError } from "../../utils/appError";

type LanguageMode = "PUNJABI" | "ENGLISH" | "HINDI";

const SUBJECTS_30 = new Set<MockSubject>([
  MockSubject.PUNJABI,
  MockSubject.ENGLISH,
  MockSubject.CHILD_PEDAGOGY,
]);

const SUBJECTS_60 = new Set<MockSubject>([
  MockSubject.MATHS_EVS,
  MockSubject.SCIENCE_MATH,
  MockSubject.SOCIAL_STUDIES,
]);

const LANGUAGE_SUBJECTS = new Set<MockSubject>([MockSubject.PUNJABI, MockSubject.ENGLISH]);

const NON_LANGUAGE_SUBJECTS = new Set<MockSubject>([
  MockSubject.CHILD_PEDAGOGY,
  MockSubject.MATHS_EVS,
  MockSubject.SCIENCE_MATH,
  MockSubject.SOCIAL_STUDIES,
]);

export const getRequiredQuestionCount = (subject: MockSubject): number => {
  if (SUBJECTS_60.has(subject)) return 60;
  return 30;
};

export const validateMockTestRule = (
  examType: ExamType,
  subject: MockSubject,
  streamChoice?: StreamChoice | null,
  languageMode?: LanguageMode | null,
  options?: {
    allowStreamOnCommonSubjects?: boolean;
    allowMissingLanguageMode?: boolean;
  }
): void => {
  if (examType === ExamType.PSTET_1) {
    const validSubjects = new Set<MockSubject>([
      MockSubject.PUNJABI,
      MockSubject.ENGLISH,
      MockSubject.CHILD_PEDAGOGY,
      MockSubject.MATHS_EVS,
    ]);

    if (!validSubjects.has(subject)) {
      throw new AppError("Invalid subject for PSTET-1", 400);
    }

    if (streamChoice) {
      throw new AppError("Stream choice is not allowed for PSTET-1", 400);
    }

    if (LANGUAGE_SUBJECTS.has(subject) && languageMode) {
      throw new AppError("Language mode is not allowed for Punjabi or English subjects", 400);
    }

    if (
      NON_LANGUAGE_SUBJECTS.has(subject) &&
      !languageMode &&
      !options?.allowMissingLanguageMode
    ) {
      throw new AppError("Language mode is required for non-language subjects", 400);
    }

    return;
  }

  if (examType === ExamType.PSTET_2) {
    const validSubjects = new Set<MockSubject>([
      MockSubject.PUNJABI,
      MockSubject.ENGLISH,
      MockSubject.CHILD_PEDAGOGY,
      MockSubject.SCIENCE_MATH,
      MockSubject.SOCIAL_STUDIES,
    ]);

    if (!validSubjects.has(subject)) {
      throw new AppError("Invalid subject for PSTET-2", 400);
    }

    if (subject === MockSubject.SCIENCE_MATH && streamChoice !== StreamChoice.SCIENCE_MATH) {
      throw new AppError("PSTET-2 Science/Math test requires SCIENCE_MATH stream", 400);
    }

    if (
      subject === MockSubject.SOCIAL_STUDIES &&
      streamChoice !== StreamChoice.SOCIAL_STUDIES
    ) {
      throw new AppError("PSTET-2 Social Studies test requires SOCIAL_STUDIES stream", 400);
    }

    if (
      SUBJECTS_30.has(subject) &&
      streamChoice &&
      !options?.allowStreamOnCommonSubjects
    ) {
      throw new AppError("Stream choice is not required for this PSTET-2 subject", 400);
    }

    if (LANGUAGE_SUBJECTS.has(subject) && languageMode) {
      throw new AppError("Language mode is not allowed for Punjabi or English subjects", 400);
    }

    if (
      NON_LANGUAGE_SUBJECTS.has(subject) &&
      !languageMode &&
      !options?.allowMissingLanguageMode
    ) {
      throw new AppError("Language mode is required for non-language subjects", 400);
    }

    return;
  }

  throw new AppError("Invalid exam type", 400);
};
