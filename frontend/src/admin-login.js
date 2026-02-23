document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("#adminLoginForm");
  const mobileInput = document.querySelector("#adminMobile");
  const passwordInput = document.querySelector("#adminPassword");
  const messageEl = document.querySelector("#adminLoginMessage");

  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0";
  const API_BASE = isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "";

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
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

  const goAdminPanel = async () => {
    const adminPath = await resolvePagePath(
      ["/admin", "./admin.html", "/admin.html", "./frontend/admin.html"],
      "Admin Panel"
    );
    window.location.href = adminPath;
  };

  const clearAuth = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    sessionStorage.removeItem("cc_token");
    sessionStorage.removeItem("cc_user");
  };

  try {
    const token = localStorage.getItem("cc_token");
    const localUser = JSON.parse(localStorage.getItem("cc_user") || "null");
    if (token && localUser?.role === "ADMIN") {
      try {
        const verifyRes = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const verifyType = verifyRes.headers.get("content-type") || "";
        const verifyPayload = verifyType.includes("application/json") ? await verifyRes.json() : {};
        if (verifyRes.ok && String(verifyPayload?.user?.role || "") === "ADMIN") {
          await goAdminPanel();
          return;
        }
        clearAuth();
      } catch {
        clearAuth();
      }
    }
  } catch {
    clearAuth();
  }

  if (!form || !mobileInput || !passwordInput) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const mobile = mobileInput.value.trim();
    const password = passwordInput.value;

    if (!/^\d{10,15}$/.test(mobile)) {
      setMessage("Enter valid mobile number (10-15 digits).", "error");
      return;
    }

    if (!password) {
      setMessage("Password is required.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message || "Login failed.", "error");
        return;
      }

      if (!data?.user || data.user.role !== "ADMIN") {
        clearAuth();
        setMessage("This login is only for admin users.", "error");
        return;
      }

      localStorage.setItem("cc_token", data.token);
      localStorage.setItem("cc_user", JSON.stringify(data.user));
      await goAdminPanel();
    } catch {
      setMessage("Unable to login. Please check backend and try again.", "error");
    }
  });
});
