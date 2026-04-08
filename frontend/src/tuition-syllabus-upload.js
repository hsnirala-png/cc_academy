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

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });

const textToBase64DataUrl = (text) => {
  const utf8 = unescape(encodeURIComponent(String(text || "")));
  return `data:text/plain;base64,${btoa(utf8)}`;
};

const getTeacherEntryPath = (syllabusId) =>
  `./tuition-chapters.html${syllabusId ? `?syllabusId=${encodeURIComponent(syllabusId)}` : ""}`;

const getReviewPath = (uploadId) =>
  `./tuition-syllabus-review.html?uploadId=${encodeURIComponent(String(uploadId || "").trim())}`;

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
  const query = new URLSearchParams(window.location.search || "");
  const isManualMode = query.get("mode") === "manual";

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const statusEl = document.querySelector("#tuitionUploadStatus");
  const inlineStatusEl = document.querySelector("#tuitionUploadInlineStatus");
  const summaryEl = document.querySelector("#tuitionUploadSummary");
  const storedListEl = document.querySelector("#tuitionStoredSyllabi");
  const activationPanelEl = document.querySelector("#tuitionActivationPanel");
  const form = document.querySelector("#tuitionUploadForm");
  const saveProfileBtn = document.querySelector("#tuitionSaveProfileBtn");
  const activeSyllabusCta = document.querySelector("#tuitionActiveSyllabusCta");
  const boardSelect = document.querySelector("#tuitionBoardSelect");
  const classSelect = document.querySelector("#tuitionClassSelect");
  const subjectSelect = document.querySelector("#tuitionSubjectSelect");
  const languageSelect = document.querySelector("#tuitionLanguageSelect");
  const fileInput = document.querySelector("#tuitionFileInput");
  const fileMetaEl = document.querySelector("#tuitionFileMeta");
  const chapterPreviewStatusEl = document.querySelector("#tuitionChapterPreviewStatus");
  const chapterPreviewEl = document.querySelector("#tuitionChapterPreview");
  const manualChapterListEl = document.querySelector("#tuitionManualChapterList");
  const manualTextEl = document.querySelector("#tuitionManualText");
  const draftTitleEl = document.querySelector("#tuitionDraftTitle");
  const useDemoChaptersBtn = document.querySelector("#tuitionUseDemoChaptersBtn");
  const processingModal = document.querySelector("#tuitionProcessingModal");
  const processingTitleEl = document.querySelector("#tuitionProcessingTitle");
  const processingMessageEl = document.querySelector("#tuitionProcessingMessage");

  let bootstrapState = null;

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const setInlineStatus = (message, type = "") => {
    if (!(inlineStatusEl instanceof HTMLElement)) return;
    inlineStatusEl.textContent = message;
    inlineStatusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const setChapterPreviewStatus = (message, type = "") => {
    if (!(chapterPreviewStatusEl instanceof HTMLElement)) return;
    chapterPreviewStatusEl.textContent = message;
    chapterPreviewStatusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const setProcessingModal = (visible, title = "", message = "") => {
    if (!(processingModal instanceof HTMLElement)) return;
    processingModal.classList.toggle("hidden", !visible);
    processingModal.setAttribute("aria-hidden", visible ? "false" : "true");
    if (processingTitleEl instanceof HTMLElement && title) {
      processingTitleEl.textContent = title;
    }
    if (processingMessageEl instanceof HTMLElement && message) {
      processingMessageEl.textContent = message;
    }
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
          <div class="tuition-summary-item compact">
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

  const bindActivationButtons = (root, selector) => {
    if (!(root instanceof HTMLElement)) return;
    root.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", async () => {
        const syllabusId = String(button.getAttribute("data-activate-syllabus") || "").trim();
        if (!syllabusId) return;
        try {
          setStatus("Switching active syllabus...");
          setInlineStatus("Setting the selected syllabus as active...", "");
          await saveProfile({ activeSyllabusId: syllabusId });
          await loadChapterPreview();
          setStatus("Active syllabus updated.", "success");
          setInlineStatus("Active syllabus updated. You can now open chapter lessons.", "success");
          window.location.href = getTeacherEntryPath(syllabusId);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Unable to switch syllabus.", "error");
          setInlineStatus(error instanceof Error ? error.message : "Unable to switch syllabus.", "error");
        }
      });
    });
  };

  const bindReviewButtons = (root, selector) => {
    if (!(root instanceof HTMLElement)) return;
    root.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", () => {
        const uploadId = String(button.getAttribute("data-review-upload") || "").trim();
        if (!uploadId) {
          setStatus("This draft syllabus cannot be reviewed yet.", "error");
          setInlineStatus("Draft syllabus is missing its review link. Please create it again if needed.", "error");
          return;
        }
        setStatus("Opening draft syllabus review...");
        setInlineStatus("Opening the draft review so you can confirm and activate it.", "");
        window.location.href = getReviewPath(uploadId);
      });
    });
  };

  const reloadBootstrapAndPreview = async () => {
    const bootstrapPayload = await apiRequest({
      path: "/student/tuition/bootstrap",
      token,
    });
    applyBootstrap(bootstrapPayload?.profile || {});
    await loadChapterPreview();
  };

  const confirmDraftUpload = async (uploadId) => {
    const normalizedUploadId = String(uploadId || "").trim();
    if (!normalizedUploadId) {
      throw new Error("This draft syllabus cannot be confirmed because its upload record is missing.");
    }

    const uploadPayload = await apiRequest({
      path: `/student/tuition/syllabus-uploads/${normalizedUploadId}`,
      token,
    });
    const upload = uploadPayload?.upload || {};
    const title = String(upload?.syllabus?.title || "").trim() || "Tuition Syllabus";
    const chapters = Array.isArray(upload?.syllabus?.chapters)
      ? upload.syllabus.chapters
          .filter((chapter) => chapter?.isIncluded !== false && String(chapter?.name || "").trim())
          .map((chapter, index) => ({
            name: String(chapter.name || "").trim(),
            orderIndex: Number(chapter.orderIndex) || index + 1,
            isIncluded: true,
          }))
      : [];

    if (!chapters.length) {
      throw new Error("This draft has no chapters to confirm yet. Open Review Draft and check the chapter list first.");
    }

    await apiRequest({
      path: `/student/tuition/syllabus-uploads/${normalizedUploadId}/review`,
      method: "PUT",
      token,
      body: {
        title,
        chapters,
        activate: true,
      },
    });
  };

  const bindConfirmButtons = (root, selector) => {
    if (!(root instanceof HTMLElement)) return;
    root.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", async () => {
        const uploadId = String(button.getAttribute("data-confirm-upload") || "").trim();
        try {
          setProcessingModal(
            true,
            "Confirming Draft Syllabus",
            "The saved draft is being confirmed and activated so chapter-wise learning can start."
          );
          setStatus("Confirming draft syllabus...");
          setInlineStatus("Preparing the active syllabus and chapter-wise learning table...", "");
          await confirmDraftUpload(uploadId);
          await reloadBootstrapAndPreview();
          setProcessingModal(false);
          setStatus("Draft syllabus confirmed and activated.", "success");
          setInlineStatus("Draft syllabus confirmed. Use Start Learning from the chapter table below.", "success");
        } catch (error) {
          setProcessingModal(false);
          setStatus(error instanceof Error ? error.message : "Unable to confirm the draft syllabus.", "error");
          setInlineStatus(error instanceof Error ? error.message : "Unable to confirm the draft syllabus.", "error");
        }
      });
    });
  };

  const renderActivationPanel = (profile, bootstrap) => {
    if (!(activationPanelEl instanceof HTMLElement)) return;
    const rows = Array.isArray(bootstrap?.storedSyllabi) ? bootstrap.storedSyllabi : [];
    const confirmedRows = rows.filter((item) => item?.isConfirmed);
    const draftRows = rows.filter((item) => !item?.isConfirmed);

    if (profile?.activeSyllabusId && profile?.activeSyllabusTitle) {
      activationPanelEl.innerHTML = `
        <div class="tuition-activation-card is-active">
          <strong>Active syllabus is ready</strong>
          <p>${profile.activeSyllabusTitle}${profile?.activeSyllabusConfirmed ? " (confirmed)" : ""}</p>
        </div>
      `;
      return;
    }

    if (!confirmedRows.length) {
      activationPanelEl.innerHTML = `
        <div class="tuition-activation-card">
          <strong>No active syllabus yet</strong>
          <p>Confirm one of the saved drafts first. Only confirmed syllabi can unlock chapters and the AI teacher.</p>
          ${
            draftRows.length
              ? `
                <div class="tuition-list-stack">
                  ${draftRows
                    .map(
                      (item) => `
                        <article class="tuition-list-card">
                          <div>
                            <strong>${item.title || "Untitled syllabus"}</strong>
                            <p>${item.chapterCount || 0} chapters · Draft</p>
                          </div>
                          <div class="tuition-flow-actions">
                            <button type="button" class="btn-secondary" data-review-upload="${item.uploadId || ""}">Review Draft</button>
                            <button type="button" class="btn-primary" data-confirm-upload="${item.uploadId || ""}">Confirm & Activate</button>
                          </div>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>
      `;
      bindReviewButtons(activationPanelEl, "[data-review-upload]");
      bindConfirmButtons(activationPanelEl, "[data-confirm-upload]");
      return;
    }

    activationPanelEl.innerHTML = `
      <div class="tuition-activation-card">
        <strong>Choose active syllabus</strong>
        <p>Select one confirmed syllabus to unlock chapters and open the AI Tuition Teacher.</p>
        <div class="tuition-list-stack">
          ${confirmedRows
            .map(
              (item) => `
                <article class="tuition-list-card">
                  <div>
                    <strong>${item.title || "Untitled syllabus"}</strong>
                    <p>${item.chapterCount || 0} chapters · Confirmed</p>
                  </div>
                  <button type="button" class="btn-primary" data-activate-syllabus="${item.id}">Set Active</button>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
    bindActivationButtons(activationPanelEl, "[data-activate-syllabus]");
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
                : `
                    <div class="tuition-flow-actions">
                      <button type="button" class="btn-secondary" data-review-upload="${item.uploadId || ""}">Review Draft</button>
                      <button type="button" class="btn-primary" data-confirm-upload="${item.uploadId || ""}">Confirm & Activate</button>
                    </div>
                  `
            }
          </article>
        `
      )
      .join("");

    bindActivationButtons(storedListEl, "[data-activate-syllabus]");
    bindReviewButtons(storedListEl, "[data-review-upload]");
    bindConfirmButtons(storedListEl, "[data-confirm-upload]");
  };

  const renderChapterPreview = (payload) => {
    if (!(chapterPreviewEl instanceof HTMLElement)) return;
    const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
    const activeSyllabus = payload?.activeSyllabus || null;

    if (!activeSyllabus || !chapters.length) {
      chapterPreviewEl.innerHTML = `
        <p class="tuition-empty-note">
          No chapter-wise lessons are active yet. Review and confirm a syllabus first, then the lesson table will appear here.
        </p>
      `;
      setChapterPreviewStatus("Confirm a syllabus to unlock chapter-wise learning.", "");
      return;
    }

    if (bootstrapState?.profile) {
      const nextProfile = {
        ...bootstrapState.profile,
        activeSyllabusId: activeSyllabus.id,
        activeSyllabusTitle: activeSyllabus.title,
        activeSyllabusConfirmed: activeSyllabus.isConfirmed,
      };
      bootstrapState = {
        ...bootstrapState,
        profile: nextProfile,
      };
      renderSummary(nextProfile, bootstrapState);
      renderActivationPanel(nextProfile, bootstrapState);
    }

      const rows = chapters
        .map((chapter, index) => {
          const teacherHref = `./tuition-teacher.html?chapterId=${encodeURIComponent(chapter.id)}`;
          return `
            <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${chapter.title}</strong>
              <div class="tuition-table-note">${chapter.syllabusTitle || ""}</div>
            </td>
            <td>${chapter.progress?.progressLabel || chapter.progress?.status || "Not Started"}</td>
            <td>${chapter.progress?.completionPercent || 0}%</td>
            <td>
              <a class="btn-primary btn-small" href="${teacherHref}">${chapter?.action?.canResume ? "Resume Learning" : "Start Learning"}</a>
            </td>
          </tr>
        `;
      })
      .join("");

    chapterPreviewEl.innerHTML = `
      <div class="tuition-summary-stack compact">
        <div class="tuition-summary-item">
          <strong>Active syllabus</strong>
          <span>${activeSyllabus.title}</span>
        </div>
        <div class="tuition-summary-item">
          <strong>Last Studied</strong>
          <span>${formatDateTime(activeSyllabus?.progressSummary?.lastStudiedAt)}</span>
        </div>
      </div>
      <div class="tuition-table-wrap">
        <table class="tuition-table">
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Name of Chapter</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    setChapterPreviewStatus(
      `Chapter-wise lesson data is ready for ${activeSyllabus.title}. Use Start Learning to open the AI Tuition Teacher.`,
      "success"
    );
  };

  const loadChapterPreview = async () => {
    try {
      const payload = await apiRequest({
        path: "/student/tuition/chapters",
        token,
      });
      renderChapterPreview(payload);
    } catch (error) {
      if (chapterPreviewEl instanceof HTMLElement) {
        chapterPreviewEl.innerHTML = `
          <p class="tuition-empty-note">Unable to load chapter-wise lesson data right now.</p>
        `;
      }
      setChapterPreviewStatus(error instanceof Error ? error.message : "Unable to load chapter lessons.", "error");
    }
  };

  const renderFileMeta = () => {
    if (!(fileMetaEl instanceof HTMLElement) || !(fileInput instanceof HTMLInputElement)) return;
    const file = fileInput.files?.[0];
    const chapterNames =
      manualChapterListEl instanceof HTMLTextAreaElement
        ? manualChapterListEl.value
            .split(/\r?\n/)
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        : [];
    if (!file && !chapterNames.length) {
      fileMetaEl.innerHTML = "";
      return;
    }
    if (!file && chapterNames.length) {
      fileMetaEl.innerHTML = `
        <div class="tuition-summary-item">
          <strong>Manual Entry</strong>
          <span>${chapterNames.length} chapters entered manually</span>
        </div>
        <div class="tuition-summary-item">
          <strong>Mode</strong>
          <span>Manual syllabus input</span>
        </div>
      `;
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

  const getManualChapterNames = () =>
    manualChapterListEl instanceof HTMLTextAreaElement
      ? manualChapterListEl.value
          .split(/\r?\n/)
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];

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
    renderActivationPanel(profile, bootstrap);
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
    await loadChapterPreview();
    setStatus(
      isManualMode
        ? "Profile loaded. Enter chapters manually or upload a syllabus to continue."
        : "Profile loaded. Upload a syllabus or enter chapters manually to continue.",
      "success"
    );
    setInlineStatus(
      isManualMode
        ? "Manual mode is ready. Add chapter names, then prepare the chapter review."
        : "Upload a file or enter chapter names manually to prepare the chapter review.",
      "success"
    );
    if (isManualMode && manualChapterListEl instanceof HTMLTextAreaElement) {
      window.setTimeout(() => manualChapterListEl.focus(), 80);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load tuition bootstrap.", "error");
    setInlineStatus("Unable to load tuition setup right now.", "error");
  }

  saveProfileBtn?.addEventListener("click", async () => {
    try {
      setStatus("Saving tuition profile...");
      await saveProfile();
      await loadChapterPreview();
      setInlineStatus("Profile saved.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save tuition profile.", "error");
      setInlineStatus(error instanceof Error ? error.message : "Unable to save tuition profile.", "error");
    }
  });

  fileInput?.addEventListener("change", renderFileMeta);
  manualChapterListEl?.addEventListener("input", renderFileMeta);

  useDemoChaptersBtn?.addEventListener("click", () => {
    if (!(manualChapterListEl instanceof HTMLTextAreaElement)) return;
    manualChapterListEl.value = [
      "Chemical Reactions and Equations",
      "Acids Bases and Salts",
      "Metals and Non-Metals",
      "Carbon and Its Compounds",
      "Periodic Classification of Elements",
    ].join("\n");
    renderFileMeta();
    setStatus("Demo chapters added. You can edit them before continuing.", "success");
    setInlineStatus("Demo syllabus inserted. Click Upload And Prepare Review to generate the chapter lesson draft.", "success");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const manualChapterNames = getManualChapterNames();
    const manualText = manualTextEl instanceof HTMLTextAreaElement ? manualTextEl.value.trim() : "";
    const hasFile = fileInput instanceof HTMLInputElement && Boolean(fileInput.files?.[0]);

    if (!hasFile && !manualChapterNames.length && !manualText) {
      setStatus(
        "Upload a syllabus file or enter chapter names manually before continuing.",
        "error"
      );
      setInlineStatus(
        "No syllabus input found. Upload a file, use demo chapters, or type chapter names manually.",
        "error"
      );
      if (manualChapterListEl instanceof HTMLTextAreaElement) {
        manualChapterListEl.focus();
      }
      return;
    }

    try {
      setProcessingModal(
        true,
        "Preparing Chapter Lesson Draft",
        "Saving profile, uploading the syllabus source, and building the chapter review draft."
      );
      setStatus("Saving profile...");
      setInlineStatus("Saving your tuition profile...", "");
      await saveProfile();

      setStatus("Uploading syllabus...");
      setInlineStatus("Uploading syllabus source...", "");
      const file = hasFile ? fileInput.files[0] : null;
      const syntheticTitle =
        (draftTitleEl instanceof HTMLInputElement && draftTitleEl.value.trim()) ||
        (subjectSelect instanceof HTMLSelectElement ? subjectSelect.options[subjectSelect.selectedIndex]?.text : "") ||
        "Manual Tuition Syllabus";
      const uploadPayload = await apiRequest({
        path: "/student/tuition/syllabus-uploads",
        method: "POST",
        token,
        body: {
          sourceType: file ? "FILE" : "MANUAL",
          fileName: file ? file.name : `${syntheticTitle}.txt`,
          mimeType: file ? file.type || "application/octet-stream" : "text/plain",
          fileBase64: file ? await toBase64(file) : textToBase64DataUrl([syntheticTitle, manualChapterNames.join("\n"), manualText].filter(Boolean).join("\n\n")),
        },
      });

      const uploadId = uploadPayload?.upload?.id;
      if (!uploadId) throw new Error("Upload completed but no upload id was returned.");

      setStatus("Building draft chapter list...");
      setInlineStatus("Generating chapter draft for review...", "");
      setProcessingModal(
        true,
        "Generating Chapter Review",
        "The tuition flow is preparing the chapter draft. You will review and confirm it before lessons start."
      );
      await apiRequest({
        path: `/student/tuition/syllabus-uploads/${uploadId}/parse`,
        method: "POST",
        token,
        body: {
          title:
            draftTitleEl instanceof HTMLInputElement && draftTitleEl.value.trim()
              ? draftTitleEl.value.trim()
              : undefined,
          manualText,
          chapterNames: manualChapterNames,
        },
      });
      setStatus("Draft chapters ready. Opening the review step...", "success");
      setInlineStatus(
        "Chapter draft is ready. Opening review now. Confirm the syllabus there to unlock chapter lessons.",
        "success"
      );
      setProcessingModal(
        true,
        "Chapter Draft Ready",
        "Opening the review screen. Confirm the syllabus there to see the chapter lesson cards."
      );
      window.setTimeout(() => {
        window.location.href = `./tuition-syllabus-review.html?uploadId=${encodeURIComponent(uploadId)}`;
      }, 700);
    } catch (error) {
      setProcessingModal(false);
      setStatus(error instanceof Error ? error.message : "Unable to upload the syllabus.", "error");
      setInlineStatus(error instanceof Error ? error.message : "Unable to upload the syllabus.", "error");
    }
  });
});
