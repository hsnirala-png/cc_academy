import { apiRequest, clearAuth, escapeHtml, formatDateTime, initHeaderBehavior, requireRoleGuard } from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token } = auth;

  initHeaderBehavior();

  const logoutBtn = document.querySelector("#logoutBtn");
  const messageEl = document.querySelector("#referralMessage");
  const cardTotalFriends = document.querySelector("#cardTotalFriends");
  const cardTotalEarns = document.querySelector("#cardTotalEarns");
  const cardTotalWithdrawals = document.querySelector("#cardTotalWithdrawals");
  const cardWalletBalance = document.querySelector("#cardWalletBalance");
  const referralCodeText = document.querySelector("#referralCodeText");
  const referralLinkText = document.querySelector("#referralLinkText");
  const btnCopyReferral = document.querySelector("#btnCopyReferral");
  const btnAddBankDetail = document.querySelector("#btnAddBankDetail");
  const btnRequestWithdrawal = document.querySelector("#btnRequestWithdrawal");
  const payoutMethodsTableBody = document.querySelector("#payoutMethodsTableBody");
  const withdrawalsTableBody = document.querySelector("#withdrawalsTableBody");
  const transactionsTableBody = document.querySelector("#transactionsTableBody");
  const friendsTableBody = document.querySelector("#friendsTableBody");
  const withdrawalEligibility = document.querySelector("#withdrawalEligibility");
  const referralTabButtons = Array.from(document.querySelectorAll("[data-referral-tab-target]"));
  const referralTabPanels = Array.from(document.querySelectorAll("[data-referral-tab-panel]"));

  const bankDetailModal = document.querySelector("#bankDetailModal");
  const btnCloseBankModal = document.querySelector("#btnCloseBankModal");
  const bankDetailForm = document.querySelector("#bankDetailForm");
  const bankFormMessage = document.querySelector("#bankFormMessage");
  const btnSaveBankMethod = document.querySelector("#btnSaveBankMethod");
  const methodType = document.querySelector("#methodType");
  const bankFields = document.querySelector("#bankFields");
  const upiFields = document.querySelector("#upiFields");
  const bankName = document.querySelector("#bankName");
  const accountNo = document.querySelector("#accountNo");
  const ifsc = document.querySelector("#ifsc");
  const place = document.querySelector("#place");
  const upiId = document.querySelector("#upiId");
  const withdrawalConfirmModal = document.querySelector("#withdrawalConfirmModal");
  const btnCloseWithdrawalConfirmModal = document.querySelector("#btnCloseWithdrawalConfirmModal");
  const withdrawalConfirmDetails = document.querySelector("#withdrawalConfirmDetails");
  const withdrawalConfirmHint = document.querySelector("#withdrawalConfirmHint");
  const btnEditWithdrawalMethod = document.querySelector("#btnEditWithdrawalMethod");
  const btnConfirmWithdrawalMethod = document.querySelector("#btnConfirmWithdrawalMethod");

  const RUPEE_SYMBOL = "\u20B9";
  const toCurrency = (value) => `${RUPEE_SYMBOL}${Number(value || 0).toFixed(2)}`;
  const mobileBreakpoint = window.matchMedia("(max-width: 680px)");
  const isMobileView = () => mobileBreakpoint.matches;

  const state = {
    referral: null,
    payoutMethods: [],
    withdrawals: [],
    transactions: [],
    referredFriends: [],
  };
  let pendingMobileWithdrawalAfterMethodSave = false;
  let mobilePreviewMethodId = "";

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const setBankFormMessage = (text, type) => {
    if (!bankFormMessage) return;
    bankFormMessage.textContent = text || "";
    bankFormMessage.classList.remove("error", "success");
    if (type) bankFormMessage.classList.add(type);
  };

  const setModalOpen = (open) => {
    if (!(bankDetailModal instanceof HTMLElement)) return;
    bankDetailModal.classList.toggle("open", open);
    bankDetailModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setWithdrawalConfirmModalOpen = (open) => {
    if (!(withdrawalConfirmModal instanceof HTMLElement)) return;
    withdrawalConfirmModal.classList.toggle("open", open);
    withdrawalConfirmModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setBankSubmitLabel = (confirmMode) => {
    if (!(btnSaveBankMethod instanceof HTMLButtonElement)) return;
    btnSaveBankMethod.textContent = confirmMode ? "Confirm Details" : "Save Method";
  };

  const updateMethodFieldVisibility = () => {
    const isBank = methodType instanceof HTMLSelectElement ? methodType.value === "BANK" : true;
    if (bankFields instanceof HTMLElement) bankFields.classList.toggle("hidden", !isBank);
    if (upiFields instanceof HTMLElement) upiFields.classList.toggle("hidden", isBank);
  };

  const toMaskedAccountNo = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "-";
    if (raw.length <= 4) return raw;
    return `${"*".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
  };

  const getPreferredPayoutMethod = () =>
    state.payoutMethods.find((item) => item.isVerified) || state.payoutMethods[0] || null;

  const fillBankFormFromMethod = (method) => {
    if (!(methodType instanceof HTMLSelectElement)) return;
    if (!(bankName instanceof HTMLInputElement)) return;
    if (!(accountNo instanceof HTMLInputElement)) return;
    if (!(ifsc instanceof HTMLInputElement)) return;
    if (!(place instanceof HTMLInputElement)) return;
    if (!(upiId instanceof HTMLInputElement)) return;

    methodType.value = String(method?.type || "BANK").toUpperCase() === "UPI" ? "UPI" : "BANK";
    bankName.value = method?.bankName || "";
    accountNo.value = method?.accountNo || "";
    ifsc.value = method?.ifsc || "";
    place.value = method?.place || "";
    upiId.value = method?.upiId || "";
    updateMethodFieldVisibility();
  };

  const openBankDetailModal = ({ prefillMethod = null, confirmMode = false } = {}) => {
    setBankFormMessage("");
    setBankSubmitLabel(confirmMode);
    if (bankDetailForm instanceof HTMLFormElement) bankDetailForm.reset();
    if (prefillMethod) fillBankFormFromMethod(prefillMethod);
    else updateMethodFieldVisibility();
    setModalOpen(true);
  };

  const setActiveReferralTab = (targetId) => {
    referralTabButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isActive = String(button.getAttribute("data-referral-tab-target") || "") === targetId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    referralTabPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const isActive = panel.id === targetId;
      panel.classList.toggle("active", isActive);
    });
  };

  const runWithdrawalProcess = async () => {
    const verifiedMethod = state.payoutMethods.find((item) => item.isVerified);
    if (!verifiedMethod) {
      setMessage("Add a payout method and wait for admin verification.", "error");
      return;
    }

    const amountText = window.prompt(`Enter withdrawal amount (minimum ${RUPEE_SYMBOL}50):`, "50");
    if (!amountText) return;

    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 50) {
      setMessage(`Withdrawal amount must be ${RUPEE_SYMBOL}50 or more.`, "error");
      return;
    }

    setMessage("Submitting withdrawal request...");
    await apiRequest({
      path: "/api/referrals/withdrawals",
      method: "POST",
      token,
      body: {
        amount,
        payoutMethodId: verifiedMethod.id,
      },
    });
    setMessage("Withdrawal request submitted.", "success");
    await loadReferralData();
  };

  const renderMobilePayoutPreview = (method) => {
    if (!(withdrawalConfirmDetails instanceof HTMLElement)) return;
    const type = String(method?.type || "BANK").toUpperCase();
    if (type === "UPI") {
      withdrawalConfirmDetails.innerHTML = `
        <p><strong>Method:</strong> UPI</p>
        <p><strong>UPI ID:</strong> ${escapeHtml(method?.upiId || "-")}</p>
      `;
      return;
    }
    withdrawalConfirmDetails.innerHTML = `
      <p><strong>Method:</strong> Bank</p>
      <p><strong>Bank Name:</strong> ${escapeHtml(method?.bankName || "-")}</p>
      <p><strong>Account No:</strong> ${escapeHtml(toMaskedAccountNo(method?.accountNo))}</p>
      <p><strong>IFSC:</strong> ${escapeHtml(method?.ifsc || "-")}</p>
      <p><strong>Place:</strong> ${escapeHtml(method?.place || "-")}</p>
    `;
  };

  const openMobileWithdrawalConfirmation = () => {
    const method = getPreferredPayoutMethod();
    if (!method) {
      pendingMobileWithdrawalAfterMethodSave = true;
      openBankDetailModal({ confirmMode: true });
      return;
    }

    mobilePreviewMethodId = String(method.id || "");
    renderMobilePayoutPreview(method);
    if (withdrawalConfirmHint instanceof HTMLElement) {
      withdrawalConfirmHint.textContent = method.isVerified
        ? "Details found. Tap Confirm to continue withdrawal."
        : "Details are saved but not verified. Withdrawal can proceed only after admin verification.";
    }
    setWithdrawalConfirmModalOpen(true);
  };

  const render = () => {
    const referral = state.referral || {};

    if (cardTotalFriends) cardTotalFriends.textContent = String(referral.totalFriends || 0);
    if (cardTotalEarns) cardTotalEarns.textContent = toCurrency(referral.totalEarns || 0);
    if (cardTotalWithdrawals) cardTotalWithdrawals.textContent = toCurrency(referral.totalWithdrawals || 0);
    if (cardWalletBalance) cardWalletBalance.textContent = toCurrency(referral.walletBalance || 0);
    if (referralCodeText instanceof HTMLElement) referralCodeText.textContent = referral.referralCode || "-";
    if (referralLinkText instanceof HTMLInputElement) {
      const link = String(referral.referralLink || "").trim();
      referralLinkText.value = link;
      referralLinkText.placeholder = link || "Your referral link will appear here";
    }

    if (withdrawalEligibility) {
      const next = referral.nextWithdrawalAt ? formatDateTime(referral.nextWithdrawalAt) : "Eligible now";
      const methodNote = state.payoutMethods.some((item) => item.isVerified)
        ? "Verified payout method available."
        : "Add and verify a payout method first.";
      withdrawalEligibility.textContent = `Minimum withdrawal ${RUPEE_SYMBOL}${referral.minWithdrawalAmount || 50}. Next withdrawal: ${next}. ${methodNote}`;
    }

    if (btnRequestWithdrawal instanceof HTMLButtonElement) {
      btnRequestWithdrawal.disabled = false;
    }

    if (payoutMethodsTableBody) {
      if (!state.payoutMethods.length) {
        payoutMethodsTableBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#666;">No payout method added.</td></tr>';
      } else {
        payoutMethodsTableBody.innerHTML = state.payoutMethods
          .map((item) => {
            const detail =
              item.type === "BANK"
                ? `${escapeHtml(item.bankName || "-")} | A/C ${escapeHtml(item.accountNo || "-")} | IFSC ${escapeHtml(item.ifsc || "-")} | ${escapeHtml(item.place || "-")}`
                : escapeHtml(item.upiId || "-");
            return `
              <tr>
                <td>${escapeHtml(item.type)}</td>
                <td>${detail}</td>
                <td><span class="chip ${item.isVerified ? "active" : "inactive"}">${
              item.isVerified ? "Verified" : "Pending"
            }</span></td>
                <td>${escapeHtml(formatDateTime(item.updatedAt))}</td>
              </tr>
            `;
          })
          .join("");
      }
    }

    if (withdrawalsTableBody) {
      if (!state.withdrawals.length) {
        withdrawalsTableBody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;color:#666;">No withdrawals yet.</td></tr>';
      } else {
        withdrawalsTableBody.innerHTML = state.withdrawals
          .map(
            (item) => `
              <tr>
                <td>${toCurrency(item.amount)}</td>
                <td><span class="chip ${item.status === "APPROVED" ? "active" : item.status === "PENDING" ? "inactive" : ""}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(formatDateTime(item.requestedAt))}</td>
                <td>${escapeHtml(formatDateTime(item.reviewedAt))}</td>
                <td>${escapeHtml(item.adminNote || "-")}</td>
              </tr>
            `
          )
          .join("");
      }
    }

    if (transactionsTableBody) {
      if (!state.transactions.length) {
        transactionsTableBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#666;">No transactions yet.</td></tr>';
      } else {
        transactionsTableBody.innerHTML = state.transactions
          .map(
            (item) => `
              <tr>
                <td>${toCurrency(item.amount)}</td>
                <td>${escapeHtml(item.type)}</td>
                <td>${escapeHtml(item.description || item.productTitle || "-")}</td>
                <td>${escapeHtml(formatDateTime(item.createdAt))}</td>
              </tr>
            `
          )
          .join("");
      }
    }

    if (friendsTableBody) {
      if (!state.referredFriends.length) {
        friendsTableBody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;color:#666;">No referrals yet.</td></tr>';
      } else {
        friendsTableBody.innerHTML = state.referredFriends
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.name || "-")}</td>
                <td>${escapeHtml(item.mobile || "-")}</td>
                <td>${escapeHtml(formatDateTime(item.joinedAt))}</td>
              </tr>
            `
          )
          .join("");
      }
    }
  };

  const loadReferralData = async () => {
    const data = await apiRequest({ path: "/api/referrals/me", token });
    state.referral = data.referral || null;
    state.payoutMethods = data.payoutMethods || [];
    state.withdrawals = data.withdrawals || [];
    state.transactions = data.transactions || [];
    state.referredFriends = data.referredFriends || [];
    render();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (methodType instanceof HTMLSelectElement) {
    methodType.addEventListener("change", updateMethodFieldVisibility);
  }

  if (btnAddBankDetail) {
    btnAddBankDetail.addEventListener("click", () => {
      pendingMobileWithdrawalAfterMethodSave = false;
      openBankDetailModal({ confirmMode: false });
    });
  }

  if (btnCloseBankModal) {
    btnCloseBankModal.addEventListener("click", () => {
      pendingMobileWithdrawalAfterMethodSave = false;
      setModalOpen(false);
      setBankSubmitLabel(false);
    });
  }

  if (bankDetailModal instanceof HTMLElement) {
    bankDetailModal.addEventListener("click", (event) => {
      if (event.target === bankDetailModal) {
        pendingMobileWithdrawalAfterMethodSave = false;
        setModalOpen(false);
        setBankSubmitLabel(false);
      }
    });
  }

  if (btnCloseWithdrawalConfirmModal) {
    btnCloseWithdrawalConfirmModal.addEventListener("click", () => setWithdrawalConfirmModalOpen(false));
  }

  if (withdrawalConfirmModal instanceof HTMLElement) {
    withdrawalConfirmModal.addEventListener("click", (event) => {
      if (event.target === withdrawalConfirmModal) setWithdrawalConfirmModalOpen(false);
    });
  }

  if (btnEditWithdrawalMethod) {
    btnEditWithdrawalMethod.addEventListener("click", () => {
      const previewMethod =
        state.payoutMethods.find((item) => String(item.id || "") === mobilePreviewMethodId) ||
        getPreferredPayoutMethod();
      setWithdrawalConfirmModalOpen(false);
      pendingMobileWithdrawalAfterMethodSave = true;
      openBankDetailModal({ prefillMethod: previewMethod, confirmMode: true });
    });
  }

  if (btnConfirmWithdrawalMethod) {
    btnConfirmWithdrawalMethod.addEventListener("click", async () => {
      setWithdrawalConfirmModalOpen(false);
      try {
        await runWithdrawalProcess();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to submit withdrawal request.";
        setMessage(message, "error");
      }
    });
  }

  if (bankDetailForm) {
    bankDetailForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const type = methodType instanceof HTMLSelectElement ? methodType.value : "BANK";

      const body = {
        type,
        bankName: bankName instanceof HTMLInputElement ? bankName.value.trim() : "",
        accountNo: accountNo instanceof HTMLInputElement ? accountNo.value.trim() : "",
        ifsc: ifsc instanceof HTMLInputElement ? ifsc.value.trim() : "",
        place: place instanceof HTMLInputElement ? place.value.trim() : "",
        upiId: upiId instanceof HTMLInputElement ? upiId.value.trim() : "",
      };

      try {
        setBankFormMessage("Saving payout method...");
        await apiRequest({
          path: "/api/referrals/payout-methods",
          method: "POST",
          token,
          body,
        });
        setBankFormMessage("Payout method submitted for verification.", "success");
        await loadReferralData();
        setModalOpen(false);
        setBankSubmitLabel(false);
        if (pendingMobileWithdrawalAfterMethodSave) {
          pendingMobileWithdrawalAfterMethodSave = false;
          try {
            await runWithdrawalProcess();
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to submit withdrawal request.";
            setMessage(message, "error");
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save payout method.";
        setBankFormMessage(message, "error");
      }
    });
  }

  if (btnRequestWithdrawal) {
    btnRequestWithdrawal.addEventListener("click", () => {
      openMobileWithdrawalConfirmation();
    });
  }

  if (btnCopyReferral) {
    btnCopyReferral.addEventListener("click", async () => {
      const text = referralLinkText instanceof HTMLInputElement ? referralLinkText.value : "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setMessage("Referral link copied.", "success");
      } catch {
        setMessage("Unable to copy referral link automatically.", "error");
      }
    });
  }

  referralTabButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      const targetId = String(button.getAttribute("data-referral-tab-target") || "").trim();
      if (!targetId) return;
      setActiveReferralTab(targetId);
    });
  });

  try {
    setMessage("Loading referral data...");
    setActiveReferralTab("tabPayoutMethods");
    updateMethodFieldVisibility();
    await loadReferralData();
    setMessage("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    const message = error instanceof Error ? error.message : "Unable to load referral data.";
    setMessage(message, "error");
  }
});
