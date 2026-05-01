import { Toast, Modal } from "../ui.js";

const getToken = () =>
  document.querySelector('[name="__RequestVerificationToken"]')?.value ?? "";

let _blockedDates = [];
let _filteredDates = [];

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadBlockedDates();
});

// ── API ───────────────────────────────────────────────────────────────────────
async function loadBlockedDates() {
  try {
    const res = await fetch("/api/admin/blocked-dates", { credentials: "include" });
    if (!res.ok) return;
    const json = await res.json();
    _blockedDates = json.data || [];
    _filteredDates = [..._blockedDates];
    updateStats();
    renderGrid();
  } catch (e) {
    console.error("[loadBlockedDates]", e);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const today = new Date().toISOString().split("T")[0];
  const total = _blockedDates.length;
  const upcoming = _blockedDates.filter(b => b.blockedDate >= today).length;
  const past = total - upcoming;

  document.getElementById("stat-total-blocked").textContent = total;
  document.getElementById("stat-upcoming-blocked").textContent = upcoming;
  document.getElementById("stat-past-blocked").textContent = past;
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  const container = document.getElementById("blocked-grid");
  if (_filteredDates.length === 0) {
    container.innerHTML = `
      <div class="px-4 py-12 text-center">
        <div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
          <i class="fa-solid fa-calendar-check text-slate-300 text-xl"></i>
        </div>
        <p class="text-[13px] font-bold text-brand-400">No blocked dates</p>
        <p class="text-[11px] text-brand-300 mt-1">All dates are open for appointments.</p>
      </div>`;
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  container.innerHTML = _filteredDates.map(b => {
    const d = new Date(b.blockedDate + "T00:00:00");
    const label = d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const isPast = b.blockedDate < today;
    const isToday = b.blockedDate === today;

    return `
      <div class="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors group ${isPast ? 'opacity-50' : ''}">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl ${isToday ? 'bg-red-100 text-red-600' : isPast ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-500'} flex items-center justify-center flex-shrink-0">
            <div class="text-center leading-none">
              <div class="text-[15px] font-extrabold font-display">${d.getDate()}</div>
              <div class="text-[8px] font-bold uppercase tracking-wider">${d.toLocaleDateString("en-PH", { month: "short" })}</div>
            </div>
          </div>
          <div>
            <div class="text-[13px] font-bold text-brand">${label}</div>
            <div class="flex items-center gap-2 mt-0.5">
              ${b.reason
                ? `<span class="text-[11px] text-brand-400"><i class="fa-solid fa-message text-[9px] mr-1 text-brand-300"></i>${b.reason}</span>`
                : `<span class="text-[11px] text-brand-300 italic">No reason provided</span>`
              }
              ${isToday ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 uppercase ml-1">Today</span>' : ''}
              ${isPast ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase ml-1">Past</span>' : ''}
            </div>
          </div>
        </div>
        <button onclick="removeBlock('${b.id}')"
          class="text-[11px] text-red-400 hover:text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
          <i class="fa-solid fa-trash-can mr-1 text-[10px]"></i>Remove
        </button>
      </div>`;
  }).join("");
}

// ── Filter ────────────────────────────────────────────────────────────────────
window.filterBlocked = function () {
  const q = (document.getElementById("blocked-search")?.value || "").toLowerCase();
  _filteredDates = _blockedDates.filter(b =>
    (b.reason || "").toLowerCase().includes(q) || b.blockedDate.includes(q)
  );
  renderGrid();
};

// ── Add Block Modal ───────────────────────────────────────────────────────────
window.openAddBlockModal = function () {
  const modal = document.getElementById("add-block-modal");
  const box = document.getElementById("add-block-modal-box");
  document.getElementById("add-block-error").classList.add("hidden");
  modal.classList.remove("hidden");
  gsap.fromTo(box, { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" });
};

window.closeAddBlockModal = function () {
  const modal = document.getElementById("add-block-modal");
  const box = document.getElementById("add-block-modal-box");
  gsap.to(box, {
    scale: 0.95, opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
    onComplete: () => {
      modal.classList.add("hidden");
      document.getElementById("add-block-date").value = "";
      document.getElementById("add-block-reason").value = "";
    }
  });
};

window.submitAddBlock = async function () {
  const date = document.getElementById("add-block-date").value;
  const reason = document.getElementById("add-block-reason").value.trim();
  const errEl = document.getElementById("add-block-error");

  if (!date) { Toast.show("Please select a date.", "warning"); return; }

  try {
    const res = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", RequestVerificationToken: getToken() },
      body: JSON.stringify({ date, reason: reason || null }),
    });
    const json = await res.json();

    if (!res.ok) {
      errEl.textContent = json.error || "Failed to block date.";
      errEl.classList.remove("hidden");
      return;
    }

    Toast.show("Date blocked successfully.", "success");
    closeAddBlockModal();

    if (json.data.conflictCount > 0) {
      showConflictModal(json.data);
    }

    await loadBlockedDates();
  } catch {
    Toast.show("Network error.", "danger");
  }
};

// ── Conflict Modal ────────────────────────────────────────────────────────────
function showConflictModal(data) {
  const modal = document.getElementById("bd-conflict-modal");
  const box = document.getElementById("bd-conflict-modal-box");

  document.getElementById("bd-conflict-summary").textContent =
    `${data.conflictCount} active appointment${data.conflictCount > 1 ? "s" : ""} found on ${data.blockedDate}.`;

  document.getElementById("bd-conflict-list").innerHTML = data.conflicts.map(c => `
    <div class="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
      <div>
        <div class="text-[12.5px] font-bold text-brand-900">${c.patientName}</div>
        <div class="text-[11px] text-brand-400">${c.serviceName || ""} · ${c.appointmentTime} · <span class="capitalize">${c.status}</span></div>
        <div class="text-[10px] text-brand-400">${c.patientEmail}${c.patientPhone ? " · " + c.patientPhone : ""}</div>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">${c.status}</span>
    </div>`).join("");

  modal.classList.remove("hidden");
  gsap.fromTo(box, { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" });
}

window.closeBdConflictModal = function () {
  const modal = document.getElementById("bd-conflict-modal");
  const box = document.getElementById("bd-conflict-modal-box");
  gsap.to(box, { scale: 0.95, opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
    onComplete: () => modal.classList.add("hidden")
  });
};

// ── Remove Block ──────────────────────────────────────────────────────────────
window.removeBlock = function (id) {
  Modal.open({
    title: "Remove Date Block",
    message: "Are you sure you want to remove this block? Patients will be able to book on this date again.",
    type: "warning",
    confirmText: "Remove Block",
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/blocked-dates/${id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { RequestVerificationToken: getToken() },
        });
        const json = await res.json();
        if (json.ok) {
          Toast.show("Date unblocked.", "success");
          await loadBlockedDates();
        } else {
          Toast.show(json.error || "Failed to unblock.", "danger");
        }
      } catch {
        Toast.show("Network error.", "danger");
      }
    }
  });
};
