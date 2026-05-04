import { AdminStore } from './AdminStore.js';

let PATIENTS = [];
let ALL_APPT = [];
const PAGE_SIZE = 10;
let currentPage = 1;
let filtered = [];

document.addEventListener('DOMContentLoaded', async () => {
    const data = await AdminStore.loadData('patients', '/api/admin/data/patients');
    const appts = await AdminStore.loadData('appointments', '/api/admin/data/appointments');
    if (data) {
        initializeWithData({
            patients: data,
            appointments: appts
        });
    }
});

function initializeWithData(data) {
    const rawPatients = data.patients || [];
    ALL_APPT = data.appointments || [];

    // Map raw profiles to patient view model objects
    PATIENTS = rawPatients.map(p => {
        const patientAppts = ALL_APPT.filter(a => a.patientId === p.id);
        const lastAppt = patientAppts
            .filter(a => a.status === 'arrived' || a.status === 'completed')
            .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0];

        let docName = "No Record";
        if (lastAppt) {
            docName = lastAppt.doctorName || (lastAppt.doctor && lastAppt.doctor.profile ? `Dr. ${lastAppt.doctor.profile.lastName}` : "No Record");
        }

        const dob = p.dob ? new Date(p.dob) : null;
        const age = dob ? (new Date().getFullYear() - dob.getFullYear()) : 0;

        const parts = [p.firstName, p.lastName].filter(Boolean);
        const initials = parts.length > 1 
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
            : (parts[0]?.[0] || "P").toUpperCase();

        return {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            avatarUrl: p.avatarUrl,
            sex: p.sex,
            dob: p.dob,
            age: age,
            initials: initials,
            lastVisit: lastAppt ? new Date(lastAppt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "--",
            assignedDoctor: docName,
            status: "Active"
        };
    });

    filtered = [...PATIENTS];
    renderTable();
}

/**
 * Renders the patient table rows
 */
function renderTable() {
  const tbody = document.getElementById("patients-body");
  const pagBar = document.getElementById("patients-pagination");

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-16 text-center">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <span class="text-[13px] font-medium text-brand-600">No patients found</span>
                            <span class="text-[11px] text-brand-400">Try adjusting your search or filters.</span>
                        </div>
                    </td>
                </tr>`;
    if (pagBar) pagBar.classList.add("hidden");
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);

  const role = document.body.dataset.role || 'admin';
  const basePath = role === 'admin' ? '/Admin' : (role === 'doctor' ? '/Doctor' : '/Receptionist');

  tbody.innerHTML = items
    .map(
      (p) => `
            <tr onclick="window.location.href='${basePath}/Patients/Details?id=${p.id || ''}'" class="group hover:bg-slate-50/80 border-b border-slate-100 transition-colors last:border-0 cursor-pointer">
                <td class="px-4 py-3.5">
                    <div class="flex items-center gap-3">
                        ${
                          p.avatarUrl
                            ? `<img src="${p.avatarUrl}" class="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-slate-200" />`
                            : `<div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold font-display shadow-sm">${p.initials}</div>`
                        }
                        <div>
                            <a href="${basePath}/Patients/Details?id=${p.id || ''}" class="text-[13.5px] font-semibold text-brand-900 hover:text-primary transition-colors block leading-tight">
                                ${p.firstName} ${p.lastName}
                            </a>
                            <span class="text-[10px] font-mono text-brand-400 uppercase tracking-tight">#P-${(p.id || "00000").slice(0, 5)}</span>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3.5">
                    <div class="flex flex-col">
                        <span class="text-[12.5px] text-brand-600 font-medium">${p.age || "N/A"} yrs</span>
                        <span class="text-[10.5px] text-brand-400 capitalize">${p.sex || "Not Specified"}</span>
                    </div>
                </td>
                <td class="px-4 py-3.5 text-[12.5px] text-brand-500 font-medium whitespace-nowrap">${p.lastVisit}</td>
                <td class="px-4 py-3.5 text-[12.5px] text-brand-500 font-medium">
                    <div class="flex items-center gap-1.5">
                    <div class="w-1.5 h-1.5 rounded-full ${p.assignedDoctor !== "No Record" ? "bg-blue-400" : "bg-slate-300"}"></div>
                    <span class="text-[12.5px] font-medium text-brand-600">${p.assignedDoctor}</span>
                    </div>
                </td>
                <td class="px-4 py-3.5">
                    <span class="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wide">
                        ${p.status}
                    </span>
                </td>
                <td class="px-4 py-3.5 text-right">
                    <a href="${basePath}/Patients/Details?id=${p.id}" 
                       class="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 rounded-md transition-all">
                       View Profile
                    </a>
                </td>
            </tr>`,
    )
    .join("");

  renderPagination(totalPages, start);
}

/**
 * Handles the pagination UI
 */
function renderPagination(totalPages, start) {
  const pagBar = document.getElementById("patients-pagination");
  if (!pagBar) return;

  if (filtered.length > PAGE_SIZE) {
    pagBar.classList.remove("hidden");
    pagBar.classList.add("flex");

    document.getElementById("patients-info").textContent =
      `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`;

    let btns = `
                <button onclick="setPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""} 
                    class="p-1.5 rounded-md border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 5 && i > 3 && i < totalPages) {
        if (i === 4) btns += `<span class="px-2 text-slate-300">...</span>`;
        continue;
      }
      btns += `
                    <button onclick="setPage(${i})" 
                        class="min-w-[32px] h-8 text-[11px] font-bold rounded-md transition-all ${i === currentPage ? "bg-primary text-white shadow-sm" : "border border-slate-200 text-brand-500 hover:bg-slate-50"}">
                        ${i}
                    </button>`;
    }

    btns += `
                <button onclick="setPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""} 
                    class="p-1.5 rounded-md border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>`;

    document.getElementById("patients-btns").innerHTML = btns;
  } else {
    pagBar.classList.add("hidden");
  }
}

window.setPage = (p) => {
  currentPage = p;
  renderTable();
  window.scrollTo({ top: 0, behavior: "smooth" }); // Optional: scroll to top of table
};

window.filterPatients = () => {
  const q = document
    .getElementById("patient-search")
    .value.toLowerCase()
    .trim();
  const s = document.getElementById("patient-status").value.toLowerCase();

  filtered = PATIENTS.filter((p) => {
    const matchesQ =
      !q ||
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);
    const matchesS = !s || p.status.toLowerCase() === s;
    return matchesQ && matchesS;
  });

  currentPage = 1;
  renderTable();
};

// Initial render removed from here as it's now handled by initializeWithData
