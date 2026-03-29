import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=4";

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

const resolveTuitionPagePath = (name, params = {}) => {
  const pathname = String(window.location.pathname || "");
  const isExtensionless = Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return `./${name}${isExtensionless ? "" : ".html"}${queryString ? `?${queryString}` : ""}`;
};

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();
  const query = new URLSearchParams(window.location.search || "");
  const shouldHighlightFirstChapter = query.get("highlight") === "first";

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const metaEl = document.querySelector("#tuitionChaptersMeta");
  const summaryEl = document.querySelector("#tuitionChaptersSummary");
  const primaryActionEl = document.querySelector("#tuitionChaptersPrimaryAction");
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
    const primaryChapter =
      chapters.find((chapter) => chapter?.action?.canResume) ||
      chapters[0] ||
      null;

    setMeta(
      activeSyllabus?.title
        ? `Active syllabus: ${activeSyllabus.title}. These chapter cards are your lesson entry points.`
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

    if (primaryActionEl instanceof HTMLElement) {
      if (primaryChapter) {
        const teacherHref = resolveTuitionPagePath("tuition-teacher", {
          chapterId: primaryChapter.id,
          open: Date.now(),
        });
        primaryActionEl.innerHTML = `
          <a class="btn-primary" href="${teacherHref}" data-open-teacher="1">${
            primaryChapter?.action?.canResume ? "Continue Active Lesson" : "Open AI Teacher"
          }</a>
        `;
      } else {
        primaryActionEl.innerHTML = "";
      }
    }

    if (!(gridEl instanceof HTMLElement)) return;
    if (!chapters.length) {
      gridEl.innerHTML = `
        <article class="card tuition-chapter-card">
            <h2>No chapters found</h2>
            <p>Upload and confirm a tuition syllabus to generate the chapter lesson cards first.</p>
            <div class="tuition-flow-actions">
              <a class="btn-primary" href="./tuition-syllabus-upload.html">Upload Syllabus</a>
            </div>
          </article>
      `;
      return;
    }

    gridEl.innerHTML = chapters
      .map((chapter, index) => {
        const isFirstHighlighted = shouldHighlightFirstChapter && index === 0;
        const teacherHref = resolveTuitionPagePath("tuition-teacher", {
          chapterId: chapter.id,
          open: Date.now(),
        });

        return `
          <article class="card tuition-chapter-card${isFirstHighlighted ? " is-featured-first-lesson" : ""}"${
            isFirstHighlighted ? ' data-first-lesson="true"' : ""
          }>
            <div class="tuition-chapter-card-head">
              <span class="eyebrow">${
                isFirstHighlighted
                  ? "Start First Lesson"
                  : `Recommended ${chapter.recommendedOrder || chapter.orderIndex}`
              }</span>
              <strong>${chapter.progress?.completionPercent || 0}%</strong>
            </div>
            <h2>${chapter.title}</h2>
            <p>${chapter.plan?.goalSummary || "This chapter lesson card is ready for a text, voice, and board-based tuition session."}</p>
            <div class="tuition-chip-row">
              ${
                isFirstHighlighted
                  ? '<span class="tuition-chip tuition-chip-highlight">Recommended first step</span>'
                  : ""
              }
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
              <a class="btn-primary" href="${teacherHref}" data-open-teacher="1"${
                isFirstHighlighted ? ' data-first-lesson-link="true"' : ""
              }>${
                isFirstHighlighted ? "Start First Lesson" : chapter?.action?.label || "Start Session"
              }</a>
            </div>
          </article>
        `;
      })
      .join("");

    document.querySelectorAll('[data-open-teacher="1"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const href =
          link instanceof HTMLAnchorElement
            ? link.href
            : resolveTuitionPagePath("tuition-teacher", { open: Date.now() });
        window.location.assign(href);
      });
    });

    if (shouldHighlightFirstChapter) {
      const firstLessonCard = gridEl.querySelector('[data-first-lesson="true"]');
      const firstLessonLink = gridEl.querySelector('[data-first-lesson-link="true"]');
      if (firstLessonCard instanceof HTMLElement) {
        firstLessonCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (firstLessonLink instanceof HTMLElement) {
        window.setTimeout(() => {
          firstLessonLink.focus();
        }, 250);
      }
      const nextUrl = `${window.location.pathname}`;
      window.history.replaceState({}, "", nextUrl);
    }
  } catch (error) {
    setMeta(error instanceof Error ? error.message : "Unable to load chapters.", "error");
  }
});
