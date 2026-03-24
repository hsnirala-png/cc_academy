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
  const warningsEl = document.querySelector("#tuitionReviewWarnings");
  const metaEl = document.querySelector("#tuitionReviewMeta");
  const rawTextEl = document.querySelector("#tuitionReviewRawText");
  const form = document.querySelector("#tuitionReviewForm");
  const titleInput = document.querySelector("#tuitionReviewTitle");
  const chaptersEl = document.querySelector("#tuitionReviewChapters");
  const addChapterBtn = document.querySelector("#tuitionAddChapterBtn");

  let chapterRows = [];

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const renderWarnings = (warnings) => {
    if (!(warningsEl instanceof HTMLElement)) return;
    if (!warnings.length) {
      warningsEl.innerHTML = `<p class="tuition-empty-note">No parser warnings. You can still refine the chapter order before confirming.</p>`;
      return;
    }
    warningsEl.innerHTML = warnings
      .map(
        (warning) => `
          <div class="tuition-summary-item is-warning">
            <strong>Review</strong>
            <span>${warning}</span>
          </div>
        `
      )
      .join("");
  };

  const renderMeta = (upload) => {
    if (!(metaEl instanceof HTMLElement)) return;
    const rows = [
      ["File", upload?.fileName || "-"],
      ["Type", upload?.mimeType || "-"],
      ["Parse Status", upload?.parseStatus || "-"],
      ["Included Chapters", String((upload?.syllabus?.chapters || []).filter((item) => item.isIncluded).length)],
    ];
    metaEl.innerHTML = rows
      .map(
        ([label, value]) => `
          <div class="tuition-summary-item">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `
      )
      .join("");
  };

  const renderRows = () => {
    if (!(chaptersEl instanceof HTMLElement)) return;
    chaptersEl.innerHTML = chapterRows
      .map(
        (chapter, index) => `
          <article class="tuition-review-row" data-row-index="${index}">
            <div class="tuition-review-order">${index + 1}</div>
            <label class="tuition-review-check">
              <input type="checkbox" data-field="include" ${chapter.isIncluded ? "checked" : ""} />
              <span>Include</span>
            </label>
            <input type="text" data-field="name" maxlength="191" value="${String(chapter.name || "").replace(/"/g, "&quot;")}" required />
            <div class="tuition-flow-actions">
              <button type="button" class="btn-ghost" data-action="up">Up</button>
              <button type="button" class="btn-ghost" data-action="down">Down</button>
              <button type="button" class="btn-ghost" data-action="remove">Remove</button>
            </div>
          </article>
        `
      )
      .join("");
  };

  const syncRowsFromDom = () => {
    if (!(chaptersEl instanceof HTMLElement)) return;
    chapterRows = Array.from(chaptersEl.querySelectorAll("[data-row-index]")).map((row) => {
      const input = row.querySelector('[data-field="name"]');
      const include = row.querySelector('[data-field="include"]');
      return {
        name: input instanceof HTMLInputElement ? input.value.trim() : "",
        isIncluded: include instanceof HTMLInputElement ? include.checked : true,
      };
    });
  };

  const collectPayload = () => {
    syncRowsFromDom();
    return chapterRows
      .map((chapter, index) => ({
        name: chapter.name,
        orderIndex: index + 1,
        isIncluded: chapter.isIncluded,
      }))
      .filter((chapter) => chapter.name);
  };

  chaptersEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = String(target.getAttribute("data-action") || "").trim();
    if (!action) return;
    const row = target.closest("[data-row-index]");
    const index = Number(row?.getAttribute("data-row-index"));
    if (!Number.isInteger(index)) return;
    syncRowsFromDom();
    if (action === "remove") {
      chapterRows.splice(index, 1);
    } else if (action === "up" && index > 0) {
      [chapterRows[index - 1], chapterRows[index]] = [chapterRows[index], chapterRows[index - 1]];
    } else if (action === "down" && index < chapterRows.length - 1) {
      [chapterRows[index + 1], chapterRows[index]] = [chapterRows[index], chapterRows[index + 1]];
    }
    renderRows();
  });

  addChapterBtn?.addEventListener("click", () => {
    syncRowsFromDom();
    chapterRows.push({ name: "", isIncluded: true });
    renderRows();
  });

  try {
    const payload = await apiRequest({
      path: `/student/tuition/syllabus-uploads/${uploadId}`,
      token,
    });

    const upload = payload?.upload || {};
    if (titleInput instanceof HTMLInputElement) {
      titleInput.value = upload?.syllabus?.title || "";
    }
    if (rawTextEl instanceof HTMLTextAreaElement) {
      rawTextEl.value = upload?.rawText || "";
    }

    renderWarnings(upload?.parseWarnings || []);
    renderMeta(upload);

    chapterRows = Array.isArray(upload?.syllabus?.chapters)
      ? upload.syllabus.chapters.map((chapter) => ({
          name: chapter.name || "",
          isIncluded: chapter.isIncluded !== false,
        }))
      : [];
    if (!chapterRows.length) {
      chapterRows = [{ name: "Chapter 1", isIncluded: true }];
    }
    renderRows();
    form?.classList.remove("hidden");
    setStatus("Review the chapter list, then confirm the final active syllabus.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load the parsed syllabus.", "error");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const chapters = collectPayload();
    if (!chapters.length) {
      setStatus("Add at least one chapter before continuing.", "error");
      return;
    }
    if (!chapters.some((chapter) => chapter.isIncluded)) {
      setStatus("Include at least one chapter before confirming the syllabus.", "error");
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
