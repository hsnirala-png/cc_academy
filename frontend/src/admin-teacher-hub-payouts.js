import { apiRequest, escapeHtml, requireTeacherHubAdmin, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireTeacherHubAdmin();
  if (!auth) return;
  const messageEl = document.querySelector("#adminTeacherHubPayoutsMessage");
  const accountsEl = document.querySelector("#adminTeacherHubPayoutAccountsList");
  const payoutsEl = document.querySelector("#adminTeacherHubPayoutsList");
  const createPayoutForm = document.querySelector("#adminTeacherHubCreatePayoutForm");
  const createPayoutTeacherProfileIdInput = document.querySelector("#adminTeacherHubCreatePayoutTeacherProfileId");

  const load = async () => {
    const [accountsPayload, payoutsPayload] = await Promise.all([
      apiRequest({ path: "/api/admin/teacher-hub/payout-accounts", token: auth.token }),
      apiRequest({ path: "/api/admin/teacher-hub/payouts", token: auth.token }),
    ]);
    const accounts = accountsPayload?.accounts || [];
    const payouts = payoutsPayload?.payouts || [];
    if (accountsEl instanceof HTMLElement) {
      accountsEl.innerHTML = accounts.length
        ? accounts
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>${escapeHtml(item.accountLabelMasked)}</strong>
                  <div class="teacher-hub-chip-row">
                    <span class="teacher-hub-chip">${item.isVerified ? "Verified" : "Pending"}</span>
                    <span class="teacher-hub-chip">${escapeHtml(item.teacherProfileId)}</span>
                  </div>
                  <div class="teacher-hub-actions">
                    <button class="btn-secondary" data-account-id="${escapeHtml(item.id)}" data-verify="true" type="button">Verify</button>
                    <button class="btn-secondary" data-account-id="${escapeHtml(item.id)}" data-verify="false" type="button">Unverify</button>
                  </div>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No payout accounts yet.</div>`;
    }
    if (payoutsEl instanceof HTMLElement) {
      payoutsEl.innerHTML = payouts.length
        ? payouts
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>Payout ${escapeHtml(item.id)}</strong>
                  <div class="teacher-hub-chip-row">
                    <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                    <span class="teacher-hub-chip">Rs ${Number(item.netAmount || 0).toFixed(2)}</span>
                  </div>
                  <div class="teacher-hub-actions">
                    <button class="btn-secondary" data-payout-id="${escapeHtml(item.id)}" data-status="RELEASED" type="button">Release</button>
                    <button class="btn-secondary" data-payout-id="${escapeHtml(item.id)}" data-status="HELD" type="button">Hold</button>
                  </div>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No payouts yet.</div>`;
    }
  };

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const accountId = target.getAttribute("data-account-id");
    const payoutId = target.getAttribute("data-payout-id");
    try {
      if (accountId) {
        await apiRequest({
          path: `/api/admin/teacher-hub/payout-accounts/${encodeURIComponent(accountId)}/verify`,
          method: "PATCH",
          token: auth.token,
          body: { isVerified: target.getAttribute("data-verify") === "true" },
        });
        await load();
      } else if (payoutId) {
        await apiRequest({
          path: `/api/admin/teacher-hub/payouts/${encodeURIComponent(payoutId)}`,
          method: "PATCH",
          token: auth.token,
          body: { status: target.getAttribute("data-status") || "PENDING" },
        });
        await load();
      }
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to update payout controls.", "error");
    }
  });

  createPayoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiRequest({
        path: "/api/admin/teacher-hub/payouts",
        method: "POST",
        token: auth.token,
        body: {
          teacherProfileId: createPayoutTeacherProfileIdInput?.value || "",
        },
      });
      if (createPayoutForm instanceof HTMLFormElement) createPayoutForm.reset();
      await load();
      setMessage(messageEl, "Payout created.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to create payout.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load payout controls.", "error"));
});
