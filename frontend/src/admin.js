document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("cc_token");
  const localUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("cc_user") || "null");
    } catch {
      return null;
    }
  })();
  const adminMessage = document.querySelector("#adminMessage");
  const adminLogoutBtn = document.querySelector("#adminLogoutBtn");

  const overviewStudents = document.querySelector("#overviewStudents");
  const overviewClasses = document.querySelector("#overviewClasses");
  const overviewPlans = document.querySelector("#overviewPlans");
  const overviewSubs = document.querySelector("#overviewSubs");

  const classForm = document.querySelector("#classForm");
  const classIdInput = document.querySelector("#classId");
  const classNameInput = document.querySelector("#className");
  const classInstructorInput = document.querySelector("#classInstructor");
  const classModeInput = document.querySelector("#classMode");
  const classSeatsInput = document.querySelector("#classSeats");
  const classStartDateInput = document.querySelector("#classStartDate");
  const classEndDateInput = document.querySelector("#classEndDate");
  const classDescriptionInput = document.querySelector("#classDescription");
  const classIsActiveInput = document.querySelector("#classIsActive");
  const classSubmitBtn = document.querySelector("#classSubmitBtn");
  const classCancelBtn = document.querySelector("#classCancelBtn");
  const classesTableBody = document.querySelector("#classesTableBody");

  const planForm = document.querySelector("#planForm");
  const planIdInput = document.querySelector("#planId");
  const planTitleInput = document.querySelector("#planTitle");
  const planPriceInput = document.querySelector("#planPrice");
  const planDurationInput = document.querySelector("#planDuration");
  const planDescriptionInput = document.querySelector("#planDescription");
  const planIsActiveInput = document.querySelector("#planIsActive");
  const planSubmitBtn = document.querySelector("#planSubmitBtn");
  const planCancelBtn = document.querySelector("#planCancelBtn");
  const plansTableBody = document.querySelector("#plansTableBody");

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0";
  const API_BASE = isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "";

  let classes = [];
  let plans = [];

  const setMessage = (text, type) => {
    if (!adminMessage) return;
    adminMessage.textContent = text || "";
    adminMessage.classList.remove("error", "success");
    if (type) adminMessage.classList.add(type);
  };

  const clearAuth = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    sessionStorage.removeItem("cc_token");
    sessionStorage.removeItem("cc_user");
  };

  const goAdminLogin = () => {
    window.location.href = "/admin-login.html";
  };

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  if (!token || !localUser || localUser.role !== "ADMIN") {
    clearAuth();
    goAdminLogin();
    return;
  }

  try {
    const verifyResponse = await fetch(`${API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const verifyContentType = verifyResponse.headers.get("content-type") || "";
    const verifyPayload = verifyContentType.includes("application/json")
      ? await verifyResponse.json()
      : {};
    if (!verifyResponse.ok || String(verifyPayload?.user?.role || "") !== "ADMIN") {
      clearAuth();
      goAdminLogin();
      return;
    }
  } catch {
    clearAuth();
    goAdminLogin();
    return;
  }

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {};
    return response.json();
  };

  const apiRequest = async (path, options = {}) => {
    const init = {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const response = await fetch(`${API_BASE}${path}`, init);
    const data = await parseResponse(response);

    if (!response.ok) {
      const error = new Error(data?.message || "Request failed");
      error.status = response.status;
      throw error;
    }

    return data;
  };

  const toDateTimeInput = (isoValue) => {
    if (!isoValue) return "";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const toIsoDateTime = (inputValue) => {
    if (!inputValue) return undefined;
    const parsed = new Date(inputValue);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const prettyDate = (isoValue) => {
    if (!isoValue) return "-";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const escapeHtml = (text) => {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };

  const renderOverview = (overview) => {
    if (overviewStudents) overviewStudents.textContent = String(overview.studentsTotal ?? 0);
    if (overviewClasses) {
      overviewClasses.textContent = `${overview.classesActive ?? 0} / ${overview.classesTotal ?? 0}`;
    }
    if (overviewPlans) {
      overviewPlans.textContent = `${overview.plansActive ?? 0} / ${overview.plansTotal ?? 0}`;
    }
    if (overviewSubs) {
      overviewSubs.textContent = `${overview.subscriptionsActive ?? 0} / ${
        overview.subscriptionsTotal ?? 0
      }`;
    }
  };

  const renderClasses = () => {
    if (!classesTableBody) return;
    if (!classes.length) {
      classesTableBody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:#666;">No classes yet.</td></tr>';
      return;
    }

    classesTableBody.innerHTML = classes
      .map((item) => {
        const dateText = `${prettyDate(item.startDate)}${item.endDate ? ` - ${prettyDate(item.endDate)}` : ""}`;
        return `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.instructor || "-")}</td>
            <td>${escapeHtml(item.mode)}</td>
            <td>${escapeHtml(dateText)}</td>
            <td>${item.seats ?? "-"}</td>
            <td><span class="chip ${item.isActive ? "active" : "inactive"}">${
          item.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>${item._count?.subscriptions ?? 0}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn edit" data-edit-class="${item.id}" type="button">Edit</button>
                <button class="table-btn delete" data-delete-class="${item.id}" type="button">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderPlans = () => {
    if (!plansTableBody) return;
    if (!plans.length) {
      plansTableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#666;">No subscription plans yet.</td></tr>';
      return;
    }

    plansTableBody.innerHTML = plans
      .map((item) => {
        return `
          <tr>
            <td>${escapeHtml(item.title)}</td>
            <td>${Number(item.price).toFixed(2)}</td>
            <td>${item.durationDays} days</td>
            <td><span class="chip ${item.isActive ? "active" : "inactive"}">${
          item.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>${item._count?.subscriptions ?? 0}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn edit" data-edit-plan="${item.id}" type="button">Edit</button>
                <button class="table-btn delete" data-delete-plan="${item.id}" type="button">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const resetClassForm = () => {
    if (!classForm) return;
    classForm.reset();
    if (classIdInput) classIdInput.value = "";
    if (classIsActiveInput) classIsActiveInput.checked = true;
    if (classSubmitBtn) classSubmitBtn.textContent = "Create Class";
    if (classCancelBtn) classCancelBtn.classList.add("hidden");
  };

  const resetPlanForm = () => {
    if (!planForm) return;
    planForm.reset();
    if (planIdInput) planIdInput.value = "";
    if (planIsActiveInput) planIsActiveInput.checked = true;
    if (planSubmitBtn) planSubmitBtn.textContent = "Create Plan";
    if (planCancelBtn) planCancelBtn.classList.add("hidden");
  };

  const loadOverview = async () => {
    const data = await apiRequest("/admin/overview");
    renderOverview(data.overview || {});
  };

  const loadClasses = async () => {
    const data = await apiRequest("/admin/classes");
    classes = data.classes || [];
    renderClasses();
  };

  const loadPlans = async () => {
    const data = await apiRequest("/admin/subscriptions");
    plans = data.plans || [];
    renderPlans();
  };

  const loadAll = async () => {
    await Promise.all([loadOverview(), loadClasses(), loadPlans()]);
  };

  try {
    const me = await apiRequest("/me");
    if (!me?.user || me.user.role !== "ADMIN") {
      clearAuth();
      goAdminLogin();
      return;
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      goAdminLogin();
      return;
    }
    setMessage("Unable to verify admin session. Check backend API and try again.", "error");
    return;
  }

  try {
    await loadAll();
    setMessage("");
  } catch (error) {
    setMessage(error.message || "Failed to load admin panel.", "error");
  }

  if (classForm) {
    classForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");

      const classId = classIdInput?.value || "";
      const payload = {
        name: classNameInput?.value?.trim() || "",
        description: classDescriptionInput?.value?.trim() || undefined,
        instructor: classInstructorInput?.value?.trim() || undefined,
        mode: classModeInput?.value || "ONLINE",
        startDate: toIsoDateTime(classStartDateInput?.value || ""),
        endDate: toIsoDateTime(classEndDateInput?.value || ""),
        seats: classSeatsInput?.value ? Number(classSeatsInput.value) : undefined,
        isActive: Boolean(classIsActiveInput?.checked),
      };

      if (!payload.name || !payload.startDate) {
        setMessage("Class name and start date are required.", "error");
        return;
      }

      try {
        if (classId) {
          await apiRequest(`/admin/classes/${classId}`, {
            method: "PATCH",
            body: payload,
          });
        } else {
          await apiRequest("/admin/classes", {
            method: "POST",
            body: payload,
          });
        }

        resetClassForm();
        await Promise.all([loadClasses(), loadOverview()]);
      } catch (error) {
        setMessage(error.message || "Unable to save class.", "error");
      }
    });
  }

  if (classesTableBody) {
    classesTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-class");
      if (editId) {
        const item = classes.find((row) => row.id === editId);
        if (!item) return;
        classIdInput.value = item.id;
        classNameInput.value = item.name || "";
        classInstructorInput.value = item.instructor || "";
        classModeInput.value = item.mode || "ONLINE";
        classSeatsInput.value = item.seats ? String(item.seats) : "";
        classStartDateInput.value = toDateTimeInput(item.startDate);
        classEndDateInput.value = toDateTimeInput(item.endDate);
        classDescriptionInput.value = item.description || "";
        classIsActiveInput.checked = Boolean(item.isActive);
        classSubmitBtn.textContent = "Update Class";
        classCancelBtn.classList.remove("hidden");
        classForm.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const deleteId = target.getAttribute("data-delete-class");
      if (deleteId) {
        const confirmed = window.confirm("Delete this class?");
        if (!confirmed) return;
        try {
          await apiRequest(`/admin/classes/${deleteId}`, { method: "DELETE" });
          await Promise.all([loadClasses(), loadOverview()]);
        } catch (error) {
          setMessage(error.message || "Unable to delete class.", "error");
        }
      }
    });
  }

  if (classCancelBtn) {
    classCancelBtn.addEventListener("click", () => {
      resetClassForm();
      setMessage("");
    });
  }

  if (planForm) {
    planForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");

      const planId = planIdInput?.value || "";
      const payload = {
        title: planTitleInput?.value?.trim() || "",
        description: planDescriptionInput?.value?.trim() || undefined,
        price: planPriceInput?.value ? Number(planPriceInput.value) : undefined,
        durationDays: planDurationInput?.value ? Number(planDurationInput.value) : undefined,
        isActive: Boolean(planIsActiveInput?.checked),
      };

      if (!payload.title || !payload.price || !payload.durationDays) {
        setMessage("Title, price, and duration are required.", "error");
        return;
      }

      try {
        if (planId) {
          await apiRequest(`/admin/subscriptions/${planId}`, {
            method: "PATCH",
            body: payload,
          });
        } else {
          await apiRequest("/admin/subscriptions", {
            method: "POST",
            body: payload,
          });
        }

        resetPlanForm();
        await Promise.all([loadPlans(), loadOverview()]);
      } catch (error) {
        setMessage(error.message || "Unable to save subscription plan.", "error");
      }
    });
  }

  if (plansTableBody) {
    plansTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-plan");
      if (editId) {
        const item = plans.find((row) => row.id === editId);
        if (!item) return;
        planIdInput.value = item.id;
        planTitleInput.value = item.title || "";
        planPriceInput.value = item.price != null ? String(item.price) : "";
        planDurationInput.value = item.durationDays != null ? String(item.durationDays) : "";
        planDescriptionInput.value = item.description || "";
        planIsActiveInput.checked = Boolean(item.isActive);
        planSubmitBtn.textContent = "Update Plan";
        planCancelBtn.classList.remove("hidden");
        planForm.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const deleteId = target.getAttribute("data-delete-plan");
      if (deleteId) {
        const confirmed = window.confirm("Delete this subscription plan?");
        if (!confirmed) return;
        try {
          await apiRequest(`/admin/subscriptions/${deleteId}`, { method: "DELETE" });
          await Promise.all([loadPlans(), loadOverview()]);
        } catch (error) {
          setMessage(error.message || "Unable to delete plan.", "error");
        }
      }
    });
  }

  if (planCancelBtn) {
    planCancelBtn.addEventListener("click", () => {
      resetPlanForm();
      setMessage("");
    });
  }
});
