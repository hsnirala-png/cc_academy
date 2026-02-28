const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "0.0.0.0";

export const API_BASE = isLocalHost
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : "";

export const SUBJECT_LABELS = {
  PUNJABI: "Punjabi",
  ENGLISH: "English",
  CHILD_PEDAGOGY: "Child Pedagogy",
  MATHS_EVS: "Maths/EVS",
  SCIENCE_MATH: "Science/Math",
  SOCIAL_STUDIES: "Social Studies",
};

export const EXAM_LABELS = {
  PSTET_1: "PSTET-1",
  PSTET_2: "PSTET-2",
};

export const STREAM_LABELS = {
  SCIENCE_MATH: "Science/Math",
  SOCIAL_STUDIES: "Social Studies",
};

export const LANGUAGE_LABELS = {
  PUNJABI: "Punjabi",
  ENGLISH: "English",
  HINDI: "Hindi",
};

export const REQUIRED_QUESTIONS_BY_SUBJECT = {
  PUNJABI: 30,
  ENGLISH: 30,
  CHILD_PEDAGOGY: 30,
  MATHS_EVS: 60,
  SCIENCE_MATH: 60,
  SOCIAL_STUDIES: 60,
};

const readAuthFromStorage = (storage) => {
  const token = storage.getItem("cc_token");
  let user = null;
  try {
    user = JSON.parse(storage.getItem("cc_user") || "null");
  } catch {
    user = null;
  }
  return { token, user };
};

const normalizeRole = (value) => String(value || "").trim().toUpperCase();

const resolveUserRole = (user, { defaultStudent = false } = {}) => {
  if (!user || typeof user !== "object") return "";
  const role = normalizeRole(user.role || user.userRole || user.user_type || user.accountType);
  if (role) return role;
  return defaultStudent ? "STUDENT" : "";
};

const getStoredAuth = () => {
  const localAuth = readAuthFromStorage(localStorage);
  const sessionAuth = readAuthFromStorage(sessionStorage);

  if (localAuth.token && localAuth.user) return localAuth;
  if (sessionAuth.token && sessionAuth.user) return sessionAuth;

  return {
    token: localAuth.token || sessionAuth.token || null,
    user: localAuth.user || sessionAuth.user || null,
  };
};

export const getStoredUser = () => getStoredAuth().user;

export const getStoredToken = () => getStoredAuth().token;

export const clearAuth = () => {
  localStorage.removeItem("cc_token");
  localStorage.removeItem("cc_user");
  sessionStorage.removeItem("cc_token");
  sessionStorage.removeItem("cc_user");
};

export const storeAuth = (token, user, { persist = true } = {}) => {
  clearAuth();
  if (!token || !user) return;
  const storage = persist ? localStorage : sessionStorage;
  storage.setItem("cc_token", token);
  storage.setItem("cc_user", JSON.stringify(user));
};

export const goToStudentLogin = () => {
  window.location.href = "./index.html";
};

export const goToAdminLogin = () => {
  window.location.href = "./admin-login.html";
};

export const requireRoleGuard = (role) => {
  const token = getStoredToken();
  const user = getStoredUser();
  const allowedRoles = (Array.isArray(role) ? role : [role]).map((item) => normalizeRole(item));
  const userRole = resolveUserRole(user, { defaultStudent: allowedRoles.includes("STUDENT") });
  if (!token || !user || !userRole || !allowedRoles.includes(userRole)) {
    clearAuth();
    if (allowedRoles.includes("ADMIN") && !allowedRoles.includes("STUDENT")) goToAdminLogin();
    else goToStudentLogin();
    return null;
  }
  return { token, user: { ...user, role: userRole } };
};

export const requireRoleGuardStrict = async (auth, role) => {
  const resolvedAuth = auth || requireRoleGuard(role);
  if (!resolvedAuth) return null;
  const allowedRoles = (Array.isArray(role) ? role : [role]).map((item) => normalizeRole(item));
  try {
    const payload = await apiRequest({
      path: "/me",
      token: resolvedAuth.token,
    });
    const serverRole = resolveUserRole(payload?.user, {
      defaultStudent: allowedRoles.includes("STUDENT"),
    });
    if (!allowedRoles.includes(serverRole)) {
      clearAuth();
      if (allowedRoles.includes("ADMIN") && !allowedRoles.includes("STUDENT")) goToAdminLogin();
      else goToStudentLogin();
      return null;
    }
    return resolvedAuth;
  } catch {
    clearAuth();
    if (allowedRoles.includes("ADMIN") && !allowedRoles.includes("STUDENT")) goToAdminLogin();
    else goToStudentLogin();
    return null;
  }
};

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

