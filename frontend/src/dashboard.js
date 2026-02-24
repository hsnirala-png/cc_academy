document.addEventListener("DOMContentLoaded", async () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  const readStoredAuth = () => {
    const parseAuth = (storage) => {
      const token = storage.getItem("cc_token");
      let user = null;
      try {
        user = JSON.parse(storage.getItem("cc_user") || "null");
      } catch {
        user = null;
      }
      return { token, user };
    };
    const localAuth = parseAuth(localStorage);
    const sessionAuth = parseAuth(sessionStorage);
    if (localAuth.token && localAuth.user) return localAuth;
    if (sessionAuth.token && sessionAuth.user) return sessionAuth;
    return {
      token: localAuth.token || sessionAuth.token || null,
      user: localAuth.user || sessionAuth.user || null,
    };
  };
  const storedAuth = readStoredAuth();
  const token = storedAuth.token;
  const dashMessage = document.querySelector("#dashMessage");
  const logoutBtn = document.querySelector("#logoutBtn");
  const dashTitleName = document.querySelector("#dashTitleName");
  const dashStudentId = document.querySelector("#dashStudentId");
  const dashAvatar = document.querySelector("#dashAvatar");
  const dashAvatarInput = document.querySelector("#dashAvatarInput");
  const dashSubline = document.querySelector("#dashSubline");
  const dashCoverImg = document.querySelector("#dashCoverImg");
  const dashCoverPlaceholder = document.querySelector("#dashCoverPlaceholder");
  const dashCoverBtn = document.querySelector("#dashCoverBtn");
  const dashCoverBtnMobile = document.querySelector("#dashCoverBtnMobile");
  const dashCoverModal = document.querySelector("#dashCoverModal");
  const dashCoverClose = document.querySelector("#dashCoverClose");
  const dashCoverInput = document.querySelector("#dashCoverInput");
  const dashCoverRemove = document.querySelector("#dashCoverRemove");
  const dashLessonTests = document.querySelector("#dashLessonTests");
  const dashLessonTestStatus = document.querySelector("#dashLessonTestStatus");
  const dashProductsCatalog = document.querySelector("#dashProductsCatalog");
  const dashProductsStatus = document.querySelector("#dashProductsStatus");
  const dashReferEarnBtn = document.querySelector("#dashReferEarnBtn");
  const headerReferEarnBtn = document.querySelector("#headerReferEarnBtn");
  const dashSliderTrack = document.querySelector("#dashSliderTrack");
  const dashSliderDotsWrap = document.querySelector("#dashSliderDots");
  let dashSliderDots = [];

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0";
  const API_BASE = isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "";
  const isExtensionlessRoute = () => {
    const currentPath = (window.location.pathname || "").toLowerCase();
    return Boolean(currentPath) && !currentPath.endsWith(".html") && currentPath !== "/";
  };
  const getPagePath = (name) => (isExtensionlessRoute() ? `./${name}` : `./${name}.html`);
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  const resolveAttemptPagePath = async () => {
    const candidates = isExtensionlessRoute()
      ? ["./mock-attempt", "./mock-attempt.html"]
      : ["./mock-attempt.html", "./mock-attempt"];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { cache: "no-store" });
        if (response.ok) return candidate;
      } catch {
        // Try next path.
      }
    }

    return candidates[0];
  };

  const setMessage = (text, type) => {
    if (!dashMessage) return;
    if (type === "success") {
      dashMessage.textContent = "";
      dashMessage.classList.remove("error", "success");
      return;
    }
    dashMessage.textContent = text || "";
    dashMessage.classList.remove("error", "success");
    if (type) dashMessage.classList.add(type);
  };
  const setLessonTestStatus = (text, type) => {
    if (!dashLessonTestStatus) return;
    dashLessonTestStatus.textContent = text || "";
    dashLessonTestStatus.classList.remove("error", "success");
    if (type) dashLessonTestStatus.classList.add(type);
  };
  const setProductsStatus = (text, type) => {
    if (!dashProductsStatus) return;
    dashProductsStatus.textContent = text || "";
    dashProductsStatus.classList.remove("error", "success");
    if (type) dashProductsStatus.classList.add(type);
  };

  const state = {
    lessonOverview: null,
    productsCatalog: [],
    sliderIndex: 0,
    sliderRealCount: 0,
    sliderLoopIndex: 0,
    sliderTimerId: null,
    sliderTransitionMs: 450,
    sliderIntervalMs: 5000,
  };

  const setTitle = (name) => {
    if (!dashTitleName) return;
    const displayName = (name || "").trim();
    dashTitleName.textContent = displayName || "Student Dashboard";
  };

  const setStudentIdText = (studentCode) => {
    if (!dashStudentId) return;
    const safeCode = String(studentCode || "").trim();
    dashStudentId.textContent = `Student ID: ${safeCode || "-"}`;
  };

  const referEarnPath = getPagePath("refer-earn");
  if (dashReferEarnBtn instanceof HTMLAnchorElement) dashReferEarnBtn.href = referEarnPath;
  if (headerReferEarnBtn instanceof HTMLAnchorElement) headerReferEarnBtn.href = referEarnPath;
  const getSliderTransition = () => Math.max(120, state.sliderTransitionMs);
  const getProductsPagePath = () => getPagePath("products");
  const toCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

  const normalizeSliderAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
    return `./${raw}`;
  };
  const normalizeProductAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "./public/PSTET_1.png";
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
    return `./${raw}`;
  };

  const clearSliderTimer = () => {
    if (state.sliderTimerId) {
      window.clearInterval(state.sliderTimerId);
      state.sliderTimerId = null;
    }
  };

  const getSliderTotalSlots = () =>
    Math.max(1, state.sliderRealCount + (state.sliderRealCount > 1 ? 1 : 0));

  const setSliderDots = (count) => {
    if (!(dashSliderDotsWrap instanceof HTMLElement)) return;
    dashSliderDotsWrap.replaceChildren();
    if (count <= 1) {
      dashSliderDots = [];
      return;
    }
    const dots = [];
    for (let index = 0; index < count; index += 1) {
      const dot = document.createElement("button");
      dot.className = "dash-slider-dot";
      dot.type = "button";
      dot.setAttribute("data-slide-index", String(index));
      dot.setAttribute("aria-label", `Slide ${index + 1}`);
      dot.addEventListener("click", () => {
        if (state.sliderIndex === state.sliderLoopIndex) {
          resetSliderToStart();
        }
        if (!(dashSliderTrack instanceof HTMLElement)) return;
        dashSliderTrack.style.transition = `transform ${getSliderTransition()}ms linear`;
        applySliderIndex(index);
        startSlider();
      });
      dashSliderDotsWrap.appendChild(dot);
      dots.push(dot);
    }
    dashSliderDots = dots;
  };

  const applySliderIndex = (index) => {
    if (!(dashSliderTrack instanceof HTMLElement)) return;
    const safeIndex = Math.max(0, Math.min(state.sliderLoopIndex, Number(index) || 0));
    state.sliderIndex = safeIndex;
    const stepPercent = 100 / getSliderTotalSlots();
    dashSliderTrack.style.transform = `translateX(-${safeIndex * stepPercent}%)`;
    dashSliderDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === (safeIndex % Math.max(1, state.sliderRealCount)));
    });
  };

  const resetSliderToStart = () => {
    if (!(dashSliderTrack instanceof HTMLElement)) return;
    dashSliderTrack.style.transition = "none";
    applySliderIndex(0);
    void dashSliderTrack.offsetWidth;
    dashSliderTrack.style.transition = `transform ${getSliderTransition()}ms linear`;
  };

  const startSlider = () => {
    clearSliderTimer();
    if (!(dashSliderTrack instanceof HTMLElement)) return;
    if (state.sliderRealCount <= 1) return;
    state.sliderTimerId = window.setInterval(() => {
      dashSliderTrack.style.transition = `transform ${getSliderTransition()}ms linear`;
      applySliderIndex(state.sliderIndex + 1);
    }, state.sliderIntervalMs);
  };

  const buildSliderSlides = (slides) => {
    if (!(dashSliderTrack instanceof HTMLElement)) return;
    const parsedSlides = Array.isArray(slides)
      ? slides
          .map((slide) => ({
            imageUrl: normalizeSliderAssetUrl(slide?.imageUrl || ""),
            linkUrl: String(slide?.linkUrl || "").trim(),
            title: String(slide?.title || "").trim(),
          }))
          .filter((slide) => Boolean(slide.imageUrl))
      : [];

    if (!parsedSlides.length) return;

    clearSliderTimer();
    dashSliderTrack.replaceChildren();

    const appendSlide = (slide, index, isLoopClone) => {
      const wrapper = slide.linkUrl ? document.createElement("a") : document.createElement("div");
      wrapper.className = "dash-slide";
      if (wrapper instanceof HTMLAnchorElement) {
        wrapper.href = slide.linkUrl;
        if (isLoopClone) {
          wrapper.setAttribute("aria-hidden", "true");
          wrapper.tabIndex = -1;
        }
      }
      const image = document.createElement("img");
      image.src = slide.imageUrl;
      image.alt = isLoopClone ? "" : slide.title || `Dashboard slide ${index + 1}`;
      wrapper.appendChild(image);
      dashSliderTrack.appendChild(wrapper);
    };

    parsedSlides.forEach((slide, index) => appendSlide(slide, index, false));
    if (parsedSlides.length > 1) {
      appendSlide(parsedSlides[0], 0, true);
    }

    state.sliderRealCount = parsedSlides.length;
    state.sliderLoopIndex = parsedSlides.length;
    state.sliderIndex = 0;

    const totalSlots = getSliderTotalSlots();
    const slideWidth = 100 / totalSlots;
    dashSliderTrack.style.width = `${totalSlots * 100}%`;
    Array.from(dashSliderTrack.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.flex = `0 0 ${slideWidth}%`;
      child.style.width = `${slideWidth}%`;
    });

    dashSliderTrack.style.transition = `transform ${getSliderTransition()}ms linear`;
    setSliderDots(state.sliderRealCount);
    applySliderIndex(0);
    startSlider();
  };

  const getExistingSliderSlides = () => {
    if (!(dashSliderTrack instanceof HTMLElement)) return [];
    const slides = [];
    Array.from(dashSliderTrack.querySelectorAll(".dash-slide")).forEach((item, index) => {
      const image = item.querySelector("img");
      const imageUrl = normalizeSliderAssetUrl(image?.getAttribute("src") || "");
      if (!imageUrl) return;
      const linkUrl = item instanceof HTMLAnchorElement ? String(item.getAttribute("href") || "").trim() : "";
      slides.push({
        imageUrl,
        linkUrl,
        title: String(image?.getAttribute("alt") || `Dashboard slide ${index + 1}`).trim(),
      });
    });
    return slides;
  };

  const loadDashboardSliderData = async () => {
    const fallbackSlides = getExistingSliderSlides();
    if (fallbackSlides.length) {
      buildSliderSlides(fallbackSlides);
    }

    try {
      const response = await fetch(`${API_BASE}/api/sliders?page=student-dashboard`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      if (!Array.isArray(payload?.sliders) || payload.sliders.length === 0) return;
      buildSliderSlides(payload.sliders);
    } catch {
      // Keep fallback slides if API request fails.
    }
  };

  const setCover = (dataUrl) => {
    if (!dashCoverImg) return;
    if (dataUrl) {
      dashCoverImg.src = dataUrl;
      dashCoverImg.classList.remove("hidden");
      if (dashCoverPlaceholder) dashCoverPlaceholder.classList.add("hidden");
      return;
    }
    dashCoverImg.removeAttribute("src");
    dashCoverImg.classList.add("hidden");
    if (dashCoverPlaceholder) dashCoverPlaceholder.classList.remove("hidden");
  };

  const setAvatar = (dataUrl, name) => {
    if (!dashAvatar) return;
    if (dataUrl) {
      dashAvatar.src = dataUrl;
      return;
    }
    const initial = ((name || "U").trim()[0] || "U").toUpperCase();
    dashAvatar.src =
      `data:image/svg+xml;utf8,` +
      `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'>` +
      `<rect width='100%' height='100%' fill='%23edf3ff'/>` +
      `<text x='50%' y='58%' font-size='24' text-anchor='middle' fill='%230f53bd'>${initial}</text>` +
      `</svg>`;
  };

  const goToHome = () => {
    window.location.href = "./index.html";
  };

  const clearAuth = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    sessionStorage.removeItem("cc_token");
    sessionStorage.removeItem("cc_user");
  };

  const getProfileStoreKey = (mobile) => `cc_profile_${mobile || ""}`;

  const getCurrentProfileKey = () => {
    const user = readStoredAuth().user;
    return getProfileStoreKey(user?.mobile || "");
  };

  const openCoverModal = () => {
    if (!dashCoverModal) return;
    dashCoverModal.classList.add("open");
    dashCoverModal.setAttribute("aria-hidden", "false");
  };

  const closeCoverModal = () => {
    if (!dashCoverModal) return;
    dashCoverModal.classList.remove("open");
    dashCoverModal.setAttribute("aria-hidden", "true");
  };

  const progressPercentForLesson = (lesson) => {
    const completed = Boolean(lesson?.progress?.completed);
    const durationSec = Number(lesson?.durationSec || 0);
    const watchedSec = Math.max(0, Number(lesson?.progress?.lastPositionSec || 0));
    if (completed) return 100;
    if (durationSec <= 0) return 0;
    return Math.min(100, Math.round((watchedSec / durationSec) * 100));
  };

  const renderLessonTests = () => {
    if (!(dashLessonTests instanceof HTMLElement)) return;
    const chapter = state.lessonOverview?.chapter || null;
    const course = state.lessonOverview?.course || null;
    const summary = state.lessonOverview?.summary || null;
    const lessons = Array.isArray(state.lessonOverview?.lessons) ? state.lessonOverview.lessons : [];
    const lessonTests = lessons.filter((lesson) => Boolean(lesson?.assessmentTestId));

    if (!lessonTests.length) {
      dashLessonTests.innerHTML = `
        <article class="dash-card">
          <p class="dash-k">No lesson-linked tests available yet.</p>
          <p class="dash-v">Attach a test to any lesson from Digital Lessons admin.</p>
          <p><a class="btn-secondary" href="${getPagePath("lessons")}">Open Lessons</a></p>
        </article>
      `;
      return;
    }

    dashLessonTests.innerHTML = lessonTests
      .map((lesson) => {
        const progress = progressPercentForLesson(lesson);
        return `
          <article class="dash-card">
            <p class="dash-k">${escapeHtml(course?.title || "-")} | ${escapeHtml(chapter?.title || "-")}</p>
            <p class="dash-v">${escapeHtml(lesson.title || "Lesson")}</p>
            <p class="dash-k">Lesson Progress: ${progress}%</p>
            <p class="dash-k">Course Progress: ${Number(summary?.completionPercent || 0)}%</p>
            <p>
              <button class="btn-primary" type="button" data-dash-attempt-test="${escapeHtml(
                lesson.assessmentTestId
              )}">Attempt Test</button>
              <button class="btn-secondary" type="button" data-dash-open-lesson="${escapeHtml(
                lesson.id
              )}">Open Lesson</button>
            </p>
          </article>
        `;
      })
      .join("");
  };

  const renderProductsCatalog = () => {
    if (!(dashProductsCatalog instanceof HTMLElement)) return;
    const products = Array.isArray(state.productsCatalog) ? state.productsCatalog : [];
    if (!products.length) {
      dashProductsCatalog.innerHTML = `
        <article class="dash-card">
          <p class="dash-k">No products available right now.</p>
          <p><a class="btn-primary" href="${getProductsPagePath()}">Buy</a></p>
        </article>
      `;
      return;
    }

    dashProductsCatalog.innerHTML = products
      .map((product) => {
        const id = String(product?.id || "").trim();
        const image = normalizeProductAssetUrl(product?.thumbnailUrl || "");
        const demoTests = Array.isArray(product?.demoMockTests) ? product.demoMockTests : [];
        const primaryDemoTest =
          demoTests.find((item) => String(item?.id || "").trim()) || null;
        const demoMockTestId = String(primaryDemoTest?.id || "").trim();
        const demoUrl = String(product?.demoLessonUrl || "").trim();
        const demoLabel = "Demo";
        const hasDemoAction = Boolean(demoMockTestId || demoUrl);
        const courseType = String(product?.courseType || "")
          .replaceAll("_", " ")
          .trim();
        return `
          <article class="dash-card dash-product-card">
            <div class="dash-product-thumb-wrap">
              <img
                class="dash-product-thumb"
                src="${escapeHtml(image)}"
                alt="${escapeHtml(product?.title || "Product")}"
                onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
              />
            </div>
            <p class="dash-k">${escapeHtml(product?.examCategory || "-")} | ${escapeHtml(product?.examName || "-")}</p>
            <p class="dash-v">${escapeHtml(product?.title || "Product")}</p>
            <p class="dash-k">${escapeHtml(product?.languageMode || "Any language")} | ${escapeHtml(courseType || "-")}</p>
            <p class="dash-k">Price: ${toCurrency(product?.salePrice)} (MRP ${toCurrency(product?.listPrice)})</p>
            <p class="dash-k">Friend Code Discount: ${toCurrency(product?.referralDiscountAmount || 0)}</p>
            <p class="dash-k">Access: ${Number(product?.accessDays || 0)} days</p>
            <input
              class="dash-ref-code-input"
              type="text"
              maxlength="40"
              placeholder="Friend Student ID / referral code (optional)"
              data-dash-referral-code
            />
            <p class="dash-product-actions">
              <a class="btn-primary" href="${getProductsPagePath()}">Buy</a>
              <button class="btn-sky" type="button" data-dash-buy-product="${escapeHtml(id)}">Buy with Wallet</button>
              <button
                class="btn-secondary"
                data-dash-demo-test-id="${escapeHtml(demoMockTestId)}"
                type="button"
                data-dash-demo-url="${escapeHtml(demoUrl)}"
                ${hasDemoAction ? "" : 'disabled title="Demo is not configured yet."'}
              >${escapeHtml(demoLabel)}</button>
            </p>
          </article>
        `;
      })
      .join("");
  };

  const buyDashboardProduct = async (productId, referralCode = "") => {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/buy-with-wallet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referralCode: String(referralCode || "").trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to purchase product.");
    }
    return payload;
  };

  const getDashboardReferralCode = (targetElement) => {
    if (!(targetElement instanceof HTMLElement)) return "";
    const card = targetElement.closest(".dash-product-card");
    if (!(card instanceof HTMLElement)) return "";
    const input = card.querySelector("[data-dash-referral-code]");
    if (!(input instanceof HTMLInputElement)) return "";
    return String(input.value || "").trim();
  };

  const startDashboardAttempt = async (mockTestId) => {
    const response = await fetch(`${API_BASE}/student/attempts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mockTestId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to start attempt.");
    }

    const attemptId = payload?.attempt?.id;
    if (!attemptId) {
      throw new Error("Unable to start attempt.");
    }

    const attemptPagePath = await resolveAttemptPagePath();
    const separator = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${separator}attemptId=${encodeURIComponent(attemptId)}`;
  };

  const normalizeDemoLessonUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../")) return raw;
    return `./${raw}`;
  };

  const openDashboardLessonByMockTestContext = async (mockTestId) => {
    const response = await fetch(
      `${API_BASE}/student/mock-tests/${encodeURIComponent(mockTestId)}/lesson-context`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to open lesson.");
    }
    const lessonId = String(payload?.lesson?.id || "").trim();
    if (!lessonId) return false;
    const chapterId = String(payload?.lesson?.chapter?.id || "").trim();
    const params = new URLSearchParams();
    params.set("lessonId", lessonId);
    if (chapterId) params.set("chapterId", chapterId);
    window.location.href = `${getPagePath("lesson-player")}?${params.toString()}`;
    return true;
  };

  const loadDashboardLessonTests = async () => {
    if (!(dashLessonTests instanceof HTMLElement)) return;

    const response = await fetch(`${API_BASE}/api/chapters/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = String(payload?.message || "");
      const lower = message.toLowerCase();
      if (
        response.status === 404 ||
        lower.includes("no chapter available") ||
        lower.includes("no course assigned")
      ) {
        state.lessonOverview = null;
        renderLessonTests();
        setLessonTestStatus("No assigned course available yet. Contact admin.", "error");
        return;
      }
      throw new Error(payload?.message || "Unable to load lesson tests.");
    }

    state.lessonOverview = payload;
    renderLessonTests();
    const summary = payload?.summary || {};
    const assignedCourses = Array.isArray(payload?.assignedCourses) ? payload.assignedCourses : [];
    const assignedText = assignedCourses.length
      ? ` Assigned courses: ${assignedCourses.map((item) => String(item?.title || "")).filter(Boolean).join(", ")}.`
      : "";
    setLessonTestStatus(
      `Course progress: ${Number(summary?.completionPercent || 0)}% (${Number(
        summary?.completedLessons || 0
      )}/${Number(summary?.totalLessons || 0)} lessons).${assignedText}`,
      "success"
    );
  };

  const loadDashboardProducts = async () => {
    if (!(dashProductsCatalog instanceof HTMLElement)) return;
    const response = await fetch(`${API_BASE}/products`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to load products.");
    }
    state.productsCatalog = Array.isArray(payload?.products) ? payload.products : [];
    renderProductsCatalog();
    setProductsStatus(`Showing ${state.productsCatalog.length} catalog product(s).`, "success");
  };

  if (header) {
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
  }

  if (menuToggle && header) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (header) header.classList.remove("menu-open");
      if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  const dashboardPath = getPagePath("dashboard");
  const homeLinks = document.querySelectorAll("a[href]");
  homeLinks.forEach((link) => {
    const href = String(link.getAttribute("href") || "").trim().toLowerCase();
    if (!href) return;
    const isHomeLink =
      href === "#home" ||
      href === "./index.html" ||
      href === "/index.html" ||
      href === "index.html" ||
      href.includes("index.html#home");
    if (!isHomeLink) return;
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.location.href = dashboardPath;
    });
  });

  if (dashCoverBtn) {
    dashCoverBtn.addEventListener("click", (event) => {
      event.preventDefault();
      openCoverModal();
    });
  }

  if (dashSliderTrack instanceof HTMLElement) {
    dashSliderTrack.style.transition = `transform ${getSliderTransition()}ms linear`;
    dashSliderTrack.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") return;
      if (state.sliderRealCount > 1 && state.sliderIndex === state.sliderLoopIndex) {
        resetSliderToStart();
      }
    });
    dashSliderTrack.addEventListener("mouseenter", () => {
      clearSliderTimer();
    });
    dashSliderTrack.addEventListener("mouseleave", () => startSlider());
    void loadDashboardSliderData();
  }

  if (dashCoverBtnMobile) {
    dashCoverBtnMobile.addEventListener("click", (event) => {
      event.preventDefault();
      openCoverModal();
    });
  }

  if (dashCoverClose) {
    dashCoverClose.addEventListener("click", (event) => {
      event.preventDefault();
      closeCoverModal();
    });
  }

  if (dashCoverModal) {
    dashCoverModal.addEventListener("click", (event) => {
      if (event.target === dashCoverModal) closeCoverModal();
    });
  }

  if (dashCoverRemove) {
    dashCoverRemove.addEventListener("click", (event) => {
      event.preventDefault();
      setCover("");
      if (dashCoverInput) dashCoverInput.value = "";
      try {
        const key = getCurrentProfileKey();
        const prev = JSON.parse(localStorage.getItem(key) || "{}");
        delete prev.coverDataUrl;
        localStorage.setItem(key, JSON.stringify(prev));
        setMessage("Cover photo removed.", "success");
        closeCoverModal();
      } catch {
        setMessage("Unable to remove cover photo.", "error");
      }
    });
  }

  if (dashAvatarInput) {
    dashAvatarInput.addEventListener("change", () => {
      const file = dashAvatarInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setMessage("Please select an image for avatar.", "error");
        dashAvatarInput.value = "";
        return;
      }
      if (file.size > 150 * 1024) {
        setMessage("Avatar image must be 150 KB or less.", "error");
        dashAvatarInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        setAvatar(dataUrl, dashTitleName?.textContent || "U");
        try {
          const key = getCurrentProfileKey();
          const prev = JSON.parse(localStorage.getItem(key) || "{}");
          prev.avatarDataUrl = dataUrl;
          localStorage.setItem(key, JSON.stringify(prev));
          setMessage("Avatar updated.", "success");
        } catch {
          setMessage("Unable to save avatar.", "error");
        }
        dashAvatarInput.value = "";
      };
      reader.readAsDataURL(file);
    });
  }

  if (dashCoverInput) {
    dashCoverInput.addEventListener("change", () => {
      const file = dashCoverInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setMessage("Please select an image for cover photo.", "error");
        dashCoverInput.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage("Cover photo must be 5 MB or less.", "error");
        dashCoverInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        setCover(dataUrl);
        try {
          const key = getCurrentProfileKey();
          const prev = JSON.parse(localStorage.getItem(key) || "{}");
          prev.coverDataUrl = dataUrl;
          localStorage.setItem(key, JSON.stringify(prev));
          setMessage("Cover photo updated.", "success");
          closeCoverModal();
        } catch {
          setMessage("Unable to save cover photo.", "error");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (!token) {
    setMessage("Please login first.", "error");
    setTimeout(goToHome, 700);
    return;
  }

  if (dashLessonTests instanceof HTMLElement) {
    dashLessonTests.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const attemptBtn = target.closest("[data-dash-attempt-test]");
      if (attemptBtn instanceof HTMLElement) {
        const mockTestId = String(attemptBtn.getAttribute("data-dash-attempt-test") || "").trim();
        if (!mockTestId) return;
        try {
          setLessonTestStatus("Starting attempt...");
          await startDashboardAttempt(mockTestId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to start attempt.";
          setLessonTestStatus(message, "error");
        }
        return;
      }

      const lessonBtn = target.closest("[data-dash-open-lesson]");
      if (lessonBtn instanceof HTMLElement) {
        const lessonId = String(lessonBtn.getAttribute("data-dash-open-lesson") || "").trim();
        const chapterId = String(state.lessonOverview?.chapter?.id || "").trim();
        if (!lessonId) return;
        const params = new URLSearchParams();
        params.set("lessonId", lessonId);
        if (chapterId) params.set("chapterId", chapterId);
        window.location.href = `${getPagePath("lesson-player")}?${params.toString()}`;
      }
    });
  }

  if (dashProductsCatalog instanceof HTMLElement) {
    dashProductsCatalog.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const demoTestBtn = target.closest("[data-dash-demo-test-id]");
      if (demoTestBtn instanceof HTMLElement) {
        const mockTestId = String(demoTestBtn.getAttribute("data-dash-demo-test-id") || "").trim();
        const demoUrl = String(demoTestBtn.getAttribute("data-dash-demo-url") || "").trim();
        try {
          if (mockTestId) {
            setProductsStatus("Opening demo lesson...");
            const opened = await openDashboardLessonByMockTestContext(mockTestId);
            if (opened) return;
          }

          const resolvedDemoUrl = normalizeDemoLessonUrl(demoUrl);
          if (resolvedDemoUrl) {
            setProductsStatus("Opening demo lesson...");
            window.location.href = resolvedDemoUrl;
            return;
          }

          if (mockTestId) {
            setProductsStatus("Starting demo attempt...");
            await startDashboardAttempt(mockTestId);
            return;
          }

          throw new Error("Demo lesson is not configured yet.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to open demo lesson.";
          setProductsStatus(message, "error");
        }
        return;
      }
      const buyBtn = target.closest("[data-dash-buy-product]");
      if (!(buyBtn instanceof HTMLElement)) return;
      const productId = String(buyBtn.getAttribute("data-dash-buy-product") || "").trim();
      if (!productId) return;
      const referralCode = getDashboardReferralCode(buyBtn);
      try {
        setProductsStatus("Purchasing product...");
        const payload = await buyDashboardProduct(productId, referralCode);
        const savedAmount = Number(payload?.purchase?.referralDiscountApplied || 0);
        if (savedAmount > 0) {
          setProductsStatus(`Product purchased successfully. You saved ${toCurrency(savedAmount)}.`, "success");
        } else {
          setProductsStatus("Product purchased successfully.", "success");
        }
        await loadDashboardProducts();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to purchase product.";
        setProductsStatus(message, "error");
      }
    });
  }

  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};

    if (response.status === 401 || response.status === 403) {
      setMessage("Session expired. Please login again.", "error");
      clearAuth();
      setTimeout(goToHome, 900);
      return;
    }
    if (!response.ok || !data.user) {
      const message = data?.message || "Unable to verify session.";
      setMessage(message, "error");
      return;
    }
    if (data.user.role === "ADMIN") {
      window.location.href = "./admin.html";
      return;
    }
    setTitle(data.user.name || "");
    setStudentIdText(data.user.studentCode || "");
    if (dashSubline) {
      dashSubline.textContent = `${data.user.city || "-"}, ${data.user.state || "-"}`;
    }
    const storeKey = getProfileStoreKey(data.user.mobile || "");
    const stored = localStorage.getItem(storeKey);
    let avatarDataUrl = "";
    let coverDataUrl = "";
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        avatarDataUrl = parsed?.avatarDataUrl || "";
        coverDataUrl = parsed?.coverDataUrl || "";
      } catch {}
    }
    setAvatar(avatarDataUrl, data.user.name || "");
    setCover(coverDataUrl);
    setMessage("");
    try {
      setLessonTestStatus("Loading lesson tests...");
      await loadDashboardLessonTests();
    } catch (lessonError) {
      const message = lessonError instanceof Error ? lessonError.message : "Unable to load lesson tests.";
      setLessonTestStatus(message, "error");
    }
    try {
      setProductsStatus("Loading product catalog...");
      await loadDashboardProducts();
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "Unable to load product catalog.";
      setProductsStatus(message, "error");
    }
  } catch (error) {
    setMessage("Unable to load dashboard. Please ensure backend is running.", "error");
    const localUser = readStoredAuth().user;
    if (localUser) {
      try {
        if (localUser?.role === "ADMIN") {
          window.location.href = "./admin.html";
          return;
        }
        setTitle(localUser?.name || "");
        setStudentIdText(localUser?.studentCode || "");
        if (dashSubline) {
          dashSubline.textContent = `${localUser?.city || "-"}, ${localUser?.state || "-"}`;
        }
        const storeKey = getProfileStoreKey(localUser?.mobile || "");
        const stored = localStorage.getItem(storeKey);
        let avatarDataUrl = "";
        let coverDataUrl = "";
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            avatarDataUrl = parsed?.avatarDataUrl || "";
            coverDataUrl = parsed?.coverDataUrl || "";
          } catch {}
        }
        setAvatar(avatarDataUrl, localUser?.name || "");
        setCover(coverDataUrl);
      } catch {
        setAvatar("", "U");
        setStudentIdText("");
        setCover("");
      }
    } else {
      setAvatar("", "U");
      setStudentIdText("");
      setCover("");
    }
    setLessonTestStatus("Student dashboard loaded in offline mode. Lesson tests need backend connection.", "error");
    setProductsStatus("Student dashboard loaded in offline mode. Product catalog needs backend connection.", "error");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goToHome();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (state.sliderTimerId) {
      window.clearInterval(state.sliderTimerId);
      state.sliderTimerId = null;
    }
  });

});
