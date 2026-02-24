import { apiRequest, clearAuth, escapeHtml, initHeaderBehavior, requireRoleGuard } from "./mock-api.js?v=2";

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/lessons");
  const candidates = prefersExtensionless
    ? ["./mock-attempt", "./mock-attempt.html"]
    : ["./mock-attempt.html", "./mock-attempt"];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (response.ok) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return candidates[0];
};

const getSearchParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || "";
};

const getLessonPlayerPath = () => {
  const currentPath = (window.location.pathname || "").toLowerCase();
  const extensionless = currentPath && !currentPath.endsWith(".html") && currentPath !== "/";
  return extensionless ? "./lesson-player" : "./lesson-player.html";
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token } = auth;
  initHeaderBehavior();

  const logoutBtn = document.querySelector("#logoutBtn");
  const statusEl = document.querySelector("#lessonStatus");
  const courseTitleEl = document.querySelector("#lessonCourseTitle");
  const courseSelectEl = document.querySelector("#lessonCourseSelect");
  const chapterTitleEl = document.querySelector("#lessonChapterTitle");
  const completionEl = document.querySelector("#lessonCompletion");
  const headSubtitleEl = document.querySelector("#lessonHeadSubtitle");
  const lessonListEl = document.querySelector("#lessonList");
  const openNextLessonBtn = document.querySelector("#openNextLessonBtn");

  const state = {
    chapterId: getSearchParam("chapterId"),
    selectedCourseId: getSearchParam("courseId"),
    chapterOverview: null,
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const goToLesson = (lessonId) => {
    if (!lessonId) return;
    const params = new URLSearchParams();
    params.set("lessonId", lessonId);
    if (state.chapterOverview?.chapter?.id) {
      params.set("chapterId", state.chapterOverview.chapter.id);
    }
    window.location.href = `${getLessonPlayerPath()}?${params.toString()}`;
  };

  const startAssessment = async (testId) => {
    if (!testId) return;
    const response = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId: testId },
    });

    const attemptId = response?.attempt?.id;
    if (!attemptId) {
      throw new Error("Failed to start assessment.");
    }

    const attemptPagePath = await resolveAttemptPagePath();
    const separator = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${separator}attemptId=${encodeURIComponent(attemptId)}`;
  };

  const renderLessonList = () => {
    if (!lessonListEl) return;
    const lessons = state.chapterOverview?.lessons || [];

    if (!lessons.length) {
      lessonListEl.innerHTML = '<div class="dash-card">No lessons available in this chapter yet.</div>';
      return;
    }

    lessonListEl.innerHTML = lessons
      .map((lesson) => {
        const completed = Boolean(lesson?.progress?.completed);
        const durationText = lesson.durationSec
          ? `${Math.max(1, Math.round(Number(lesson.durationSec) / 60))} min`
          : "Duration not set";
        const durationSec = Number(lesson?.durationSec || 0);
        const watchedSec = Math.max(0, Number(lesson?.progress?.lastPositionSec || 0));
        const progressPercent = completed
          ? 100
          : durationSec > 0
            ? Math.min(100, Math.round((watchedSec / durationSec) * 100))
            : 0;

        const assessmentAction = lesson.assessmentTestId
          ? `<button class="btn-secondary lesson-action-btn" type="button" data-start-test="${lesson.assessmentTestId}">
               Attempt Test
             </button>`
          : "";

        return `
          <article class="lesson-row ${completed ? "completed" : ""}">
            <div class="lesson-row-head">
              <h3>${escapeHtml(lesson.title)}</h3>
              <span class="chip ${completed ? "active" : "inactive"}">
                ${completed ? "Completed" : "In progress"}
              </span>
            </div>
            <p class="lesson-row-meta">Duration: ${durationText}</p>
            <p class="lesson-row-meta">Progress: ${progressPercent}%</p>
            <div class="lesson-row-actions">
              <button class="btn-primary lesson-action-btn" type="button" data-open-lesson="${lesson.id}">
                ${completed ? "Rewatch Lesson" : "Open Lesson"}
              </button>
              ${assessmentAction}
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderOverview = () => {
    if (!state.chapterOverview) return;
    const { course, chapter, summary, nextLesson } = state.chapterOverview;

    if (courseTitleEl) courseTitleEl.textContent = course?.title || "-";
    if (chapterTitleEl) chapterTitleEl.textContent = chapter?.title || "-";
    if (completionEl) completionEl.textContent = `${summary?.completionPercent || 0}%`;
    if (headSubtitleEl) {
      headSubtitleEl.textContent = `Track course-wise lesson progress and start linked tests anytime (${summary?.completedLessons || 0}/${
        summary?.totalLessons || 0
      }).`;
    }

    if (openNextLessonBtn) {
      openNextLessonBtn.disabled = !nextLesson?.id;
      openNextLessonBtn.textContent = nextLesson?.id ? `Open Next: ${nextLesson.title}` : "No Lessons";
    }

    renderLessonList();
  };

  const renderCourseOptions = () => {
    if (!(courseSelectEl instanceof HTMLSelectElement)) return;
    const assignedCourses = Array.isArray(state.chapterOverview?.assignedCourses)
      ? state.chapterOverview.assignedCourses
      : [];

    if (!assignedCourses.length) {
      courseSelectEl.innerHTML = `<option value="">No assigned courses</option>`;
      courseSelectEl.disabled = true;
      return;
    }

    const selectedId = state.chapterOverview?.course?.id || state.selectedCourseId || assignedCourses[0]?.id;
    courseSelectEl.innerHTML = assignedCourses
      .map((courseItem) => {
        const selected = String(courseItem.id) === String(selectedId) ? "selected" : "";
        return `<option value="${escapeHtml(courseItem.id)}" ${selected}>${escapeHtml(courseItem.title)}</option>`;
      })
      .join("");
    courseSelectEl.disabled = false;
    state.selectedCourseId = selectedId || "";
  };

  const loadOverview = async () => {
    const path = state.chapterId
      ? `/api/chapters/${encodeURIComponent(state.chapterId)}/overview`
      : `/api/chapters/overview${state.selectedCourseId ? `?courseId=${encodeURIComponent(state.selectedCourseId)}` : ""}`;

    const payload = await apiRequest({ path, token });
    state.chapterOverview = payload;
    if (!state.chapterId && payload?.course?.id) {
      state.selectedCourseId = String(payload.course.id);
    }
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (openNextLessonBtn) {
    openNextLessonBtn.addEventListener("click", () => {
      const lessonId = state.chapterOverview?.nextLesson?.id;
      goToLesson(lessonId);
    });
  }

  if (courseSelectEl instanceof HTMLSelectElement) {
    courseSelectEl.addEventListener("change", async () => {
      if (state.chapterId) return;
      state.selectedCourseId = String(courseSelectEl.value || "").trim();
      try {
        setStatus("Loading selected course...");
        await loadOverview();
        renderCourseOptions();
        renderOverview();
        setStatus("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load selected course.";
        setStatus(message, "error");
      }
    });
  }

  if (lessonListEl) {
    lessonListEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const lessonBtn = target.closest("[data-open-lesson]");
      if (lessonBtn instanceof HTMLElement) {
        goToLesson(lessonBtn.getAttribute("data-open-lesson") || "");
        return;
      }

      const testBtn = target.closest("[data-start-test]");
      if (testBtn instanceof HTMLElement) {
        const testId = testBtn.getAttribute("data-start-test") || "";
        try {
          setStatus("Starting assessment...");
          await startAssessment(testId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to start assessment.";
          setStatus(message, "error");
        }
      }
    });
  }

  try {
    setStatus("Loading lessons...");
    await loadOverview();
    renderCourseOptions();
    renderOverview();
    setStatus("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    const message = error instanceof Error ? error.message : "Unable to load lessons.";
    if (courseSelectEl instanceof HTMLSelectElement) {
      courseSelectEl.innerHTML = `<option value="">No assigned courses</option>`;
      courseSelectEl.disabled = true;
    }
    setStatus(message, "error");
  }
});

