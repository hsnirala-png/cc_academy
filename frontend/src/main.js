document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const homeSliderTrack = document.querySelector("#homeSliderTrack");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileSearchToggle = document.querySelector("#mobileSearchToggle");
  const mobileCoursesToggle = document.querySelector("#mobileCoursesToggle");
  const headerCourseSelect = document.querySelector("#headerCourseSelect");
  const headerCourseSelectMobile = document.querySelector("#headerCourseSelectMobile");
  const homeLatestProductsGrid = document.querySelector("#homeLatestProductsGrid");
  const homeLatestProductsMessage = document.querySelector("#homeLatestProductsMessage");
  const homeLatestViewAllLink = document.querySelector(".home-latest-view-all");
  const navLinks = document.querySelectorAll(".nav-links a");
  if (!header) return;

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0";
  const API_BASE = isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "";
  const FALLBACK_PRODUCT_THUMB = "./public/PSTET_1.png";
  const isStudentLoggedIn = (() => {
    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("cc_user") || "null");
    } catch {
      storedUser = null;
    }
    const token = localStorage.getItem("cc_token");
    return Boolean(token && storedUser?.role === "STUDENT");
  })();
  const readStudentAuth = () => {
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
    const auth = localAuth.token ? localAuth : sessionAuth;
    const role = String(auth?.user?.role || "").trim().toUpperCase();
    if (!auth?.token || role !== "STUDENT") return null;
    return auth;
  };

  const homeSliderState = {
    currentIndex: 0,
    realCount: 0,
    loopIndex: 0,
    timerId: null,
    transitionMs: 500,
    intervalMs: 5000,
  };
  const homeProductsState = {
    products: [],
    windowStart: 0,
    cardsPerView: 1,
    isMobileView: false,
  };
  const getHomeProductsIsMobileView = () => window.matchMedia("(max-width: 680px)").matches;
  const getHomeProductsCardsPerView = () => 3;

  const normalizeSliderAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
    return `./${raw}`;
  };

  const clearHomeSliderTimer = () => {
    if (homeSliderState.timerId) {
      window.clearInterval(homeSliderState.timerId);
      homeSliderState.timerId = null;
    }
  };

  const getHomeSliderTotalSlots = () =>
    Math.max(1, homeSliderState.realCount + (homeSliderState.realCount > 1 ? 1 : 0));

  const applyHomeSliderIndex = (index) => {
    if (!(homeSliderTrack instanceof HTMLElement)) return;
    const maxIndex = homeSliderState.loopIndex;
    const safeIndex = Math.max(0, Math.min(maxIndex, Number(index) || 0));
    homeSliderState.currentIndex = safeIndex;
    const stepPercent = 100 / getHomeSliderTotalSlots();
    homeSliderTrack.style.transform = `translateX(-${safeIndex * stepPercent}%)`;
  };

  const resetHomeSliderToStart = () => {
    if (!(homeSliderTrack instanceof HTMLElement)) return;
    homeSliderTrack.style.transition = "none";
    applyHomeSliderIndex(0);
    void homeSliderTrack.offsetWidth;
    homeSliderTrack.style.transition = `transform ${Math.max(120, homeSliderState.transitionMs)}ms linear`;
  };

  const startHomeSlider = () => {
    clearHomeSliderTimer();
    if (!(homeSliderTrack instanceof HTMLElement)) return;
    if (homeSliderState.realCount <= 1) return;
    homeSliderState.timerId = window.setInterval(() => {
      homeSliderTrack.style.transition = `transform ${Math.max(120, homeSliderState.transitionMs)}ms linear`;
      applyHomeSliderIndex(homeSliderState.currentIndex + 1);
    }, homeSliderState.intervalMs);
  };

  const configureHomeSliderFromList = (slides) => {
    if (!(homeSliderTrack instanceof HTMLElement)) return;
    const normalizedSlides = Array.isArray(slides)
      ? slides
          .map((item) => ({
            imageUrl: normalizeSliderAssetUrl(item?.imageUrl || ""),
            linkUrl: String(item?.linkUrl || "").trim(),
            title: String(item?.title || "").trim(),
          }))
          .filter((item) => Boolean(item.imageUrl))
      : [];

    if (!normalizedSlides.length) return;

    clearHomeSliderTimer();
    homeSliderTrack.replaceChildren();

    normalizedSlides.forEach((slide, index) => {
      const wrapper = slide.linkUrl ? document.createElement("a") : document.createElement("div");
      wrapper.className = "hero-scroll-item";
      if (wrapper instanceof HTMLAnchorElement) {
        wrapper.href = slide.linkUrl;
      }

      const img = document.createElement("img");
      img.src = slide.imageUrl;
      img.alt = slide.title || `Slide ${index + 1}`;
      wrapper.appendChild(img);
      homeSliderTrack.appendChild(wrapper);
    });

    if (normalizedSlides.length > 1) {
      const first = normalizedSlides[0];
      const cloneWrapper = first.linkUrl ? document.createElement("a") : document.createElement("div");
      cloneWrapper.className = "hero-scroll-item";
      if (cloneWrapper instanceof HTMLAnchorElement) {
        cloneWrapper.href = first.linkUrl;
        cloneWrapper.setAttribute("aria-hidden", "true");
        cloneWrapper.tabIndex = -1;
      }
      const cloneImg = document.createElement("img");
      cloneImg.src = first.imageUrl;
      cloneImg.alt = "";
      cloneWrapper.appendChild(cloneImg);
      homeSliderTrack.appendChild(cloneWrapper);
    }

    const totalSlots = normalizedSlides.length + (normalizedSlides.length > 1 ? 1 : 0);
    const slideWidth = 100 / Math.max(1, totalSlots);
    homeSliderTrack.style.animation = "none";
    homeSliderTrack.style.width = `${totalSlots * 100}%`;
    Array.from(homeSliderTrack.children).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.flex = `0 0 ${slideWidth}%`;
    });

    homeSliderState.realCount = normalizedSlides.length;
    homeSliderState.loopIndex = normalizedSlides.length;
    homeSliderState.currentIndex = 0;
    homeSliderTrack.style.transition = `transform ${Math.max(120, homeSliderState.transitionMs)}ms linear`;
    applyHomeSliderIndex(0);
    startHomeSlider();
  };

  const loadHomeSliderData = async () => {
    if (!(homeSliderTrack instanceof HTMLElement)) return;

    const fallbackSlides = Array.from(homeSliderTrack.querySelectorAll(".hero-scroll-item")).map((item, index) => {
      const image = item.querySelector("img");
      const link = item instanceof HTMLAnchorElement ? item.getAttribute("href") : "";
      return {
        imageUrl: normalizeSliderAssetUrl(image?.getAttribute("src") || ""),
        linkUrl: String(link || "").trim(),
        title: String(image?.getAttribute("alt") || `Slide ${index + 1}`).trim(),
      };
    });

    if (fallbackSlides.length > 1) {
      const first = fallbackSlides[0];
      const last = fallbackSlides[fallbackSlides.length - 1];
      if (first.imageUrl === last.imageUrl && first.linkUrl === last.linkUrl) {
        fallbackSlides.pop();
      }
    }

    let slidesToUse = fallbackSlides;
    try {
      const response = await fetch(`${API_BASE}/api/sliders?page=landing`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (Array.isArray(data?.sliders) && data.sliders.length) {
          slidesToUse = data.sliders;
        }
      }
    } catch {
      // Keep fallback slides.
    }

    configureHomeSliderFromList(slidesToUse);
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizeProductAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return FALLBACK_PRODUCT_THUMB;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
    return `./${raw}`;
  };

  const toRupees = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return "\u20B90";
    return `\u20B9${Math.round(amount).toLocaleString("en-IN")}`;
  };

  const getProductDiscountPercent = (product) => {
    const listPrice = Number(product?.listPrice || 0);
    const salePrice = Number(product?.salePrice || 0);
    if (!Number.isFinite(listPrice) || listPrice <= 0) return 0;
    const diff = Math.max(0, listPrice - salePrice);
    return Math.round((diff / listPrice) * 100);
  };

  const getLatestProducts = (rows, limit = 4) => {
    const products = Array.isArray(rows) ? rows : [];
    const withIndex = products.map((item, index) => ({ item, index }));
    const toTimeValue = (entry) => {
      const candidates = [entry?.updatedAt, entry?.createdAt, entry?.publishedAt, entry?.createdOn];
      for (const candidate of candidates) {
        const stamp = Date.parse(String(candidate || ""));
        if (Number.isFinite(stamp)) return stamp;
      }
      return Number.NaN;
    };

    withIndex.sort((left, right) => {
      const leftTime = toTimeValue(left.item);
      const rightTime = toTimeValue(right.item);
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) {
        return Number.isFinite(rightTime) ? 1 : -1;
      }
      return left.index - right.index;
    });

    return withIndex.slice(0, Math.max(1, limit)).map((row) => row.item);
  };

  const setHomeLatestMessage = (text, type) => {
    if (!(homeLatestProductsMessage instanceof HTMLElement)) return;
    homeLatestProductsMessage.textContent = text || "";
    homeLatestProductsMessage.classList.remove("error", "success");
    if (type) homeLatestProductsMessage.classList.add(type);
  };

  const closeHomeMockRegistrationPopup = () => {
    const modal = document.querySelector("#homeMockRegistrationPopup");
    if (modal instanceof HTMLElement) modal.remove();
  };

  const showHomeMockRegistrationPopup = (option) => {
    const registrationUrl = String(option?.registrationPageUrl || "").trim();
    if (!registrationUrl) return;

    closeHomeMockRegistrationPopup();
    const modal = document.createElement("div");
    modal.id = "homeMockRegistrationPopup";
    modal.className = "mock-registration-modal";
    const popupImageUrl = String(option?.popupImageUrl || option?.mockThumbnailUrl || "").trim();
    const imageMarkup = popupImageUrl
      ? `<div class=\"mock-registration-banner-wrap\"><img src=\"${escapeHtml(
          popupImageUrl
        )}\" alt=\"Mock registration\" /></div>`
      : "";
    const pendingText = option?.hasPaidAccess
      ? "Paid access available."
      : `Pending chances: ${Math.max(0, Number(option?.remainingAttempts || 0))}`;
    modal.innerHTML = `
      <div class=\"mock-registration-dialog mock-global-reg-popup\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Mock Registration\">
        <button type=\"button\" class=\"mock-registration-close\" data-home-reg-close aria-label=\"Close\">x</button>
        ${imageMarkup}
        <h3 class=\"mock-global-reg-title\">${escapeHtml(option?.title || option?.mockTestTitle || "Mock Registration")}</h3>
        <p class=\"mock-global-reg-sub\">${escapeHtml(pendingText)}</p>
      </div>
    `;
    document.body.appendChild(modal);

    const routeToRegistration = () => {
      window.location.href = registrationUrl;
    };

    const closeBtn = modal.querySelector("[data-home-reg-close]");
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
        if (target instanceof HTMLElement && target.closest("[data-home-reg-close]")) return;
        routeToRegistration();
      });
    }
  };

  const loadHomeMockRegistrationPopup = async () => {
    const auth = readStudentAuth();
    if (!auth?.token) return;
    try {
      const response = await fetch(`${API_BASE}/student/mock-registrations/options`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const options = Array.isArray(data?.options) ? data.options : [];
      if (!options.length) return;
      const preferred =
        options.find(
          (item) =>
            !item?.hasPaidAccess &&
            Number(item?.remainingAttempts || 0) > 0
        ) || options[0];
      showHomeMockRegistrationPopup(preferred);
    } catch {
      // Keep silent on home page.
    }
  };

  const renderHomeLatestProductCard = (product) => {
    const thumb = normalizeProductAssetUrl(product?.thumbnailUrl || "");
    const title = String(product?.title || "Untitled course");
    const language = String(product?.languageMode || "Multi");
    const courseType = String(product?.courseType || "COURSE").replaceAll("_", " ");
    const examCategory = String(product?.examCategory || "General");
    const examName = String(product?.examName || "Course");
    const salePrice = Number(product?.salePrice || 0);
    const listPrice = Number(product?.listPrice || 0);
    const discountPercent = getProductDiscountPercent(product);
    const encodedProductId = encodeURIComponent(String(product?.id || "").trim());
    const productLink = encodedProductId
      ? `./products.html?productId=${encodedProductId}`
      : "./products.html";
    const checkoutLink = encodedProductId
      ? `./products.html?checkoutProductId=${encodedProductId}`
      : "./products.html";
    const guestBuyLink = "./index.html?auth=login";
    const buyNowLink = isStudentLoggedIn ? checkoutLink : guestBuyLink;

    return `
      <article class="home-latest-card">
        <img
          class="home-latest-thumb"
          src="${escapeHtml(thumb)}"
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
            <strong>${escapeHtml(toRupees(salePrice))}</strong>
            ${listPrice > salePrice ? `<span class="home-latest-mrp">${escapeHtml(toRupees(listPrice))}</span>` : ""}
            ${discountPercent > 0 ? `<span class="home-latest-off">(${discountPercent}% off)</span>` : ""}
          </div>
          <div class="home-latest-actions">
            <a class="btn-secondary" href="${productLink}">Details</a>
            <a class="btn-primary" href="${buyNowLink}">Buy</a>
          </div>
        </div>
      </article>
    `;
  };

  const renderHomeLatestProducts = (products = homeProductsState.products) => {
    if (!(homeLatestProductsGrid instanceof HTMLElement)) return;
    homeLatestProductsGrid.classList.remove("catalog-window-host");
    const rows = Array.isArray(products) ? products : [];
    homeProductsState.products = rows;
    if (!rows.length) {
      homeLatestProductsGrid.innerHTML =
        '<div class="home-latest-empty">No products available yet. Please check back soon.</div>';
      return;
    }

    const isMobileView = getHomeProductsIsMobileView();
    const cardsPerView = Math.min(getHomeProductsCardsPerView(), rows.length);
    homeProductsState.cardsPerView = cardsPerView;
    homeProductsState.isMobileView = isMobileView;
    const maxWindowStart = Math.max(0, rows.length - cardsPerView);
    if (isMobileView) {
      homeProductsState.windowStart = 0;
    } else {
      homeProductsState.windowStart = Math.max(0, Math.min(homeProductsState.windowStart, maxWindowStart));
    }
    const visibleProducts = isMobileView
      ? rows.slice(0, cardsPerView)
      : rows.slice(homeProductsState.windowStart, homeProductsState.windowStart + cardsPerView);
    const canPrev = !isMobileView && homeProductsState.windowStart > 0;
    const canNext = !isMobileView && homeProductsState.windowStart + cardsPerView < rows.length;
    const allProductsAnchorIndex = visibleProducts.length
      ? isMobileView
        ? 0
        : Math.min(cardsPerView - 1, visibleProducts.length - 1)
      : -1;
    const navMarkup = isMobileView
      ? ""
      : `
        <div class="catalog-window-nav" aria-label="Latest courses navigation">
          <button
            type="button"
            class="catalog-nav-btn"
            data-home-product-nav="prev"
            aria-label="Previous products"
            ${canPrev ? "" : "disabled"}
          >&lt;</button>
          <button
            type="button"
            class="catalog-nav-btn"
            data-home-product-nav="next"
            aria-label="Next products"
            ${canNext ? "" : "disabled"}
          >&gt;</button>
        </div>
      `;
    homeLatestProductsGrid.classList.add("catalog-window-host");
    if (homeLatestViewAllLink instanceof HTMLElement) {
      homeLatestViewAllLink.hidden = true;
    }

    homeLatestProductsGrid.innerHTML = `
      <div class="catalog-window">
        ${navMarkup}
        <div class="catalog-window-grid ${isMobileView ? "is-mobile" : "is-desktop"}">
          ${visibleProducts
            .map(
              (product, index) => `
                <div class="catalog-window-item">
                  ${
                    index === allProductsAnchorIndex
                      ? '<a class="catalog-all-products-btn" href="./products.html">All products</a>'
                      : ""
                  }
                  ${renderHomeLatestProductCard(product)}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  };

  const loadHomeLatestProducts = async () => {
    if (!(homeLatestProductsGrid instanceof HTMLElement)) return;
    homeLatestProductsGrid.classList.remove("catalog-window-host");
    setHomeLatestMessage("Loading latest courses...");

    try {
      const response = await fetch(`${API_BASE}/products`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load latest courses.");
      }

      const allProducts = Array.isArray(payload?.products) ? payload.products : [];
      const activeProducts = allProducts.filter((item) => Boolean(item?.isActive));
      const sourceProducts = activeProducts.length ? activeProducts : allProducts;
      const latestProducts = getLatestProducts(sourceProducts, Math.max(1, sourceProducts.length));
      homeProductsState.products = latestProducts;
      homeProductsState.windowStart = 0;
      renderHomeLatestProducts(homeProductsState.products);
      setHomeLatestMessage("");
    } catch {
      homeLatestProductsGrid.innerHTML =
        '<div class="home-latest-empty">Latest courses are temporarily unavailable.</div>';
      setHomeLatestMessage("");
    }
  };

  const stateCityMap = {
    "Andhra Pradesh": [
      "Alluri Sitharama Raju",
      "Anakapalli",
      "Anantapur",
      "Annamayya",
      "Bapatla",
      "Chittoor",
      "East Godavari",
      "Eluru",
      "Guntur",
      "Kakinada",
      "Konaseema",
      "Krishna",
      "Kurnool",
      "Nandyal",
      "NTR",
      "Palnadu",
      "Parvathipuram Manyam",
      "Prakasam",
      "SPSR Nellore",
      "Srikakulam",
      "Sri Sathya Sai",
      "Tirupati",
      "Visakhapatnam",
      "Vizianagaram",
      "West Godavari",
      "YSR Kadapa",
    ],
    Delhi: [
      "Central Delhi",
      "East Delhi",
      "New Delhi",
      "North Delhi",
      "North East Delhi",
      "North West Delhi",
      "Shahdara",
      "South Delhi",
      "South East Delhi",
      "South West Delhi",
      "West Delhi",
    ],
    Gujarat: [
      "Ahmedabad",
      "Amreli",
      "Anand",
      "Aravalli",
      "Banaskantha",
      "Bharuch",
      "Bhavnagar",
      "Botad",
      "Chhota Udepur",
      "Dahod",
      "Dang",
      "Devbhumi Dwarka",
      "Gandhinagar",
      "Gir Somnath",
      "Jamnagar",
      "Junagadh",
      "Kheda",
      "Kutch",
      "Mahisagar",
      "Mehsana",
      "Morbi",
      "Narmada",
      "Navsari",
      "Panchmahal",
      "Patan",
      "Porbandar",
      "Rajkot",
      "Sabarkantha",
      "Surat",
      "Surendranagar",
      "Tapi",
      "Vadodara",
      "Valsad",
    ],
    Karnataka: [
      "Bagalkot",
      "Ballari",
      "Belagavi",
      "Bengaluru Rural",
      "Bengaluru Urban",
      "Bidar",
      "Chamarajanagar",
      "Chikballapur",
      "Chikkamagaluru",
      "Chitradurga",
      "Dakshina Kannada",
      "Davanagere",
      "Dharwad",
      "Gadag",
      "Hassan",
      "Haveri",
      "Kalaburagi",
      "Kodagu",
      "Kolar",
      "Koppal",
      "Mandya",
      "Mysuru",
      "Raichur",
      "Ramanagara",
      "Shivamogga",
      "Tumakuru",
      "Udupi",
      "Uttara Kannada",
      "Vijayanagara",
      "Vijayapura",
      "Yadgir",
    ],
    Maharashtra: [
      "Ahmednagar",
      "Akola",
      "Amravati",
      "Aurangabad",
      "Beed",
      "Bhandara",
      "Buldhana",
      "Chandrapur",
      "Dhule",
      "Gadchiroli",
      "Gondia",
      "Hingoli",
      "Jalgaon",
      "Jalna",
      "Kolhapur",
      "Latur",
      "Mumbai City",
      "Mumbai Suburban",
      "Nagpur",
      "Nanded",
      "Nandurbar",
      "Nashik",
      "Osmanabad",
      "Palghar",
      "Parbhani",
      "Pune",
      "Raigad",
      "Ratnagiri",
      "Sangli",
      "Satara",
      "Sindhudurg",
      "Solapur",
      "Thane",
      "Wardha",
      "Washim",
      "Yavatmal",
    ],
    Punjab: [
      "Amritsar",
      "Barnala",
      "Bathinda",
      "Faridkot",
      "Fatehgarh Sahib",
      "Fazilka",
      "Ferozepur",
      "Gurdaspur",
      "Hoshiarpur",
      "Jalandhar",
      "Kapurthala",
      "Ludhiana",
      "Malerkotla",
      "Mansa",
      "Moga",
      "Sri Muktsar Sahib",
      "Pathankot",
      "Patiala",
      "Rupnagar",
      "Sahibzada Ajit Singh Nagar (Mohali)",
      "Sangrur",
      "Shaheed Bhagat Singh Nagar",
      "Tarn Taran",
    ],
    Rajasthan: [
      "Ajmer",
      "Alwar",
      "Banswara",
      "Baran",
      "Barmer",
      "Bharatpur",
      "Bhilwara",
      "Bikaner",
      "Bundi",
      "Chittorgarh",
      "Churu",
      "Dausa",
      "Dholpur",
      "Dungarpur",
      "Hanumangarh",
      "Jaipur",
      "Jaisalmer",
      "Jalore",
      "Jhalawar",
      "Jhunjhunu",
      "Jodhpur",
      "Karauli",
      "Kota",
      "Nagaur",
      "Pali",
      "Pratapgarh",
      "Rajsamand",
      "Sawai Madhopur",
      "Sikar",
      "Sirohi",
      "Sri Ganganagar",
      "Tonk",
      "Udaipur",
    ],
    "Tamil Nadu": [
      "Ariyalur",
      "Chengalpattu",
      "Chennai",
      "Coimbatore",
      "Cuddalore",
      "Dharmapuri",
      "Dindigul",
      "Erode",
      "Kallakurichi",
      "Kanchipuram",
      "Kanniyakumari",
      "Karur",
      "Krishnagiri",
      "Madurai",
      "Mayiladuthurai",
      "Nagapattinam",
      "Namakkal",
      "Nilgiris",
      "Perambalur",
      "Pudukkottai",
      "Ramanathapuram",
      "Ranipet",
      "Salem",
      "Sivaganga",
      "Tenkasi",
      "Thanjavur",
      "Theni",
      "Thoothukudi",
      "Tiruchirappalli",
      "Tirunelveli",
      "Tirupattur",
      "Tiruppur",
      "Tiruvallur",
      "Tiruvannamalai",
      "Tiruvarur",
      "Vellore",
      "Viluppuram",
      "Virudhunagar",
    ],
    Telangana: [
      "Adilabad",
      "Bhadradri Kothagudem",
      "Hanamkonda",
      "Hyderabad",
      "Jagtial",
      "Jangaon",
      "Jayashankar Bhupalpally",
      "Jogulamba Gadwal",
      "Kamareddy",
      "Karimnagar",
      "Khammam",
      "Komaram Bheem Asifabad",
      "Mahabubabad",
      "Mahabubnagar",
      "Mancherial",
      "Medak",
      "Medchal-Malkajgiri",
      "Mulugu",
      "Nagarkurnool",
      "Nalgonda",
      "Narayanpet",
      "Nirmal",
      "Nizamabad",
      "Peddapalli",
      "Rajanna Sircilla",
      "Rangareddy",
      "Sangareddy",
      "Siddipet",
      "Suryapet",
      "Vikarabad",
      "Wanaparthy",
      "Warangal",
      "Yadadri Bhuvanagiri",
    ],
    "Uttar Pradesh": [
      "Agra",
      "Aligarh",
      "Prayagraj",
      "Ambedkar Nagar",
      "Amethi",
      "Amroha",
      "Auraiya",
      "Azamgarh",
      "Baghpat",
      "Bahraich",
      "Ballia",
      "Balrampur",
      "Banda",
      "Barabanki",
      "Bareilly",
      "Basti",
      "Bijnor",
      "Badaun",
      "Bulandshahr",
      "Chandauli",
      "Chitrakoot",
      "Deoria",
      "Etah",
      "Etawah",
      "Ayodhya",
      "Farrukhabad",
      "Fatehpur",
      "Firozabad",
      "Gautam Buddha Nagar",
      "Ghaziabad",
      "Ghazipur",
      "Gonda",
      "Gorakhpur",
      "Hamirpur",
      "Hapur",
      "Hardoi",
      "Hathras",
      "Jalaun",
      "Jaunpur",
      "Jhansi",
      "Kannauj",
      "Kanpur Dehat",
      "Kanpur Nagar",
      "Kasganj",
      "Kaushambi",
      "Kushinagar",
      "Lakhimpur Kheri",
      "Lalitpur",
      "Lucknow",
      "Maharajganj",
      "Mahoba",
      "Mainpuri",
      "Mathura",
      "Mau",
      "Meerut",
      "Mirzapur",
      "Moradabad",
      "Muzaffarnagar",
      "Pilibhit",
      "Pratapgarh",
      "Rae Bareli",
      "Rampur",
      "Saharanpur",
      "Sambhal",
      "Sant Kabir Nagar",
      "Sant Ravidas Nagar (Bhadohi)",
      "Shahjahanpur",
      "Shamli",
      "Shravasti",
      "Siddharthnagar",
      "Sitapur",
      "Sonbhadra",
      "Sultanpur",
      "Unnao",
      "Varanasi",
    ],
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

  const authModal = document.querySelector("#authModal");
  const referEarnBtn = document.querySelector("#referEarnBtn");
  const mobileReferEarnBtn = document.querySelector("#mobileReferEarnBtn");
  const enrollNowBtn = document.querySelector("#enrollNowBtn");
  const enrollMobileInput = document.querySelector("#enrollMobileInput");
  const enrollMobileMessage = document.querySelector("#enrollMobileMessage");
  const openLoginTriggers = document.querySelectorAll("[data-open-login]");
  const closeAuthModal = document.querySelector("#closeAuthModal");
  const authModalTitle = document.querySelector("#authModalTitle");
  const showRegisterTab = document.querySelector("#showRegisterTab");
  const showLoginTab = document.querySelector("#showLoginTab");
  const registerForm = document.querySelector("#registerForm");
  const loginForm = document.querySelector("#loginForm");
  const registerMessage = document.querySelector("#registerMessage");
  const loginMessage = document.querySelector("#loginMessage");
  const stateSelect = document.querySelector("#studentState");
  const citySelect = document.querySelector("#studentCity");
  const citySelectWrap = document.querySelector("#citySelectWrap");
  const manualStateWrap = document.querySelector("#manualStateWrap");
  const manualCityWrap = document.querySelector("#manualCityWrap");
  const manualStateInput = document.querySelector("#studentManualState");
  const manualCityInput = document.querySelector("#studentManualCity");
  const passwordToggles = document.querySelectorAll(".password-toggle");
  const pageParams = new URLSearchParams(window.location.search);
  const referralCodeFromLink = String(pageParams.get("ref") || "").trim();
  const authModeFromLink = String(pageParams.get("auth") || "").trim().toLowerCase();
  let lockedRegisterMobile = "";

  const navigateByCourse = (courseValue) => {
    if (!courseValue) return;
    if (courseValue === "products") {
      window.location.href = "./products.html";
      return;
    }
    if (courseValue === "mock-tests") {
      window.location.href = "./mock-tests.html";
      return;
    }
    window.location.href = "./index.html#home";
  };

  const clearFieldError = (input) => {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.remove("error");
    const errorEl = field.querySelector(".error-text");
    if (errorEl) errorEl.textContent = "";
  };

  const setFieldError = (input, message) => {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.add("error");
    const errorEl = field.querySelector(".error-text");
    if (errorEl) errorEl.textContent = message;
  };

  const clearFormErrors = (form) => {
    form.querySelectorAll(".field").forEach((field) => {
      field.classList.remove("error");
      const errorEl = field.querySelector(".error-text");
      if (errorEl) errorEl.textContent = "";
    });
  };

  const setMessage = (el, text, type) => {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("error", "success");
    if (type) el.classList.add(type);
  };

  const setEnrollMessage = (text, type) => {
    setMessage(enrollMobileMessage, text, type);
  };

  const setRegisterMobile = (mobile, locked) => {
    if (!registerForm) return;
    const mobileInput = registerForm.querySelector("#studentMobile");
    if (!(mobileInput instanceof HTMLInputElement)) return;
    mobileInput.value = mobile || "";
    mobileInput.readOnly = true;
  };

  const resolvePagePath = async (candidates, markerText) => {
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { cache: "no-store" });
        if (!response.ok) continue;
        const html = await response.text();
        if (!markerText || html.includes(markerText)) return candidate;
      } catch {
        // Try next candidate.
      }
    }
    return candidates[0];
  };

  const closeHeaderMenus = () => {
    header.classList.remove("menu-open");
    header.classList.remove("mobile-search-open");
    header.classList.remove("mobile-courses-open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    if (mobileSearchToggle) mobileSearchToggle.setAttribute("aria-expanded", "false");
  };

  const openModal = (tab) => {
    if (!authModal) return;
    closeHeaderMenus();
    authModal.classList.add("open");
    authModal.setAttribute("aria-hidden", "false");
    if (tab === "login") activateLogin();
    else activateRegister();
  };

  const closeModal = () => {
    if (!authModal) return;
    authModal.classList.remove("open");
    authModal.setAttribute("aria-hidden", "true");
  };

  const activateRegister = () => {
    if (!registerForm || !loginForm) return;
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    if (showRegisterTab) showRegisterTab.classList.add("active");
    if (showLoginTab) showLoginTab.classList.remove("active");
    if (authModalTitle) authModalTitle.textContent = "Student Registration";
    setMessage(loginMessage, "");
  };

  const activateLogin = () => {
    if (!registerForm || !loginForm) return;
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    if (showLoginTab) showLoginTab.classList.add("active");
    if (showRegisterTab) showRegisterTab.classList.remove("active");
    if (authModalTitle) authModalTitle.textContent = "Student Login";
    setMessage(registerMessage, "");
  };

  const populateStates = () => {
    if (!stateSelect) return;
    Object.keys(stateCityMap)
      .sort()
      .forEach((state) => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });
    const otherOpt = document.createElement("option");
    otherOpt.value = "__other__";
    otherOpt.textContent = "Other (Type manually)";
    stateSelect.appendChild(otherOpt);
  };

  const setCityOptions = (stateName) => {
    if (!citySelect) return;
    citySelect.innerHTML = '<option value="">Select city</option>';
    (stateCityMap[stateName] || []).forEach((city) => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
    const otherOpt = document.createElement("option");
    otherOpt.value = "__other_city__";
    otherOpt.textContent = "Other (Type manually)";
    citySelect.appendChild(otherOpt);
  };

  const handleCityChange = () => {
    if (!citySelect || !manualCityWrap || !manualCityInput) return;
    const manualCity = citySelect.value === "__other_city__";
    manualCityWrap.classList.toggle("hidden", !manualCity);
    if (!manualCity) manualCityInput.value = "";
  };

  const handleStateChange = () => {
    if (!stateSelect) return;
    const stateValue = stateSelect.value;
    const isManual = stateValue === "__other__";

    if (manualStateWrap) manualStateWrap.classList.toggle("hidden", !isManual);
    if (manualCityWrap) manualCityWrap.classList.toggle("hidden", !isManual);
    if (citySelectWrap) citySelectWrap.classList.toggle("hidden", isManual);

    if (!isManual) {
      if (manualStateInput) manualStateInput.value = "";
      if (manualCityInput) manualCityInput.value = "";
      setCityOptions(stateValue);
      handleCityChange();
    } else if (citySelect) {
      citySelect.innerHTML = '<option value="">Select city</option>';
      citySelect.value = "";
    }
  };

  const validateRegister = () => {
    if (!registerForm) return null;
    clearFormErrors(registerForm);
    setMessage(registerMessage, "");

    const nameInput = registerForm.querySelector("#studentName");
    const mobileInput = registerForm.querySelector("#studentMobile");
    const stateInput = registerForm.querySelector("#studentState");
    const cityInput = registerForm.querySelector("#studentCity");
    const passwordInput = registerForm.querySelector("#studentPassword");
    const confirmPasswordInput = registerForm.querySelector("#studentConfirmPassword");

    let state = stateInput.value.trim();
    let city = cityInput.value.trim();
    let hasError = false;

    if (!nameInput.value.trim()) {
      setFieldError(nameInput, "Name is required");
      hasError = true;
    }

    if (!/^\d{10,15}$/.test(mobileInput.value.trim())) {
      setFieldError(mobileInput, "Enter valid mobile (10-15 digits)");
      hasError = true;
    }

    if (!state) {
      setFieldError(stateInput, "State is required");
      hasError = true;
    }

    if (state === "__other__") {
      state = (manualStateInput?.value || "").trim();
      city = (manualCityInput?.value || "").trim();
      if (!state) {
        setFieldError(manualStateInput, "Enter your state");
        hasError = true;
      }
      if (!city) {
        setFieldError(manualCityInput, "Enter your city");
        hasError = true;
      }
    } else if (city === "__other_city__") {
      city = (manualCityInput?.value || "").trim();
      if (!city) {
        setFieldError(manualCityInput, "Enter your city");
        hasError = true;
      }
    } else if (!city) {
      setFieldError(cityInput, "City is required");
      hasError = true;
    }

    if ((passwordInput.value || "").length < 8) {
      setFieldError(passwordInput, "Password must be at least 8 characters");
      hasError = true;
    }

    if (confirmPasswordInput.value !== passwordInput.value) {
      setFieldError(confirmPasswordInput, "Passwords do not match");
      hasError = true;
    }

    if (hasError) {
      setMessage(registerMessage, "Please fill all required fields.", "error");
      return null;
    }

    return {
      name: nameInput.value.trim(),
      mobile: mobileInput.value.trim(),
      state,
      city,
      password: passwordInput.value,
      referralCode: referralCodeFromLink || undefined,
    };
  };

  const validateLogin = () => {
    if (!loginForm) return null;
    clearFormErrors(loginForm);
    setMessage(loginMessage, "");
    const mobileInput = loginForm.querySelector("#loginMobile");
    const passwordInput = loginForm.querySelector("#loginPassword");
    let hasError = false;

    if (!/^\d{10,15}$/.test((mobileInput.value || "").trim())) {
      setFieldError(mobileInput, "Enter valid mobile (10-15 digits)");
      hasError = true;
    }
    if (!passwordInput.value) {
      setFieldError(passwordInput, "Password is required");
      hasError = true;
    }

    if (hasError) {
      setMessage(loginMessage, "Please fill all required fields.", "error");
      return null;
    }

    return {
      mobile: mobileInput.value.trim(),
      password: passwordInput.value,
    };
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    const payload = validateRegister();
    if (!payload) return;

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(registerMessage, data.message || "Registration failed", "error");
        return;
      }

      setMessage(registerMessage, "Registration successful. Please login now.", "success");
      if (loginForm) {
        const loginMobileInput = loginForm.querySelector("#loginMobile");
        if (loginMobileInput) loginMobileInput.value = payload.mobile;
      }
      activateLogin();
    } catch (error) {
      setMessage(registerMessage, "Unable to register. Please try again.", "error");
    }
  };

  const checkMobileExists = async (mobile) => {
    const response = await fetch(`${API_BASE}/auth/check-mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to verify mobile number");
    }
    return Boolean(data.exists);
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const payload = validateLogin();
    if (!payload) return;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(loginMessage, data.message || "Login failed", "error");
        return;
      }

      localStorage.setItem("cc_token", data.token);
      localStorage.setItem("cc_user", JSON.stringify(data.user));
      if (data?.user?.role === "ADMIN") {
        const adminPath = await resolvePagePath(
          ["./admin.html", "./frontend/admin.html"],
          "Admin Panel"
        );
        window.location.href = adminPath;
      } else {
        const dashboardPath = await resolvePagePath(
          ["./dashboard.html", "./frontend/dashboard.html"],
          "Student Dashboard"
        );
        window.location.href = dashboardPath;
      }
    } catch (error) {
      setMessage(loginMessage, "Unable to login. Please try again.", "error");
    }
  };

  populateStates();
  handleStateChange();
  if (homeSliderTrack instanceof HTMLElement) {
    homeSliderTrack.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") return;
      if (homeSliderState.currentIndex === homeSliderState.loopIndex) {
        resetHomeSliderToStart();
      }
    });
    homeSliderTrack.addEventListener("mouseenter", clearHomeSliderTimer);
    homeSliderTrack.addEventListener("mouseleave", () => startHomeSlider());
    void loadHomeSliderData();
  }
  let homeProductsViewportTimerId = null;
  const refreshHomeProductsViewport = () => {
    const nextIsMobileView = getHomeProductsIsMobileView();
    if (nextIsMobileView === homeProductsState.isMobileView) return;
    homeProductsState.isMobileView = nextIsMobileView;
    homeProductsState.windowStart = 0;
    renderHomeLatestProducts(homeProductsState.products);
  };
  if (homeLatestProductsGrid instanceof HTMLElement) {
    homeLatestProductsGrid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const navBtn = target.closest("[data-home-product-nav]");
      if (!(navBtn instanceof HTMLElement)) return;
      const direction = navBtn.getAttribute("data-home-product-nav");
      const step = Math.max(1, homeProductsState.cardsPerView);
      const maxWindowStart = Math.max(0, homeProductsState.products.length - step);
      if (direction === "prev") {
        homeProductsState.windowStart = Math.max(0, homeProductsState.windowStart - step);
      } else if (direction === "next") {
        homeProductsState.windowStart = Math.min(maxWindowStart, homeProductsState.windowStart + step);
      } else {
        return;
      }
      renderHomeLatestProducts(homeProductsState.products);
    });
    void loadHomeLatestProducts();
  }
  void loadHomeMockRegistrationPopup();
  enforceMobileHomeHeader();
  toggleHeaderLogo();
  window.addEventListener("scroll", toggleHeaderLogo, { passive: true });
  window.addEventListener("resize", enforceMobileHomeHeader, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      if (homeProductsViewportTimerId) window.clearTimeout(homeProductsViewportTimerId);
      homeProductsViewportTimerId = window.setTimeout(() => {
        homeProductsViewportTimerId = null;
        refreshHomeProductsViewport();
      }, 120);
    },
    { passive: true }
  );
  window.addEventListener("orientationchange", enforceMobileHomeHeader, { passive: true });
  window.addEventListener(
    "orientationchange",
    () => {
      refreshHomeProductsViewport();
    },
    { passive: true }
  );
  window.addEventListener("beforeunload", () => {
    clearHomeSliderTimer();
    if (homeProductsViewportTimerId) {
      window.clearTimeout(homeProductsViewportTimerId);
      homeProductsViewportTimerId = null;
    }
  });

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      header.classList.remove("mobile-search-open");
      header.classList.remove("mobile-courses-open");
      if (mobileSearchToggle) mobileSearchToggle.setAttribute("aria-expanded", "false");
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (mobileSearchToggle) {
    mobileSearchToggle.addEventListener("click", () => {
      header.classList.remove("menu-open");
      header.classList.remove("mobile-courses-open");
      if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
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

  if (mobileCoursesToggle) {
    mobileCoursesToggle.addEventListener("click", () => {
      header.classList.toggle("mobile-courses-open");
    });
  }

  document.addEventListener("click", (event) => {
    if (!header.classList.contains("menu-open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (header.contains(target)) return;
    closeHeaderMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeHeaderMenus();
  });

  window.addEventListener("pageshow", () => {
    closeHeaderMenus();
  });

  [headerCourseSelect, headerCourseSelectMobile].forEach((selectEl) => {
    if (!(selectEl instanceof HTMLSelectElement)) return;
    selectEl.addEventListener("change", () => navigateByCourse(selectEl.value));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeHeaderMenus();
    });
  });

  if (enrollNowBtn) {
    enrollNowBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      const mobile = (enrollMobileInput?.value || "").trim();
      setEnrollMessage("");

      if (!/^\d{10,15}$/.test(mobile)) {
        setEnrollMessage("Enter valid mobile number (10-15 digits).", "error");
        return;
      }

      try {
        setEnrollMessage("Checking mobile...");
        const exists = await checkMobileExists(mobile);
        if (exists) {
          openModal("login");
          if (loginForm) {
            const loginMobileInput = loginForm.querySelector("#loginMobile");
            if (loginMobileInput instanceof HTMLInputElement) {
              loginMobileInput.value = mobile;
            }
          }
          setMessage(loginMessage, "Already joined. Please login.", "success");
          setEnrollMessage("");
          return;
        }

        lockedRegisterMobile = mobile;
        openModal("register");
        setRegisterMobile(lockedRegisterMobile, true);
        setEnrollMessage("");
      } catch (error) {
        setEnrollMessage(error.message || "Unable to continue. Try again.", "error");
      }
    });
  }

  openLoginTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      lockedRegisterMobile = "";
      setRegisterMobile("", true);
      openModal("login");
    });
  });

  [referEarnBtn, mobileReferEarnBtn].forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      closeHeaderMenus();
      window.location.href = "./refer-earn-public.html";
    });
  });

  if (closeAuthModal) closeAuthModal.addEventListener("click", closeModal);
  if (showRegisterTab) showRegisterTab.addEventListener("click", activateRegister);
  if (showLoginTab) showLoginTab.addEventListener("click", activateLogin);
  if (stateSelect) stateSelect.addEventListener("change", handleStateChange);
  if (citySelect) citySelect.addEventListener("change", handleCityChange);
  if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);
  if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

  if (authModal) {
    authModal.addEventListener("click", (event) => {
      if (event.target === authModal) closeModal();
    });
  }

  document.querySelectorAll(".field input, .field select").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input));
    input.addEventListener("change", () => clearFieldError(input));
  });

  const passwordShowIcon = String.fromCodePoint(0x1f441);
  const passwordHideIcon = String.fromCodePoint(0x1f648);

  passwordToggles.forEach((toggle) => {
    const targetId = toggle.getAttribute("data-target");
    if (targetId) {
      const input = document.getElementById(targetId);
      if (input instanceof HTMLInputElement) {
        const showing = input.type === "text";
        toggle.textContent = showing ? passwordHideIcon : passwordShowIcon;
      }
    }

    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      if (!targetId) return;
      const input = document.getElementById(targetId);
      if (!(input instanceof HTMLInputElement)) return;

      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.textContent = showing ? passwordShowIcon : passwordHideIcon;
      toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      toggle.setAttribute("title", showing ? "Show password" : "Hide password");
    });
  });

  if (authModeFromLink === "login") {
    openModal("login");
  } else if (authModeFromLink === "register") {
    openModal("register");
  }
});
