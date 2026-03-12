import assert from "node:assert/strict";
import test from "node:test";
import { loadLessonTrackingPayload } from "../routes/admin.lessons.routes";

test("admin lesson tracking falls back to zero AI chats when AI count query is unavailable", async () => {
  const trackedAt = new Date("2026-03-11T12:00:00.000Z");
  const fallbackLessons = [
    {
      id: "lesson_1",
      title: "Child Pedagogy Demo",
      orderIndex: 1,
      durationSec: 600,
      transcriptUrl: "/public/transcripts/lesson_1.json",
      audioUrl: null,
      updatedAt: trackedAt,
      chapter: {
        id: "chapter_1",
        title: "Chapter 1",
        orderIndex: 1,
        course: {
          id: "course_1",
          title: "PSTET-2",
        },
      },
      assessmentTest: {
        id: "test_1",
        title: "Assessment 1",
      },
      progress: [
        {
          lastPositionSec: 240,
          completed: false,
          updatedAt: trackedAt,
        },
        {
          lastPositionSec: 600,
          completed: true,
          updatedAt: new Date("2026-03-11T12:05:00.000Z"),
        },
      ],
    },
  ];

  const calls: unknown[] = [];
  const lessonDelegate = {
    async findMany(args: unknown) {
      calls.push(args);
      if (calls.length === 1) {
        throw new Error("AiConversation table missing");
      }
      return fallbackLessons;
    },
  };

  const payload = await loadLessonTrackingPayload(lessonDelegate, {});

  assert.equal(calls.length, 2);
  assert.match(JSON.stringify(calls[0]), /aiConversations/);
  assert.doesNotMatch(JSON.stringify(calls[1]), /aiConversations/);

  assert.equal(payload.lessons.length, 1);
  assert.deepEqual(Object.keys(payload).sort(), ["lessons", "summary"]);

  const lesson = payload.lessons[0];
  assert.ok(lesson);
  assert.equal(lesson.id, "lesson_1");
  assert.equal(lesson.title, "Child Pedagogy Demo");
  assert.equal(lesson.course.title, "PSTET-2");
  assert.equal(lesson.chapter.title, "Chapter 1");
  assert.equal(lesson.learnersStarted, 2);
  assert.equal(lesson.learnersCompleted, 1);
  assert.equal(lesson.averagePositionSec, 420);
  assert.equal(lesson.averageWatchPercent, 70);
  assert.equal(lesson.transcriptReady, true);
  assert.equal(lesson.audioReady, false);
  assert.equal(lesson.aiConversationCount, 0);
  assert.equal(lesson.assessment?.id, "test_1");
  assert.equal(lesson.lastActivityAt, "2026-03-11T12:05:00.000Z");

  assert.deepEqual(payload.summary, {
    totalLessons: 1,
    withAssessment: 1,
    transcriptReady: 1,
    audioReady: 0,
    aiConversationCount: 0,
  });
});
