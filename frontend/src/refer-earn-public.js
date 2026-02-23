document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileSearchToggle = document.querySelector("#mobileSearchToggle");
  const mobileCoursesToggle = document.querySelector("#mobileCoursesToggle");
  const headerCourseSelect = document.querySelector("#headerCourseSelect");
  const headerCourseSelectMobile = document.querySelector("#headerCourseSelectMobile");
  const navLinks = document.querySelectorAll(".nav-links a");
  if (!(header instanceof HTMLElement)) return;

  const navigateByCourse = (courseValue) => {
    const value = String(courseValue || "").trim();
    if (!value) return;
    if (value === "products") {
      window.location.href = "./products.html";
      return;
    }
    if (value === "mock-tests") {
      window.location.href = "./mock-tests.html";
      return;
    }
    window.location.href = "./index.html#home";
  };

  let isScrolled = false;
  const enterThreshold = 120;
  const exitThreshold = 60;
  const mobileHeaderQuery = window.matchMedia("(max-width: 680px)");

  const enforceMobileHomeHeader = () => {
    const isMobileHome = document.body.classList.contains("home-page") && mobileHeaderQuery.matches;
    if (!isMobileHome) {
      header.style.position = "";
      header.style.top = "";
      header.style.left = "";
      header.style.right = "";
      header.style.width = "";
      header.style.zIndex = "";
      header.style.transform = "";
      return;
    }
    header.style.position = "fixed";
    header.style.top = "0";
    header.style.left = "0";
    header.style.right = "0";
    header.style.width = "100%";
    header.style.zIndex = "1000";
    header.style.transform = "none";
  };

  const toggleHeaderLogo = () => {
    const y = window.scrollY;
    enforceMobileHomeHeader();
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
  window.addEventListener("resize", enforceMobileHomeHeader, { passive: true });
  window.addEventListener("orientationchange", enforceMobileHomeHeader, { passive: true });

  if (menuToggle instanceof HTMLButtonElement) {
    menuToggle.addEventListener("click", () => {
      header.classList.remove("mobile-search-open");
      header.classList.remove("mobile-courses-open");
      if (mobileSearchToggle instanceof HTMLButtonElement) {
        mobileSearchToggle.setAttribute("aria-expanded", "false");
      }
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (mobileSearchToggle instanceof HTMLButtonElement) {
    mobileSearchToggle.addEventListener("click", () => {
      header.classList.remove("menu-open");
      header.classList.remove("mobile-courses-open");
      if (menuToggle instanceof HTMLButtonElement) {
        menuToggle.setAttribute("aria-expanded", "false");
      }
      const isOpen = header.classList.toggle("mobile-search-open");
      mobileSearchToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (mobileCoursesToggle instanceof HTMLButtonElement) {
    mobileCoursesToggle.addEventListener("click", () => {
      header.classList.toggle("mobile-courses-open");
    });
  }

  [headerCourseSelect, headerCourseSelectMobile].forEach((selectEl) => {
    if (!(selectEl instanceof HTMLSelectElement)) return;
    selectEl.addEventListener("change", () => navigateByCourse(selectEl.value));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("menu-open");
      header.classList.remove("mobile-search-open");
      header.classList.remove("mobile-courses-open");
      if (menuToggle instanceof HTMLButtonElement) {
        menuToggle.setAttribute("aria-expanded", "false");
      }
      if (mobileSearchToggle instanceof HTMLButtonElement) {
        mobileSearchToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  const formatRupees = (amount) => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value) || value <= 0) return "₹0";
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  };

  const buildDummyEarners = (names) => {
    const fallbackNames = names.length
      ? names
      : [
          "Harvinder S.",
          "Simran K.",
          "Manpreet G.",
          "Ravneet D.",
          "Gurpreet B.",
          "Navjot P.",
          "Jaspreet A.",
          "Amanjot M.",
          "Parminder R.",
          "Tanveer H.",
          "Rajveer T.",
          "Baljeet W.",
          "Mandeep N.",
          "Harman U.",
          "Komal Z.",
          "Rupinder C.",
          "Deepika V.",
          "Sukhdeep Q.",
          "Gagandeep L.",
          "Prabhjot Y.",
        ];
    let amount = 12800 + Math.round(Math.random() * 700);
    return fallbackNames.slice(0, 20).map((name) => {
      amount -= 180 + Math.round(Math.random() * 520);
      return { name, amount: Math.max(3200, amount) };
    });
  };

  const parseAmountValue = (rawValue) => {
    const parsed = Number.parseFloat(String(rawValue || "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed);
  };

  const readSeedEarners = (listElement) => {
    if (!(listElement instanceof HTMLOListElement)) return [];
    return Array.from(listElement.querySelectorAll("li"))
      .map((item) => {
        const name = String(item.querySelector("span")?.textContent || "").trim();
        const amount = parseAmountValue(item.querySelector("strong")?.textContent || "");
        return { name, amount };
      })
      .filter((row) => row.name);
  };

  const renderEarnerRows = (listElement, rows) => {
    if (!(listElement instanceof HTMLOListElement)) return;
    listElement.innerHTML = rows
      .map(
        (row) => `<li><span>${String(row?.name || "-")}</span><strong>${formatRupees(row?.amount)}</strong></li>`
      )
      .join("");
  };

  const initTopEarnersTicker = () => {
    const scrollBox = document.querySelector(".public-earners-scroll");
    const primaryList = document.querySelector("[data-earners-primary]");
    const duplicateList = document.querySelector("[data-earners-duplicate]");
    if (!(scrollBox instanceof HTMLElement)) return;
    if (!(primaryList instanceof HTMLOListElement)) return;
    if (!(duplicateList instanceof HTMLOListElement)) return;

    const seedRows = readSeedEarners(primaryList);
    const initialNames = seedRows.map((row) => row.name);

    const externalRows = Array.isArray(window.CC_TOP_EARNERS) ? window.CC_TOP_EARNERS : [];
    const hasRealRows = externalRows.length > 0;
    if (hasRealRows) {
      document.body.classList.add("has-real-earners");
    } else {
      document.body.classList.remove("has-real-earners");
    }

    const rows = hasRealRows
      ? externalRows.slice(0, 20).map((item) => ({
          name: String(item?.name || "-"),
          amount: Number(item?.amount || 0),
        }))
      : seedRows.length
      ? seedRows.slice(0, 20).map((row) => ({
          name: row.name,
          amount: Number(row.amount || 0),
        }))
      : buildDummyEarners(initialNames);

    renderEarnerRows(primaryList, rows);
    renderEarnerRows(duplicateList, rows);

    let timerId = null;
    let touchResumeTimerId = null;

    const clearTouchResumeTimer = () => {
      if (!touchResumeTimerId) return;
      clearTimeout(touchResumeTimerId);
      touchResumeTimerId = null;
    };

    const startAutoScroll = () => {
      if (timerId) return;
      timerId = window.setInterval(() => {
        const cycleHeight = primaryList.scrollHeight;
        if (cycleHeight <= 0) return;
        scrollBox.scrollTop += 1;
        if (scrollBox.scrollTop >= cycleHeight) {
          // Reset to row #1 after each cycle.
          scrollBox.scrollTop = 0;
        }
      }, 32);
    };

    const stopAutoScroll = () => {
      if (!timerId) return;
      clearInterval(timerId);
      timerId = null;
    };

    const scheduleTouchResume = () => {
      clearTouchResumeTimer();
      touchResumeTimerId = window.setTimeout(() => {
        startAutoScroll();
      }, 900);
    };

    startAutoScroll();
    scrollBox.addEventListener("mouseenter", stopAutoScroll);
    scrollBox.addEventListener("mouseleave", startAutoScroll);
    scrollBox.addEventListener("touchstart", () => {
      stopAutoScroll();
      clearTouchResumeTimer();
    }, { passive: true });
    scrollBox.addEventListener("touchmove", stopAutoScroll, { passive: true });
    scrollBox.addEventListener("touchend", scheduleTouchResume, { passive: true });
    scrollBox.addEventListener("touchcancel", scheduleTouchResume, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoScroll();
        clearTouchResumeTimer();
        return;
      }
      startAutoScroll();
    });
  };

  initTopEarnersTicker();
});
