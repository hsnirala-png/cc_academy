import { apiRequest, escapeHtml, requireTeacherHubTeacher, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubTeacherBoardMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubTeacher();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const boardsListEl = document.querySelector("#teacherHubBoardsList");
  const noticesListEl = document.querySelector("#teacherHubNoticeList");
  const contentListEl = document.querySelector("#teacherHubContentList");

  const createBoardForm = document.querySelector("#teacherHubBoardCreateForm");
  const boardEnrollmentInput = document.querySelector("#teacherBoardEnrollmentId");
  const boardTitleInput = document.querySelector("#teacherBoardTitle");

  const whiteboardForm = document.querySelector("#teacherHubWhiteboardForm");
  const whiteboardBoardIdInput = document.querySelector("#teacherWhiteboardBoardId");
  const whiteboardTitleInput = document.querySelector("#teacherWhiteboardTitle");
  const whiteboardPayloadInput = document.querySelector("#teacherWhiteboardPayload");

  const boardFileForm = document.querySelector("#teacherHubBoardFileForm");
  const boardFileBoardIdInput = document.querySelector("#teacherBoardFileBoardId");
  const boardFileTitleInput = document.querySelector("#teacherBoardFileTitle");
  const boardFileInput = document.querySelector("#teacherBoardFileInput");

  const noticeForm = document.querySelector("#teacherHubNoticeForm");
  const noticeTargetTypeInput = document.querySelector("#teacherNoticeTargetType");
  const noticeTargetIdInput = document.querySelector("#teacherNoticeTargetId");
  const noticeTitleInput = document.querySelector("#teacherNoticeTitle");
  const noticeBodyInput = document.querySelector("#teacherNoticeBody");

  const contentForm = document.querySelector("#teacherHubContentForm");
  const contentEnrollmentInput = document.querySelector("#teacherContentEnrollmentId");
  const contentTypeInput = document.querySelector("#teacherContentType");
  const contentTitleInput = document.querySelector("#teacherContentTitle");
  const contentBodyInput = document.querySelector("#teacherContentBody");

  const renderBoards = (items) => {
    if (!(boardsListEl instanceof HTMLElement)) return;
    boardsListEl.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <article class="teacher-hub-item">
                <strong>${escapeHtml(item.title)}</strong>
                <div class="teacher-hub-chip-row">
                  <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                  <span class="teacher-hub-chip">${escapeHtml(item.id)}</span>
                </div>
                ${
                  item.enrollmentId
                    ? `<div class="teacher-hub-actions">
                  <a class="btn-secondary" href="./teacher-hub-student-board.html?boardId=${encodeURIComponent(item.id)}" target="_blank" rel="noreferrer">Open Student View</a>
                </div>`
                    : `<p>Student delivery is only available for enrollment-linked boards in Phase 1.</p>`
                }
              </article>
            `
          )
          .join("")
      : `<div class="teacher-hub-empty">No boards created yet.</div>`;
  };

  const renderSimpleList = (element, items, emptyText, mapper) => {
    if (!(element instanceof HTMLElement)) return;
    element.innerHTML = items.length ? items.map(mapper).join("") : `<div class="teacher-hub-empty">${emptyText}</div>`;
  };

  const load = async () => {
    const [boardsPayload, noticesPayload, contentPayload] = await Promise.all([
      apiRequest({ path: "/teacher-hub/boards", token: auth.token }),
      apiRequest({ path: "/teacher-hub/notices", token: auth.token }),
      apiRequest({ path: "/teacher-hub/content", token: auth.token }),
    ]);
    renderBoards(boardsPayload?.boards || []);
    renderSimpleList(noticesListEl, noticesPayload?.notices || [], "No notices yet.", (item) => `
      <article class="teacher-hub-item">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
      </article>
    `);
    renderSimpleList(contentListEl, contentPayload?.content || [], "No content yet.", (item) => `
      <article class="teacher-hub-item">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body || "")}</p>
      </article>
    `);
  };

  createBoardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Creating board...");
      await apiRequest({
        path: "/teacher-hub/boards",
        method: "POST",
        token: auth.token,
        body: {
          enrollmentId: boardEnrollmentInput?.value || undefined,
          title: boardTitleInput?.value || "Teacher Board",
        },
      });
      if (createBoardForm instanceof HTMLFormElement) createBoardForm.reset();
      await load();
      setMessage(messageEl, "Board created.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to create board.", "error");
    }
  });

  whiteboardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Saving whiteboard...");
      await apiRequest({
        path: `/teacher-hub/boards/${encodeURIComponent(whiteboardBoardIdInput?.value || "")}/whiteboard`,
        method: "POST",
        token: auth.token,
        body: {
          title: whiteboardTitleInput?.value || undefined,
          payloadJson: { notes: whiteboardPayloadInput?.value || "" },
        },
      });
      setMessage(messageEl, "Whiteboard saved.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to save whiteboard.", "error");
    }
  });

  boardFileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const file = boardFileInput?.files?.[0];
      if (!file) throw new Error("Choose a file first.");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Unable to read the selected file."));
        reader.readAsDataURL(file);
      });
      setMessage(messageEl, "Uploading board file...");
      await apiRequest({
        path: `/teacher-hub/boards/${encodeURIComponent(boardFileBoardIdInput?.value || "")}/files`,
        method: "POST",
        token: auth.token,
        body: {
          title: boardFileTitleInput?.value || file.name,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64: base64,
        },
      });
      if (boardFileForm instanceof HTMLFormElement) boardFileForm.reset();
      setMessage(messageEl, "Board file uploaded.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to upload board file.", "error");
    }
  });

  noticeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Publishing notice...");
      await apiRequest({
        path: "/teacher-hub/notices",
        method: "POST",
        token: auth.token,
        body: {
          targetType: noticeTargetTypeInput?.value || "ENROLLMENT",
          targetId: noticeTargetIdInput?.value || "",
          title: noticeTitleInput?.value || "",
          body: noticeBodyInput?.value || "",
        },
      });
      if (noticeForm instanceof HTMLFormElement) noticeForm.reset();
      await load();
      setMessage(messageEl, "Notice delivered.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to create notice.", "error");
    }
  });

  contentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Publishing content...");
      await apiRequest({
        path: "/teacher-hub/content",
        method: "POST",
        token: auth.token,
        body: {
          enrollmentId: contentEnrollmentInput?.value || undefined,
          contentType: contentTypeInput?.value || "NOTE",
          title: contentTitleInput?.value || "",
          body: contentBodyInput?.value || undefined,
        },
      });
      if (contentForm instanceof HTMLFormElement) contentForm.reset();
      await load();
      setMessage(messageEl, "Content published.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to publish content.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load Teacher Hub board tools.", "error"));
});
