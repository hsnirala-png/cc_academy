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

const formatDateTime = (value) => {
  if (!value) return "Not studied yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not studied yet";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const metaEl = document.querySelector("#tuitionChaptersMeta");
  const summaryEl = document.querySelector("#tuitionChaptersSummary");
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
    const summary = activeSyllabus?.progressSummary || {};

    setMeta(
      activeSyllabus?.title
        ? `Active syllabus: ${activeSyllabus.title}`
        : "No active syllabus is set yet. Upload and review one first.",
      activeSyllabus?.title ? "success" : "error"
    );

    if (summaryEl instanceof HTMLElement) {
      summaryEl.innerHTML = activeSyllabus?.title
        ? `
            <div class="tuition-summary-item">
              <strong>Average Completion</strong>
              <span>${summary.averageCompletionPercent || 0}%</span>
            </div>
            <div class="tuition-summary-item">
              <strong>Completed Chapters</strong>
              <span>${summary.completedChapters || 0} / ${summary.totalChapters || 0}</span>
            </div>
            <div class="tuition-summary-item">
              <strong>Last Studied</strong>
              <span>${formatDateTime(summary.lastStudiedAt)}</span>
            </div>
          `
        : `<p class="tuition-empty-note">Upload and confirm a syllabus to unlock chapter planning.</p>`;
    }

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
      .map((chapter) => {
        const sessionLink = chapter?.action?.sessionId
          ? `./tuition-teacher.html?chapterId=${encodeURIComponent(chapter.id)}&sessionId=${encodeURIComponent(
              chapter.action.sessionId
            )}`
          : `./tuition-teacher.html?chapterId=${encodeURIComponent(chapter.id)}`;

        return `
          <article class="card tuition-chapter-card">
            <div class="tuition-chapter-card-head">
              <span class="eyebrow">Recommended ${chapter.recommendedOrder || chapter.orderIndex}</span>
              <strong>${chapter.progress?.completionPercent || 0}%</strong>
            </div>
            <h2>${chapter.title}</h2>
            <p>${chapter.plan?.goalSummary || "Text-first tuition session is ready for this chapter."}</p>
            <div class="tuition-chip-row">
              <span class="tuition-chip">${chapter.progress?.progressLabel || chapter.progress?.status || "Not Started"}</span>
              <span class="tuition-chip">${chapter.latestSession?.status || "No Session"}</span>
              <span class="tuition-chip">${chapter.plan?.estimatedSessions || 1} session(s)</span>
            </div>
            <div class="tuition-summary-stack compact">
              <div class="tuition-summary-item">
                <strong>Last studied</strong>
                <span>${formatDateTime(chapter.progress?.lastStudiedAt)}</span>
              </div>
              <div class="tuition-summary-item">
                <strong>Next move</strong>
                <span>${chapter.plan?.suggestedAction || "Open the teacher and continue with the chapter."}</span>
              </div>
            </div>
            <div class="tuition-flow-actions">
              <a class="btn-primary" href="${sessionLink}">${chapter?.action?.label || "Start Session"}</a>
            </div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    setMeta(error instanceof Error ? error.message : "Unable to load chapters.", "error");
  }
});
