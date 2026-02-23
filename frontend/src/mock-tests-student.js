import {
  EXAM_LABELS,
  LANGUAGE_LABELS,
  REQUIRED_QUESTIONS_BY_SUBJECT,
  STREAM_LABELS,
  SUBJECT_LABELS,
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  initHeaderBehavior,
  requireRoleGuard,
} from "./mock-api.js";

const SUBJECTS_BY_EXAM = {
  PSTET_1: ["PUNJABI", "ENGLISH", "CHILD_PEDAGOGY", "MATHS_EVS"],
  PSTET_2_COMMON: ["PUNJABI", "ENGLISH", "CHILD_PEDAGOGY"],
};

const NON_LANGUAGE_SUBJECTS = new Set([
  "CHILD_PEDAGOGY",
  "MATHS_EVS",
  "SCIENCE_MATH",
  "SOCIAL_STUDIES",
]);

const LANGUAGE_PRIORITY = ["PUNJABI", "ENGLISH", "HINDI"];

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/mock-tests");
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

const getLessonsPagePath = () => {
  const currentPath = (window.location.pathname || "").toLowerCase();
  const extensionless = currentPath && !currentPath.endsWith(".html") && currentPath !== "/";
  return extensionless ? "./lessons" : "./lessons.html";
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token, user } = auth;
  initHeaderBehavior();

  const logoutBtn = document.querySelector("#logoutBtn");
  const statusEl = document.querySelector("#mockStatus");
  const examTypeSelect = document.querySelector("#examType");
  const streamWrap = document.querySelector("#streamChoiceWrap");
  const streamSelect = document.querySelector("#streamChoice");
  const subjectSelect = document.querySelector("#subject");
  const languageModeWrap = document.querySelector("#languageModeWrap");
  const languageModeSelect = document.querySelector("#languageMode");
  const applyFiltersBtn = document.querySelector("#applyFiltersBtn");
  const testsContainer = document.querySelector("#testsContainer");
  const headingName = document.querySelector("#studentName");

  const state = {
    history: [],
    tests: [],
    availableLanguages: [],
  };

  if (headingName) {
    headingName.textContent = user?.name || "Student";
  }

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  let lockToastTimer = null;
  const showLessonLockToast = (details) => {
    const chapterId = details?.chapterId ? `?chapterId=${encodeURIComponent(details.chapterId)}` : "";
    const lessonTitle = details?.lessonTitle || "linked lesson";

    let toast = document.querySelector("#mockLessonLockToast");
    if (!(toast instanceof HTMLElement)) {
      toast = document.createElement("aside");
      toast.id = "mockLessonLockToast";
      toast.className = "mock-lock-toast";
      toast.setAttribute("role", "alert");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <p class="mock-lock-toast-title">Assessment Locked</p>
      <p class="mock-lock-toast-text">
        Complete "${escapeHtml(lessonTitle)}" to unlock this test.
      </p>
      <div class="mock-lock-toast-actions">
        <a class="btn-secondary" href="${getLessonsPagePath()}${chapterId}">Open Lessons</a>
        <button class="btn-ghost" type="button" data-dismiss-lock-toast>Dismiss</button>
      </div>
    `;

    toast.classList.add("open");
    const dismissBtn = toast.querySelector("[data-dismiss-lock-toast]");
    if (dismissBtn instanceof HTMLElement) {
      dismissBtn.addEventListener(
        "click",
        () => {
          toast.classList.remove("open");
        },
        { once: true }
      );
    }

    if (lockToastTimer) {
      window.clearTimeout(lockToastTimer);
    }
    lockToastTimer = window.setTimeout(() => {
      toast.classList.remove("open");
      lockToastTimer = null;
    }, 9000);
  };

  const getHistoryBadge = (mockTestId) => {
    const attempts = state.history.filter((item) => item.mockTestId === mockTestId);
    if (!attempts.length) {
      return `<span class="chip inactive">No attempts</span>`;
    }
    const latest = attempts[0];
    return `<span class="chip active">Attempts: ${attempts.length} | Best: ${Number(
      latest.scorePercent || 0
    ).toFixed(2)}%</span>`;
  };

  const renderTests = () => {
    if (!testsContainer) return;

    if (!state.tests.length) {
      testsContainer.innerHTML =
        '<div class="dash-card"><p class="dash-k">No active tests found for selected filters.</p></div>';
      return;
    }

    testsContainer.innerHTML = state.tests
      .map((test) => {
        const required = Number(test.requiredQuestions || 0) || REQUIRED_QUESTIONS_BY_SUBJECT[test.subject] || 30;
        return `
          <article class="mock-test-card">
            <h3>${escapeHtml(test.title)}</h3>
            <p class="mock-test-meta">
              ${escapeHtml(EXAM_LABELS[test.examType] || test.examType)} | 
              ${escapeHtml(SUBJECT_LABELS[test.subject] || test.subject)}${
                test.streamChoice ? ` | ${escapeHtml(STREAM_LABELS[test.streamChoice])}` : ""
              }${
                test.languageMode
                  ? ` | ${escapeHtml(LANGUAGE_LABELS[test.languageMode] || test.languageMode)}`
                  : ""
              }
            </p>
            <p class="mock-test-meta">Questions: ${required}</p>
            <div class="mock-test-badges">
              <span class="chip ${test.isActive ? "active" : "inactive"}">${
          test.isActive ? "Active" : "Inactive"
        }</span>
              ${getHistoryBadge(test.id)}
            </div>
            <div class="mock-test-actions">
              <button class="btn-primary" data-start-test="${test.id}" type="button">Start Attempt</button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const getCurrentFilters = () => {
    const examType = examTypeSelect?.value || "PSTET_1";
    const subject = subjectSelect?.value || "PUNJABI";
    const streamChoice = examType === "PSTET_2" ? streamSelect?.value || undefined : undefined;
    return { examType, subject, streamChoice };
  };

  const sortLanguageModes = (modes) => {
    return [...modes].sort((a, b) => {
      const aIndex = LANGUAGE_PRIORITY.indexOf(a);
      const bIndex = LANGUAGE_PRIORITY.indexOf(b);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  };

  const fillSubjects = async () => {
    const examType = examTypeSelect?.value || "PSTET_1";
    const streamChoice = streamSelect?.value || "";
    if (!subjectSelect) return;

    let subjects = [];
    if (examType === "PSTET_1") {
      subjects = SUBJECTS_BY_EXAM.PSTET_1;
      if (streamWrap) streamWrap.classList.add("hidden");
    } else {
      if (streamWrap) streamWrap.classList.remove("hidden");
      subjects = [...SUBJECTS_BY_EXAM.PSTET_2_COMMON];
      if (streamChoice === "SCIENCE_MATH") subjects.push("SCIENCE_MATH");
      if (streamChoice === "SOCIAL_STUDIES") subjects.push("SOCIAL_STUDIES");
    }

    const previous = subjectSelect.value;
    subjectSelect.innerHTML = subjects
      .map(
        (subject) =>
          `<option value="${subject}">${escapeHtml(SUBJECT_LABELS[subject] || subject)}</option>`
      )
      .join("");
    subjectSelect.value = subjects.includes(previous) ? previous : subjects[0];
    await toggleLanguageMode();
  };

  const toggleLanguageMode = async () => {
    if (!subjectSelect || !languageModeWrap || !languageModeSelect) return;
    const { examType, subject, streamChoice } = getCurrentFilters();
    const shouldShow = NON_LANGUAGE_SUBJECTS.has(subject);
    state.availableLanguages = [];
    languageModeWrap.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) {
      languageModeSelect.value = "";
      languageModeSelect.disabled = false;
      return;
    }

    const previous = languageModeSelect.value || "";
    const query = { examType, subject };
    if (examType === "PSTET_2" && streamChoice) query.streamChoice = streamChoice;

    try {
      const data = await apiRequest({
        path: "/student/mock-tests",
        token,
        query,
      });
      const tests = data.mockTests || [];
      const languageModes = sortLanguageModes(
        [...new Set(tests.map((item) => item.languageMode).filter(Boolean))]
      );
      state.availableLanguages = languageModes;

      if (!languageModes.length) {
        languageModeSelect.innerHTML = `<option value="">No language tests available</option>`;
        languageModeSelect.value = "";
        languageModeSelect.disabled = true;
        return;
      }

      languageModeSelect.disabled = false;
      languageModeSelect.innerHTML = languageModes
        .map((mode) => `<option value="${mode}">${escapeHtml(LANGUAGE_LABELS[mode] || mode)}</option>`)
        .join("");
      languageModeSelect.value = languageModes.includes(previous) ? previous : languageModes[0];
    } catch (error) {
      languageModeSelect.innerHTML = `<option value="">No language tests available</option>`;
      languageModeSelect.value = "";
      languageModeSelect.disabled = true;
      state.availableLanguages = [];
      throw error;
    }
  };

  const loadHistory = async () => {
    const data = await apiRequest({ path: "/student/history", token });
    state.history = data.attempts || [];
  };

  const loadTests = async () => {
    const { examType, subject, streamChoice } = getCurrentFilters();
    const languageMode = NON_LANGUAGE_SUBJECTS.has(subject)
      ? languageModeSelect?.value || undefined
      : undefined;

    const query = { examType, subject };
    if (examType === "PSTET_2" && streamChoice) query.streamChoice = streamChoice;
    if (NON_LANGUAGE_SUBJECTS.has(subject)) {
      if (!state.availableLanguages.length) {
        state.tests = [];
        renderTests();
        setStatus("No language test available for selected subject.", "error");
        return;
      }
      if (!languageMode) {
        throw new Error("Select language mode for this subject.");
      }
      query.languageMode = languageMode;
    }

    const data = await apiRequest({
      path: "/student/mock-tests",
      token,
      query,
    });
    state.tests = data.mockTests || [];
    renderTests();
  };

  const startAttempt = async (mockTestId) => {
    const data = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId },
    });
    const attemptId = data?.attempt?.id;
    if (!attemptId) {
      throw new Error("Failed to start attempt");
    }
    const attemptPagePath = await resolveAttemptPagePath();
    const separator = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${separator}attemptId=${encodeURIComponent(attemptId)}`;
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (examTypeSelect) {
    examTypeSelect.addEventListener("change", async () => {
      try {
        await fillSubjects();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load language options", "error");
      }
    });
  }

  if (streamSelect) {
    streamSelect.addEventListener("change", async () => {
      try {
        await fillSubjects();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load language options", "error");
      }
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener("change", async () => {
      try {
        await toggleLanguageMode();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load language options", "error");
      }
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", async () => {
      try {
        setStatus("Loading tests...");
        await loadTests();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load tests", "error");
      }
    });
  }

  if (testsContainer) {
    testsContainer.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const startButton = target.closest("[data-start-test]");
      if (!(startButton instanceof HTMLElement)) return;
      const mockTestId = startButton.getAttribute("data-start-test");
      if (!mockTestId) return;

      try {
        setStatus("Starting attempt...");
        await startAttempt(mockTestId);
      } catch (error) {
        setStatus(error.message || "Unable to start attempt", "error");
      }
    });
  }

  try {
    setStatus("Loading your mock test dashboard...");
    await fillSubjects();
    await loadHistory();
    await loadTests();
    setStatus(
      `Welcome ${user.name}. Last history sync: ${formatDateTime(new Date().toISOString())}`,
      "success"
    );
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error.message || "Unable to load mock tests", "error");
  }
});
