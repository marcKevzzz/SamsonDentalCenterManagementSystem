import { Toast, Modal } from "../ui.js";

import { AdminStore } from "./AdminStore.js";
const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(async (r) => {
      if (!r.ok) {
        let err = "Server error " + r.status;
        try {
          const data = await r.json();
          err = data.error || err;
        } catch (e) {}
        throw new Error(err);
      }
      return r.json();
    })
    .catch((err) => {
      console.error("[POST Error]", err);
      return { ok: false, error: err.message };
    });

// ── State ───────────────────────────────────────────────────────────────────
let ALL_APPT = [];
let ALL_DOCS = [];
let ALL_SVCS = [];
const PAGE_SIZE = 20;
let currentPage = 1;
let filtered = [];

const getAppt = (x) =>
  typeof x === "string" ? ALL_APPT.find((a) => a.id === x) : x;

// ── Init ──────────────────────────────────────────────────────────────────────
async function refreshData(force = false) {
  const appts = await AdminStore.loadData(
    "appointments",
    "/api/admin/data/appointments",
    { force }
  );
  const docs = await AdminStore.loadData("doctors", "/api/admin/data/doctors", { force });
  const svcs = await AdminStore.loadData("services", "/api/services/all", { force });

  if (appts) {
    initializeWithData({
      appointments: appts,
      doctors: docs?.data || docs,
      services: svcs,
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshData();
  checkUrlParams();
});

async function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const patientId = params.get('patientId');
  const openModal = params.get('openModal');

  if (patientId) {
    // Load patients to find the match
    const patientsData = await AdminStore.loadData('patients', '/api/admin/data/patients');
    if (patientsData) {
      const patient = patientsData.find(p => p.id === patientId);
      if (patient) {
        document.getElementById('book-patient-id').value = patient.id;
        document.getElementById('book-patient-name').value = `${patient.firstName} ${patient.lastName}`;
        document.getElementById('book-patient-email').value = patient.email;
        document.getElementById('book-patient-phone').value = patient.phone || '';
        
        if (openModal === 'true') {
          window.openBookModal(true); // pass true to skip reset
        }
      }
    }
  }
}

// Listen for SignalR updates from AdminStore
window.addEventListener("admin:appointments:updated", (e) => {
  console.log("Appointment update received via SignalR", e.detail);
  refreshData(true); // Force refresh from server
});

function initializeWithData(data) {
  ALL_APPT = data.appointments || [];
  ALL_DOCS = data.doctors || [];
  ALL_SVCS = data.services || [];

  // Transform appointments to include formatted fields if missing
  ALL_APPT.forEach((a) => {
    if (!a.appointmentDateFormatted) {
      const d = new Date(a.appointmentDate);
      a.appointmentDateFormatted = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (!a.doctorName && a.doctor && a.doctor.profile) {
      a.doctorName = `${a.doctor.title} ${a.doctor.profile.firstName} ${a.doctor.profile.lastName}`;
    }
    if (!a.serviceName && a.service) {
      a.serviceName = a.service.name;
    }
  });

  filtered = [...ALL_APPT];

  renderStats(data.stats);
  hydrateDropdowns();
  renderTable();
}

function renderStats(stats) {
  const s = stats || {};
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("stat-confirmed", s.appointmentsConfirmed !== undefined ? s.appointmentsConfirmed : ALL_APPT.filter((a) => a.status === "confirmed").length);
  setEl("stat-pending",   s.appointmentsPending   !== undefined ? s.appointmentsPending   : ALL_APPT.filter((a) => a.status === "pending").length);
  setEl("stat-waitlist",  s.appointmentsWaitlist  !== undefined ? s.appointmentsWaitlist  : ALL_APPT.filter((a) => a.status === "waitlist").length);
  setEl("stat-cancelled", s.appointmentsCancelled !== undefined ? s.appointmentsCancelled : ALL_APPT.filter((a) => a.status === "cancelled").length);
}

function hydrateDropdowns() {
  const svcSelects = ["book-service"];
  const docSelects = ["book-doctor", "edit-doctor", "confirm-doctor"];

  svcSelects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML =
      '<option value="">Choose a service…</option>' +
      ALL_SVCS.map(
        (s) =>
          `<option value="${s.id}" data-name="${s.name}" data-category="${s.category}">${s.name}</option>`,
      ).join("");
    el.value = val;
  });

  docSelects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML =
      '<option value="">Any available specialist</option>' +
      ALL_DOCS.map((d) => {
        const profile = d.profile || d.Profile;
        const name = profile
          ? `${d.title} ${profile.first_name || profile.firstName} ${profile.last_name || profile.lastName}`
          : "Unknown";
        const specs = d.specialties ? d.specialties.join(",") : "";
        return `<option value="${d.id}" data-name="${name}" data-specialties="${specs}">${name}</option>`;
      }).join("");
    el.value = val;
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("appointments-body");
  const pagBar = document.getElementById("paginationBar");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-[12px] text-brand-400">No appointments found.</td></tr>`;
    if (pagBar) pagBar.classList.add("hidden");
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageItems.map((appt) => rowHTML(appt)).join("");

  if (pagBar) {
    if (filtered.length > PAGE_SIZE) {
      pagBar.classList.remove("hidden");
      pagBar.classList.add("flex");
      const infoEl = document.getElementById("paginationInfo");
      if (infoEl) infoEl.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} appointments`;
      renderPaginationBtns(totalPages);
    } else {
      pagBar.classList.add("hidden");
      pagBar.classList.remove("flex");
    }
  }
}

function rowHTML(appt) {
  const shortId = "#APT-" + appt.id.slice(0, 4).toUpperCase();

  const statusConfig = {
    confirmed: {
      classes: "bg-emerald-50 text-emerald-600 border-emerald-100",
      label: "Confirmed",
    },
    pending: {
      classes: "bg-orange-50 text-orange-600 border-orange-100",
      label: "Pending",
    },
    arrived: {
      classes: "bg-blue-50 text-blue-600 border-blue-100",
      label: "Arrived",
    },
    completed: {
      classes: "bg-emerald-50 text-emerald-600 border-emerald-100",
      label: "Completed",
    },
    no_show: {
      classes: "bg-slate-200/80 text-slate-600 border-slate-100",
      label: "No-Show",
    },
    cancelled: {
      classes: "bg-red-50 text-red-600 border-red-100",
      label: "Cancelled",
    },
    waitlist: {
      classes: "bg-purple-50 text-purple-600 border-purple-100",
      label: "Waitlist",
    },
  };
  const config = statusConfig[appt.status.toLowerCase()] || {
    classes: "bg-slate-50 text-slate-600 border-slate-100",
    label: appt.status,
  };

  const status = (appt.status || "").toLowerCase();
  const idStr = `"${appt.id}"`;

  let workflowBtn = "";
  if (appt.status === "pending") {
    workflowBtn = `<button onclick='confirmAppt(${idStr})' class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-sm">Confirm</button>`;
  } else if (appt.status === "confirmed") {
    workflowBtn = `<button onclick='updateStatus(${idStr}, "arrived")' class="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors shadow-sm">Check-In</button>`;
  } else if (appt.status === "arrived") {
    workflowBtn = `<button onclick='updateStatus(${idStr}, "completed")' class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-sm">Checkout</button>`;
  }

  return `
    <tr class="group hover:bg-slate-50/80 transition-colors">
      <td class="px-4 py-4">
        <span class="text-[10px] font-bold text-brand-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">${shortId}</span>
      </td>
      <td class="px-4 py-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] uppercase">
            ${(appt.patientName || "G")[0]}
          </div>
          <div>
            <div class="text-[13px] font-bold text-brand-900 leading-none mb-1">${appt.patientName}</div>
            <div class="text-[10.5px] text-brand-400">${appt.patientEmail}</div>
          </div>
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="text-[12.5px] font-medium text-brand-800">${appt.serviceName}</div>
        <div class="text-[11px] text-brand-400">
          <i class="fa-solid fa-user-doctor text-[9px] mr-1"></i>
          ${appt.doctorName || "Unassigned"}
        </div>
      </td>
      <td class="px-4 py-4">
        ${renderSourceBadge(appt.source)}
      </td>
      <td class="px-4 py-4">
        <div class="text-[12.5px] font-bold text-brand-900">${appt.appointmentDateFormatted}</div>
        <div class="text-[11px] text-brand-400">${appt.appointmentTime}</div>
      </td>
      <td class="px-4 py-4 text-center">
        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${config.classes} font-display uppercase tracking-wider">
          ${config.label}
        </span>
      </td>
      <td class="px-4 py-4 text-right whitespace-nowrap">
        <div class="flex items-center justify-end gap-2">
          ${workflowBtn}
          <div class="inline-block text-left action-dropdown relative">
            <button onclick="toggleDropdown(event, this)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand-400 transition-colors">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="dropdown-menu hidden absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-lg shadow-brand-900/5 z-[60] overflow-hidden">
              <div class="py-1">
                ${status === "pending" ? `<button onclick='confirmAppt(${idStr})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-check-circle w-4"></i> Confirm Booking</button>` : ""}
                ${status === "confirmed" ? `<button onclick='updateStatus(${idStr}, "arrived")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-person-walking-arrow-right w-4"></i> Mark Arrived</button>` : ""}
                ${
                  status === "confirmed" || status === "arrived"
                    ? `
                  <button onclick='updateStatus(${idStr}, "completed")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-circle-check w-4"></i> Mark Completed</button>
                  <button onclick='updateStatus(${idStr}, "no_show")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-user-slash w-4"></i> Mark No-Show</button>
                `
                    : ""
                }
                <div class="h-px bg-slate-100 my-1"></div>
                ${
                  ["confirmed", "pending", "arrived"].includes(status)
                    ? `
                  <button onclick='openEditModal(${idStr})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-brand-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-rotate w-4"></i> Reschedule</button>
                  <button onclick='cancelAppt(${idStr})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-accent hover:bg-red-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-ban w-4"></i> Cancel</button>
                `
                    : ""
                }
                ${["cancelled", "no_show", "no-show", "completed"].includes(status) ? `<button onclick='openBookModal()' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-primary hover:bg-blue-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-plus w-4"></i> Book Again</button>` : ""}
                ${["waitlist", "no_show", "no-show", "cancelled", "completed"].includes(status) ? `<button onclick='deleteAppt(${idStr})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-trash-can w-4"></i> Remove Record</button>` : ""}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}

