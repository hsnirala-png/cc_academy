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
  const getMockRegistrationPath = () => resolveRoute("mock-test-registration");
  const getAiTeacherPath = () => resolveRoute("ai-teacher");
  const getTuitionSetupPath = () => resolveRoute("tuition-syllabus-upload");
  const getPublicAssetPath = (fileName) => `/public/${fileName}`;
  const getAdminDashboardPath = () => resolveRoute("admin");
  const getStudentNavItems = () => [
    {
      href: resolveRoute("dashboard"),
      label: "Dashboard",
      className: "nav-link-dashboard",
    },
    {
      href: resolveRoute("profile"),
      label: "Profile",
      className: "nav-link-profile",
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
      href: resolveRoute("support"),
      label: "Support",
      className: "nav-link-support",
    },
    {
      href: resolveRoute("refer-earn"),
      label: "Refer & Earn",
      className: "nav-link-refer",
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
      "/support",
      "/support.html",
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
      "/ai-teacher",
      "/ai-teacher.html",
      "/products",
      "/products.html",
    ].some((suffix) => normalized.endsWith(suffix));
  };

  const isMockNavPage = () => {
    const { pathname } = getPathContext();
    const normalized = String(pathname || "").toLowerCase();
    return ["/mock-tests", "/mock-tests.html", "/mock-history", "/mock-history.html", "/mock-attempt", "/mock-attempt.html", "/mock-test-registration", "/mock-test-registration.html"].some((suffix) => normalized.endsWith(suffix));
  };

  const applyPageContextClasses = () => {
    if (!(document.body instanceof HTMLElement)) return;
    document.body.classList.toggle("is-mock-page", isMockNavPage());
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

  const initDesktopStudentHeaderLogo = () => {
    const header = document.querySelector(".site-header");
    if (!(header instanceof HTMLElement)) return;

    const brand = header.querySelector(".brand");
    if (!(brand instanceof HTMLElement)) return;

    const desktopMedia = window.matchMedia("(min-width: 981px)");
    const topLogo = brand.querySelector(".logo-b");
    if (topLogo instanceof HTMLImageElement) {
      topLogo.src = "./public/ACADEEMY_LOGO_1.png";
    }

    let scrolledLogo = brand.querySelector(".logo-b2");
    if (!(scrolledLogo instanceof HTMLImageElement)) {
      scrolledLogo = document.createElement("img");
      scrolledLogo.className = "brand-logo logo-b2";
      scrolledLogo.alt = "CC Academy logo";
      scrolledLogo.setAttribute("aria-hidden", "true");
      const anchorLogo = brand.querySelector(".logo-b, .logo-b1, .logo-a");
      if (anchorLogo instanceof HTMLElement) {
        anchorLogo.insertAdjacentElement("afterend", scrolledLogo);
      } else {
        brand.appendChild(scrolledLogo);
      }
    }
    scrolledLogo.src = "./public/ACADEEMY_LOGO_2.png";
    let isScrolled = window.scrollY > 120;

    const syncDesktopLogoState = () => {
      if (!desktopMedia.matches) {
        header.classList.remove("scrolled");
        return;
      }
      const y = window.scrollY;
      if (!isScrolled && y > 120) {
        isScrolled = true;
      } else if (isScrolled && y < 60) {
        isScrolled = false;
      }
      header.classList.toggle("scrolled", isScrolled);
    };

    syncDesktopLogoState();
    window.addEventListener("scroll", syncDesktopLogoState, { passive: true });
    window.addEventListener("resize", syncDesktopLogoState);
    if (typeof desktopMedia.addEventListener === "function") {
      desktopMedia.addEventListener("change", syncDesktopLogoState);
    }
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

  const buildMockAuthRedirectUrl = () => {
    const homeUrl = new URL(getHomePath(), window.location.href);
    homeUrl.searchParams.set("auth", "login");
    homeUrl.searchParams.set("redirect", "ai-teacher");
    return homeUrl.toString();
  };

  const shouldShowMockLauncher = () => {
    const { pathname } = getPathContext();
    const normalized = String(pathname || "").toLowerCase();
    if (normalized.includes("/admin")) return false;
    if (isAdminSession()) return false;
    if (isMockNavPage()) return false;
    const isTuitionTeacherPage =
      normalized.endsWith("/tuition-teacher") || normalized.endsWith("/tuition-teacher.html");
    if (isTuitionTeacherPage) return false;
    const isMobileView = window.matchMedia("(max-width: 680px)").matches;
    const isLessonPlayerPage =
      normalized.endsWith("/lesson-player") || normalized.endsWith("/lesson-player.html");
    const isMockAttemptPage =
      normalized.endsWith("/mock-attempt") || normalized.endsWith("/mock-attempt.html");
    if (isMobileView && (isLessonPlayerPage || isMockAttemptPage)) return false;
    return true;
  };

  const attachMockLauncher = () => {
    if (!shouldShowMockLauncher()) return;
    if (!(document.body instanceof HTMLElement)) return;
    if (document.querySelector("#globalMockLauncher")) return;

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.id = "globalMockLauncher";
    launcher.className = "mock-launcher-fab";
    launcher.setAttribute("aria-label", "Open AI Teacher page");
    launcher.setAttribute("title", "AI Teacher");
    launcher.innerHTML = `<img src="${getPublicAssetPath("AI_teacher_icon.png")}" alt="" aria-hidden="true" />`;
    launcher.addEventListener("click", () => {
      if (isStudentSession()) {
        window.location.href = getAiTeacherPath();
        return;
      }
      const authModal = document.querySelector("#authModal");
      if (authModal instanceof HTMLElement) {
        const loginForm = document.querySelector("#loginForm");
        const registerForm = document.querySelector("#registerForm");
        const authModalTitle = document.querySelector("#authModalTitle");
        const showLoginTab = document.querySelector("#showLoginTab");
        const showRegisterTab = document.querySelector("#showRegisterTab");
        const loginToMockSignupLink = document.querySelector("#loginToMockSignup");

        if (loginForm instanceof HTMLElement) loginForm.classList.remove("hidden");
        if (registerForm instanceof HTMLElement) registerForm.classList.add("hidden");
        if (authModalTitle instanceof HTMLElement) authModalTitle.textContent = "Student Login";
        if (showLoginTab instanceof HTMLElement) showLoginTab.classList.add("active");
        if (showRegisterTab instanceof HTMLElement) showRegisterTab.classList.remove("active");
        if (loginToMockSignupLink instanceof HTMLAnchorElement) {
          loginToMockSignupLink.href = `${getMockRegistrationPath()}?signup=1`;
        }
        authModal.classList.add("open");
        authModal.setAttribute("aria-hidden", "false");
        window.dispatchEvent(new CustomEvent("cc-open-auth-login", { detail: { redirect: "ai-teacher" } }));
        return;
      }
      window.location.href = buildMockAuthRedirectUrl();
    });

    document.body.appendChild(launcher);
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
    applyPageContextClasses();
    initDesktopStudentHeaderLogo();
    attachBackButton();
    applyStudentDashboardLinking();
    attachMockLauncher();
  });
})();
