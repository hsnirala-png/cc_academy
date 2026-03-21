import { apiRequest, getStoredToken, getStoredUser, initHeaderBehavior } from "./mock-api.js?v=2";

const isExtensionlessRoute = () => {
  const pathname = String(window.location.pathname || "").toLowerCase();
  return Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
};

const getRoute = (name) => (isExtensionlessRoute() ? `./${name}` : `./${name}.html`);

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  const userRole = normalizeRole(user);
  const statusEl = document.querySelector("#tuitionStartStatus");
  const bootstrapEl = document.querySelector("#tuitionStartBootstrap");
  const loginLink = document.querySelector("#tuitionStartLoginLink");
  const primaryCta = document.querySelector("#tuitionStartPrimaryCta");
  const secondaryCta = document.querySelector("#tuitionStartSecondaryCta");

  if (loginLink instanceof HTMLAnchorElement) {
    loginLink.classList.toggle("hidden", Boolean(token && userRole === "STUDENT"));
  }

  if (primaryCta instanceof HTMLAnchorElement) {
    primaryCta.href = token && userRole === "STUDENT" ? getRoute("dashboard") : getRoute("smart-tuitions");
    primaryCta.textContent = token && userRole === "STUDENT" ? "Return to Dashboard" : "Back to Smart Tuitions";
  }

  if (secondaryCta instanceof HTMLAnchorElement) {
    secondaryCta.href = token && userRole === "STUDENT" ? getRoute("dashboard") : `${getRoute("index")}?auth=login`;
    secondaryCta.textContent = token && userRole === "STUDENT" ? "Open Student Dashboard" : "Login as Student";
  }

  const setStatus = (text, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const renderBootstrap = (payload) => {
    if (!(bootstrapEl instanceof HTMLElement)) return;
    const boards = Array.isArray(payload?.profile?.boards) ? payload.profile.boards : [];
    const classes = Array.isArray(payload?.profile?.classes) ? payload.profile.classes : [];
    const subjects = Array.isArray(payload?.profile?.subjects) ? payload.profile.subjects : [];
    bootstrapEl.innerHTML = [
      `<div class="tuition-start-chip-row">${boards
        .map((item) => `<span>${String(item?.name || "").trim()}</span>`)
        .join("")}</div>`,
      `<p><strong>Classes:</strong> ${classes.join(", ") || "-"}</p>`,
      `<p><strong>Subjects:</strong> ${subjects.join(", ") || "-"}</p>`,
      `<p><strong>Phase:</strong> ${String(payload?.phase || "phase-1")}</p>`,
    ].join("");
  };

  if (!token || userRole !== "STUDENT") {
    setStatus("Student login is required to load tuition bootstrap. The tuition domain entry page is ready.", "success");
    renderBootstrap({
      phase: "phase-1",
      profile: {
        boards: [{ name: "CBSE" }, { name: "ICSE" }, { name: "PSEB" }],
        classes: ["6", "7", "8", "9", "10", "11", "12"],
        subjects: ["Mathematics", "Science", "English", "Social Studies", "Hindi", "Punjabi"],
      },
    });
    return;
  }

  try {
    setStatus("Loading tuition bootstrap...");
    const payload = await apiRequest({
      path: "/student/tuition/bootstrap",
      token,
    });
    renderBootstrap(payload);
    setStatus("Separate tuition domain is available for this student session.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load tuition bootstrap.";
    setStatus(message, "error");
  }
});
