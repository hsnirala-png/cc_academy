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
  const validityInput = document.querySelector("#productValidityLabel");
  const thumbnailInput = document.querySelector("#productThumbnailUrl");
  const thumbnailFileInput = document.querySelector("#productThumbnailFile");
  const uploadThumbnailBtn = document.querySelector("#uploadThumbnailBtn");
  const thumbnailPreview = document.querySelector("#productThumbnailPreview");
  const productMockTestsWrap = document.querySelector("#productMockTestsWrap");
  const productDemoMockTestsWrap = document.querySelector("#productDemoMockTestsWrap");
  const addonsInput = document.querySelector("#productAddons");
  const descriptionInput = document.querySelector("#productDescription");
  const isActiveInput = document.querySelector("#productIsActive");
  const submitBtn = document.querySelector("#productSubmitBtn");
  const cancelBtn = document.querySelector("#productCancelBtn");
  const reloadBtn = document.querySelector("#reloadProductsBtn");
  const statusFilter = document.querySelector("#productsStatusFilter");
  const tableBody = document.querySelector("#productsTableBody");

  /** @type {Array<any>} */
  let products = [];
  /** @type {Array<any>} */
  let mockTests = [];
  /** @type {Array<any>} */
  let editingLinkedMockTests = [];
  /** @type {Array<any>} */
  let editingLinkedDemoMockTests = [];
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

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const parseAddonsInput = () =>
    String(addonsInput?.value || "")
      .split(/\r?\n|,/)
      .map((item) => item.replace(/^[\u2022\-*]+\s*/, "").trim())
      .filter(Boolean);

  const normalizeAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return FALLBACK_THUMB;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../")) return raw;
    if (raw.startsWith("/")) return raw;
    return `./${raw}`;
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

  const selectedMockTestIds = (targetWrap) => {
    if (!(targetWrap instanceof HTMLElement)) return [];
    return Array.from(
      targetWrap.querySelectorAll('input[type="checkbox"][data-mock-test-id]:checked')
    )
      .map((input) => String(input.getAttribute("data-mock-test-id") || "").trim())
      .filter(Boolean);
  };

  const renderMockTestChecklist = (targetWrap, selectedIds = [], linkedTestsFromEdit = []) => {
    if (!(targetWrap instanceof HTMLElement)) return;
    const checkboxPrefix =
      targetWrap.id === "productDemoMockTestsWrap" ? "product-demo-mock-test" : "product-mock-test";

    const selectedSet = new Set((selectedIds || []).map((item) => String(item || "").trim()));
    const publishedTests = mockTests.filter((test) => Boolean(test?.isActive));
    const missingSelectedFromEdit = (linkedTestsFromEdit || [])
      .map((item) => ({
        id: String(item?.id || "").trim(),
        title: String(item?.title || "Untitled"),
        examType: String(item?.examType || ""),
        subject: String(item?.subject || ""),
        accessCode: String(item?.accessCode || "DEMO"),
        isActive: Boolean(item?.isActive),
      }))
      .filter(
        (test) =>
          test.id &&
          selectedSet.has(test.id) &&
          !publishedTests.some((published) => String(published?.id || "").trim() === test.id)
      );
    const testsToRender = [...publishedTests, ...missingSelectedFromEdit];

    if (!testsToRender.length) {
      targetWrap.innerHTML =
        '<p style="margin:0;color:#666;">No published tests found. Publish tests first.</p>';
      return;
    }

    targetWrap.innerHTML = testsToRender
      .map((test) => {
        const testId = String(test.id || "").trim();
        const inputId = `${checkboxPrefix}-${testId}`;
        const checked = selectedSet.has(testId) ? "checked" : "";
        const isPublished = Boolean(test?.isActive);
        const subtitle = [
          String(test.examType || "").trim(),
          String(test.subject || "").trim(),
          String(test.accessCode || "DEMO").trim(),
          isPublished ? "Published" : "Unpublished (already linked)",
        ]
          .filter(Boolean)
          .join(" | ");
        return `
          <label class="filter-option" for="${escapeHtml(inputId)}">
            <input
              id="${escapeHtml(inputId)}"
              type="checkbox"
              data-mock-test-id="${escapeHtml(testId)}"
              ${checked}
            />
            <span>
              <strong>${escapeHtml(test.title || "Untitled")}</strong>
              <small style="display:block;color:#666;">${escapeHtml(subtitle)}</small>
            </span>
          </label>
        `;
      })
      .join("");
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
    renderMockTestChecklist(productMockTestsWrap, []);
    renderMockTestChecklist(productDemoMockTestsWrap, []);
    if (addonsInput) addonsInput.value = DEFAULT_PRODUCT_HIGHLIGHTS.join("\n");
    setThumbnailPreview("");
    autoWireReferralRewards();
  };

  const payloadFromForm = () => ({
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
    mockTestIds: selectedMockTestIds(productMockTestsWrap),
    demoMockTestIds: selectedMockTestIds(productDemoMockTestsWrap),
    addons: parseAddonsInput(),
    description: descriptionInput?.value?.trim() || undefined,
    isActive: Boolean(isActiveInput?.checked),
  });

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
              ${
                linkedTests.length
                  ? `<div style="margin-bottom:${linkedDemoTests.length ? "0.5rem" : "0"};"><small style="color:#666;">Tests</small>${linkedTests
                      .map(
                        (test) =>
                          `<div><strong>${escapeHtml(test.title || "-")}</strong> <small>(${escapeHtml(
                            test.accessCode || "DEMO"
                          )})</small></div>`
                      )
                      .join("")}</div>`
                  : linkedDemoTests.length
                    ? ""
                    : "-"
              }
              ${
                linkedDemoTests.length
                  ? `<div><small style="color:#666;">Demo</small>${linkedDemoTests
                      .map(
                        (test) =>
                          `<div><strong>${escapeHtml(test.title || "-")}</strong> <small>(${escapeHtml(
                            test.accessCode || "DEMO"
                          )})</small></div>`
                      )
                      .join("")}</div>`
                  : ""
              }
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
    if (validityInput) validityInput.value = product.validityLabel || "";
    if (thumbnailInput) thumbnailInput.value = product.thumbnailUrl || "";
    setThumbnailPreview(product.thumbnailUrl || "");
    if (addonsInput) addonsInput.value = (product.addons || []).join("\n");
    if (descriptionInput) descriptionInput.value = product.description || "";
    if (isActiveInput) isActiveInput.checked = Boolean(product.isActive);

    const linkedTests = Array.isArray(product.linkedMockTests) ? product.linkedMockTests : [];
    const linkedDemoTests = Array.isArray(product.linkedDemoMockTests) ? product.linkedDemoMockTests : [];
    editingLinkedMockTests = linkedTests;
    editingLinkedDemoMockTests = linkedDemoTests;
    renderMockTestChecklist(
      productMockTestsWrap,
      linkedTests.map((item) => String(item?.id || "").trim()).filter(Boolean),
      editingLinkedMockTests
    );
    renderMockTestChecklist(
      productDemoMockTestsWrap,
      linkedDemoTests.map((item) => String(item?.id || "").trim()).filter(Boolean),
      editingLinkedDemoMockTests
    );

    if (submitBtn) submitBtn.textContent = "Update Product";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadMockTests = async () => {
    const selected = selectedMockTestIds(productMockTestsWrap);
    const selectedDemo = selectedMockTestIds(productDemoMockTestsWrap);
    const data = await apiRequest({ path: "/admin/products/mock-tests", token });
    mockTests = Array.isArray(data?.mockTests) ? data.mockTests : [];
    renderMockTestChecklist(productMockTestsWrap, selected, editingLinkedMockTests);
    renderMockTestChecklist(productDemoMockTestsWrap, selectedDemo, editingLinkedDemoMockTests);
  };

  const loadProducts = async () => {
    const filterValue = statusFilter?.value || "";
    const query = filterValue === "" ? {} : { isActive: filterValue };
    const data = await apiRequest({ path: "/admin/products", token, query });
    products = Array.isArray(data?.products) ? data.products : [];
    renderProducts();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");

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
        await loadProducts();
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
        await Promise.all([loadProducts(), loadMockTests()]);
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
          await loadProducts();
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
        await loadProducts();
        setMessage("Product deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete product.", "error");
      }
    });
  }

  try {
    setMessage("Loading products...");
    await Promise.all([loadMockTests(), loadProducts()]);
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

