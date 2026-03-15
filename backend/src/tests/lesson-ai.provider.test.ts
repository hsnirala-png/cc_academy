import assert from "node:assert/strict";
import test from "node:test";
import {
  createLessonAiProvider,
  buildRealtimeVoiceTutorInstructions,
  buildSystemPrompt,
  buildUserPrompt,
} from "../modules/ai/lesson-ai.provider";

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

test("lesson AI prompt includes grounded guidance for MCQs and key exam points", () => {
  const mcqPrompt = buildUserPrompt({
    context: {
      lessonId: "lesson_3",
      lessonTitle: "MCQ Lesson",
      chapterTitle: "Chapter 3",
      courseTitle: "PSTET-2",
      transcriptText: "Observation supports learning. Guided explanation strengthens understanding.",
      transcriptSegments: [],
    },
    userMessage: "Ask 3 MCQs from this lesson.",
    history: [],
    requestType: "ASK_3_MCQS",
    responseLanguage: null,
  });

  const keyPointsPrompt = buildUserPrompt({
    context: {
      lessonId: "lesson_4",
      lessonTitle: "Key Points Lesson",
      chapterTitle: "Chapter 4",
      courseTitle: "PSTET-1",
      transcriptText: "Development prepares the base for learning. Learning strengthens development.",
      transcriptSegments: [],
    },
    userMessage: "Give key exam points from this lesson.",
    history: [],
    requestType: "KEY_EXAM_POINTS",
    responseLanguage: null,
  });

  assert.match(mcqPrompt, /Requested Response Mode: ASK_3_MCQS/);
  assert.match(mcqPrompt, /Create exactly 3 lesson-grounded MCQs/i);
  assert.match(keyPointsPrompt, /Requested Response Mode: KEY_EXAM_POINTS/);
  assert.match(keyPointsPrompt, /Return short, high-yield revision notes/i);
});

test("lesson AI voice instructions stay grounded to the current lesson context", () => {
  const instructions = buildRealtimeVoiceTutorInstructions({
    context: {
      lessonId: "lesson_voice",
      lessonTitle: "Voice Lesson",
      chapterTitle: "Chapter 5",
      courseTitle: "PSTET-2",
      transcriptText: "Development supports learning when observation and guided practice are present.",
      transcriptSegments: [],
    },
    responseLanguage: "Punjabi",
  });

  assert.match(instructions, /live voice tutoring session/i);
  assert.match(instructions, /answer strictly and only from the supplied lesson context/i);
  assert.match(instructions, /Preferred spoken answer language for this session: Punjabi/i);
  assert.match(instructions, /Development supports learning when observation and guided practice are present/i);
});

test("mock lesson AI key exam points do not clip grounded bullet text", async () => {
  const previousProvider = process.env.LESSON_AI_PROVIDER;
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.LESSON_AI_PROVIDER = "mock";
  process.env.OPENAI_API_KEY = "";

  try {
    const provider = createLessonAiProvider();
    const result = await provider.generateReply({
      context: {
        lessonId: "lesson_key_points_full",
        lessonTitle: "Key Points Full Lesson",
        chapterTitle: "Chapter 6",
        courseTitle: "PSTET-2",
        transcriptText:
          "Development and environment work together in child growth and learning. Teachers should connect classroom readiness with the child's age and individual differences.",
        transcriptSegments: [],
      },
      userMessage: "Give key exam points from this lesson.",
      history: [],
      requestType: "KEY_EXAM_POINTS",
      responseLanguage: "English",
    });

    assert.match(result.content, /Key Exam Points:/);
    assert.doesNotMatch(result.content, /\.\.\./);
    assert.match(result.content, /Teachers should connect classroom readiness with the child's age and individual differences\./i);
  } finally {
    process.env.LESSON_AI_PROVIDER = previousProvider;
    process.env.OPENAI_API_KEY = previousApiKey;
  }
});