export const apiRequest = async ({
  path,
  method = "GET",
  token,
  body,
  query,
}) => {
  const url = `${API_BASE}${path}${toQueryString(query)}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload = {};
  let textPayload = "";
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    textPayload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    let message = payload.message || "";
    if (!message && response.status === 413) {
      message = "Upload request is too large for the server/proxy. Increase VPS upload limit (for Nginx, set client_max_body_size).";
    }
    if (!message && textPayload) {
      message = textPayload.slice(0, 200).trim();
    }
    if (!message) {
      message = "Request failed";
    }
    const raw = String(message || "");
    const lower = raw.toLowerCase();
    if (
      lower.includes("can't reach database server") ||
      lower.includes("timed out fetching a new connection from the connection pool") ||
      lower.includes("connection pool")
    ) {
      message = "Database connection failed. Please verify backend database availability.";
    } else if (raw.includes("Invalid `prisma.")) {
      message = "Database request failed. Please retry.";
    }

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const parseBooleanLike = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const isDebugSyncEnabled = () => {
  try {
    const query = new URLSearchParams(window.location.search || "");
    if (query.has("DEBUG_SYNC")) {
      return parseBooleanLike(query.get("DEBUG_SYNC"));
    }
    if (query.has("debug_sync")) {
      return parseBooleanLike(query.get("debug_sync"));
    }
  } catch {
    // ignore query parsing failures
  }

  try {
    const stored = window.localStorage.getItem("DEBUG_SYNC");
    if (stored != null) {
      return parseBooleanLike(stored);
    }
  } catch {
    // ignore storage failures
  }

  try {
    if (typeof window.DEBUG_SYNC !== "undefined") {
      return parseBooleanLike(window.DEBUG_SYNC);
    }
  } catch {
    // ignore global lookup failures
  }

  return false;
};

export const debugSyncLog = (scope, payload = {}) => {
  if (!isDebugSyncEnabled()) return;
  const safeScope = String(scope || "sync").trim() || "sync";
  // Keep logging explicit and structured for drift debugging.
  console.debug(`[DEBUG_SYNC:${safeScope}]`, payload);
};

export const formatDateTime = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const CARD_COLLAPSE_SELECTOR = [
  ".admin-panel",
  ".lesson-question-bank",
  ".attempt-card",
  ".attempt-lesson-ref",
  ".lesson-video-card",
  ".lesson-transcript-card",
  ".mock-test-card",
  ".dash-card",
  ".overview-card",
].join(", ");

const deriveFallbackCardTitle = (card) => {
  if (!(card instanceof HTMLElement)) return "Card";
  if (card.classList.contains("attempt-card")) return "Questions";
  if (card.classList.contains("attempt-lesson-ref")) return "Lesson Playback Reference";
  if (card.classList.contains("lesson-video-card")) return "Playback";
  if (card.classList.contains("lesson-transcript-card")) return "Transcript";
  if (card.classList.contains("lesson-question-bank")) return "Question Bank";
  if (card.classList.contains("admin-panel")) return "Section";
  return "Card";
};

const initCardCollapseFor = (card) => {
  if (!(card instanceof HTMLElement)) return;
  if (card.dataset.cardCollapseInit === "1") return;
  if (card.closest(".modal-card")) return;
  if (card.dataset.noCollapse === "true") return;
  if (card.closest('[data-no-collapse="true"]')) return;
  card.dataset.cardCollapseInit = "1";
  card.classList.add("card-collapse-enabled");

  const children = Array.from(card.children).filter(
    (node) =>
      node instanceof HTMLElement &&
      !node.classList.contains("card-collapse-toggle") &&
      !node.classList.contains("card-collapse-body")
  );

  let header = children.find((child) =>
    child.matches("h1, h2, h3, h4, .admin-header-row, .attempt-topbar, .attempt-lesson-head, .lesson-row-head")
  );

  if (!header) {
    const fallbackTitle = document.createElement("div");
    fallbackTitle.className = "card-collapse-title";
    fallbackTitle.textContent = deriveFallbackCardTitle(card);
    card.prepend(fallbackTitle);
    header = fallbackTitle;
  }

  const body = document.createElement("div");
  body.className = "card-collapse-body";
  children.forEach((child) => {
    if (child === header) return;
    body.appendChild(child);
  });
  card.appendChild(body);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "card-collapse-toggle";
  button.setAttribute("aria-label", "Collapse card");
  button.setAttribute("title", "Collapse");
  button.textContent = "\u2191";
  card.appendChild(button);

  const setExpanded = (expanded) => {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.setAttribute("aria-label", expanded ? "Collapse card" : "Expand card");
    button.setAttribute("title", expanded ? "Collapse" : "Expand");
    button.textContent = expanded ? "\u2191" : "\u2190";
    card.classList.toggle("card-collapsed", !expanded);
    body.hidden = !expanded;
  };

  setExpanded(true);
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    setExpanded(!expanded);
  });
};

