const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "0.0.0.0";

const API_BASE = isLocalHost ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
const FALLBACK_THUMB = "./public/PSTET_1.png";
const ADMISSION_CONTACT_NUMBER = "+91 62394-16404";
const ADMISSION_CONTACT_TEL = "+916239416404";
const DEFAULT_PRODUCT_HIGHLIGHTS = [
  "Access to Structured Classes in Audio with Scroll Form",
  "Doubt Solving Support via WhatsApp Chatbot, Telegram Groups, and Live Sessions (subject to availability).",
  "Boost Your Preparation with Study Planner | Previous Papers | Preparation Tips - Via Email & WhatsApp Chatbot",
  "Master PSTET with 10,000+ Carefully Curated MCQs for Every Subject.",
];
const PRODUCT_EXAMS_COVERED = [
  { title: "PSTET", imageUrl: "./public/PSTET_7.png" },
  { title: "Punjab Teaching Exams", imageUrl: "./public/PSTET_8.png" },
  { title: "CTET", imageUrl: "./public/PSTET_10.png" },
];
const PSTET_OVERVIEW_PARAGRAPHS = [
  "ਜਿਵੇਂ ਕਿ ਤੁਹਾਨੂੰ ਪਤਾ ਹੈ, PSTET ਦੀ ਪ੍ਰੀਖਿਆ 15 ਮਾਰਚ 2026 ਨੂੰ ਹੋਣੀ ਨਿਸ਼ਚਿਤ ਕੀਤੀ ਗਈ ਹੈ। ਇਸ ਨੂੰ ਧਿਆਨ ਵਿੱਚ ਰੱਖਦੇ ਹੋਏ, CC Academy ਵੱਲੋਂ PSTET Paper-1 ਅਤੇ Paper-2 ਸਾਲ 2026 ਲਈ ਇੱਕ ਵਿਸ਼ੇਸ਼ Live Crash Course ਸ਼ੁਰੂ ਕੀਤਾ ਗਿਆ ਹੈ। ਇਹ ਕੋਰਸ Bilingual (ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ) ਭਾਸ਼ਾ ਵਿੱਚ ਹੋਵੇਗਾ, ਤਾਂ ਜੋ ਹਰ ਵਿਦਿਆਰਥੀ ਲਈ ਸਮਝਣਾ ਆਸਾਨ ਰਹੇ।",
  "ਇਸ ਬੈਚ ਵਿੱਚ ਤੁਹਾਨੂੰ ਇੰਟਰਐਕਟਿਵ ਕਲਾਸਾਂ ਮਿਲਣਗੀਆਂ, ਨਾਲ ਹੀ ਤੇਜ਼ ਰਿਵੀਜ਼ਨ ਲਈ ਰਿਕਾਰਡਡ ਵੀਡੀਓਜ਼ ਵੀ ਉਪਲਬਧ ਹੋਣਗੀਆਂ। ਸਿਖਲਾਈ ਨੂੰ ਹੋਰ ਪ੍ਰਭਾਵਸ਼ਾਲੀ ਬਣਾਉਣ ਲਈ Audio-Supported Lessons ਸਕ੍ਰੀਨ ਸਕ੍ਰੋਲ ਦੇ ਨਾਲ ਪ੍ਰਦਾਨ ਕੀਤੇ ਜਾਣਗੇ, ਜਿਸ ਨਾਲ ਪੜ੍ਹਾਈ ਹੋਰ ਵੀ ਆਸਾਨ ਅਤੇ ਦਿਲਚਸਪ ਬਣੇਗੀ।",
  "ਕੋਰਸ ਵਿੱਚ Child Development & Pedagogy, ਪੰਜਾਬੀ, ਅੰਗਰੇਜ਼ੀ, ਗਣਿਤ, ਵਾਤਾਵਰਣ ਅਧਿਐਨ, ਅਤੇ ਸਮਾਜਿਕ ਅਧਿਐਨ/ਵਿਗਿਆਨ ਸਮੇਤ ਸਾਰੇ ਜ਼ਰੂਰੀ ਵਿਸ਼ੇ ਕਵਰ ਕੀਤੇ ਜਾਣਗੇ।",
  "ਵਿਦਿਆਰਥੀਆਂ ਦੀ ਤਿਆਰੀ ਅਤੇ ਪ੍ਰਗਤੀ ਨੂੰ ਮਾਪਣ ਲਈ ਨਿਯਮਿਤ Digital Tests & Evaluations ਕਰਵਾਏ ਜਾਣਗੇ। ਇਹ ਟੈਸਟ PSTET ਦੀ ਅਸਲ ਪ੍ਰੀਖਿਆ ਦੇ ਪੈਟਰਨ ਅਨੁਸਾਰ MCQs 'ਤੇ ਆਧਾਰਿਤ ਹੋਣਗੇ, ਅਤੇ ਹਰ MCQ ਲਈ ਉਚਿਤ ਸਮਾਂ ਵੀ ਨਿਰਧਾਰਤ ਕੀਤਾ ਜਾਵੇਗਾ, ਤਾਂ ਜੋ ਵਿਦਿਆਰਥੀ ਅਸਲੀ ਇਗਜ਼ਾਮ ਵਾਲੇ ਮਾਹੌਲ ਵਿੱਚ ਪ੍ਰੈਕਟਿਸ ਕਰ ਸਕਣ। ਇਸ ਨਾਲ ਤਿਆਰੀ ਹੋਰ ਵੀ ਪ੍ਰਭਾਵਸ਼ਾਲੀ ਬਣੇਗੀ ਅਤੇ ਸਿੱਖਣ ਦੀ ਗੁਣਵੱਤਾ ਯਕੀਨੀ ਬਣਾਈ ਜਾ ਸਕੇਗੀ। ਪ੍ਰੀਖਿਆ ਲਈ ਮਜ਼ਬੂਤ ਰਣਨੀਤੀ ਤਿਆਰ ਕਰਨ ਵਾਸਤੇ ਵਿਸ਼ੇਸ਼ Strategy Sessions ਵੀ ਸ਼ਾਮਲ ਹਨ।",
];
const PSTET_PACKAGE_INCLUDES = [
  "Recorded Videos for Quick Revision",
  "Audio-Supported Lessons with Scroll",
  "Digital Tests & Evaluations with Performance Review",
  "Strategy Sessions for Final Exam Preparation",
  "Doubt Support via WhatsApp Chatbot, Telegram Groups, and Live Sessions",
];
const PSTET_STUDY_PLAN = [
  "Days 4-5: Child Development & Pedagogy + Language Foundation",
  "Days 3-4: Mathematics + Environmental Studies / Science & Social",
  "Days 3-5: Full-Length Practice + Topic-Wise Revision",
  "Days 1-2: Mock-Based Analysis + Strategy Sessions + Final Revision",
];
const PSTET_SUBJECTS_COVERED = [
  "Child Development & Pedagogy",
  "Punjabi Language",
  "English Language",
  "Mathematics",
  "Environmental Studies",
  "Social Studies / Science",
];
const PSTET_EXAM_PATTERN = [
  "Mode: Objective 150 MCQ based परीक्षा pattern",
  "Regular Digital Tests based on latest PSTET trend",
  "Timed MCQ practice for real exam simulation",
  "Accuracy + Speed analysis after every test",
];
const PSTET_FAQS = [
  {
    q: "Is this batch suitable for both PSTET Paper-1 and Paper-2?",
    a: "Yes. This crash course is structured for both Paper-1 and Paper-2 preparation.",
  },
  {
    q: "Will classes be available in Punjabi and English?",
    a: "Yes. The course is bilingual so learners can understand every concept easily.",
  },
  {
    q: "Do I get recorded lectures along with live classes?",
    a: "Yes. Live classes plus recorded videos are provided for fast revision.",
  },
  {
    q: "How is test practice handled in this course?",
    a: "You get regular timed digital tests, exam-pattern MCQs, and evaluation insights.",
  },
];
const SALIENT_FEATURES = [
  {
    label: "Audio Lesson",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 16 0" />
        <path d="M4 12v5a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
        <path d="M20 12v5a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
      </svg>
    `,
  },
  {
    label: "Scroll with Audio",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h10" />
        <path d="M4 10h8" />
        <path d="M4 14h8" />
        <path d="M15 11l4-3v8l-4-3v-2Z" />
      </svg>
    `,
  },
  {
    label: "Digital Test",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8l2 2v14H6V6l2-2Z" />
        <path d="M9 9h6" />
        <path d="m9 13 1.5 1.5L15 10" />
      </svg>
    `,
  },
  {
    label: "Timer Enable",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6" />
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V9" />
        <path d="m12 13 3 2" />
      </svg>
    `,
  },
];

