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
const DEFAULT_SALIENT_FEATURES = ["Audio Lesson", "Scroll with Audio", "Digital Test", "Timer Enable"];
const DEFAULT_PRODUCT_EXAMS_COVERED = [
  { title: "PSTET", imageUrl: "./public/PSTET_7.png" },
  { title: "Punjab Teaching Exams", imageUrl: "./public/PSTET_8.png" },
  { title: "CTET", imageUrl: "./public/PSTET_10.png" },
];
const DEFAULT_PRODUCT_DETAILS_TABS = {
  overview: [
    "This program is designed for structured, exam-focused preparation with lesson-first learning flow.",
    "Students can start with guided audio-scroll lessons and move to test attempts with full flexibility.",
  ],
  packageIncludes: [
    "Audio-supported lessons with scroll content",
    "Structured chapter-wise learning flow",
    "Timed digital practice tests",
    "Progress tracking and performance support",
    "Quick revision support content",
  ],
  studyPlan: [
    "Concept learning with guided lessons",
    "Daily topic-wise practice",
    "Mock-based revision cycle",
    "Final strategy and exam readiness sessions",
  ],
  subjectsCovered: [
    "Child Development & Pedagogy",
    "Punjabi Language",
    "English Language",
    "Mathematics",
    "Environmental Studies",
    "Social Studies / Science",
  ],
  examPattern: [
    "Objective MCQ-based practice",
    "Timed attempts to simulate real exam pressure",
    "Topic-level and full-length mixed tests",
    "Performance review for speed and accuracy",
  ],
  faqs: [
    {
      q: "Is this course suitable for beginners?",
      a: "Yes. It starts from core concepts and progressively moves toward test-level practice.",
    },
    {
      q: "Can I attempt tests while audio is running?",
      a: "Yes. The learning flow supports moving to attempts and returning to lesson playback when needed.",
    },
  ],
};
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

