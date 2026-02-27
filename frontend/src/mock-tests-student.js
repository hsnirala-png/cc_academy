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
} from "./mock-api.js?v=2";

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
    activeRegistrationTestId: "",
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

  const getRegistrationState = (mockTestId) => {
    const test = state.tests.find((item) => item.id === mockTestId);
    return test?.registration || null;
  };

  const resolveRegistrationBuyUrl = (registration) => {
    const buyNowUrl = String(registration?.buyNowUrl || "").trim();
    if (buyNowUrl) return buyNowUrl;
    return "./products.html";
  };

  const ensureRegistrationModal = () => {
    let modal = document.querySelector("#mockRegistrationModal");
    if (!(modal instanceof HTMLElement)) {
      modal = document.createElement("div");
      modal.id = "mockRegistrationModal";
      modal.className = "mock-registration-modal hidden";
      modal.innerHTML = `
        <div class="mock-registration-dialog" role="dialog" aria-modal="true" aria-labelledby="mockRegTitle">
          <button type="button" class="mock-registration-close" data-close-reg-modal aria-label="Close">x</button>
          <div id="mockRegBannerWrap" class="mock-registration-banner-wrap hidden">
            <img id="mockRegBanner" alt="Mock registration banner" />
          </div>
          <h3 id="mockRegTitle">Mock Registration</h3>
          <p id="mockRegDescription" class="dash-k"></p>
          <p id="mockRegAttemptsInfo" class="dash-k"></p>
          <form id="mockRegForm" class="mock-filter-grid">
            <div class="field">
              <label for="mockRegFullName">Full Name</label>
              <input id="mockRegFullName" required />
            </div>
            <div class="field">
              <label for="mockRegMobile">Mobile</label>
              <input id="mockRegMobile" required />
            </div>
            <div class="field">
              <label for="mockRegEmail">Email (optional)</label>
              <input id="mockRegEmail" type="email" />
            </div>
            <div class="field filter-action">
              <button class="btn-primary" type="submit">Register & Start</button>
            </div>
          </form>
          <div class="mock-registration-actions">
            <a id="mockRegPageLink" class="btn-ghost" href="./mock-test-registration.html">Open Full Registration Page</a>
            <button id="mockRegBuyNowBtn" type="button" class="btn-secondary">Buy Mock</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  };

  const closeRegistrationModal = () => {
    const modal = document.querySelector("#mockRegistrationModal");
    if (modal instanceof HTMLElement) {
      modal.classList.add("hidden");
      state.activeRegistrationTestId = "";
    }
  };

  const openRegistrationModal = (mockTestId) => {
    const test = state.tests.find((item) => item.id === mockTestId);
    if (!test?.registration) return;
    const registration = test.registration;
    const modal = ensureRegistrationModal();
    state.activeRegistrationTestId = mockTestId;

    const titleEl = modal.querySelector("#mockRegTitle");
    const descEl = modal.querySelector("#mockRegDescription");
    const attemptsEl = modal.querySelector("#mockRegAttemptsInfo");
    const bannerWrap = modal.querySelector("#mockRegBannerWrap");
    const banner = modal.querySelector("#mockRegBanner");
    const fullNameInput = modal.querySelector("#mockRegFullName");
    const mobileInput = modal.querySelector("#mockRegMobile");
    const emailInput = modal.querySelector("#mockRegEmail");
    const pageLink = modal.querySelector("#mockRegPageLink");
    const buyNowBtn = modal.querySelector("#mockRegBuyNowBtn");

    if (titleEl instanceof HTMLElement) titleEl.textContent = registration.title || test.title || "Mock Registration";
    if (descEl instanceof HTMLElement) descEl.textContent = registration.description || "";
    if (attemptsEl instanceof HTMLElement) {
      if (registration.hasPaidAccess) {
        attemptsEl.textContent = "Paid access detected. Unlimited attempts available.";
      } else {
        attemptsEl.textContent = `Free chances: ${registration.freeAttemptLimit} | Used: ${registration.usedAttempts} | Remaining: ${registration.remainingAttempts}`;
      }
    }
    if (bannerWrap instanceof HTMLElement && banner instanceof HTMLImageElement) {
      const imageUrl = String(registration.popupImageUrl || "").trim();
      if (imageUrl) {
        banner.src = imageUrl;
        bannerWrap.classList.remove("hidden");
      } else {
        bannerWrap.classList.add("hidden");
      }
    }
    if (fullNameInput instanceof HTMLInputElement) fullNameInput.value = user?.name || "";
    if (mobileInput instanceof HTMLInputElement) mobileInput.value = user?.mobile || "";
    if (emailInput instanceof HTMLInputElement) emailInput.value = user?.email || "";
    if (pageLink instanceof HTMLAnchorElement) {
      pageLink.href = registration.registrationPageUrl || `./mock-test-registration.html?mockTestId=${encodeURIComponent(mockTestId)}`;
    }
    if (buyNowBtn instanceof HTMLButtonElement) {
      buyNowBtn.onclick = () => {
        window.location.href = resolveRegistrationBuyUrl(registration);
      };
    }

    const closeBtn = modal.querySelector("[data-close-reg-modal]");
    if (closeBtn instanceof HTMLButtonElement) {
      closeBtn.onclick = () => closeRegistrationModal();
    }

    modal.classList.remove("hidden");
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
        const registration = test.registration && test.registration.enabled ? test.registration : null;
        const registrationLine = registration
          ? registration.hasPaidAccess
            ? `<p class="mock-test-meta">Registration: Paid access unlocked.</p>`
            : `<p class="mock-test-meta">Registration: Free ${registration.freeAttemptLimit}, Used ${registration.usedAttempts}, Remaining ${registration.remainingAttempts}</p>`
          : "";
        const registrationActions = registration
          ? `
              <button class="btn-ghost" data-open-registration="${test.id}" type="button">
                ${registration.isRegistered ? "Edit Registration" : "Register"}
              </button>
              <a class="btn-ghost" href="${escapeHtml(
                registration.registrationPageUrl || `./mock-test-registration.html?mockTestId=${encodeURIComponent(test.id)}`
              )}">Registration Page</a>
            `
          : "";

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
            ${registrationLine}
            <div class="mock-test-badges">
              <span class="chip ${test.isActive ? "active" : "inactive"}">${
          test.isActive ? "Active" : "Inactive"
        }</span>
              ${getHistoryBadge(test.id)}
            </div>
            <div class="mock-test-actions">
              ${registrationActions}
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

  const registerForMockTest = async (mockTestId, payload) => {
    await apiRequest({
      path: `/student/mock-tests/${encodeURIComponent(mockTestId)}/register`,
      method: "POST",
      token,
      body: payload,
    });
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
      const openRegistrationBtn = target.closest("[data-open-registration]");
      if (openRegistrationBtn instanceof HTMLElement) {
        const mockTestId = openRegistrationBtn.getAttribute("data-open-registration");
        if (!mockTestId) return;
        openRegistrationModal(mockTestId);
        return;
      }

      const startButton = target.closest("[data-start-test]");
      if (!(startButton instanceof HTMLElement)) return;
      const mockTestId = startButton.getAttribute("data-start-test");
      if (!mockTestId) return;

      try {
        const registration = getRegistrationState(mockTestId);
        if (registration?.enabled) {
          if (!registration.isRegistered) {
            setStatus("Please complete registration first.", "error");
            openRegistrationModal(mockTestId);
            return;
          }
          if (!registration.hasPaidAccess && Number(registration.remainingAttempts || 0) <= 0) {
            setStatus("Free attempts completed. Please buy mock to continue.", "error");
            window.location.href = resolveRegistrationBuyUrl(registration);
            return;
          }
        }

        setStatus("Starting attempt...");
        await startAttempt(mockTestId);
      } catch (error) {
        const payload = error?.payload || {};
        const errorCode = String(payload?.code || "").trim();
        if (errorCode === "MOCK_REG_REQUIRED") {
          openRegistrationModal(mockTestId);
        }
        if (errorCode === "MOCK_ATTEMPTS_EXHAUSTED") {
          const buyNowUrl = String(payload?.details?.buyNowUrl || "").trim();
          if (buyNowUrl) {
            window.location.href = buyNowUrl;
            return;
          }
        }
        setStatus(error.message || "Unable to start attempt", "error");
      }
    });
  }

  const modal = ensureRegistrationModal();
  if (modal instanceof HTMLElement) {
    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target === modal) {
        closeRegistrationModal();
      }
    });
  }

  const modalForm = modal?.querySelector("#mockRegForm");
  if (modalForm instanceof HTMLFormElement) {
    modalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mockTestId = state.activeRegistrationTestId;
      if (!mockTestId) return;
      const fullNameInput = modalForm.querySelector("#mockRegFullName");
      const mobileInput = modalForm.querySelector("#mockRegMobile");
      const emailInput = modalForm.querySelector("#mockRegEmail");
      try {
        setStatus("Saving registration...");
        await registerForMockTest(mockTestId, {
          fullName: String(fullNameInput?.value || "").trim(),
          mobile: String(mobileInput?.value || "").trim(),
          email: String(emailInput?.value || "").trim() || undefined,
        });
        closeRegistrationModal();
        await loadTests();
        setStatus("Registration saved. Starting attempt...");
        await startAttempt(mockTestId);
      } catch (error) {
        setStatus(error.message || "Unable to save registration", "error");
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

