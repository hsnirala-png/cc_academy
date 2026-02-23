const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "0.0.0.0";

const API_BASE = isLocalHost ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
const FALLBACK_THUMB = "./public/PSTET_1.png";

const toCurrency = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;
const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAssetUrl = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return FALLBACK_THUMB;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("/")) return raw;
  return `./${raw}`;
};

const getDiscountPercentForProduct = (product) => {
  const configured = Math.max(0, Math.round(toSafeNumber(product?.discountPercent || 0)));
  if (configured > 0) return configured;
  const listPrice = toSafeNumber(product?.listPrice);
  const salePrice = toSafeNumber(product?.salePrice);
  if (listPrice <= 0 || salePrice <= 0 || salePrice >= listPrice) return 0;
  return Math.max(0, Math.round(((listPrice - salePrice) / listPrice) * 100));
};

document.addEventListener("DOMContentLoaded", async () => {
  const openLoginBtn = document.querySelector("#openLoginTop");
  const referEarnBtn = document.querySelector("#referEarnBtn");
  const headerCourseSelect = document.querySelector("#headerCourseSelectCheckout");
  const menuToggle = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelectorAll(".nav-links a");
  const checkoutMessage = document.querySelector("#checkoutMessage");
  const checkoutProductThumb = document.querySelector("#checkoutProductThumb");
  const checkoutProductTitle = document.querySelector("#checkoutProductTitle");
  const checkoutProductValidity = document.querySelector("#checkoutProductValidity");
  const checkoutProductCurrent = document.querySelector("#checkoutProductCurrent");
  const checkoutStudentName = document.querySelector("#checkoutStudentName");
  const checkoutStudentMobile = document.querySelector("#checkoutStudentMobile");
  const checkoutStudentEmail = document.querySelector("#checkoutStudentEmail");
  const checkoutPaymentMethods = document.querySelector("#checkoutPaymentMethods");
  const checkoutCouponText = document.querySelector("#checkoutCouponText");
  const checkoutCouponToggle = document.querySelector("#checkoutCouponToggle");
  const checkoutCouponHelp = document.querySelector("#checkoutCouponHelp");
  const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
  const checkoutCouponDiscount = document.querySelector("#checkoutCouponDiscount");
  const checkoutFriendDiscount = document.querySelector("#checkoutFriendDiscount");
  const checkoutToPay = document.querySelector("#checkoutToPay");
  const checkoutPayNowBtn = document.querySelector("#checkoutPayNowBtn");

  if (
    !(checkoutMessage instanceof HTMLElement) ||
    !(checkoutProductThumb instanceof HTMLImageElement) ||
    !(checkoutProductTitle instanceof HTMLElement) ||
    !(checkoutProductValidity instanceof HTMLElement) ||
    !(checkoutProductCurrent instanceof HTMLElement) ||
    !(checkoutStudentName instanceof HTMLElement) ||
    !(checkoutStudentMobile instanceof HTMLElement) ||
    !(checkoutStudentEmail instanceof HTMLElement) ||
    !(checkoutPaymentMethods instanceof HTMLElement) ||
    !(checkoutCouponText instanceof HTMLElement) ||
    !(checkoutCouponToggle instanceof HTMLButtonElement) ||
    !(checkoutCouponHelp instanceof HTMLElement) ||
    !(checkoutSubtotal instanceof HTMLElement) ||
    !(checkoutCouponDiscount instanceof HTMLElement) ||
    !(checkoutFriendDiscount instanceof HTMLElement) ||
    !(checkoutToPay instanceof HTMLElement) ||
    !(checkoutPayNowBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("cc_user") || "null");
    } catch {
      return null;
    }
  })();
  const token = localStorage.getItem("cc_token");
  const isStudentLoggedIn = Boolean(token && storedUser?.role === "STUDENT");
  if (!isStudentLoggedIn) {
    window.location.href = "./index.html?auth=login";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const productId = String(params.get("productId") || "").trim();
  if (!productId) {
    window.location.href = "./products.html";
    return;
  }

  const state = {
    productId,
    product: null,
    includeDefaultOffer: String(params.get("includeDefaultOffer") || "1").toLowerCase() !== "0",
    referralCode: String(params.get("referralCode") || "").trim().toUpperCase(),
    pricing: null,
    busy: false,
  };

  const setMessage = (text, type = "") => {
    checkoutMessage.textContent = String(text || "");
    checkoutMessage.classList.remove("error", "success");
    if (type) checkoutMessage.classList.add(type);
  };

  const setBusy = (busy) => {
    state.busy = Boolean(busy);
    checkoutCouponToggle.disabled = state.busy;
    checkoutPayNowBtn.disabled = state.busy;
    checkoutPayNowBtn.textContent = state.busy ? "Processing..." : "Pay Now";
  };

  const fetchProducts = async () => {
    const response = await fetch(`${API_BASE}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to load product.");
    }
    const rows = Array.isArray(payload?.products) ? payload.products : [];
    const item = rows.find((row) => String(row?.id || "").trim() === state.productId) || null;
    if (!item) throw new Error("Product not found.");
    state.product = item;
  };

  const fetchPreview = async () => {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(state.productId)}/checkout-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer: state.includeDefaultOffer,
        referralCode: state.referralCode || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to load price details.");
    }
    state.pricing = payload?.pricing || null;
    state.referralCode = String(payload?.offers?.appliedReferralCode || "").trim();
  };

  const createPaymentOrder = async (amountRupees) => {
    const response = await fetch(`${API_BASE}/api/payment/order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountRupees }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to create payment order.");
    }
    if (!payload?.orderId || !payload?.amount || !payload?.currency || !payload?.key) {
      throw new Error("Invalid payment order response.");
    }
    return payload;
  };

  const verifyPaymentSignature = async (signaturePayload) => {
    const response = await fetch(`${API_BASE}/api/payment/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signaturePayload),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      throw new Error(payload?.message || "Payment verification failed.");
    }
    return payload;
  };

  const finalizeProductPurchase = async () => {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(state.productId)}/buy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        includeDefaultOffer: state.includeDefaultOffer,
        referralCode: state.referralCode || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to complete purchase.");
    }
    return payload;
  };

  const openRazorpayCheckout = (orderPayload) =>
    new Promise((resolve, reject) => {
      const RazorpayCtor = window.Razorpay;
      if (typeof RazorpayCtor !== "function") {
        reject(new Error("Razorpay SDK failed to load."));
        return;
      }

      let settled = false;

      const options = {
        key: String(orderPayload.key),
        amount: Number(orderPayload.amount),
        currency: String(orderPayload.currency || "INR"),
        name: "CC Academy",
        description: String(state.product?.title || "Course Purchase"),
        order_id: String(orderPayload.orderId),
        prefill: {
          name: String(storedUser?.name || ""),
          contact: String(storedUser?.mobile || ""),
          email: String(storedUser?.email || ""),
        },
        notes: {
          productId: String(state.productId || ""),
          referralCode: String(state.referralCode || ""),
        },
        theme: {
          color: "#0f53bd",
        },
        modal: {
          ondismiss: () => {
            if (settled) return;
            settled = true;
            reject(new Error("Payment cancelled."));
          },
        },
        handler: (response) => {
          if (settled) return;
          settled = true;
          resolve(response);
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on("payment.failed", () => {
        if (settled) return;
        settled = true;
        reject(new Error("Payment failed. Please try again."));
      });
      rzp.open();
    });

  const render = () => {
    const product = state.product || {};
    const pricing = state.pricing || {};
    const discountPercent = getDiscountPercentForProduct(product);
    const couponCode = `CC${discountPercent}`;
    const listPrice = toSafeNumber(pricing.listPrice || product.listPrice);
    const currentPrice = toSafeNumber(pricing.currentPrice || product.salePrice || product.listPrice);
    const couponDiscount = toSafeNumber(pricing.defaultOfferDiscount);
    const friendDiscount = toSafeNumber(pricing.friendDiscountApplied);
    const toPay = toSafeNumber(pricing.payableAmount || currentPrice);

    checkoutProductThumb.src = normalizeAssetUrl(product.thumbnailUrl);
    checkoutProductThumb.onerror = () => {
      checkoutProductThumb.onerror = null;
      checkoutProductThumb.src = FALLBACK_THUMB;
    };
    checkoutProductTitle.textContent = String(product.title || "Product");
    checkoutProductValidity.textContent = String(product.validityLabel || `${Number(product.accessDays || 0)} days access`);
    checkoutProductCurrent.textContent = toCurrency(currentPrice);

    checkoutStudentName.textContent = `Name: ${String(storedUser?.name || "--")}`;
    checkoutStudentMobile.textContent = `Contact Number: ${String(storedUser?.mobile || "--")}`;
    checkoutStudentEmail.textContent = `Email: ${String(storedUser?.email || "--")}`;

    if (state.includeDefaultOffer && discountPercent > 0) {
      checkoutCouponText.textContent = `${toCurrency(couponDiscount)} saved with ${couponCode}`;
      checkoutCouponToggle.textContent = "REMOVE";
      checkoutCouponHelp.textContent = "Coupon applied";
    } else {
      checkoutCouponText.textContent = "Coupon not applied";
      checkoutCouponToggle.textContent = "APPLY";
      checkoutCouponHelp.textContent = "Apply coupon to get product discount";
    }

    checkoutSubtotal.textContent = toCurrency(listPrice);
    checkoutCouponDiscount.textContent = `- ${toCurrency(couponDiscount)}`;
    checkoutFriendDiscount.textContent = `- ${toCurrency(friendDiscount)}`;
    checkoutToPay.textContent = toCurrency(toPay);
  };

  const refreshPricing = async () => {
    setBusy(true);
    try {
      await fetchPreview();
      render();
    } finally {
      setBusy(false);
    }
  };

  checkoutCouponToggle.addEventListener("click", async () => {
    if (state.busy) return;
    state.includeDefaultOffer = !state.includeDefaultOffer;
    try {
      await refreshPricing();
      setMessage("");
    } catch (error) {
      state.includeDefaultOffer = !state.includeDefaultOffer;
      const message = error instanceof Error ? error.message : "Unable to update coupon.";
      setMessage(message, "error");
    }
  });

  checkoutPaymentMethods.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name !== "paymentMethod") return;
    checkoutPaymentMethods.querySelectorAll(".checkout-method").forEach((node) => {
      node.classList.remove("is-active");
    });
    const label = target.closest(".checkout-method");
    if (label instanceof HTMLElement) label.classList.add("is-active");
  });

  checkoutPayNowBtn.addEventListener("click", async () => {
    if (state.busy) return;
    setBusy(true);
    try {
      const amountToPay = toSafeNumber(state.pricing?.payableAmount);
      if (amountToPay <= 0) {
        await finalizeProductPurchase();
        setMessage("Purchase successful. Payment not required.", "success");
        window.setTimeout(() => {
          window.location.href = "./products.html";
        }, 1200);
        return;
      }

      const orderPayload = await createPaymentOrder(amountToPay);
      const paymentResponse = await openRazorpayCheckout(orderPayload);
      if (!paymentResponse || typeof paymentResponse !== "object") {
        throw new Error("Payment response is invalid.");
      }

      await verifyPaymentSignature({
        razorpay_order_id: String(paymentResponse.razorpay_order_id || ""),
        razorpay_payment_id: String(paymentResponse.razorpay_payment_id || ""),
        razorpay_signature: String(paymentResponse.razorpay_signature || ""),
      });

      await finalizeProductPurchase();
      setMessage("Payment successful. Purchase completed.", "success");
      window.setTimeout(() => {
        window.location.href = "./products.html";
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete payment.";
      setMessage(message, "error");
    } finally {
      setBusy(false);
    }
  });

  if (openLoginBtn instanceof HTMLButtonElement) {
    openLoginBtn.addEventListener("click", () => {
      window.location.href = "./index.html?auth=login";
    });
  }
  if (referEarnBtn instanceof HTMLButtonElement) {
    referEarnBtn.addEventListener("click", () => {
      window.location.href = "./refer-earn.html";
    });
  }
  if (headerCourseSelect instanceof HTMLSelectElement) {
    headerCourseSelect.addEventListener("change", () => {
      if (headerCourseSelect.value === "products") {
        window.location.href = "./products.html";
      } else if (headerCourseSelect.value === "mock-tests") {
        window.location.href = "./mock-tests.html";
      } else {
        window.location.href = "./index.html#home";
      }
    });
  }
  if (menuToggle instanceof HTMLButtonElement && header instanceof HTMLElement) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (header instanceof HTMLElement) {
        header.classList.remove("menu-open");
      }
      if (menuToggle instanceof HTMLButtonElement) {
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  try {
    setMessage("Loading checkout...");
    await fetchProducts();
    await fetchPreview();
    render();
    setMessage("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load checkout.";
    setMessage(message, "error");
  }
});
