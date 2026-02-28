document.addEventListener("DOMContentLoaded", async () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  const mobileMenuLogoutLink = document.querySelector("#mobileMenuLogoutLink");
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
  const dashActiveSubscriptionsCatalog = document.querySelector("#dashActiveSubscriptionsCatalog");
  const dashActiveSubscriptionsStatus = document.querySelector("#dashActiveSubscriptionsStatus");
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
  const getMockReminderMeta = (option) => {
    const reminderDate = String(option?.preferredDate || option?.scheduledDate || "").trim();
    const reminderTime = String(option?.preferredTimeSlot || option?.scheduledTimeSlot || "").trim();
    if (!reminderDate) return null;
    const timeForParse = /^\d{2}:\d{2}$/.test(reminderTime) ? reminderTime : "00:00";
    const reminderTs = Date.parse(`${reminderDate}T${timeForParse}:00`);
    if (!Number.isFinite(reminderTs) || reminderTs <= Date.now()) return null;
    const dateLabel = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(reminderTs));
    const timeLabel = reminderTime === "09:00" ? "09:00 am" : reminderTime === "17:00" ? "05:00 pm" : reminderTime;
    return { dateLabel, timeLabel: timeLabel || "Time pending" };
  };
  const resolveAttemptPagePath = async () => {
    const candidates = isExtensionlessRoute()
      ? ["./mock-attempt", "./mock-attempt.html"]
      : ["./mock-attempt.html", "./mock-attempt"];

    return resolvePagePathByMarker(candidates, "src/mock-attempt.js");
  };

  const resolveLessonPlayerPagePath = async () => {
    const candidates = isExtensionlessRoute()
      ? ["./lesson-player", "./lesson-player.html"]
      : ["./lesson-player.html", "./lesson-player"];

    return resolvePagePathByMarker(candidates, "src/lesson-player.js");
  };

  const resolvePagePathByMarker = async (candidates, marker) => {
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { cache: "no-store" });
        if (!response.ok) continue;
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("text/html")) return candidate;
        const html = await response.text().catch(() => "");
        if (!marker || html.includes(marker)) return candidate;
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
  const setActiveSubscriptionsStatus = (text, type) => {
    if (!dashActiveSubscriptionsStatus) return;
    dashActiveSubscriptionsStatus.textContent = text || "";
    dashActiveSubscriptionsStatus.classList.remove("error", "success");
    if (type) dashActiveSubscriptionsStatus.classList.add(type);
  };
  const closeDashboardRegistrationPopup = () => {
    const modal = document.querySelector("#dashboardMockRegistrationPopup");
    if (modal instanceof HTMLElement) modal.remove();
  };

  const showDashboardRegistrationPopup = (option) => {
    const registrationUrl = String(option?.registrationPageUrl || "").trim();
    if (!registrationUrl) return;
    const popupImageUrl = String(option?.popupImageUrl || "").trim();
    if (!popupImageUrl) return;
    closeDashboardRegistrationPopup();
    const modal = document.createElement("div");
    modal.id = "dashboardMockRegistrationPopup";
    modal.className = "mock-registration-modal";
    modal.innerHTML = `
      <div class=\"mock-registration-dialog mock-global-reg-popup mock-global-reg-popup--image-only\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Mock Registration\">
        <button type=\"button\" class=\"mock-registration-close\" data-dash-reg-close aria-label=\"Close\">x</button>
        <img src=\"${escapeHtml(popupImageUrl)}\" alt=\"Mock registration\" class=\"mock-global-reg-image-only\" />
      </div>
    `;
    document.body.appendChild(modal);

    const routeToRegistration = () => {
      window.location.href = registrationUrl;
    };

    const closeBtn = modal.querySelector("[data-dash-reg-close]");
    if (closeBtn instanceof HTMLButtonElement) {
      closeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        modal.remove();
      });
    }

    const dialog = modal.querySelector(".mock-global-reg-popup");
    if (dialog instanceof HTMLElement) {
      dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("[data-dash-reg-close]")) return;
        routeToRegistration();
      });
    }
  };

  const loadDashboardRegistrationPopup = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/student/mock-registrations/options`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const options = Array.isArray(data?.options) ? data.options : [];
      const popupOptions = options.filter((item) => String(item?.popupImageUrl || "").trim());
      if (!popupOptions.length) return;
      const preferred =
        popupOptions.find((item) => item?.isRegistered && getMockReminderMeta(item)) ||
        popupOptions.find((item) => !item?.hasPaidAccess && Number(item?.remainingAttempts || 0) > 0) ||
        popupOptions[0];
      showDashboardRegistrationPopup(preferred);
    } catch {
      // Keep silent in dashboard if popup API is unavailable.
    }
  };

  const state = {
    lessonOverview: null,
    activeSubscriptions: [],
    activeSubscriptionsWindowStart: 0,
    activeSubscriptionsCardsPerView: 1,
    activeSubscriptionsIsMobileView: false,
    productsCatalog: [],
    productsWindowStart: 0,
    productsCardsPerView: 1,
    productsIsMobileView: false,
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
  const getMySubscriptionsPagePath = () => getPagePath("my-subscriptions");
  const getProductsPagePath = () => getPagePath("products");
  const getProductsIsMobileView = () => window.matchMedia("(max-width: 680px)").matches;
  const getProductsCardsPerView = () => 3;
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

  const renderDashboardCatalogCard = (product, options = {}) => {
    const id = String(product?.id || "").trim();
    const image = normalizeProductAssetUrl(product?.thumbnailUrl || "");
    const demoTests = Array.isArray(product?.demoMockTests) ? product.demoMockTests : [];
    const primaryDemoTest = demoTests.find((item) => String(item?.id || "").trim()) || null;
    const demoMockTestId = String(primaryDemoTest?.id || "").trim();
    const demoUrl = String(product?.demoLessonUrl || "").trim();
    const demoLabel = "Demo";
    const hasDemoAction = Boolean(demoMockTestId || demoUrl);
    const salePrice = Number(product?.salePrice || 0);
    const listPrice = Number(product?.listPrice || 0);
    const title = String(product?.title || "Product");
    const language = String(product?.languageMode || "Multi");
    const courseType = String(product?.courseType || "COURSE").replaceAll("_", " ");
    const examCategory = String(product?.examCategory || "-");
    const examName = String(product?.examName || "-");
    const discountPercent =
      listPrice > 0 ? Math.max(0, Math.round(((listPrice - salePrice) / listPrice) * 100)) : 0;
    const productsPagePath = getProductsPagePath();
    const encodedProductId = id ? encodeURIComponent(id) : "";
    const productDetailsLink = encodedProductId
      ? `${productsPagePath}?productId=${encodedProductId}`
      : productsPagePath;
    const buyNowLink = encodedProductId
      ? `${productsPagePath}?checkoutProductId=${encodedProductId}`
      : productsPagePath;
    const detailsHref = String(options.detailsHref || productDetailsLink).trim() || productDetailsLink;
    const detailsLabel = String(options.detailsLabel || "Details").trim() || "Details";
    const primaryHref = String(options.primaryHref || buyNowLink).trim() || buyNowLink;
    const primaryLabel = String(options.primaryLabel || "Buy").trim() || "Buy";
    const primaryButtonClass = String(options.primaryButtonClass || "btn-primary").trim() || "btn-primary";
    const showDemoAction = options.showDemoAction !== false;
    return `
      <article class="home-latest-card dash-product-card">
        <img
          class="home-latest-thumb"
          src="${escapeHtml(image)}"
          alt="${escapeHtml(title)}"
          onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
        />
        <div class="home-latest-body">
          <p class="home-latest-tags">
            <span>${escapeHtml(language)}</span>
            <span>${escapeHtml(courseType)}</span>
          </p>
          <h3>${escapeHtml(title)}</h3>
          <p class="home-latest-meta">${escapeHtml(examCategory)} | ${escapeHtml(examName)}</p>
          <div class="home-latest-pricing">
            <strong>${toCurrency(salePrice)}</strong>
            ${listPrice > salePrice ? `<span class="home-latest-mrp">${toCurrency(listPrice)}</span>` : ""}
            ${discountPercent > 0 ? `<span class="home-latest-off">(${discountPercent}% off)</span>` : ""}
          </div>
          <div class="home-latest-actions dash-product-actions">
            <a class="btn-secondary" href="${escapeHtml(detailsHref)}">${escapeHtml(detailsLabel)}</a>
            <a class="${escapeHtml(primaryButtonClass)}" href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a>
            ${
              showDemoAction
                ? `
                  <button
                    class="btn-secondary"
                    data-dash-demo-test-id="${escapeHtml(demoMockTestId)}"
                    type="button"
                    data-dash-demo-url="${escapeHtml(demoUrl)}"
                    ${hasDemoAction ? "" : 'disabled title="Demo is not configured yet."'}
                  >${escapeHtml(demoLabel)}</button>
                `
                : ""
            }
          </div>
        </div>
      </article>
    `;
  };

  const renderDashboardWindowSection = ({
    container,
    items,
    windowStartKey,
    cardsPerViewKey,
    isMobileViewKey,
    navAttr,
    navLabel,
    allHref,
    allLabel,
    emptyText,
    emptyCtaHref,
    emptyCtaLabel,
    renderCard,
  }) => {
    if (!(container instanceof HTMLElement)) return;
    container.classList.remove("catalog-window-host");
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      container.innerHTML = `
        <article class="dash-card">
          <p class="dash-k">${escapeHtml(emptyText)}</p>
          ${
            emptyCtaHref && emptyCtaLabel
              ? `<p><a class="btn-primary" href="${escapeHtml(emptyCtaHref)}">${escapeHtml(emptyCtaLabel)}</a></p>`
              : ""
          }
        </article>
      `;
      return;
    }

    const isMobileView = getProductsIsMobileView();
    const cardsPerView = Math.min(getProductsCardsPerView(), rows.length);
    state[cardsPerViewKey] = cardsPerView;
    state[isMobileViewKey] = isMobileView;
    const maxWindowStart = Math.max(0, rows.length - cardsPerView);
    if (isMobileView) {
      state[windowStartKey] = 0;
    } else {
      state[windowStartKey] = Math.max(0, Math.min(state[windowStartKey], maxWindowStart));
    }
    const visibleProducts = isMobileView
      ? rows.slice(0, cardsPerView)
      : rows.slice(state[windowStartKey], state[windowStartKey] + cardsPerView);
    const canPrev = !isMobileView && state[windowStartKey] > 0;
    const canNext = !isMobileView && state[windowStartKey] + cardsPerView < rows.length;
    const allProductsAnchorIndex = visibleProducts.length
      ? isMobileView
        ? 0
        : Math.min(cardsPerView - 1, visibleProducts.length - 1)
      : -1;
    const navMarkup = isMobileView
      ? ""
      : `
        <div class="catalog-window-nav" aria-label="Product navigation">
          <button
            type="button"
            class="catalog-nav-btn"
            ${navAttr}="prev"
            aria-label="Previous ${escapeHtml(navLabel)}"
            ${canPrev ? "" : "disabled"}
          >&lt;</button>
          <button
            type="button"
            class="catalog-nav-btn"
            ${navAttr}="next"
            aria-label="Next ${escapeHtml(navLabel)}"
            ${canNext ? "" : "disabled"}
          >&gt;</button>
        </div>
      `;
    container.classList.add("catalog-window-host");
    container.innerHTML = `
      <div class="catalog-window">
        ${navMarkup}
        <div class="catalog-window-grid ${isMobileView ? "is-mobile" : "is-desktop"}">
          ${visibleProducts
            .map(
              (product, index) => `
                <div class="catalog-window-item">
                  ${
                    index === allProductsAnchorIndex
                      ? `<a class="catalog-all-products-btn" href="${escapeHtml(allHref)}">${escapeHtml(allLabel)}</a>`
                      : ""
                  }
                  ${renderCard(product)}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  };

  const renderActiveSubscriptionsCatalog = () => {
    const subscriptionsPagePath = getMySubscriptionsPagePath();
    renderDashboardWindowSection({
      container: dashActiveSubscriptionsCatalog,
      items: state.activeSubscriptions,
      windowStartKey: "activeSubscriptionsWindowStart",
      cardsPerViewKey: "activeSubscriptionsCardsPerView",
      isMobileViewKey: "activeSubscriptionsIsMobileView",
      navAttr: "data-dash-subscription-nav",
      navLabel: "subscriptions",
      allHref: subscriptionsPagePath,
      allLabel: "All Subscriptions",
      emptyText: "No active subscriptions yet. Your purchased products will appear here.",
      emptyCtaHref: getProductsPagePath(),
      emptyCtaLabel: "Browse Products",
      renderCard: (product) => {
        const productId = String(product?.id || "").trim();
        const selectedHref = productId
          ? `${subscriptionsPagePath}?productId=${encodeURIComponent(productId)}`
          : subscriptionsPagePath;
        return renderDashboardCatalogCard(product, {
          detailsHref: selectedHref,
          primaryHref: selectedHref,
          primaryLabel: "Open",
          showDemoAction: false,
        });
      },
    });
  };

  const renderProductsCatalog = () => {
    renderDashboardWindowSection({
      container: dashProductsCatalog,
      items: state.productsCatalog,
      windowStartKey: "productsWindowStart",
      cardsPerViewKey: "productsCardsPerView",
      isMobileViewKey: "productsIsMobileView",
      navAttr: "data-dash-product-nav",
      navLabel: "products",
      allHref: getProductsPagePath(),
      allLabel: "All products",
      emptyText: "No products available right now.",
      emptyCtaHref: getProductsPagePath(),
      emptyCtaLabel: "Buy",
      renderCard: (product) => renderDashboardCatalogCard(product),
    });
  };

  const startDashboardAttempt = async (mockTestId, { autoplay = false } = {}) => {
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
      const error = new Error(payload?.message || "Unable to start attempt.");
      error.status = response.status;
      error.code = payload?.code;
      error.details = payload?.details;
      throw error;
    }

    const attemptId = payload?.attempt?.id;
    if (!attemptId) {
      throw new Error("Unable to start attempt.");
    }

    const attemptPagePath = await resolveAttemptPagePath();
    const params = new URLSearchParams();
    params.set("attemptId", String(attemptId));
    if (autoplay) params.set("autoplay", "1");
    window.location.href = `${attemptPagePath}?${params.toString()}`;
  };

  const normalizeDemoLessonUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../")) return raw;
    return `./${raw}`;
  };

  const openDashboardLessonByMockTestContext = async (mockTestId, { autoplay = false } = {}) => {
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
    const lessonPlayerPath = await resolveLessonPlayerPagePath();
    const params = new URLSearchParams();
    params.set("lessonId", lessonId);
    if (chapterId) params.set("chapterId", chapterId);
    if (autoplay) params.set("autoplay", "1");
    window.location.href = `${lessonPlayerPath}?${params.toString()}`;
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
    if (!(dashProductsCatalog instanceof HTMLElement) && !(dashActiveSubscriptionsCatalog instanceof HTMLElement)) return;
    if (dashProductsCatalog instanceof HTMLElement) dashProductsCatalog.classList.remove("catalog-window-host");
    if (dashActiveSubscriptionsCatalog instanceof HTMLElement) {
      dashActiveSubscriptionsCatalog.classList.remove("catalog-window-host");
    }
    const requestUrl = `${API_BASE}/products?_t=${Date.now()}`;
    const response = await fetch(requestUrl, {
      cache: "no-store",
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
    const allProducts = Array.isArray(payload?.products) ? payload.products : [];
    state.productsCatalog = allProducts;
    state.activeSubscriptions = allProducts.filter((item) => Boolean(item?.isPremiumUnlocked));
    renderActiveSubscriptionsCatalog();
    renderProductsCatalog();
    if (state.activeSubscriptions.length) {
      const visibleSubscriptions = Math.min(getProductsCardsPerView(), state.activeSubscriptions.length);
      setActiveSubscriptionsStatus(
        `Showing ${visibleSubscriptions} of ${state.activeSubscriptions.length} active subscription(s).`,
        "success"
      );
    } else {
      setActiveSubscriptionsStatus("No active subscriptions yet. Your purchased products will appear here.", "error");
    }
    const visibleCount = Math.min(getProductsCardsPerView(), state.productsCatalog.length);
    setProductsStatus(`Showing ${visibleCount} of ${state.productsCatalog.length} catalog product(s).`, "success");
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

  const closeMenu = () => {
    if (header) header.classList.remove("menu-open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  };

  let productsViewportTimerId = null;
  const refreshProductsViewport = () => {
    const nextIsMobileView = getProductsIsMobileView();
    if (
      nextIsMobileView === state.productsIsMobileView &&
      nextIsMobileView === state.activeSubscriptionsIsMobileView
    ) {
      return;
    }
    state.productsIsMobileView = nextIsMobileView;
    state.activeSubscriptionsIsMobileView = nextIsMobileView;
    state.productsWindowStart = 0;
    state.activeSubscriptionsWindowStart = 0;
    renderActiveSubscriptionsCatalog();
    renderProductsCatalog();
  };

  if (menuToggle && header) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!header || !menuToggle) return;
    if (!header.classList.contains("menu-open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (header.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMenu();
  });

  window.addEventListener("pageshow", () => {
    closeMenu();
  });

  window.addEventListener(
    "resize",
    () => {
      if (productsViewportTimerId) window.clearTimeout(productsViewportTimerId);
      productsViewportTimerId = window.setTimeout(() => {
        productsViewportTimerId = null;
        refreshProductsViewport();
      }, 120);
    },
    { passive: true }
  );
  window.addEventListener(
    "orientationchange",
    () => {
      refreshProductsViewport();
    },
    { passive: true }
  );

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
      closeMenu();
      window.location.href = dashboardPath;
    });
  });

  if (mobileMenuLogoutLink instanceof HTMLAnchorElement) {
    mobileMenuLogoutLink.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      clearAuth();
      goToHome();
    });
  }

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
          const code = String(error?.code || "").trim();
          const details = error?.details || {};
          if (code === "MOCK_REG_REQUIRED") {
            const registrationUrl = String(details?.registrationPageUrl || "").trim();
            if (registrationUrl) {
              window.location.href = registrationUrl;
              return;
            }
          }
          if (code === "MOCK_ATTEMPTS_EXHAUSTED") {
            const buyNowUrl = String(details?.buyNowUrl || "").trim();
            if (buyNowUrl) {
              window.location.href = buyNowUrl;
              return;
            }
          }
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
        const lessonPlayerPath = await resolveLessonPlayerPagePath();
        const params = new URLSearchParams();
        params.set("lessonId", lessonId);
        if (chapterId) params.set("chapterId", chapterId);
        window.location.href = `${lessonPlayerPath}?${params.toString()}`;
      }
    });
  }

  if (dashProductsCatalog instanceof HTMLElement) {
    dashProductsCatalog.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const navBtn = target.closest("[data-dash-product-nav]");
      if (navBtn instanceof HTMLElement) {
        const direction = navBtn.getAttribute("data-dash-product-nav");
        const step = Math.max(1, state.productsCardsPerView);
        const maxWindowStart = Math.max(0, state.productsCatalog.length - step);
        if (direction === "prev") {
          state.productsWindowStart = Math.max(0, state.productsWindowStart - step);
          renderProductsCatalog();
        } else if (direction === "next") {
          state.productsWindowStart = Math.min(maxWindowStart, state.productsWindowStart + step);
          renderProductsCatalog();
        }
        return;
      }
      const demoTestBtn = target.closest("[data-dash-demo-test-id]");
      if (demoTestBtn instanceof HTMLElement) {
        const mockTestId = String(demoTestBtn.getAttribute("data-dash-demo-test-id") || "").trim();
        const demoUrl = String(demoTestBtn.getAttribute("data-dash-demo-url") || "").trim();
        try {
          if (mockTestId) {
            setProductsStatus("Opening demo lesson...");
            const opened = await openDashboardLessonByMockTestContext(mockTestId, { autoplay: true });
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
            await startDashboardAttempt(mockTestId, { autoplay: true });
            return;
          }

          throw new Error("Demo lesson is not configured yet.");
        } catch (error) {
          const code = String(error?.code || "").trim();
          const details = error?.details || {};
          if (code === "MOCK_REG_REQUIRED") {
            const registrationUrl = String(details?.registrationPageUrl || "").trim();
            if (registrationUrl) {
              window.location.href = registrationUrl;
              return;
            }
          }
          if (code === "MOCK_ATTEMPTS_EXHAUSTED") {
            const buyNowUrl = String(details?.buyNowUrl || "").trim();
            if (buyNowUrl) {
              window.location.href = buyNowUrl;
              return;
            }
          }
          const message = error instanceof Error ? error.message : "Unable to open demo lesson.";
          setProductsStatus(message, "error");
        }
        return;
      }
    });
  }

  if (dashActiveSubscriptionsCatalog instanceof HTMLElement) {
    dashActiveSubscriptionsCatalog.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const navBtn = target.closest("[data-dash-subscription-nav]");
      if (!(navBtn instanceof HTMLElement)) return;
      const direction = navBtn.getAttribute("data-dash-subscription-nav");
      const step = Math.max(1, state.activeSubscriptionsCardsPerView);
      const maxWindowStart = Math.max(0, state.activeSubscriptions.length - step);
      if (direction === "prev") {
        state.activeSubscriptionsWindowStart = Math.max(0, state.activeSubscriptionsWindowStart - step);
        renderActiveSubscriptionsCatalog();
      } else if (direction === "next") {
        state.activeSubscriptionsWindowStart = Math.min(
          maxWindowStart,
          state.activeSubscriptionsWindowStart + step
        );
        renderActiveSubscriptionsCatalog();
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
      setActiveSubscriptionsStatus("Loading active subscriptions...");
      setProductsStatus("Loading product catalog...");
      await loadDashboardProducts();
    } catch (productError) {
      const message = productError instanceof Error ? productError.message : "Unable to load product catalog.";
      setActiveSubscriptionsStatus(message, "error");
      setProductsStatus(message, "error");
    }
    void loadDashboardRegistrationPopup();
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
    setActiveSubscriptionsStatus(
      "Student dashboard loaded in offline mode. Active subscriptions need backend connection.",
      "error"
    );
    setProductsStatus("Student dashboard loaded in offline mode. Product catalog needs backend connection.", "error");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      closeMenu();
      clearAuth();
      goToHome();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (state.sliderTimerId) {
      window.clearInterval(state.sliderTimerId);
      state.sliderTimerId = null;
    }
    if (productsViewportTimerId) {
      window.clearTimeout(productsViewportTimerId);
      productsViewportTimerId = null;
    }
  });

});
