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
  question: string;
  selectedOption: LessonAiMcqOptionKey | null;
  selectedOptionText: string | null;
  correctAnswer: LessonAiMcqOptionKey;
  correctOptionText: string;
  isCorrect: boolean;
  explanation: string;
  feedback: string;
};

export type LessonAiMcqEvaluation = {
  score: number;
  total: number;
  items: LessonAiMcqEvaluationItem[];
  weakAreaSummary: string;
};

const normalizeText = (value: unknown) => String(value || "").trim();

const isOptionKey = (value: unknown): value is LessonAiMcqOptionKey =>
  lessonAiMcqOptionKeys.includes(String(value || "").trim().toUpperCase() as LessonAiMcqOptionKey);

const getOptionText = (question: LessonAiMcqQuestion, optionKey: LessonAiMcqOptionKey | null) => {
  if (!optionKey) return null;
  const option = question.options.find((item) => item.key === optionKey);
  return normalizeText(option?.text);
};

const buildWrongAnswerFeedback = (question: LessonAiMcqQuestion, selectedOption: LessonAiMcqOptionKey | null) => {
  const selectedText = getOptionText(question, selectedOption);
  const correctText = getOptionText(question, question.correctAnswer) || "the lesson-supported answer";
  const groundedExplanation = normalizeText(question.explanation);

  if (!selectedText) {
    if (groundedExplanation) {
      return `You did not choose the lesson-supported option. ${question.correctAnswer} is correct because ${groundedExplanation}`;
    }
    return `You did not choose the lesson-supported option. ${question.correctAnswer} is correct because it matches the current lesson context better.`;
  }

  if (groundedExplanation) {
    return `${selectedOption} is not correct because "${selectedText}" is not the lesson-supported point here. ${question.correctAnswer} is right because "${correctText}" matches the lesson, and ${groundedExplanation}`;
  }

  return `${selectedOption} is not correct because "${selectedText}" is not clearly supported by this lesson for this question. ${question.correctAnswer} is right because "${correctText}" matches the current lesson context better.`;
};

const buildWeakAreaSummary = (items: LessonAiMcqEvaluationItem[]) => {
  const wrongItems = items.filter((item) => !item.isCorrect);
  if (!wrongItems.length) {
    return "Weak Area: none identified in these 3 lesson MCQs. Keep revising the same lesson ideas to retain them.";
  }

  const revisionTargets = Array.from(
    new Set(
      wrongItems
        .map((item) => item.correctOptionText || item.explanation)
        .map((text) => normalizeText(text))
        .filter(Boolean)
    )
  ).slice(0, 2);

  if (!revisionTargets.length) {
    return "Weak Area: revise the exact lesson point behind the wrong MCQs, because that concept was not secure yet.";
  }

  return `Weak Area: revise ${revisionTargets.join(" and ")}. These are the lesson points that need one more quick revision.`;
};

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
    const correctOptionText = getOptionText(question, correctAnswer) || "the lesson-supported answer";
    return {
      questionId: question.id,
      question: question.question,
      selectedOption,
      selectedOptionText: getOptionText(question, selectedOption),
      correctAnswer,
      correctOptionText,
      isCorrect: selectedOption === correctAnswer,
      explanation: question.explanation,
      feedback:
        selectedOption === correctAnswer
          ? `Correct. ${correctAnswer} matches the lesson because "${correctOptionText}" is directly supported by the current lesson context.`
          : buildWrongAnswerFeedback(question, selectedOption),
    };
  });

  return {
    score: items.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0),
    total: items.length,
    items,
    weakAreaSummary: buildWeakAreaSummary(items),
  };
};
