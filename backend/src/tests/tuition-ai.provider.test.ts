import assert from "node:assert/strict";
import test from "node:test";
import { TuitionDifficultyMode, TuitionSpeedMode } from "@prisma/client";
import {
  buildTuitionBoardPayload,
  buildTuitionTeacherAssistantPayload,
} from "../modules/tuition/tuition-ai.provider";

const baseTeacherContext = {
  boardName: "PSEB",
  classLevel: 10,
  subjectName: "Science",
  topicTitle: "Chemical Reactions and Equations",
  explanationLanguage: "ENGLISH",
  boardLanguage: "ENGLISH",
  voiceLanguage: "ENGLISH",
  teachingDepth: "MODERATE" as const,
  speedMode: TuitionSpeedMode.NORMAL,
  difficultyMode: TuitionDifficultyMode.MEDIUM,
};

test("start payload begins teaching immediately with structured board content", async () => {
  const payload = await buildTuitionTeacherAssistantPayload({
    ...baseTeacherContext,
    studentPrompt: "__START_TUITION_AI_TEACHER__",
    messageNumber: 1,
  });

  assert.equal(payload.teacherState?.currentTeachingPhase, "INTRO");
  assert.ok(payload.teacherExplanation);
  assert.ok(payload.boardState?.currentConcept);
  assert.ok((payload.boardLines || []).length > 0);
  assert.ok((payload.boardActions || []).length > 0);
  assert.ok((payload.speechChunks || []).length >= 2);
  assert.doesNotMatch(payload.teacherIntro || "", /Today we are learning/i);
});

test("continue payload advances the lesson instead of restarting it", async () => {
  const startPayload = await buildTuitionTeacherAssistantPayload({
    ...baseTeacherContext,
    studentPrompt: "__START_TUITION_AI_TEACHER__",
    messageNumber: 1,
  });

  const continuePayload = await buildTuitionTeacherAssistantPayload({
    ...baseTeacherContext,
    studentPrompt: "__CONTINUE_TUITION_AI_TEACHER__",
    messageNumber: 2,
    previousAssistant: startPayload,
  });

  assert.equal(continuePayload.teacherState?.currentConversationTurn, 2);
  assert.notEqual(
    continuePayload.teacherState?.currentConceptIndex,
    startPayload.teacherState?.currentConceptIndex
  );
  assert.notEqual(continuePayload.teacherExplanation, startPayload.teacherExplanation);
});

test("doubt payload switches to doubt handling and preserves board guidance", async () => {
  const payload = await buildTuitionTeacherAssistantPayload({
    ...baseTeacherContext,
    studentPrompt: "Why is burning magnesium called a chemical reaction?",
    messageNumber: 3,
  });

  assert.equal(payload.teacherState?.currentTeachingPhase, "HANDLE_STUDENT_DOUBT");
  assert.match(payload.nextSuggestedAction || "", /Continue from the same point/i);
  assert.ok(payload.teacherExplanation);
  assert.ok(payload.boardState?.currentConcept);
});

test("board payload returns minimal board content for the selected topic", () => {
  const payload = buildTuitionBoardPayload({
    ...baseTeacherContext,
    studentPrompt: "__START_TUITION_AI_TEACHER__",
    messageNumber: 1,
  });

  assert.equal(payload.boardTitle, "Chemical Reactions and Equations");
  assert.ok((payload.boardLines || []).length > 0);
  assert.ok((payload.formulas || []).length > 0);
  assert.ok((payload.steps || []).length > 0);
  assert.ok((payload.exampleSteps || []).length > 0);
});