function renderSourceBadge(source) {
  const s = (source || "online").toLowerCase();
  if (s === "guest") {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-user-secret text-[9px]"></i> Guest</span>`;
  } else if (s === "admin") {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-shield-halved text-[9px]"></i> Admin</span>`;
  } else if (s === "walk_in") {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-person-walking text-[9px]"></i> Walk-in</span>`;
  } else if (s === "phone") {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-phone text-[9px]"></i> Phone</span>`;
  } else {
    // default to online
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-globe text-[9px]"></i> Online</span>`;
  }
}

function renderPaginationBtns(totalPages) {
  const container = document.getElementById("paginationBtns");
  let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg ${i === currentPage ? "bg-primary text-white" : "border border-slate-200 text-brand-500 hover:bg-slate-50"}">${i}</button>`;
  }
  html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>`;
  container.innerHTML = html;
}

document.addEventListener("click", (e) => {
  const pageBtn = e.target.closest(".page-btn");
  if (!pageBtn || pageBtn.disabled) return;
  currentPage = parseInt(pageBtn.dataset.page);
  renderTable();
});

// ── Table filter ──────────────────────────────────────────────────────────────
window.filterTable = () => {
  const q = document.getElementById("search-input").value.toLowerCase().trim();
  const status = document.getElementById("status-filter").value;
  const date = document.getElementById("date-filter").value;

  filtered = ALL_APPT.filter((appt) => {
    const matchSearch =
      !q ||
      appt.patientName.toLowerCase().includes(q) ||
      (appt.doctorName && appt.doctorName.toLowerCase().includes(q)) ||
      appt.serviceName.toLowerCase().includes(q);
      
    // Split status filter into array to handle comma-separated values
    const statusArray = status ? status.toLowerCase().split(',').map(s => s.trim()) : [];
    const matchStatus =
      !status || statusArray.includes(appt.status.toLowerCase());
      
    const matchDate = !date || appt.appointmentDate === date;
    return matchSearch && matchStatus && matchDate;
  });

  currentPage = 1;
  renderTable();
};

// ── MODAL UTILS ───────────────────────────────────────────────────────────────
const showModal = (id) => {
  const modal = document.getElementById(id);
  const box = document.getElementById(`${id}-box`);
  modal.classList.remove("hidden");
  gsap.fromTo(
    box,
    { scale: 0.9, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" },
  );
};

const hideModal = (id) => {
  const modal = document.getElementById(id);
  const box = document.getElementById(`${id}-box`);
  gsap.to(box, {
    scale: 0.95,
    opacity: 0,
    y: 10,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => modal.classList.add("hidden"),
  });
};

let initialBookFormState = "";

function getBookFormState() {
  return JSON.stringify({
    id: document.getElementById("book-patient-id")?.value || "",
    n: document.getElementById("book-patient-name")?.value || "",
    e: document.getElementById("book-patient-email")?.value || "",
    p: document.getElementById("book-patient-phone")?.value || "",
    s: document.getElementById("book-service")?.value || "",
    d: document.getElementById("book-doctor")?.value || "",
    dt: document.getElementById("book-date")?.value || "",
    t: document.getElementById("book-time")?.value || "",
    nt: document.getElementById("book-notes")?.value || ""
  });
}

window.openBookModal = (skipReset = false) => {
  if (!skipReset) {
    // Reset fields to ensure clean state on open
    const fields = ["book-patient-id", "book-patient-name", "book-patient-email", "book-patient-phone", "book-service", "book-doctor", "book-date", "book-time", "book-notes"];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if(el) el.value = "";
    });
  }
  initialBookFormState = getBookFormState();
  showModal("book-modal");
};

window.closeBookModal = () => {
  if (initialBookFormState && getBookFormState() !== initialBookFormState) {
    Modal.open({
      title: "Discard Changes?",
      message: "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialBookFormState = getBookFormState();
        closeBookModal();
      }
    });
    return;
  }
  hideModal("book-modal");
};

window.submitBook = async () => {
  const name = document.getElementById("book-patient-name").value.trim();
  const email = document.getElementById("book-patient-email").value.trim();
  const phone = document.getElementById("book-patient-phone").value.trim();
  const svcEl = document.getElementById("book-service");
  const docEl = document.getElementById("book-doctor");
  const date = document.getElementById("book-date").value;
  const time = document.getElementById("book-time").value;
  const notes = document.getElementById("book-notes").value.trim();

  const svcId = svcEl.value;
  const svcName = svcEl.selectedOptions[0]?.dataset.name ?? "";
  const docId = docEl.value || null;
  const docName = docEl.value ? docEl.selectedOptions[0]?.dataset.name : null;

  if (!name || !email || !svcId || !date || !time) {
    Toast.show("Please fill in all required fields.", "warning");
    return;
  }

  const res = await post("/api/admin/appointments/book", {
    patientId: document.getElementById("book-patient-id").value || null,
    patientName: name,
    patientEmail: email,
    patientPhone: phone,
    serviceId: svcId,
    serviceName: svcName,
    doctorId: docId,
    doctorName: docName,
    appointmentDate: date,
    appointmentTime: time,
    notes,
    isGuest: false,
    source: "admin",
  });

  if (res.ok) {
    initialBookFormState = getBookFormState(); // bypass discard check
    Toast.show("Appointment booked!", "success");
    closeBookModal();
    refreshData(true);
  } else {
    Toast.show(res.error ?? "Failed to book appointment.", "danger");
  }
};

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
window.confirmAppt = (apptInput) => {
  const appt = getAppt(apptInput);
  document.getElementById("confirm-appt-id").value = appt.id;
  document.getElementById("confirm-modal-message").innerHTML =
    `Confirming appointment for <strong>${appt.patientName}</strong>.<br/><span class="text-[11px] opacity-70">${appt.serviceName} (${appt.serviceCategory})</span>`;

  const docSel = document.getElementById("confirm-doctor");
  const hint = document.getElementById("doctor-hint");

  docSel.value = appt.doctorId || "";
  const category = appt.serviceCategory
    ? appt.serviceCategory.toLowerCase()
    : "";
  let shownCount = 0;

  Array.from(docSel.options).forEach((opt) => {
    if (!opt.value) return;
    const specs = opt.dataset.specialties
      ? opt.dataset.specialties.toLowerCase().split(",")
      : [];
    const isMatch =
      !category ||
      specs.some(
        (s) =>
          s.trim() === category ||
          category.includes(s.trim()) ||
          s.trim().includes(category),
      );
    opt.style.display = isMatch ? "" : "none";
    if (isMatch) shownCount++;
  });

  hint.classList.toggle("hidden", shownCount === 0);
  if (shownCount > 0)
    hint.textContent = `Matching specialists for ${appt.serviceCategory} shown.`;

  showModal("confirm-modal");
};

window.closeConfirmModal = () => hideModal("confirm-modal");

window.submitConfirm = async () => {
  const id = document.getElementById("confirm-appt-id").value;
  const doctorId = document.getElementById("confirm-doctor").value;

  if (!doctorId) {
    Toast.show(
      "Please assign a doctor to confirm this appointment.",
      "warning",
    );
    return;
  }

  const res = await post("/api/admin/appointments/status", {
    id,
    status: "confirmed",
    doctorId,
  });

  if (res.ok) {
    Toast.show("Appointment confirmed!", "success");
    closeConfirmModal();
    refreshData(true);
  } else {
    Toast.show(res.error ?? "Failed to confirm.", "danger");
  }
};

// ── STATUS UPDATES ───────────────────────────────────────────────────────────
window.updateStatus = (apptInput, status) => {
  const appt = getAppt(apptInput);
  const statusLabels = {
    arrived: {
      label: "Arrived",
      type: "info",
      msg: "Mark patient as <strong>Arrived</strong>? This will notify the doctor and start the wait-time tracker.",
    },
    completed: {
      label: "Completed",
      type: "success",
      msg: "Mark appointment as <strong>Completed</strong>? Ensure all treatments and payments are finalized.",
    },
    no_show: {
      label: "No-Show",
      type: "warning",
      msg: "Mark as <strong>No-Show</strong>? This will free up the slot for other patients.",
    },
  };

  const config = statusLabels[status] || {
    label: status.replace("_", " "),
    type: "info",
    msg: `Update status to ${status}?`,
  };

  Modal.open({
    title: `Change Status: ${config.label}`,
    message: `Patient: <strong>${appt.patientName}</strong><br/>${config.msg}`,
    type: config.type,
    confirmText: `Confirm ${config.label}`,
    onConfirm: async () => {
      const res = await post("/api/admin/appointments/status", {
        id: appt.id,
        status: status,
      });
      if (res.ok) {
        Toast.show(`Status updated to ${config.label}.`, "success");
        refreshData(true);
      } else Toast.show(res.error ?? "Failed to update status.", "danger");
    },
  });
};

// ── CANCEL ────────────────────────────────────────────────────────────────────
window.cancelAppt = (apptInput) => {
  const appt = getAppt(apptInput);
  Modal.open({
    title: "Cancel Appointment",
    message: `Cancel appointment for <strong>${appt.patientName}</strong>? A waitlist patient may be promoted automatically.`,
    type: "danger",
    confirmText: "Yes, Cancel",
    onConfirm: async () => {
      const res = await post("/api/admin/appointments/status", {
        id: appt.id,
        status: "cancelled",
      });
      if (res.ok) {
        Toast.show("Appointment cancelled.", "info");
        refreshData(true);
      } else Toast.show(res.error ?? "Failed to cancel.", "danger");
    },
  });
};

// ── DELETE ────────────────────────────────────────────────────────────────────
window.deleteAppt = (apptInput) => {
  const appt = getAppt(apptInput);
  Modal.open({
    title: "Remove Appointment",
    message: `Permanently remove appointment for <strong>${appt.patientName}</strong> from the records?`,
    type: "danger",
    confirmText: "Yes, Remove",
    onConfirm: async () => {
      const res = await post("/api/admin/appointments/delete", { id: appt.id });
      if (res.ok) {
        Toast.show("Appointment removed.", "success");
        refreshData(true);
      } else Toast.show(res.error ?? "Failed to remove.", "danger");
    },
  });
};

// ── EDIT / RESCHEDULE MODAL ───────────────────────────────────────────────────
window.openEditModal = (apptInput) => {
  const appt = getAppt(apptInput);
  document.getElementById("edit-modal-title").textContent = "Edit Appointment";
  _setupEditModal(appt);
};

window.openRescheduleModal = (apptInput) => {
  const appt = getAppt(apptInput);
  document.getElementById("edit-modal-title").textContent =
    "Reschedule Appointment";
  _setupEditModal(appt);
};

let initialEditFormState = "";
function getEditFormState() {
  return JSON.stringify({
    dt: document.getElementById("edit-date")?.value || "",
    t: document.getElementById("edit-time")?.value || "",
    d: document.getElementById("edit-doctor")?.value || ""
  });
}

function _setupEditModal(appt) {
  document.getElementById("edit-appt-id").value = appt.id;
  document.getElementById("edit-date").value = appt.appointmentDate;
  document.getElementById("edit-time").value = appt.appointmentTime;
  document.getElementById("edit-doctor").value = appt.doctorId ?? "";
  initialEditFormState = getEditFormState();
  showModal("edit-modal");
}

window.closeEditModal = () => {
  if (initialEditFormState && getEditFormState() !== initialEditFormState) {
    Modal.open({
      title: "Discard Changes?",
      message: "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialEditFormState = getEditFormState();
        closeEditModal();
      }
    });
    return;
  }
  hideModal("edit-modal");
};

window.submitReschedule = async () => {
  const id = document.getElementById("edit-appt-id").value;
  const date = document.getElementById("edit-date").value;
  const time = document.getElementById("edit-time").value;
  const doctorId = document.getElementById("edit-doctor").value || null;

  if (!date || !time) {
    Toast.show("Please select a date and time.", "warning");
    return;
  }

  const res = await post("/api/admin/appointments/reschedule", {
    id,
    newDate: date,
    newTime: time,
    doctorId,
  });

  if (res.ok) {
    initialEditFormState = getEditFormState(); // bypass check
    Toast.show("Appointment updated!", "success");
    closeEditModal();
    refreshData(true);
  } else {
    Toast.show(res.error ?? "Failed to update.", "danger");
  }
};

window.toggleDropdown = (event, btn) => {
  event.stopPropagation();
  const menu = btn.nextElementSibling;
  const isHidden = menu.classList.contains("hidden");

  // Close all other menus
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.add("hidden"));

  if (isHidden) {
    menu.classList.remove("hidden");

    // --- Smart Positioning ---
    const rect = menu.getBoundingClientRect();
    const winH = window.innerHeight;

    // If it goes off the bottom, flip it to the top
    if (rect.bottom > winH - 20) {
      menu.style.bottom = "100%";
      menu.style.top = "auto";
      menu.classList.add("mb-2");
      menu.classList.remove("mt-2");
    } else {
      menu.style.bottom = "auto";
      menu.style.top = "100%";
      menu.classList.add("mt-2");
      menu.classList.remove("mb-2");
    }
  }
};

window.addEventListener("click", function (e) {
  if (!e.target.closest(".action-dropdown")) {
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((menu) => menu.classList.add("hidden"));
  }
});

// ── BLOCK DATE ────────────────────────────────────────────────────────────────
let _blockedDates = [];

async function loadBlockedDates() {
  try {
    const res = await fetch("/api/admin/blocked-dates", { credentials: "include" });
    if (!res.ok) return;
    const json = await res.json();
    _blockedDates = json.data || [];
    renderBlockedList();
  } catch (e) {
    console.error("[loadBlockedDates]", e);
  }
}

function renderBlockedList() {
  const container = document.getElementById("blocked-dates-list");
  if (!container) return;
  if (_blockedDates.length === 0) {
    container.innerHTML = '<p class="text-[11px] text-brand-400 italic">No dates are currently blocked.</p>';
    return;
  }
  container.innerHTML = _blockedDates.map(b => {
    const d = new Date(b.blockedDate + "T00:00:00");
    const label = d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    return `
      <div class="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-xl group">
        <div>
          <span class="text-[12px] font-bold text-red-700">${label}</span>
          ${b.reason ? `<span class="text-[10px] text-brand-400 ml-2">— ${b.reason}</span>` : ""}
        </div>
        <button onclick="unblockDate('${b.id}')"
          class="text-[10px] text-red-400 hover:text-red-600 font-bold px-2 py-0.5 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
          Remove
        </button>
      </div>`;
  }).join("");
}

window.openBlockDateModal = async function () {
  const modal = document.getElementById("block-date-modal");
  const box = document.getElementById("block-date-modal-box");
  modal.classList.remove("hidden");
  gsap.fromTo(box, { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" });
  await loadBlockedDates();
};

window.closeBlockDateModal = function () {
  const modal = document.getElementById("block-date-modal");
  const box = document.getElementById("block-date-modal-box");
  gsap.to(box, { scale: 0.95, opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
    onComplete: () => {
      modal.classList.add("hidden");
      document.getElementById("block-date-input").value = "";
      document.getElementById("block-date-reason").value = "";
    }
  });
};

window.submitBlockDate = async function () {
  const date = document.getElementById("block-date-input").value;
  const reason = document.getElementById("block-date-reason").value.trim();
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
      Toast.show(json.error || "Failed to block date.", "danger");
      return;
    }

    Toast.show("Date blocked successfully.", "success");
    closeBlockDateModal();

    // Show conflict modal if existing appointments affected
    if (json.data.conflictCount > 0) {
      showConflictModal(json.data);
    }

    await loadBlockedDates();
  } catch (e) {
    Toast.show("Network error.", "danger");
  }
};

function showConflictModal(data) {
  const modal = document.getElementById("conflict-modal");
  const box = document.getElementById("conflict-modal-box");
  const summary = document.getElementById("conflict-summary");
  const list = document.getElementById("conflict-list");

  summary.textContent = `${data.conflictCount} active appointment${data.conflictCount > 1 ? "s" : ""} found on ${data.blockedDate}.`;

  list.innerHTML = data.conflicts.map(c => `
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

window.closeConflictModal = function () {
  const modal = document.getElementById("conflict-modal");
  const box = document.getElementById("conflict-modal-box");
  gsap.to(box, { scale: 0.95, opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
    onComplete: () => modal.classList.add("hidden")
  });
};

window.unblockDate = async function (id) {
  Modal.open({
    title: "Remove Block",
    message: "Remove this date block? Patients will be able to book again.",
    type: "warning",
    confirmText: "Remove Block",
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/blocked-dates/${id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { RequestVerificationToken: getToken() },
        });
        if ((await res.json()).ok) {
          Toast.show("Date unblocked.", "success");
          await loadBlockedDates();
        }
      } catch { Toast.show("Network error.", "danger"); }
    }
  });
};
