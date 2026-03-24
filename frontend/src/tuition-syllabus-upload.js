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

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });

const getTeacherEntryPath = (syllabusId) =>
  `./tuition-chapters.html${syllabusId ? `?syllabusId=${encodeURIComponent(syllabusId)}` : ""}`;

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const statusEl = document.querySelector("#tuitionUploadStatus");
  const summaryEl = document.querySelector("#tuitionUploadSummary");
  const storedListEl = document.querySelector("#tuitionStoredSyllabi");
  const form = document.querySelector("#tuitionUploadForm");
  const saveProfileBtn = document.querySelector("#tuitionSaveProfileBtn");
  const activeSyllabusCta = document.querySelector("#tuitionActiveSyllabusCta");
  const boardSelect = document.querySelector("#tuitionBoardSelect");
  const classSelect = document.querySelector("#tuitionClassSelect");
  const subjectSelect = document.querySelector("#tuitionSubjectSelect");
  const languageSelect = document.querySelector("#tuitionLanguageSelect");
  const fileInput = document.querySelector("#tuitionFileInput");
  const fileMetaEl = document.querySelector("#tuitionFileMeta");
  const manualTextEl = document.querySelector("#tuitionManualText");
  const draftTitleEl = document.querySelector("#tuitionDraftTitle");

  let bootstrapState = null;

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const fillSelect = (select, items, valueKey, labelKey, placeholder) => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.innerHTML = [`<option value="">${placeholder}</option>`]
      .concat(
        items.map(
          (item) =>
            `<option value="${String(item?.[valueKey] || "")}">${String(
              item?.[labelKey] || item?.[valueKey] || ""
            )}</option>`
        )
      )
      .join("");
  };

  const renderSummary = (profile, bootstrap) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    const items = [
      ["Board", profile?.boardName || profile?.boardCode || "Not set"],
      ["Class", profile?.classLevel ? `Class ${profile.classLevel}` : "Not set"],
      ["Subject", profile?.subjectName || profile?.subjectCode || "Not set"],
      ["Language", profile?.preferredLanguage || "Not set"],
      [
        "Active Syllabus",
        profile?.activeSyllabusTitle
          ? `${profile.activeSyllabusTitle}${profile?.activeSyllabusConfirmed ? " (confirmed)" : ""}`
          : "No active syllabus yet",
      ],
      ["Stored Syllabi", String((bootstrap?.storedSyllabi || []).length || 0)],
    ];
    summaryEl.innerHTML = items
      .map(
        ([label, value]) => `
          <div class="tuition-summary-item">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `
      )
      .join("");

    if (activeSyllabusCta instanceof HTMLAnchorElement) {
      activeSyllabusCta.classList.toggle("hidden", !profile?.activeSyllabusId);
      activeSyllabusCta.href = getTeacherEntryPath(profile?.activeSyllabusId || "");
    }
  };

  const renderStoredSyllabi = (bootstrap) => {
    if (!(storedListEl instanceof HTMLElement)) return;
    const rows = Array.isArray(bootstrap?.storedSyllabi) ? bootstrap.storedSyllabi : [];
    if (!rows.length) {
      storedListEl.innerHTML = `<p class="tuition-empty-note">No stored syllabus yet. Upload one to start the chapter flow.</p>`;
      return;
    }

    storedListEl.innerHTML = rows
      .map(
        (item) => `
          <article class="tuition-list-card">
            <div>
              <strong>${item.title || "Untitled syllabus"}</strong>
              <p>${item.chapterCount || 0} chapters · ${item.isConfirmed ? "Confirmed" : "Draft"}</p>
            </div>
            ${
              item.isConfirmed
                ? `<button type="button" class="btn-ghost" data-activate-syllabus="${item.id}">Use In Chapters</button>`
                : `<span class="tuition-chip">Draft Saved</span>`
            }
          </article>
        `
      )
      .join("");

    storedListEl.querySelectorAll("[data-activate-syllabus]").forEach((button) => {
      button.addEventListener("click", async () => {
        const syllabusId = String(button.getAttribute("data-activate-syllabus") || "").trim();
        if (!syllabusId) return;
        try {
          setStatus("Switching active syllabus...");
          await saveProfile({ activeSyllabusId: syllabusId });
          window.location.href = getTeacherEntryPath(syllabusId);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Unable to switch syllabus.", "error");
        }
      });
    });
  };

  const renderFileMeta = () => {
    if (!(fileMetaEl instanceof HTMLElement) || !(fileInput instanceof HTMLInputElement)) return;
    const file = fileInput.files?.[0];
    if (!file) {
      fileMetaEl.innerHTML = "";
      return;
    }
    const sizeInKb = Math.max(1, Math.round(file.size / 1024));
    fileMetaEl.innerHTML = `
      <div class="tuition-summary-item">
        <strong>Selected File</strong>
        <span>${file.name}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Type</strong>
        <span>${file.type || "Unknown"}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Size</strong>
        <span>${sizeInKb} KB</span>
      </div>
    `;
  };

  const applyBootstrap = (bootstrap) => {
    bootstrapState = bootstrap || null;
    const profile = bootstrap?.profile || {};
    const boards = bootstrap?.boards || [];
    const subjects = bootstrap?.subjects || [];
    const classes = bootstrap?.classes || [];

    fillSelect(boardSelect, boards, "code", "name", "Select board");
    fillSelect(subjectSelect, subjects, "code", "name", "Select subject");
    if (classSelect instanceof HTMLSelectElement) {
      classSelect.innerHTML = [`<option value="">Select class</option>`]
        .concat(classes.map((value) => `<option value="${value}">Class ${value}</option>`))
        .join("");
    }

    if (boardSelect instanceof HTMLSelectElement && profile.boardCode) boardSelect.value = profile.boardCode;
    if (subjectSelect instanceof HTMLSelectElement && profile.subjectCode) {
      subjectSelect.value = profile.subjectCode;
    }
    if (classSelect instanceof HTMLSelectElement && profile.classLevel) {
      classSelect.value = String(profile.classLevel);
    }
    if (languageSelect instanceof HTMLSelectElement && profile.preferredLanguage) {
      languageSelect.value = profile.preferredLanguage;
    }

    renderSummary(profile, bootstrap);
    renderStoredSyllabi(bootstrap);
  };

  const readProfileInput = (overrides = {}) => ({
    boardCode: boardSelect instanceof HTMLSelectElement ? boardSelect.value : "",
    classLevel: classSelect instanceof HTMLSelectElement && classSelect.value ? Number(classSelect.value) : null,
    subjectCode: subjectSelect instanceof HTMLSelectElement ? subjectSelect.value : "",
    preferredLanguage: languageSelect instanceof HTMLSelectElement ? languageSelect.value : "ENGLISH",
    ...overrides,
  });

  const saveProfile = async (overrides = {}) => {
    const profile = await apiRequest({
      path: "/student/tuition/profile",
      method: "PUT",
      token,
      body: readProfileInput(overrides),
    });

    const nextBootstrap = {
      ...(bootstrapState || {}),
      profile: profile?.profile || profile,
    };
    applyBootstrap(nextBootstrap);
    setStatus("Tuition profile saved.", "success");
    return profile?.profile || profile;
  };

  try {
    const bootstrapPayload = await apiRequest({
      path: "/student/tuition/bootstrap",
      token,
    });
    applyBootstrap(bootstrapPayload?.profile || {});
    setStatus("Profile loaded. Save it or upload a syllabus to continue.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load tuition bootstrap.", "error");
  }

  saveProfileBtn?.addEventListener("click", async () => {
    try {
      setStatus("Saving tuition profile...");
      await saveProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save tuition profile.", "error");
    }
  });

  fileInput?.addEventListener("change", renderFileMeta);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
      setStatus("Please select a syllabus file or image first.", "error");
      return;
    }

    try {
      setStatus("Saving profile...");
      await saveProfile();

      const file = fileInput.files[0];
      setStatus("Uploading syllabus...");
      const uploadPayload = await apiRequest({
        path: "/student/tuition/syllabus-uploads",
        method: "POST",
        token,
        body: {
          sourceType: "FILE",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64: await toBase64(file),
        },
      });

      const uploadId = uploadPayload?.upload?.id;
      if (!uploadId) throw new Error("Upload completed but no upload id was returned.");

      setStatus("Building draft chapter list...");
      await apiRequest({
        path: `/student/tuition/syllabus-uploads/${uploadId}/parse`,
        method: "POST",
        token,
        body: {
          title:
            draftTitleEl instanceof HTMLInputElement && draftTitleEl.value.trim()
              ? draftTitleEl.value.trim()
              : undefined,
          manualText: manualTextEl instanceof HTMLTextAreaElement ? manualTextEl.value.trim() : "",
        },
      });

      window.location.href = `./tuition-syllabus-review.html?uploadId=${encodeURIComponent(uploadId)}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to upload the syllabus.", "error");
    }
  });
});
