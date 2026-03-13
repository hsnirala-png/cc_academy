import assert from "node:assert/strict";
import test from "node:test";
import { buildSystemPrompt, buildUserPrompt } from "../modules/ai/lesson-ai.provider";

test("lesson AI prompt stays tutoring-oriented and grounded for selected-text language requests", () => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    context: {
      lessonId: "lesson_1",
      lessonTitle: "Child Pedagogy",
      chapterTitle: "Chapter 1",
      courseTitle: "PSTET-2",
      transcriptText: "Learning starts from observation and guided practice in the classroom.",
      transcriptSegments: [],
    },
    userMessage: "Explain the selected lesson text like an exam teacher in Punjabi.",
    selectedText: "observation and guided practice",
    history: [{ role: "USER", content: "Summarize the lesson." }],
    requestType: "EXPLAIN_SELECTION_PUNJABI",
    responseLanguage: "Punjabi",
  });

  assert.match(systemPrompt, /patient teacher helping a student revise for an exam/i);
  assert.match(systemPrompt, /answer strictly and only from the supplied lesson context/i);
  assert.match(systemPrompt, /Concept, Simple explanation, Exam point/i);
  assert.match(systemPrompt, /selected lesson text is provided, explain that exact excerpt first/i);

  assert.match(userPrompt, /Requested Response Mode: EXPLAIN_SELECTION_PUNJABI/);
  assert.match(userPrompt, /Requested Answer Language: Punjabi/);
  assert.match(userPrompt, /Selected Text:\s*observation and guided practice/i);
  assert.match(userPrompt, /Lesson Transcript:\s*Learning starts from observation and guided practice/i);
});

test("lesson AI prompt treats manual doubts as grounded lesson explanation", () => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    context: {
      lessonId: "lesson_2",
      lessonTitle: "Development and Learning",
      chapterTitle: "Chapter 2",
      courseTitle: "PSTET-2",
      transcriptText: "Development prepares the base for learning, and learning strengthens development.",
      transcriptSegments: [],
    },
    userMessage: "How does the lesson connect development with learning?",
    history: [],
    requestType: "EXPLAIN_LESSON",
    responseLanguage: null,
  });

  assert.match(systemPrompt, /grounded paraphrase is allowed only when the concept is clearly supported/i);
  assert.match(systemPrompt, /same language as the student's question/i);
  assert.match(userPrompt, /Requested Response Mode: EXPLAIN_LESSON/);
  assert.match(userPrompt, /Request Guidance: Treat this as a lesson-grounded concept explanation/i);
  assert.match(userPrompt, /Current Student Request:\s*How does the lesson connect development with learning\?/i);
});
