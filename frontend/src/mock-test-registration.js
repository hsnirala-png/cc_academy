import {
  apiRequest,
  clearAuth,
  requireRoleGuard,
} from "./mock-api.js?v=2";

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/mock-test-registration");
  const candidates = prefersExtensionless
    ? ["./mock-attempt", "./mock-attempt.html"]
    : ["./mock-attempt.html", "./mock-attempt"];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (response.ok) return candidate;
    } catch {
      // continue
    }
  }
  return candidates[0];
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token, user } = auth;

  const mockTestId = String(new URLSearchParams(window.location.search).get("mockTestId") || "").trim();

  const statusEl = document.querySelector("#registrationStatus");
  const titleEl = document.querySelector("#registrationTitle");
  const descriptionEl = document.querySelector("#registrationDescription");
  const attemptsInfoEl = document.querySelector("#registrationAttemptsInfo");
  const bannerWrap = document.querySelector("#registrationBannerWrap");
  const bannerImage = document.querySelector("#registrationBannerImage");
  const form = document.querySelector("#registrationForm");
  const fullNameInput = document.querySelector("#regFullName");
  const mobileInput = document.querySelector("#regMobile");
  const emailInput = document.querySelector("#regEmail");
  const startAttemptBtn = document.querySelector("#startAttemptBtn");
  const buyMockBtn = document.querySelector("#buyMockBtn");

  let registration = null;

  const setStatus = (text, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const renderRegistration = () => {
    if (!registration) return;
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = registration.title || "Mock Registration";
    }
    if (descriptionEl instanceof HTMLElement) {
      descriptionEl.textContent = registration.description || "";
    }
    if (attemptsInfoEl instanceof HTMLElement) {
      if (registration.hasPaidAccess) {
        attemptsInfoEl.textContent = "You already have paid access. Unlimited attempts available.";
      } else {
        attemptsInfoEl.textContent = `Free chances: ${registration.freeAttemptLimit} | Used: ${registration.usedAttempts} | Remaining: ${registration.remainingAttempts}`;
      }
    }
    if (bannerWrap instanceof HTMLElement && bannerImage instanceof HTMLImageElement) {
      const imageUrl = String(registration.popupImageUrl || "").trim();
      if (imageUrl) {
        bannerImage.src = imageUrl;
        bannerWrap.classList.remove("hidden");
      } else {
        bannerWrap.classList.add("hidden");
      }
    }
    if (startAttemptBtn instanceof HTMLButtonElement) {
      startAttemptBtn.disabled = !registration.isRegistered;
    }
  };

  const loadRegistration = async () => {
    const data = await apiRequest({
      path: `/student/mock-tests/${encodeURIComponent(mockTestId)}/registration`,
      token,
    });
    registration = data?.registration || null;
    if (!registration) {
      throw new Error("Registration is not enabled for this mock test.");
    }
    renderRegistration();
  };

  const startAttempt = async () => {
    const data = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId },
    });
    const attemptId = String(data?.attempt?.id || "").trim();
    if (!attemptId) throw new Error("Unable to start attempt.");
    const attemptPagePath = await resolveAttemptPagePath();
    const sep = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${sep}attemptId=${encodeURIComponent(attemptId)}`;
  };

  if (fullNameInput instanceof HTMLInputElement) {
    fullNameInput.value = String(user?.name || "").trim();
  }
  if (mobileInput instanceof HTMLInputElement) {
    mobileInput.value = String(user?.mobile || "").trim();
  }
  if (emailInput instanceof HTMLInputElement) {
    emailInput.value = String(user?.email || "").trim();
  }

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setStatus("Saving registration...");
        await apiRequest({
          path: `/student/mock-tests/${encodeURIComponent(mockTestId)}/register`,
          method: "POST",
          token,
          body: {
            fullName: String(fullNameInput?.value || "").trim(),
            mobile: String(mobileInput?.value || "").trim(),
            email: String(emailInput?.value || "").trim() || undefined,
          },
        });
        await loadRegistration();
        setStatus("Registration saved. You can now start attempt.", "success");
      } catch (error) {
        setStatus(error?.message || "Unable to save registration.", "error");
      }
    });
  }

  if (startAttemptBtn instanceof HTMLButtonElement) {
    startAttemptBtn.addEventListener("click", async () => {
      try {
        setStatus("Starting attempt...");
        await startAttempt();
      } catch (error) {
        const payload = error?.payload || {};
        const errorCode = String(payload?.code || "").trim();
        if (error?.status === 401 || error?.status === 403) {
          if (errorCode === "MOCK_REG_REQUIRED") {
            setStatus("Please complete registration first.", "error");
            return;
          }
        }
        if (error?.status === 402 || errorCode === "MOCK_ATTEMPTS_EXHAUSTED") {
          const buyNowUrl = String(payload?.details?.buyNowUrl || "").trim();
          if (buyNowUrl) {
            window.location.href = buyNowUrl;
            return;
          }
          setStatus(error?.message || "Free attempts exhausted. Please buy mock.", "error");
          return;
        }
        setStatus(error?.message || "Unable to start attempt.", "error");
      }
    });
  }

  if (buyMockBtn instanceof HTMLButtonElement) {
    buyMockBtn.addEventListener("click", () => {
      const url = String(registration?.buyNowUrl || "").trim();
      if (url) {
        window.location.href = url;
        return;
      }
      window.location.href = "./products.html";
    });
  }

  if (!mockTestId) {
    setStatus("Missing mockTestId in page link.", "error");
    return;
  }

  try {
    setStatus("Loading registration details...");
    await loadRegistration();
    setStatus("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error?.message || "Unable to load registration details.", "error");
  }
});
