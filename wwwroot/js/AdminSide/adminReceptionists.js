import { AdminStore } from './AdminStore.js';

let RECEPTIONISTS = [];
let _activeRole = "receptionist";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

document.addEventListener('DOMContentLoaded', async () => {
    const recs = await AdminStore.loadData('receptionists', '/api/admin/data/receptionists'); 
    initializeWithData({
        receptionists: recs?.data || recs
    });
});

function initializeWithData(data) {
    RECEPTIONISTS = data.receptionists || [];
    
    // Auto-update summary
    const activeRecs = RECEPTIONISTS.filter(r => r.isActive).length;
    const summaryEl = document.getElementById('staff-summary-text');
    if (summaryEl) {
        summaryEl.textContent = `${activeRecs} receptionists · ${RECEPTIONISTS.length} total`;
    }

    renderStaffCards();
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
            RequestVerificationToken: getToken()
          },
          body: JSON.stringify(newActive),
        });
        const result = await res.json();
        if (result.ok) {
          Toast.show(`Account ${newActive ? "activated" : "deactivated"}.`, "success");
          await refreshData();
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

async function refreshData() {
    await AdminStore.invalidate('receptionists');
    const recs = await AdminStore.loadData('receptionists', '/api/admin/data/receptionists'); 
    initializeWithData({ receptionists: recs?.data || recs });
}

function renderStaffCards() {
    const container = document.getElementById('staff-container');
    const loading = document.getElementById('staff-loading-state');
    if (loading) loading.remove();

    if (RECEPTIONISTS.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center">
                <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <i class="fa-solid fa-headset text-xl"></i>
                </div>
                <p class="text-[13px] text-brand/40">No receptionists added yet.</p>
            </div>`;
        return;
    }

    const recHTML = RECEPTIONISTS.map(rec => renderReceptionistCard(rec)).join('');
    container.innerHTML = recHTML;
}

function renderReceptionistCard(rec) {
    const firstName = rec.profile?.firstName || "";
    const lastName = rec.profile?.lastName || "";
    const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
    const fullName = rec.profile ? `${firstName} ${lastName}`.trim() : `(No Profile)`;
    
    const recData = JSON.stringify({
        id: rec.id,
        profileId: rec.profileId,
        firstName: rec.profile?.firstName || "",
        lastName: rec.profile?.lastName || "",
        email: rec.profile?.email || "",
        dob: rec.profile?.dob?.split('T')[0] || "",
        sex: rec.profile?.sex || "",
        phone: rec.profile?.phone || "",
        address: rec.profile?.address || "",
        deskLocation: rec.deskLocation,
        bio: rec.bio,
        isActive: rec.isActive,
        availability: rec.availability || []
    }).replace(/'/g, "&apos;");

    return `
      <div data-role="receptionist" class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all ${rec.isActive ? "" : "opacity-60"}">
        <div class="flex items-center justify-between px-4 py-1.5 ${rec.isActive ? "bg-purple-50" : "bg-slate-100"}">
          <span class="text-[10px] font-bold uppercase tracking-wider ${rec.isActive ? "text-purple-600" : "text-slate-400"}"><i class="fa-solid fa-headset mr-1"></i> Receptionist</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${rec.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}">${rec.isActive ? "Active" : "Inactive"}</span>
        </div>
        <div class="p-5">
          <div class="flex items-start gap-3 mb-4">
            ${rec.profile?.avatarUrl 
                ? `<img src="${rec.profile.avatarUrl}" class="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm" />`
                : `<div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-[15px] font-bold shrink-0 shadow-sm">${initials}</div>`
            }
            <div class="flex-1 min-w-0">
              <div class="font-display font-bold text-brand text-[14px] leading-tight truncate">${fullName}</div>
              <div class="text-[11px] text-brand/40 truncate mt-0.5">${rec.profile?.email || ""}</div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick='openStaffModal(${recData})' class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors" title="Edit Profile & Info"><i class="fa-solid fa-pen text-[10px]"></i></button>
                <div class="relative action-dropdown">
                    <button onclick="toggleDropdown(event, this)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-brand/40 hover:text-primary transition-colors">
                        <i class="fa-solid fa-ellipsis-vertical text-[10px]"></i>
                    </button>
                    <div class="dropdown-menu hidden absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-lg shadow-brand/5 z-[60] overflow-hidden">
                        <div class="py-1">
                            <button onclick="resendInvite('${rec.profileId}')" class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors">
                                <i class="fa-solid fa-paper-plane w-4"></i> Resend Invite
                            </button>
                            <button onclick="toggleActive('${rec.profileId}', ${rec.isActive})" class="w-full text-left px-4 py-2.5 text-[12px] font-medium ${rec.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"} flex items-center gap-3 transition-colors">
                                <i class="fa-solid ${rec.isActive ? "fa-user-slash" : "fa-user-check"} w-4"></i> ${rec.isActive ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
          <p class="text-[11.5px] text-slate-500 leading-tight line-clamp-2 mb-3">${rec.bio || ""}</p>
          ${rec.deskLocation ? `<div class="flex flex-wrap gap-1.5"><span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium"><i class="fa-solid fa-location-dot mr-1"></i> Desk: ${rec.deskLocation}</span></div>` : ''}
          <div class="border-t border-slate-100 pt-2 mt-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-brand/40 mb-1">Availability</p>
            <div class="flex flex-row gap-1">
                ${(rec.availability || []).length > 0 
                    ? rec.availability.map(a => `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-brand/60 font-medium">${DAY_ABBR[a.dayOfWeek]}</span>`).join('')
                    : '<p class="text-[11px] text-brand/30 italic">No schedule set.</p>'
                }
            </div>
          </div>
        </div>
      </div>`;
}

// ── Availability editor ───────────────────────────────────────────────────────
let _availabilityCounter = 0;

window.addAvailabilityRow = function (dayOfWeek = 1, startTime = "09:00", endTime = "17:00") {
    _availabilityCounter++;
    const container = document.getElementById("availabilityRows");
    const noMsg = document.getElementById("noAvailabilityMsg");
    if (noMsg) noMsg.classList.add("hidden");

    const row = document.createElement("div");
    row.className = "flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100";
    row.dataset.availRow = _availabilityCounter;
    row.innerHTML = `
        <select class="avail-day flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-[12px] outline-none focus:border-primary/50">
            ${DAY_LABELS.map((d, i) => `<option value="${i}" ${i === dayOfWeek ? "selected" : ""}>${d}</option>`).join("")}
        </select>
        <input type="time" class="avail-start px-2 py-1.5 border border-slate-200 rounded-md text-[12px] outline-none focus:border-primary/50" value="${startTime}" />
        <span class="text-[11px] text-slate-400">to</span>
        <input type="time" class="avail-end px-2 py-1.5 border border-slate-200 rounded-md text-[12px] outline-none focus:border-primary/50" value="${endTime}" />
        <button type="button" onclick="removeAvailabilityRow(${_availabilityCounter})"
            class="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
            <i class="fa-solid fa-trash-can text-[9px]"></i>
        </button>`;
    container.appendChild(row);
};

window.removeAvailabilityRow = function (id) {
    const row = document.querySelector(`[data-avail-row="${id}"]`);
    if (row) row.remove();

    const container = document.getElementById("availabilityRows");
    if (container && !container.children.length) {
        document.getElementById("noAvailabilityMsg")?.classList.remove("hidden");
    }
};

function getAvailabilitySlots() {
    const rows = document.querySelectorAll("#availabilityRows [data-avail-row]");
    return Array.from(rows).map((row) => ({
        dayOfWeek: parseInt(row.querySelector(".avail-day").value),
        startTime: row.querySelector(".avail-start").value,
        endTime: row.querySelector(".avail-end").value,
    }));
}

function populateAvailability(slots) {
    const container = document.getElementById("availabilityRows");
    if (!container) return;
    container.innerHTML = "";
    _availabilityCounter = 0;

    if (!slots || slots.length === 0) {
        document.getElementById("noAvailabilityMsg")?.classList.remove("hidden");
        return;
    }

    document.getElementById("noAvailabilityMsg")?.classList.add("hidden");
    slots.forEach((s) => addAvailabilityRow(s.dayOfWeek, s.startTime, s.endTime));
}

// ── Role toggle (Hidden for Receptionists page) ───────────────────────────────
window.switchStaffRole = function (role) {
    _activeRole = role;
    const docFields = document.getElementById("doctorFields");
    const recFields = document.getElementById("receptionistFields");
    const saveBtn   = document.getElementById("staffSaveBtn");

    if (role === "doctor") {
        docFields?.classList.remove("hidden");
        recFields?.classList.add("hidden");
        if (saveBtn) saveBtn.textContent = "Save Doctor";
    } else {
        recFields?.classList.remove("hidden");
        docFields?.classList.add("hidden");
        if (saveBtn) saveBtn.textContent = "Save Receptionist";
    }
};

// ── Modal open/close ──────────────────────────────────────────────────────────
let initialStaffFormState = "";

function getStaffFormState() {
    return JSON.stringify({
        fn: document.getElementById("staffFirstName").value,
        ln: document.getElementById("staffLastName").value,
        em: document.getElementById("staffEmail").value,
        dob: document.getElementById("staffDob").value,
        sex: document.getElementById("staffSex").value,
        ph: document.getElementById("staffPhone").value,
        ad: document.getElementById("staffAddress").value,
        b: document.getElementById("staffBio").value,
        dl: document.getElementById("staffDeskLocation")?.value || "",
        ia: document.getElementById("staffIsActive").checked,
        av: getAvailabilitySlots().map(s => `${s.dayOfWeek}-${s.startTime}-${s.endTime}`).join(",")
    });
}

window.openStaffModal = async function (data = null) {
    const errorEl = document.getElementById("staffModalError");
    errorEl.classList.add("hidden");

    // Reset all fields
    document.getElementById("staffId").value           = "";
    document.getElementById("staffProfileId").value    = "";
    document.getElementById("staffFirstName").value    = "";
    document.getElementById("staffLastName").value     = "";
    document.getElementById("staffEmail").value        = "";
    document.getElementById("staffDob").value          = "";
    document.getElementById("staffSex").value          = "";
    document.getElementById("staffPhone").value        = "";
    document.getElementById("staffAddress").value      = "";
    document.getElementById("staffBio").value          = "";
    if (document.getElementById("staffDeskLocation")) document.getElementById("staffDeskLocation").value = "";
    document.getElementById("staffIsActive").checked   = true;

    if (data) {
        // ── Edit Mode ─────────────────────────────────────────────────────
        document.getElementById("staffModalTitle").innerText    = "Edit Receptionist Profile";
        document.getElementById("staffId").value        = data.id || "";
        document.getElementById("staffProfileId").value = data.profileId || "";
        document.getElementById("staffFirstName").value = data.firstName || "";
        document.getElementById("staffLastName").value  = data.lastName || "";
        document.getElementById("staffEmail").value     = data.email || "";
        document.getElementById("staffDob").value       = data.dob || "";
        document.getElementById("staffSex").value       = data.sex || "";
        document.getElementById("staffPhone").value     = data.phone || "";
        document.getElementById("staffAddress").value   = data.address || "";
        
        document.getElementById("staffBio").value = data.bio || "";
        if (document.getElementById("staffDeskLocation")) document.getElementById("staffDeskLocation").value = data.deskLocation || "";
        document.getElementById("staffIsActive").checked = data.isActive ?? true;

        populateAvailability(data.availability || []);
    } else {
        // ── Add Mode ──────────────────────────────────────────────────────
        document.getElementById("staffModalTitle").innerText = "Add New Receptionist";
        populateAvailability([]);
        switchStaffRole("receptionist");
    }

    // Role toggle is usually hidden on the specific page
    const roleGroup = document.getElementById("roleToggleGroup");
    if (roleGroup) roleGroup.classList.add("hidden");
    const roleLabel = document.getElementById("roleDisplayLabel");
    if (roleLabel) {
        roleLabel.classList.remove("hidden");
        roleLabel.textContent = "Receptionist";
    }

    const modal = document.getElementById("staffModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    initialStaffFormState = getStaffFormState();
};

window.closeStaffModal = function () {
    if (initialStaffFormState && getStaffFormState() !== initialStaffFormState) {
        Modal.open({
            title: "Discard Changes?",
            message: "You have unsaved changes. Are you sure you want to discard them?",
            type: "warning",
            confirmText: "Discard",
            cancelText: "Keep Editing",
            onConfirm: () => {
                initialStaffFormState = getStaffFormState();
                closeStaffModal();
            }
        });
        return;
    }
    const modal = document.getElementById("staffModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
};

// ── Save ──────────────────────────────────────────────────────────────────────
window.saveStaff = async function () {
    const errorEl = document.getElementById("staffModalError");
    errorEl.classList.add("hidden");

    const profileId = document.getElementById("staffProfileId").value;
    const payload = {
        firstName: document.getElementById("staffFirstName").value.trim(),
        lastName: document.getElementById("staffLastName").value.trim(),
        email: document.getElementById("staffEmail").value.trim(),
        dateOfBirth: document.getElementById("staffDob").value || null,
        sex: document.getElementById("staffSex").value,
        phoneNumber: document.getElementById("staffPhone").value.trim(),
        address: document.getElementById("staffAddress").value.trim(),
        role: "receptionist", // Locked on this page
        bio: document.getElementById("staffBio").value.trim(),
        deskLocation: document.getElementById("staffDeskLocation")?.value.trim() || "",
        isActive: document.getElementById("staffIsActive").checked,
        availability: getAvailabilitySlots()
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
        errorEl.innerText = "First Name, Last Name, and Email are required.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        const url = profileId ? `/api/admin/users/${profileId}` : "/api/admin/users";
        const method = profileId ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                RequestVerificationToken: getToken()
            },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (!res.ok) {
            errorEl.innerText = result.error || "Failed to save staff member.";
            errorEl.classList.remove("hidden");
            return;
        }

        initialStaffFormState = getStaffFormState();
        closeStaffModal();
        Toast.show("Staff member saved successfully.", "success");
        await refreshData();
    } catch (e) {
        console.error(e);
        errorEl.innerText = "Network error. Please try again.";
        errorEl.classList.remove("hidden");
    }
};

function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? "";
}

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

window.toggleActive = toggleActive;
window.resendInvite = resendInvite;
window.refreshStaff = refreshData;
