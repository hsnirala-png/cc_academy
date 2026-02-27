import {
  EXAM_LABELS,
  SUBJECT_LABELS,
  STREAM_LABELS,
  LANGUAGE_LABELS,
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  requireRoleGuardStrict,
} from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireRoleGuardStrict(null, "ADMIN");
  if (!auth) return;
  const { token } = auth;

  const messageEl = document.querySelector("#registrationMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const form = document.querySelector("#registrationForm");
  const registrationIdInput = document.querySelector("#registrationId");
  const mockTestIdInput = document.querySelector("#registrationMockTestId");
  const titleInput = document.querySelector("#registrationTitle");
  const descriptionInput = document.querySelector("#registrationDescription");
  const freeAttemptsInput = document.querySelector("#registrationFreeAttempts");
  const scheduledDateInput = document.querySelector("#registrationScheduledDate");
  const scheduledTimeInput = document.querySelector("#registrationScheduledTime");
  const buyUrlInput = document.querySelector("#registrationBuyUrl");
  const ctaLabelInput = document.querySelector("#registrationCtaLabel");
  const imageUrlInput = document.querySelector("#registrationImageUrl");
  const imageFileInput = document.querySelector("#registrationImageFile");
  const isActiveInput = document.querySelector("#registrationIsActive");
  const registrationPageLinkInput = document.querySelector("#registrationPageLink");
  const uploadBtn = document.querySelector("#registrationUploadBtn");
  const resetBtn = document.querySelector("#registrationResetBtn");
  const tableBody = document.querySelector("#registrationTableBody");
  const entriesBody = document.querySelector("#registrationEntriesBody");
  const entriesContext = document.querySelector("#registrationEntriesContext");

  const state = {
    mockTests: [],
    registrations: [],
    entries: [],
  };

  const setMessage = (text, type = "") => {
    if (!(messageEl instanceof HTMLElement)) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const examLabel = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "PSTET_1") return "PSTET-1";
    if (normalized === "PSTET_2") return "PSTET-2";
    return normalized || "-";
  };

  const streamLabel = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "SOCIAL_STUDIES") return "SST";
    if (normalized === "SCIENCE_MATH") return "SCI/MATHS";
    return normalized || "-";
  };

  const timeLabel = (value) => {
    const normalized = String(value || "").trim();
    if (normalized === "09:00") return "09:00 am";
    if (normalized === "17:00") return "05:00 pm";
    return normalized || "-";
  };

  const scheduleLabel = (dateValue, timeValue) => {
    const dateText = String(dateValue || "").trim();
    const timeText = timeLabel(timeValue);
    if (!dateText && (!timeValue || timeText === "-")) return "-";
    return `${dateText || "-"}${timeText && timeText !== "-" ? ` | ${timeText}` : ""}`;
  };

  const resolveRegistrationLink = (mockTestId) => {
    const id = String(mockTestId || "").trim();
    if (!id) return "";
    return `./mock-test-registration.html?mockTestId=${encodeURIComponent(id)}`;
  };

  const syncRegistrationLinkField = () => {
    if (!(registrationPageLinkInput instanceof HTMLInputElement)) return;
    registrationPageLinkInput.value = resolveRegistrationLink(mockTestIdInput?.value);
  };

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Unable to read file."));
      };
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });

  const resetForm = () => {
    if (registrationIdInput) registrationIdInput.value = "";
    if (form instanceof HTMLFormElement) form.reset();
    if (freeAttemptsInput instanceof HTMLInputElement) freeAttemptsInput.value = "1";
    if (scheduledDateInput instanceof HTMLInputElement) scheduledDateInput.value = "";
    if (scheduledTimeInput instanceof HTMLSelectElement) scheduledTimeInput.value = "";
    if (ctaLabelInput instanceof HTMLInputElement) ctaLabelInput.value = "Buy Mock";
    if (isActiveInput instanceof HTMLInputElement) isActiveInput.checked = true;
    syncRegistrationLinkField();
  };

  const renderMockTestOptions = () => {
    if (!(mockTestIdInput instanceof HTMLSelectElement)) return;
    const current = mockTestIdInput.value;
    mockTestIdInput.innerHTML = `
      <option value="">Select mock test</option>
      ${state.mockTests
        .map((test) => {
          const labels = [
            EXAM_LABELS[test.examType] || test.examType,
            SUBJECT_LABELS[test.subject] || test.subject,
          ];
          if (test.streamChoice) labels.push(STREAM_LABELS[test.streamChoice] || test.streamChoice);
          if (test.languageMode) labels.push(LANGUAGE_LABELS[test.languageMode] || test.languageMode);
          return `<option value="${escapeHtml(test.id)}">${escapeHtml(test.title)} (${escapeHtml(
            labels.join(" / ")
          )})</option>`;
        })
        .join("")}
    `;
    mockTestIdInput.value = state.mockTests.some((item) => item.id === current) ? current : "";
    syncRegistrationLinkField();
  };

  const renderRegistrations = () => {
    if (!(tableBody instanceof HTMLElement)) return;
    if (!state.registrations.length) {
      tableBody.innerHTML = `<tr><td colspan="8">No registration configs yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = state.registrations
      .map((item) => {
        const link = resolveRegistrationLink(item.mockTestId);
        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.mockTestTitle || item.title)}</strong><br />
              <small>${escapeHtml(item.title)}</small>
            </td>
            <td>${Number(item.freeAttemptLimit || 0)}</td>
            <td>${Number(item.registeredCount || 0)}</td>
            <td><span class="chip ${item.isActive ? "active" : "inactive"}">${
          item.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>${escapeHtml(scheduleLabel(item.scheduledDate, item.scheduledTimeSlot))}</td>
            <td><a href="${escapeHtml(link)}" target="_blank" rel="noopener">Open</a></td>
            <td>${escapeHtml(formatDateTime(item.updatedAt))}</td>
            <td class="table-actions">
              <button class="table-btn edit" data-edit-registration="${escapeHtml(item.id)}">Edit</button>
              <button class="table-btn" data-view-registration-entries="${escapeHtml(item.id)}">Entries</button>
              <button class="table-btn delete" data-delete-registration="${escapeHtml(item.id)}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderEntries = () => {
    if (!(entriesBody instanceof HTMLElement)) return;
    if (!state.entries.length) {
      entriesBody.innerHTML = `<tr><td colspan="9">No registrations yet for selected config.</td></tr>`;
      return;
    }
    entriesBody.innerHTML = state.entries
      .map(
        (entry) => `
          <tr>
            <td>${escapeHtml(entry.fullName || entry.userName || "-")}</td>
            <td>${escapeHtml(entry.mobile || entry.userMobile || "-")}</td>
            <td>${escapeHtml(entry.email || entry.userEmail || "-")}</td>
            <td>${escapeHtml(examLabel(entry.preferredExamType))}</td>
            <td>${escapeHtml(streamLabel(entry.preferredStreamChoice))}</td>
            <td>${escapeHtml(entry.preferredDate || "-")}</td>
            <td>${escapeHtml(timeLabel(entry.preferredTimeSlot))}</td>
            <td>${Number(entry.usedAttempts || 0)}</td>
            <td>${escapeHtml(formatDateTime(entry.createdAt))}</td>
          </tr>
        `
      )
      .join("");
  };

  const loadMockTests = async () => {
    const data = await apiRequest({
      path: "/admin/mock-tests",
      token,
    });
    const tests = Array.isArray(data?.mockTests) ? data.mockTests : [];
    state.mockTests = tests.filter(
      (item) => String(item?.accessCode || "").trim().toUpperCase() === "MOCK"
    );
    renderMockTestOptions();
    if (!state.mockTests.length) {
      setMessage("No MOCK access tests found. Set access code as MOCK in Digital Lessons > Tests.", "error");
    }
  };

  const loadRegistrations = async () => {
    const data = await apiRequest({
      path: "/admin/mock-test-registrations",
      token,
      query: { includeInactive: "true" },
    });
    state.registrations = Array.isArray(data?.registrations) ? data.registrations : [];
    renderRegistrations();
  };

  const loadEntries = async (registrationId) => {
    const data = await apiRequest({
      path: `/admin/mock-test-registrations/${encodeURIComponent(registrationId)}/entries`,
      token,
    });
    state.entries = Array.isArray(data?.entries) ? data.entries : [];
    renderEntries();
  };

  const fillForm = (registration) => {
    if (!registration) return;
    if (registrationIdInput) registrationIdInput.value = registration.id || "";
    if (mockTestIdInput) mockTestIdInput.value = registration.mockTestId || "";
    if (titleInput) titleInput.value = registration.title || "";
    if (descriptionInput) descriptionInput.value = registration.description || "";
    if (freeAttemptsInput) freeAttemptsInput.value = String(registration.freeAttemptLimit ?? 1);
    if (scheduledDateInput) scheduledDateInput.value = registration.scheduledDate || "";
    if (scheduledTimeInput) scheduledTimeInput.value = registration.scheduledTimeSlot || "";
    if (buyUrlInput) buyUrlInput.value = registration.buyNowUrl || "";
    if (ctaLabelInput) ctaLabelInput.value = registration.ctaLabel || "Buy Mock";
    if (imageUrlInput) imageUrlInput.value = registration.popupImageUrl || "";
    if (isActiveInput) isActiveInput.checked = Boolean(registration.isActive);
    syncRegistrationLinkField();
  };

  const readFormPayload = () => ({
    mockTestId: String(mockTestIdInput?.value || "").trim(),
    title: String(titleInput?.value || "").trim(),
    description: String(descriptionInput?.value || "").trim(),
    freeAttemptLimit: Number(freeAttemptsInput?.value || 0),
    scheduledDate: String(scheduledDateInput?.value || "").trim() || undefined,
    scheduledTimeSlot: String(scheduledTimeInput?.value || "").trim() || undefined,
    buyNowUrl: String(buyUrlInput?.value || "").trim(),
    ctaLabel: String(ctaLabelInput?.value || "").trim(),
    popupImageUrl: String(imageUrlInput?.value || "").trim(),
    isActive: Boolean(isActiveInput?.checked),
  });

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./admin-login.html";
    });
  }

  if (mockTestIdInput instanceof HTMLSelectElement) {
    mockTestIdInput.addEventListener("change", syncRegistrationLinkField);
  }

  if (uploadBtn instanceof HTMLButtonElement) {
    uploadBtn.addEventListener("click", async () => {
      try {
        const file = imageFileInput?.files?.[0];
        if (!file) {
          throw new Error("Please choose an image first.");
        }
        setMessage("Uploading banner image...");
        const dataUrl = await toDataUrl(file);
        const response = await apiRequest({
          path: "/admin/mock-test-registrations/banner-upload",
          method: "POST",
          token,
          body: { dataUrl },
        });
        const uploaded = String(response?.imageUrl || "").trim();
        if (!uploaded) throw new Error("Image upload failed.");
        if (imageUrlInput instanceof HTMLInputElement) {
          imageUrlInput.value = uploaded;
        }
        setMessage("Banner uploaded successfully.", "success");
      } catch (error) {
        setMessage(error?.message || "Unable to upload image.", "error");
      }
    });
  }

  if (resetBtn instanceof HTMLButtonElement) {
    resetBtn.addEventListener("click", () => {
      resetForm();
      setMessage("");
    });
  }

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const id = String(registrationIdInput?.value || "").trim();
        const payload = readFormPayload();
        if (!payload.mockTestId) throw new Error("Select mock test.");
        if (!payload.title) throw new Error("Popup title is required.");
        setMessage(id ? "Updating registration config..." : "Saving registration config...");

        if (id) {
          await apiRequest({
            path: `/admin/mock-test-registrations/${encodeURIComponent(id)}`,
            method: "PATCH",
            token,
            body: payload,
          });
        } else {
          await apiRequest({
            path: "/admin/mock-test-registrations",
            method: "POST",
            token,
            body: payload,
          });
        }

        await loadRegistrations();
        resetForm();
        setMessage("Registration config saved.", "success");
      } catch (error) {
        setMessage(error?.message || "Unable to save registration config.", "error");
      }
    });
  }

  if (tableBody instanceof HTMLElement) {
    tableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const editBtn = target.closest("[data-edit-registration]");
      if (editBtn instanceof HTMLElement) {
        const id = String(editBtn.getAttribute("data-edit-registration") || "").trim();
        const item = state.registrations.find((row) => row.id === id);
        fillForm(item);
        setMessage("Editing selected registration config.");
        return;
      }

      const entriesBtn = target.closest("[data-view-registration-entries]");
      if (entriesBtn instanceof HTMLElement) {
        const id = String(entriesBtn.getAttribute("data-view-registration-entries") || "").trim();
        const item = state.registrations.find((row) => row.id === id);
        if (entriesContext instanceof HTMLElement) {
          entriesContext.textContent = item
            ? `Students for: ${item.mockTestTitle || item.title}`
            : "Students for selected registration.";
        }
        setMessage("Loading registered students...");
        await loadEntries(id);
        setMessage("");
        return;
      }

      const deleteBtn = target.closest("[data-delete-registration]");
      if (deleteBtn instanceof HTMLElement) {
        const id = String(deleteBtn.getAttribute("data-delete-registration") || "").trim();
        if (!id) return;
        if (!window.confirm("Delete this registration config?")) return;
        setMessage("Deleting registration config...");
        await apiRequest({
          path: `/admin/mock-test-registrations/${encodeURIComponent(id)}`,
          method: "DELETE",
          token,
        });
        await loadRegistrations();
        if (registrationIdInput?.value === id) resetForm();
        state.entries = [];
        renderEntries();
        if (entriesContext instanceof HTMLElement) {
          entriesContext.textContent = "Select a registration config to view students.";
        }
        setMessage("Registration config deleted.", "success");
      }
    });
  }

  try {
    setMessage("Loading registration manager...");
    await Promise.all([loadMockTests(), loadRegistrations()]);
    renderEntries();
    resetForm();
    setMessage("Mock registration manager ready.", "success");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./admin-login.html";
      return;
    }
    setMessage(error?.message || "Unable to load registration manager.", "error");
  }
});