const getProductsPagePath = () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/products");
  return prefersExtensionless ? "./products" : "./products.html";
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
    const normalizedRole = String(
      user?.role || user?.userRole || user?.user_type || user?.accountType || ""
    )
      .trim()
      .toUpperCase();
    const effectiveRole = normalizedRole || "STUDENT";
    return {
      token,
      user,
      isStudentLoggedIn: Boolean(token && effectiveRole === "STUDENT"),
    };
  };

  /** @type {{products: any[], filtered: any[], quickType: string, category: string, exams: Set<string>, languages: Set<string>, search: string, examSearch: string, minPrice: number|null, maxPrice: number|null, selectedProductId: string}} */
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
    selectedProductId: "",
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
  const productIdFromLink = String(pageParams.get("productId") || "").trim();
  const checkoutProductIdFromLink = String(pageParams.get("checkoutProductId") || "").trim();
  state.selectedProductId = productIdFromLink || checkoutProductIdFromLink;

  const checkoutState = {
    product: null,
    includeDefaultOffer: true,
    referralInput: "",
    appliedReferralCode: "",
    useWalletBalance: false,
    walletUseInput: "",
    walletBalance: 0,
    walletEligible: false,
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
   *  walletToggle: HTMLInputElement,
   *  walletInput: HTMLInputElement,
   *  walletHelp: HTMLElement,
   *  orderImage: HTMLImageElement,
   *  orderTitle: HTMLElement,
   *  orderMeta: HTMLElement,
   *  orderCurrentPrice: HTMLElement,
   *  subtotalValue: HTMLElement,
   *  tokenDiscountValue: HTMLElement,
   *  friendDiscountValue: HTMLElement,
   *  walletUsedValue: HTMLElement,
   *  payableValue: HTMLElement,
   *  continueBtn: HTMLButtonElement,
   * }} */
  let checkoutModal = null;

  const toSafeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sanitizeWalletAmountInput = (value) => {
    const raw = String(value || "");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const firstDotIndex = cleaned.indexOf(".");
    const normalized =
      firstDotIndex === -1
        ? cleaned
        : `${cleaned.slice(0, firstDotIndex + 1)}${cleaned.slice(firstDotIndex + 1).replaceAll(".", "")}`;
    const [whole, fraction = ""] = normalized.split(".");
    const wholePart = whole.replace(/^0+(\d)/, "$1");
    const fractionPart = fraction.slice(0, 2);
    if (normalized.includes(".")) {
      return `${wholePart || "0"}.${fractionPart}`;
    }
    return wholePart || "";
  };

  const INELIGIBLE_WALLET_BALANCE_MESSAGE = "Attention: Refer your friends to earn wallet balance";

  const getRequestedWalletUseAmount = () => {
    if (!checkoutState.useWalletBalance) return 0;
    const numeric = Math.max(0, toSafeNumber(checkoutState.walletUseInput));
    return Number(numeric.toFixed(2));
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
    const walletAvailable = Math.max(0, toSafeNumber(pricing.walletAvailable));
    const walletUsed = Math.max(0, toSafeNumber(pricing.walletUsed));
    const payableBeforeWallet = Math.max(
      0,
      toSafeNumber(
        pricing.payableBeforeWallet !== undefined && pricing.payableBeforeWallet !== null
          ? pricing.payableBeforeWallet
          : pricing.payableAmount
      )
    );
    const walletEligible = walletAvailable > 0 && payableBeforeWallet > 0;
    const totalDiscount = defaultDiscount + friendDiscount + walletUsed;
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
    checkoutModal.walletUsedValue.textContent = `- ${toCurrency(walletUsed)}`;
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
    checkoutState.walletBalance = walletAvailable;
    checkoutState.walletEligible = walletEligible;
    if (!checkoutState.walletEligible && checkoutState.useWalletBalance) {
      checkoutState.useWalletBalance = false;
      checkoutState.walletUseInput = "";
    }
    checkoutModal.walletToggle.checked = checkoutState.useWalletBalance;
    checkoutModal.walletToggle.disabled = checkoutState.busy || !checkoutState.walletEligible;
    checkoutModal.walletInput.disabled =
      checkoutState.busy || !checkoutState.walletEligible || !checkoutState.useWalletBalance;
    checkoutModal.walletInput.value = checkoutState.useWalletBalance ? checkoutState.walletUseInput : "";
    checkoutModal.walletHelp.textContent = checkoutState.walletEligible
      ? `Available balance: ${toCurrency(walletAvailable)} | Max usable now: ${toCurrency(
          Math.min(payableBeforeWallet, walletAvailable)
        )}`
      : INELIGIBLE_WALLET_BALANCE_MESSAGE;
    setCheckoutFriendMessage(checkoutState.friendMessage, checkoutState.friendMessageType);
    checkoutModal.continueBtn.disabled = checkoutState.busy;
    checkoutModal.continueBtn.textContent = checkoutState.busy ? "Processing..." : "Continue";

    const hasDiscount = totalDiscount > 0;
    checkoutModal.tokenDiscountValue.parentElement.style.display = hasDiscount || defaultDiscount > 0 ? "flex" : "none";
    checkoutModal.friendDiscountValue.parentElement.style.display = hasDiscount || friendDiscount > 0 ? "flex" : "none";
    checkoutModal.walletUsedValue.parentElement.style.display =
      checkoutState.useWalletBalance || walletUsed > 0 ? "flex" : "none";
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
    const walletUseAmount = Math.max(0, toSafeNumber(options.walletUseAmount));

    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}/checkout-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer,
        referralCode: referralCode || undefined,
        walletUseAmount: walletUseAmount > 0 ? walletUseAmount : undefined,
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
      const requestedWalletUseAmount = getRequestedWalletUseAmount();
      const payload = await loadCheckoutPreview(productId, {
        includeDefaultOffer: checkoutState.includeDefaultOffer,
        referralCode: checkoutState.appliedReferralCode,
        walletUseAmount: requestedWalletUseAmount,
      });
      checkoutState.preview = payload || null;
      checkoutState.appliedReferralCode = String(payload?.offers?.appliedReferralCode || "").trim();
      checkoutState.walletBalance = Math.max(0, toSafeNumber(payload?.pricing?.walletAvailable));
      const resolvedWalletUsed = Math.max(0, toSafeNumber(payload?.pricing?.walletUsed));
      if (checkoutState.useWalletBalance) {
        checkoutState.walletUseInput = resolvedWalletUsed > 0 ? String(resolvedWalletUsed) : "";
      } else {
        checkoutState.walletUseInput = "";
      }
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
              <label for="checkoutSponsorInput">Your friend gift you discount</label>
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
            <article class="product-checkout-wallet-card">
              <label for="checkoutWalletAmount">Use Your Wallet Balance</label>
              <div class="product-checkout-wallet-row">
                <label class="product-checkout-wallet-check" for="checkoutWalletToggle">
                  <input id="checkoutWalletToggle" type="checkbox" data-checkout-wallet-toggle />
                  Auto
                </label>
                <input
                  id="checkoutWalletAmount"
                  class="product-checkout-wallet-input"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  placeholder="Fill Amount"
                  data-checkout-wallet-input
                />
              </div>
              <p class="product-checkout-friend-message" data-checkout-wallet-help></p>
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
            <div class="product-checkout-detail-row">
              <span>Wallet Balance Used</span>
              <strong data-checkout-wallet-used></strong>
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
    const walletToggle = root.querySelector("[data-checkout-wallet-toggle]");
    const walletInput = root.querySelector("[data-checkout-wallet-input]");
    const walletHelp = root.querySelector("[data-checkout-wallet-help]");
    const orderImage = root.querySelector("[data-checkout-order-image]");
    const orderTitle = root.querySelector("[data-checkout-order-title]");
    const orderMeta = root.querySelector("[data-checkout-order-meta]");
    const orderCurrentPrice = root.querySelector("[data-checkout-order-price]");
    const subtotalValue = root.querySelector("[data-checkout-subtotal]");
    const tokenDiscountValue = root.querySelector("[data-checkout-token-discount]");
    const friendDiscountValue = root.querySelector("[data-checkout-friend-discount]");
    const walletUsedValue = root.querySelector("[data-checkout-wallet-used]");
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
      !(walletToggle instanceof HTMLInputElement) ||
      !(walletInput instanceof HTMLInputElement) ||
      !(walletHelp instanceof HTMLElement) ||
      !(orderImage instanceof HTMLImageElement) ||
      !(orderTitle instanceof HTMLElement) ||
      !(orderMeta instanceof HTMLElement) ||
      !(orderCurrentPrice instanceof HTMLElement) ||
      !(subtotalValue instanceof HTMLElement) ||
      !(tokenDiscountValue instanceof HTMLElement) ||
      !(friendDiscountValue instanceof HTMLElement) ||
      !(walletUsedValue instanceof HTMLElement) ||
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

    const applyWalletUsage = async () => {
      if (checkoutState.busy || !checkoutState.product) return;
      if (!checkoutState.walletEligible) {
        checkoutState.useWalletBalance = false;
        checkoutState.walletUseInput = "";
        renderCheckoutModal();
        setCheckoutFriendMessage(INELIGIBLE_WALLET_BALANCE_MESSAGE, "error");
        return;
      }
      const requestedAmount = getRequestedWalletUseAmount();
      if (checkoutState.useWalletBalance && requestedAmount <= 0) {
        setCheckoutFriendMessage("Enter wallet amount or uncheck wallet usage.", "error");
        return;
      }
      try {
        await refreshCheckoutPreview();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to apply wallet balance.";
        setCheckoutFriendMessage(message, "error");
      }
    };

    walletToggle.addEventListener("change", async () => {
      if (walletToggle.checked && !checkoutState.walletEligible) {
        checkoutState.useWalletBalance = false;
        checkoutState.walletUseInput = "";
        walletToggle.checked = false;
        renderCheckoutModal();
        setCheckoutFriendMessage(INELIGIBLE_WALLET_BALANCE_MESSAGE, "error");
        return;
      }
      checkoutState.useWalletBalance = walletToggle.checked;
      if (checkoutState.useWalletBalance) {
        const pricing = checkoutState.preview?.pricing || resolveCheckoutFallbackPricing();
        const payableBeforeWallet = Math.max(
          0,
          toSafeNumber(
            pricing.payableBeforeWallet !== undefined && pricing.payableBeforeWallet !== null
              ? pricing.payableBeforeWallet
              : pricing.payableAmount
          )
        );
        const autoWalletUse = Math.min(payableBeforeWallet, checkoutState.walletBalance);
        checkoutState.walletUseInput = autoWalletUse > 0 ? String(Number(autoWalletUse.toFixed(2))) : "";
      } else {
        checkoutState.walletUseInput = "";
      }
      renderCheckoutModal();
      await applyWalletUsage();
    });

    walletInput.addEventListener("input", () => {
      if (!checkoutState.walletEligible) {
        checkoutState.useWalletBalance = false;
        checkoutState.walletUseInput = "";
        walletInput.value = "";
        renderCheckoutModal();
        setCheckoutFriendMessage(INELIGIBLE_WALLET_BALANCE_MESSAGE, "error");
        return;
      }
      const nextValue = sanitizeWalletAmountInput(walletInput.value);
      walletInput.value = nextValue;
      checkoutState.walletUseInput = nextValue;
      const numeric = Math.max(0, toSafeNumber(nextValue));
      checkoutState.useWalletBalance = numeric > 0 || walletToggle.checked;
      renderCheckoutModal();
    });

    walletInput.addEventListener("blur", async () => {
      if (!checkoutState.useWalletBalance) return;
      await applyWalletUsage();
    });

    walletInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await applyWalletUsage();
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
        const walletUseAmount = getRequestedWalletUseAmount();
        if (walletUseAmount > 0) {
          nextUrl.searchParams.set("walletUseAmount", String(Number(walletUseAmount.toFixed(2))));
        } else {
          nextUrl.searchParams.delete("walletUseAmount");
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
      walletToggle,
      walletInput,
      walletHelp,
      orderImage,
      orderTitle,
      orderMeta,
      orderCurrentPrice,
      subtotalValue,
      tokenDiscountValue,
      friendDiscountValue,
      walletUsedValue,
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
    checkoutState.useWalletBalance = false;
    checkoutState.walletUseInput = "";
    checkoutState.walletBalance = 0;
    checkoutState.preview = null;
    checkoutState.friendMessage = "";
    checkoutState.friendMessageType = "";
    checkoutModal.root.classList.add("open");
    checkoutModal.root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderCheckoutModal();
    await refreshCheckoutPreview();
  };

  const startLearningAttempt = async (mockTestId, { autoplay = false } = {}) => {
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
    const params = new URLSearchParams();
    params.set("attemptId", attemptId);
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

  const openLessonByMockTestContext = async (mockTestId, { autoplay = false } = {}) => {
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
    if (autoplay) params.set("autoplay", "1");
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

  const PSTET_1_TOC_TABS = ["CDP", "PBI", "ENG", "EVS", "MATHS"];
  const PSTET_2_NON_SCI_TOC_TABS = ["CDP", "PBI", "ENG", "SST"];
  const PSTET_2_SCI_TOC_TABS = ["CDP", "PBI", "ENG", "SCI", "MATHS"];

  const normalizeLearningLookup = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeLearningDisplayTitle = (value) =>
    String(value || "")
      .replace(/^\s*\d+\s*[\.\-\)]\s*/, "")
      .trim();

  const resolveSubjectTabKey = (subjectValue, titleValue) => {
    const subjectText = normalizeLearningLookup(subjectValue);
    const titleText = normalizeLearningLookup(titleValue);

    if (subjectText.includes("child pedagogy") || subjectText.includes("child development")) return "CDP";
    if (subjectText.includes("punjabi")) return "PBI";
    if (subjectText.includes("english")) return "ENG";
    if (subjectText.includes("social studies")) return "SST";
    if (subjectText.includes("science math")) {
      if (
        titleText.includes("mathematics") ||
        titleText.includes("maths") ||
        titleText.includes("math ")
      ) {
        return "MATHS";
      }
      if (titleText.includes("science") || titleText.includes("physics") || titleText.includes("chemistry")) {
        return "SCI";
      }
      return "SCI";
    }
    if (subjectText.includes("maths evs")) {
      if (titleText.includes("environment") || titleText.includes("evs")) return "EVS";
      if (
        titleText.includes("mathematics") ||
        titleText.includes("maths") ||
        titleText.includes("math ")
      ) {
        return "MATHS";
      }
      return "MATHS";
    }

    if (titleText.includes("child pedagogy") || titleText.includes("child development")) return "CDP";
    if (titleText.includes("punjabi")) return "PBI";
    if (titleText.includes("english")) return "ENG";
    if (titleText.includes("environment") || titleText.includes("evs")) return "EVS";
    if (titleText.includes("social studies") || /\bsst\b/.test(titleText)) return "SST";
    if (titleText.includes("science")) return "SCI";
    if (
      titleText.includes("mathematics") ||
      titleText.includes("maths") ||
      titleText.includes("math ")
    ) {
      return "MATHS";
    }
    return "";
  };

  const detectProductExamType = (product) => {
    const haystack = normalizeLearningLookup(
      `${product?.examName || ""} ${product?.examCategory || ""} ${product?.title || ""}`
    );
    if (haystack.includes("pstet 2") || haystack.includes("paper 2")) return "PSTET_2";
    if (haystack.includes("pstet 1") || haystack.includes("paper 1")) return "PSTET_1";
    return "";
  };

  const isPstet2ScienceTeacherProduct = (product, itemKeys) => {
    const haystack = normalizeLearningLookup(
      `${product?.title || ""} ${product?.examName || ""} ${product?.examCategory || ""} ${product?.description || ""}`
    );
    if (
      haystack.includes("non sci") ||
      haystack.includes("non science") ||
      haystack.includes("social studies")
    ) {
      return false;
    }
    if (
      haystack.includes("science teacher") ||
      haystack.includes("science stream") ||
      haystack.includes("science math") ||
      haystack.includes("sci math")
    ) {
      return true;
    }
    if (itemKeys.has("SCI")) return true;
    if (itemKeys.has("SST")) return false;
    if (itemKeys.has("MATHS") && !itemKeys.has("EVS")) return true;
    return false;
  };

  const resolveTocTabsForProduct = (product, items) => {
    const preset = String(product?.tocTabPreset || "")
      .trim()
      .toUpperCase();
    if (preset === "PSTET_1") return [...PSTET_1_TOC_TABS];
    if (preset === "PSTET_2_SST") return [...PSTET_2_NON_SCI_TOC_TABS];
    if (preset === "PSTET_2_SCI_MATH") return [...PSTET_2_SCI_TOC_TABS];

    const itemKeys = new Set(items.map((item) => item.subjectTabKey).filter(Boolean));
    const examType = detectProductExamType(product);
    if (examType === "PSTET_1") return [...PSTET_1_TOC_TABS];
    if (examType === "PSTET_2") {
      return isPstet2ScienceTeacherProduct(product, itemKeys)
        ? [...PSTET_2_SCI_TOC_TABS]
        : [...PSTET_2_NON_SCI_TOC_TABS];
    }
    const preferredOrder = ["CDP", "PBI", "ENG", "EVS", "MATHS", "SST", "SCI"];
    const dynamicTabs = preferredOrder.filter((code) => itemKeys.has(code));
    return dynamicTabs.length ? dynamicTabs : ["CDP"];
  };

  const renderLearningTableRows = (items, isPlayAction) =>
    items
      .map((item, index) => {
        const action = item.action || "ATTEMPT_TEST";
        const playAction = isPlayAction(action);
        const isLocked = !item.unlocked;
        const buttonClass = item.unlocked
          ? `btn-secondary${playAction ? " product-play-icon-btn" : ""}`
          : "btn-secondary product-play-icon-btn is-locked";
        const buttonLabel =
          playAction || isLocked
            ? '<span aria-hidden="true">&#9654;</span><span class="sr-only">Play lesson</span>'
            : escapeHtml(item.ctaLabel || "Start");

        return `
          <tr>
            <td>${index + 1}</td>
            <td>
              <span class="product-learn-name">${escapeHtml(item.title)}</span>
              <small class="product-learn-type">${escapeHtml(item.accessType)}</small>
            </td>
            <td>
              <button
                type="button"
                class="${buttonClass}"
                data-start-learning-id="${escapeHtml(item.id)}"
                data-learning-product-id="${escapeHtml(item.productId || "")}"
                data-start-learning-action="${escapeHtml(action)}"
                data-learning-locked="${isLocked ? "true" : "false"}"
                ${playAction || isLocked ? 'aria-label="Play lesson"' : ""}
                ${isLocked ? 'aria-disabled="true" title="Buy premium product to unlock."' : ""}
              >
                ${buttonLabel}
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  const buildLearningItems = (product) => {
    const productId = String(product?.id || "").trim();
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

    const normalizeLinkedAccessCode = (rawValue) =>
      String(rawValue || "")
        .trim()
        .toUpperCase();
    const resolveLinkedAccessPriority = (rawValue) => {
      const normalized = normalizeLinkedAccessCode(rawValue);
      if (
        normalized === "DEMO" ||
        normalized.startsWith("DEMO ") ||
        normalized.includes("FREE FOR ALL")
      ) {
        return 3;
      }
      if (normalized === "LESSON") return 2;
      return 1;
    };
    const premiumById = new Map();
    premiumTests.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      const current = premiumById.get(id);
      if (!current) {
        premiumById.set(id, item);
        return;
      }
      const currentScore = resolveLinkedAccessPriority(current?.accessCode);
      const nextScore = resolveLinkedAccessPriority(item?.accessCode);
      if (nextScore > currentScore) {
        premiumById.set(id, item);
      }
    });
    const uniquePremium = Array.from(premiumById.values());

    const items = [];

    if (firstDemo) {
      const demoTitle = String(firstDemo.title || "Demo Lesson");
      items.push({
        productId,
        id: demoId,
        title: normalizeLearningDisplayTitle(demoTitle),
        accessType: "DEMO",
        unlocked: true,
        action: "OPEN_LESSON_OR_ATTEMPT",
        ctaLabel: "Play",
        subjectTabKey: resolveSubjectTabKey(firstDemo.subject, demoTitle),
      });
    } else if (demoLessonUrl) {
      const demoTitle = demoLessonTitle || "Demo Lesson";
      items.push({
        productId,
        id: demoLessonUrl,
        title: normalizeLearningDisplayTitle(demoTitle),
        accessType: "DEMO",
        unlocked: true,
        action: "OPEN_DEMO_URL",
        ctaLabel: "Play",
        subjectTabKey: resolveSubjectTabKey("", demoTitle),
      });
    }

    uniquePremium.forEach((item) => {
      const accessCode = String(item?.accessCode || "MOCK")
        .trim()
        .toUpperCase();
      const isDemoAccess =
        accessCode === "DEMO" ||
        accessCode.startsWith("DEMO ") ||
        accessCode.includes("FREE FOR ALL");
      const isLessonLinked = accessCode === "LESSON";
      const itemTitle = String(item?.title || "Premium Lesson");
      items.push({
        productId,
        id: String(item?.id || "").trim(),
        title: normalizeLearningDisplayTitle(itemTitle),
        accessType: isDemoAccess ? "DEMO" : "PREMIUM",
        unlocked: isDemoAccess ? true : premiumUnlocked,
        action: isLessonLinked ? "OPEN_LESSON_OR_ATTEMPT" : "ATTEMPT_TEST",
        ctaLabel: isLessonLinked ? "Play" : "Attempt Test",
        subjectTabKey: resolveSubjectTabKey(item?.subject, itemTitle),
      });
    });

    return items;
  };
  const renderLearningTable = (product) => {
    const items = buildLearningItems(product);
    if (!items.length) {
      return `<p class="product-learn-empty">Demo lesson is not configured for this product yet.</p>`;
    }
    const isPlayAction = (action) =>
      action === "OPEN_DEMO_URL" || action === "OPEN_LESSON_OR_ATTEMPT";
    const tabs = resolveTocTabsForProduct(product, items);
    const grouped = new Map(tabs.map((tabCode) => [tabCode, []]));
    const fallbackTab = tabs[0];
    items.forEach((item) => {
      const tabCode = tabs.includes(item.subjectTabKey) ? item.subjectTabKey : fallbackTab;
      grouped.get(tabCode).push(item);
    });

    return `
      <div class="product-learn-subject-tabs" data-learning-tabs>
        ${tabs
          .map(
            (tabCode, index) => `
              <button
                type="button"
                data-learning-tab-btn="${tabCode}"
                class="${index === 0 ? "is-active" : ""}"
                aria-selected="${index === 0 ? "true" : "false"}"
              >
                ${tabCode}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="product-learn-subject-panels">
        ${tabs
          .map((tabCode, index) => {
            const tabItems = grouped.get(tabCode) || [];
            return `
              <section
                class="product-learn-subject-panel ${index === 0 ? "is-active" : ""}"
                data-learning-tab-panel="${tabCode}"
                ${index === 0 ? "" : "hidden"}
              >
                ${
                  tabItems.length
                    ? `
                      <div class="product-learn-table-wrap">
                        <table class="product-learn-table">
                          <thead>
                            <tr>
                              <th>Sr No</th>
                              <th>Name Of Product</th>
                              <th>Start Learning</th>
                            </tr>
                          </thead>
                          <tbody>${renderLearningTableRows(tabItems, isPlayAction)}</tbody>
                        </table>
                      </div>
                    `
                    : `<p class="product-learn-empty">No lessons added in ${tabCode} yet.</p>`
                }
              </section>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const normalizeTextList = (value, fallback) => {
    const source = Array.isArray(value) ? value : [];
    const cleaned = source
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [...fallback];
  };

  const normalizeFaqList = (value) => {
    const source = Array.isArray(value) ? value : [];
    const cleaned = source
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const q = String(item.q || "").trim();
        const a = String(item.a || "").trim();
        if (!q || !a) return null;
        return { q, a };
      })
      .filter(Boolean);
    return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_DETAILS_TABS.faqs];
  };

  const normalizeExamsCoveredList = (value) => {
    const source = Array.isArray(value) ? value : [];
    const cleaned = source
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const title = String(item.title || "").trim();
        const imageUrl = String(item.imageUrl || "").trim();
        if (!title) return null;
        return { title, imageUrl: imageUrl || "./public/PSTET_7.png" };
      })
      .filter(Boolean);
    return cleaned.length ? cleaned : [...DEFAULT_PRODUCT_EXAMS_COVERED];
  };

  const normalizeProductDetailsContent = (rawValue) => {
    const raw =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
    const detailsTabs =
      raw.detailsTabs && typeof raw.detailsTabs === "object" && !Array.isArray(raw.detailsTabs)
        ? raw.detailsTabs
        : {};
    const highlightsSource = Array.isArray(rawValue) ? rawValue : raw.highlights;
    return {
      highlights: normalizeTextList(highlightsSource, DEFAULT_PRODUCT_HIGHLIGHTS),
      salientFeatures: normalizeTextList(raw.salientFeatures, DEFAULT_SALIENT_FEATURES),
      examsCovered: normalizeExamsCoveredList(raw.examsCovered),
      detailsTabs: {
        overview: normalizeTextList(detailsTabs.overview, DEFAULT_PRODUCT_DETAILS_TABS.overview),
        packageIncludes: normalizeTextList(
          detailsTabs.packageIncludes,
          DEFAULT_PRODUCT_DETAILS_TABS.packageIncludes
        ),
        studyPlan: normalizeTextList(detailsTabs.studyPlan, DEFAULT_PRODUCT_DETAILS_TABS.studyPlan),
        subjectsCovered: normalizeTextList(
          detailsTabs.subjectsCovered,
          DEFAULT_PRODUCT_DETAILS_TABS.subjectsCovered
        ),
        examPattern: normalizeTextList(detailsTabs.examPattern, DEFAULT_PRODUCT_DETAILS_TABS.examPattern),
        faqs: normalizeFaqList(detailsTabs.faqs),
      },
    };
  };

  const renderSalientFeatures = (detailsContent) => `
    <section class="product-salient-features">
      <h4>Salient <span>Features</span></h4>
      <div class="product-salient-grid">
        ${detailsContent.salientFeatures
          .map((label, index) => {
            const fallbackIcon = SALIENT_FEATURES[index % SALIENT_FEATURES.length]?.icon || "";
            return `
            <article class="product-salient-item">
              <span class="product-salient-icon">
                ${fallbackIcon}
              </span>
              <span>${escapeHtml(label)}</span>
            </article>
          `;
          })
          .join("")}
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

  const renderProductDescription = (description) => `
    <section class="product-description-section">
      <h4>Descriptions of Product</h4>
      <p>${escapeHtml(description || "Comprehensive learning package.")}</p>
    </section>
  `;

  const renderExamsCovered = (detailsContent) => `
    <section class="product-exams-covered">
      <h4>Exams <span>Covered</span></h4>
      <div class="product-exams-grid">
        ${detailsContent.examsCovered.map(
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

  const renderProductDetailsTabs = (detailsContent) => {
    const tabs = detailsContent.detailsTabs;
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
            ${tabs.overview.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="includes" hidden>
            ${renderPstetBulletList(tabs.packageIncludes)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="plan" hidden>
            ${renderPstetBulletList(tabs.studyPlan)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="subjects" hidden>
            ${renderPstetBulletList(tabs.subjectsCovered)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="pattern" hidden>
            ${renderPstetBulletList(tabs.examPattern)}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="faqs" hidden>
            ${renderPstetFaqList(tabs.faqs)}
          </section>
        </div>
      </section>
    `;
  };

  const createProductPageHref = (productId = "", checkoutProductId = "") => {
    const params = new URLSearchParams();
    const safeProductId = String(productId || "").trim();
    const safeCheckoutId = String(checkoutProductId || "").trim();
    if (safeProductId) params.set("productId", safeProductId);
    if (safeCheckoutId) params.set("checkoutProductId", safeCheckoutId);
    const search = params.toString();
    return `${getProductsPagePath()}${search ? `?${search}` : ""}`;
  };

  const navigateToProductCheckout = (productId) => {
    const safeProductId = String(productId || "").trim();
    if (!safeProductId) return;
    window.location.href = createProductPageHref(safeProductId, safeProductId);
  };

  const renderProductCatalogCard = (product) => {
    const thumb = normalizeAssetUrl(product.thumbnailUrl);
    const productId = String(product.id || "").trim();
    const discount = Number(product.discountPercent || 0);
    const detailsHref = createProductPageHref(productId, "");
    const buyHref = createProductPageHref(productId, productId);
    return `
      <article class="home-latest-card product-catalog-card">
        <img
          class="home-latest-thumb"
          src="${escapeHtml(thumb)}"
          alt="${escapeHtml(product.title)}"
          onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
        />
        <div class="home-latest-body">
          <p class="home-latest-tags">
            <span>${escapeHtml(product.languageMode || "Multi")}</span>
            <span>${escapeHtml(String(product.courseType || "COURSE").replaceAll("_", " "))}</span>
          </p>
          <h3>${escapeHtml(product.title || "Product")}</h3>
          <p class="home-latest-meta">${escapeHtml(product.examCategory || "-")} | ${escapeHtml(product.examName || "-")}</p>
          <div class="home-latest-pricing">
            <strong>${toCurrency(product.salePrice)}</strong>
            <span class="home-latest-mrp">${toCurrency(product.listPrice)}</span>
            <span class="home-latest-off">(${discount}% off)</span>
          </div>
          <div class="home-latest-actions">
            <a class="btn-secondary" href="${detailsHref}">Details</a>
            <a class="btn-primary" href="${buyHref}">Buy</a>
          </div>
        </div>
      </article>
    `;
  };

  const renderProductDetailStack = (product) => {
    const thumb = normalizeAssetUrl(product.thumbnailUrl);
    const detailsContent = normalizeProductDetailsContent(product.addons);
    const highlights = detailsContent.highlights;
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
        ${renderProductDescription(product.description)}
        ${renderSalientFeatures(detailsContent)}
        ${renderProductHighlights(highlights)}
        ${renderExamsCovered(detailsContent)}
        ${renderProductDetailsTabs(detailsContent)}
      </div>
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

    const singleProductView = Boolean(state.selectedProductId);
    productsGrid.classList.toggle("products-grid-catalog", !singleProductView);
    productsGrid.classList.toggle("products-grid-details", singleProductView);
    productsGrid.innerHTML = singleProductView
      ? state.filtered.map((product) => renderProductDetailStack(product)).join("")
      : state.filtered.map((product) => renderProductCatalogCard(product)).join("");

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
      panel.hidden = !active;
    });
  };

  const activateLearningTab = (tabsContainer, tabId) => {
    if (!(tabsContainer instanceof HTMLElement)) return;
    const buttons = Array.from(tabsContainer.querySelectorAll("[data-learning-tab-btn]"));
    if (!buttons.length) return;
    const root = tabsContainer.parentElement;
    if (!(root instanceof HTMLElement)) return;
    const panels = Array.from(root.querySelectorAll("[data-learning-tab-panel]"));
    if (!panels.length) return;

    buttons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const active = btn.getAttribute("data-learning-tab-btn") === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const active = panel.getAttribute("data-learning-tab-panel") === tabId;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
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
    if (state.selectedProductId) {
      const selected = state.products.find(
        (item) => String(item?.id || "").trim() === state.selectedProductId
      );
      if (selected) {
        state.filtered = [selected];
      } else {
        state.selectedProductId = "";
        applyFilters();
      }
    } else {
      applyFilters();
    }
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

    const syncHeaderForViewport = () => {
      if (window.innerWidth <= 680) return;
      header.classList.remove("menu-open");
      header.classList.remove("mobile-search-open");
      if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
      if (mobileSearchToggle) mobileSearchToggle.setAttribute("aria-expanded", "false");
    };

    syncHeaderForViewport();
    window.addEventListener("resize", syncHeaderForViewport);
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

        const learningTabButton = target.closest("[data-learning-tab-btn]");
        if (learningTabButton instanceof HTMLButtonElement) {
          const tabId = String(learningTabButton.getAttribute("data-learning-tab-btn") || "").trim();
          if (!tabId) return;
          const tabsContainer = learningTabButton.closest("[data-learning-tabs]");
          if (tabsContainer instanceof HTMLElement) {
            activateLearningTab(tabsContainer, tabId);
          }
          return;
        }

        const learningButton = target.closest("[data-start-learning-id]");
        if (learningButton instanceof HTMLElement) {
          const learningId = String(learningButton.getAttribute("data-start-learning-id") || "").trim();
          const learningProductId = String(
            learningButton.getAttribute("data-learning-product-id") || ""
          ).trim();
          const learningAction = String(
            learningButton.getAttribute("data-start-learning-action") || "ATTEMPT_TEST"
          ).trim();
          const locked = learningButton.getAttribute("data-learning-locked") === "true";
          if (!learningId) return;
          if (locked) {
            navigateToProductCheckout(learningProductId);
            return;
          }

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
              const opened = await openLessonByMockTestContext(learningId, { autoplay: true });
              if (opened) return;
            }

            setMessage("Starting learning attempt...");
            await startLearningAttempt(learningId, {
              autoplay: learningAction === "OPEN_LESSON_OR_ATTEMPT",
            });
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
        if (!String(nextUrl.searchParams.get("productId") || "").trim()) {
          nextUrl.searchParams.set("productId", checkoutProductIdFromLink);
        }
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
