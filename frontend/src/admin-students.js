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

  const state = {
    courses: [],
    products: [],
    students: [],
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

    const courseOptions = [
      '<option value="">Assign course...</option>',
      ...state.courses.map(
        (course) =>
          `<option value="${course.id}">${escapeHtml(course.title)}${course.isActive ? "" : " (Inactive)"}</option>`
      ),
    ].join("");

    const productOptions = [
      '<option value="">Assign product...</option>',
      ...state.products.map(
        (product) =>
          `<option value="${product.id}">${escapeHtml(product.title)}${product.isActive ? "" : " (Inactive)"}</option>`
      ),
    ].join("");

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
                <select data-course-select="${user.id}">
                  ${courseOptions}
                </select>
                <button class="table-btn" type="button" data-assign-course="${user.id}">Assign</button>
              </div>
            </td>
            <td>${assignedProducts || "-"}</td>
            <td>
              <div class="table-actions">
                <select data-product-select="${user.id}">
                  ${productOptions}
                </select>
                <button class="table-btn" type="button" data-assign-product="${user.id}">Assign</button>
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

      const courseButton = target.closest("[data-assign-course]");
      if (courseButton instanceof HTMLElement) {
        const studentId = courseButton.getAttribute("data-assign-course");
        if (!studentId) return;

        const courseSelect = studentsTableBody.querySelector(`select[data-course-select="${studentId}"]`);
        if (!(courseSelect instanceof HTMLSelectElement)) return;

        const courseId = String(courseSelect.value || "").trim();
        if (!courseId) {
          setMessage("Select a course first.", "error");
          return;
        }

        try {
          setMessage("Assigning course...");
          await apiRequest({
            path: `/admin/users/${encodeURIComponent(studentId)}/enrollments`,
            method: "POST",
            token,
            body: { courseId },
          });
          await refreshStudents();
          setMessage("Course assigned to student.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to assign course.", "error");
        }
        return;
      }

      const productButton = target.closest("[data-assign-product]");
      if (!(productButton instanceof HTMLElement)) return;

      const studentId = productButton.getAttribute("data-assign-product");
      if (!studentId) return;

      const productSelect = studentsTableBody.querySelector(`select[data-product-select="${studentId}"]`);
      if (!(productSelect instanceof HTMLSelectElement)) return;

      const productId = String(productSelect.value || "").trim();
      if (!productId) {
        setMessage("Select a product first.", "error");
        return;
      }

      try {
        setMessage("Assigning product...");
        await apiRequest({
          path: `/admin/users/${encodeURIComponent(studentId)}/product-access`,
          method: "POST",
          token,
          body: { productId },
        });
        await refreshStudents();
        setMessage("Product assigned to student.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to assign product.", "error");
      }
    });
  }
});
