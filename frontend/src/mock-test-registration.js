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

const toScheduleTimestamp = (dateValue, timeValue) => {
  const dateText = String(dateValue || "").trim();
  const timeText = String(timeValue || "").trim();
  if (!dateText) return Number.NaN;
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeText) ? timeText : "00:00";
  const stamp = Date.parse(`${dateText}T${normalizedTime}:00`);
  return Number.isFinite(stamp) ? stamp : Number.NaN;
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
  const reminderCard = document.querySelector("#registrationReminderCard");
  const reminderTitleEl = document.querySelector("#registrationReminderTitle");
  const reminderWhenEl = document.querySelector("#registrationReminderWhen");
  const bannerWrap = document.querySelector("#registrationBannerWrap");
  const bannerImage = document.querySelector("#registrationBannerImage");
  const form = document.querySelector("#registrationForm");
  const examTypeInput = document.querySelector("#regExamType");
  const mockChanceInfoInput = document.querySelector("#regMockChanceInfo");
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
    selectedExamType: "",
    selectedStreamChoice: "",
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

  const setTimeSlotDisabled = (disabled) => {
    timeSlotInputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.disabled = Boolean(disabled);
    });
  };

  const getOptionStream = (option) =>
    String(option?.preferredStreamChoice || option?.streamChoice || "")
      .trim()
      .toUpperCase();

  const getOptionExam = (option) => String(option?.examType || "").trim().toUpperCase();

  const getFilteredOptions = () => {
    const exam = String(state.selectedExamType || "").trim().toUpperCase();
    const stream = String(state.selectedStreamChoice || "").trim().toUpperCase();
    let rows = state.options.slice();
    if (exam) {
      rows = rows.filter((item) => getOptionExam(item) === exam);
    }
    if (exam === "PSTET_2" && stream) {
      rows = rows.filter((item) => getOptionStream(item) === stream);
    }
    return rows;
  };

  const pickBestOption = (rows) => {
    if (!rows.length) return null;
    const now = Date.now();
    const withTs = rows.map((item) => {
      const date = String(item.preferredDate || item.scheduledDate || "").trim();
      const time = String(item.preferredTimeSlot || item.scheduledTimeSlot || "").trim();
      return {
        item,
        ts: toScheduleTimestamp(date, time),
      };
    });

    const requested = withTs.find((row) => row.item.mockTestId === requestedMockTestId);
    if (requested) return requested.item;

    const upcomingRegistered = withTs
      .filter((row) => row.item.isRegistered && Number.isFinite(row.ts) && row.ts > now)
      .sort((a, b) => a.ts - b.ts)[0];
    if (upcomingRegistered) return upcomingRegistered.item;

    const registered = rows.find((item) => item.isRegistered);
    if (registered) return registered;

    const pending = rows.find((item) => !item.hasPaidAccess && Number(item.remainingAttempts || 0) > 0);
    if (pending) return pending;

    return rows[0];
  };

  const renderExamTypeOptions = () => {
    if (!(examTypeInput instanceof HTMLSelectElement)) return;
    const unique = Array.from(new Set(state.options.map((item) => getOptionExam(item)).filter(Boolean)));
    const sorted = unique.sort((a, b) => {
      if (a === b) return 0;
      if (a === "PSTET_1") return -1;
      if (b === "PSTET_1") return 1;
      return a.localeCompare(b);
    });
    examTypeInput.innerHTML = [
      '<option value="">Select test type</option>',
      ...sorted.map((code) => `<option value="${code}">${EXAM_LABELS[code] || code}</option>`),
    ].join("");

    if (!state.selectedExamType || !sorted.includes(state.selectedExamType)) {
      state.selectedExamType = sorted[0] || "";
    }
    examTypeInput.value = state.selectedExamType;
  };

  const renderStreamOptions = () => {
    const isPstet2 = state.selectedExamType === "PSTET_2";
    if (pstet2SubjectWrap instanceof HTMLElement) {
      pstet2SubjectWrap.classList.toggle("hidden", !isPstet2);
    }
    if (!(pstet2SubjectInput instanceof HTMLSelectElement)) return;
    if (!isPstet2) {
      pstet2SubjectInput.value = "";
      state.selectedStreamChoice = "";
      return;
    }

    const streams = Array.from(
      new Set(
        state.options
          .filter((item) => getOptionExam(item) === "PSTET_2")
          .map((item) => getOptionStream(item))
          .filter((value) => value === "SOCIAL_STUDIES" || value === "SCIENCE_MATH")
      )
    );

    pstet2SubjectInput.innerHTML = [
      '<option value="">Select PSTET-2 Subject</option>',
      ...streams.map((code) => {
        const label = code === "SOCIAL_STUDIES" ? "SST" : "SCI/MATHS";
        return `<option value="${code}">${label}</option>`;
      }),
    ].join("");

    if (!state.selectedStreamChoice || !streams.includes(state.selectedStreamChoice)) {
      state.selectedStreamChoice = streams[0] || "";
    }
    pstet2SubjectInput.value = state.selectedStreamChoice;
  };

  const renderReminderCard = (option) => {
    if (!(reminderCard instanceof HTMLElement) || !(reminderTitleEl instanceof HTMLElement) || !(reminderWhenEl instanceof HTMLElement)) {
      return;
    }
    if (!option?.isRegistered) {
      reminderCard.classList.add("hidden");
      return;
    }

    const reminderDate = String(option.preferredDate || option.scheduledDate || "").trim();
    const reminderTime = String(option.preferredTimeSlot || option.scheduledTimeSlot || "").trim();
    const scheduleTs = toScheduleTimestamp(reminderDate, reminderTime);
    if (!Number.isFinite(scheduleTs) || scheduleTs <= Date.now()) {
      reminderCard.classList.add("hidden");
      return;
    }

    const timeLabel = TIME_LABELS[reminderTime] || reminderTime || "Time pending";
    reminderTitleEl.textContent = option.title || option.mockTestTitle || "Upcoming Mock Test";
    reminderWhenEl.textContent = `${formatDateLabel(reminderDate)} | ${timeLabel}`;
    reminderCard.classList.remove("hidden");
  };

  const applySelectionByFilters = () => {
    const filtered = getFilteredOptions();
    const picked = pickBestOption(filtered);
    state.selectedMockTestId = picked?.mockTestId || "";
  };

  const renderSelectedOption = () => {
    const option = selectedOption();

    if (!option) {
      if (titleEl instanceof HTMLElement) titleEl.textContent = "Mock Test Registration";
      if (descriptionEl instanceof HTMLElement) descriptionEl.textContent = "";
      if (attemptsInfoEl instanceof HTMLElement) attemptsInfoEl.textContent = "No mock registration option available.";
      if (mockChanceInfoInput instanceof HTMLInputElement) mockChanceInfoInput.value = "No pending mock registrations";
      if (bannerWrap instanceof HTMLElement) bannerWrap.classList.add("hidden");
      if (startAttemptBtn instanceof HTMLButtonElement) startAttemptBtn.disabled = true;
      if (reminderCard instanceof HTMLElement) reminderCard.classList.add("hidden");
      return;
    }

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

    if (mockChanceInfoInput instanceof HTMLInputElement) {
      const examLabel = EXAM_LABELS[option.examType] || option.examType || "Mock";
      const stream = getOptionStream(option);
      const streamLabel = option.examType === "PSTET_2" && stream
        ? ` / ${stream === "SOCIAL_STUDIES" ? "SST" : "SCI/MATHS"}`
        : "";
      const chanceText = option.hasPaidAccess
        ? "Paid access"
        : `Pending ${Math.max(0, Number(option.remainingAttempts || 0))} chance(s)`;
      mockChanceInfoInput.value = `${examLabel}${streamLabel} | ${chanceText}`;
    }

    if (bannerWrap instanceof HTMLElement && bannerImage instanceof HTMLImageElement) {
      const imageUrl = String(option.popupImageUrl || option.mockThumbnailUrl || "").trim();
      if (imageUrl) {
        bannerImage.src = imageUrl;
        bannerWrap.classList.remove("hidden");
      } else {
        bannerWrap.classList.add("hidden");
      }
    }

    const scheduleDate = String(option.scheduledDate || "").trim();
    const scheduleTime = String(option.scheduledTimeSlot || "").trim();

    if (preferredDateInput instanceof HTMLInputElement) {
      const selectedDate = String(option.preferredDate || scheduleDate || "").trim();
      preferredDateInput.value = selectedDate;
      preferredDateInput.disabled = Boolean(scheduleDate);
    }

    if (scheduleTime) {
      setSelectedTimeSlot(scheduleTime);
      setTimeSlotDisabled(true);
    } else {
      setSelectedTimeSlot(option.preferredTimeSlot || "");
      setTimeSlotDisabled(false);
    }

    renderReminderCard(option);

    if (startAttemptBtn instanceof HTMLButtonElement) {
      startAttemptBtn.disabled = !option.isRegistered;
    }
  };

  const hydrateFiltersFromOption = (option) => {
    if (!option) return;
    state.selectedExamType = getOptionExam(option);
    state.selectedStreamChoice = getOptionStream(option);
  };

  const loadOptions = async () => {
    const data = await apiRequest({
      path: "/student/mock-registrations/options",
      token,
    });
    state.options = Array.isArray(data?.options) ? data.options : [];

    if (!state.options.length) {
      renderExamTypeOptions();
      renderStreamOptions();
      state.selectedMockTestId = "";
      renderSelectedOption();
      return;
    }

    const requested = state.options.find((item) => item.mockTestId === requestedMockTestId);
    const defaultOption = requested || pickBestOption(state.options);
    if (!state.selectedExamType && defaultOption) {
      hydrateFiltersFromOption(defaultOption);
    }

    renderExamTypeOptions();
    renderStreamOptions();
    applySelectionByFilters();

    const selected = selectedOption();
    if (selected) {
      hydrateFiltersFromOption(selected);
      if (examTypeInput instanceof HTMLSelectElement) examTypeInput.value = state.selectedExamType;
      if (pstet2SubjectInput instanceof HTMLSelectElement && state.selectedExamType === "PSTET_2") {
        pstet2SubjectInput.value = state.selectedStreamChoice;
      }
    }

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

  if (examTypeInput instanceof HTMLSelectElement) {
    examTypeInput.addEventListener("change", () => {
      state.selectedExamType = String(examTypeInput.value || "").trim().toUpperCase();
      if (state.selectedExamType !== "PSTET_2") {
        state.selectedStreamChoice = "";
      }
      renderStreamOptions();
      applySelectionByFilters();
      renderSelectedOption();
    });
  }

  if (pstet2SubjectInput instanceof HTMLSelectElement) {
    pstet2SubjectInput.addEventListener("change", () => {
      state.selectedStreamChoice = String(pstet2SubjectInput.value || "").trim().toUpperCase();
      applySelectionByFilters();
      renderSelectedOption();
    });
  }

  timeSlotInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener("change", () => {
      if (input.disabled) return;
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

        const selectedExamType = String(state.selectedExamType || option.examType || "").trim().toUpperCase();
        const isPstet2 = selectedExamType === "PSTET_2";
        const preferredStreamChoice = String(pstet2SubjectInput?.value || "").trim().toUpperCase();
        const preferredDate = String(preferredDateInput?.value || "").trim();
        const preferredTimeSlot = getSelectedTimeSlot();

        if (!selectedExamType) throw new Error("Please select test type.");
        if (isPstet2 && !preferredStreamChoice) {
          throw new Error("Please select PSTET-2 subject: SST or SCI/MATHS.");
        }
        if (!preferredDate) throw new Error("Please select preferred date.");
        if (!preferredTimeSlot) throw new Error("Please select preferred time.");

        setStatus("Saving registration...");
        await apiRequest({
          path: `/student/mock-tests/${encodeURIComponent(option.mockTestId)}/register`,
          method: "POST",
          token,
          body: {
            fullName: String(fullNameInput?.value || "").trim(),
            mobile: String(mobileInput?.value || "").trim(),
            email: String(emailInput?.value || "").trim() || undefined,
            preferredExamType: selectedExamType,
            preferredStreamChoice: isPstet2 ? preferredStreamChoice : undefined,
            preferredDate,
            preferredTimeSlot,
          },
        });

        await loadOptions();

        const selectedAfterSave = selectedOption() || option;
        const examLabel = EXAM_LABELS[selectedExamType] || selectedExamType || "Mock";
        const streamLabel = isPstet2
          ? ` (${preferredStreamChoice === "SOCIAL_STUDIES" ? "SST" : "SCI/MATHS"})`
          : "";
        const timeLabel = TIME_LABELS[preferredTimeSlot] || preferredTimeSlot;
        const dateLabel = formatDateLabel(preferredDate);
        const mockName = selectedAfterSave.title || selectedAfterSave.mockTestTitle || "Mock test";
        setStatus(
          `Congratulations! You have registered successfully for ${mockName} (${examLabel}${streamLabel}) at ${timeLabel} on ${dateLabel}.`,
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
