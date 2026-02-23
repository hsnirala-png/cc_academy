import assert from "node:assert/strict";
import test from "node:test";
import { calculateAttemptScore, getRemarkText } from "../modules/mock-tests/mock-test.scoring";

test("30-question thresholds are mapped correctly", () => {
  assert.equal(getRemarkText(29, 30), "Excellent");
  assert.equal(getRemarkText(26, 30), "Very Good");
  assert.equal(getRemarkText(22, 30), "Good");
  assert.equal(getRemarkText(18, 30), "Need to work more");
  assert.equal(getRemarkText(10, 30), "Poor");
  assert.equal(getRemarkText(5, 30), "Very Poor");
});

test("60-question thresholds are mapped correctly", () => {
  assert.equal(getRemarkText(58, 60), "Excellent");
  assert.equal(getRemarkText(53, 60), "Very Good");
  assert.equal(getRemarkText(45, 60), "Good");
  assert.equal(getRemarkText(31, 60), "Need to work more");
  assert.equal(getRemarkText(22, 60), "Poor");
  assert.equal(getRemarkText(12, 60), "Very Poor");
});

test("score percent is calculated with 2 decimal precision", () => {
  const score = calculateAttemptScore(17, 30);
  assert.equal(score.correctCount, 17);
  assert.equal(score.totalQuestions, 30);
  assert.equal(score.scorePercent, 56.67);
  assert.equal(score.remarkText, "Need to work more");
});
