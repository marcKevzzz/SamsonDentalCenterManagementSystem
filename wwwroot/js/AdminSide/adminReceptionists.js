import { AdminStore } from './AdminStore.js';

let DOCTORS = [];
let RECEPTIONISTS = [];
let _activeRole = "doctor";
let _selectedSpecialties = [];
let _specialtyOptions = [];

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
    document.getElementById('staff-summary-text').textContent = 
        `${activeRecs} receptionists · ${RECEPTIONISTS.length} total`;

    renderStaffCards();
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
                <p class="text-[13px] text-brand-400">No receptionists added yet.</p>
            </div>`;
        return;
    }

    const recHTML = RECEPTIONISTS.map(rec => renderReceptionistCard(rec)).join('');
    container.innerHTML = recHTML;
}

function renderDoctorCard(doc) {
    const firstName = doc.profile?.firstName || "";
    const lastName = doc.profile?.lastName || "";
    const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
    const fullName = doc.profile ? `${doc.title} ${firstName} ${lastName}`.trim() : `${doc.title} (No Profile)`;
    const specList = Array.isArray(doc.specialties) ? doc.specialties : (doc.specialties ? doc.specialties.split(',') : []);
    
    const docJson = JSON.stringify({
        id: doc.id,
        profileId: doc.profileId,
        title: doc.title,
        specialties: specList.join(','),
        bio: doc.bio,
        isActive: doc.isActive,
        availability: doc.availability || []
    }).replace(/'/g, "&apos;");

    return `
      <div data-role="doctor" class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all ${doc.isActive ? "" : "opacity-60"}">
        <div class="flex items-center justify-between px-4 py-1.5 ${doc.isActive ? "bg-blue-50" : "bg-slate-100"}">
          <span class="text-[10px] font-bold uppercase tracking-wider ${doc.isActive ? "text-primary" : "text-slate-400"}"><i class="fa-solid fa-user-doctor mr-1"></i> Doctor</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ${doc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500"}">${doc.isActive ? "Active" : "Inactive"}</span>
        </div>
        <div class="p-5">
          <div class="flex items-start gap-3 mb-4">
            ${doc.profile?.avatarUrl 
                ? `<img src="${doc.profile.avatarUrl}" class="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm" />`
                : `<div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-[15px] font-bold shrink-0 shadow-sm">${initials}</div>`
            }
            <div class="flex-1 min-w-0">
              <div class="font-display font-bold text-brand-900 text-[14px] leading-tight truncate">${fullName}</div>
              <div class="text-[11px] text-brand-400 truncate mt-0.5">${doc.profile?.email || ""}</div>
            </div>
            <button onclick='openStaffModal(${docJson})' class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><i class="fa-solid fa-pen text-[10px]"></i></button>
          </div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            ${specList.slice(0, 3).map(s => `<span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">${s.trim()}</span>`).join('')}
            ${specList.length > 3 ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">+${specList.length - 3} more</span>` : ''}
          </div>
          <p class="text-[11.5px] text-slate-500 leading-tight line-clamp-2">${doc.bio || ""}</p>
          <div class="border-t border-slate-100 pt-2 mt-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-1">Availability</p>
            <div class="flex flex-row gap-1">
                ${(doc.availability || []).length > 0 
                    ? doc.availability.map(a => `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-brand-600 font-medium">${DAY_ABBR[a.dayOfWeek]}</span>`).join('')
                    : '<p class="text-[11px] text-brand-300 italic">No schedule set.</p>'
                }
            </div>
          </div>
        </div>
      </div>`;
}

function renderReceptionistCard(rec) {
    const firstName = rec.profile?.firstName || "";
    const lastName = rec.profile?.lastName || "";
    const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
    const fullName = rec.profile ? `${firstName} ${lastName}`.trim() : `(No Profile)`;
    
    const recJson = JSON.stringify({
        id: rec.id,
        profileId: rec.profileId,
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
              <div class="font-display font-bold text-brand-900 text-[14px] leading-tight truncate">${fullName}</div>
              <div class="text-[11px] text-brand-400 truncate mt-0.5">${rec.profile?.email || ""}</div>
            </div>
            <button onclick='openStaffModal(null, ${recJson})' class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><i class="fa-solid fa-pen text-[10px]"></i></button>
          </div>
          <p class="text-[11.5px] text-slate-500 leading-tight line-clamp-2 mb-3">${rec.bio || ""}</p>
          ${rec.deskLocation ? `<div class="flex flex-wrap gap-1.5"><span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium"><i class="fa-solid fa-location-dot mr-1"></i> Desk: ${rec.deskLocation}</span></div>` : ''}
          <div class="border-t border-slate-100 pt-2 mt-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-1">Availability</p>
            <div class="flex flex-row gap-1">
                ${(rec.availability || []).length > 0 
                    ? rec.availability.map(a => `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-brand-600 font-medium">${DAY_ABBR[a.dayOfWeek]}</span>`).join('')
                    : '<p class="text-[11px] text-brand-300 italic">No schedule set.</p>'
                }
            </div>
          </div>
        </div>
      </div>`;
}

// ── Filter bar ────────────────────────────────────────────────────────────────
window.filterStaff = function (role) {
    document.querySelectorAll("[data-filter-btn]").forEach((btn) => {
        btn.classList.remove("bg-primary", "text-white", "shadow-sm");
        btn.classList.add("bg-white", "text-slate-600");
    });
    const activeBtn = document.querySelector(`[data-filter-btn="${role}"]`);
    if (activeBtn) {
        activeBtn.classList.add("bg-primary", "text-white", "shadow-sm");
        activeBtn.classList.remove("bg-white", "text-slate-600");
    }

    document.querySelectorAll("[data-role]").forEach((card) => {
        if (role === "all" || card.dataset.role === role) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }
    });
};

// ── Specialty dropdown ────────────────────────────────────────────────────────
async function loadSpecialtyOptions() {
    if (_specialtyOptions.length > 0) return;
    try {
        // Updated endpoint to hit the new 'categories' route
        const res = await fetch("/api/services/categories", { credentials: "include" });
        
        if (res.ok) {
            const data = await res.json();
            // Data is already distinct and sorted from the server!
            _specialtyOptions = data ?? [];
        }
    } catch (e) {
        console.error("Failed to load specialties", e);
    }
}

function renderSpecialtyDropdown() {
    const dropdown = document.getElementById("specialtyDropdown");
    dropdown.innerHTML = "";

    if (_specialtyOptions.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-[12px] text-slate-400">No services found.</div>';
        return;
    }

    _specialtyOptions.forEach((name) => {
        const checked = _selectedSpecialties.includes(name);
        const item = document.createElement("label");
        item.className = `flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-[12.5px] ${checked ? "text-primary font-medium" : "text-slate-700"}`;
        item.innerHTML = `
            <input type="checkbox" class="w-3.5 h-3.5 rounded text-primary border-slate-300"
                   ${checked ? "checked" : ""} />
            <span>${name}</span>`;
        item.querySelector("input").addEventListener("change", () => {
            if (checked) {
                _selectedSpecialties = _selectedSpecialties.filter((s) => s !== name);
            } else {
                _selectedSpecialties.push(name);
            }
            renderSpecialtyPills();
            renderSpecialtyDropdown();
            updatePillsVisibility();
        });
        dropdown.appendChild(item);
    });
}

function renderSpecialtyPills() {
    const container = document.getElementById("specialtyPills");
    container.innerHTML = "";
    _selectedSpecialties.forEach((name) => {
        const pill = document.createElement("span");
        pill.className = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium";
        pill.innerHTML = `${name}<button type="button" class="ml-0.5 text-primary/50 hover:text-primary" onclick="removeSpecialty('${name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-xmark text-[8px]"></i></button>`;
        container.appendChild(pill);
    });
}

function updatePillsVisibility() {
    const container = document.getElementById("specialtyPills");
    if (!container) return;
    const hasContent = container.children.length > 0;
    if (hasContent) {
        container.style.display = "block"; 
    } else {
        container.style.display = "none";
    }
}

window.removeSpecialty = function (name) {
    _selectedSpecialties = _selectedSpecialties.filter((s) => s !== name);
    renderSpecialtyPills();
    renderSpecialtyDropdown();
};

window.toggleSpecialtyDropdown = function () {
    const dropdown = document.getElementById("specialtyDropdown");
    dropdown.classList.toggle("hidden");
    updatePillsVisibility();
};

// Close dropdown on outside click
document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("specialtyDropdown");
    const btn = document.getElementById("specialtyDropdownBtn");
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});

// ── Availability editor ───────────────────────────────────────────────────────
let _availabilityCounter = 0;

window.addAvailabilityRow = function (dayOfWeek = 1, startTime = "09:00", endTime = "17:00") {
    _availabilityCounter++;
    const container = document.getElementById("availabilityRows");
    const noMsg = document.getElementById("noAvailabilityMsg");
    noMsg.classList.add("hidden");

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
    if (!container.children.length) {
        document.getElementById("noAvailabilityMsg").classList.remove("hidden");
    }
};

function getAvailabilitySlots() {
    const rows = document.querySelectorAll("#availabilityRows [data-avail-row]");
    return Array.from(rows).map((row) => ({
        day_of_week: parseInt(row.querySelector(".avail-day").value),
        start_time: row.querySelector(".avail-start").value,
        end_time: row.querySelector(".avail-end").value,
        is_active: true
    }));
}

function populateAvailability(slots) {
    const container = document.getElementById("availabilityRows");
    container.innerHTML = "";
    _availabilityCounter = 0;

    if (!slots || slots.length === 0) {
        document.getElementById("noAvailabilityMsg").classList.remove("hidden");
        return;
    }

    document.getElementById("noAvailabilityMsg").classList.add("hidden");
    slots.forEach((s) => addAvailabilityRow(s.dayOfWeek, s.startTime, s.endTime));
}

// ── Role toggle ───────────────────────────────────────────────────────────────
window.switchStaffRole = function (role) {
    _activeRole = role;

    const doctorBtn = document.getElementById("roleBtnDoctor");
    const recBtn    = document.getElementById("roleBtnReceptionist");
    const docFields = document.getElementById("doctorFields");
    const recFields = document.getElementById("receptionistFields");
    const hintLabel = document.getElementById("roleHintLabel");
    const saveBtn   = document.getElementById("staffSaveBtn");

    if (role === "doctor") {
        doctorBtn.className = "flex-1 px-3 py-2 rounded-lg text-[12.5px] font-medium border-2 transition-all border-primary bg-primary/5 text-primary";
        recBtn.className    = "flex-1 px-3 py-2 rounded-lg text-[12.5px] font-medium border-2 transition-all border-slate-200 bg-white text-slate-500 hover:border-slate-300";
        docFields.classList.remove("hidden");
        recFields.classList.add("hidden");
        hintLabel.textContent = "(Doctor / Admin role)";
        saveBtn.textContent   = "Save Doctor";
    } else {
        recBtn.className    = "flex-1 px-3 py-2 rounded-lg text-[12.5px] font-medium border-2 transition-all border-primary bg-primary/5 text-primary";
        doctorBtn.className = "flex-1 px-3 py-2 rounded-lg text-[12.5px] font-medium border-2 transition-all border-slate-200 bg-white text-slate-500 hover:border-slate-300";
        recFields.classList.remove("hidden");
        docFields.classList.add("hidden");
        hintLabel.textContent = "(Receptionist role)";
        saveBtn.textContent   = "Save Receptionist";
    }

    const staffId = document.getElementById("staffId").value;
    if (!staffId) loadAvailableUsers(role);
};

// ── Modal open/close ──────────────────────────────────────────────────────────
let initialStaffFormState = "";

function getStaffFormState() {
    return JSON.stringify({
        r: document.getElementById("staffEditRole").value || _activeRole,
        pid: document.getElementById("staffProfileId").value,
        t: document.getElementById("staffTitle").value,
        b: document.getElementById("staffBio").value,
        dl: document.getElementById("staffDeskLocation").value,
        a: document.getElementById("staffIsActive").checked,
        sp: _selectedSpecialties.join(","),
        av: getAvailabilitySlots().map(s => `${s.dayOfWeek}-${s.startTime}-${s.endTime}`).join(",")
    });
}

window.openStaffModal = async function (doc = null, rec = null) {
    const errorEl = document.getElementById("staffModalError");
    errorEl.classList.add("hidden");

    // Reset all fields
    document.getElementById("staffId").value           = "";
    document.getElementById("staffEditRole").value     = "";
    document.getElementById("staffProfileId").value    = "";
    document.getElementById("staffTitle").value        = "Dr.";
    document.getElementById("staffBio").value          = "";
    document.getElementById("staffDeskLocation").value = "";
    document.getElementById("staffIsActive").checked   = true;
    _selectedSpecialties = [];
    renderSpecialtyPills();
    updatePillsVisibility();

    const profileSelectGroup = document.getElementById("userSelectGroup");
    const roleToggleGroup    = document.getElementById("roleToggleGroup");
    const availSection       = document.getElementById("availabilitySection");

    // Load specialty options from DB
    await loadSpecialtyOptions();
    renderSpecialtyDropdown();

    if (doc) {
        // ── Edit Doctor ───────────────────────────────────────────────────
        document.getElementById("staffModalTitle").innerText    = "Edit Doctor";
        document.getElementById("staffModalSubtitle").innerText = "Update doctor details.";
        document.getElementById("staffId").value        = doc.id ?? "";
        document.getElementById("staffEditRole").value  = "doctor";
        document.getElementById("staffTitle").value     = doc.title ?? "Dr.";
        document.getElementById("staffBio").value       = doc.bio ?? "";
        document.getElementById("staffIsActive").checked = doc.isActive ?? true;

        // Specialties
        if (doc.specialties) {
            _selectedSpecialties = typeof doc.specialties === "string"
                ? doc.specialties.split(",").map((s) => s.trim()).filter(Boolean)
                : Array.isArray(doc.specialties) ? doc.specialties : [];
        }
        renderSpecialtyPills();
        renderSpecialtyDropdown();
        updatePillsVisibility();

        // Availability
        populateAvailability(doc.availability ?? []);
        availSection.classList.remove("hidden");

        profileSelectGroup.classList.add("hidden");
        roleToggleGroup.classList.add("hidden");
        switchStaffRole("doctor");
    } else if (rec) {
        // ── Edit Receptionist ─────────────────────────────────────────────
        document.getElementById("staffModalTitle").innerText    = "Edit Receptionist";
        document.getElementById("staffModalSubtitle").innerText = "Update receptionist details.";
        document.getElementById("staffId").value         = rec.id ?? "";
        document.getElementById("staffEditRole").value   = "receptionist";
        document.getElementById("staffDeskLocation").value = rec.deskLocation ?? "";
        document.getElementById("staffBio").value          = rec.bio ?? "";
        document.getElementById("staffIsActive").checked  = rec.isActive ?? true;

        // Availability
        populateAvailability(rec.availability ?? []);
        availSection.classList.remove("hidden");

        profileSelectGroup.classList.add("hidden");
        roleToggleGroup.classList.add("hidden");
        switchStaffRole("receptionist");
    } else {
        // ── Add new receptionist (Receptionists page — role locked) ────────
        document.getElementById("staffModalTitle").innerText    = "Add Receptionist";
        document.getElementById("staffModalSubtitle").innerText = "Link a user profile as a receptionist.";
        profileSelectGroup.classList.remove("hidden");
        roleToggleGroup.classList.add("hidden");   // locked to receptionist on this page
        populateAvailability([]);
        switchStaffRole("receptionist");
        await loadAvailableUsers("receptionist");
    }

    document.getElementById("staffModal").classList.remove("hidden");
    document.getElementById("staffModal").classList.add("flex");

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
    document.getElementById("staffModal").classList.add("hidden");
    document.getElementById("staffModal").classList.remove("flex");
    document.getElementById("specialtyDropdown")?.classList.add("hidden");
};

// ── Load available users for a role ───────────────────────────────────────────
async function loadAvailableUsers(role) {
    const endpoint = role === "receptionist"
        ? "/api/admin/receptionists/available-users"
        : "/api/admin/doctors/available-users";

    try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            if (data.ok) {
                const select = document.getElementById("staffProfileId");
                select.innerHTML = '<option value="">Select an available user...</option>';
                (data.data ?? []).forEach((u) => {
                    const opt = document.createElement("option");
                    opt.value = u.id;
                    const fn = u.firstName ?? u.first_name ?? "";
                    const ln = u.lastName ?? u.last_name ?? "";
                    const role = u.role ? ` [${u.role}]` : "";
                    opt.text = `${fn} ${ln} (${u.email ?? ""})${role}`.trim();
                    select.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load available users", e);
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
window.saveStaff = async function () {
    const errorEl = document.getElementById("staffModalError");
    errorEl.classList.add("hidden");

    const id        = document.getElementById("staffId").value;
    const editRole  = document.getElementById("staffEditRole").value;
    const profileId = document.getElementById("staffProfileId").value;
    const isActive  = document.getElementById("staffIsActive").checked;

    const role = editRole || _activeRole;

    if (role === "doctor") {
        await saveDoctorPayload(id, profileId, isActive, errorEl);
    } else {
        await saveReceptionistPayload(id, profileId, isActive, errorEl);
    }
};

async function saveDoctorPayload(id, profileId, isActive, errorEl) {
    const title = document.getElementById("staffTitle").value.trim();
    const bio   = document.getElementById("staffBio").value.trim();

    if (!id && !profileId) {
        errorEl.innerText = "Please select a user profile.";
        errorEl.classList.remove("hidden");
        return;
    }
    if (!title) {
        errorEl.innerText = "Title is required.";
        errorEl.classList.remove("hidden");
        return;
    }

    const payload = {
        title,
        specialties: _selectedSpecialties,
        bio,
        isActive,
    };
    if (!id) payload.profileId = profileId;

    try {
        const url    = id ? `/api/admin/doctors/${id}` : "/api/admin/doctors";
        const method = id ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                RequestVerificationToken: getToken(),
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
            errorEl.innerText = data.error || "Failed to save doctor.";
            errorEl.classList.remove("hidden");
            return;
        }

        // Save availability if editing
        if (id) {
            const slots = getAvailabilitySlots();
            await fetch(`/api/admin/doctors/${id}/availability`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    RequestVerificationToken: getToken(),
                },
                body: JSON.stringify(slots),
            });
        }

        initialStaffFormState = getStaffFormState(); // Bypass check
        closeStaffModal();
        Toast.show("Doctor saved successfully.", "success");
        await AdminStore.invalidate('doctors');
        await AdminStore.invalidate('receptionists');
        const docs = await AdminStore.loadData('doctors', '/api/admin/data/doctors');
        const recs = await AdminStore.loadData('receptionists', '/api/admin/data/receptionists'); 
        initializeWithData({ doctors: docs?.data || docs, receptionists: recs?.data || recs });
    } catch (e) {
        console.error("saveDoctorPayload error:", e);
        errorEl.innerText = "Network error. Please try again.";
        errorEl.classList.remove("hidden");
    }
}

async function saveReceptionistPayload(id, profileId, isActive, errorEl) {
    const deskLocation = document.getElementById("staffDeskLocation").value.trim();
    const bio          = document.getElementById("staffBio").value.trim();

    if (!id && !profileId) {
        errorEl.innerText = "Please select a user profile.";
        errorEl.classList.remove("hidden");
        return;
    }

    const payload = { deskLocation, bio, isActive };
    if (!id) payload.profileId = profileId;

    try {
        const url    = id ? `/api/admin/receptionists/${id}` : "/api/admin/receptionists";
        const method = id ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                RequestVerificationToken: getToken(),
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
            errorEl.innerText = data.error || "Failed to save receptionist.";
            errorEl.classList.remove("hidden");
        } else {
            // Save availability if editing
            if (id) {
                const slots = getAvailabilitySlots();
                await fetch(`/api/admin/receptionists/${id}/availability`, {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        RequestVerificationToken: getToken(),
                    },
                    body: JSON.stringify(slots),
                });
            }
            initialStaffFormState = getStaffFormState(); // Bypass check
            closeStaffModal();
            Toast.show("Receptionist saved successfully.", "success");
            await AdminStore.invalidate('receptionists');
            const recs = await AdminStore.loadData('receptionists', '/api/admin/data/receptionists'); 
            initializeWithData({ receptionists: recs?.data || recs });
        }
    } catch (e) {
        console.error("saveReceptionistPayload error:", e);
        errorEl.innerText = "Network error. Please try again.";
        errorEl.classList.remove("hidden");
    }
}

// ── CSRF token helper ────────────────────────────────────────────────────────
function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? "";
}

// Initialized via AdminStore events
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("staffModal")?.addEventListener("click", (e) => {
        if (e.target.id === "staffModal") closeStaffModal();
    });
});
