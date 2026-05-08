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

    // Modal listeners
    document.getElementById("addPatientBtn")?.addEventListener("click", openAddModal);
    document.getElementById("userModal")?.addEventListener("click", (e) => {
        if (e.target.id === "userModal") closeUserModal();
    });
});

let initialFormState = "";

function getFormState() {
  return JSON.stringify({
    fn: document.getElementById("mFirstName").value,
    ln: document.getElementById("mLastName").value,
    em: document.getElementById("mEmail").value,
    dob: document.getElementById("mDob").value,
    sex: document.getElementById("mSex").value,
    ph: document.getElementById("mPhone").value,
    add: document.getElementById("mAddress").value,
    role: document.getElementById("mRole").value
  });
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Patient";
  document.getElementById("modalUserId").value = "";
  clearModalFields();
  document.getElementById("mRole").value = "patient";
  document.getElementById("mRole").closest('.flex-col').classList.add('hidden'); // Hide role selector
  initialFormState = getFormState();
  showUserModal();
}

function showUserModal() {
  document.getElementById("userModal").classList.remove("hidden");
  document.getElementById("userModal").classList.add("flex");
}

function closeUserModal() {
  if (initialFormState && getFormState() !== initialFormState) {
    Modal.open({
      title: "Discard Changes?",
      message: "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialFormState = getFormState();
        closeUserModal();
      }
    });
    return;
  }
  document.getElementById("userModal").classList.add("hidden");
  document.getElementById("userModal").classList.remove("flex");
}

function clearModalFields() {
  ["mFirstName", "mLastName", "mEmail", "mDob", "mPhone", "mAddress"].forEach(
    (id) => {
      document.getElementById(id).value = "";
    },
  );
  document.getElementById("mSex").value = "";
  document.getElementById("mRole").value = "patient";
}

async function saveUser() {
  const id = document.getElementById("modalUserId").value;
  const isEdit = !!id;
  const saveBtn = document.getElementById("modalSaveBtn");
  const role = document.getElementById("mRole").value;

  const payload = {
    id,
    firstName: document.getElementById("mFirstName").value.trim(),
    lastName: document.getElementById("mLastName").value.trim(),
    email: document.getElementById("mEmail").value.trim(),
    dateOfBirth: document.getElementById("mDob").value || null,
    sex: document.getElementById("mSex").value,
    phoneNumber: document.getElementById("mPhone").value.trim(),
    address: document.getElementById("mAddress").value.trim(),
    role: role
  };

  if (!payload.firstName || !payload.lastName || !payload.email) {
    Toast.show("First name, last name, and email are required.", "danger");
    return;
  }

  if (payload.phoneNumber && !/^09\d{9}$/.test(payload.phoneNumber)) {
    Toast.show("Please enter a valid 11-digit phone number (e.g., 09XXXXXXXXX).", "danger");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    const res = await fetch(`/api/admin/users${isEdit ? `/${id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: getToken(),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.ok) {
        const avatarFile = document.getElementById("mAvatar").files[0];
        if (avatarFile) {
            const userId = result.id || id;
            const formData = new FormData();
            formData.append("file", avatarFile);
            
            await fetch(`/api/admin/users/${userId}/avatar`, {
                method: "POST",
                body: formData,
                headers: { RequestVerificationToken: getToken() }
            });
        }

      initialFormState = getFormState();
      closeUserModal();
      Toast.show(`Patient ${isEdit ? "updated" : "created"}.`, "success");
      await AdminStore.invalidate('patients');
      const data = await AdminStore.loadData('patients', '/api/admin/data/patients');
      if (data) initializeWithData({ patients: data, appointments: ALL_APPT });
    } else {
      Toast.show(result.error ?? "Save failed.", "danger");
    }
  } catch (err) {
    console.error(err);
    Toast.show("An unexpected error occurred.", "danger");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

window.saveUser = saveUser;
window.closeUserModal = closeUserModal;

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
            status: p.isActive ? "Active" : "Inactive",
            isActive: p.isActive,
            reactivationRequested: p.reactivationRequested,
            email: p.email,
            phone: p.phone
        };
    });

    filtered = [...PATIENTS];
    renderTable();
}

async function toggleActive(id, currentActive) {
  const newActive = !currentActive;
  const msg = newActive
    ? "Are you sure you want to activate this account?"
    : "Are you sure you want to deactivate this account? The user will be blocked from signing in.";

  Modal.open({
    title: newActive ? "Activate Account" : "Deactivate Account",
    message: msg,
    type: newActive ? "info" : "warning",
    confirmText: newActive ? "Activate" : "Deactivate",
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newActive),
        });
        const result = await res.json();
        if (result.ok) {
          Toast.show(
            `Account ${newActive ? "activated" : "deactivated"}.`,
            "success",
          );
          await AdminStore.invalidate('patients');
          const data = await AdminStore.loadData('patients', '/api/admin/data/patients');
          if (data) initializeWithData({ patients: data, appointments: ALL_APPT });
        } else {
          Toast.show(result.error || "Operation failed.", "danger");
        }
      } catch (err) {
        Toast.show("An error occurred.", "danger");
      }
    },
  });
}

async function resendInvite(id) {
    try {
        const res = await fetch(`/api/admin/users/${id}/resend-invite`, {
            method: 'POST',
            headers: { RequestVerificationToken: getToken() }
        });
        if (res.ok) {
            Toast.show("Invitation email resent.", "success");
        } else {
            const err = await res.json();
            Toast.show(err.error || "Failed to resend invite.", "danger");
        }
    } catch (err) {
        Toast.show("An unexpected error occurred.", "danger");
    }
}

