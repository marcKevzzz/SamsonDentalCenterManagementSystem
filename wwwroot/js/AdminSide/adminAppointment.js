import { Toast, Modal } from "../ui.js";

import { AdminStore } from "./adminStore.js";
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

// ── Global Exports (Move to top for inline handlers) ────────────────────────
window.toggleDropdown = (event, btn) => {
  event.stopPropagation();
  document.querySelectorAll(".dropdown-menu").forEach((el) => {
    if (el !== btn.nextElementSibling) el.classList.add("hidden");
  });
  const menu = btn.nextElementSibling;
  menu.classList.toggle("hidden");
};
window.filterTable = () => {
  if (typeof window._internalFilterTable === "function") {
    window._internalFilterTable();
  }
};
window.confirmAppt = (id) => window._confirmAppt && window._confirmAppt(id);
window.updateStatus = (id, s) => window._updateStatus && window._updateStatus(id, s);
window.cancelAppt = (id) => window._cancelAppt && window._cancelAppt(id);
window.deleteAppt = (id) => window._deleteAppt && window._deleteAppt(id);
window.refreshData = () => window._refreshData && window._refreshData();

// ── State ───────────────────────────────────────────────────────────────────
let ALL_APPT = [];
let ALL_DOCS = [];
let ALL_SVCS = [];
let ALL_PATIENTS = [];
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
    { force },
  );
  const docs = await AdminStore.loadData("doctors", "/api/admin/data/doctors", {
    force,
  });
  const svcs = await AdminStore.loadData("services", "/api/services/all", {
    force,
  });
  const pts = await AdminStore.loadData(
    "patients",
    "/api/admin/data/patients",
    { force },
  );

  if (appts) {
    initializeWithData({
      appointments: appts,
      doctors: docs?.data || docs,
      services: svcs,
      patients: pts?.data || pts,
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshData();
  checkUrlParams();
});

async function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const patientId = params.get("patientId");
  const openModal = params.get("openModal");

  if (patientId) {
    if (ALL_PATIENTS && ALL_PATIENTS.length > 0) {
      const patient = ALL_PATIENTS.find((p) => p.id === patientId);
      if (patient) {
        window.selectPatient(patient.id);

        // Auto-assign doctor from past appointments
        if (ALL_APPT && ALL_APPT.length > 0) {
          const pastAppt = ALL_APPT.find(
            (a) => a.patientId === patient.id && a.doctorId,
          );
          if (pastAppt && pastAppt.doctorId) {
            const docEl = document.getElementById("book-doctor");
            if (docEl) docEl.value = pastAppt.doctorId;
          }
        }

        if (openModal === "true") {
          window.openBookModal(true);
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
  ALL_PATIENTS = data.patients || [];

  // Transform appointments to include formatted fields if missing
  ALL_APPT.forEach((a) => {
    if (!a.appointmentDateFormatted) {
      // Parse yyyy-MM-dd without UTC shift
      const [y, m, day] = a.appointmentDate.split('T')[0].split('-').map(Number);
      const d = new Date(y, m - 1, day);
      a.appointmentDateFormatted = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (!a.doctorName && a.doctor) {
      const d = a.doctor;
      const rawProfile = d.profile || d.Profile;
      const p = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
      if (p) {
        const displayTitle = d.title === "Admin" ? "Staff" : d.title || "";
        const fn = p.first_name || p.firstName || "";
        const ln = p.last_name || p.lastName || "";
        a.doctorName = `${displayTitle} ${fn} ${ln}`.trim();
      }
    }
    if (!a.serviceName && a.service) {
      a.serviceName = a.service.name;
    }
  });

  // Explicitly sort by createdAt descending
  ALL_APPT.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  filtered = [...ALL_APPT];

  renderStats(data.stats);
  hydrateDropdowns();
  renderTable();
}

function renderStats(stats) {
  const s = stats || {};
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl(
    "stat-confirmed",
    s.appointmentsConfirmed !== undefined
      ? s.appointmentsConfirmed
      : ALL_APPT.filter((a) => a.status === "confirmed").length,
  );
  setEl(
    "stat-pending",
    s.appointmentsPending !== undefined
      ? s.appointmentsPending
      : ALL_APPT.filter((a) => a.status === "pending").length,
  );
  setEl(
    "stat-waitlist",
    s.appointmentsWaitlist !== undefined
      ? s.appointmentsWaitlist
      : ALL_APPT.filter((a) => a.status === "waitlist").length,
  );
  setEl(
    "stat-cancelled",
    s.appointmentsCancelled !== undefined
      ? s.appointmentsCancelled
      : ALL_APPT.filter((a) => a.status === "cancelled").length,
  );
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
        const displayTitle = d.title === "Admin" ? "Staff" : d.title;
        const name = profile
          ? `${displayTitle} ${profile.first_name || profile.firstName} ${profile.last_name || profile.lastName}`
          : "Unknown";
        const specs = d.specialties
          ? Array.isArray(d.specialties)
            ? d.specialties.join(",")
            : d.specialties
          : "";
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
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-[12px] text-brand/40">No appointments found.</td></tr>`;
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
      if (infoEl)
        infoEl.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} appointments`;
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

  let priorityBadge = "";
  if (appt.isQueueLeader) {
    priorityBadge = `
      <div class="mt-1.5 flex items-center justify-center gap-1">
        <span class="inline-flex items-center px-1.5 py-[2px] rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 tracking-tighter shadow-sm shadow-amber-900/5">
          <svg class="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          Priority #1
        </span>
      </div>`;
  } else if (appt.hasQueueCompetition && status === "pending") {
    priorityBadge = `
      <div class="mt-1.5 flex items-center justify-center gap-1">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          Queue #${appt.queuePosition}
        </span>
      </div>`;
  }

  const role = document.body.dataset.role || "admin";
  const isDoctor = role === "doctor";

  let workflowBtn = "";
  if (!isDoctor) {
    if (status === "pending") {
      workflowBtn = `<button onclick='confirmAppt(${idStr})' class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-sm">Confirm</button>`;
    } else if (status === "confirmed") {
      workflowBtn = `<button onclick='updateStatus(${idStr}, "arrived")' class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-sm">Check-In</button>`;
    } else if (status === "arrived") {
      workflowBtn = `<button onclick='updateStatus(${idStr}, "completed")' class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-sm">Checkout</button>`;
    } else if (status === "waitlist") {
      workflowBtn = `<button onclick='promoteManually(${idStr})' class="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[11px] font-bold hover:bg-orange-600 transition-colors shadow-sm">Promote</button>`;
    }
  }

  const avatarHtml = (() => {
    if (appt.patientAvatarUrl) {
      return `<img src="${appt.patientAvatarUrl}" alt="${appt.patientName}" class="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200" />`;
    }
    const firstName = appt.patientFirstName || "";
    const lastName = appt.patientLastName || "";
    const initials =
      firstName && lastName
        ? (firstName[0] + lastName[0]).toUpperCase()
        : (
            firstName?.[0] ||
            lastName?.[0] ||
            appt.patientName?.[0] ||
            "G"
          ).toUpperCase();
    return `<div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">${initials}</div>`;
  })();
  return `
    <tr class="group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100 last:border-0" onclick='openViewModal(${JSON.stringify(appt).replace(/'/g, "&apos;")})'>
      <td class="px-4 py-4" data-label="Ref ID">
        <div class="flex flex-col">
          <span class="text-[12.5px] font-bold text-brand tracking-tight">${shortId}</span>
          <span class="text-[9px] text-brand/30 font-mono">${appt.id.slice(0, 8)}</span>
        </div>
      </td>
      <td class="px-4 py-4" data-label="Patient">
        <div class="flex items-center gap-3">
          ${avatarHtml}
          <div class="flex flex-col min-w-0">
            <span class="text-[13px] font-bold text-brand truncate">${appt.patientName || (appt.patientFirstName + " " + appt.patientLastName)}</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[10px] text-brand/40 truncate">${appt.patientEmail || "No Email"}</span>
              ${appt.isGuest ? '<span class="px-1 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">Guest</span>' : ""}
            </div>
          </div>
        </div>
      </td>
      <td class="px-4 py-4" data-label="Service & Doctor">
        <div class="flex flex-col">
          <span class="text-[12.5px] font-semibold text-brand/80">${appt.serviceName || "Consultation"}</span>
          <span class="text-[10.5px] text-brand/40 mt-0.5 font-medium">Assigned: ${appt.doctorName || "Pending..."}</span>
        </div>
      </td>
      <td class="px-4 py-4" data-label="Source">
        ${renderSourceBadge(appt.source)}
      </td>
      <td class="px-4 py-4" data-label="Schedule">
        <div class="flex flex-col">
          <span class="text-[12.5px] font-bold text-brand">${appt.appointmentDateFormatted}</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <i class="fa-regular fa-clock text-[10px] text-primary/60"></i>
            <span class="text-[11px] font-medium text-brand/50">${appt.appointmentTime}</span>
          </div>
        </div>
      </td>
      <td class="px-4 py-4 text-center" data-label="Status">
        <div class="flex flex-col items-center">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.classes} uppercase tracking-wide">
            ${config.label}
          </span>
          ${priorityBadge}
        </div>
      </td>
      <td class="px-4 py-4 text-right whitespace-nowrap" data-label="Action">
        <div class="flex items-center justify-end gap-2">
          ${workflowBtn}
          <div class="relative inline-block text-left action-dropdown">
            <button onclick="toggleDropdown(event, this)" class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="dropdown-menu hidden absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div class="py-1">
                <button onclick='openViewModal(${JSON.stringify(appt).replace(/'/g, "&apos;")})' class="w-full text-left px-4 py-2 text-[12px] text-brand hover:bg-slate-50 flex items-center gap-2">
                  <i class="fa-regular fa-eye w-4"></i> View Details
                </button>
                <button onclick='refreshData()' class="w-full text-left px-4 py-2 text-[12px] text-brand hover:bg-slate-50 flex items-center gap-2">
                  <i class="fa-solid fa-rotate w-4"></i> Refresh
                </button>
                ${!isDoctor && (status === "pending" || status === "confirmed") ? `
                <button onclick='cancelAppt(${idStr})' class="w-full text-left px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <i class="fa-solid fa-ban w-4"></i> Cancel
                </button>
                ` : ""}
                ${!isDoctor && (status === "cancelled" || status === "no_show") ? `
                <button onclick='deleteAppt(${idStr})' class="w-full text-left px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <i class="fa-regular fa-trash-can w-4"></i> Delete Record
                </button>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}


function getSourceConfig(source) {
  const s = (source || "online").toLowerCase();
  const role = document.body.dataset.role || "admin";
  const configs = {
    guest: {
      classes: "bg-slate-100 border-slate-200 text-slate-600",
      icon: "fa-user-secret",
      label: "Guest",
    },
    admin: {
      classes: "bg-blue-50 border-blue-100 text-blue-600",
      icon: "fa-shield-halved",
      label: role === "admin" ? "Admin" : "Office",
    },
    walk_in: {
      classes: "bg-amber-50 border-amber-100 text-amber-600",
      icon: "fa-person-walking",
      label: "Walk-in",
    },
    phone: {
      classes: "bg-purple-50 border-purple-100 text-purple-600",
      icon: "fa-phone",
      label: "Phone",
    },
    online: {
      classes: "bg-emerald-50 border-emerald-100 text-emerald-600",
      icon: "fa-globe",
      label: "Online",
    },
  };
  return configs[s] || configs.online;
}

function renderSourceBadge(source) {
  const c = getSourceConfig(source);
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full ${c.classes} text-[10px] font-bold uppercase tracking-wider border shadow-sm">${c.label}</span>`;
}

function renderPaginationBtns(totalPages) {
  const container = document.getElementById("paginationBtns");
  let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-medium rounded-lg border border-slate-200 text-brand/50 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="page-btn px-2.5 py-1 text-[10.5px] font-medium rounded-lg ${i === currentPage ? "bg-primary text-white" : "border border-slate-200 text-brand/50 hover:bg-slate-50"}">${i}</button>`;
  }
  html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-medium rounded-lg border border-slate-200 text-brand/50 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>`;
  container.innerHTML = html;
}

document.addEventListener("click", (e) => {
  const pageBtn = e.target.closest(".page-btn");
  if (!pageBtn || pageBtn.disabled) return;
  currentPage = parseInt(pageBtn.dataset.page);
  renderTable();
});

// ── Table filter ──────────────────────────────────────────────────────────────
window._internalFilterTable = () => {
  const q = document.getElementById("search-input")?.value?.toLowerCase()?.trim() || "";
  const status = document.getElementById("status-filter")?.value || "";
  const date = document.getElementById("date-filter")?.value || "";

  filtered = ALL_APPT.filter((appt) => {
    const fullName = `${appt.patientFirstName || ""} ${appt.patientLastName || ""}`.toLowerCase();
    const otherFullName = `${appt.otherFirstName || ""} ${appt.otherLastName || ""}`.toLowerCase();
    const docName = (appt.doctorName || "").toLowerCase();

    const matchSearch =
      !q ||
      fullName.includes(q) ||
      otherFullName.includes(q) ||
      docName.includes(q) ||
      (appt.patientEmail && appt.patientEmail.toLowerCase().includes(q)) ||
      (appt.serviceName && appt.serviceName.toLowerCase().includes(q)) ||
      (appt.id && appt.id.toLowerCase().includes(q));

    // Split status filter into array to handle comma-separated values
    const statusArray = status
      ? status
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
      : [];
    const matchStatus =
      !status || statusArray.includes(appt.status.toLowerCase());

    const matchDate = !date || (appt.appointmentDate && appt.appointmentDate.split('T')[0] === date);
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
    fn: document.getElementById("book-patient-first-name")?.value || "",
    ln: document.getElementById("book-patient-last-name")?.value || "",
    e: document.getElementById("book-patient-email")?.value || "",
    p: document.getElementById("book-patient-phone")?.value || "",
    s: document.getElementById("book-service")?.value || "",
    d: document.getElementById("book-doctor")?.value || "",
    dt: document.getElementById("book-date")?.value || "",
    t: document.getElementById("book-time")?.value || "",
    nt: document.getElementById("book-notes")?.value || "",
  });
}

window.openBookModal = (skipReset = false) => {
  if (!skipReset) {
    // Reset fields to ensure clean state on open
    const fields = [
      "book-patient-id",
      "book-patient-search",
      "book-patient-first-name",
      "book-patient-last-name",
      "book-patient-email",
      "book-patient-phone",
      "book-service",
      "book-doctor",
      "book-date",
      "book-time",
      "book-notes",
    ];
    fields.forEach((f) => {
      const el = document.getElementById(f);
      if (el) {
        el.value = "";
        if (el.tagName === "INPUT") el.readOnly = false;
      }
    });

    const dropdown = document.getElementById("patient-search-results");
    if (dropdown) dropdown.classList.add("hidden");

    // Add listeners for doctor availability
    const svcEl = document.getElementById("book-service");
    const dateEl = document.getElementById("book-date");
    const timeEl = document.getElementById("book-time");
    const updateDocs = () => {
      const cat = svcEl.selectedOptions[0]?.dataset.category || "";
      const dt = dateEl.value;
      const tm = timeEl.value;
      if (cat && dt && tm) {
        window.fetchAvailableDoctors("book-doctor", cat, dt, tm);
      }
    };
    if (svcEl && !svcEl.hasAttribute("data-bound-avail")) {
      svcEl.setAttribute("data-bound-avail", "true");
      svcEl.addEventListener("change", updateDocs);
      dateEl.addEventListener("change", updateDocs);
      timeEl.addEventListener("change", updateDocs);
    }
  }

  // Bind patient search input
  const searchInput = document.getElementById("book-patient-search");
  if (searchInput && !searchInput.hasAttribute("data-bound")) {
    searchInput.setAttribute("data-bound", "true");
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const dropdown = document.getElementById("patient-search-results");
      if (!q) {
        dropdown.classList.add("hidden");
        return;
      }

      const matches = ALL_PATIENTS.filter(
        (p) =>
          p.firstName?.toLowerCase().includes(q) ||
          p.lastName?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q),
      ).slice(0, 5);

      if (matches.length > 0) {
        dropdown.innerHTML = matches
          .map(
            (p) => `
                  <div class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0" onclick="selectPatient('${p.id}')">
                      <div class="text-[13px] font-bold text-brand">${p.firstName} ${p.lastName}</div>
                      <div class="text-[10px] text-brand/40">${p.email}</div>
                  </div>
              `,
          )
          .join("");
        dropdown.classList.remove("hidden");
      } else {
        dropdown.classList.add("hidden");
      }
    });
  }

  // Bind patient email blur event for auto-assign doctor
  const emailInput = document.getElementById("book-patient-email");
  if (emailInput && !emailInput.hasAttribute("data-bound")) {
    emailInput.setAttribute("data-bound", "true");
    emailInput.addEventListener("blur", () => {
      const email = emailInput.value.trim().toLowerCase();
      if (email && ALL_APPT && ALL_APPT.length > 0) {
        const pastAppt = ALL_APPT.find(
          (a) =>
            a.patientEmail &&
            a.patientEmail.toLowerCase() === email &&
            a.doctorId,
        );
        if (pastAppt && pastAppt.doctorId) {
          const docEl = document.getElementById("book-doctor");
          if (docEl && !docEl.value) {
            // only auto-assign if currently empty
            docEl.value = pastAppt.doctorId;
          }
        }
      }
    });
  }

  initialBookFormState = getBookFormState();
  showModal("book-modal");
};

