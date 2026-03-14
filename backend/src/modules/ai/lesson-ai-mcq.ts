export const lessonAiMcqOptionKeys = ["A", "B", "C", "D"] as const;

export type LessonAiMcqOptionKey = (typeof lessonAiMcqOptionKeys)[number];

export type LessonAiMcqOption = {
  key: LessonAiMcqOptionKey;
  text: string;
};

export type LessonAiMcqQuestion = {
  id: string;
  question: string;
  options: LessonAiMcqOption[];
  correctAnswer: LessonAiMcqOptionKey;
  explanation: string;
};

export type LessonAiMcqSet = {
  title: string;
  questions: LessonAiMcqQuestion[];
};

export type LessonAiMcqEvaluationItem = {
  questionId: string;
  selectedOption: LessonAiMcqOptionKey | null;
  correctAnswer: LessonAiMcqOptionKey;
  isCorrect: boolean;
  explanation: string;
};

export type LessonAiMcqEvaluation = {
  score: number;
  total: number;
  items: LessonAiMcqEvaluationItem[];
};

const normalizeText = (value: unknown) => String(value || "").trim();

const isOptionKey = (value: unknown): value is LessonAiMcqOptionKey =>
  lessonAiMcqOptionKeys.includes(String(value || "").trim().toUpperCase() as LessonAiMcqOptionKey);

export const canAdvanceLessonAiMcq = (selectedOption: unknown) => isOptionKey(selectedOption);

export const isLessonAiMcqSet = (value: unknown): value is LessonAiMcqSet => {
  if (!value || typeof value !== "object") return false;
  const title = normalizeText((value as { title?: unknown }).title);
  const questions = (value as { questions?: unknown }).questions;
  if (!title || !Array.isArray(questions) || questions.length !== 3) return false;

  return questions.every((question, index) => {
    if (!question || typeof question !== "object") return false;
    const id = normalizeText((question as { id?: unknown }).id);
    const prompt = normalizeText((question as { question?: unknown }).question);
    const correctAnswer = normalizeText((question as { correctAnswer?: unknown }).correctAnswer).toUpperCase();
    const explanation = normalizeText((question as { explanation?: unknown }).explanation);
    const options = (question as { options?: unknown }).options;
    if (!id || !prompt || !explanation || !isOptionKey(correctAnswer) || !Array.isArray(options)) return false;
    if (options.length !== 4) return false;

    const expectedKeys = new Set(lessonAiMcqOptionKeys);
    const seenKeys = new Set<string>();
    for (const option of options) {
      if (!option || typeof option !== "object") return false;
      const key = normalizeText((option as { key?: unknown }).key).toUpperCase();
      const text = normalizeText((option as { text?: unknown }).text);
      if (!isOptionKey(key) || !text) return false;
      seenKeys.add(key);
    }

    return (
      seenKeys.size === 4 &&
      [...expectedKeys].every((key) => seenKeys.has(key)) &&
      options.some((option) => normalizeText(option.text)) &&
      index >= 0
    );
  });
};

export const evaluateLessonAiMcqAnswers = (
  mcqSet: LessonAiMcqSet,
  answers: Record<string, LessonAiMcqOptionKey | null | undefined>
): LessonAiMcqEvaluation => {
  const items = mcqSet.questions.map((question) => {
    const selected = normalizeText(answers[question.id]).toUpperCase();
    const selectedOption = isOptionKey(selected) ? selected : null;
    const correctAnswer = question.correctAnswer;
    return {
      questionId: question.id,
      selectedOption,
      correctAnswer,
      isCorrect: selectedOption === correctAnswer,
      explanation: question.explanation,
    };
  });

  return {
    score: items.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0),
    total: items.length,
    items,
  };
};