function getToken() {
  return (
    document.querySelector('input[name="__RequestVerificationToken"]')?.value ??
    ""
  );
}

// ── Event delegation ──────────────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle]");
  const resendBtn = e.target.closest("[data-resend]");

  if (toggleBtn) {
    e.stopPropagation();
    toggleActive(toggleBtn.dataset.toggle, toggleBtn.dataset.active === "true");
  }
  if (resendBtn) {
    e.stopPropagation();
    resendInvite(resendBtn.dataset.resend);
  }
});

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
                    <td colspan="7" class="px-4 py-16 text-center">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <span class="text-[13px] font-medium text-brand/60">No patients found</span>
                            <span class="text-[11px] text-brand/40">Try adjusting your search or filters.</span>
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
                            <a href="${basePath}/Patients/Details?id=${p.id || ''}" class="text-[13.5px] font-semibold text-brand hover:text-primary transition-colors block leading-tight">
                                ${p.firstName} ${p.lastName}
                            </a>
                            <span class="text-[10px] font-mono text-brand/40 uppercase tracking-tight">#P-${(p.id || "00000").slice(0, 5)}</span>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3.5">
                    <div class="flex flex-col">
                        <span class="text-[12.5px] text-brand/70 font-medium">${p.email || "N/A"}</span>
                        <span class="text-[10.5px] text-brand/40 font-mono tracking-tighter">${p.phone || "No Phone"}</span>
                    </div>
                </td>
                <td class="px-4 py-3.5">
                    <div class="flex flex-col">
                        <span class="text-[12.5px] text-brand/60 font-medium">${p.age || "N/A"} yrs</span>
                        <span class="text-[10.5px] text-brand/40 capitalize">${p.sex || "Not Specified"}</span>
                    </div>
                </td>
                <td class="px-4 py-3.5 text-[12.5px] text-brand/50 font-medium whitespace-nowrap">${p.lastVisit}</td>
                <td class="px-4 py-3.5 text-[12.5px] text-brand/50 font-medium">
                    <div class="flex items-center gap-1.5">
                    <div class="w-1.5 h-1.5 rounded-full ${p.assignedDoctor !== "No Record" ? "bg-blue-400" : "bg-slate-300"}"></div>
                    <span class="text-[12.5px] font-medium text-brand/60">${p.assignedDoctor}</span>
                    </div>
                </td>
                <td class="px-4 py-3.5">
                    <div class="flex items-center">
                        ${
                          p.isActive
                            ? `<span class="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wide">Active</span>`
                            : `<div class="flex flex-col gap-0.5">
                               <span class="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 uppercase tracking-wide">Inactive</span>
                               ${p.reactivationRequested ? `<span class="text-[8px] text-primary font-bold animate-pulse">Requesting...</span>` : ""}
                             </div>`
                        }
                    </div>
                </td>
                <td class="px-4 py-3.5 text-right">
                    <div class="inline-flex items-center gap-2">
                        <a href="${basePath}/Patients/Details?id=${p.id}" 
                           class="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 rounded-md transition-all">
                           View Profile
                        </a>
                        ${role === 'doctor' ? '' : `
                        <div class="relative action-dropdown">
                            <button onclick="toggleDropdown(event, this)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand/40 transition-colors">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div class="dropdown-menu hidden absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-lg shadow-brand/5 z-[60] overflow-hidden">
                                <div class="py-1">
                                    <button data-resend="${p.id}" class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors">
                                        <i class="fa-solid fa-paper-plane w-4"></i> Resend Invite
                                    </button>
                                    <button data-toggle="${p.id}" data-active="${p.isActive}" class="w-full text-left px-4 py-2.5 text-[12px] font-medium ${p.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"} flex items-center gap-3 transition-colors">
                                        <i class="fa-solid ${p.isActive ? "fa-user-slash" : "fa-user-check"} w-4"></i> ${p.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </div>
                        </div>`}
                    </div>
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
                    class="p-1.5 rounded-md border border-slate-200 text-brand/50 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                </button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 5 && i > 3 && i < totalPages) {
        if (i === 4) btns += `<span class="px-2 text-slate-300">...</span>`;
        continue;
      }
      btns += `
                    <button onclick="setPage(${i})" 
                        class="min-w-[32px] h-8 text-[11px] font-bold rounded-md transition-all ${i === currentPage ? "bg-primary text-white shadow-sm" : "border border-slate-200 text-brand/50 hover:bg-slate-50"}">
                        ${i}
                    </button>`;
    }

    btns += `
                <button onclick="setPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""} 
                    class="p-1.5 rounded-md border border-slate-200 text-brand/50 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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

window.toggleDropdown = (event, btn) => {
  event.stopPropagation();
  const menu = btn.nextElementSibling;
  const isHidden = menu.classList.contains("hidden");

  // Close all other menus
  document.querySelectorAll(".dropdown-menu").forEach((m) => {
    m.classList.add("hidden");
    m.style.position = ""; 
  });

  if (isHidden) {
    menu.classList.remove("hidden");

    // Smart Positioning using Fixed to escape overflow clip
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
    document.querySelectorAll(".dropdown-menu").forEach((menu) => menu.classList.add("hidden"));
  }
});

// Initial render removed from here as it's now handled by initializeWithData
