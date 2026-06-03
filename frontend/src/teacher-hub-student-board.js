import { apiRequest, escapeHtml, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubStudentBoardMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const metaEl = document.querySelector("#teacherHubStudentBoardMeta");
  const boardEl = document.querySelector("#teacherHubStudentBoardSurface");
  const filesEl = document.querySelector("#teacherHubStudentBoardFiles");
  const params = new URLSearchParams(window.location.search || "");
  const boardId = params.get("boardId") || "";

  if (!boardId) {
    setMessage(messageEl, "Board id is missing.", "error");
    return;
  }

  try {
    const payload = await apiRequest({
      path: `/student/teacher-hub/boards/${encodeURIComponent(boardId)}`,
      token: auth.token,
    });
    const board = payload?.board || {};
    const artifacts = Array.isArray(payload?.artifacts) ? payload.artifacts : [];
    const whiteboard = artifacts.find((item) => item.artifactType === "WHITEBOARD_STATE");
    const files = artifacts.filter((item) => item.artifactType !== "WHITEBOARD_STATE");

    if (metaEl instanceof HTMLElement) {
      metaEl.innerHTML = `
        <span class="teacher-hub-chip">${escapeHtml(board.title || "Board")}</span>
        <span class="teacher-hub-chip">${escapeHtml(board.status || "ACTIVE")}</span>
      `;
    }
    if (boardEl instanceof HTMLElement) {
      const text = whiteboard?.payloadJson ? JSON.stringify(whiteboard.payloadJson, null, 2) : "No whiteboard snapshot yet.";
      boardEl.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
    }
    if (filesEl instanceof HTMLElement) {
      filesEl.innerHTML = files.length
        ? files
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>${escapeHtml(item.title || item.storageUrl || "Shared File")}</strong>
                  <div class="teacher-hub-actions"><a class="btn-secondary" href="${escapeHtml(item.storageUrl || "#")}" target="_blank" rel="noreferrer">Open</a></div>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No shared files yet.</div>`;
    }
  } catch (error) {
    setMessage(messageEl, error.message || "Unable to load teacher board.", "error");
  }
});
