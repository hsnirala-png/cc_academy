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
  requireRoleGuardStrict,
} from "./mock-api.js";

const SUBJECTS = [
  "PUNJABI",
  "ENGLISH",
  "CHILD_PEDAGOGY",
  "MATHS_EVS",
  "SCIENCE_MATH",
  "SOCIAL_STUDIES",
];

const NON_LANGUAGE_SUBJECTS = new Set([
  "CHILD_PEDAGOGY",
  "MATHS_EVS",
  "SCIENCE_MATH",
  "SOCIAL_STUDIES",
]);

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;
  initHeaderBehavior();

  const statusEl = document.querySelector("#adminMockStatus");
  const logoutBtn = document.querySelector("#adminLogoutBtn");

  const filterExam = document.querySelector("#filterExamType");
  const filterSubject = document.querySelector("#filterSubject");
  const filterStream = document.querySelector("#filterStreamChoice");
  const filterActive = document.querySelector("#filterActive");
  const filterLanguageMode = document.querySelector("#filterLanguageMode");
  const filterAccessCode = document.querySelector("#filterAccessCode");
  const applyFilterBtn = document.querySelector("#applyTestFilterBtn");

  const testTableBody = document.querySelector("#mockTestsTableBody");
  const testForm = document.querySelector("#mockTestForm");
  const testIdInput = document.querySelector("#mockTestId");
  const testTitleInput = document.querySelector("#mockTestTitle");
  const testExamTypeInput = document.querySelector("#mockTestExamType");
  const testSubjectInput = document.querySelector("#mockTestSubject");
  const testStreamInput = document.querySelector("#mockTestStreamChoice");
  const testLanguageModeInput = document.querySelector("#mockTestLanguageMode");
  const testAccessCodeInput = document.querySelector("#mockTestAccessCode");
  const testActiveInput = document.querySelector("#mockTestIsActive");
  const testSubmitBtn = document.querySelector("#mockTestSubmitBtn");
  const testCancelBtn = document.querySelector("#mockTestCancelBtn");
  const selectedTestHint = document.querySelector("#selectedTestHint");

  const questionForm = document.querySelector("#questionForm");
  const questionIdInput = document.querySelector("#questionId");
  const questionTextInput = document.querySelector("#questionText");
  const optionAInput = document.querySelector("#optionA");
  const optionBInput = document.querySelector("#optionB");
  const optionCInput = document.querySelector("#optionC");
  const optionDInput = document.querySelector("#optionD");
  const correctOptionInput = document.querySelector("#correctOption");
  const explanationInput = document.querySelector("#questionExplanation");
  const questionActiveInput = document.querySelector("#questionIsActive");
  const questionSubmitBtn = document.querySelector("#questionSubmitBtn");
  const questionCancelBtn = document.querySelector("#questionCancelBtn");
  const questionCountWarning = document.querySelector("#questionCountWarning");
  const questionsTableBody = document.querySelector("#questionsTableBody");
  const bulkImportInput = document.querySelector("#bulkImportText");
  const bulkImportBtn = document.querySelector("#bulkImportBtn");
  const bulkImportCsvFileInput = document.querySelector("#bulkImportCsvFile");
  const bulkImportCsvBtn = document.querySelector("#bulkImportCsvBtn");
  const bulkImportReplaceExistingInput = document.querySelector("#bulkImportReplaceExisting");

  const attemptsFilterForm = document.querySelector("#attemptFilterForm");
  const attemptStudentInput = document.querySelector("#attemptStudentId");
  const attemptExamInput = document.querySelector("#attemptExamType");
  const attemptSubjectInput = document.querySelector("#attemptSubject");
  const attemptFromInput = document.querySelector("#attemptDateFrom");
  const attemptToInput = document.querySelector("#attemptDateTo");
  const attemptsTableBody = document.querySelector("#attemptsTableBody");
  const attemptDetailWrap = document.querySelector("#attemptDetailWrap");
  const attemptDetailTitle = document.querySelector("#attemptDetailTitle");
  const attemptDetailBody = document.querySelector("#attemptDetailBody");

  const state = {
    mockTests: [],
    filteredTests: [],
    selectedMockTestId: "",
    questions: [],
    attempts: [],
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const resetTestForm = () => {
    if (!testForm) return;
    testForm.reset();
    if (testIdInput) testIdInput.value = "";
    if (testActiveInput) testActiveInput.checked = true;
    if (testAccessCodeInput) testAccessCodeInput.value = "DEMO";
    if (testSubmitBtn) testSubmitBtn.textContent = "Create Mock Test";
    if (testCancelBtn) testCancelBtn.classList.add("hidden");
    toggleSubjectDependentFields();
  };

  const resetQuestionForm = () => {
    if (!questionForm) return;
    questionForm.reset();
    if (questionIdInput) questionIdInput.value = "";
    if (questionActiveInput) questionActiveInput.checked = true;
    if (questionSubmitBtn) questionSubmitBtn.textContent = "Add Question";
    if (questionCancelBtn) questionCancelBtn.classList.add("hidden");
  };

  const currentSelectedTest = () =>
    state.mockTests.find((item) => item.id === state.selectedMockTestId) || null;

  const requiredQuestionsForSelected = () => {
    const selected = currentSelectedTest();
    if (!selected) return 30;
    return Number(selected.requiredQuestions || 0) || REQUIRED_QUESTIONS_BY_SUBJECT[selected.subject] || 30;
  };

  const updateQuestionCountWarning = () => {
    if (!questionCountWarning) return;
    const required = requiredQuestionsForSelected();
    const currentCount = state.questions.filter((item) => Boolean(item?.isActive)).length;
    if (!state.selectedMockTestId) {
      questionCountWarning.textContent = "Select a mock test to manage questions.";
      questionCountWarning.classList.remove("success");
      return;
    }
    if (currentCount < required) {
      questionCountWarning.textContent = `Warning: ${currentCount}/${required} questions. Add ${
        required - currentCount
      } more.`;
      questionCountWarning.classList.remove("success");
      questionCountWarning.classList.add("error");
      return;
    }
    questionCountWarning.textContent = `Ready: ${currentCount}/${required} questions available.`;
    questionCountWarning.classList.remove("error");
    questionCountWarning.classList.add("success");
  };

  const renderMockTests = () => {
    if (!testTableBody) return;
    if (!state.filteredTests.length) {
      testTableBody.innerHTML = "<tr><td colspan='10'>No mock tests found.</td></tr>";
      return;
    }

    testTableBody.innerHTML = state.filteredTests
      .map((test) => {
        const isSelected = state.selectedMockTestId === test.id;
        return `
          <tr class="${isSelected ? "row-selected" : ""}">
            <td>${escapeHtml(test.title)}</td>
            <td>${escapeHtml(EXAM_LABELS[test.examType] || test.examType)}</td>
            <td>${escapeHtml(SUBJECT_LABELS[test.subject] || test.subject)}</td>
            <td>${escapeHtml(test.streamChoice ? STREAM_LABELS[test.streamChoice] : "-")}</td>
            <td>${escapeHtml(test.languageMode ? LANGUAGE_LABELS[test.languageMode] : "-")}</td>
            <td>${escapeHtml(test.accessCode || "DEMO")}</td>
            <td>${Number(test.activeQuestions ?? test._count?.questions ?? 0)}</td>
            <td><span class="chip ${test.isActive ? "active" : "inactive"}">${
          test.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>${formatDateTime(test.createdAt)}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn edit" data-edit-test="${test.id}">Edit</button>
                <button type="button" class="table-btn" data-open-questions="${test.id}">Questions</button>
                <button type="button" class="table-btn" data-toggle-test="${test.id}" data-next-active="${
          test.isActive ? "false" : "true"
        }">
                  ${test.isActive ? "Deactivate" : "Activate"}
                </button>
                <button type="button" class="table-btn delete" data-delete-test="${test.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderQuestions = () => {
    if (!questionsTableBody) return;
    if (!state.questions.length) {
      questionsTableBody.innerHTML = "<tr><td colspan='7'>No questions yet.</td></tr>";
      return;
    }
    questionsTableBody.innerHTML = state.questions
      .map(
        (question) => `
      <tr>
        <td>${escapeHtml(question.questionText)}</td>
        <td>${escapeHtml(question.optionA)}</td>
        <td>${escapeHtml(question.optionB)}</td>
        <td>${escapeHtml(question.optionC)}</td>
        <td>${escapeHtml(question.optionD)}</td>
        <td>${escapeHtml(question.correctOption)}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-btn edit" data-edit-question="${question.id}">Edit</button>
            <button type="button" class="table-btn delete" data-delete-question="${question.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
    updateQuestionCountWarning();
  };

  const renderAttempts = () => {
    if (!attemptsTableBody) return;
    if (!state.attempts.length) {
      attemptsTableBody.innerHTML = "<tr><td colspan='9'>No attempts found.</td></tr>";
      return;
    }

    attemptsTableBody.innerHTML = state.attempts
      .map(
        (attempt) => `
      <tr>
        <td>${formatDateTime(attempt.startedAt)}</td>
        <td>${escapeHtml(attempt.user?.name || "-")}<small style="display:block;color:#666;">${escapeHtml(
          attempt.user?.studentCode || "-"
        )}</small></td>
        <td>${escapeHtml(attempt.user?.mobile || "-")}</td>
        <td>${escapeHtml(EXAM_LABELS[attempt.mockTest?.examType] || attempt.mockTest?.examType || "-")}</td>
        <td>${escapeHtml(SUBJECT_LABELS[attempt.mockTest?.subject] || attempt.mockTest?.subject || "-")}</td>
        <td>${Number(attempt.correctCount || 0)}/${Number(attempt.totalQuestions || 0)}</td>
        <td>${Number(attempt.scorePercent || 0).toFixed(2)}%</td>
        <td>${escapeHtml(attempt.remarkText || "-")}</td>
        <td><button type="button" class="table-btn edit" data-view-attempt="${attempt.id}">View</button></td>
      </tr>
    `
      )
      .join("");
  };

  const renderAttemptDetail = (attempt) => {
    if (!attemptDetailWrap || !attemptDetailTitle || !attemptDetailBody) return;
    attemptDetailTitle.textContent = `Attempt | ${attempt.user?.name || "-"} | ${
      attempt.mockTest?.title || "-"
    }`;
    attemptDetailBody.innerHTML = (attempt.questions || [])
      .map(
        (question) => `
      <tr>
        <td>${question.orderIndex}</td>
        <td>${escapeHtml(question.questionText)}</td>
        <td>${escapeHtml(question.selectedOption || "-")}</td>
        <td>${escapeHtml(question.correctOption || "-")}</td>
        <td>${escapeHtml(question.explanation || "-")}</td>
      </tr>
    `
      )
      .join("");
    attemptDetailWrap.classList.remove("hidden");
  };

  const toggleSubjectDependentFields = () => {
    const examType = testExamTypeInput?.value || "PSTET_1";
    const subject = testSubjectInput?.value || "PUNJABI";
    const streamWrap = document.querySelector("#mockTestStreamWrap");
    const shouldShowStream =
      examType === "PSTET_2" && (subject === "SCIENCE_MATH" || subject === "SOCIAL_STUDIES");
    if (streamWrap) streamWrap.classList.toggle("hidden", !shouldShowStream);
    if (testStreamInput) {
      if (!shouldShowStream) testStreamInput.value = "";
      if (shouldShowStream && subject === "SCIENCE_MATH") testStreamInput.value = "SCIENCE_MATH";
      if (shouldShowStream && subject === "SOCIAL_STUDIES") {
        testStreamInput.value = "SOCIAL_STUDIES";
      }
    }

    const languageWrap = document.querySelector("#mockTestLanguageWrap");
    const shouldShowLanguage = NON_LANGUAGE_SUBJECTS.has(subject);
    if (languageWrap) languageWrap.classList.toggle("hidden", !shouldShowLanguage);
    if (testLanguageModeInput && !shouldShowLanguage) {
      testLanguageModeInput.value = "";
    }
  };

  const applyFilters = () => {
    const examType = filterExam?.value || "";
    const subject = filterSubject?.value || "";
    const streamChoice = filterStream?.value || "";
    const active = filterActive?.value || "";
    const languageMode = filterLanguageMode?.value || "";
    const accessCode = filterAccessCode?.value || "";

    state.filteredTests = state.mockTests.filter((test) => {
      if (examType && test.examType !== examType) return false;
      if (subject && test.subject !== subject) return false;
      if (streamChoice && (test.streamChoice || "") !== streamChoice) return false;
      if (active === "true" && !test.isActive) return false;
      if (active === "false" && test.isActive) return false;
      if (languageMode && (test.languageMode || "") !== languageMode) return false;
      if (accessCode && (test.accessCode || "DEMO") !== accessCode) return false;
      return true;
    });
    renderMockTests();
  };

  const loadMockTests = async () => {
    const data = await apiRequest({ path: "/admin/mock-tests", token });
    state.mockTests = data.mockTests || [];
    applyFilters();
  };

  const loadQuestions = async (mockTestId) => {
    const data = await apiRequest({
      path: `/admin/mock-tests/${mockTestId}/questions`,
      token,
    });
    state.questions = data.questions || [];
    renderQuestions();
  };

  const loadAttempts = async () => {
    const query = {
      studentId: attemptStudentInput?.value || undefined,
      examType: attemptExamInput?.value || undefined,
      subject: attemptSubjectInput?.value || undefined,
      dateFrom: attemptFromInput?.value || undefined,
      dateTo: attemptToInput?.value || undefined,
    };
    const data = await apiRequest({
      path: "/admin/attempts",
      token,
      query,
    });
    state.attempts = data.attempts || [];
    renderAttempts();
  };

  const createOrUpdateMockTest = async () => {
    const testId = testIdInput?.value || "";
    const payload = {
      title: testTitleInput?.value?.trim() || "",
      examType: testExamTypeInput?.value || "PSTET_1",
      subject: testSubjectInput?.value || "PUNJABI",
      streamChoice: testStreamInput?.value || null,
      languageMode: testLanguageModeInput?.value || null,
      accessCode: testAccessCodeInput?.value || "DEMO",
      isActive: Boolean(testActiveInput?.checked),
    };
    if (!payload.title) throw new Error("Mock test title is required");
    if (NON_LANGUAGE_SUBJECTS.has(payload.subject) && !payload.languageMode) {
      throw new Error("Language mode is required for non-language subjects.");
    }

    if (testId) {
      await apiRequest({
        path: `/admin/mock-tests/${testId}`,
        method: "PATCH",
        token,
        body: payload,
      });
      return;
    }

    await apiRequest({
      path: "/admin/mock-tests",
      method: "POST",
      token,
      body: payload,
    });
  };

  const createOrUpdateQuestion = async () => {
    if (!state.selectedMockTestId) throw new Error("Select a mock test first");

    const questionId = questionIdInput?.value || "";
    const payload = {
      questionText: questionTextInput?.value?.trim() || "",
      optionA: optionAInput?.value?.trim() || "",
      optionB: optionBInput?.value?.trim() || "",
      optionC: optionCInput?.value?.trim() || "",
      optionD: optionDInput?.value?.trim() || "",
      correctOption: correctOptionInput?.value || "A",
      explanation: explanationInput?.value?.trim() || undefined,
      isActive: Boolean(questionActiveInput?.checked),
    };

    if (
      !payload.questionText ||
      !payload.optionA ||
      !payload.optionB ||
      !payload.optionC ||
      !payload.optionD
    ) {
      throw new Error("All question and options fields are required");
    }

    if (questionId) {
      await apiRequest({
        path: `/admin/questions/${questionId}`,
        method: "PATCH",
        token,
        body: payload,
      });
      return;
    }

    await apiRequest({
      path: `/admin/mock-tests/${state.selectedMockTestId}/questions`,
      method: "POST",
      token,
      body: payload,
    });
  };

  const handleBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Select a mock test before bulk import");
    const text = bulkImportInput?.value?.trim() || "";
    if (!text) throw new Error("Paste lines in format: question|A|B|C|D|correct|explanation");

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const parts = line.split("|").map((item) => item.trim());
      if (parts.length < 6) {
        throw new Error(`Invalid line: ${line}`);
      }
      const [questionText, optionA, optionB, optionC, optionD, correctOption, explanation] = parts;
      const normalized = correctOption.toUpperCase();
      if (!["A", "B", "C", "D"].includes(normalized)) {
        throw new Error(`Invalid correct option in line: ${line}`);
      }
      await apiRequest({
        path: `/admin/mock-tests/${state.selectedMockTestId}/questions`,
        method: "POST",
        token,
        body: {
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption: normalized,
          explanation,
          isActive: true,
        },
      });
    }
  };

  const parseCsvText = (csvText) => {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;

    const text = String(csvText || "").replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = i + 1 < text.length ? text[i + 1] : "";

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i += 1;
        }
        currentRow.push(currentField.trim());
        const hasData = currentRow.some((value) => value !== "");
        if (hasData) rows.push(currentRow);
        currentRow = [];
        currentField = "";
        continue;
      }

      currentField += char;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      const hasData = currentRow.some((value) => value !== "");
      if (hasData) rows.push(currentRow);
    }

    return rows;
  };

  const normalizeCsvRows = (rows) => {
    if (!rows.length) {
      throw new Error("CSV file is empty.");
    }

    const header = rows[0].map((cell) => cell.toLowerCase().replaceAll(" ", ""));
    const looksLikeHeader =
      header.includes("questiontext") &&
      header.includes("optiona") &&
      header.includes("optionb") &&
      header.includes("optionc") &&
      header.includes("optiond") &&
      header.includes("correctoption");

    const dataRows = looksLikeHeader ? rows.slice(1) : rows;
    if (!dataRows.length) {
      throw new Error("CSV has header only. Add at least one question row.");
    }

    return dataRows.map((row, index) => {
      if (row.length < 6) {
        throw new Error(`CSV row ${index + 1} is invalid. Minimum 6 columns required.`);
      }

      const questionText = (row[0] || "").trim();
      const optionA = (row[1] || "").trim();
      const optionB = (row[2] || "").trim();
      const optionC = (row[3] || "").trim();
      const optionD = (row[4] || "").trim();
      const correctOption = (row[5] || "").trim().toUpperCase();
      const explanation = (row[6] || "").trim();
      const isActiveRaw = (row[7] || "").trim().toLowerCase();

      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        throw new Error(`CSV row ${index + 1} has empty required columns.`);
      }
      if (!["A", "B", "C", "D"].includes(correctOption)) {
        throw new Error(`CSV row ${index + 1} has invalid correctOption: ${row[5]}`);
      }

      let isActive;
      if (isActiveRaw) {
        if (["true", "1", "yes", "y"].includes(isActiveRaw)) isActive = true;
        else if (["false", "0", "no", "n"].includes(isActiveRaw)) isActive = false;
        else throw new Error(`CSV row ${index + 1} has invalid isActive value: ${row[7]}`);
      }

      return {
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation: explanation || undefined,
        isActive,
      };
    });
  };

  const handleCsvBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Select a mock test before CSV upload");
    const file = bulkImportCsvFileInput?.files?.[0];
    if (!file) {
      throw new Error("Please choose a CSV file.");
    }

    const csvText = await file.text();
    const parsedRows = parseCsvText(csvText);
    const rows = normalizeCsvRows(parsedRows);

    const response = await apiRequest({
      path: `/admin/mock-tests/${state.selectedMockTestId}/questions/import-csv`,
      method: "POST",
      token,
      body: {
        rows,
        replaceExisting: Boolean(bulkImportReplaceExistingInput?.checked),
      },
    });

    return response?.result || { createdCount: rows.length, totalRows: rows.length };
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./admin-login.html";
    });
  }

  if (testExamTypeInput) {
    testExamTypeInput.addEventListener("change", toggleSubjectDependentFields);
  }

  if (testSubjectInput) {
    testSubjectInput.addEventListener("change", toggleSubjectDependentFields);
  }

  if (applyFilterBtn) {
    applyFilterBtn.addEventListener("click", () => {
      applyFilters();
    });
  }

  if (testForm) {
    testForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setStatus("Saving mock test...");
        await createOrUpdateMockTest();
        resetTestForm();
        await loadMockTests();
        setStatus("Mock test saved.", "success");
      } catch (error) {
        setStatus(error.message || "Unable to save mock test", "error");
      }
    });
  }

  if (testCancelBtn) {
    testCancelBtn.addEventListener("click", () => {
      resetTestForm();
    });
  }

  if (testTableBody) {
    testTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-test");
      if (editId) {
        const mockTest = state.mockTests.find((item) => item.id === editId);
        if (!mockTest) return;
        if (testIdInput) testIdInput.value = mockTest.id;
        if (testTitleInput) testTitleInput.value = mockTest.title || "";
        if (testExamTypeInput) testExamTypeInput.value = mockTest.examType;
        if (testSubjectInput) testSubjectInput.value = mockTest.subject;
        toggleSubjectDependentFields();
        if (testStreamInput) testStreamInput.value = mockTest.streamChoice || "";
        if (testLanguageModeInput) testLanguageModeInput.value = mockTest.languageMode || "";
        if (testAccessCodeInput) testAccessCodeInput.value = mockTest.accessCode || "DEMO";
        if (testActiveInput) testActiveInput.checked = Boolean(mockTest.isActive);
        if (testSubmitBtn) testSubmitBtn.textContent = "Update Mock Test";
        if (testCancelBtn) testCancelBtn.classList.remove("hidden");
        return;
      }

      const openQuestionId = target.getAttribute("data-open-questions");
      if (openQuestionId) {
        state.selectedMockTestId = openQuestionId;
        await loadQuestions(openQuestionId);
        const selected = currentSelectedTest();
        if (selectedTestHint) {
          selectedTestHint.textContent = selected
            ? `Managing questions for: ${selected.title}`
            : "Select a test";
        }
        renderMockTests();
        return;
      }

      const toggleId = target.getAttribute("data-toggle-test");
      if (toggleId) {
        const nextActive = target.getAttribute("data-next-active") === "true";
        await apiRequest({
          path: `/admin/mock-tests/${toggleId}`,
          method: "PATCH",
          token,
          body: { isActive: nextActive },
        });
        await loadMockTests();
        return;
      }

      const deleteId = target.getAttribute("data-delete-test");
      if (deleteId) {
        const confirmed = window.confirm("Delete this mock test?");
        if (!confirmed) return;
        await apiRequest({
          path: `/admin/mock-tests/${deleteId}`,
          method: "DELETE",
          token,
        });
        if (state.selectedMockTestId === deleteId) {
          state.selectedMockTestId = "";
          state.questions = [];
          renderQuestions();
        }
        await loadMockTests();
      }
    });
  }

  if (questionForm) {
    questionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setStatus("Saving question...");
        await createOrUpdateQuestion();
        resetQuestionForm();
        await Promise.all([loadQuestions(state.selectedMockTestId), loadMockTests()]);
        setStatus("Question saved.", "success");
      } catch (error) {
        setStatus(error.message || "Unable to save question", "error");
      }
    });
  }

  if (questionCancelBtn) {
    questionCancelBtn.addEventListener("click", () => {
      resetQuestionForm();
    });
  }

  if (questionsTableBody) {
    questionsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-question");
      if (editId) {
        const question = state.questions.find((item) => item.id === editId);
        if (!question) return;
        if (questionIdInput) questionIdInput.value = question.id;
        if (questionTextInput) questionTextInput.value = question.questionText || "";
        if (optionAInput) optionAInput.value = question.optionA || "";
        if (optionBInput) optionBInput.value = question.optionB || "";
        if (optionCInput) optionCInput.value = question.optionC || "";
        if (optionDInput) optionDInput.value = question.optionD || "";
        if (correctOptionInput) correctOptionInput.value = question.correctOption || "A";
        if (explanationInput) explanationInput.value = question.explanation || "";
        if (questionActiveInput) questionActiveInput.checked = Boolean(question.isActive);
        if (questionSubmitBtn) questionSubmitBtn.textContent = "Update Question";
        if (questionCancelBtn) questionCancelBtn.classList.remove("hidden");
        return;
      }

      const deleteId = target.getAttribute("data-delete-question");
      if (!deleteId) return;
      const confirmed = window.confirm("Delete this question?");
      if (!confirmed) return;
      await apiRequest({
        path: `/admin/questions/${deleteId}`,
        method: "DELETE",
        token,
      });
      await Promise.all([loadQuestions(state.selectedMockTestId), loadMockTests()]);
    });
  }

  if (bulkImportBtn) {
    bulkImportBtn.addEventListener("click", async () => {
      try {
        setStatus("Importing questions...");
        await handleBulkImport();
        if (bulkImportInput) bulkImportInput.value = "";
        await Promise.all([loadQuestions(state.selectedMockTestId), loadMockTests()]);
        setStatus("Bulk import completed.", "success");
      } catch (error) {
        setStatus(error.message || "Bulk import failed", "error");
      }
    });
  }

  if (bulkImportCsvBtn) {
    bulkImportCsvBtn.addEventListener("click", async () => {
      try {
        setStatus("Uploading CSV and importing questions...");
        const result = await handleCsvBulkImport();
        if (bulkImportCsvFileInput) {
          bulkImportCsvFileInput.value = "";
        }
        if (bulkImportReplaceExistingInput) {
          bulkImportReplaceExistingInput.checked = false;
        }
        await Promise.all([loadQuestions(state.selectedMockTestId), loadMockTests()]);
        setStatus(
          `CSV import completed. Added ${result.createdCount}/${result.totalRows} questions.`,
          "success"
        );
      } catch (error) {
        setStatus(error.message || "CSV import failed", "error");
      }
    });
  }

  if (attemptsFilterForm) {
    attemptsFilterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setStatus("Loading attempts...");
        await loadAttempts();
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load attempts", "error");
      }
    });
  }

  if (attemptsTableBody) {
    attemptsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const attemptId = target.getAttribute("data-view-attempt");
      if (!attemptId) return;

      try {
        setStatus("Loading attempt details...");
        const data = await apiRequest({
          path: `/admin/attempts/${attemptId}`,
          token,
        });
        renderAttemptDetail(data.attempt);
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load attempt details", "error");
      }
    });
  }

  try {
    setStatus("Loading mock test admin panel...");
    if (filterSubject) {
      filterSubject.innerHTML = `<option value="">All subjects</option>${SUBJECTS.map(
        (subject) => `<option value="${subject}">${SUBJECT_LABELS[subject]}</option>`
      ).join("")}`;
    }
    if (testSubjectInput) {
      testSubjectInput.innerHTML = SUBJECTS.map(
        (subject) => `<option value="${subject}">${SUBJECT_LABELS[subject]}</option>`
      ).join("");
    }
    toggleSubjectDependentFields();
    await Promise.all([loadMockTests(), loadAttempts()]);
    setStatus("");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      window.location.href = "./admin-login.html";
      return;
    }
    setStatus(error.message || "Unable to load admin mock test panel", "error");
  }
});