let collapseObserverAttached = false;

export const initCardCollapseToggles = (root = document) => {
  const container = root instanceof Document ? root : root instanceof HTMLElement ? root : document;

  if (container instanceof Document || container instanceof HTMLElement) {
    if (container instanceof HTMLElement && container.matches(CARD_COLLAPSE_SELECTOR)) {
      initCardCollapseFor(container);
    }
    container.querySelectorAll(CARD_COLLAPSE_SELECTOR).forEach((card) => initCardCollapseFor(card));
  }

  if (collapseObserverAttached) return;
  if (!(document.body instanceof HTMLElement)) return;
  collapseObserverAttached = true;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        initCardCollapseToggles(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

export const showConfirmDialog = ({
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
} = {}) =>
  new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.setAttribute("aria-hidden", "false");

    const card = document.createElement("div");
    card.className = "modal-card";
    card.style.width = "min(420px, 92%)";
    card.style.padding = "1rem";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", String(title || "Confirm"));

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "modal-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";

    const heading = document.createElement("h3");
    heading.style.margin = "0 0 0.45rem";
    heading.textContent = String(title || "Confirm");

    const body = document.createElement("p");
    body.style.margin = "0 0 1rem";
    body.textContent = String(message || "");

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "0.5rem";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-ghost";
    cancelBtn.textContent = String(cancelText || "Cancel");

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn-primary";
    confirmBtn.textContent = String(confirmText || "Confirm");

    actions.append(cancelBtn, confirmBtn);
    card.append(closeBtn, heading, body, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(Boolean(value));
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") finish(false);
    };

    document.addEventListener("keydown", onKeyDown);
    closeBtn.addEventListener("click", () => finish(false));
    cancelBtn.addEventListener("click", () => finish(false));
    confirmBtn.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
  });

const getStudentDashboardPath = () => {
  const pathname = String(window.location.pathname || "").toLowerCase();
  const isExtensionless = Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
  return isExtensionless ? "./dashboard" : "./dashboard.html";
};

const isStudentHomeLink = (anchor) => {
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.id === "homeTopLink") return true;

  const href = String(anchor.getAttribute("href") || "").trim().toLowerCase();
  if (!href) return false;
  if (href === "#home") return true;
  if (href === "./index.html" || href === "/index.html" || href === "index.html") return true;
  if (href.includes("index.html#home")) return true;
  if (anchor.classList.contains("brand")) {
    return href.includes("index.html") || href === "#home";
  }
  return false;
};

export const initHeaderBehavior = () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  initCardCollapseToggles(document);
  if (!header) return;

  let isScrolled = false;
  const enterThreshold = 120;
  const exitThreshold = 60;
  const toggleHeaderLogo = () => {
    const y = window.scrollY;
    if (!isScrolled && y > enterThreshold) {
      isScrolled = true;
      header.classList.add("scrolled");
    } else if (isScrolled && y < exitThreshold) {
      isScrolled = false;
      header.classList.remove("scrolled");
    }
  };
  toggleHeaderLogo();
  window.addEventListener("scroll", toggleHeaderLogo, { passive: true });

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("menu-open");
      if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  const storedUser = getStoredUser();
  const hasStudentSession = Boolean(
    resolveUserRole(storedUser, { defaultStudent: true }) === "STUDENT" && getStoredToken()
  );
  if (hasStudentSession) {
    const dashboardPath = getStudentDashboardPath();
    const homeLinks = document.querySelectorAll("a[href]");
    homeLinks.forEach((link) => {
      if (!isStudentHomeLink(link)) return;
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.href = dashboardPath;
      });
    });
  }
};
