import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdvanceLessonAiMcq,
  evaluateLessonAiMcqAnswers,
  isLessonAiMcqSet,
  LessonAiMcqSet,
} from "../modules/ai/lesson-ai-mcq";

const sampleMcqSet: LessonAiMcqSet = {
  title: "3 Lesson MCQs",
  questions: [
    {
      id: "q1",
      question: "According to this lesson, which point is correct?",
      options: [
        { key: "A", text: "Observation supports learning." },
        { key: "B", text: "Practice is unrelated to retention." },
        { key: "C", text: "Teachers should avoid explanation." },
        { key: "D", text: "Confidence never changes learning." },
      ],
      correctAnswer: "A",
      explanation: "The lesson directly states that observation supports learning.",
    },
    {
      id: "q2",
      question: "Which idea is emphasized in this lesson?",
      options: [
        { key: "A", text: "Guided explanation strengthens understanding." },
        { key: "B", text: "Retention does not need practice." },
        { key: "C", text: "Learning happens without support." },
        { key: "D", text: "Confidence is unrelated to teaching." },
      ],
      correctAnswer: "A",
      explanation: "The lesson explicitly mentions guided explanation and understanding.",
    },
    {
      id: "q3",
      question: "Which idea should a student revise from this lesson?",
      options: [
        { key: "A", text: "Repeated practice improves retention." },
        { key: "B", text: "Observation weakens learning." },
        { key: "C", text: "Teacher support should be removed." },
        { key: "D", text: "Confidence blocks revision." },
      ],
      correctAnswer: "A",
      explanation: "The lesson directly supports repeated practice improving retention.",
    },
  ],
};

test("structured MCQ payload is valid for exactly 3 questions", () => {
  assert.equal(isLessonAiMcqSet(sampleMcqSet), true);
});

test("Next button logic requires an attempted answer first", () => {
  assert.equal(canAdvanceLessonAiMcq(null), false);
  assert.equal(canAdvanceLessonAiMcq(""), false);
  assert.equal(canAdvanceLessonAiMcq("A"), true);
});

test("Done flow evaluation computes score and correctness correctly", () => {
  const result = evaluateLessonAiMcqAnswers(sampleMcqSet, {
    q1: "A",
    q2: "B",
    q3: "A",
  });

  assert.equal(result.score, 2);
  assert.equal(result.total, 3);
  assert.equal(result.items[0]?.isCorrect, true);
  assert.equal(result.items[1]?.isCorrect, false);
  assert.equal(result.items[1]?.correctAnswer, "A");
  assert.match(result.items[1]?.feedback || "", /B is not correct/i);
  assert.match(result.items[1]?.explanation || "", /guided explanation/i);
  assert.match(result.weakAreaSummary, /guided explanation strengthens understanding/i);
});

test("wrong-answer explanation gives teacher-style grounded feedback", () => {
  const result = evaluateLessonAiMcqAnswers(sampleMcqSet, {
    q1: "B",
    q2: "A",
    q3: "D",
  });

  assert.equal(result.items[0]?.isCorrect, false);
  assert.match(result.items[0]?.feedback || "", /not the lesson-supported point/i);
  assert.match(result.items[0]?.feedback || "", /A is right/i);
  assert.match(result.items[2]?.feedback || "", /Repeated practice improves retention/i);
});

test("weak-area summary is generated from missed lesson concepts", () => {
  const result = evaluateLessonAiMcqAnswers(sampleMcqSet, {
    q1: "B",
    q2: "B",
    q3: "D",
  });

  assert.match(result.weakAreaSummary, /Weak Area:/);
  assert.match(result.weakAreaSummary, /Observation supports learning/i);
});

test("MCQ feedback stays safe when explanation context is weak", () => {
  const weakContextSet = {
    ...sampleMcqSet,
    questions: [
      {
        ...sampleMcqSet.questions[0],
        explanation: "",
      },
      ...sampleMcqSet.questions.slice(1),
    ],
  } as LessonAiMcqSet;

  const result = evaluateLessonAiMcqAnswers(weakContextSet, {
    q1: "B",
    q2: "A",
    q3: "A",
  });

  assert.equal(result.items[0]?.isCorrect, false);
  assert.match(result.items[0]?.feedback || "", /matches the current lesson context better/i);
  assert.match(result.weakAreaSummary, /Observation supports learning/i);
});
