import { apiRequest, clearAuth, escapeHtml, requireRoleGuard, requireRoleGuardStrict } from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;

  const messageEl = document.querySelector("#adminProductsMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const form = document.querySelector("#productForm");
  const productIdInput = document.querySelector("#productId");
  const titleInput = document.querySelector("#productTitle");
  const categoryInput = document.querySelector("#productCategory");
  const examInput = document.querySelector("#productExamName");
  const courseTypeInput = document.querySelector("#productCourseType");
  const languageInput = document.querySelector("#productLanguageMode");
  const listPriceInput = document.querySelector("#productListPrice");
  const salePriceInput = document.querySelector("#productSalePrice");
  const referralBonusInput = document.querySelector("#productReferralBonus");
  const referralDiscountInput = document.querySelector("#productReferralDiscount");
  const accessDaysInput = document.querySelector("#productAccessDays");
  const isComboInput = document.querySelector("#productIsCombo");
  const comboPanel = document.querySelector("#productComboPanel");
  const comboSearchInput = document.querySelector("#productComboSearch");
  const comboSummary = document.querySelector("#productComboSummary");
  const comboListWrap = document.querySelector("#productComboListWrap");
  const validityInput = document.querySelector("#productValidityLabel");
  const thumbnailInput = document.querySelector("#productThumbnailUrl");
  const thumbnailFileInput = document.querySelector("#productThumbnailFile");
  const uploadThumbnailBtn = document.querySelector("#uploadThumbnailBtn");
  const thumbnailPreview = document.querySelector("#productThumbnailPreview");
  const attachmentTypeFilter = document.querySelector("#attachmentTypeFilter");
  const attachmentCourseFilter = document.querySelector("#attachmentCourseFilter");
  const attachmentSubjectFilter = document.querySelector("#attachmentSubjectFilter");
  const attachmentChapterFilter = document.querySelector("#attachmentChapterFilter");
  const attachmentTitleFilter = document.querySelector("#attachmentTitleFilter");
  const attachmentLanguageFilter = document.querySelector("#attachmentLanguageFilter");
  const attachmentListWrap = document.querySelector("#attachmentListWrap");
  const attachmentListLabel = document.querySelector("#attachmentListLabel");
  const attachmentPrevPageBtn = document.querySelector("#attachmentPrevPageBtn");
  const attachmentNextPageBtn = document.querySelector("#attachmentNextPageBtn");
  const attachmentPageText = document.querySelector("#attachmentPageText");
  const addonsInput = document.querySelector("#productAddons");
  const descriptionInput = document.querySelector("#productDescription");
  const salientFeaturesInput = document.querySelector("#productSalientFeatures");
  const examsCoveredInput = document.querySelector("#productExamsCovered");
  const overviewInput = document.querySelector("#productOverview");
  const packageIncludesInput = document.querySelector("#productPackageIncludes");
  const studyPlanInput = document.querySelector("#productStudyPlan");
  const subjectsCoveredInput = document.querySelector("#productSubjectsCovered");
  const examPatternInput = document.querySelector("#productExamPattern");
  const faqsInput = document.querySelector("#productFaqs");
  const adminProductDescriptionPreview = document.querySelector("#adminProductDescriptionPreview");
  const adminProductSalientPreview = document.querySelector("#adminProductSalientPreview");
  const adminProductHighlightsPreview = document.querySelector("#adminProductHighlightsPreview");
  const adminProductExamsCoveredPreview = document.querySelector("#adminProductExamsCoveredPreview");
  const adminProductDetailsTabsPreview = document.querySelector("#adminProductDetailsTabsPreview");
  const addonsEditButtons = Array.from(document.querySelectorAll("[data-addon-edit-target]"));
  const addonsEditorPanels = Array.from(document.querySelectorAll("[data-addon-editor]"));
  const isActiveInput = document.querySelector("#productIsActive");
  const submitBtn = document.querySelector("#productSubmitBtn");
  const cancelBtn = document.querySelector("#productCancelBtn");
  const reloadBtn = document.querySelector("#reloadProductsBtn");
  const statusFilter = document.querySelector("#productsStatusFilter");
  const tableBody = document.querySelector("#productsTableBody");
  const productTabButtons = Array.from(document.querySelectorAll("[data-product-tab-btn]"));
  const productTabPanels = Array.from(document.querySelectorAll("[data-product-tab-panel]"));
  const productTabSaveBtn = document.querySelector("#productTabSaveBtn");
  const productTabNextBtn = document.querySelector("#productTabNextBtn");
  const productLinksModal = document.querySelector("#productLinksModal");
  const productLinksTitle = document.querySelector("#productLinksTitle");
  const productLinksSubtitle = document.querySelector("#productLinksSubtitle");
  const productLinksTableBody = document.querySelector("#productLinksTableBody");
  const closeProductLinksModalBtn = document.querySelector("#closeProductLinksModalBtn");

  /** @type {Array<any>} */
  let products = [];
  /** @type {Array<any>} */
  let allProductsCatalog = [];
  /** @type {Array<any>} */
  let mockTests = [];
  /** @type {Array<any>} */
  let editingLinkedMockTests = [];
  /** @type {Array<any>} */
  let editingLinkedDemoMockTests = [];
  const selectedDemoMockTestIds = new Set();
  const selectedLessonMockTestIds = new Set();
  const selectedMockMockTestIds = new Set();
  const selectedComboProductIds = new Set();
  const attachmentFilters = {
    type: "DEMO",
    course: "",
    subject: "",
    chapter: "",
    title: "",
    language: "",
    page: 1,
  };
  const ATTACHMENT_PAGE_SIZE = 10;
  /** @type {{ productId: string, mode: "demo" | "lessons" } | null} */
  let activeLinksModal = null;
  const PRODUCT_TAB_ORDER = ["create", "attachments", "addons"];
  let activeProductTab = "create";
  let activeAddonsDetailsTab = "overview";
  let activeAddonsEditorTarget = "";
  const tabSavedState = {
    create: false,
    attachments: false,
    addons: false,
  };
  const FALLBACK_THUMB = "./public/PSTET_1.png";
  const REFERRAL_REWARD_SLABS = [
    { min: 299, max: 500, earn: 25, friendDiscount: 10 },
    { min: 501, max: 1000, earn: 50, friendDiscount: 40 },
    { min: 1001, max: 2000, earn: 100, friendDiscount: 80 },
    { min: 2001, max: 3000, earn: 200, friendDiscount: 160 },
    { min: 3001, max: 4000, earn: 300, friendDiscount: 240 },
    { min: 4001, max: 5000, earn: 400, friendDiscount: 320 },
    { min: 5001, max: 6000, earn: 500, friendDiscount: 400 },
    { min: 6001, max: 8000, earn: 600, friendDiscount: 480 },
    { min: 8001, max: 10000, earn: 1000, friendDiscount: 640 },
    { min: 10001, max: Infinity, earn: 1200, friendDiscount: 800 },
  ];
  const DEFAULT_PRODUCT_HIGHLIGHTS = [
    "Access to Structured Classes in Audio with Scroll Form",
    "Doubt Solving Support via WhatsApp Chatbot, Telegram Groups, and Live Sessions (subject to availability).",
    "Boost Your Preparation with Study Planner | Previous Papers | Preparation Tips - Via Email & WhatsApp Chatbot",
    "Master PSTET with 10,000+ Carefully Curated MCQs for Every Subject.",
  ];
  const DEFAULT_PRODUCT_DESCRIPTION =
    "This course is designed to help students prepare with confidence using guided lessons, audio-scroll support, timed tests, and structured revision flow.";
  const DEFAULT_VALIDITY_LABEL = "4X Validity / 6 Months Access";
  const ADMISSION_CONTACT_NUMBER = "+91 62394-16404";
  const ADMISSION_CONTACT_TEL = "+916239416404";
  const DEFAULT_SALIENT_FEATURES = ["Audio Lesson", "Scroll with Audio", "Digital Test", "Timer Enable"];
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
  const DEFAULT_EXAMS_COVERED = [
    { title: "PSTET", imageUrl: "./public/PSTET_7.png" },
    { title: "Punjab Teaching Exams", imageUrl: "./public/PSTET_8.png" },
    { title: "CTET", imageUrl: "./public/PSTET_10.png" },
  ];
  const DEFAULT_DETAILS_TABS = {
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

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const parseLineList = (value) =>
    String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.replace(/^[\u2022\-*]+\s*/, "").trim())
      .filter(Boolean);

  const parseExamsCoveredInput = () =>
    String(examsCoveredInput?.value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [titlePart, imagePart] = line.split("|");
        const title = String(titlePart || "").trim();
        const imageUrl = String(imagePart || "").trim();
        if (!title) return null;
        return {
          title,
          imageUrl: imageUrl || "./public/PSTET_7.png",
        };
      })
      .filter(Boolean);

  const parseFaqsInput = () =>
    String(faqsInput?.value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [qPart, ...aParts] = line.split("|");
        const q = String(qPart || "").trim();
        const a = String(aParts.join("|") || "").trim();
        if (!q || !a) return null;
        return { q, a };
      })
      .filter(Boolean);

  const normalizeLineList = (value, fallback) => {
    const source = Array.isArray(value) ? value : [];
    const cleaned = source
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [...fallback];
  };

  const normalizeExamsCovered = (value) => {
    const source = Array.isArray(value) ? value : [];
    const cleaned = source
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const title = String(item.title || "").trim();
        const imageUrl = String(item.imageUrl || "").trim();
        if (!title) return null;
        return {
          title,
          imageUrl: imageUrl || "./public/PSTET_7.png",
        };
      })
      .filter(Boolean);
    return cleaned.length ? cleaned : [...DEFAULT_EXAMS_COVERED];
  };

  const normalizeFaqs = (value) => {
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
    return cleaned.length ? cleaned : [...DEFAULT_DETAILS_TABS.faqs];
  };

  const normalizeProductContent = (value) => {
    const raw =
      value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const detailsTabs =
      raw.detailsTabs && typeof raw.detailsTabs === "object" && !Array.isArray(raw.detailsTabs)
        ? raw.detailsTabs
        : {};

    const highlightsSource = Array.isArray(value) ? value : raw.highlights;
    return {
      highlights: normalizeLineList(highlightsSource, DEFAULT_PRODUCT_HIGHLIGHTS),
      salientFeatures: normalizeLineList(raw.salientFeatures, DEFAULT_SALIENT_FEATURES),
      examsCovered: normalizeExamsCovered(raw.examsCovered),
      detailsTabs: {
        overview: normalizeLineList(detailsTabs.overview, DEFAULT_DETAILS_TABS.overview),
        packageIncludes: normalizeLineList(detailsTabs.packageIncludes, DEFAULT_DETAILS_TABS.packageIncludes),
        studyPlan: normalizeLineList(detailsTabs.studyPlan, DEFAULT_DETAILS_TABS.studyPlan),
        subjectsCovered: normalizeLineList(detailsTabs.subjectsCovered, DEFAULT_DETAILS_TABS.subjectsCovered),
        examPattern: normalizeLineList(detailsTabs.examPattern, DEFAULT_DETAILS_TABS.examPattern),
        faqs: normalizeFaqs(detailsTabs.faqs),
      },
    };
  };

  const ensureEditableRows = (items, fallback = [""]) => {
    const normalized = (Array.isArray(items) ? items : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    if (normalized.length) return normalized;
    return Array.isArray(fallback) && fallback.length ? fallback : [""];
  };

  const renderPstetBulletList = (items, inlineEditKey = "") => {
    const rows = inlineEditKey ? ensureEditableRows(items, [""]) : Array.isArray(items) ? items : [];
    return `
      <ul class="product-pstet-list ${inlineEditKey ? "is-inline-editing" : ""}">
        ${rows
          .map((item, index) => {
            const text = String(item || "").trim();
            if (!inlineEditKey) return `<li>${escapeHtml(text)}</li>`;
            return `
              <li>
                <input
                  class="admin-inline-edit-input"
                  type="text"
                  data-inline-edit="${escapeHtml(inlineEditKey)}"
                  data-inline-index="${index}"
                  value="${escapeHtml(text)}"
                />
              </li>
            `;
          })
          .join("")}
      </ul>
    `;
  };

  const renderPstetFaqList = (items, editable = false) => {
    const rows = editable
      ? (Array.isArray(items) && items.length ? items : [{ q: "", a: "" }])
      : Array.isArray(items)
        ? items
        : [];
    return `
      <div class="product-pstet-faqs ${editable ? "is-inline-editing" : ""}">
        ${rows
          .map((item, index) => {
            const q = String(item?.q || "").trim();
            const a = String(item?.a || "").trim();
            if (!editable && (!q || !a)) return "";
            if (!editable) {
              return `
                <article class="product-pstet-faq-item">
                  <h5>${escapeHtml(q)}</h5>
                  <p>${escapeHtml(a)}</p>
                </article>
              `;
            }
            return `
              <article class="product-pstet-faq-item" data-inline-faq-row="${index}">
                <input
                  class="admin-inline-edit-input"
                  type="text"
                  data-inline-edit="faq-q"
                  value="${escapeHtml(q)}"
                  placeholder="Question"
                />
                <textarea
                  class="admin-inline-edit-textarea"
                  rows="2"
                  data-inline-edit="faq-a"
                  placeholder="Answer"
                >${escapeHtml(a)}</textarea>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const renderProductDescriptionPreview = (description, editable = false) => {
    const text = String(description || DEFAULT_PRODUCT_DESCRIPTION).trim();
    if (!editable) {
      return `
        <section class="product-description-section">
          <h4>Descriptions of Product</h4>
          <p>${escapeHtml(text)}</p>
        </section>
      `;
    }
    return `
      <section class="product-description-section is-inline-editing">
        <h4>Descriptions of Product</h4>
        <textarea
          class="admin-inline-edit-textarea"
          rows="4"
          data-inline-edit="description"
          placeholder="Enter product description"
        >${escapeHtml(text)}</textarea>
      </section>
    `;
  };

  const renderSalientFeaturesPreview = (content, editable = false) => {
    const features = editable
      ? ensureEditableRows(content?.salientFeatures, DEFAULT_SALIENT_FEATURES)
      : Array.isArray(content?.salientFeatures)
        ? content.salientFeatures
        : [];
    return `
      <section class="product-salient-features ${editable ? "is-inline-editing" : ""}">
        <h4>Salient <span>Features</span></h4>
        <div class="product-salient-grid">
          ${features
            .map((label, index) => {
              const fallbackIcon = SALIENT_FEATURES[index % SALIENT_FEATURES.length]?.icon || "";
              const text = String(label || "").trim();
              if (!editable) {
                return `
                  <article class="product-salient-item">
                    <span class="product-salient-icon">${fallbackIcon}</span>
                    <span>${escapeHtml(text)}</span>
                  </article>
                `;
              }
              return `
                <article class="product-salient-item">
                  <span class="product-salient-icon">${fallbackIcon}</span>
                  <input
                    class="admin-inline-edit-input"
                    type="text"
                    data-inline-edit="salient"
                    data-inline-index="${index}"
                    value="${escapeHtml(text)}"
                  />
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
  };

  const renderProductHighlightsPreview = (content, editable = false) => {
    const highlights = editable
      ? ensureEditableRows(content?.highlights, DEFAULT_PRODUCT_HIGHLIGHTS)
      : Array.isArray(content?.highlights)
        ? content.highlights
        : [];
    return `
      <section class="product-highlights ${editable ? "is-inline-editing" : ""}">
        <h4>Product <span>Highlights</span></h4>
        <ul class="product-highlights-list">
          ${highlights
            .map((item, index) => {
              const text = String(item || "").trim();
              if (!editable) {
                return `
                  <li>
                    <span class="product-highlight-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="m5 12 4 4 10-10" />
                      </svg>
                    </span>
                    <span>${escapeHtml(text)}</span>
                  </li>
                `;
              }
              return `
                <li>
                  <span class="product-highlight-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                  </span>
                  <input
                    class="admin-inline-edit-input"
                    type="text"
                    data-inline-edit="highlights"
                    data-inline-index="${index}"
                    value="${escapeHtml(text)}"
                  />
                </li>
              `;
            })
            .join("")}
        </ul>
      </section>
    `;
  };

  const renderExamsCoveredPreview = (content, editable = false) => {
    const exams = editable
      ? (Array.isArray(content?.examsCovered) && content.examsCovered.length ? content.examsCovered : DEFAULT_EXAMS_COVERED)
      : Array.isArray(content?.examsCovered)
        ? content.examsCovered
        : [];
    return `
      <section class="product-exams-covered ${editable ? "is-inline-editing" : ""}">
        <h4>Exams <span>Covered</span></h4>
        <div class="product-exams-grid">
          ${exams
            .map((item, index) => {
              const title = String(item?.title || "").trim();
              const rawImageUrl = String(item?.imageUrl || "./public/PSTET_7.png").trim() || "./public/PSTET_7.png";
              const imageUrl = normalizeAssetUrl(rawImageUrl);
              if (!title && !editable) return "";
              if (!editable) {
                return `
                  <article class="product-exam-item">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
                    <p>${escapeHtml(title)}</p>
                  </article>
                `;
              }
              return `
                <article class="product-exam-item" data-inline-exam-row="${index}">
                  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title || `Exam ${index + 1}`)}" />
                  <input
                    class="admin-inline-edit-input"
                    type="text"
                    data-inline-edit="exam-title"
                    value="${escapeHtml(title)}"
                    placeholder="Exam title"
                  />
                  <input
                    class="admin-inline-edit-input"
                    type="text"
                    data-inline-edit="exam-image"
                    value="${escapeHtml(rawImageUrl)}"
                    placeholder="Image URL"
                  />
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  };

  const renderProductDetailsTabsPreview = (content, editable = false) => {
    const tabs = content?.detailsTabs || {};
    const overviewRows = editable ? ensureEditableRows(tabs.overview, DEFAULT_DETAILS_TABS.overview) : (Array.isArray(tabs.overview) ? tabs.overview : []);
    return `
      <section class="product-pstet-tabs ${editable ? "is-inline-editing" : ""}" data-pstet-tabs>
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
            ${overviewRows
              .map((para, index) => {
                const text = String(para || "").trim();
                if (!editable) return `<p>${escapeHtml(text)}</p>`;
                return `
                  <textarea
                    class="admin-inline-edit-textarea"
                    rows="3"
                    data-inline-edit="overview"
                    data-inline-index="${index}"
                    placeholder="Overview paragraph"
                  >${escapeHtml(text)}</textarea>
                `;
              })
              .join("")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="includes">
            ${renderPstetBulletList(Array.isArray(tabs.packageIncludes) ? tabs.packageIncludes : [], editable ? "includes" : "")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="plan">
            ${renderPstetBulletList(Array.isArray(tabs.studyPlan) ? tabs.studyPlan : [], editable ? "plan" : "")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="subjects">
            ${renderPstetBulletList(Array.isArray(tabs.subjectsCovered) ? tabs.subjectsCovered : [], editable ? "subjects" : "")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="pattern">
            ${renderPstetBulletList(Array.isArray(tabs.examPattern) ? tabs.examPattern : [], editable ? "pattern" : "")}
          </section>
          <section class="product-pstet-tab-panel" data-pstet-tab-panel="faqs">
            ${renderPstetFaqList(Array.isArray(tabs.faqs) ? tabs.faqs : [], editable)}
          </section>
        </div>
      </section>
    `;
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

  const readInlineFieldValue = (field) => {
    if (!(field instanceof HTMLElement)) return "";
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      return String(field.value || "").trim();
    }
    return String(field.textContent || "").trim();
  };

  const readInlineValues = (container, selector) => {
    if (!(container instanceof HTMLElement)) return [];
    return Array.from(container.querySelectorAll(selector))
      .map((item) => readInlineFieldValue(item))
      .filter(Boolean);
  };

  const syncAddonEditorUi = () => {
    addonsEditorPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.classList.add("hidden");
    });
    addonsEditButtons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const key = String(btn.getAttribute("data-addon-edit-target") || "").trim();
      btn.textContent = activeAddonsEditorTarget === key ? "Done" : "Edit";
      const card = btn.closest(".admin-addon-card");
      if (card instanceof HTMLElement) {
        card.classList.toggle("is-editing", activeAddonsEditorTarget === key);
      }
    });
  };

  const applyInlineAddonEdits = (targetKey) => {
    if (!targetKey) return;

    if (targetKey === "description" && descriptionInput instanceof HTMLTextAreaElement) {
      const field = adminProductDescriptionPreview?.querySelector("[data-inline-edit='description']");
      const value = readInlineFieldValue(field);
      descriptionInput.value = value || DEFAULT_PRODUCT_DESCRIPTION;
      return;
    }

    if (targetKey === "salient" && salientFeaturesInput instanceof HTMLTextAreaElement) {
      const rows = readInlineValues(adminProductSalientPreview, "[data-inline-edit='salient']");
      salientFeaturesInput.value = (rows.length ? rows : DEFAULT_SALIENT_FEATURES).join("\n");
      return;
    }

    if (targetKey === "highlights" && addonsInput instanceof HTMLTextAreaElement) {
      const rows = readInlineValues(adminProductHighlightsPreview, "[data-inline-edit='highlights']");
      addonsInput.value = (rows.length ? rows : DEFAULT_PRODUCT_HIGHLIGHTS).join("\n");
      return;
    }

    if (targetKey === "exams" && examsCoveredInput instanceof HTMLTextAreaElement) {
      const rows = Array.from(adminProductExamsCoveredPreview?.querySelectorAll("[data-inline-exam-row]") || []);
      const exams = rows
        .map((row) => {
          if (!(row instanceof HTMLElement)) return null;
          const title = readInlineFieldValue(row.querySelector("[data-inline-edit='exam-title']"));
          const imageUrl = readInlineFieldValue(row.querySelector("[data-inline-edit='exam-image']")) || "./public/PSTET_7.png";
          if (!title) return null;
          return { title, imageUrl };
        })
        .filter(Boolean);
      examsCoveredInput.value = formatExamsCoveredForInput(exams.length ? exams : DEFAULT_EXAMS_COVERED);
      return;
    }

    if (targetKey === "details-tabs") {
      const overviewRows = readInlineValues(adminProductDetailsTabsPreview, "[data-inline-edit='overview']");
      const includesRows = readInlineValues(adminProductDetailsTabsPreview, "[data-inline-edit='includes']");
      const planRows = readInlineValues(adminProductDetailsTabsPreview, "[data-inline-edit='plan']");
      const subjectsRows = readInlineValues(adminProductDetailsTabsPreview, "[data-inline-edit='subjects']");
      const patternRows = readInlineValues(adminProductDetailsTabsPreview, "[data-inline-edit='pattern']");
      const faqRows = Array.from(adminProductDetailsTabsPreview?.querySelectorAll("[data-inline-faq-row]") || [])
        .map((row) => {
          if (!(row instanceof HTMLElement)) return null;
          const q = readInlineFieldValue(row.querySelector("[data-inline-edit='faq-q']"));
          const a = readInlineFieldValue(row.querySelector("[data-inline-edit='faq-a']"));
          if (!q || !a) return null;
          return { q, a };
        })
        .filter(Boolean);

      if (overviewInput instanceof HTMLTextAreaElement) {
        overviewInput.value = (overviewRows.length ? overviewRows : DEFAULT_DETAILS_TABS.overview).join("\n");
      }
      if (packageIncludesInput instanceof HTMLTextAreaElement) {
        packageIncludesInput.value = (includesRows.length ? includesRows : DEFAULT_DETAILS_TABS.packageIncludes).join("\n");
      }
      if (studyPlanInput instanceof HTMLTextAreaElement) {
        studyPlanInput.value = (planRows.length ? planRows : DEFAULT_DETAILS_TABS.studyPlan).join("\n");
      }
      if (subjectsCoveredInput instanceof HTMLTextAreaElement) {
        subjectsCoveredInput.value = (subjectsRows.length ? subjectsRows : DEFAULT_DETAILS_TABS.subjectsCovered).join("\n");
      }
      if (examPatternInput instanceof HTMLTextAreaElement) {
        examPatternInput.value = (patternRows.length ? patternRows : DEFAULT_DETAILS_TABS.examPattern).join("\n");
      }
      if (faqsInput instanceof HTMLTextAreaElement) {
        faqsInput.value = formatFaqsForInput(faqRows.length ? faqRows : DEFAULT_DETAILS_TABS.faqs);
      }
    }
  };

  const closeAllAddonEditors = () => {
    activeAddonsEditorTarget = "";
    syncAddonEditorUi();
  };

  const toggleAddonEditor = (targetKey) => {
    if (!targetKey) return;

    if (activeAddonsEditorTarget === targetKey) {
      applyInlineAddonEdits(targetKey);
      activeAddonsEditorTarget = "";
    } else {
      if (activeAddonsEditorTarget) {
        applyInlineAddonEdits(activeAddonsEditorTarget);
      }
      activeAddonsEditorTarget = targetKey;
    }

    syncAddonEditorUi();
    renderAddonsPreview();

    if (!activeAddonsEditorTarget) return;
    const previewBlock = document.querySelector(`[data-addon-preview="${activeAddonsEditorTarget}"]`);
    const firstField = previewBlock?.querySelector("input, textarea, [contenteditable='true']");
    if (firstField instanceof HTMLElement) firstField.focus();
  };

  const renderAddonsPreview = () => {
    const content = normalizeProductContent(buildProductContentFromForm());
    if (adminProductDescriptionPreview instanceof HTMLElement) {
      adminProductDescriptionPreview.innerHTML = renderProductDescriptionPreview(
        String(descriptionInput?.value || "").trim() || DEFAULT_PRODUCT_DESCRIPTION,
        activeAddonsEditorTarget === "description"
      );
    }
    if (adminProductSalientPreview instanceof HTMLElement) {
      adminProductSalientPreview.innerHTML = renderSalientFeaturesPreview(content, activeAddonsEditorTarget === "salient");
    }
    if (adminProductHighlightsPreview instanceof HTMLElement) {
      adminProductHighlightsPreview.innerHTML = renderProductHighlightsPreview(
        content,
        activeAddonsEditorTarget === "highlights"
      );
    }
    if (adminProductExamsCoveredPreview instanceof HTMLElement) {
      adminProductExamsCoveredPreview.innerHTML = renderExamsCoveredPreview(content, activeAddonsEditorTarget === "exams");
    }
    if (adminProductDetailsTabsPreview instanceof HTMLElement) {
      adminProductDetailsTabsPreview.innerHTML = renderProductDetailsTabsPreview(
        content,
        activeAddonsEditorTarget === "details-tabs"
      );
      activatePstetTab(adminProductDetailsTabsPreview, activeAddonsDetailsTab);
    }
  };

  const formatExamsCoveredForInput = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) => {
        const title = String(item?.title || "").trim();
        const imageUrl = String(item?.imageUrl || "").trim();
        if (!title) return "";
        return `${title} | ${imageUrl || "./public/PSTET_7.png"}`;
      })
      .filter(Boolean)
      .join("\n");

  const formatFaqsForInput = (items) =>
    (Array.isArray(items) ? items : [])
      .map((item) => {
        const q = String(item?.q || "").trim();
        const a = String(item?.a || "").trim();
        if (!q || !a) return "";
        return `${q} | ${a}`;
      })
      .filter(Boolean)
      .join("\n");

  const normalizeAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return FALLBACK_THUMB;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../")) return raw;
    if (raw.startsWith("/")) return raw;
    return `./${raw}`;
  };

  const syncComboPanelVisibility = () => {
    const enabled = Boolean(isComboInput?.checked);
    if (comboPanel instanceof HTMLElement) {
      comboPanel.classList.toggle("hidden", !enabled);
    }
    if (!enabled && comboSearchInput instanceof HTMLInputElement) {
      comboSearchInput.value = "";
    }
  };

  const getComboCatalogRows = () => {
    const editingId = String(productIdInput?.value || "").trim();
    const search = String(comboSearchInput?.value || "").trim().toLowerCase();
    return (Array.isArray(allProductsCatalog) ? allProductsCatalog : [])
      .filter((item) => String(item?.id || "").trim() && String(item?.id || "").trim() !== editingId)
      .filter((item) => {
        if (!search) return true;
        const haystack = [
          item?.title,
          item?.examCategory,
          item?.examName,
          item?.courseType,
          item?.languageMode,
        ]
          .map((value) => String(value || "").trim().toLowerCase())
          .join(" ");
        return haystack.includes(search);
      });
  };

  const renderComboProductList = () => {
    syncComboPanelVisibility();
    if (!(comboListWrap instanceof HTMLElement)) return;
    if (!isComboInput?.checked) {
      comboListWrap.innerHTML = "";
      if (comboSummary instanceof HTMLElement) {
        comboSummary.textContent = "Enable combo to combine or join products.";
      }
      return;
    }

    const rows = getComboCatalogRows();
    if (comboSummary instanceof HTMLElement) {
      comboSummary.textContent = `${selectedComboProductIds.size} product(s) selected. You can combine unlimited products.`;
    }

    if (!rows.length) {
      comboListWrap.innerHTML =
        '<p style="margin:0;color:#666;">No products found for combo selection.</p>';
      return;
    }

    comboListWrap.innerHTML = rows
      .map((product) => {
        const productId = String(product?.id || "").trim();
        const inputId = `combo-product-${productId}`;
        const meta = [
          String(product?.examCategory || "").trim(),
          String(product?.examName || "").trim(),
          String(product?.courseType || "").trim(),
          String(product?.languageMode || "").trim(),
        ]
          .filter(Boolean)
          .join(" | ");
        return `
          <label class="filter-option" for="${escapeHtml(inputId)}">
            <input
              id="${escapeHtml(inputId)}"
              type="checkbox"
              data-combo-product-id="${escapeHtml(productId)}"
              ${selectedComboProductIds.has(productId) ? "checked" : ""}
            />
            <span>
              <strong class="attachment-item-title">${escapeHtml(String(product?.title || "Untitled Product"))}</strong>
              <small class="attachment-item-meta">${escapeHtml(meta || "-")}</small>
            </span>
          </label>
        `;
      })
      .join("");
  };

  const setThumbnailPreview = (src) => {
    if (!(thumbnailPreview instanceof HTMLImageElement)) return;
    const value = normalizeAssetUrl(src);
    if (!value) {
      thumbnailPreview.classList.add("hidden");
      thumbnailPreview.removeAttribute("src");
      return;
    }
    thumbnailPreview.onerror = () => {
      thumbnailPreview.onerror = null;
      thumbnailPreview.src = FALLBACK_THUMB;
    };
    thumbnailPreview.src = value;
    thumbnailPreview.classList.remove("hidden");
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read selected file."));
      reader.readAsDataURL(file);
    });

  const normalizeAttachmentType = (value) => {
    const code = String(value || "").trim().toUpperCase();
    if (code === "DEMO" || code === "LESSON" || code === "MOCK") return code;
    return "MOCK";
  };

  const getSelectedSetByAttachmentType = (type) => {
    if (type === "DEMO") return selectedDemoMockTestIds;
    if (type === "LESSON") return selectedLessonMockTestIds;
    return selectedMockMockTestIds;
  };

  const toAttachmentTestRecord = (item) => ({
    id: String(item?.id || "").trim(),
    title: String(item?.title || "Untitled"),
    examType: String(item?.examType || "").trim(),
    subject: String(item?.subject || "").trim(),
    accessCode: normalizeAttachmentType(item?.accessCode),
    languageMode: String(item?.languageMode || "").trim(),
    courseTitle: String(item?.courseTitle || "").trim(),
    chapterTitle: String(item?.chapterTitle || "").trim(),
    lessonTitle: String(item?.lessonTitle || "").trim(),
  });

  const getAttachmentTypeMatch = (type, accessCode) => {
    if (type === "DEMO") return accessCode === "DEMO";
    if (type === "LESSON") return accessCode === "LESSON";
    return accessCode === "MOCK";
  };

  const getAttachmentCandidates = (type) => {
    const normalizedType = normalizeAttachmentType(type);
    const baseRows = (Array.isArray(mockTests) ? mockTests : [])
      .map((item) => toAttachmentTestRecord(item))
      .filter((item) => item.id && getAttachmentTypeMatch(normalizedType, item.accessCode));

    const linkedFallbackSource = normalizedType === "DEMO" ? editingLinkedDemoMockTests : editingLinkedMockTests;
    const linkedFallback = (Array.isArray(linkedFallbackSource) ? linkedFallbackSource : [])
      .map((item) => toAttachmentTestRecord(item))
      .filter((item) => item.id && getAttachmentTypeMatch(normalizedType, item.accessCode));

    const mergedMap = new Map();
    [...baseRows, ...linkedFallback].forEach((item) => {
      if (!item.id) return;
      if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
    });
    return Array.from(mergedMap.values());
  };

  const fillFilterSelect = (selectEl, values, currentValue, allLabel) => {
    if (!(selectEl instanceof HTMLSelectElement)) return "";
    const unique = Array.from(
      new Set(
        values
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    selectEl.innerHTML = [
      `<option value="">${escapeHtml(allLabel)}</option>`,
      ...unique.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`),
    ].join("");

    if (currentValue && unique.includes(currentValue)) {
      selectEl.value = currentValue;
      return currentValue;
    }
    selectEl.value = "";
    return "";
  };

  const renderAttachmentList = () => {
    const selectedType = normalizeAttachmentType(attachmentFilters.type);
    const candidates = getAttachmentCandidates(selectedType);
    if (attachmentListLabel instanceof HTMLElement) {
      attachmentListLabel.textContent = `Select ${selectedType} Attachments`;
    }

    attachmentFilters.course = fillFilterSelect(
      attachmentCourseFilter,
      candidates.map((item) => item.courseTitle),
      attachmentFilters.course,
      "All Courses"
    );
    attachmentFilters.subject = fillFilterSelect(
      attachmentSubjectFilter,
      candidates.map((item) => item.subject),
      attachmentFilters.subject,
      "All Subjects"
    );
    attachmentFilters.chapter = fillFilterSelect(
      attachmentChapterFilter,
      candidates.map((item) => item.chapterTitle),
      attachmentFilters.chapter,
      "All Chapters"
    );
    attachmentFilters.language = fillFilterSelect(
      attachmentLanguageFilter,
      candidates.map((item) => item.languageMode),
      attachmentFilters.language,
      "All Languages"
    );

    const titleSearch = String(attachmentFilters.title || "").trim().toLowerCase();
    const filtered = candidates.filter((item) => {
      if (attachmentFilters.course && item.courseTitle !== attachmentFilters.course) return false;
      if (attachmentFilters.subject && item.subject !== attachmentFilters.subject) return false;
      if (attachmentFilters.chapter && item.chapterTitle !== attachmentFilters.chapter) return false;
      if (attachmentFilters.language && item.languageMode !== attachmentFilters.language) return false;
      if (!titleSearch) return true;
      return item.title.toLowerCase().includes(titleSearch);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ATTACHMENT_PAGE_SIZE));
    attachmentFilters.page = Math.min(Math.max(1, Number(attachmentFilters.page || 1)), totalPages);
    const pageStart = (attachmentFilters.page - 1) * ATTACHMENT_PAGE_SIZE;
    const pageRows = filtered.slice(pageStart, pageStart + ATTACHMENT_PAGE_SIZE);
    const selectedSet = getSelectedSetByAttachmentType(selectedType);

    if (attachmentListWrap instanceof HTMLElement) {
      if (!pageRows.length) {
        attachmentListWrap.innerHTML =
          '<p style="margin:0;color:#666;">No entries found for selected filters.</p>';
      } else {
        attachmentListWrap.innerHTML = pageRows
          .map((item) => {
            const inputId = `attachment-${selectedType.toLowerCase()}-${item.id}`;
            const subtitle = [
              item.courseTitle ? `Course: ${item.courseTitle}` : "",
              item.chapterTitle ? `Chapter: ${item.chapterTitle}` : "",
              item.lessonTitle ? `Lesson: ${item.lessonTitle}` : "",
              item.subject ? `Subject: ${item.subject}` : "",
              item.languageMode ? `Language: ${item.languageMode}` : "",
            ]
              .filter(Boolean)
              .join(" | ");

            return `
              <label class="filter-option" for="${escapeHtml(inputId)}">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  data-attachment-test-id="${escapeHtml(item.id)}"
                  data-attachment-type="${escapeHtml(selectedType)}"
                  ${selectedSet.has(item.id) ? "checked" : ""}
                />
                <span>
                  <strong class="attachment-item-title">${escapeHtml(item.title)}</strong>
                  <small class="attachment-item-meta">${escapeHtml(subtitle || "-")}</small>
                </span>
              </label>
            `;
          })
          .join("");
      }
    }

    if (attachmentPageText instanceof HTMLElement) {
      attachmentPageText.textContent = `Page ${attachmentFilters.page} / ${totalPages}`;
    }
    if (attachmentPrevPageBtn instanceof HTMLButtonElement) {
      attachmentPrevPageBtn.disabled = attachmentFilters.page <= 1;
    }
    if (attachmentNextPageBtn instanceof HTMLButtonElement) {
      attachmentNextPageBtn.disabled = attachmentFilters.page >= totalPages;
    }
  };

  const syncAttachmentSelectionsFromProduct = (product) => {
    selectedDemoMockTestIds.clear();
    selectedLessonMockTestIds.clear();
    selectedMockMockTestIds.clear();
    const demoRows = Array.isArray(product?.linkedDemoMockTests) ? product.linkedDemoMockTests : [];
    demoRows.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (id) selectedDemoMockTestIds.add(id);
    });

    const linkedRows = Array.isArray(product?.linkedMockTests) ? product.linkedMockTests : [];
    linkedRows.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      const code = normalizeAttachmentType(item?.accessCode);
      if (code === "LESSON") {
        selectedLessonMockTestIds.add(id);
      } else {
        selectedMockMockTestIds.add(id);
      }
    });
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    if (productIdInput) productIdInput.value = "";
    if (isActiveInput) isActiveInput.checked = true;
    if (submitBtn) submitBtn.textContent = "Create Product";
    if (cancelBtn) cancelBtn.classList.add("hidden");
    editingLinkedMockTests = [];
    editingLinkedDemoMockTests = [];
    selectedDemoMockTestIds.clear();
    selectedLessonMockTestIds.clear();
    selectedMockMockTestIds.clear();
    selectedComboProductIds.clear();
    attachmentFilters.type = "DEMO";
    attachmentFilters.course = "";
    attachmentFilters.subject = "";
    attachmentFilters.chapter = "";
    attachmentFilters.title = "";
    attachmentFilters.language = "";
    attachmentFilters.page = 1;
    if (attachmentTypeFilter instanceof HTMLSelectElement) attachmentTypeFilter.value = "DEMO";
    if (attachmentTitleFilter instanceof HTMLInputElement) attachmentTitleFilter.value = "";
    renderAttachmentList();
    if (isComboInput instanceof HTMLInputElement) isComboInput.checked = false;
    if (comboSearchInput instanceof HTMLInputElement) comboSearchInput.value = "";
    renderComboProductList();
    if (addonsInput) addonsInput.value = DEFAULT_PRODUCT_HIGHLIGHTS.join("\n");
    if (descriptionInput) descriptionInput.value = DEFAULT_PRODUCT_DESCRIPTION;
    if (validityInput) validityInput.value = DEFAULT_VALIDITY_LABEL;
    if (salientFeaturesInput) salientFeaturesInput.value = DEFAULT_SALIENT_FEATURES.join("\n");
    if (examsCoveredInput) examsCoveredInput.value = formatExamsCoveredForInput(DEFAULT_EXAMS_COVERED);
    if (overviewInput) overviewInput.value = DEFAULT_DETAILS_TABS.overview.join("\n");
    if (packageIncludesInput) packageIncludesInput.value = DEFAULT_DETAILS_TABS.packageIncludes.join("\n");
    if (studyPlanInput) studyPlanInput.value = DEFAULT_DETAILS_TABS.studyPlan.join("\n");
    if (subjectsCoveredInput) subjectsCoveredInput.value = DEFAULT_DETAILS_TABS.subjectsCovered.join("\n");
    if (examPatternInput) examPatternInput.value = DEFAULT_DETAILS_TABS.examPattern.join("\n");
    if (faqsInput) faqsInput.value = formatFaqsForInput(DEFAULT_DETAILS_TABS.faqs);
    setThumbnailPreview("");
    activeAddonsDetailsTab = "overview";
    closeAllAddonEditors();
    renderAddonsPreview();
    autoWireReferralRewards();
    activeProductTab = "create";
    markAllTabsSaved(false);
  };

  const buildProductContentFromForm = () => ({
    highlights: parseLineList(addonsInput?.value || ""),
    salientFeatures: parseLineList(salientFeaturesInput?.value || ""),
    examsCovered: parseExamsCoveredInput(),
    detailsTabs: {
      overview: parseLineList(overviewInput?.value || ""),
      packageIncludes: parseLineList(packageIncludesInput?.value || ""),
      studyPlan: parseLineList(studyPlanInput?.value || ""),
      subjectsCovered: parseLineList(subjectsCoveredInput?.value || ""),
      examPattern: parseLineList(examPatternInput?.value || ""),
      faqs: parseFaqsInput(),
    },
  });

  const payloadFromForm = () => {
    if (activeAddonsEditorTarget) {
      applyInlineAddonEdits(activeAddonsEditorTarget);
    }
    return {
      title: titleInput?.value?.trim() || "",
      examCategory: categoryInput?.value?.trim() || "",
      examName: examInput?.value?.trim() || "",
      courseType: courseTypeInput?.value || "LIVE_CLASS",
      languageMode: languageInput?.value || undefined,
      listPrice: listPriceInput?.value ? Number(listPriceInput.value) : 0,
      salePrice: salePriceInput?.value ? Number(salePriceInput.value) : 0,
      referralBonusAmount: referralBonusInput?.value ? Number(referralBonusInput.value) : 0,
      referralDiscountAmount: referralDiscountInput?.value ? Number(referralDiscountInput.value) : 0,
      accessDays: accessDaysInput?.value ? Number(accessDaysInput.value) : 0,
      validityLabel: validityInput?.value?.trim() || undefined,
      thumbnailUrl: thumbnailInput?.value?.trim() || undefined,
      mockTestIds: Array.from(new Set([...selectedLessonMockTestIds, ...selectedMockMockTestIds])),
      demoMockTestIds: Array.from(selectedDemoMockTestIds),
      comboProductIds: isComboInput?.checked ? Array.from(selectedComboProductIds) : [],
      addons: buildProductContentFromForm(),
      description: descriptionInput?.value?.trim() || undefined,
      isActive: Boolean(isActiveInput?.checked),
    };
  };

  const toCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

  const pickReferralRewardsBySalePrice = (salePrice) => {
    const amount = Number(salePrice || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { earn: 0, friendDiscount: 0 };
    }
    const matched =
      REFERRAL_REWARD_SLABS.find((slab) => amount >= slab.min && amount <= slab.max) || null;
    if (!matched) return { earn: 0, friendDiscount: 0 };
    return {
      earn: Number(matched.earn || 0),
      friendDiscount: Number(matched.friendDiscount || 0),
    };
  };

  const autoWireReferralRewards = () => {
    if (!(salePriceInput instanceof HTMLInputElement)) return;
    const salePrice = Number(salePriceInput.value || 0);
    const rewards = pickReferralRewardsBySalePrice(salePrice);
    if (referralBonusInput instanceof HTMLInputElement) {
      referralBonusInput.value = String(rewards.earn || 0);
    }
    if (referralDiscountInput instanceof HTMLInputElement) {
      referralDiscountInput.value = String(rewards.friendDiscount || 0);
    }
  };

  const updateTabUi = () => {
    productTabButtons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      const tabId = String(btn.getAttribute("data-product-tab-btn") || "");
      btn.classList.toggle("active", tabId === activeProductTab);
      btn.classList.toggle("saved", Boolean(tabSavedState[tabId]));
      const suffix = tabSavedState[tabId] ? " (Saved)" : "";
      const baseLabel = String(btn.textContent || "").replace(/\s+\(Saved\)$/i, "");
      btn.textContent = `${baseLabel}${suffix}`;
    });

    productTabPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const tabId = String(panel.getAttribute("data-product-tab-panel") || "");
      panel.classList.toggle("active", tabId === activeProductTab);
    });

    const allSaved = PRODUCT_TAB_ORDER.every((key) => Boolean(tabSavedState[key]));
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = !allSaved;
      submitBtn.title = allSaved ? "" : "Save all tabs first";
    }
  };

  const setTabSaved = (tabId, saved) => {
    if (!PRODUCT_TAB_ORDER.includes(tabId)) return;
    tabSavedState[tabId] = Boolean(saved);
    updateTabUi();
  };

  const markAllTabsSaved = (saved) => {
    PRODUCT_TAB_ORDER.forEach((tabId) => {
      tabSavedState[tabId] = Boolean(saved);
    });
    updateTabUi();
  };

  const switchProductTab = (tabId) => {
    if (!PRODUCT_TAB_ORDER.includes(tabId)) return;
    if (activeProductTab === "addons" && tabId !== "addons" && activeAddonsEditorTarget) {
      applyInlineAddonEdits(activeAddonsEditorTarget);
      activeAddonsEditorTarget = "";
      syncAddonEditorUi();
      renderAddonsPreview();
    }
    activeProductTab = tabId;
    updateTabUi();
  };

  const getFieldValue = (input) => String(input?.value || "").trim();

  const validateCreateTab = () => {
    const listPrice = Number(listPriceInput?.value || 0);
    const salePrice = Number(salePriceInput?.value || 0);
    const referralDiscount = Number(referralDiscountInput?.value || 0);
    const accessDays = Number(accessDaysInput?.value || 0);
    const referralBonus = Number(referralBonusInput?.value || 0);

    if (!getFieldValue(titleInput)) return "Title is required.";
    if (!getFieldValue(categoryInput)) return "Exam Category is required.";
    if (!getFieldValue(examInput)) return "Exam is required.";
    if (!getFieldValue(courseTypeInput)) return "Product Type is required.";
    if (!(listPrice > 0)) return "MRP must be greater than 0.";
    if (!(salePrice > 0)) return "Discount Price must be greater than 0.";
    if (!(accessDays > 0)) return "Access days must be greater than 0.";
    if (referralBonus < 0) return "Referral Bonus cannot be negative.";
    if (referralDiscount < 0) return "Referral Friend Discount cannot be negative.";
    if (referralDiscount > salePrice) return "Referral friend discount cannot be greater than Discount Price.";
    return "";
  };

  const validateTab = (tabId) => {
    if (tabId === "create") return validateCreateTab();
    return "";
  };

  const saveCurrentTab = () => {
    if (activeProductTab === "addons" && activeAddonsEditorTarget) {
      applyInlineAddonEdits(activeAddonsEditorTarget);
      activeAddonsEditorTarget = "";
      syncAddonEditorUi();
      renderAddonsPreview();
    }
    const errorMessage = validateTab(activeProductTab);
    if (errorMessage) {
      setMessage(errorMessage, "error");
      return false;
    }
    setTabSaved(activeProductTab, true);
    setMessage(`Saved ${activeProductTab} tab.`, "success");
    return true;
  };

  const goToNextTab = () => {
    const index = PRODUCT_TAB_ORDER.indexOf(activeProductTab);
    if (index < 0) return;
    const next = PRODUCT_TAB_ORDER[Math.min(index + 1, PRODUCT_TAB_ORDER.length - 1)];
    switchProductTab(next);
  };

  const getProductById = (productId) => products.find((item) => String(item?.id || "") === String(productId || ""));

  const getLinkedTestsByMode = (product, mode) => {
    if (!product || typeof product !== "object") return [];
    if (mode === "demo") return Array.isArray(product.linkedDemoMockTests) ? product.linkedDemoMockTests : [];
    return Array.isArray(product.linkedMockTests) ? product.linkedMockTests : [];
  };

  const toAccessCode = (value) => String(value || "DEMO").trim().toUpperCase();

  const getAvailableTestsByMode = (mode) => {
    const source = Array.isArray(mockTests) ? mockTests : [];
    return source.filter((item) => {
      const code = toAccessCode(item?.accessCode);
      if (mode === "demo") return code === "DEMO";
      return code !== "DEMO";
    });
  };

  const getMergedTestsForModal = (product, mode) => {
    const linked = getLinkedTestsByMode(product, mode);
    const linkedById = new Map(
      linked
        .map((item) => [String(item?.id || "").trim(), item])
        .filter(([id]) => Boolean(id))
    );
    const available = getAvailableTestsByMode(mode);

    const rows = [];
    available.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      rows.push({
        id,
        title: String(item?.title || "Untitled"),
        linked: linkedById.has(id),
      });
    });

    linked.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      if (rows.some((row) => row.id === id)) return;
      rows.push({
        id,
        title: String(item?.title || "Untitled"),
        linked: true,
      });
    });

    return rows;
  };

  const closeLinksModal = () => {
    activeLinksModal = null;
    if (productLinksModal instanceof HTMLElement) {
      productLinksModal.classList.add("hidden");
      productLinksModal.setAttribute("aria-hidden", "true");
    }
    if (productLinksTableBody instanceof HTMLElement) {
      productLinksTableBody.innerHTML = "";
    }
  };

  const renderLinksModal = () => {
    if (!activeLinksModal) return;
    const product = getProductById(activeLinksModal.productId);
    if (!product) {
      closeLinksModal();
      return;
    }

    const mode = activeLinksModal.mode;
    const modeLabel = mode === "demo" ? "Demo" : "Lessons";
    if (productLinksTitle instanceof HTMLElement) {
      productLinksTitle.textContent = `${modeLabel} Links`;
    }
    if (productLinksSubtitle instanceof HTMLElement) {
      productLinksSubtitle.textContent = `${product.title || "Product"} - ${modeLabel}`;
    }

    const rows = getMergedTestsForModal(product, mode);
    if (!(productLinksTableBody instanceof HTMLElement)) return;
    if (!rows.length) {
      productLinksTableBody.innerHTML =
        '<tr><td colspan="3" style="text-align:center;color:#666;">No tests available for this section.</td></tr>';
      return;
    }

    productLinksTableBody.innerHTML = rows
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.title)}</td>
            <td>
              <button
                class="table-btn ${item.linked ? "delete" : "edit"}"
                type="button"
                data-links-action="${item.linked ? "remove" : "add"}"
                data-links-mode="${escapeHtml(mode)}"
                data-links-product-id="${escapeHtml(String(product.id || ""))}"
                data-links-test-id="${escapeHtml(item.id)}"
              >
                ${item.linked ? "Remove" : "Add"}
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const openLinksModal = (productId, mode) => {
    const product = getProductById(productId);
    if (!product) return;
    activeLinksModal = { productId: String(productId), mode };
    if (productLinksModal instanceof HTMLElement) {
      productLinksModal.classList.remove("hidden");
      productLinksModal.setAttribute("aria-hidden", "false");
    }
    renderLinksModal();
  };

  const applyLinkAction = async ({ productId, mode, testId, action }) => {
    const product = getProductById(productId);
    if (!product) return;

    const linkedDemo = getLinkedTestsByMode(product, "demo");
    const linkedLessons = getLinkedTestsByMode(product, "lessons");
    const demoIds = linkedDemo.map((item) => String(item?.id || "").trim()).filter(Boolean);
    const lessonIds = linkedLessons.map((item) => String(item?.id || "").trim()).filter(Boolean);

    const nextDemoIds = [...demoIds];
    const nextLessonIds = [...lessonIds];
    const targetList = mode === "demo" ? nextDemoIds : nextLessonIds;
    const has = targetList.includes(testId);

    if (action === "add" && !has) targetList.push(testId);
    if (action === "remove" && has) {
      const idx = targetList.indexOf(testId);
      if (idx >= 0) targetList.splice(idx, 1);
    }

    const data = await apiRequest({
      path: `/admin/products/${encodeURIComponent(String(productId))}`,
      method: "PATCH",
      token,
      body: {
        mockTestIds: nextLessonIds,
        demoMockTestIds: nextDemoIds,
      },
    });
    const updated = data?.product || null;
    if (!updated) return;
    products = products.map((item) => (item.id === updated.id ? updated : item));
    renderProducts();
    renderLinksModal();
  };

  const renderProducts = () => {
    if (!tableBody) return;
    if (!products.length) {
      tableBody.innerHTML =
        '<tr><td colspan="13" style="text-align:center;color:#666;">No products added yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = products
      .map((product) => {
        const discountPercent =
          product.listPrice > 0
            ? Math.max(0, Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100))
            : 0;
        const thumb = normalizeAssetUrl(product.thumbnailUrl);
        const linkedTests = Array.isArray(product.linkedMockTests) ? product.linkedMockTests : [];
        const linkedDemoTests = Array.isArray(product.linkedDemoMockTests)
          ? product.linkedDemoMockTests
          : [];
        const comboProducts = Array.isArray(product.comboProducts) ? product.comboProducts : [];
        const productId = String(product.id || "");

        return `
          <tr>
            <td>
              <img
                class="admin-product-thumb"
                src="${escapeHtml(thumb)}"
                alt="${escapeHtml(product.title || "Product")}" 
                onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
              />
            </td>
            <td>${escapeHtml(product.title || "-")}</td>
            <td>${escapeHtml(product.examCategory || "-")}</td>
            <td>${escapeHtml(product.examName || "-")}</td>
            <td>${escapeHtml(product.courseType || "-")}</td>
            <td>${escapeHtml(product.languageMode || "-")}</td>
            <td>
              ${toCurrency(product.salePrice)}
              <small style="display:block;color:#666;">
                MRP ${toCurrency(product.listPrice)} (${discountPercent}% off)
              </small>
            </td>
            <td>
              <div class="admin-linked-summary">
                <button
                  class="table-link-btn"
                  type="button"
                  data-open-links-modal="true"
                  data-links-product-id="${escapeHtml(productId)}"
                  data-links-mode="demo"
                >
                  Demo-${linkedDemoTests.length}
                </button>
                <button
                  class="table-link-btn"
                  type="button"
                  data-open-links-modal="true"
                  data-links-product-id="${escapeHtml(productId)}"
                  data-links-mode="lessons"
                >
                  Lessons-${linkedTests.length}
                </button>
                <span class="table-link-btn" style="cursor:default;">Combo-${comboProducts.length}</span>
              </div>
            </td>
            <td>${toCurrency(product.referralBonusAmount || 0)}</td>
            <td>${toCurrency(product.referralDiscountAmount || 0)}</td>
            <td>${Number(product.accessDays || 0)} days</td>
            <td><span class="chip ${product.isActive ? "active" : "inactive"}">${
          product.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>
              <div class="table-actions">
                <button class="table-btn edit" type="button" data-edit-product="${product.id}">Edit</button>
                <button
                  class="table-btn"
                  type="button"
                  data-toggle-product="${product.id}"
                  data-next-active="${product.isActive ? "false" : "true"}"
                >
                  ${product.isActive ? "Deactivate" : "Activate"}
                </button>
                <button class="table-btn delete" type="button" data-delete-product="${product.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const fillFormForEdit = (product) => {
    if (!productIdInput) return;
    productIdInput.value = product.id;
    if (titleInput) titleInput.value = product.title || "";
    if (categoryInput) categoryInput.value = product.examCategory || "";
    if (examInput) examInput.value = product.examName || "";
    if (courseTypeInput) courseTypeInput.value = product.courseType || "LIVE_CLASS";
    if (languageInput) languageInput.value = product.languageMode || "";
    if (listPriceInput) listPriceInput.value = String(product.listPrice ?? "");
    if (salePriceInput) salePriceInput.value = String(product.salePrice ?? "");
    if (referralBonusInput) referralBonusInput.value = String(product.referralBonusAmount ?? 0);
    if (referralDiscountInput) referralDiscountInput.value = String(product.referralDiscountAmount ?? 0);
    if (accessDaysInput) accessDaysInput.value = String(product.accessDays ?? "");
    if (validityInput) validityInput.value = product.validityLabel || DEFAULT_VALIDITY_LABEL;
    if (thumbnailInput) thumbnailInput.value = product.thumbnailUrl || "";
    setThumbnailPreview(product.thumbnailUrl || "");
    const productContent = normalizeProductContent(product.addons);
    if (addonsInput) addonsInput.value = productContent.highlights.join("\n");
    if (salientFeaturesInput) salientFeaturesInput.value = productContent.salientFeatures.join("\n");
    if (examsCoveredInput) examsCoveredInput.value = formatExamsCoveredForInput(productContent.examsCovered);
    if (overviewInput) overviewInput.value = productContent.detailsTabs.overview.join("\n");
    if (packageIncludesInput) packageIncludesInput.value = productContent.detailsTabs.packageIncludes.join("\n");
    if (studyPlanInput) studyPlanInput.value = productContent.detailsTabs.studyPlan.join("\n");
    if (subjectsCoveredInput) subjectsCoveredInput.value = productContent.detailsTabs.subjectsCovered.join("\n");
    if (examPatternInput) examPatternInput.value = productContent.detailsTabs.examPattern.join("\n");
    if (faqsInput) faqsInput.value = formatFaqsForInput(productContent.detailsTabs.faqs);
    if (descriptionInput) descriptionInput.value = product.description || DEFAULT_PRODUCT_DESCRIPTION;
    if (isActiveInput) isActiveInput.checked = Boolean(product.isActive);
    activeAddonsDetailsTab = "overview";
    closeAllAddonEditors();
    renderAddonsPreview();

    const linkedTests = Array.isArray(product.linkedMockTests) ? product.linkedMockTests : [];
    const linkedDemoTests = Array.isArray(product.linkedDemoMockTests) ? product.linkedDemoMockTests : [];
    const comboProducts = Array.isArray(product.comboProducts) ? product.comboProducts : [];
    editingLinkedMockTests = linkedTests;
    editingLinkedDemoMockTests = linkedDemoTests;
    selectedComboProductIds.clear();
    comboProducts.forEach((item) => {
      const id = String(item?.id || "").trim();
      if (id) selectedComboProductIds.add(id);
    });
    if (isComboInput instanceof HTMLInputElement) {
      isComboInput.checked = comboProducts.length > 0;
    }
    if (comboSearchInput instanceof HTMLInputElement) comboSearchInput.value = "";
    renderComboProductList();
    syncAttachmentSelectionsFromProduct(product);
    attachmentFilters.type = "DEMO";
    attachmentFilters.page = 1;
    attachmentFilters.course = "";
    attachmentFilters.subject = "";
    attachmentFilters.chapter = "";
    attachmentFilters.title = "";
    attachmentFilters.language = "";
    if (attachmentTypeFilter instanceof HTMLSelectElement) attachmentTypeFilter.value = "DEMO";
    if (attachmentTitleFilter instanceof HTMLInputElement) attachmentTitleFilter.value = "";
    renderAttachmentList();

    if (submitBtn) submitBtn.textContent = "Update Product";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    activeProductTab = "create";
    markAllTabsSaved(true);
    switchProductTab("create");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadMockTests = async () => {
    const data = await apiRequest({ path: "/admin/products/mock-tests", token });
    mockTests = Array.isArray(data?.mockTests) ? data.mockTests : [];
    renderAttachmentList();
  };

  const loadProducts = async () => {
    const filterValue = statusFilter?.value || "";
    const query = filterValue === "" ? {} : { isActive: filterValue };
    const data = await apiRequest({ path: "/admin/products", token, query });
    products = Array.isArray(data?.products) ? data.products : [];
    renderProducts();
  };

  const loadAllProductsCatalog = async () => {
    const data = await apiRequest({ path: "/admin/products", token });
    allProductsCatalog = Array.isArray(data?.products) ? data.products : [];
    renderComboProductList();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  const getTabIdFromElement = (element) => {
    if (!(element instanceof HTMLElement)) return "";
    const panel = element.closest("[data-product-tab-panel]");
    if (!(panel instanceof HTMLElement)) return "";
    return String(panel.getAttribute("data-product-tab-panel") || "");
  };

  if (form) {
    const invalidateTabOnEdit = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const tabId = getTabIdFromElement(target);
      if (!PRODUCT_TAB_ORDER.includes(tabId)) return;
      if (!tabSavedState[tabId]) return;
      setTabSaved(tabId, false);
    };
    form.addEventListener("input", invalidateTabOnEdit);
    form.addEventListener("change", invalidateTabOnEdit);
  }

  productTabButtons.forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener("click", () => {
      const tabId = String(btn.getAttribute("data-product-tab-btn") || "");
      switchProductTab(tabId);
      setMessage("");
    });
  });

  if (productTabSaveBtn instanceof HTMLButtonElement) {
    productTabSaveBtn.addEventListener("click", () => {
      saveCurrentTab();
    });
  }

  if (productTabNextBtn instanceof HTMLButtonElement) {
    productTabNextBtn.addEventListener("click", () => {
      goToNextTab();
      setMessage("");
    });
  }

  addonsEditButtons.forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener("click", () => {
      const targetKey = String(btn.getAttribute("data-addon-edit-target") || "").trim();
      if (!targetKey) return;
      toggleAddonEditor(targetKey);
    });
  });

  if (adminProductDetailsTabsPreview instanceof HTMLElement) {
    adminProductDetailsTabsPreview.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const tabBtn = target.closest("[data-pstet-tab-btn]");
      if (!(tabBtn instanceof HTMLButtonElement)) return;
      const tabId = String(tabBtn.getAttribute("data-pstet-tab-btn") || "").trim();
      if (!tabId) return;
      activeAddonsDetailsTab = tabId;
      activatePstetTab(adminProductDetailsTabsPreview, tabId);
    });
  }

  const addonsPreviewInputs = [
    addonsInput,
    descriptionInput,
    salientFeaturesInput,
    examsCoveredInput,
    overviewInput,
    packageIncludesInput,
    studyPlanInput,
    subjectsCoveredInput,
    examPatternInput,
    faqsInput,
  ];
  addonsPreviewInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) return;
    input.addEventListener("input", () => {
      renderAddonsPreview();
    });
    input.addEventListener("change", () => {
      renderAddonsPreview();
    });
  });

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");

      const allSaved = PRODUCT_TAB_ORDER.every((key) => Boolean(tabSavedState[key]));
      if (!allSaved) {
        setMessage("Please save all tabs before submitting.", "error");
        return;
      }

      const payload = payloadFromForm();
      if (
        !payload.title ||
        !payload.examCategory ||
        !payload.examName ||
        !payload.courseType ||
        payload.listPrice <= 0 ||
        payload.salePrice <= 0 ||
        payload.referralBonusAmount < 0 ||
        payload.referralDiscountAmount < 0 ||
        payload.accessDays <= 0
      ) {
        setMessage("Fill all mandatory fields with valid values.", "error");
        return;
      }
      if (payload.referralDiscountAmount > payload.salePrice) {
        setMessage("Referral friend discount cannot be greater than Discount Price.", "error");
        return;
      }

      try {
        const id = productIdInput?.value || "";
        if (id) {
          await apiRequest({
            path: `/admin/products/${id}`,
            method: "PATCH",
            token,
            body: payload,
          });
          setMessage("Product updated.", "success");
        } else {
          await apiRequest({
            path: "/admin/products",
            method: "POST",
            token,
            body: payload,
          });
          setMessage("Product created.", "success");
        }

        resetForm();
        await Promise.all([loadProducts(), loadAllProductsCatalog()]);
      } catch (error) {
        setMessage(error.message || "Unable to save product.", "error");
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      resetForm();
      setMessage("");
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("click", async () => {
      try {
        setMessage("Reloading products...");
        await Promise.all([loadProducts(), loadMockTests(), loadAllProductsCatalog()]);
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load products.", "error");
      }
    });
  }

  if (thumbnailInput) {
    thumbnailInput.addEventListener("input", () => {
      setThumbnailPreview(thumbnailInput.value);
    });
  }

  if (salePriceInput instanceof HTMLInputElement) {
    salePriceInput.addEventListener("input", () => {
      autoWireReferralRewards();
    });
    salePriceInput.addEventListener("change", () => {
      autoWireReferralRewards();
    });
  }

  if (isComboInput instanceof HTMLInputElement) {
    isComboInput.addEventListener("change", () => {
      if (!isComboInput.checked) {
        selectedComboProductIds.clear();
      }
      renderComboProductList();
    });
  }

  if (comboSearchInput instanceof HTMLInputElement) {
    comboSearchInput.addEventListener("input", () => {
      renderComboProductList();
    });
  }

  if (comboListWrap instanceof HTMLElement) {
    comboListWrap.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const productId = String(target.getAttribute("data-combo-product-id") || "").trim();
      if (!productId) return;
      if (target.checked) selectedComboProductIds.add(productId);
      else selectedComboProductIds.delete(productId);
      renderComboProductList();
    });
  }

  if (attachmentTypeFilter instanceof HTMLSelectElement) {
    attachmentTypeFilter.addEventListener("change", () => {
      attachmentFilters.type = normalizeAttachmentType(attachmentTypeFilter.value);
      attachmentFilters.course = "";
      attachmentFilters.subject = "";
      attachmentFilters.chapter = "";
      attachmentFilters.title = "";
      attachmentFilters.language = "";
      attachmentFilters.page = 1;
      if (attachmentTitleFilter instanceof HTMLInputElement) attachmentTitleFilter.value = "";
      renderAttachmentList();
    });
  }

  if (attachmentCourseFilter instanceof HTMLSelectElement) {
    attachmentCourseFilter.addEventListener("change", () => {
      attachmentFilters.course = String(attachmentCourseFilter.value || "").trim();
      attachmentFilters.page = 1;
      renderAttachmentList();
    });
  }

  if (attachmentSubjectFilter instanceof HTMLSelectElement) {
    attachmentSubjectFilter.addEventListener("change", () => {
      attachmentFilters.subject = String(attachmentSubjectFilter.value || "").trim();
      attachmentFilters.page = 1;
      renderAttachmentList();
    });
  }

  if (attachmentChapterFilter instanceof HTMLSelectElement) {
    attachmentChapterFilter.addEventListener("change", () => {
      attachmentFilters.chapter = String(attachmentChapterFilter.value || "").trim();
      attachmentFilters.page = 1;
      renderAttachmentList();
    });
  }

  if (attachmentLanguageFilter instanceof HTMLSelectElement) {
    attachmentLanguageFilter.addEventListener("change", () => {
      attachmentFilters.language = String(attachmentLanguageFilter.value || "").trim();
      attachmentFilters.page = 1;
      renderAttachmentList();
    });
  }

  if (attachmentTitleFilter instanceof HTMLInputElement) {
    attachmentTitleFilter.addEventListener("input", () => {
      attachmentFilters.title = String(attachmentTitleFilter.value || "");
      attachmentFilters.page = 1;
      renderAttachmentList();
    });
  }

  if (attachmentPrevPageBtn instanceof HTMLButtonElement) {
    attachmentPrevPageBtn.addEventListener("click", () => {
      attachmentFilters.page = Math.max(1, Number(attachmentFilters.page || 1) - 1);
      renderAttachmentList();
    });
  }

  if (attachmentNextPageBtn instanceof HTMLButtonElement) {
    attachmentNextPageBtn.addEventListener("click", () => {
      attachmentFilters.page = Number(attachmentFilters.page || 1) + 1;
      renderAttachmentList();
    });
  }

  if (attachmentListWrap instanceof HTMLElement) {
    attachmentListWrap.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const testId = String(target.getAttribute("data-attachment-test-id") || "").trim();
      const type = normalizeAttachmentType(target.getAttribute("data-attachment-type"));
      if (!testId) return;
      const setRef = getSelectedSetByAttachmentType(type);
      if (target.checked) setRef.add(testId);
      else setRef.delete(testId);
    });
  }

  if (uploadThumbnailBtn) {
    uploadThumbnailBtn.addEventListener("click", async () => {
      if (!(thumbnailFileInput instanceof HTMLInputElement)) return;
      const file = thumbnailFileInput.files?.[0];
      if (!file) {
        setMessage("Choose an image file first.", "error");
        return;
      }

      const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
      if (!allowedTypes.has(file.type)) {
        setMessage("Only JPG, PNG, WEBP, and GIF files are allowed.", "error");
        return;
      }

      const maxSizeBytes = 3 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setMessage("Image size must be 3MB or less.", "error");
        return;
      }

      try {
        uploadThumbnailBtn.disabled = true;
        setMessage("Uploading thumbnail...");
        const dataUrl = await fileToDataUrl(file);
        const data = await apiRequest({
          path: "/admin/products/thumbnail-upload",
          method: "POST",
          token,
          body: {
            fileName: file.name,
            dataUrl,
          },
        });

        if (thumbnailInput && data?.thumbnailUrl) {
          thumbnailInput.value = data.thumbnailUrl;
          setThumbnailPreview(data.thumbnailUrl);
        }
        setMessage("Thumbnail uploaded successfully.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to upload thumbnail.", "error");
      } finally {
        uploadThumbnailBtn.disabled = false;
      }
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", async () => {
      try {
        await loadProducts();
      } catch (error) {
        setMessage(error.message || "Unable to apply filter.", "error");
      }
    });
  }

  if (tableBody) {
    tableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const openLinksBtn = target.closest("[data-open-links-modal='true']");
      if (openLinksBtn instanceof HTMLElement) {
        const productId = String(openLinksBtn.getAttribute("data-links-product-id") || "").trim();
        const modeRaw = String(openLinksBtn.getAttribute("data-links-mode") || "").trim().toLowerCase();
        if (!productId) return;
        const mode = modeRaw === "demo" ? "demo" : "lessons";
        openLinksModal(productId, mode);
        return;
      }

      const editId = target.getAttribute("data-edit-product");
      if (editId) {
        const product = products.find((item) => item.id === editId);
        if (product) fillFormForEdit(product);
        return;
      }

      const toggleId = target.getAttribute("data-toggle-product");
      if (toggleId) {
        const nextActive = target.getAttribute("data-next-active") === "true";
        try {
          await apiRequest({
            path: `/admin/products/${toggleId}`,
            method: "PATCH",
            token,
            body: { isActive: nextActive },
          });
          await Promise.all([loadProducts(), loadAllProductsCatalog()]);
          setMessage("Product status updated.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to update product status.", "error");
        }
        return;
      }

      const deleteId = target.getAttribute("data-delete-product");
      if (!deleteId) return;
      const confirmed = window.confirm("Delete this product?");
      if (!confirmed) return;

      try {
        await apiRequest({
          path: `/admin/products/${deleteId}`,
          method: "DELETE",
          token,
        });
        await Promise.all([loadProducts(), loadAllProductsCatalog()]);
        setMessage("Product deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete product.", "error");
      }
    });
  }

  if (productLinksModal instanceof HTMLElement) {
    productLinksModal.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.hasAttribute("data-close-product-links")) {
        closeLinksModal();
        return;
      }

      const actionBtn = target.closest("[data-links-action]");
      if (!(actionBtn instanceof HTMLElement)) return;

      const productId = String(actionBtn.getAttribute("data-links-product-id") || "").trim();
      const modeRaw = String(actionBtn.getAttribute("data-links-mode") || "").trim().toLowerCase();
      const action = String(actionBtn.getAttribute("data-links-action") || "").trim().toLowerCase();
      const testId = String(actionBtn.getAttribute("data-links-test-id") || "").trim();
      if (!productId || !testId) return;
      const mode = modeRaw === "demo" ? "demo" : "lessons";
      if (action !== "add" && action !== "remove") return;

      try {
        actionBtn.setAttribute("disabled", "disabled");
        await applyLinkAction({ productId, mode, testId, action });
      } catch (error) {
        setMessage(error.message || "Unable to update links.", "error");
      } finally {
        actionBtn.removeAttribute("disabled");
      }
    });
  }

  if (closeProductLinksModalBtn instanceof HTMLButtonElement) {
    closeProductLinksModalBtn.addEventListener("click", () => {
      closeLinksModal();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!activeLinksModal) return;
    closeLinksModal();
  });

  updateTabUi();

  try {
    setMessage("Loading products...");
    await Promise.all([loadMockTests(), loadProducts(), loadAllProductsCatalog()]);
    resetForm();
    autoWireReferralRewards();
    setMessage("");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      goAdminLogin();
      return;
    }
    setMessage(error.message || "Unable to load products.", "error");
  }
});

