import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  requireRoleGuard,
  requireRoleGuardStrict,
} from "./mock-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;

  const messageEl = document.querySelector("#adminReferralMessage");
  const logoutBtn = document.querySelector("#adminLogoutBtn");

  const ovPending = document.querySelector("#ovPending");
  const ovPendingAmount = document.querySelector("#ovPendingAmount");
  const ovApprovedAmount = document.querySelector("#ovApprovedAmount");
  const ovTotalBonus = document.querySelector("#ovTotalBonus");

  const withdrawalStatusFilter = document.querySelector("#withdrawalStatusFilter");
  const withdrawalSearch = document.querySelector("#withdrawalSearch");
  const withdrawalSearchBtn = document.querySelector("#withdrawalSearchBtn");
  const withdrawalsTableBody = document.querySelector("#withdrawalsTableBody");

  const methodVerifyFilter = document.querySelector("#methodVerifyFilter");
  const methodSearch = document.querySelector("#methodSearch");
  const methodSearchBtn = document.querySelector("#methodSearchBtn");
  const methodsTableBody = document.querySelector("#methodsTableBody");

  const studentsSearch = document.querySelector("#studentsSearch");
  const studentsSearchBtn = document.querySelector("#studentsSearchBtn");
  const studentsTableBody = document.querySelector("#studentsTableBody");

  const state = {
    overview: null,
    withdrawals: [],
    payoutMethods: [],
    students: [],
  };

  const toCurrency = (value) => `?${Number(value || 0).toFixed(2)}`;

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const render = () => {
    const overview = state.overview || {};
    if (ovPending) ovPending.textContent = String(overview.pendingWithdrawalCount || 0);
    if (ovPendingAmount) ovPendingAmount.textContent = toCurrency(overview.pendingWithdrawalAmount || 0);
    if (ovApprovedAmount) ovApprovedAmount.textContent = toCurrency(overview.approvedWithdrawalAmount || 0);
    if (ovTotalBonus) ovTotalBonus.textContent = toCurrency(overview.totalReferralBonus || 0);

    if (withdrawalsTableBody) {
      if (!state.withdrawals.length) {
        withdrawalsTableBody.innerHTML =
          '<tr><td colspan="7" style="text-align:center;color:#666;">No withdrawal requests.</td></tr>';
      } else {
        withdrawalsTableBody.innerHTML = state.withdrawals
          .map((item) => {
            const payoutDetail =
              item.payoutMethod?.type === "BANK"
                ? `${escapeHtml(item.payoutMethod.bankName || "-")} | ${escapeHtml(item.payoutMethod.accountNo || "-")} | ${escapeHtml(item.payoutMethod.ifsc || "-")}`
                : escapeHtml(item.payoutMethod?.upiId || "-");
            return `
              <tr>
                <td>${escapeHtml(item.student?.name || "-")} (${escapeHtml(item.student?.mobile || "-")})</td>
                <td>${toCurrency(item.amount)}</td>
                <td>${escapeHtml(item.payoutMethod?.type || "-")}<small style="display:block;color:#666;">${payoutDetail}</small></td>
                <td><span class="chip ${item.status === "APPROVED" ? "active" : item.status === "PENDING" ? "inactive" : ""}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(formatDateTime(item.requestedAt))}</td>
                <td>${escapeHtml(item.adminNote || "-")}</td>
                <td>
                  ${
                    item.status === "PENDING"
                      ? `<div class="table-actions">
                          <button class="table-btn edit" type="button" data-approve-withdrawal="${item.id}">Approve</button>
                          <button class="table-btn delete" type="button" data-reject-withdrawal="${item.id}">Reject</button>
                        </div>`
                      : "-"
                  }
                </td>
              </tr>
            `;
          })
          .join("");
      }
    }

    if (methodsTableBody) {
      if (!state.payoutMethods.length) {
        methodsTableBody.innerHTML =
          '<tr><td colspan="6" style="text-align:center;color:#666;">No payout methods found.</td></tr>';
      } else {
        methodsTableBody.innerHTML = state.payoutMethods
          .map((item) => {
            const detail =
              item.type === "BANK"
                ? `${escapeHtml(item.bankName || "-")} | ${escapeHtml(item.accountNo || "-")} | ${escapeHtml(item.ifsc || "-")} | ${escapeHtml(item.place || "-")}`
                : escapeHtml(item.upiId || "-");

            return `
              <tr>
                <td>${escapeHtml(item.student?.name || "-")} (${escapeHtml(item.student?.mobile || "-")})</td>
                <td>${escapeHtml(item.type)}</td>
                <td>${detail}</td>
                <td><span class="chip ${item.isVerified ? "active" : "inactive"}">${item.isVerified ? "Verified" : "Pending"}</span></td>
                <td>${escapeHtml(formatDateTime(item.updatedAt))}</td>
                <td>
                  <div class="table-actions">
                    <button class="table-btn ${item.isVerified ? "" : "edit"}" type="button" data-verify-method="${item.id}" data-target-state="${item.isVerified ? "false" : "true"}">
                      ${item.isVerified ? "Unverify" : "Verify"}
                    </button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");
      }
    }

    if (studentsTableBody) {
      if (!state.students.length) {
        studentsTableBody.innerHTML =
          '<tr><td colspan="7" style="text-align:center;color:#666;">No student report rows found.</td></tr>';
      } else {
        studentsTableBody.innerHTML = state.students
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.name || "-")} (${escapeHtml(item.mobile || "-")})</td>
                <td>${escapeHtml(item.referralCode || "-")}</td>
                <td>${Number(item.referredCount || 0)}</td>
                <td>${toCurrency(item.totalEarned)}</td>
                <td>${toCurrency(item.totalWithdrawn)}</td>
                <td>${toCurrency(item.walletBalance)}</td>
                <td>${escapeHtml(formatDateTime(item.createdAt))}</td>
              </tr>
            `
          )
          .join("");
      }
    }
  };

  const loadOverview = async () => {
    const data = await apiRequest({ path: "/api/admin/referrals/overview", token });
    state.overview = data.overview || null;
  };

  const loadWithdrawals = async () => {
    const query = {
      status: withdrawalStatusFilter instanceof HTMLSelectElement ? withdrawalStatusFilter.value || undefined : undefined,
      search: withdrawalSearch instanceof HTMLInputElement ? withdrawalSearch.value.trim() || undefined : undefined,
    };
    const data = await apiRequest({ path: "/api/admin/referrals/withdrawals", token, query });
    state.withdrawals = data.withdrawals || [];
  };

  const loadMethods = async () => {
    const query = {
      verified: methodVerifyFilter instanceof HTMLSelectElement ? methodVerifyFilter.value || undefined : undefined,
      search: methodSearch instanceof HTMLInputElement ? methodSearch.value.trim() || undefined : undefined,
    };
    const data = await apiRequest({ path: "/api/admin/referrals/payout-methods", token, query });
    state.payoutMethods = data.payoutMethods || [];
  };

  const loadStudents = async () => {
    const query = {
      search: studentsSearch instanceof HTMLInputElement ? studentsSearch.value.trim() || undefined : undefined,
    };
    const data = await apiRequest({ path: "/api/admin/referrals/students", token, query });
    state.students = data.students || [];
  };

  const loadAll = async () => {
    await Promise.all([loadOverview(), loadWithdrawals(), loadMethods(), loadStudents()]);
    render();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./admin-login.html";
    });
  }

  if (withdrawalSearchBtn) {
    withdrawalSearchBtn.addEventListener("click", async () => {
      try {
        setMessage("Loading withdrawals...");
        await loadWithdrawals();
        render();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load withdrawals.", "error");
      }
    });
  }

  if (methodSearchBtn) {
    methodSearchBtn.addEventListener("click", async () => {
      try {
        setMessage("Loading payout methods...");
        await loadMethods();
        render();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load payout methods.", "error");
      }
    });
  }

  if (studentsSearchBtn) {
    studentsSearchBtn.addEventListener("click", async () => {
      try {
        setMessage("Loading students report...");
        await loadStudents();
        render();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load students report.", "error");
      }
    });
  }

  if (withdrawalsTableBody) {
    withdrawalsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const approveId = target.getAttribute("data-approve-withdrawal");
      if (approveId) {
        const note = window.prompt("Approval note (optional):", "") || "";
        try {
          await apiRequest({
            path: `/api/admin/referrals/withdrawals/${encodeURIComponent(approveId)}/approve`,
            method: "POST",
            token,
            body: { note: note.trim() || undefined },
          });
          await loadAll();
          setMessage("Withdrawal approved.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to approve withdrawal.", "error");
        }
        return;
      }

      const rejectId = target.getAttribute("data-reject-withdrawal");
      if (rejectId) {
        const note = window.prompt("Rejection reason (optional):", "") || "";
        try {
          await apiRequest({
            path: `/api/admin/referrals/withdrawals/${encodeURIComponent(rejectId)}/reject`,
            method: "POST",
            token,
            body: { note: note.trim() || undefined },
          });
          await loadAll();
          setMessage("Withdrawal rejected.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to reject withdrawal.", "error");
        }
      }
    });
  }

  if (methodsTableBody) {
    methodsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const methodId = target.getAttribute("data-verify-method");
      if (!methodId) return;

      const targetState = target.getAttribute("data-target-state") === "true";
      try {
        await apiRequest({
          path: `/api/admin/referrals/payout-methods/${encodeURIComponent(methodId)}/verify`,
          method: "POST",
          token,
          body: { verified: targetState },
        });
        await loadMethods();
        render();
        setMessage(targetState ? "Method verified." : "Method unverified.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to update payout method status.", "error");
      }
    });
  }

  try {
    setMessage("Loading referral admin...");
    await loadAll();
    setMessage("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./admin-login.html";
      return;
    }
    setMessage(error.message || "Unable to load referral admin.", "error");
  }
});
