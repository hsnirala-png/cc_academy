import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  requireRoleGuard,
  requireRoleGuardStrict,
} from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;

  const messageEl = document.querySelector("#adminStudentsMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const studentsTableBody = document.querySelector("#studentsTableBody");
  const studentsCountText = document.querySelector("#studentsCountText");
  const assignmentModal = document.querySelector("#studentAssignmentModal");
  const assignmentTitleEl = document.querySelector("#studentAssignmentTitle");
  const assignmentSubtitleEl = document.querySelector("#studentAssignmentSubtitle");
  const assignmentSearchInput = document.querySelector("#studentAssignmentSearch");
  const assignmentCategoryWrap = document.querySelector("#studentAssignmentCategoryWrap");
  const assignmentCategorySelect = document.querySelector("#studentAssignmentCategory");
  const assignmentListEl = document.querySelector("#studentAssignmentList");
  const assignmentCloseBtn = document.querySelector("#studentAssignmentCloseBtn");
  const assignmentCancelBtn = document.querySelector("#studentAssignmentCancelBtn");
  const assignmentConfirmBtn = document.querySelector("#studentAssignmentConfirmBtn");

  const state = {
    courses: [],
    products: [],
    students: [],
    assignment: {
      studentId: "",
      studentName: "",
      mode: "course",
      search: "",
      category: "",
      selectedItemId: "",
    },
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  const referralLinkForCode = (referralCode) => {
    const code = String(referralCode || "").trim();
    if (!code) return "";
    const origin = window.location.origin || "";
    return `${origin}/index.html?ref=${encodeURIComponent(code)}`;
  };

  const loadStudents = async () => {
    const usersData = await apiRequest({ path: "/admin/users", token });
    state.students = (usersData.users || []).filter((user) => user.role === "STUDENT");
  };

  const loadLookupData = async () => {
    const [coursesData, productsData] = await Promise.all([
      apiRequest({ path: "/admin/lesson-courses", token }),
      apiRequest({ path: "/admin/products", token }),
    ]);
    state.courses = coursesData.courses || [];
    state.products = productsData.products || [];
  };

  const closeAssignmentModal = () => {
    if (!(assignmentModal instanceof HTMLElement)) return;
    assignmentModal.classList.add("hidden");
    assignmentModal.setAttribute("aria-hidden", "true");
    state.assignment.studentId = "";
    state.assignment.studentName = "";
    state.assignment.mode = "course";
    state.assignment.search = "";
    state.assignment.category = "";
    state.assignment.selectedItemId = "";
    if (assignmentSearchInput instanceof HTMLInputElement) assignmentSearchInput.value = "";
    if (assignmentCategorySelect instanceof HTMLSelectElement) assignmentCategorySelect.innerHTML = "";
  };

  const getAssignmentItems = () => {
    const search = state.assignment.search.trim().toLowerCase();
    if (state.assignment.mode === "product") {
      return state.products.filter((product) => {
        const category = String(product?.examCategory || "").trim();
        if (state.assignment.category && category !== state.assignment.category) return false;
        if (!search) return true;
        const haystack = [
          product?.title,
          product?.examCategory,
          product?.examName,
          product?.courseType,
          product?.languageMode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    return state.courses.filter((course) => {
      if (!search) return true;
      const haystack = [course?.title, course?.description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });
  };

  const renderAssignmentCategoryOptions = () => {
    if (!(assignmentCategoryWrap instanceof HTMLElement) || !(assignmentCategorySelect instanceof HTMLSelectElement)) {
      return;
    }
    if (state.assignment.mode !== "product") {
      assignmentCategoryWrap.classList.add("hidden");
      assignmentCategorySelect.innerHTML = "";
      return;
    }

    assignmentCategoryWrap.classList.remove("hidden");
    const categories = Array.from(
      new Set(
        state.products
          .map((product) => String(product?.examCategory || "").trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
    assignmentCategorySelect.innerHTML = [
      '<option value="">All Categories</option>',
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
    ].join("");
    assignmentCategorySelect.value = state.assignment.category;
  };

  const renderAssignmentList = () => {
    if (!(assignmentListEl instanceof HTMLElement)) return;
    if (assignmentTitleEl instanceof HTMLElement) {
      assignmentTitleEl.textContent =
        state.assignment.mode === "product" ? "Assign Product Access" : "Assign Course Access";
    }
    if (assignmentSubtitleEl instanceof HTMLElement) {
      assignmentSubtitleEl.textContent = state.assignment.studentName
        ? `Student: ${state.assignment.studentName}`
        : "";
    }

    const items = getAssignmentItems();
    if (!items.length) {
      assignmentListEl.innerHTML = `<p class="student-assignment-empty">No ${
        state.assignment.mode === "product" ? "products" : "courses"
      } found for the selected filter.</p>`;
      if (assignmentConfirmBtn instanceof HTMLButtonElement) assignmentConfirmBtn.disabled = true;
      return;
    }

    assignmentListEl.innerHTML = items
      .map((item) => {
        const id = String(item?.id || "").trim();
        const checked = id === state.assignment.selectedItemId ? "checked" : "";
        const inactive = item?.isActive ? "" : " (Inactive)";
        const meta =
          state.assignment.mode === "product"
            ? [item?.examCategory, item?.examName, item?.courseType, item?.languageMode].filter(Boolean).join(" | ")
            : String(item?.description || "").trim();
        return `
          <label class="student-assignment-option">
            <input type="radio" name="studentAssignmentItem" value="${escapeHtml(id)}" ${checked} />
            <div class="student-assignment-option-body">
              <strong>${escapeHtml(String(item?.title || "-"))}${inactive}</strong>
              <span>${escapeHtml(meta || " ")}</span>
            </div>
          </label>
        `;
      })
      .join("");
    if (assignmentConfirmBtn instanceof HTMLButtonElement) {
      assignmentConfirmBtn.disabled = !state.assignment.selectedItemId;
    }
  };

  const openAssignmentModal = (studentId, mode) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student || !(assignmentModal instanceof HTMLElement)) return;
    state.assignment.studentId = studentId;
    state.assignment.studentName = String(student.name || student.studentCode || "").trim();
    state.assignment.mode = mode === "product" ? "product" : "course";
    state.assignment.search = "";
    state.assignment.category = "";
    state.assignment.selectedItemId = "";
    if (assignmentSearchInput instanceof HTMLInputElement) assignmentSearchInput.value = "";
    renderAssignmentCategoryOptions();
    renderAssignmentList();
    assignmentModal.classList.remove("hidden");
    assignmentModal.setAttribute("aria-hidden", "false");
    assignmentSearchInput?.focus();
  };

  const assignSelectedAccess = async () => {
    const studentId = String(state.assignment.studentId || "").trim();
    const selectedItemId = String(state.assignment.selectedItemId || "").trim();
    if (!studentId || !selectedItemId) {
      setMessage(`Select a ${state.assignment.mode} first.`, "error");
      return;
    }

    const isProductMode = state.assignment.mode === "product";
    setMessage(isProductMode ? "Assigning product..." : "Assigning course...");
    await apiRequest({
      path: isProductMode
        ? `/admin/users/${encodeURIComponent(studentId)}/product-access`
        : `/admin/users/${encodeURIComponent(studentId)}/enrollments`,
      method: "POST",
      token,
      body: isProductMode ? { productId: selectedItemId } : { courseId: selectedItemId },
    });
    await refreshStudents();
    closeAssignmentModal();
    setMessage(isProductMode ? "Product assigned to student." : "Course assigned to student.", "success");
  };

  const renderStudents = () => {
    if (studentsCountText) {
      studentsCountText.textContent = `Total Students: ${state.students.length}`;
    }

    if (!studentsTableBody) return;
    if (!state.students.length) {
      studentsTableBody.innerHTML =
        '<tr><td colspan="12" style="text-align:center;color:#666;">No students found.</td></tr>';
      return;
    }

    studentsTableBody.innerHTML = state.students
      .map((user) => {
        const assignedCourses = Array.isArray(user.enrollments)
          ? user.enrollments
              .map((enrollment) => enrollment?.course)
              .filter(Boolean)
              .map(
                (course) =>
                  `<span class="chip ${course.isActive ? "active" : "inactive"}">${escapeHtml(course.title)}</span>`
              )
              .join(" ")
          : "";

        const assignedProducts = Array.isArray(user.assignedProducts)
          ? user.assignedProducts
              .map(
                (product) =>
                  `<span class="chip ${product.isActive ? "active" : "inactive"}">${escapeHtml(product.title)}</span>`
              )
              .join(" ")
          : "";

        const referralCode = String(user.referralCode || "").trim();
        const referralLink = referralLinkForCode(referralCode);

        return `
          <tr>
            <td><strong>${escapeHtml(user.studentCode || "-")}</strong></td>
            <td>${escapeHtml(user.name || "-")}</td>
            <td>${escapeHtml(user.mobile || "-")}</td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td>${escapeHtml(user.state || "-")}</td>
            <td>${escapeHtml(user.city || "-")}</td>
            <td>
              ${
                referralCode
                  ? `<div>${escapeHtml(referralCode)}</div>
                     <a href="${escapeHtml(referralLink)}" target="_blank" rel="noopener noreferrer">Open Link</a>`
                  : "-"
              }
            </td>
            <td>${assignedCourses || "-"}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn" type="button" data-open-assignment="${user.id}" data-assignment-mode="course">
                  Assign Course
                </button>
              </div>
            </td>
            <td>${assignedProducts || "-"}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn" type="button" data-open-assignment="${user.id}" data-assignment-mode="product">
                  Assign Product
                </button>
              </div>
            </td>
            <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
          </tr>
        `;
      })
      .join("");
  };

  const refreshStudents = async () => {
    await loadStudents();
    renderStudents();
  };

  try {
    await apiRequest({ path: "/me", token });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      goAdminLogin();
      return;
    }
    setMessage("Unable to verify admin session.", "error");
    return;
  }

  try {
    setMessage("Loading students...");
    await Promise.all([loadLookupData(), refreshStudents()]);
    setMessage("");
  } catch (error) {
    setMessage(error.message || "Unable to load students.", "error");
  }

  if (studentsTableBody) {
    studentsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const assignmentTrigger = target.closest("[data-open-assignment]");
      if (assignmentTrigger instanceof HTMLElement) {
        const studentId = String(assignmentTrigger.getAttribute("data-open-assignment") || "").trim();
        const mode = String(assignmentTrigger.getAttribute("data-assignment-mode") || "course").trim();
        if (!studentId) return;
        openAssignmentModal(studentId, mode);
      }
    });
  }

  assignmentModal?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-assignment-close]")) {
      closeAssignmentModal();
    }
  });

  assignmentListEl?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name !== "studentAssignmentItem") return;
    state.assignment.selectedItemId = String(target.value || "").trim();
    if (assignmentConfirmBtn instanceof HTMLButtonElement) {
      assignmentConfirmBtn.disabled = !state.assignment.selectedItemId;
    }
  });

  if (assignmentSearchInput instanceof HTMLInputElement) {
    assignmentSearchInput.addEventListener("input", () => {
      state.assignment.search = assignmentSearchInput.value || "";
      state.assignment.selectedItemId = "";
      renderAssignmentList();
    });
  }

  if (assignmentCategorySelect instanceof HTMLSelectElement) {
    assignmentCategorySelect.addEventListener("change", () => {
      state.assignment.category = String(assignmentCategorySelect.value || "").trim();
      state.assignment.selectedItemId = "";
      renderAssignmentList();
    });
  }

  if (assignmentConfirmBtn instanceof HTMLButtonElement) {
    assignmentConfirmBtn.addEventListener("click", async () => {
      try {
        await assignSelectedAccess();
      } catch (error) {
        setMessage(error.message || `Unable to assign ${state.assignment.mode}.`, "error");
      }
    });
  }

  if (assignmentCloseBtn instanceof HTMLButtonElement) {
    assignmentCloseBtn.addEventListener("click", closeAssignmentModal);
  }

  if (assignmentCancelBtn instanceof HTMLButtonElement) {
    assignmentCancelBtn.addEventListener("click", closeAssignmentModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && assignmentModal instanceof HTMLElement && !assignmentModal.classList.contains("hidden")) {
      closeAssignmentModal();
    }
  });
});
