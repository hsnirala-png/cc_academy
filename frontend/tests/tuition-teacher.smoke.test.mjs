import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = path.resolve(__dirname, "..", "tuition-teacher.html");
const jsPath = path.resolve(__dirname, "..", "src", "tuition-teacher.js");

const html = readFileSync(htmlPath, "utf8");
const js = readFileSync(jsPath, "utf8");

test("tuition teacher live board keeps required modal elements", () => {
  [
    "tuitionTeacherBoardModal",
    "tuitionTeacherBoardLoadingOverlay",
    "tuitionTeacherWhiteboardSurface",
    "tuitionTeacherBoardCurrentConcept",
    "tuitionTeacherBoardHoldToTalkBtn",
    "tuitionTeacherBoardContinueBtn",
  ].forEach((id) => {
    assert.match(html, new RegExp(`id="${id}"`), `expected ${id} in tuition-teacher.html`);
  });
});

test("tuition teacher script wires loading, close-stop, and doubt capture hooks", () => {
  [
    'document.querySelector("#tuitionTeacherBoardLoadingOverlay")',
    "const setBoardLoading =",
    "const askCurrentDoubt = async () =>",
    "closeBoardModal = () =>",
    "stopSpeech();",
    "startHoldToTalk(event.currentTarget === boardHoldToTalkBtn ? \"board\" : \"page\")",
  ].forEach((snippet) => {
    assert.match(js, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});

test("mobile toolbar stays icon-first without the board mic status text bar", () => {
  assert.match(html, /id="tuitionTeacherBoardMicStatus"/);
  assert.match(js, /boardMicStatusEl/);
  assert.match(
    readFileSync(path.resolve(__dirname, "..", "src", "styles.css"), "utf8"),
    /@media \(max-width: 920px\)[\s\S]*\.tuition-teacher-board-mic-status\s*\{\s*display:\s*none;/,
  );
});
