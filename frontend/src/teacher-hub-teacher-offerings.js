import { apiRequest, escapeHtml, requireTeacherHubTeacher, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("#teacherHubOfferingForm");
  const titleInput = document.querySelector("#teacherOfferingTitle");
  const subjectInput = document.querySelector("#teacherOfferingSubject");
  const boardInput = document.querySelector("#teacherOfferingBoard");
  const classLevelInput = document.querySelector("#teacherOfferingClassLevel");
  const modeInput = document.querySelector("#teacherOfferingMode");
  const cycleInput = document.querySelector("#teacherOfferingCycle");
  const cyclePriceInput = document.querySelector("#teacherOfferingCyclePrice");
  const demoPriceInput = document.querySelector("#teacherOfferingDemoPrice");
  const batchCapacityInput = document.querySelector("#teacherOfferingBatchCapacity");
  const statusInput = document.querySelector("#teacherOfferingStatus");
  const descriptionInput = document.querySelector("#teacherOfferingDescription");
  const refundPolicyInput = document.querySelector("#teacherOfferingRefundPolicy");
  const messageEl = document.querySelector("#teacherHubTeacherOfferingsMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubTeacher();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const listEl = document.querySelector("#teacherHubTeacherOfferingsList");

  const render = (items) => {
    if (!(listEl instanceof HTMLElement)) return;
    listEl.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <article class="teacher-hub-item">
                <h3>${escapeHtml(item.title)}</h3>
                <div class="teacher-hub-chip-row">
                  <span class="teacher-hub-chip">${escapeHtml(item.mode)}</span>
                  <span class="teacher-hub-chip">${escapeHtml(item.billingCycle)}</span>
                  <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                </div>
                <p>${escapeHtml(item.description || "No description.")}</p>
                <p>Cycle Rs ${Number(item.cyclePrice || 0).toFixed(2)} | Demo Rs ${Number(item.demoPrice || 0).toFixed(2)}</p>
              </article>
            `
          )
          .join("")
      : `<div class="teacher-hub-empty">No offerings created yet.</div>`;
  };

  const load = async () => {
    const payload = await apiRequest({ path: "/teacher-hub/offerings", token: auth.token });
    render(payload?.offerings || []);
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Saving offering...");
      await apiRequest({
        path: "/teacher-hub/offerings",
        method: "POST",
        token: auth.token,
        body: {
          title: titleInput?.value || "",
          subject: subjectInput?.value || "",
          board: boardInput?.value || undefined,
          classLevel: classLevelInput?.value || undefined,
          mode: modeInput?.value || "ONE_TO_ONE",
          billingCycle: cycleInput?.value || "MONTHLY",
          cyclePrice: cyclePriceInput?.value || 0,
          demoPrice: demoPriceInput?.value || 0,
          batchCapacity: batchCapacityInput?.value || undefined,
          status: statusInput?.value || "DRAFT",
          isPublished: (statusInput?.value || "DRAFT") === "PUBLISHED",
          description: descriptionInput?.value || undefined,
          refundPolicy: refundPolicyInput?.value || undefined,
        },
      });
      if (form instanceof HTMLFormElement) form.reset();
      await load();
      setMessage(messageEl, "Offering saved.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to save offering.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load offerings.", "error"));
});
