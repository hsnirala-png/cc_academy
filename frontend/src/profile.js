document.addEventListener("DOMContentLoaded", async () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelectorAll(".nav-links a");
  const homeTopLink = document.querySelector("#homeTopLink");
  const logoutBtn = document.querySelector("#logoutBtn");
  const profileForm = document.querySelector("#profileForm");
  const editBtn = document.querySelector("#editProfileBtn");
  const saveBtn = document.querySelector("#saveProfileBtn");
  const messageEl = document.querySelector("#profileMessage");
  const avatarInput = document.querySelector("#avatarInput");
  const avatarPreview = document.querySelector("#avatarPreview");
  const token = localStorage.getItem("cc_token");

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

  const fields = {
    name: document.querySelector("#pName"),
    mobile: document.querySelector("#pMobile"),
    fatherName: document.querySelector("#pFatherName"),
    address1: document.querySelector("#pAddress1"),
    address2: document.querySelector("#pAddress2"),
    cityVillage: document.querySelector("#pCityVillage"),
    distt: document.querySelector("#pDistt"),
    pinCode: document.querySelector("#pPinCode"),
    state: document.querySelector("#pState"),
    city: document.querySelector("#pCity"),
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const clearAuth = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    sessionStorage.removeItem("cc_token");
    sessionStorage.removeItem("cc_user");
  };

  const goHome = () => {
    window.location.href = "./index.html";
  };

  const setEditable = (editable) => {
    Object.entries(fields).forEach(([key, input]) => {
      if (!input || key === "mobile") return;
      input.readOnly = !editable;
    });
    if (saveBtn) saveBtn.disabled = !editable;
  };

  const getProfileStoreKey = () => {
    const mobile = fields.mobile?.value || "default";
    return `cc_profile_${mobile}`;
  };

  const loadStoredProfile = () => {
    const raw = localStorage.getItem(getProfileStoreKey());
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const fillForm = (data) => {
    if (!data) return;
    Object.keys(fields).forEach((key) => {
      if (!fields[key]) return;
      if (data[key] !== undefined && data[key] !== null) {
        fields[key].value = data[key];
      }
    });
  };

  const saveProfileToStorage = () => {
    const payload = {
      name: fields.name?.value?.trim() || "",
      mobile: fields.mobile?.value?.trim() || "",
      fatherName: fields.fatherName?.value?.trim() || "",
      address1: fields.address1?.value?.trim() || "",
      address2: fields.address2?.value?.trim() || "",
      cityVillage: fields.cityVillage?.value?.trim() || "",
      distt: fields.distt?.value?.trim() || "",
      pinCode: fields.pinCode?.value?.trim() || "",
      state: fields.state?.value?.trim() || "",
      city: fields.city?.value?.trim() || "",
      avatarDataUrl: avatarPreview?.src || "",
    };
    localStorage.setItem(getProfileStoreKey(), JSON.stringify(payload));
  };

  if (!token) {
    setMessage("Please login first.", "error");
    setTimeout(goHome, 700);
    return;
  }

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

  if (menuToggle && header) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (header) header.classList.remove("menu-open");
      if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    });
  });

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
      window.location.href = dashboardPath;
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      goHome();
    });
  }

  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : {};
    if (response.status === 401 || response.status === 403) {
      clearAuth();
      setMessage("Session expired. Please login again.", "error");
      setTimeout(goHome, 900);
      return;
    }
    if (!response.ok || !data.user) {
      setMessage(data?.message || "Unable to load profile.", "error");
      return;
    }

    fillForm({
      name: data.user.name || "",
      mobile: data.user.mobile || "",
      state: data.user.state || "",
      city: data.user.city || "",
    });

    const stored = loadStoredProfile();
    if (stored) fillForm(stored);
    if (avatarPreview && stored?.avatarDataUrl) avatarPreview.src = stored.avatarDataUrl;
  } catch {
    setMessage("Unable to load profile.", "error");
  }

  if (avatarPreview && !avatarPreview.src) {
    avatarPreview.src =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='92' height='92'><rect width='100%' height='100%' fill='%23edf3ff'/><text x='50%' y='56%' font-size='28' text-anchor='middle' fill='%230f53bd'>U</text></svg>";
  }

  setEditable(false);

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      setEditable(true);
      setMessage("Edit mode enabled.", "success");
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setMessage("Please upload an image file only.", "error");
        avatarInput.value = "";
        return;
      }

      const maxSizeBytes = 150 * 1024;
      if (file.size > maxSizeBytes) {
        setMessage("Image size must be 150 KB or less.", "error");
        avatarInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (avatarPreview) {
          avatarPreview.src = String(reader.result || "");
          saveProfileToStorage();
          setMessage("Avatar uploaded successfully.", "success");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveProfileToStorage();
      setEditable(false);
      setMessage("Profile saved successfully.", "success");
    });
  }

});
