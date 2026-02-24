import { apiRequest, clearAuth, escapeHtml, requireRoleGuard, requireRoleGuardStrict } from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;

  const messageEl = document.querySelector("#adminSlidersMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const form = document.querySelector("#sliderForm");
  const sliderIdInput = document.querySelector("#sliderId");
  const pageKeyInput = document.querySelector("#sliderPageKey");
  const titleInput = document.querySelector("#sliderTitle");
  const imageUrlInput = document.querySelector("#sliderImageUrl");
  const linkUrlInput = document.querySelector("#sliderLinkUrl");
  const sortOrderInput = document.querySelector("#sliderSortOrder");
  const isActiveInput = document.querySelector("#sliderIsActive");
  const imageFileInput = document.querySelector("#sliderImageFile");
  const uploadImageBtn = document.querySelector("#uploadSliderImageBtn");
  const bulkCreateBtn = document.querySelector("#sliderBulkCreateBtn");
  const imagePreview = document.querySelector("#sliderImagePreview");
  const submitBtn = document.querySelector("#sliderSubmitBtn");
  const cancelBtn = document.querySelector("#sliderCancelBtn");
  const reloadBtn = document.querySelector("#reloadSlidersBtn");
  const pageFilterInput = document.querySelector("#slidersPageFilter");
  const tableBody = document.querySelector("#slidersTableBody");

  let sliders = [];
  const allowedImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  const maxImageSizeBytes = 5 * 1024 * 1024;

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
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
    if (text.length <= 50) return text;
    return `${text.slice(0, 47)}...`;
  };

  const setImagePreview = (src) => {
    if (!(imagePreview instanceof HTMLImageElement)) return;
    const value = normalizeAssetUrl(src);
    if (!value) {
      imagePreview.classList.add("hidden");
      imagePreview.removeAttribute("src");
      return;
    }
    imagePreview.src = value;
    imagePreview.classList.remove("hidden");
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

  const uploadSliderImageFile = async (file) => {
    validateImageFile(file);
    const dataUrl = await fileToDataUrl(file);
    const data = await apiRequest({
      path: "/admin/sliders/image-upload",
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

  const payloadFromForm = () => ({
    pageKey: normalizePageKey(pageKeyInput?.value || ""),
    title: titleInput?.value?.trim() || undefined,
    imageUrl: imageUrlInput?.value?.trim() || "",
    linkUrl: linkUrlInput?.value?.trim() || undefined,
    sortOrder: sortOrderInput?.value ? Number(sortOrderInput.value) : 0,
    isActive: Boolean(isActiveInput?.checked),
  });

  const resetForm = () => {
    form?.reset();
    if (sliderIdInput) sliderIdInput.value = "";
    if (sortOrderInput) sortOrderInput.value = "0";
    if (isActiveInput) isActiveInput.checked = true;
    if (submitBtn) submitBtn.textContent = "Create Slider";
    if (cancelBtn) cancelBtn.classList.add("hidden");
    setImagePreview("");
  };

  const fillFormForEdit = (slider) => {
    if (sliderIdInput) sliderIdInput.value = slider.id;
    if (pageKeyInput) pageKeyInput.value = slider.pageKey || "";
    if (titleInput) titleInput.value = slider.title || "";
    if (imageUrlInput) imageUrlInput.value = slider.imageUrl || "";
    if (linkUrlInput) linkUrlInput.value = slider.linkUrl || "";
    if (sortOrderInput) sortOrderInput.value = String(slider.sortOrder ?? 0);
    if (isActiveInput) isActiveInput.checked = Boolean(slider.isActive);
    if (submitBtn) submitBtn.textContent = "Update Slider";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    setImagePreview(slider.imageUrl || "");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderSliders = () => {
    if (!tableBody) return;
    if (!sliders.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#666;">No sliders found.</td></tr>';
      return;
    }

    tableBody.innerHTML = sliders
      .map((slider) => {
        const imageSrc = normalizeAssetUrl(slider.imageUrl);
        return `
          <tr>
            <td>
              <img
                class="admin-product-thumb"
                src="${escapeHtml(imageSrc)}"
                alt="${escapeHtml(slider.title || slider.pageKey || "Slider image")}"
                onerror="this.onerror=null;this.src='./public/PSTET_1.png';"
              />
            </td>
            <td>${escapeHtml(slider.pageKey || "-")}</td>
            <td>${escapeHtml(slider.title || "-")}</td>
            <td>
              ${
                slider.linkUrl
                  ? `<a href="${escapeHtml(slider.linkUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                      toDisplayLink(slider.linkUrl)
                    )}</a>`
                  : "-"
              }
            </td>
            <td>${Number(slider.sortOrder || 0)}</td>
            <td><span class="chip ${slider.isActive ? "active" : "inactive"}">${
          slider.isActive ? "Active" : "Inactive"
        }</span></td>
            <td>
              <div class="table-actions">
                <button class="table-btn edit" type="button" data-edit-slider="${slider.id}">Edit</button>
                <button
                  class="table-btn"
                  type="button"
                  data-toggle-slider="${slider.id}"
                  data-next-active="${slider.isActive ? "false" : "true"}"
                >
                  ${slider.isActive ? "Deactivate" : "Activate"}
                </button>
                <button class="table-btn delete" type="button" data-delete-slider="${slider.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const loadSliders = async () => {
    const pageKey = normalizePageKey(pageFilterInput?.value || "");
    const data = await apiRequest({
      path: "/admin/sliders",
      token,
      query: {
        includeInactive: true,
        pageKey: pageKey || undefined,
      },
    });
    sliders = Array.isArray(data.sliders) ? data.sliders : [];
    renderSliders();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goAdminLogin();
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener("input", () => setImagePreview(imageUrlInput.value));
  }

  if (uploadImageBtn) {
    uploadImageBtn.addEventListener("click", async () => {
      if (!(imageFileInput instanceof HTMLInputElement)) return;
      const file = imageFileInput.files?.[0];
      if (!file) {
        setMessage("Choose an image file first.", "error");
        return;
      }

      try {
        uploadImageBtn.disabled = true;
        setMessage("Uploading image...");
        const imageUrl = await uploadSliderImageFile(file);
        if (imageUrlInput) {
          imageUrlInput.value = imageUrl;
          setImagePreview(imageUrl);
        }
        setMessage("Image uploaded successfully.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to upload image.", "error");
      } finally {
        uploadImageBtn.disabled = false;
      }
    });
  }

  if (bulkCreateBtn) {
    bulkCreateBtn.addEventListener("click", async () => {
      if (!(imageFileInput instanceof HTMLInputElement)) return;
      const sliderId = sliderIdInput?.value || "";
      if (sliderId) {
        setMessage("Bulk create is available only in create mode. Click Cancel Edit first.", "error");
        return;
      }

      const files = Array.from(imageFileInput.files || []);
      if (!files.length) {
        setMessage("Select one or more image files to create sliders.", "error");
        return;
      }

      const payload = payloadFromForm();
      if (!payload.pageKey) {
        setMessage("Page key is required.", "error");
        return;
      }
      if (!Number.isFinite(payload.sortOrder) || payload.sortOrder < 0) {
        setMessage("Order must be zero or greater.", "error");
        return;
      }

      const firstOrder = Number(payload.sortOrder || 0);
      try {
        bulkCreateBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (uploadImageBtn) uploadImageBtn.disabled = true;

        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          setMessage(`Uploading image ${index + 1}/${files.length}...`);
          const uploadedImageUrl = await uploadSliderImageFile(file);
          await apiRequest({
            path: "/admin/sliders",
            method: "POST",
            token,
            body: {
              pageKey: payload.pageKey,
              title: payload.title,
              imageUrl: uploadedImageUrl,
              linkUrl: payload.linkUrl,
              sortOrder: firstOrder + index,
              isActive: payload.isActive,
            },
          });
        }

        resetForm();
        await loadSliders();
        setMessage(`${files.length} slider${files.length > 1 ? "s" : ""} created successfully.`, "success");
      } catch (error) {
        setMessage(error.message || "Unable to bulk create sliders.", "error");
      } finally {
        bulkCreateBtn.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        if (uploadImageBtn) uploadImageBtn.disabled = false;
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("");

      const payload = payloadFromForm();
      if (!payload.pageKey || !payload.imageUrl) {
        setMessage("Page key and image URL are required.", "error");
        return;
      }
      if (!Number.isFinite(payload.sortOrder) || payload.sortOrder < 0) {
        setMessage("Order must be zero or greater.", "error");
        return;
      }

      try {
        const id = sliderIdInput?.value || "";
        if (id) {
          await apiRequest({
            path: `/admin/sliders/${id}`,
            method: "PATCH",
            token,
            body: payload,
          });
          setMessage("Slider updated.", "success");
        } else {
          await apiRequest({
            path: "/admin/sliders",
            method: "POST",
            token,
            body: payload,
          });
          setMessage("Slider created.", "success");
        }

        resetForm();
        await loadSliders();
      } catch (error) {
        setMessage(error.message || "Unable to save slider.", "error");
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
        setMessage("Reloading sliders...");
        await loadSliders();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load sliders.", "error");
      }
    });
  }

  if (pageFilterInput) {
    const applyFilter = async () => {
      try {
        await loadSliders();
      } catch (error) {
        setMessage(error.message || "Unable to apply filter.", "error");
      }
    };
    pageFilterInput.addEventListener("change", applyFilter);
    pageFilterInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void applyFilter();
    });
  }

  if (tableBody) {
    tableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-slider");
      if (editId) {
        const slider = sliders.find((item) => item.id === editId);
        if (slider) fillFormForEdit(slider);
        return;
      }

      const toggleId = target.getAttribute("data-toggle-slider");
      if (toggleId) {
        const nextActive = target.getAttribute("data-next-active") === "true";
        try {
          await apiRequest({
            path: `/admin/sliders/${toggleId}`,
            method: "PATCH",
            token,
            body: { isActive: nextActive },
          });
          await loadSliders();
          setMessage("Slider status updated.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to update slider status.", "error");
        }
        return;
      }

      const deleteId = target.getAttribute("data-delete-slider");
      if (!deleteId) return;
      const confirmed = window.confirm("Delete this slider?");
      if (!confirmed) return;

      try {
        await apiRequest({
          path: `/admin/sliders/${deleteId}`,
          method: "DELETE",
          token,
        });
        await loadSliders();
        setMessage("Slider deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete slider.", "error");
      }
    });
  }

  try {
    setMessage("Loading sliders...");
    await loadSliders();
    setMessage("");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      goAdminLogin();
      return;
    }
    setMessage(error.message || "Unable to load sliders.", "error");
  }
});

