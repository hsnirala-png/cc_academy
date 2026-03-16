document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileSearchToggle = document.querySelector("#mobileSearchToggle");
  const mobileCoursesToggle = document.querySelector("#mobileCoursesToggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  if (!(header instanceof HTMLElement)) return;

  let isScrolled = false;
  const enterThreshold = 120;
  const exitThreshold = 60;

  const closeHeaderMenus = () => {
    header.classList.remove("menu-open");
    header.classList.remove("mobile-search-open");
    header.classList.remove("mobile-courses-open");
    if (menuToggle instanceof HTMLButtonElement) menuToggle.setAttribute("aria-expanded", "false");
    if (mobileSearchToggle instanceof HTMLButtonElement) mobileSearchToggle.setAttribute("aria-expanded", "false");
  };

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
      if (isOpen) {
        const searchInput =
          document.querySelector("#headerCourseSearchMobile") ||
          document.querySelector("#headerCourseSearch");
        if (searchInput instanceof HTMLInputElement) {
          window.setTimeout(() => searchInput.focus(), 30);
        }
      }
    });
  }

  if (mobileCoursesToggle instanceof HTMLButtonElement) {
    mobileCoursesToggle.addEventListener("click", () => {
      header.classList.toggle("mobile-courses-open");
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeHeaderMenus();
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (header.contains(target)) return;
    closeHeaderMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeHeaderMenus();
  });

  window.addEventListener("pageshow", closeHeaderMenus);
});