window.selectPatient = (id) => {
  const p = ALL_PATIENTS.find((x) => x.id === id);
  if (!p) return;

  const fields = {
    "book-patient-id": p.id,
    "book-patient-search": `${p.firstName} ${p.lastName}`,
    "book-patient-first-name": p.firstName,
    "book-patient-last-name": p.lastName,
    "book-patient-email": p.email,
    "book-patient-phone": p.phone || "",
  };

  for (const [fid, val] of Object.entries(fields)) {
    const el = document.getElementById(fid);
    if (el) {
      el.value = val;
      if (
        fid !== "book-patient-search" &&
        fid !== "book-patient-id" &&
        fid !== "book-patient-phone"
      ) {
        el.readOnly = true;
      }
    }
  }

  document.getElementById("patient-search-results").classList.add("hidden");
};

window.clearPatientSelection = () => {
  const fields = [
    "book-patient-id",
    "book-patient-search",
    "book-patient-first-name",
    "book-patient-last-name",
    "book-patient-email",
    "book-patient-phone",
  ];
  fields.forEach((f) => {
    const el = document.getElementById(f);
    if (el) {
      el.value = "";
      el.readOnly = false;
    }
  });
};

window.closeBookModal = () => {
  if (initialBookFormState && getBookFormState() !== initialBookFormState) {
    Modal.open({
      title: "Discard Changes?",
      message:
        "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialBookFormState = getBookFormState();
        closeBookModal();
      },
    });
    return;
  }
  hideModal("book-modal");
};

