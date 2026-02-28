(() => {
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("cc_user") || "null");
    } catch {
      return null;
    }
  };

  const getStoredToken = () => localStorage.getItem("cc_token");
  const clearStoredAuth = () => {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem("cc_token");
      storage.removeItem("cc_user");
    });
  };
  const resolveUserRole = (user, defaultStudent = false) => {
    const role = String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
      .trim()
      .toUpperCase();
    if (role) return role;
    return defaultStudent ? "STUDENT" : "";
  };

  const getPathContext = () => {
    const pathname = String(window.location.pathname || "").toLowerCase();
    const isExtensionless = Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
    const inNestedFolder = pathname.includes("/admin-login/");
    const prefix = inNestedFolder ? "../" : "./";
    return { pathname, isExtensionless, prefix };
  };

  const resolveRoute = (name, options = {}) => {
    const { extensionlessOnly = false } = options;
    const { isExtensionless, prefix } = getPathContext();
    if (extensionlessOnly) {
      return name ? `${prefix}${name}` : prefix;
    }
    return isExtensionless ? `${prefix}${name}` : `${prefix}${name}.html`;
  };

  const getStudentDashboardPath = () => resolveRoute("dashboard");
  const getAdminDashboardPath = () => resolveRoute("admin");
  const getStudentNavItems = () => [
    {
      href: resolveRoute("dashboard"),
      label: "Dashboard",
      className: "nav-link-dashboard",
    },
    {
      href: resolveRoute("lessons"),
      label: "Lessons",
      className: "nav-link-lessons",
    },
    {
      href: resolveRoute("my-subscriptions"),
      label: "My Subscriptions",
      className: "nav-link-subscriptions",
    },
    {
      href: resolveRoute("mock-tests"),
      label: "Mock Tests",
      className: "nav-link-mock-tests",
    },
    {
      href: resolveRoute("mock-history"),
      label: "History",
      className: "nav-link-history",
    },
    {
      href: resolveRoute("refer-earn"),
      label: "Refer & Earn",
      className: "nav-link-refer",
    },
    {
      href: resolveRoute("profile"),
      label: "Profile",
      className: "nav-link-profile",
    },
  ];

  const isStudentNavPage = () => {
    const { pathname } = getPathContext();
    const normalized = String(pathname || "").toLowerCase();
    return [
      "/dashboard",
      "/dashboard.html",
      "/lessons",
      "/lessons.html",
      "/lesson-player",
      "/lesson-player.html",
      "/mock-tests",
      "/mock-tests.html",
      "/mock-history",
      "/mock-history.html",
      "/mock-attempt",
      "/mock-attempt.html",
      "/mock-test-registration",
      "/mock-test-registration.html",
      "/my-subscriptions",
      "/my-subscriptions.html",
      "/profile",
      "/profile.html",
      "/refer-earn",
      "/refer-earn.html",
      "/products",
      "/products.html",
    ].some((suffix) => normalized.endsWith(suffix));
  };

  const isCurrentStudentNavItem = (href) => {
    try {
      const current = new URL(window.location.href);
      const target = new URL(href, current.href);
      const currentPath = current.pathname.replace(/\/+$/, "");
      const targetPath = target.pathname.replace(/\/+$/, "");
      return currentPath === targetPath;
    } catch {
      return false;
    }
  };

  const normalizeStudentNavigation = () => {
    if (!isStudentSession() || !isStudentNavPage()) return;

    const nav = document.querySelector("#primary-nav.nav-links");
    if (!(nav instanceof HTMLElement)) return;

    const navItems = getStudentNavItems();
    nav.innerHTML = navItems
      .map((item) => {
        const isActive = isCurrentStudentNavItem(item.href);
        const activeAttrs = isActive ? ' aria-current="page" class="' : ' class="';
        return `<a href="${item.href}"${activeAttrs}${item.className}${
          isActive ? " is-active" : ""
        }" data-label="${item.label}" aria-label="${item.label}">${item.label}</a>`;
      })
      .join("");

    const mobileLogoutLink = document.createElement("a");
    mobileLogoutLink.href = "#logout";
    mobileLogoutLink.id = "mobileMenuLogoutLink";
    mobileLogoutLink.className = "mobile-only-nav-link nav-link-logout";
    mobileLogoutLink.dataset.label = "Logout";
    mobileLogoutLink.setAttribute("aria-label", "Logout");
    mobileLogoutLink.textContent = "Logout";
    nav.appendChild(mobileLogoutLink);

    mobileLogoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      clearStoredAuth();
      window.location.href = getHomePath();
    });
  };

  const getHomePath = () => {
    const { isExtensionless, prefix } = getPathContext();
    return isExtensionless ? prefix : `${prefix}index.html`;
  };

  const isStudentSession = () => {
    const user = getStoredUser();
    return Boolean(resolveUserRole(user, true) === "STUDENT" && getStoredToken());
  };

  const isAdminSession = () => {
    const user = getStoredUser();
    return Boolean(resolveUserRole(user) === "ADMIN" && getStoredToken());
  };

  const getFallbackBackPath = () => {
    const { pathname } = getPathContext();
    if (pathname.includes("/admin")) {
      return isAdminSession() ? getAdminDashboardPath() : resolveRoute("admin-login");
    }
    if (isStudentSession()) {
      return getStudentDashboardPath();
    }
    return getHomePath();
  };

  const canUseHistoryBack = () => {
    if (window.history.length <= 1) return false;
    if (!document.referrer) return false;
    try {
      const refUrl = new URL(document.referrer);
      const hereUrl = new URL(window.location.href);
      if (refUrl.origin !== hereUrl.origin) return false;
      if (refUrl.href === hereUrl.href) return false;
      return true;
    } catch {
      return false;
    }
  };

  const shouldHideBackButton = () => {
    const { pathname } = getPathContext();
    const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
    const onLanding =
      normalizedPath === "/" ||
      normalizedPath.endsWith("/index") ||
      normalizedPath.endsWith("/index.html");
    const onStudentDashboard =
      normalizedPath.endsWith("/dashboard") || normalizedPath.endsWith("/dashboard.html");
    return onLanding || onStudentDashboard;
  };

  const attachBackButton = () => {
    if (shouldHideBackButton()) return;

    const header = document.querySelector(".site-header");
    if (!(header instanceof HTMLElement)) return;

    let headerActions = header.querySelector(".header-actions");
    if (!(headerActions instanceof HTMLElement)) {
      headerActions = document.createElement("div");
      headerActions.className = "header-actions";
      const headerRight = header.querySelector(".header-right");
      if (headerRight instanceof HTMLElement) {
        headerRight.appendChild(headerActions);
      } else {
        header.appendChild(headerActions);
      }
    }

    if (headerActions.querySelector("[data-global-back-btn]")) return;

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "btn-ghost global-back-btn";
    backBtn.setAttribute("data-global-back-btn", "1");
    backBtn.setAttribute("aria-label", "Go back");
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => {
      if (canUseHistoryBack()) {
        window.history.back();
        return;
      }
      window.location.href = getFallbackBackPath();
    });

    headerActions.insertAdjacentElement("afterbegin", backBtn);
  };

  const isLandingLikeHref = (href) => {
    const normalized = String(href || "").trim().toLowerCase();
    if (!normalized) return false;
    if (
      normalized === "#" ||
      normalized === "/" ||
      normalized === "./" ||
      normalized === "#home" ||
      normalized === "./index.html" ||
      normalized === "/index.html"
    ) {
      return true;
    }
    if (normalized === "index.html" || normalized === "./index.html#home" || normalized === "index.html#home") {
      return true;
    }
    if (normalized.startsWith("./index.html#") || normalized.startsWith("/index.html#")) return true;
    if (normalized.startsWith("/#")) return true;
    return false;
  };

  const shouldMapHashLinkToDashboard = (link) => {
    if (!(link instanceof HTMLAnchorElement)) return false;
    const href = String(link.getAttribute("href") || "").trim();
    if (!href.startsWith("#")) return false;

    const { pathname } = getPathContext();
    const onDashboard = pathname.endsWith("/dashboard") || pathname.endsWith("/dashboard.html");
    if (onDashboard) return false;

    if (link.closest(".nav-links")) return true;
    if (link.id === "homeTopLink") return true;
    if (link.classList.contains("brand")) return true;
    return false;
  };

  const applyStudentDashboardLinking = () => {
    if (!isStudentSession()) return;

    const dashboardPath = getStudentDashboardPath();
    document.querySelectorAll("a[href]").forEach((node) => {
      if (!(node instanceof HTMLAnchorElement)) return;
      const href = String(node.getAttribute("href") || "").trim();
      if (!href) return;

      if (!isLandingLikeHref(href) && !shouldMapHashLinkToDashboard(node)) return;

      node.setAttribute("href", dashboardPath);
      node.addEventListener("click", (event) => {
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.href = dashboardPath;
      });
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    normalizeStudentNavigation();
    attachBackButton();
    applyStudentDashboardLinking();
  });
})();
