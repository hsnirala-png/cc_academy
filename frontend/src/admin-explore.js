import { apiRequest, clearAuth, escapeHtml, requireRoleGuard, requireRoleGuardStrict } from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;

  const messageEl = document.querySelector("#adminExploreMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const pageFilterInput = document.querySelector("#explorePageFilter");
  const reloadBtn = document.querySelector("#reloadExploreBtn");

  const typeForm = document.querySelector("#exploreTypeForm");
  const typeIdInput = document.querySelector("#exploreTypeId");
  const typePageKeyInput = document.querySelector("#exploreTypePageKey");
  const typeNameInput = document.querySelector("#exploreTypeName");
  const typeDescriptionInput = document.querySelector("#exploreTypeDescription");
  const typeIconUrlInput = document.querySelector("#exploreTypeIconUrl");
  const typeIconFileInput = document.querySelector("#exploreTypeIconFile");
  const typeIconUploadBtn = document.querySelector("#uploadExploreTypeIconBtn");
  const typeIconPreview = document.querySelector("#exploreTypeIconPreview");
  const typeSortOrderInput = document.querySelector("#exploreTypeSortOrder");
  const typeIsActiveInput = document.querySelector("#exploreTypeIsActive");
  const typeSubmitBtn = document.querySelector("#exploreTypeSubmitBtn");
  const typeCancelBtn = document.querySelector("#exploreTypeCancelBtn");
  const typesTableBody = document.querySelector("#exploreTypesTableBody");

  const itemForm = document.querySelector("#exploreItemForm");
  const itemIdInput = document.querySelector("#exploreItemId");
  const itemTypeIdInput = document.querySelector("#exploreItemTypeId");
  const itemCategoryNameInput = document.querySelector("#exploreItemCategoryName");
  const itemTitleInput = document.querySelector("#exploreItemTitle");
  const itemSubtitleInput = document.querySelector("#exploreItemSubtitle");
  const itemImageUrlInput = document.querySelector("#exploreItemImageUrl");
  const itemImageFileInput = document.querySelector("#exploreItemImageFile");
  const itemImageUploadBtn = document.querySelector("#uploadExploreItemImageBtn");
  const itemImagePreview = document.querySelector("#exploreItemImagePreview");
  const itemLinkUrlInput = document.querySelector("#exploreItemLinkUrl");
  const itemSortOrderInput = document.querySelector("#exploreItemSortOrder");
  const itemIsActiveInput = document.querySelector("#exploreItemIsActive");
  const itemSubmitBtn = document.querySelector("#exploreItemSubmitBtn");
  const itemCancelBtn = document.querySelector("#exploreItemCancelBtn");
  const itemsTableBody = document.querySelector("#exploreItemsTableBody");

  let types = [];
  let items = [];
  const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  const maxImageSizeBytes = 5 * 1024 * 1024;

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };

  const setMessage = (text, type) => {
    if (!(messageEl instanceof HTMLElement)) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const normalizePageKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/_ -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-/]+|[-/]+$/g, "");

  const normalizeAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
    if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
    return `./${raw}`;
  };

  const toDisplayLink = (value) => {
    const text = String(value || "").trim();
    if (!text) return "-";
    if (text.length <= 52) return text;
    return `${text.slice(0, 49)}...`;
  };

  const setImagePreview = (element, src) => {
    if (!(element instanceof HTMLImageElement)) return;
    const value = normalizeAssetUrl(src);
    if (!value) {
      element.classList.add("hidden");
      element.removeAttribute("src");
      return;
    }
    element.src = value;
    element.classList.remove("hidden");
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read selected file."));
      reader.readAsDataURL(file);
    });

  const validateImageFile = (file) => {
    if (!file) throw new Error("Choose an image file first.");
    if (!allowedImageTypes.has(file.type)) {
      throw new Error("Only JPG, PNG, WEBP, and GIF files are allowed.");
    }
    if (file.size > maxImageSizeBytes) {
      throw new Error("Image size must be 5MB or less.");
    }
  };

  const uploadImageFile = async (file) => {
    validateImageFile(file);
    const dataUrl = await fileToDataUrl(file);
    const data = await apiRequest({
      path: "/admin/explore/image-upload",
      method: "POST",
      token,
      body: {
        fileName: file.name,
        dataUrl,
      },
    });
    const imageUrl = String(data?.imageUrl || "").trim();
    if (!imageUrl) throw new Error("Image upload failed.");
    return imageUrl;
  };

  const resetTypeForm = () => {
    typeForm?.reset();
    if (typeIdInput) typeIdInput.value = "";
    if (typePageKeyInput) typePageKeyInput.value = "landing-home";
    if (typeSortOrderInput) typeSortOrderInput.value = "0";
    if (typeIsActiveInput) typeIsActiveInput.checked = true;
    if (typeSubmitBtn) typeSubmitBtn.textContent = "Create Type";
    if (typeCancelBtn) typeCancelBtn.classList.add("hidden");
    setImagePreview(typeIconPreview, "");
  };

  const resetItemForm = () => {
    itemForm?.reset();
    if (itemIdInput) itemIdInput.value = "";
    if (itemCategoryNameInput) itemCategoryNameInput.value = "";
    if (itemSortOrderInput) itemSortOrderInput.value = "0";
    if (itemIsActiveInput) itemIsActiveInput.checked = true;
    if (itemSubmitBtn) itemSubmitBtn.textContent = "Create Card";
    if (itemCancelBtn) itemCancelBtn.classList.add("hidden");
    if (itemTypeIdInput instanceof HTMLSelectElement && types.length) {
      itemTypeIdInput.value = types[0]?.id || "";
    }
    setImagePreview(itemImagePreview, "");
  };

  const fillTypeFormForEdit = (type) => {
    if (typeIdInput) typeIdInput.value = type.id;
    if (typePageKeyInput) typePageKeyInput.value = type.pageKey || "";
    if (typeNameInput) typeNameInput.value = type.name || "";
    if (typeDescriptionInput) typeDescriptionInput.value = type.description || "";
    if (typeIconUrlInput) typeIconUrlInput.value = type.iconUrl || "";
    if (typeSortOrderInput) typeSortOrderInput.value = String(type.sortOrder ?? 0);
    if (typeIsActiveInput) typeIsActiveInput.checked = Boolean(type.isActive);
    if (typeSubmitBtn) typeSubmitBtn.textContent = "Update Type";
    if (typeCancelBtn) typeCancelBtn.classList.remove("hidden");
    setImagePreview(typeIconPreview, type.iconUrl || "");
    typeForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fillItemFormForEdit = (item) => {
    if (itemIdInput) itemIdInput.value = item.id;
    if (itemTypeIdInput) itemTypeIdInput.value = item.typeId || "";
    if (itemCategoryNameInput) itemCategoryNameInput.value = item.categoryName || "";
    if (itemTitleInput) itemTitleInput.value = item.title || "";
    if (itemSubtitleInput) itemSubtitleInput.value = item.subtitle || "";
    if (itemImageUrlInput) itemImageUrlInput.value = item.imageUrl || "";
    if (itemLinkUrlInput) itemLinkUrlInput.value = item.linkUrl || "";
    if (itemSortOrderInput) itemSortOrderInput.value = String(item.sortOrder ?? 0);
    if (itemIsActiveInput) itemIsActiveInput.checked = Boolean(item.isActive);
    if (itemSubmitBtn) itemSubmitBtn.textContent = "Update Card";
    if (itemCancelBtn) itemCancelBtn.classList.remove("hidden");
    setImagePreview(itemImagePreview, item.imageUrl || "");
    itemForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderTypeOptions = () => {
    if (!(itemTypeIdInput instanceof HTMLSelectElement)) return;
    if (!types.length) {
      itemTypeIdInput.innerHTML = '<option value="">Create a type first</option>';
      return;
    }
    itemTypeIdInput.innerHTML = types
      .map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.name)} (${escapeHtml(type.pageKey)})</option>`)
      .join("");
  };

  const renderTypes = () => {
    if (!(typesTableBody instanceof HTMLElement)) return;
    if (!types.length) {
      typesTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#666;">No explore types found.</td></tr>';
      return;
    }
    typesTableBody.innerHTML = types
      .map((type) => `
        <tr>
          <td>
            <strong>${escapeHtml(type.name)}</strong>
            <div style="margin-top:0.25rem;color:#666;">${escapeHtml(type.description || "-")}</div>
          </td>
          <td>${escapeHtml(type.pageKey || "-")}</td>
          <td>${Number(type.sortOrder || 0)}</td>
          <td><span class="chip ${type.isActive ? "active" : "inactive"}">${type.isActive ? "Active" : "Inactive"}</span></td>
          <td>
            <div class="table-actions">
              <button class="table-btn edit" type="button" data-edit-type="${type.id}">Edit</button>
              <button class="table-btn delete" type="button" data-delete-type="${type.id}">Delete</button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  };

  const renderItems = () => {
    if (!(itemsTableBody instanceof HTMLElement)) return;
    if (!items.length) {
      itemsTableBody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:#666;">No explore cards found.</td></tr>';
      return;
    }
    itemsTableBody.innerHTML = items
      .map((item) => `
        <tr>
          <td>
            ${
              item.imageUrl
                ? `<img class="admin-product-thumb" src="${escapeHtml(normalizeAssetUrl(item.imageUrl))}" alt="${escapeHtml(item.title || "Explore card")}" />`
                : "-"
            }
          </td>
          <td>${escapeHtml(item.typeName || "-")}</td>
          <td>${escapeHtml(item.categoryName || "-")}</td>
          <td>
            <strong>${escapeHtml(item.title)}</strong>
            <div style="margin-top:0.25rem;color:#666;">${escapeHtml(item.subtitle || "-")}</div>
          </td>
          <td>
            ${
              item.linkUrl
                ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(toDisplayLink(item.linkUrl))}</a>`
                : "-"
            }
          </td>
          <td>${Number(item.sortOrder || 0)}</td>
          <td><span class="chip ${item.isActive ? "active" : "inactive"}">${item.isActive ? "Active" : "Inactive"}</span></td>
          <td>
            <div class="table-actions">
              <button class="table-btn edit" type="button" data-edit-item="${item.id}">Edit</button>
              <button class="table-btn delete" type="button" data-delete-item="${item.id}">Delete</button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  };

  const loadAll = async () => {
    const pageKey = normalizePageKey(pageFilterInput?.value || "") || "landing-home";
    const [typesResponse, itemsResponse] = await Promise.all([
      apiRequest({
        path: "/admin/explore/types",
        token,
        query: { pageKey, includeInactive: true },
      }),
      apiRequest({
        path: "/admin/explore/items",
        token,
        query: { pageKey, includeInactive: true },
      }),
    ]);
    types = Array.isArray(typesResponse?.types) ? typesResponse.types : [];
    items = Array.isArray(itemsResponse?.items) ? itemsResponse.items : [];
    renderTypeOptions();
    renderTypes();
    renderItems();
    if (!itemIdInput?.value) resetItemForm();
  };

  const typePayloadFromForm = () => ({
    pageKey: normalizePageKey(typePageKeyInput?.value || ""),
    name: typeNameInput?.value?.trim() || "",
    description: typeDescriptionInput?.value?.trim() || undefined,
    iconUrl: typeIconUrlInput?.value?.trim() || undefined,
    sortOrder: typeSortOrderInput?.value ? Number(typeSortOrderInput.value) : 0,
    isActive: Boolean(typeIsActiveInput?.checked),
  });

  const itemPayloadFromForm = () => ({
    typeId: itemTypeIdInput?.value || "",
    categoryName: itemCategoryNameInput?.value?.trim() || undefined,
    title: itemTitleInput?.value?.trim() || "",
    subtitle: itemSubtitleInput?.value?.trim() || undefined,
    imageUrl: itemImageUrlInput?.value?.trim() || undefined,
    linkUrl: itemLinkUrlInput?.value?.trim() || undefined,
    sortOrder: itemSortOrderInput?.value ? Number(itemSortOrderInput.value) : 0,
    isActive: Boolean(itemIsActiveInput?.checked),
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  if (typeIconUrlInput) {
    typeIconUrlInput.addEventListener("input", () => setImagePreview(typeIconPreview, typeIconUrlInput.value));
  }
  if (itemImageUrlInput) {
    itemImageUrlInput.addEventListener("input", () => setImagePreview(itemImagePreview, itemImageUrlInput.value));
  }

  if (typeIconUploadBtn) {
    typeIconUploadBtn.addEventListener("click", async () => {
      const file = typeIconFileInput?.files?.[0];
      if (!file) return setMessage("Choose a type icon first.", "error");
      try {
        typeIconUploadBtn.disabled = true;
        setMessage("Uploading type icon...");
        const imageUrl = await uploadImageFile(file);
        if (typeIconUrlInput) typeIconUrlInput.value = imageUrl;
        setImagePreview(typeIconPreview, imageUrl);
        setMessage("Type icon uploaded.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to upload type icon.", "error");
      } finally {
        typeIconUploadBtn.disabled = false;
      }
    });
  }

  if (itemImageUploadBtn) {
    itemImageUploadBtn.addEventListener("click", async () => {
      const file = itemImageFileInput?.files?.[0];
      if (!file) return setMessage("Choose a card image first.", "error");
      try {
        itemImageUploadBtn.disabled = true;
        setMessage("Uploading card image...");
        const imageUrl = await uploadImageFile(file);
        if (itemImageUrlInput) itemImageUrlInput.value = imageUrl;
        setImagePreview(itemImagePreview, imageUrl);
        setMessage("Card image uploaded.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to upload card image.", "error");
      } finally {
        itemImageUploadBtn.disabled = false;
      }
    });
  }

  if (typeForm) {
    typeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = typePayloadFromForm();
      if (!payload.pageKey || !payload.name) {
        setMessage("Page key and type name are required.", "error");
        return;
      }
      try {
        typeSubmitBtn.disabled = true;
        setMessage(typeIdInput?.value ? "Updating type..." : "Creating type...");
        await apiRequest({
          path: typeIdInput?.value ? `/admin/explore/types/${typeIdInput.value}` : "/admin/explore/types",
          method: typeIdInput?.value ? "PATCH" : "POST",
          token,
          body: payload,
        });
        resetTypeForm();
        await loadAll();
        setMessage("Explore type saved successfully.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to save explore type.", "error");
      } finally {
        typeSubmitBtn.disabled = false;
      }
    });
  }

  if (itemForm) {
    itemForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = itemPayloadFromForm();
      if (!payload.typeId || !payload.title) {
        setMessage("Type and card title are required.", "error");
        return;
      }
      try {
        itemSubmitBtn.disabled = true;
        setMessage(itemIdInput?.value ? "Updating card..." : "Creating card...");
        await apiRequest({
          path: itemIdInput?.value ? `/admin/explore/items/${itemIdInput.value}` : "/admin/explore/items",
          method: itemIdInput?.value ? "PATCH" : "POST",
          token,
          body: payload,
        });
        resetItemForm();
        await loadAll();
        setMessage("Explore card saved successfully.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to save explore card.", "error");
      } finally {
        itemSubmitBtn.disabled = false;
      }
    });
  }

  if (typeCancelBtn) typeCancelBtn.addEventListener("click", resetTypeForm);
  if (itemCancelBtn) itemCancelBtn.addEventListener("click", resetItemForm);
  if (reloadBtn) reloadBtn.addEventListener("click", loadAll);

  typesTableBody?.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!(button instanceof HTMLButtonElement)) return;
    const editId = button.getAttribute("data-edit-type");
    const deleteId = button.getAttribute("data-delete-type");
    if (editId) {
      const type = types.find((entry) => entry.id === editId);
      if (type) fillTypeFormForEdit(type);
      return;
    }
    if (deleteId) {
      if (!window.confirm("Delete this type and all of its cards?")) return;
      try {
        setMessage("Deleting type...");
        await apiRequest({
          path: `/admin/explore/types/${deleteId}`,
          method: "DELETE",
          token,
        });
        resetTypeForm();
        await loadAll();
        setMessage("Type deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete type.", "error");
      }
    }
  });

  itemsTableBody?.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!(button instanceof HTMLButtonElement)) return;
    const editId = button.getAttribute("data-edit-item");
    const deleteId = button.getAttribute("data-delete-item");
    if (editId) {
      const item = items.find((entry) => entry.id === editId);
      if (item) fillItemFormForEdit(item);
      return;
    }
    if (deleteId) {
      if (!window.confirm("Delete this explore card?")) return;
      try {
        setMessage("Deleting card...");
        await apiRequest({
          path: `/admin/explore/items/${deleteId}`,
          method: "DELETE",
          token,
        });
        resetItemForm();
        await loadAll();
        setMessage("Card deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete card.", "error");
      }
    }
  });

  resetTypeForm();
  await loadAll();
});