window.submitBook = async () => {
  const firstName = document
    .getElementById("book-patient-first-name")
    .value.trim();
  const lastName = document
    .getElementById("book-patient-last-name")
    .value.trim();
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

  if (!firstName || !lastName || !email || !svcId || !date || !time) {
    Toast.show("Please fill in all required fields.", "warning");
    return;
  }

  const res = await post("/api/admin/appointments/book", {
    patientId: document.getElementById("book-patient-id").value || null,
    patientFirstName: firstName,
    patientLastName: lastName,
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

// ── VIEW MODAL ───────────────────────────────────────────────────────────────
window.openViewModal = (apptInput) => {
  const appt = getAppt(apptInput);
  if (!appt) return;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "-";
  };

  setEl("view-appt-id", "#APT-" + appt.id.slice(0, 4).toUpperCase());
  setEl("view-patient-name", appt.patientName);
  setEl("view-patient-email", appt.patientEmail);
  setEl("view-patient-phone", appt.patientPhone);
  setEl("view-service", appt.serviceName);
  setEl("view-category", appt.serviceCategory);
  setEl("view-doctor", appt.doctorName || "Unassigned");
  setEl("view-date", appt.appointmentDateFormatted || appt.appointmentDate);
  setEl("view-time", appt.appointmentTime);
  setEl("view-status", appt.status.toUpperCase());
  setEl("view-source", appt.source.toUpperCase());
  setEl("view-notes", appt.notes || "No additional notes.");

  // Status Badge Classes
  const statusEl = document.getElementById("view-status-badge");
  if (statusEl) {
    const status = appt.status.toLowerCase();
    statusEl.innerHTML = `<span id="view-status">${status.toUpperCase()}</span>`;
    statusEl.className =
      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center ";
    if (status === "confirmed" || status === "completed")
      statusEl.className += " bg-emerald-50 text-emerald-600 border-emerald-100";
    else if (status === "pending")
      statusEl.className += " bg-orange-50 text-orange-600 border-orange-100";
    else if (status === "arrived")
      statusEl.className += " bg-blue-50 text-blue-600 border-blue-100";
    else if (status === "cancelled" || status === "no_show")
      statusEl.className += " bg-red-50 text-red-600 border-red-100";
    else
      statusEl.className += " bg-slate-50 text-slate-600 border-slate-100";
  }

  // Handle "Booked For" (IsForOther)
  const otherSection = document.getElementById("view-other-section");
  if (otherSection) {
    if (appt.isForOther || appt.IsForOther) {
      otherSection.classList.remove("hidden");
      const otherName =
        (appt.otherFirstName || appt.OtherFirstName || "") +
        " " +
        (appt.otherLastName || appt.OtherLastName || "");
      document.getElementById("view-other-name").textContent =
        otherName.trim() || "-";
      document.getElementById("view-other-email").textContent =
        appt.otherEmail || appt.OtherEmail || "-";
      document.getElementById("view-other-phone").textContent =
        appt.otherPhone || appt.OtherPhone || "-";

      // Update header to indicate "Booked for Others"
      document.getElementById("view-patient-type-badge").textContent =
        "Managed Profile";
      document.getElementById("view-patient-type-badge").className =
        "text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded ml-2 border border-purple-100";
    } else {
      otherSection.classList.add("hidden");
      document.getElementById("view-patient-type-badge").textContent =
        appt.isGuest ? "Guest" : "Verified Patient";
      document.getElementById("view-patient-type-badge").className =
        `text-[9px] font-bold ${appt.isGuest ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"} px-1.5 py-0.5 rounded ml-2 border`;
    }
  }

  showModal("view-modal");
};

window.closeViewModal = () => hideModal("view-modal");

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
window.fetchAvailableDoctors = async (
  targetId,
  category,
  date,
  time,
  currentId = null,
) => {
  const sel = document.getElementById(targetId);
  if (!sel) return;

  if (!date || !time) {
    sel.innerHTML = '<option value="">Any available specialist</option>';
    sel.disabled = false;
    return;
  }

  sel.innerHTML = '<option value="">Any available specialist</option>';
  sel.disabled = true;

  try {
    const res = await fetch(
      `/api/admin/data/available-doctors?category=${encodeURIComponent(category)}&date=${date}&time=${encodeURIComponent(time)}`,
    );
    const data = await res.json();

    if (data.ok && data.data) {
      data.data.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.name;
        sel.appendChild(opt);
      });
      if (currentId) sel.value = currentId;
    }
  } catch (err) {
    console.error("Failed to fetch available doctors", err);
  } finally {
    sel.disabled = false;
  }
};