const normalizeAssetUrl = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return FALLBACK_THUMB;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("./") || raw.startsWith("../")) return raw;
  if (raw.startsWith("/")) return raw;
  return `./${raw}`;
};

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/products");
  const candidates = prefersExtensionless
    ? ["./mock-attempt", "./mock-attempt.html"]
    : ["./mock-attempt.html", "./mock-attempt"];

  return resolvePagePathByMarker(candidates, "src/mock-attempt.js");
};

const resolveLessonPlayerPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/products");
  const candidates = prefersExtensionless
    ? ["./lesson-player", "./lesson-player.html"]
    : ["./lesson-player.html", "./lesson-player"];

  return resolvePagePathByMarker(candidates, "src/lesson-player.js");
};

const resolveCheckoutPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/products");
  const candidates = prefersExtensionless
    ? ["./checkout", "./checkout.html"]
    : ["./checkout.html", "./checkout"];

  return resolvePagePathByMarker(candidates, "src/checkout.js");
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
      // Try next candidate.
    }
  }

  return candidates[0];
};

document.addEventListener("DOMContentLoaded", async () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileSearchToggle = document.querySelector("#mobileSearchToggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  const openLoginButtons = document.querySelectorAll("[data-open-login]");
  const referButtons = [document.querySelector("#referEarnBtn"), document.querySelector("#mobileReferEarnBtn")];
  const headerCourseSelect = document.querySelector("#headerCourseSelect");
  const headerCourseSelectMobile = document.querySelector("#headerCourseSelectMobile");
  const headerSearchDesktop = document.querySelector("#headerCourseSearch");
  const headerSearchMobile = document.querySelector("#headerCourseSearchMobile");

  const productsGrid = document.querySelector("#productsGrid");
  const productsMessage = document.querySelector("#productsMessage");
  const productsCountText = document.querySelector("#productsCountText");
  const filterCategoriesWrap = document.querySelector("#filterCategories");
  const filterExamsWrap = document.querySelector("#filterExams");
  const filterLanguagesWrap = document.querySelector("#filterLanguages");
  const examFilterSearch = document.querySelector("#examFilterSearch");
  const minPriceInput = document.querySelector("#minPrice");
  const maxPriceInput = document.querySelector("#maxPrice");
  const applyPriceFilterBtn = document.querySelector("#applyPriceFilterBtn");
  const quickLinkButtons = document.querySelectorAll(".quick-link-btn");
  const readStoredAuth = () => {
    const readAuth = (storage) => {
      const token = storage.getItem("cc_token");
      let user = null;
      try {
        user = JSON.parse(storage.getItem("cc_user") || "null");
      } catch {
        user = null;
      }
      return { token, user };
    };
    const localAuth = readAuth(localStorage);
    const sessionAuth = readAuth(sessionStorage);
    if (localAuth.token && localAuth.user) return localAuth;
    if (sessionAuth.token && sessionAuth.user) return sessionAuth;
    return {
      token: localAuth.token || sessionAuth.token || null,
      user: localAuth.user || sessionAuth.user || null,
    };
  };
  const getAuthState = () => {
    const auth = readStoredAuth();
    const token = auth.token;
    const user = auth.user;
    return {
      token,
      user,
      isStudentLoggedIn: Boolean(token && user?.role === "STUDENT"),
    };
  };

  /** @type {{products: any[], filtered: any[], quickType: string, category: string, exams: Set<string>, languages: Set<string>, search: string, examSearch: string, minPrice: number|null, maxPrice: number|null}} */
  const state = {
    products: [],
    filtered: [],
    quickType: "",
    category: "",
    exams: new Set(),
    languages: new Set(),
    search: "",
    examSearch: "",
    minPrice: null,
    maxPrice: null,
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const setMessage = (text, type) => {
    if (!productsMessage) return;
    productsMessage.textContent = text || "";
    productsMessage.classList.remove("error", "success");
    if (type) productsMessage.classList.add(type);
  };

  const pageParams = new URLSearchParams(window.location.search);
  const checkoutProductIdFromLink = String(pageParams.get("checkoutProductId") || "").trim();

  const checkoutState = {
    product: null,
    includeDefaultOffer: true,
    referralInput: "",
    appliedReferralCode: "",
    preview: null,
    busy: false,
    friendMessage: "",
    friendMessageType: "",
  };

  /** @type {null | {
   *  root: HTMLElement,
   *  dialog: HTMLElement,
   *  closeBtn: HTMLButtonElement,
   *  chip: HTMLElement,
   *  tokenValue: HTMLElement,
   *  tokenCode: HTMLElement,
   *  tokenToggleBtn: HTMLButtonElement,
   *  offerHelp: HTMLElement,
   *  sponsorInput: HTMLInputElement,
   *  sponsorApplyBtn: HTMLButtonElement,
   *  sponsorMessage: HTMLElement,
   *  orderImage: HTMLImageElement,
   *  orderTitle: HTMLElement,
   *  orderMeta: HTMLElement,
   *  orderCurrentPrice: HTMLElement,
   *  subtotalValue: HTMLElement,
   *  tokenDiscountValue: HTMLElement,
   *  friendDiscountValue: HTMLElement,
   *  payableValue: HTMLElement,
   *  continueBtn: HTMLButtonElement,
   * }} */
  let checkoutModal = null;

  const toSafeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getDiscountPercentForProduct = (product) => {
    const configured = Math.max(0, Math.round(toSafeNumber(product?.discountPercent || 0)));
    if (configured > 0) return configured;
    const listPrice = toSafeNumber(product?.listPrice);
    const salePrice = toSafeNumber(product?.salePrice);
    if (listPrice <= 0 || salePrice <= 0 || salePrice >= listPrice) return 0;
    return Math.max(0, Math.round(((listPrice - salePrice) / listPrice) * 100));
  };

  const resolveCheckoutFallbackPricing = () => {
    const product = checkoutState.product;
    if (!product) {
      return {
        listPrice: 0,
        currentPrice: 0,
        defaultOfferDiscount: 0,
        friendDiscountApplied: 0,
        payableAmount: 0,
      };
    }
    const listPrice = Math.max(0, toSafeNumber(product.listPrice));
    const salePrice = Math.max(0, toSafeNumber(product.salePrice));
    const includeDefaultOffer = checkoutState.includeDefaultOffer;
    const currentPrice = includeDefaultOffer ? Math.min(salePrice || listPrice, listPrice) : listPrice;
    const defaultOfferDiscount = includeDefaultOffer ? Math.max(0, listPrice - currentPrice) : 0;
    return {
      listPrice,
      currentPrice,
      defaultOfferDiscount,
      friendDiscountApplied: 0,
      payableAmount: Math.max(0, currentPrice),
    };
  };

  const closeCheckoutModal = () => {
    if (!checkoutModal) return;
    checkoutModal.root.classList.remove("open");
    document.body.style.overflow = "";
  };

  const setCheckoutFriendMessage = (text, type = "") => {
    checkoutState.friendMessage = String(text || "");
    checkoutState.friendMessageType = type === "error" || type === "success" ? type : "";
    if (!checkoutModal) return;
    checkoutModal.sponsorMessage.textContent = checkoutState.friendMessage;
    checkoutModal.sponsorMessage.classList.remove("error", "success");
    if (checkoutState.friendMessageType) {
      checkoutModal.sponsorMessage.classList.add(checkoutState.friendMessageType);
    }
  };

  const renderCheckoutModal = () => {
    if (!checkoutModal || !checkoutState.product) return;
    const product = checkoutState.product;
    const discountPercent = getDiscountPercentForProduct(product);
    const offerCode = discountPercent > 0 ? `CC${discountPercent}` : "OFFER";
    const pricing = checkoutState.preview?.pricing || resolveCheckoutFallbackPricing();
    const defaultDiscount = Math.max(0, toSafeNumber(pricing.defaultOfferDiscount));
    const friendDiscount = Math.max(0, toSafeNumber(pricing.friendDiscountApplied));
    const totalDiscount = defaultDiscount + friendDiscount;
    const payable = Math.max(0, toSafeNumber(pricing.payableAmount));
    const currentPrice = Math.max(0, toSafeNumber(pricing.currentPrice));
    const listPrice = Math.max(0, toSafeNumber(pricing.listPrice));

    checkoutModal.orderImage.src = normalizeAssetUrl(product.thumbnailUrl);
    checkoutModal.orderImage.onerror = () => {
      checkoutModal.orderImage.onerror = null;
      checkoutModal.orderImage.src = FALLBACK_THUMB;
    };
    checkoutModal.orderImage.alt = String(product.title || "Product");
    checkoutModal.orderTitle.textContent = String(product.title || "Product");
    checkoutModal.orderMeta.textContent = String(product.validityLabel || `${Number(product.accessDays || 0)} days access`);
    checkoutModal.orderCurrentPrice.textContent = toCurrency(currentPrice);
    checkoutModal.subtotalValue.textContent = toCurrency(listPrice);
    checkoutModal.tokenDiscountValue.textContent = `- ${toCurrency(defaultDiscount)}`;
    checkoutModal.friendDiscountValue.textContent = `- ${toCurrency(friendDiscount)}`;
    checkoutModal.payableValue.textContent = toCurrency(payable);
    checkoutModal.tokenValue.textContent = `${discountPercent}%`;
    checkoutModal.tokenCode.textContent = offerCode;
    checkoutModal.chip.textContent = checkoutState.includeDefaultOffer
      ? `(Coupon Applied ${offerCode})`
      : `(Coupon Removed)`;
    checkoutModal.tokenToggleBtn.textContent = checkoutState.includeDefaultOffer ? "REMOVE" : "APPLY";
    checkoutModal.offerHelp.textContent = checkoutState.includeDefaultOffer
      ? `Get extra ${discountPercent}% off with this token`
      : `Apply token to unlock ${discountPercent}% off`;
    checkoutModal.sponsorInput.value = checkoutState.referralInput;
    checkoutModal.sponsorApplyBtn.textContent = "Apply";
    setCheckoutFriendMessage(checkoutState.friendMessage, checkoutState.friendMessageType);
    checkoutModal.continueBtn.disabled = checkoutState.busy;
    checkoutModal.continueBtn.textContent = checkoutState.busy ? "Processing..." : "Continue";

    const hasDiscount = totalDiscount > 0;
    checkoutModal.tokenDiscountValue.parentElement.style.display = hasDiscount || defaultDiscount > 0 ? "flex" : "none";
    checkoutModal.friendDiscountValue.parentElement.style.display = hasDiscount || friendDiscount > 0 ? "flex" : "none";
  };

  const setCheckoutBusy = (busy) => {
    checkoutState.busy = Boolean(busy);
    if (!checkoutModal) return;
    checkoutModal.tokenToggleBtn.disabled = checkoutState.busy;
    checkoutModal.sponsorInput.disabled = checkoutState.busy;
    checkoutModal.sponsorApplyBtn.disabled = checkoutState.busy;
    checkoutModal.continueBtn.disabled = checkoutState.busy;
    renderCheckoutModal();
  };

  const loadCheckoutPreview = async (productId, options = {}) => {
    const { token, isStudentLoggedIn } = getAuthState();
    if (!isStudentLoggedIn || !token) {
      window.location.href = "./index.html?auth=login";
      return null;
    }
    const includeDefaultOffer = options.includeDefaultOffer !== false;
    const referralCode = String(options.referralCode || "").trim();

    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/checkout-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer,
        referralCode: referralCode || undefined,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to load checkout preview.");
    }
    return payload;
  };

  const refreshCheckoutPreview = async () => {
    const productId = String(checkoutState.product?.id || "").trim();
    if (!productId) return;
    setCheckoutBusy(true);
    try {
      const payload = await loadCheckoutPreview(productId, {
        includeDefaultOffer: checkoutState.includeDefaultOffer,
        referralCode: checkoutState.appliedReferralCode,
      });
      checkoutState.preview = payload || null;
      checkoutState.appliedReferralCode = String(payload?.offers?.appliedReferralCode || "").trim();
      renderCheckoutModal();
    } finally {
      setCheckoutBusy(false);
    }
  };

  const buyWithWallet = async (productId, options = {}) => {
    const { token, isStudentLoggedIn } = getAuthState();
    if (!isStudentLoggedIn || !token) {
      window.location.href = "./index.html?auth=login";
      return;
    }
    const referralCode = String(options.referralCode || "").trim();
    const includeDefaultOffer = options.includeDefaultOffer !== false;

    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/buy-with-wallet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer,
        referralCode: referralCode || undefined,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to complete wallet purchase.");
    }

    return payload;
  };

  const buyDirect = async (productId, options = {}) => {
    const { token, isStudentLoggedIn } = getAuthState();
    if (!isStudentLoggedIn || !token) {
      window.location.href = "./index.html?auth=login";
      return;
    }
    const referralCode = String(options.referralCode || "").trim();
    const includeDefaultOffer = options.includeDefaultOffer !== false;

    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/buy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer,
        referralCode: referralCode || undefined,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to complete purchase.");
    }

    return payload;
  };

  const buyProduct = async (productId, options = {}) => {
    return buyDirect(productId, options);
  };

  const createCheckoutModal = () => {
    if (checkoutModal) return checkoutModal;
    const root = document.createElement("div");
    root.className = "product-checkout-modal";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="product-checkout-dialog" role="dialog" aria-modal="true" aria-label="Available offers">
        <button type="button" class="product-checkout-close" aria-label="Close checkout">&times;</button>
        <h3>Available Offers</h3>
        <div class="product-checkout-layout">
          <section class="product-checkout-left">
            <article class="product-checkout-offer-card">
              <div class="product-checkout-offer-top">
                <strong>Available Offers</strong>
                <span class="product-checkout-chip" data-checkout-chip></span>
              </div>
              <div class="product-checkout-token-row">
                <span class="product-checkout-token" data-checkout-token-percent></span>
                <span class="product-checkout-token-code" data-checkout-token-code></span>
                <button type="button" data-checkout-token-toggle>REMOVE</button>
              </div>
              <p class="product-checkout-offer-help" data-checkout-offer-help></p>
            </article>
            <article class="product-checkout-friend-card">
              <label for="checkoutSponsorInput">Your friends gift you discount</label>
              <div class="product-checkout-friend-row">
                <input
                  id="checkoutSponsorInput"
                  type="text"
                  maxlength="40"
                  autocomplete="off"
                  placeholder="Student Id of your friend"
                  data-checkout-sponsor-input
                />
                <button type="button" data-checkout-sponsor-apply>Apply</button>
              </div>
              <p class="product-checkout-friend-message" data-checkout-sponsor-message></p>
            </article>
          </section>
          <section class="product-checkout-right">
            <h4>Your Order</h4>
            <div class="product-checkout-order-row">
              <img src="${FALLBACK_THUMB}" alt="Product thumbnail" data-checkout-order-image />
              <div>
                <p data-checkout-order-title></p>
                <small data-checkout-order-meta></small>
                <p data-checkout-order-price></p>
              </div>
            </div>
            <h4>Price Details</h4>
            <div class="product-checkout-detail-row">
              <span>Subtotal</span>
              <strong data-checkout-subtotal></strong>
            </div>
            <div class="product-checkout-detail-row">
              <span>Discount (Coupon)</span>
              <strong data-checkout-token-discount></strong>
            </div>
            <div class="product-checkout-detail-row">
              <span>Discount (Friend)</span>
              <strong data-checkout-friend-discount></strong>
            </div>
            <div class="product-checkout-detail-row total">
              <span>To Pay</span>
              <strong data-checkout-payable></strong>
            </div>
            <button type="button" class="btn-primary product-checkout-continue" data-checkout-continue>
              Continue
            </button>
          </section>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const dialog = root.querySelector(".product-checkout-dialog");
    const closeBtn = root.querySelector(".product-checkout-close");
    const chip = root.querySelector("[data-checkout-chip]");
    const tokenValue = root.querySelector("[data-checkout-token-percent]");
    const tokenCode = root.querySelector("[data-checkout-token-code]");
    const tokenToggleBtn = root.querySelector("[data-checkout-token-toggle]");
    const offerHelp = root.querySelector("[data-checkout-offer-help]");
    const sponsorInput = root.querySelector("[data-checkout-sponsor-input]");
    const sponsorApplyBtn = root.querySelector("[data-checkout-sponsor-apply]");
    const sponsorMessage = root.querySelector("[data-checkout-sponsor-message]");
    const orderImage = root.querySelector("[data-checkout-order-image]");
    const orderTitle = root.querySelector("[data-checkout-order-title]");
    const orderMeta = root.querySelector("[data-checkout-order-meta]");
    const orderCurrentPrice = root.querySelector("[data-checkout-order-price]");
    const subtotalValue = root.querySelector("[data-checkout-subtotal]");
    const tokenDiscountValue = root.querySelector("[data-checkout-token-discount]");
    const friendDiscountValue = root.querySelector("[data-checkout-friend-discount]");
    const payableValue = root.querySelector("[data-checkout-payable]");
    const continueBtn = root.querySelector("[data-checkout-continue]");

    if (
      !(dialog instanceof HTMLElement) ||
      !(closeBtn instanceof HTMLButtonElement) ||
      !(chip instanceof HTMLElement) ||
      !(tokenValue instanceof HTMLElement) ||
      !(tokenCode instanceof HTMLElement) ||
      !(tokenToggleBtn instanceof HTMLButtonElement) ||
      !(offerHelp instanceof HTMLElement) ||
      !(sponsorInput instanceof HTMLInputElement) ||
      !(sponsorApplyBtn instanceof HTMLButtonElement) ||
      !(sponsorMessage instanceof HTMLElement) ||
      !(orderImage instanceof HTMLImageElement) ||
      !(orderTitle instanceof HTMLElement) ||
      !(orderMeta instanceof HTMLElement) ||
      !(orderCurrentPrice instanceof HTMLElement) ||
      !(subtotalValue instanceof HTMLElement) ||
      !(tokenDiscountValue instanceof HTMLElement) ||
      !(friendDiscountValue instanceof HTMLElement) ||
      !(payableValue instanceof HTMLElement) ||
      !(continueBtn instanceof HTMLButtonElement)
    ) {
      root.remove();
      throw new Error("Unable to initialize checkout popup.");
    }

    closeBtn.addEventListener("click", () => closeCheckoutModal());
    root.addEventListener("click", (event) => {
      if (event.target === root) closeCheckoutModal();
    });

    tokenToggleBtn.addEventListener("click", async () => {
      if (checkoutState.busy || !checkoutState.product) return;
      const nextValue = !checkoutState.includeDefaultOffer;
      checkoutState.includeDefaultOffer = nextValue;
      try {
        await refreshCheckoutPreview();
        const tokenText = nextValue ? "Discount token applied." : "Discount token removed. MRP applied.";
        setCheckoutFriendMessage(tokenText, "success");
      } catch (error) {
        checkoutState.includeDefaultOffer = !nextValue;
        renderCheckoutModal();
        const message = error instanceof Error ? error.message : "Unable to update token.";
        setCheckoutFriendMessage(message, "error");
      }
    });

    sponsorInput.addEventListener("input", () => {
      checkoutState.referralInput = String(sponsorInput.value || "").trim().toUpperCase();
      setCheckoutFriendMessage("");
    });

    const applyFriendDiscount = async () => {
      if (checkoutState.busy || !checkoutState.product) return;
      const referralCode = String(checkoutState.referralInput || "").trim().toUpperCase();
      checkoutState.appliedReferralCode = referralCode;
      try {
        await refreshCheckoutPreview();
        if (referralCode) {
          setCheckoutFriendMessage("Friend discount applied successfully.", "success");
        } else {
          setCheckoutFriendMessage("Friend discount removed.");
        }
      } catch (error) {
        checkoutState.appliedReferralCode = "";
        try {
          await refreshCheckoutPreview();
        } catch {
          // Ignore fallback preview failures here.
        }
        const message = error instanceof Error ? error.message : "Unable to apply friend discount.";
        setCheckoutFriendMessage(message, "error");
      }
    };

    sponsorApplyBtn.addEventListener("click", async () => {
      await applyFriendDiscount();
    });

    sponsorInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await applyFriendDiscount();
    });

    continueBtn.addEventListener("click", async () => {
      if (checkoutState.busy || !checkoutState.product) return;
      setCheckoutBusy(true);
      try {
        const checkoutPagePath = await resolveCheckoutPagePath();
        const nextUrl = new URL(checkoutPagePath, window.location.href);
        nextUrl.searchParams.set("productId", String(checkoutState.product.id || ""));
        nextUrl.searchParams.set("includeDefaultOffer", checkoutState.includeDefaultOffer ? "1" : "0");
        if (checkoutState.appliedReferralCode) {
          nextUrl.searchParams.set("referralCode", checkoutState.appliedReferralCode);
        } else {
          nextUrl.searchParams.delete("referralCode");
        }
        closeCheckoutModal();
        window.location.href = nextUrl.toString();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to complete purchase.";
        setCheckoutFriendMessage(message, "error");
      } finally {
        setCheckoutBusy(false);
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("open")) {
        closeCheckoutModal();
      }
    });

    checkoutModal = {
      root,
      dialog,
      closeBtn,
      chip,
      tokenValue,
      tokenCode,
      tokenToggleBtn,
      offerHelp,
      sponsorInput,
      sponsorApplyBtn,
      sponsorMessage,
      orderImage,
      orderTitle,
      orderMeta,
      orderCurrentPrice,
      subtotalValue,
      tokenDiscountValue,
      friendDiscountValue,
      payableValue,
      continueBtn,
    };

    return checkoutModal;
  };

  const openCheckoutModal = async (productId, seededReferralCode = "") => {
    const { token, isStudentLoggedIn } = getAuthState();
    if (!isStudentLoggedIn || !token) {
      window.location.href = "./index.html?auth=login";
      return;
    }
    const product = state.products.find((item) => String(item?.id || "").trim() === String(productId || "").trim());
    if (!product) {
      throw new Error("Selected product is unavailable.");
    }

    createCheckoutModal();
    checkoutState.product = product;
    checkoutState.includeDefaultOffer = getDiscountPercentForProduct(product) > 0;
    checkoutState.referralInput = String(seededReferralCode || "").trim().toUpperCase();
    checkoutState.appliedReferralCode = checkoutState.referralInput;
    checkoutState.preview = null;
    checkoutState.friendMessage = "";
    checkoutState.friendMessageType = "";
    checkoutModal.root.classList.add("open");
    checkoutModal.root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderCheckoutModal();
    await refreshCheckoutPreview();
  };

  const startLearningAttempt = async (mockTestId) => {
    const { token } = getAuthState();
    if (!token) {
      window.location.href = "./index.html#home";
      return;
    }

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
      throw new Error(payload?.message || "Unable to start learning.");
    }

    const attemptId = String(payload?.attempt?.id || "").trim();
    if (!attemptId) {
      throw new Error("Unable to start learning.");
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

  const openLessonByMockTestContext = async (mockTestId) => {
    const { token } = getAuthState();
    if (!token) {
      window.location.href = "./index.html#home";
      return false;
    }

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
    const lessonPagePath = await resolveLessonPlayerPagePath();
    const params = new URLSearchParams();
    params.set("lessonId", lessonId);
    if (chapterId) params.set("chapterId", chapterId);
    window.location.href = `${lessonPagePath}?${params.toString()}`;
    return true;
  };
  const toCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

  const applyFilters = () => {
    const searchTerm = state.search.toLowerCase();
    state.filtered = state.products.filter((product) => {
      if (state.quickType && product.courseType !== state.quickType) return false;
      if (state.category && product.examCategory !== state.category) return false;
      if (state.exams.size && !state.exams.has(product.examName)) return false;
      if (state.languages.size && !state.languages.has(product.languageMode || "")) return false;
      if (state.minPrice !== null && Number(product.salePrice) < state.minPrice) return false;
      if (state.maxPrice !== null && Number(product.salePrice) > state.maxPrice) return false;
      if (!searchTerm) return true;

      const searchable = [
        product.title,
        product.description,
        product.examCategory,
        product.examName,
        product.courseType,
        product.languageMode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(searchTerm);
    });
  };

  const buildLearningItems = (product) => {
    const demoTests = Array.isArray(product?.demoMockTests) ? product.demoMockTests : [];
    const linkedTests = Array.isArray(product?.linkedMockTests) ? product.linkedMockTests : [];
    const firstDemo = demoTests.find((item) => String(item?.id || "").trim()) || null;
    const demoId = String(firstDemo?.id || "").trim();
    const demoLessonTitle = String(product?.demoLessonTitle || "").trim();
    const demoLessonUrl = String(product?.demoLessonUrl || "").trim();
    const premiumUnlocked = Boolean(product?.isPremiumUnlocked);

    const premiumTests = linkedTests.filter((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return false;
      return id !== demoId;
    });

    const uniquePremium = [];
    const seenPremium = new Set();
    premiumTests.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id || seenPremium.has(id)) return;
      seenPremium.add(id);
      uniquePremium.push(item);
    });

    const items = [];

    if (firstDemo) {
      items.push({
        id: demoId,
        title: String(firstDemo.title || "Demo Lesson"),
        accessType: "DEMO",
        unlocked: true,
        action: "OPEN_LESSON_OR_ATTEMPT",
        ctaLabel: "Play Lesson",
      });
    } else if (demoLessonUrl) {
      items.push({
        id: demoLessonUrl,
        title: demoLessonTitle || "Demo Lesson",
        accessType: "DEMO",
        unlocked: true,
        action: "OPEN_DEMO_URL",
        ctaLabel: "Play Lesson",
      });
    }

    uniquePremium.forEach((item) => {
      const accessCode = String(item?.accessCode || "MOCK")
        .trim()
        .toUpperCase();
      const isLessonLinked = accessCode === "LESSON";
      items.push({
        id: String(item?.id || "").trim(),
        title: String(item?.title || "Premium Lesson"),
        accessType: "PREMIUM",
        unlocked: premiumUnlocked,
        action: isLessonLinked ? "OPEN_LESSON_OR_ATTEMPT" : "ATTEMPT_TEST",
        ctaLabel: isLessonLinked ? "Play Lesson" : "Attempt Test",
      });
    });

    return items;
  };
  const renderLearningTable = (product) => {
    const items = buildLearningItems(product);
    if (!items.length) {
      return `<p class="product-learn-empty">Demo lesson is not configured for this product yet.</p>`;
    }

    return `
      <div class="product-learn-table-wrap">
        <table class="product-learn-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Name Of Product</th>
              <th>Start Learning</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>
                      <span class="product-learn-name">${escapeHtml(item.title)}</span>
                      <small class="product-learn-type">${escapeHtml(item.accessType)}</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="${item.unlocked ? "btn-secondary" : "btn-ghost"}"
                        data-start-learning-id="${escapeHtml(item.id)}"
                        data-start-learning-action="${escapeHtml(item.action || "ATTEMPT_TEST")}"
                        data-learning-locked="${item.unlocked ? "false" : "true"}"
                        ${item.unlocked ? "" : 'disabled title="Buy premium product to unlock."'}
                      >
                        ${item.unlocked ? escapeHtml(item.ctaLabel || "Start") : "Premium Required"}
                      </button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderSalientFeatures = () => `
    <section class="product-salient-features">
      <h4>Salient <span>Features</span></h4>
      <div class="product-salient-grid">
        ${SALIENT_FEATURES.map(
          (feature) => `
            <article class="product-salient-item">
              <span class="product-salient-icon">
                ${feature.icon}
              </span>
              <span>${escapeHtml(feature.label)}</span>
            </article>
          `
        ).join("")}
      </div>
      <div class="product-contact-card">
        <span class="product-contact-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6.5 3.5h3l1.4 4.3-1.9 1.9a16 16 0 0 0 5.2 5.2l1.9-1.9 4.3 1.4v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
          </svg>
        </span>
        <p>
          For Admission Enquiry Call at
          <a href="tel:${ADMISSION_CONTACT_TEL}">${ADMISSION_CONTACT_NUMBER}</a>
        </p>
      </div>
    </section>
  `;

  const toProductHighlights = (rawValue) => {
    const source = Array.isArray(rawValue) ? rawValue : [];
    const cleaned = source
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_HIGHLIGHTS];
  };

  const renderProductHighlights = (highlights) => `
    <section class="product-highlights">
      <h4>Product <span>Highlights</span></h4>
      <ul class="product-highlights-list">
        ${highlights
          .map(
            (item) => `
              <li>
                <span class="product-highlight-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m5 12 4 4 10-10" />
                  </svg>
                </span>
                <span>${escapeHtml(item)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;

  const renderExamsCovered = () => `
    <section class="product-exams-covered">
      <h4>Exams <span>Covered</span></h4>
      <div class="product-exams-grid">
        ${PRODUCT_EXAMS_COVERED.map(
          (item) => `
            <article class="product-exam-item">
              <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" />
              <p>${escapeHtml(item.title)}</p>
            </article>
          `
        ).join("")}
      </div>
    </section>
  `;

  const isPstetProduct = (product) => {
    const haystack = [product?.title, product?.examCategory, product?.examName]
      .map((item) => String(item || "").toLowerCase())
      .join(" ");
    return haystack.includes("pstet");
  };

  const renderPstetBulletList = (items) => `
    <ul class="product-pstet-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;

  const renderPstetFaqList = (items) => `
    <div class="product-pstet-faqs">
      ${items
        .map(
          (item) => `
            <article class="product-pstet-faq-item">
              <h5>${escapeHtml(item.q)}</h5>
              <p>${escapeHtml(item.a)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  const renderPstetTabs = (product) => {
    if (!isPstetProduct(product)) return "";
    return `
      <section class="product-pstet-tabs" data-pstet-tabs>
        <div class="product-pstet-tab-nav" role="tablist" aria-label="Course details tabs">
          <button type="button" class="is-active" data-pstet-tab-btn="overview" aria-selected="true">Overview</button>
          <button type="button" data-pstet-tab-btn="includes" aria-selected="false">This Package Includes</button>
          <button type="button" data-pstet-tab-btn="plan" aria-selected="false">Study Plan</button>
          <button type="button" data-pstet-tab-btn="subjects" aria-selected="false">Subjects Covered</button>
          <button type="button" data-pstet-tab-btn="pattern" aria-selected="false">Exam Pattern</button>
          <button type="button" data-pstet-tab-btn="faqs" aria-selected="false">FAQs</button>
        </div>
        <div class="product-pstet-tab-panels">
          <section class="product-pstet-tab-panel is-active" data-pstet-tab-panel="overview">
            ${PSTET_OVERVIEW_PARAGRAPHS.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="includes">
            ${renderPstetBulletList(PSTET_PACKAGE_INCLUDES)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="plan">
            ${renderPstetBulletList(PSTET_STUDY_PLAN)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="subjects">
            ${renderPstetBulletList(PSTET_SUBJECTS_COVERED)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="pattern">
            ${renderPstetBulletList(PSTET_EXAM_PATTERN)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="faqs">
            ${renderPstetFaqList(PSTET_FAQS)}
          </section>
        </div>
      </section>
    `;
  };

  const renderProductCards = () => {
    if (!productsGrid) return;
    if (!state.filtered.length) {
      productsGrid.innerHTML =
        '<div class="empty-products">No products match your filters. Try clearing a few filters.</div>';
      if (productsCountText) productsCountText.textContent = "0 products";
      return;
    }

    productsGrid.innerHTML = state.filtered
      .map((product) => {
        const thumb = normalizeAssetUrl(product.thumbnailUrl);
        const highlights = toProductHighlights(product.addons);
        const productId = String(product.id || "").trim();
        const referralFriendDiscount = Number(product.referralDiscountAmount || 0);
        return `
          <div class="product-card-stack">
            <article class="product-card product-card-wide">
            ${product.validityLabel ? `<span class="product-badge">${escapeHtml(product.validityLabel)}</span>` : ""}
            <div class="product-main">
              <img
                class="product-thumb"
                src="${escapeHtml(thumb)}"
                alt="${escapeHtml(product.title)}"
                onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
              />
              <div class="product-body">
                <p class="product-tags">
                  <span>${escapeHtml(product.languageMode || "Multi")}</span>
                  <span>${escapeHtml(String(product.courseType).replaceAll("_", " "))}</span>
                </p>
                <h3>${escapeHtml(product.title)}</h3>
                <p class="product-meta">${escapeHtml(product.examCategory)} | ${escapeHtml(product.examName)}</p>
                <p class="product-description">${escapeHtml(product.description || "Comprehensive learning package.")}</p>
                <div class="product-pricing">
                  <strong>${toCurrency(product.salePrice)}</strong>
                  <span class="product-mrp">${toCurrency(product.listPrice)}</span>
                  <span class="product-off">${product.discountPercent || 0}% off</span>
                </div>
                <p class="product-access">Referral Bonus: ${toCurrency(product.referralBonusAmount || 0)}</p>
                <p class="product-access">
                  Friend Code Discount: ${toCurrency(referralFriendDiscount)}
                </p>
                <p class="product-access">${product.accessDays} days access</p>
                <div class="product-referral-code-wrap">
                  <input
                    type="text"
                    class="product-referral-code-input"
                    data-product-referral-code
                    maxlength="40"
                    placeholder="Use friend Student ID / referral code (optional)"
                  />
                </div>
                <div class="product-actions">
                  <button
                    type="button"
                    class="btn-primary"
                    data-buy-product="${escapeHtml(productId)}"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    class="btn-sky"
                    data-buy-wallet-product="${escapeHtml(productId)}"
                  >
                    Buy with Wallet
                  </button>
                </div>
              </div>
            </div>
            <aside class="product-open-wrap product-side">
              <h4>Table Of Content</h4>
              ${renderLearningTable(product)}
            </aside>
            </article>
            ${renderSalientFeatures()}
            ${renderProductHighlights(highlights)}
            ${renderExamsCovered()}
            ${renderPstetTabs(product)}
          </div>
        `;
      })
      .join("");

    if (productsCountText) productsCountText.textContent = `${state.filtered.length} products`;
  };

  const getReferralCodeFromActionTarget = (targetElement) => {
    if (!(targetElement instanceof HTMLElement)) return "";
    const card = targetElement.closest(".product-card");
    if (!(card instanceof HTMLElement)) return "";
    const referralInput = card.querySelector("[data-product-referral-code]");
    if (!(referralInput instanceof HTMLInputElement)) return "";
    return String(referralInput.value || "").trim();
  };

  const activatePstetTab = (tabsContainer, tabId) => {
    if (!(tabsContainer instanceof HTMLElement)) return;
    const buttons = Array.from(tabsContainer.querySelectorAll("[data-pstet-tab-btn]"));
    const panels = Array.from(tabsContainer.querySelectorAll("[data-pstet-tab-panel]"));
    if (!buttons.length || !panels.length) return;

    buttons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const active = btn.getAttribute("data-pstet-tab-btn") === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const active = panel.getAttribute("data-pstet-tab-panel") === tabId;
      panel.classList.toggle("is-active", active);
    });
  };

  const renderCategoryFilters = () => {
    if (!filterCategoriesWrap) return;
    const categories = Array.from(new Set(state.products.map((item) => item.examCategory))).sort();
    filterCategoriesWrap.innerHTML = [
      `<label class="filter-option"><input type="radio" name="category" value="" ${
        state.category === "" ? "checked" : ""
      } /> <span>All</span></label>`,
      ...categories.map(
        (category) =>
          `<label class="filter-option"><input type="radio" name="category" value="${escapeHtml(category)}" ${
            state.category === category ? "checked" : ""
          } /> <span>${escapeHtml(category)}</span></label>`
      ),
    ].join("");
  };

  const renderExamFilters = () => {
    if (!filterExamsWrap) return;
    const exams = Array.from(new Set(state.products.map((item) => item.examName))).sort();
    const visibleExams = exams.filter((exam) =>
      exam.toLowerCase().includes((state.examSearch || "").toLowerCase())
    );
    filterExamsWrap.innerHTML = visibleExams
      .map(
        (exam) =>
          `<label class="filter-option"><input type="checkbox" value="${escapeHtml(exam)}" ${
            state.exams.has(exam) ? "checked" : ""
          } /> <span>${escapeHtml(exam)}</span></label>`
      )
      .join("");
  };

  const renderLanguageFilters = () => {
    if (!filterLanguagesWrap) return;
    const languages = Array.from(
      new Set(state.products.map((item) => item.languageMode).filter((value) => Boolean(value)))
    ).sort();

    filterLanguagesWrap.innerHTML = languages
      .map(
        (language) =>
          `<label class="filter-option"><input type="checkbox" value="${escapeHtml(language)}" ${
            state.languages.has(language) ? "checked" : ""
          } /> <span>${escapeHtml(language)}</span></label>`
      )
      .join("");
  };

  const renderAll = () => {
    applyFilters();
    renderProductCards();
    renderCategoryFilters();
    renderExamFilters();
    renderLanguageFilters();
  };

  const navigateByCourse = (value) => {
    if (!value) return;
    if (value === "products") return;
    if (value === "mock-tests") {
      window.location.href = "./mock-tests.html";
      return;
    }
    window.location.href = "./index.html#home";
  };

  const initHeader = () => {
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
        header.classList.remove("mobile-search-open");
        const isOpen = header.classList.toggle("menu-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    if (mobileSearchToggle) {
      mobileSearchToggle.addEventListener("click", () => {
        header.classList.remove("menu-open");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
        const isOpen = header.classList.toggle("mobile-search-open");
        mobileSearchToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("menu-open");
        header.classList.remove("mobile-search-open");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    openLoginButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = "./index.html#home";
      });
    });

    referButtons.forEach((button) => {
      if (!button) return;
      button.addEventListener("click", () => {
        if (getAuthState().isStudentLoggedIn) {
          window.location.href = "./refer-earn.html";
          return;
        }
        window.location.href = "./index.html#home";
      });
    });

    [headerCourseSelect, headerCourseSelectMobile].forEach((selectEl) => {
      if (!(selectEl instanceof HTMLSelectElement)) return;
      selectEl.addEventListener("change", () => navigateByCourse(selectEl.value));
    });
  };

  const bindFilters = () => {
    if (filterCategoriesWrap) {
      filterCategoriesWrap.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        state.category = target.value;
        renderAll();
      });
    }

    if (filterExamsWrap) {
      filterExamsWrap.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.checked) state.exams.add(target.value);
        else state.exams.delete(target.value);
        renderAll();
      });
    }

    if (filterLanguagesWrap) {
      filterLanguagesWrap.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.checked) state.languages.add(target.value);
        else state.languages.delete(target.value);
        renderAll();
      });
    }

    if (examFilterSearch) {
      examFilterSearch.addEventListener("input", () => {
        state.examSearch = examFilterSearch.value.trim();
        renderExamFilters();
      });
    }

    if (applyPriceFilterBtn) {
      applyPriceFilterBtn.addEventListener("click", () => {
        state.minPrice = minPriceInput?.value ? Number(minPriceInput.value) : null;
        state.maxPrice = maxPriceInput?.value ? Number(maxPriceInput.value) : null;
        renderAll();
      });
    }

    quickLinkButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-type") || "";
        state.quickType = type;
        quickLinkButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderAll();
      });
    });

    const onSearchInput = () => {
      const desktopValue = headerSearchDesktop instanceof HTMLInputElement ? headerSearchDesktop.value : "";
      const mobileValue = headerSearchMobile instanceof HTMLInputElement ? headerSearchMobile.value : "";
      state.search = (desktopValue || mobileValue || "").trim();
      renderAll();
    };

    if (headerSearchDesktop instanceof HTMLInputElement) {
      headerSearchDesktop.addEventListener("input", onSearchInput);
    }
    if (headerSearchMobile instanceof HTMLInputElement) {
      headerSearchMobile.addEventListener("input", onSearchInput);
    }

    if (productsGrid) {
      productsGrid.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const tabButton = target.closest("[data-pstet-tab-btn]");
        if (tabButton instanceof HTMLButtonElement) {
          const tabId = String(tabButton.getAttribute("data-pstet-tab-btn") || "").trim();
          if (!tabId) return;
          const tabsContainer = tabButton.closest("[data-pstet-tabs]");
          if (tabsContainer instanceof HTMLElement) {
            activatePstetTab(tabsContainer, tabId);
          }
          return;
        }

        const learningButton = target.closest("[data-start-learning-id]");
        if (learningButton instanceof HTMLElement) {
          const learningId = String(learningButton.getAttribute("data-start-learning-id") || "").trim();
          const learningAction = String(
            learningButton.getAttribute("data-start-learning-action") || "ATTEMPT_TEST"
          ).trim();
          const locked = learningButton.getAttribute("data-learning-locked") === "true";
          if (!learningId || locked) return;

          try {
            if (learningAction === "OPEN_DEMO_URL") {
              const resolved = normalizeDemoLessonUrl(learningId);
              if (!resolved) throw new Error("Demo lesson URL is not configured.");
              setMessage("Opening demo lesson...");
              window.location.href = resolved;
              return;
            }

            if (learningAction === "OPEN_LESSON_OR_ATTEMPT") {
              setMessage("Opening lesson...");
              const opened = await openLessonByMockTestContext(learningId);
              if (opened) return;
            }

            setMessage("Starting learning attempt...");
            await startLearningAttempt(learningId);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to start learning.";
            setMessage(message, "error");
          }
          return;
        }

        const buyButton = target.closest("[data-buy-product]");
        if (buyButton instanceof HTMLElement) {
          const productId = buyButton.getAttribute("data-buy-product");
          if (!productId) return;
          const referralCode = getReferralCodeFromActionTarget(buyButton);

          try {
            setMessage("");
            await openCheckoutModal(productId, referralCode);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to purchase product.";
            setMessage(message, "error");
          }
          return;
        }

        const walletButton = target.closest("[data-buy-wallet-product]");
        if (!(walletButton instanceof HTMLElement)) return;

        const walletProductId = walletButton.getAttribute("data-buy-wallet-product");
        if (!walletProductId) return;
        const walletReferralCode = getReferralCodeFromActionTarget(walletButton);

        try {
          setMessage("Processing wallet purchase...");
          const payload = await buyWithWallet(walletProductId, { referralCode: walletReferralCode });
          await loadProducts();
          const savedAmount = Number(payload?.purchase?.referralDiscountApplied || 0);
          if (savedAmount > 0) {
            setMessage(
              `Purchase successful using referral wallet. You saved ${toCurrency(savedAmount)}.`,
              "success"
            );
          } else {
            setMessage("Purchase successful using referral wallet.", "success");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to purchase product.";
          setMessage(message, "error");
        }
      });
    }
  };

  const loadProducts = async () => {
    const { token } = getAuthState();
    const response = await fetch(`${API_BASE}/products`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to fetch products");
    }
    state.products = Array.isArray(payload?.products) ? payload.products : [];
    renderAll();
  };

  try {
    initHeader();
    bindFilters();
    setMessage("Loading products...");
    await loadProducts();
    if (checkoutProductIdFromLink) {
      try {
        await openCheckoutModal(checkoutProductIdFromLink);
      } finally {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("checkoutProductId");
        const nextSearch = nextUrl.searchParams.toString();
        window.history.replaceState(
          {},
          "",
          `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextUrl.hash || ""}`
        );
      }
    }
    setMessage("");
  } catch (error) {
    setMessage(error.message || "Unable to load products.", "error");
    if (productsGrid) {
      productsGrid.innerHTML = '<div class="empty-products">Products are temporarily unavailable.</div>';
    }
  }
});

