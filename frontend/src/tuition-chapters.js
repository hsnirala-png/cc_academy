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

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const metaEl = document.querySelector("#tuitionChaptersMeta");
  const gridEl = document.querySelector("#tuitionChaptersGrid");

  const setMeta = (message, type = "") => {
    if (!(metaEl instanceof HTMLElement)) return;
    metaEl.textContent = message;
    metaEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  try {
    const payload = await apiRequest({
      path: "/student/tuition/chapters",
      token,
    });

    const chapters = payload?.chapters || [];
    const activeSyllabus = payload?.activeSyllabus;
    setMeta(
      activeSyllabus?.title
        ? `Active syllabus: ${activeSyllabus.title}`
        : "No active syllabus is set yet. Upload and review one first.",
      activeSyllabus?.title ? "success" : "error"
    );

    if (!(gridEl instanceof HTMLElement)) return;
    if (!chapters.length) {
      gridEl.innerHTML = `
        <article class="card tuition-chapter-card">
          <h2>No chapters found</h2>
          <p>Upload and confirm a tuition syllabus to start the chapter flow.</p>
          <div class="tuition-flow-actions">
            <a class="btn-primary" href="./tuition-syllabus-upload.html">Upload Syllabus</a>
          </div>
        </article>
      `;
      return;
    }

    gridEl.innerHTML = chapters
      .map(
        (chapter) => `
          <article class="card tuition-chapter-card">
            <div class="tuition-chapter-card-head">
              <span class="eyebrow">Chapter ${chapter.orderIndex}</span>
              <strong>${chapter.progress?.completionPercent || 0}%</strong>
            </div>
            <h2>${chapter.title}</h2>
            <p>${chapter.plan?.goalSummary || "Text-first tuition session is ready for this chapter."}</p>
            <div class="tuition-chip-row">
              <span class="tuition-chip">${chapter.progress?.status || "NOT_STARTED"}</span>
              <span class="tuition-chip">${chapter.latestSession?.status || "NO_SESSION"}</span>
            </div>
            <div class="tuition-flow-actions">
              <a class="btn-primary" href="./tuition-teacher.html?chapterId=${encodeURIComponent(chapter.id)}">Start Session</a>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    setMeta(error instanceof Error ? error.message : "Unable to load chapters.", "error");
  }
});
