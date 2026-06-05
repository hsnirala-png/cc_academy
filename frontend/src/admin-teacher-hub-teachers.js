import { apiRequest, escapeHtml, requireTeacherHubAdmin, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireTeacherHubAdmin();
  if (!auth) return;
  const messageEl = document.querySelector("#adminTeacherHubTeachersMessage");
  const teachersListEl = document.querySelector("#adminTeacherHubTeachersList");
  const kycListEl = document.querySelector("#adminTeacherHubKycList");

  const load = async () => {
    const [teachersPayload, kycPayload] = await Promise.all([
      apiRequest({ path: "/api/admin/teacher-hub/teachers", token: auth.token }),
      apiRequest({ path: "/api/admin/teacher-hub/kyc", token: auth.token }),
    ]);
    const teachers = teachersPayload?.teachers || [];
    const kycs = kycPayload?.items || [];
    if (teachersListEl instanceof HTMLElement) {
      teachersListEl.innerHTML = teachers.length
        ? teachers
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>${escapeHtml(item.displayName)}</strong>
                  <div class="teacher-hub-chip-row">
                    <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                    <span class="teacher-hub-chip">${escapeHtml(item.id)}</span>
                  </div>
                  <div class="teacher-hub-actions">
                    <button class="btn-secondary" data-teacher-status="${escapeHtml(item.id)}" data-next-status="APPROVED" type="button">Approve</button>
                    <button class="btn-secondary" data-teacher-status="${escapeHtml(item.id)}" data-next-status="SUSPENDED" type="button">Suspend</button>
                  </div>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No teacher profiles yet.</div>`;
    }
    if (kycListEl instanceof HTMLElement) {
      kycListEl.innerHTML = kycs.length
        ? kycs
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>${escapeHtml(item.legalName || "KYC Record")}</strong>
                  <div class="teacher-hub-chip-row">
                    <span class="teacher-hub-chip">${escapeHtml(item.verificationStatus)}</span>
                    <span class="teacher-hub-chip">${escapeHtml(item.teacherProfileId)}</span>
                  </div>
                  <div class="teacher-hub-actions">
                    <button class="btn-secondary" data-kyc-status="${escapeHtml(item.id)}" data-next-status="APPROVED" type="button">Approve KYC</button>
                    <button class="btn-secondary" data-kyc-status="${escapeHtml(item.id)}" data-next-status="REJECTED" type="button">Reject KYC</button>
                  </div>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No KYC records yet.</div>`;
    }
  };

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const teacherId = target.getAttribute("data-teacher-status");
    const teacherStatus = target.getAttribute("data-next-status");
    const kycId = target.getAttribute("data-kyc-status");
    const kycStatus = target.getAttribute("data-next-status");
    try {
      if (teacherId && teacherStatus) {
        await apiRequest({
          path: `/api/admin/teacher-hub/teachers/${encodeURIComponent(teacherId)}/status`,
          method: "PATCH",
          token: auth.token,
          body: { status: teacherStatus },
        });
        await load();
      } else if (kycId && kycStatus) {
        await apiRequest({
          path: `/api/admin/teacher-hub/kyc/${encodeURIComponent(kycId)}`,
          method: "PATCH",
          token: auth.token,
          body: { status: kycStatus },
        });
        await load();
      }
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to update teacher controls.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load teacher records.", "error"));
});
