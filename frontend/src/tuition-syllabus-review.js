import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=2";

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

const getUploadId = () => new URLSearchParams(window.location.search).get("uploadId") || "";

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const uploadId = getUploadId();
  if (!uploadId) {
    window.location.href = "./tuition-syllabus-upload.html";
    return;
  }

  const statusEl = document.querySelector("#tuitionReviewStatus");
  const form = document.querySelector("#tuitionReviewForm");
  const titleInput = document.querySelector("#tuitionReviewTitle");
  const chaptersEl = document.querySelector("#tuitionReviewChapters");
  const addChapterBtn = document.querySelector("#tuitionAddChapterBtn");

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const renderChapterRows = (chapters) => {
    if (!(chaptersEl instanceof HTMLElement)) return;
    chaptersEl.innerHTML = chapters
      .map(
        (chapter, index) => `
          <div class="tuition-review-row" data-index="${index}">
            <input type="text" value="${String(chapter.name || "").replace(/"/g, "&quot;")}" maxlength="191" required />
            <button type="button" class="btn-ghost tuition-remove-row">Remove</button>
          </div>
        `
      )
      .join("");

    chaptersEl.querySelectorAll(".tuition-remove-row").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest(".tuition-review-row");
        row?.remove();
      });
    });
  };

  const collectChapters = () => {
    if (!(chaptersEl instanceof HTMLElement)) return [];
    return Array.from(chaptersEl.querySelectorAll(".tuition-review-row input"))
      .map((input, index) => ({
        name: input instanceof HTMLInputElement ? input.value.trim() : "",
        orderIndex: index + 1,
      }))
      .filter((chapter) => chapter.name);
  };

  try {
    const payload = await apiRequest({
      path: `/student/tuition/syllabus-uploads/${uploadId}`,
      token,
    });

    const upload = payload?.upload;
    if (titleInput instanceof HTMLInputElement) {
      titleInput.value = upload?.syllabus?.title || "";
    }
    renderChapterRows(upload?.syllabus?.chapters || []);
    form?.classList.remove("hidden");
    setStatus(
      upload?.parseStatus === "CONFIRMED"
        ? "Syllabus is already confirmed. You can still review it again if needed."
        : "Review the draft chapters before activating the syllabus.",
      "success"
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load the parsed syllabus.", "error");
  }

  addChapterBtn?.addEventListener("click", () => {
    const chapters = collectChapters();
    chapters.push({ name: "", orderIndex: chapters.length + 1 });
    renderChapterRows(chapters);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const chapters = collectChapters();
    if (!chapters.length) {
      setStatus("Add at least one chapter before continuing.", "error");
      return;
    }

    try {
      setStatus("Confirming reviewed syllabus...");
      await apiRequest({
        path: `/student/tuition/syllabus-uploads/${uploadId}/review`,
        method: "PUT",
        token,
        body: {
          title: titleInput instanceof HTMLInputElement ? titleInput.value.trim() : "",
          chapters,
          activate: true,
        },
      });
      window.location.href = "./tuition-chapters.html";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to confirm the syllabus.", "error");
    }
  });
});