window.confirmAppt = async (apptInput) => {
  const appt = getAppt(apptInput);
  document.getElementById("confirm-appt-id").value = appt.id;
  document.getElementById("confirm-modal-message").innerHTML =
    `Confirming appointment for <strong>${appt.patientName}</strong>.<br/><span class="text-[11px] opacity-70">${appt.serviceName} (${appt.serviceCategory})</span>`;

  const docSel = document.getElementById("confirm-doctor");
  const hint = document.getElementById("doctor-hint");

  if (!docSel || !hint) {
    console.warn(
      "Confirm appointment modal elements not found in current view.",
    );
    showModal("confirm-modal");
    return;
  }

  hint.classList.remove("hidden");
  hint.textContent = "Checking specialist availability...";

  await window.fetchAvailableDoctors(
    "confirm-doctor",
    appt.serviceCategory || "",
    appt.appointmentDate,
    appt.appointmentTime,
    appt.doctorId,
  );

  hint.textContent =
    docSel.options.length > 1
      ? `Matching specialists for ${appt.serviceCategory} shown.`
      : "No available specialists found for this slot!";
  showModal("confirm-modal");
};

window.closeConfirmModal = () => hideModal("confirm-modal");

window.submitConfirm = async () => {
  const id = document.getElementById("confirm-appt-id").value;
  let doctorId = document.getElementById("confirm-doctor").value;

  if (!doctorId) {
    // Pick the first available doctor from the dropdown if "Any" is selected
    const docSel = document.getElementById("confirm-doctor");
    if (docSel && (docSel.tagName === 'SELECT' || docSel.options) && docSel.options && docSel.options.length > 1) {
      // Find first option with a value
      for (let i = 0; i < docSel.options.length; i++) {
        if (docSel.options[i].value) {
          doctorId = docSel.options[i].value;
          break;
        }
      }
    }

    if (!doctorId && docSel && docSel.tagName === "SELECT") {
      Toast.show(
        "No available specialists found to confirm this appointment.",
        "warning",
      );
      return;
    }
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
  const titleEl = document.getElementById("edit-modal-title");
  if (titleEl) titleEl.textContent = "Edit Appointment";
  _setupEditModal(appt);
};

window.openRescheduleModal = (apptInput) => {
  const appt = getAppt(apptInput);
  const titleEl = document.getElementById("edit-modal-title");
  if (titleEl) titleEl.textContent = "Reschedule Appointment";
  _setupEditModal(appt);
};

let initialEditFormState = "";
function getEditFormState() {
  return JSON.stringify({
    dt: document.getElementById("edit-date")?.value || "",
    t: document.getElementById("edit-time")?.value || "",
    d: document.getElementById("edit-doctor")?.value || "",
  });
}

function _setupEditModal(appt) {
  document.getElementById("edit-appt-id").value = appt.id;
  document.getElementById("edit-date").value = appt.appointmentDate;
  document.getElementById("edit-time").value = appt.appointmentTime;

  const dateEl = document.getElementById("edit-date");
  const timeEl = document.getElementById("edit-time");
  const updateDocs = () => {
    window.fetchAvailableDoctors(
      "edit-doctor",
      appt.serviceCategory || "",
      dateEl.value,
      timeEl.value,
      appt.doctorId,
    );
  };

  if (!dateEl.hasAttribute("data-bound-avail")) {
    dateEl.setAttribute("data-bound-avail", "true");
    dateEl.addEventListener("change", updateDocs);
    timeEl.addEventListener("change", updateDocs);
  }

  updateDocs();
  showModal("edit-modal");
}

window.closeEditModal = () => {
  if (initialEditFormState && getEditFormState() !== initialEditFormState) {
    Modal.open({
      title: "Discard Changes?",
      message:
        "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialEditFormState = getEditFormState();
        closeEditModal();
      },
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
  document.querySelectorAll(".dropdown-menu").forEach((m) => {
    m.classList.add("hidden");
    m.style.position = ""; // reset fixed style
  });

  if (isHidden) {
    menu.classList.remove("hidden");

    // --- Smart Positioning using Fixed to escape overflow clip ---
    const btnRect = btn.getBoundingClientRect();
    const winH = window.innerHeight;

    menu.style.position = "fixed";
    menu.style.left = `${btnRect.right - menu.offsetWidth}px`;
    menu.style.margin = "0";

    // If it goes off the bottom, flip it to the top
    if (btnRect.bottom + menu.offsetHeight > winH - 20) {
      menu.style.top = `${btnRect.top - menu.offsetHeight - 5}px`;
    } else {
      menu.style.top = `${btnRect.bottom + 5}px`;
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
    const res = await fetch("/api/admin/blocked-dates", {
      credentials: "include",
    });
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
    container.innerHTML =
      '<p class="text-[11px] text-brand/40 italic">No dates are currently blocked.</p>';
    return;
  }
  container.innerHTML = _blockedDates
    .map((b) => {
      const d = new Date(b.blockedDate + "T00:00:00");
      const label = d.toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `
      <div class="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-xl group">
        <div>
          <span class="text-[12px] font-bold text-red-700">${label}</span>
          ${b.reason ? `<span class="text-[10px] text-brand/40 ml-2">— ${b.reason}</span>` : ""}
        </div>
        <button onclick="unblockDate('${b.id}')"
          class="text-[10px] text-red-400 hover:text-red-600 font-bold px-2 py-0.5 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
          Remove
        </button>
      </div>`;
    })
    .join("");
}

window.openBlockDateModal = async function () {
  const modal = document.getElementById("block-date-modal");
  const box = document.getElementById("block-date-modal-box");
  modal.classList.remove("hidden");
  gsap.fromTo(
    box,
    { scale: 0.9, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" },
  );
  await loadBlockedDates();
};

window.closeBlockDateModal = function () {
  const modal = document.getElementById("block-date-modal");
  const box = document.getElementById("block-date-modal-box");
  gsap.to(box, {
    scale: 0.95,
    opacity: 0,
    y: 10,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => {
      modal.classList.add("hidden");
      document.getElementById("block-date-input").value = "";
      document.getElementById("block-date-reason").value = "";
    },
  });
};

window.submitBlockDate = async function () {
  const date = document.getElementById("block-date-input").value;
  const reason = document.getElementById("block-date-reason").value.trim();
  if (!date) {
    Toast.show("Please select a date.", "warning");
    return;
  }

  try {
    const res = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: getToken(),
      },
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

  list.innerHTML = data.conflicts
    .map(
      (c) => `
    <div class="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
      <div>
        <div class="text-[12.5px] font-bold text-brand">${c.patientFirstName} ${c.patientLastName}</div>
        <div class="text-[11px] text-brand/40">${c.serviceName || ""} · ${c.appointmentTime} · <span class="capitalize">${c.status}</span></div>
        <div class="text-[10px] text-brand/40">${c.patientEmail}${c.patientPhone ? " · " + c.patientPhone : ""}</div>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">${c.status}</span>
    </div>`,
    )
    .join("");

  modal.classList.remove("hidden");
  gsap.fromTo(
    box,
    { scale: 0.9, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.7)" },
  );
}

window.closeConflictModal = function () {
  const modal = document.getElementById("conflict-modal");
  const box = document.getElementById("conflict-modal-box");
  gsap.to(box, {
    scale: 0.95,
    opacity: 0,
    y: 10,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => modal.classList.add("hidden"),
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
      } catch {
        Toast.show("Network error.", "danger");
      }
    },
  });
};

// ── Receptionist Calendar View ───────────────────────────────────────────
let calDate = new Date();

window.toggleCalendarView = (btn) => {
    const view = document.getElementById('calendar-view');
    const isShowing = !view.classList.contains('hidden');
    
    if (isShowing) {
        view.classList.add('hidden');
        btn.classList.remove('active', 'text-brand', 'border-brand');
        btn.classList.add('text-slate-500', 'border-transparent');
    } else {
        view.classList.remove('hidden');
        btn.classList.add('active', 'text-brand', 'border-brand');
        btn.classList.remove('text-slate-500', 'border-transparent');
        renderCalendarView();
    }
};

window.shiftCal = (dir) => {
    calDate.setMonth(calDate.getMonth() + dir);
    renderCalendarView();
};

function renderCalendarView() {
    const view = document.getElementById('calendar-view');
    if (!view) return;

    const y = calDate.getFullYear();
    const m = calDate.getMonth();
    const today = new Date();
    today.setHours(0,0,0,0);

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMon = new Date(y, m + 1, 0).getDate();
    const monthName = calDate.toLocaleString('default', { month: 'long' });

    // Group appointments by date for indicators
    const apptsByDate = ALL_APPT.reduce((acc, a) => {
        const d = a.appointmentDate.split('T')[0];
        if (!acc[d]) acc[d] = [];
        acc[d].push(a);
        return acc;
    }, {});

    let cells = Array(firstDay).fill('<div class="h-24 sm:h-32 bg-slate-50/30 border border-slate-100/50"></div>').join('');

    for (let d = 1; d <= daysInMon; d++) {
        const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dt = new Date(y, m, d);
        const dayAppts = apptsByDate[dStr] || [];
        const pendingCount = dayAppts.filter(a => a.status === 'pending').length;
        const isToday = dt.getTime() === today.getTime();
        
        cells += `
            <div class="h-24 sm:h-32 p-2 border border-slate-100 transition-all hover:bg-slate-50/50 relative cursor-pointer group" 
                 onclick="focusDate('${dStr}')">
                <div class="flex items-center justify-between">
                    <span class="text-[12px] font-bold ${isToday ? 'w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center' : 'text-slate-400 group-hover:text-brand'}">${d}</span>
                    ${dayAppts.length > 0 ? `<span class="text-[9px] font-bold text-brand/40">${dayAppts.length} appt${dayAppts.length > 1 ? 's' : ''}</span>` : ''}
                </div>
                
                <div class="mt-2 space-y-1 overflow-hidden">
                    ${dayAppts.slice(0, 2).map(a => `
                        <div class="text-[9px] truncate px-1.5 py-0.5 rounded ${a.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'} font-medium">
                            ${a.appointmentTime.split(' ')[0]} ${a.patientName}
                        </div>
                    `).join('')}
                    ${dayAppts.length > 2 ? `<div class="text-[8px] text-brand/30 font-bold px-1">+${dayAppts.length - 2} more</div>` : ''}
                </div>

                ${pendingCount > 0 ? `<div class="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-orange-500 shadow-sm animate-pulse"></div>` : ''}
            </div>
        `;
    }

    // Fill remaining cells for a clean grid
    const totalCells = Math.ceil((firstDay + daysInMon) / 7) * 7;
    cells += Array(totalCells - (firstDay + daysInMon)).fill('<div class="h-24 sm:h-32 bg-slate-50/30 border border-slate-100/50"></div>').join('');

    view.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <div>
                <h3 class="font-display font-bold text-brand text-lg">${monthName} ${y}</h3>
                <p class="text-[11px] text-brand/40 font-bold uppercase tracking-widest mt-0.5">Clinic Schedule Overview</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="shiftCal(-1)" class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400 transition-all">
                    <i class="fa-solid fa-chevron-left text-[12px]"></i>
                </button>
                <button onclick="calDate = new Date(); renderCalendarView()" class="px-4 h-9 rounded-xl border border-slate-200 text-[11px] font-bold text-brand hover:bg-slate-50 transition-all">Today</button>
                <button onclick="shiftCal(1)" class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400 transition-all">
                    <i class="fa-solid fa-chevron-right text-[12px]"></i>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-7 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `
                <div class="py-3 text-center bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.2em] text-brand/30">
                    ${d}
                </div>
            `).join('')}
            ${cells}
        </div>

        <div class="mt-4 flex items-center gap-4">
            <div class="flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Has Pending Approval</span>
            </div>
            <div class="flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full bg-brand"></div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</span>
            </div>
        </div>
    `;
}

window.focusDate = (date) => {
    const dateInput = document.getElementById('date-filter');
    if (dateInput) {
        dateInput.value = date;
        window.filterTable();
        
        // Scroll to table
        document.getElementById('search-input').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Optional: toast
        Toast.show(`Viewing schedule for ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 'info');
    }
};

window.promoteManually = async (apptInput) => {
  const appt = getAppt(apptInput);
  if (!appt) return;

  Modal.open({
    title: "Promote Patient?",
    message: `Are you sure you want to promote <strong>${appt.patientName}</strong> from the waitlist? This will lock the slot for them and send a promotion email.`,
    confirmText: "Yes, Promote",
    type: "warning",
    onConfirm: async () => {
      try {
        const res = await post(`/api/admin/appointments/${appt.id}/promote`, {});
        if (res.ok !== false) {
          Toast.show("Patient promoted and notified!", "success");
          refreshData(true);
        } else {
          Toast.show(res.error || "Promotion failed.", "danger");
        }
      } catch (err) {
        Toast.show(err.message, "danger");
      }
    },
  });
};
// ── Internal Function Bindings ─────────────────────────────────────────────
window._confirmAppt = confirmAppt;
window._updateStatus = updateStatus;
window._cancelAppt = cancelAppt;
window._deleteAppt = deleteAppt;
window._refreshData = refreshData;

document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-menu").forEach((el) => el.classList.add("hidden"));
});
