import {
  EXAM_LABELS,
  STREAM_LABELS,
  apiRequest,
  clearAuth,
  requireRoleGuard,
} from "./mock-api.js?v=2";

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/mock-test-registration");
  const candidates = prefersExtensionless
    ? ["./mock-attempt", "./mock-attempt.html"]
    : ["./mock-attempt.html", "./mock-attempt"];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (response.ok) return candidate;
    } catch {
      // continue
    }
  }
  return candidates[0];
};

const TIME_LABELS = {
  "09:00": "09:00 am",
  "17:00": "05:00 pm",
};

const formatDateLabel = (value) => {
  const date = new Date(`${String(value || "")}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token, user } = auth;

  const requestedMockTestId = String(new URLSearchParams(window.location.search).get("mockTestId") || "").trim();

  const statusEl = document.querySelector("#registrationStatus");
  const titleEl = document.querySelector("#registrationTitle");
  const descriptionEl = document.querySelector("#registrationDescription");
  const attemptsInfoEl = document.querySelector("#registrationAttemptsInfo");
  const bannerWrap = document.querySelector("#registrationBannerWrap");
  const bannerImage = document.querySelector("#registrationBannerImage");
  const form = document.querySelector("#registrationForm");
  const mockChoiceInput = document.querySelector("#regMockTestChoice");
  const pstet2SubjectWrap = document.querySelector("#regPstet2SubjectWrap");
  const pstet2SubjectInput = document.querySelector("#regPstet2Subject");
  const fullNameInput = document.querySelector("#regFullName");
  const mobileInput = document.querySelector("#regMobile");
  const emailInput = document.querySelector("#regEmail");
  const preferredDateInput = document.querySelector("#regPreferredDate");
  const timeSlotInputs = Array.from(document.querySelectorAll('input[name="regTimeSlot"]'));
  const startAttemptBtn = document.querySelector("#startAttemptBtn");
  const buyMockBtn = document.querySelector("#buyMockBtn");

  const state = {
    options: [],
    selectedMockTestId: "",
  };

  const setStatus = (text, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const selectedOption = () =>
    state.options.find((item) => item.mockTestId === state.selectedMockTestId) || null;

  const getSelectedTimeSlot = () => {
    const checked = timeSlotInputs.find((input) => input instanceof HTMLInputElement && input.checked);
    return checked instanceof HTMLInputElement ? checked.value : "";
  };

  const setSelectedTimeSlot = (value) => {
    const normalized = String(value || "").trim();
    timeSlotInputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.checked = input.value === normalized;
    });
  };

  const renderMockOptions = () => {
    if (!(mockChoiceInput instanceof HTMLSelectElement)) return;
    if (!state.options.length) {
      mockChoiceInput.innerHTML = '<option value="">No pending mock registrations</option>';
      return;
    }

    mockChoiceInput.innerHTML = state.options
      .map((item) => {
        const examLabel = EXAM_LABELS[item.examType] || item.examType || "Mock";
        const streamLabel = item.examType === "PSTET_2" && item.streamChoice
          ? ` / ${STREAM_LABELS[item.streamChoice] || item.streamChoice}`
          : "";
        const chanceText = item.hasPaidAccess
          ? "Paid access"
          : `Pending ${Math.max(0, Number(item.remainingAttempts || 0))} chance(s)`;
        const label = `${examLabel}${streamLabel} - ${chanceText} - ${item.mockTestTitle || item.title || "Mock test"}`;
        return `<option value="${item.mockTestId}">${label}</option>`;
      })
      .join("");

    const hasRequested = state.options.some((item) => item.mockTestId === requestedMockTestId);
    const firstPending = state.options.find((item) => Number(item.remainingAttempts || 0) > 0 && !item.hasPaidAccess);
    const nextChoice = hasRequested
      ? requestedMockTestId
      : (firstPending?.mockTestId || state.options[0]?.mockTestId || "");

    state.selectedMockTestId = nextChoice;
    mockChoiceInput.value = nextChoice;
  };

  const renderSelectedOption = () => {
    const option = selectedOption();
    if (!option) return;

    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = option.title || option.mockTestTitle || "Mock Registration";
    }
    if (descriptionEl instanceof HTMLElement) {
      descriptionEl.textContent = option.description || "";
    }
    if (attemptsInfoEl instanceof HTMLElement) {
      if (option.hasPaidAccess) {
        attemptsInfoEl.textContent = "You already have paid access. Unlimited attempts available.";
      } else {
        attemptsInfoEl.textContent = `Free chances: ${option.freeAttemptLimit} | Used: ${option.usedAttempts} | Remaining: ${option.remainingAttempts}`;
      }
    }
    if (bannerWrap instanceof HTMLElement && bannerImage instanceof HTMLImageElement) {
      const imageUrl = String(option.popupImageUrl || "").trim();
      if (imageUrl) {
        bannerImage.src = imageUrl;
        bannerWrap.classList.remove("hidden");
      } else {
        bannerWrap.classList.add("hidden");
      }
    }

    const isPstet2 = String(option.examType || "") === "PSTET_2";
    if (pstet2SubjectWrap instanceof HTMLElement) {
      pstet2SubjectWrap.classList.toggle("hidden", !isPstet2);
    }
    if (pstet2SubjectInput instanceof HTMLSelectElement) {
      if (isPstet2) {
        const preferred = String(option.preferredStreamChoice || option.streamChoice || "").trim();
        pstet2SubjectInput.value = preferred || "";
      } else {
        pstet2SubjectInput.value = "";
      }
    }

    if (preferredDateInput instanceof HTMLInputElement) {
      preferredDateInput.value = String(option.preferredDate || "").trim();
    }
    setSelectedTimeSlot(option.preferredTimeSlot || "");

    if (startAttemptBtn instanceof HTMLButtonElement) {
      startAttemptBtn.disabled = !option.isRegistered;
    }
  };

  const loadOptions = async () => {
    const data = await apiRequest({
      path: "/student/mock-registrations/options",
      token,
    });
    state.options = Array.isArray(data?.options) ? data.options : [];
    renderMockOptions();
    renderSelectedOption();
  };

  const startAttempt = async () => {
    const option = selectedOption();
    if (!option?.mockTestId) throw new Error("Please select mock chance first.");

    const data = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId: option.mockTestId },
    });
    const attemptId = String(data?.attempt?.id || "").trim();
    if (!attemptId) throw new Error("Unable to start attempt.");
    const attemptPagePath = await resolveAttemptPagePath();
    const sep = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${sep}attemptId=${encodeURIComponent(attemptId)}`;
  };

  if (fullNameInput instanceof HTMLInputElement) {
    fullNameInput.value = String(user?.name || "").trim();
  }
  if (mobileInput instanceof HTMLInputElement) {
    mobileInput.value = String(user?.mobile || "").trim();
  }
  if (emailInput instanceof HTMLInputElement) {
    emailInput.value = String(user?.email || "").trim();
  }

  if (mockChoiceInput instanceof HTMLSelectElement) {
    mockChoiceInput.addEventListener("change", () => {
      state.selectedMockTestId = String(mockChoiceInput.value || "").trim();
      renderSelectedOption();
    });
  }

  timeSlotInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      timeSlotInputs.forEach((other) => {
        if (!(other instanceof HTMLInputElement)) return;
        if (other !== input) other.checked = false;
      });
    });
  });

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const option = selectedOption();
        if (!option?.mockTestId) throw new Error("Please select mock chance.");

        const isPstet2 = String(option.examType || "") === "PSTET_2";
        const preferredStreamChoice = String(pstet2SubjectInput?.value || "").trim();
        const preferredDate = String(preferredDateInput?.value || "").trim();
        const preferredTimeSlot = getSelectedTimeSlot();

        if (!preferredDate) throw new Error("Please select preferred date.");
        if (!preferredTimeSlot) throw new Error("Please select preferred time.");
        if (isPstet2 && !preferredStreamChoice) {
          throw new Error("Please select PSTET-2 subject: SST or SCI/MATHS.");
        }

        setStatus("Saving registration...");
        await apiRequest({
          path: `/student/mock-tests/${encodeURIComponent(option.mockTestId)}/register`,
          method: "POST",
          token,
          body: {
            fullName: String(fullNameInput?.value || "").trim(),
            mobile: String(mobileInput?.value || "").trim(),
            email: String(emailInput?.value || "").trim() || undefined,
            preferredExamType: option.examType,
            preferredStreamChoice: isPstet2 ? preferredStreamChoice : undefined,
            preferredDate,
            preferredTimeSlot,
          },
        });

        await loadOptions();

        const examLabel = EXAM_LABELS[option.examType] || option.examType || "Mock";
        const streamLabel = isPstet2
          ? ` (${STREAM_LABELS[preferredStreamChoice] || preferredStreamChoice})`
          : "";
        const timeLabel = TIME_LABELS[preferredTimeSlot] || preferredTimeSlot;
        const dateLabel = formatDateLabel(preferredDate);
        setStatus(
          `Congratulations! You have registered successfully for mock ${examLabel}${streamLabel} at ${timeLabel} on ${dateLabel}.`,
          "success"
        );
      } catch (error) {
        setStatus(error?.message || "Unable to save registration.", "error");
      }
    });
  }

  if (startAttemptBtn instanceof HTMLButtonElement) {
    startAttemptBtn.addEventListener("click", async () => {
      try {
        setStatus("Starting attempt...");
        await startAttempt();
      } catch (error) {
        const payload = error?.payload || {};
        const errorCode = String(payload?.code || "").trim();
        if (error?.status === 401 || error?.status === 403) {
          if (errorCode === "MOCK_REG_REQUIRED") {
            setStatus("Please complete registration first.", "error");
            return;
          }
        }
        if (error?.status === 402 || errorCode === "MOCK_ATTEMPTS_EXHAUSTED") {
          const buyNowUrl = String(payload?.details?.buyNowUrl || "").trim();
          if (buyNowUrl) {
            window.location.href = buyNowUrl;
            return;
          }
          setStatus(error?.message || "Free attempts exhausted. Please buy mock.", "error");
          return;
        }
        setStatus(error?.message || "Unable to start attempt.", "error");
      }
    });
  }

  if (buyMockBtn instanceof HTMLButtonElement) {
    buyMockBtn.addEventListener("click", () => {
      const option = selectedOption();
      const url = String(option?.buyNowUrl || "").trim();
      if (url) {
        window.location.href = url;
        return;
      }
      window.location.href = "./products.html";
    });
  }

  try {
    setStatus("Loading registration details...");
    await loadOptions();
    if (!state.options.length) {
      setStatus("No active mock registration is available right now.", "error");
      return;
    }
    setStatus("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error?.message || "Unable to load registration details.", "error");
  }
});
