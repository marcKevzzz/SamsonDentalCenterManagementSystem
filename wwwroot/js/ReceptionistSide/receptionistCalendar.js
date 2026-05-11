import { AdminStore } from '../AdminSide/adminStore.js';

/**
 * Samson Dental Center - Receptionist Live Calendar
 */
const CAL = { year: new Date().getFullYear(), month: new Date().getMonth() };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

let APPOINTMENTS = [];
let SELECTED_DATE = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initCalendar();
});

async function initCalendar() {
    const widget = document.getElementById('receptionistCalendarWidget');
    if (widget) widget.setAttribute('data-loading', 'true');
    renderCalendar();

    APPOINTMENTS = await AdminStore.loadData('appointments', '/api/admin/data/appointments');
    if (widget) widget.setAttribute('data-loading', 'false');
    renderCalendar();
    
    // Listen for real-time updates
    window.addEventListener('admin:appointments:updated', async () => {
        if (widget) widget.setAttribute('data-loading', 'true');
        renderCalendar();

        APPOINTMENTS = await AdminStore.loadData('appointments', '/api/admin/data/appointments', { force: true });
        
        if (widget) widget.setAttribute('data-loading', 'false');
        renderCalendar();
        if (SELECTED_DATE) renderDayView(SELECTED_DATE);
    });
}

function renderCalendar() {
    const widget = document.getElementById('receptionistCalendarWidget');
    if (!widget) return;

    const isLoading = widget.getAttribute('data-loading') === 'true';
    const today = new Date();
    const { year: y, month: m } = CAL;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMon = new Date(y, m + 1, 0).getDate();

    let cells = Array(firstDay).fill("<div></div>").join("");

    if (isLoading) {
        for (let i = 0; i < 35 - firstDay; i++) {
            cells += `<div class="h-12 w-full rounded-xl bg-slate-50 animate-pulse border border-slate-100"></div>`;
        }
    } else {
        for (let d = 1; d <= daysInMon; d++) {
            const dstr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dt = new Date(y, m, d);
            const isToday = dt.toDateString() === today.toDateString();
            const isSel = SELECTED_DATE === dstr;
            
            // Count appointments for this day
            const dayAppts = APPOINTMENTS.filter(a => a.appointmentDate.split('T')[0] === dstr);
            const pendingCount = dayAppts.filter(a => a.status.toLowerCase() === 'pending').length;
            const totalCount = dayAppts.length;

            let cls = "cal-day ";
            if (isSel) cls += "selected ";
            if (isToday) cls += "today ";

            cells += `
                <button type="button" class="${cls} relative flex flex-col items-center justify-center h-12 w-full rounded-xl hover:bg-slate-200 transition-all"
                    onclick="selectDate('${dstr}')">
                    <span class="text-[13px] font-bold ${isSel ? 'text-white' : 'text-brand'}">${d}</span>
                    ${pendingCount > 0 ? `<span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>` : ''}
                    ${totalCount > 0 ? `<span class="text-[8px] font-bold ${isSel ? 'text-white/60' : 'text-brand/30'} mt-0.5">${totalCount}</span>` : ''}
                </button>`;
        }
    }

    widget.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <button onclick="shiftReceptionistCal(-1)" type="button"
                class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-all bg-white cursor-pointer shadow-sm">
                <i class="fa-solid fa-chevron-left text-[11px]"></i>
            </button>
            <div class="text-center">
                <span class="font-display font-bold text-[14px] text-brand block">${MONTHS[m]}</span>
                <span class="text-[10px] font-bold text-brand/30 uppercase tracking-widest">${y}</span>
            </div>
            <button onclick="shiftReceptionistCal(1)" type="button"
                class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-all bg-white cursor-pointer shadow-sm">
                <i class="fa-solid fa-chevron-right text-[11px]"></i>
            </button>
        </div>
        <div class="grid grid-cols-7 mb-2">
            ${DAYS.map(d => `<div class="text-center font-display text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1">
            ${cells}
        </div>
        <div class="mt-6 flex items-center gap-4 pt-4 border-t border-slate-100">
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                <span class="text-[10px] font-bold text-brand/40 uppercase tracking-tight">Pending Approval</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                <span class="text-[10px] font-bold text-brand/40 uppercase tracking-tight">Appt Count</span>
            </div>
        </div>`;
}

window.shiftReceptionistCal = function(dir) {
    CAL.month += dir;
    if (CAL.month > 11) { CAL.month = 0; CAL.year++; }
    if (CAL.month < 0) { CAL.month = 11; CAL.year--; }
    renderCalendar();
}

window.selectDate = function(dateStr) {
    SELECTED_DATE = dateStr;
    renderCalendar();
    renderDayView(dateStr);
}

function renderDayView(dateStr) {
    const view = document.getElementById('receptionistDayView');
    if (!view) return;

    const dayAppts = APPOINTMENTS.filter(a => a.appointmentDate.split('T')[0] === dateStr);
    const pending = dayAppts.filter(a => a.status.toLowerCase() === 'pending');
    
    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (dayAppts.length === 0) {
        view.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center py-12 px-6 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 mb-3 shadow-sm">
                    <i class="fa-solid fa-calendar-xmark text-lg"></i>
                </div>
                <h4 class="text-[14px] font-bold text-brand">${formattedDate}</h4>
                <p class="text-[12px] text-brand/40 mt-1">No appointments scheduled for this day.</p>
            </div>`;
        return;
    }

    view.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="mb-4 flex items-center justify-between">
                <div>
                    <h4 class="text-[15px] font-bold text-brand">${formattedDate}</h4>
                    <p class="text-[11px] text-brand/40 font-medium uppercase tracking-wider">${dayAppts.length} Total · ${pending.length} Pending</p>
                </div>
            </div>
            
            <div class="space-y-2 overflow-y-auto pr-2 max-h-[400px]">
                ${dayAppts.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)).map(appt => {
                    const statusColors = {
                        'pending': 'bg-orange-50 text-orange-600 border-orange-100',
                        'confirmed': 'bg-blue-50 text-blue-600 border-blue-100',
                        'arrived': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        'completed': 'bg-slate-50 text-slate-400 border-slate-100',
                        'cancelled': 'bg-rose-50 text-rose-600 border-rose-100'
                    };
                    const cls = statusColors[appt.status.toLowerCase()] || 'bg-slate-50 text-slate-500';
                    
                    return `
                        <div class="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
                            onclick='openViewModal(${JSON.stringify(appt).replace(/'/g, "&apos;")})'>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[10px] font-bold ${cls} px-2 py-0.5 rounded-full border uppercase tracking-wider">${appt.status}</span>
                                <span class="text-[11px] font-bold text-brand group-hover:text-primary transition-colors">${appt.appointmentTime}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                    ${appt.patientProfile?.avatarUrl 
                                        ? `<img src="${appt.patientProfile.avatarUrl}" class="w-full h-full object-cover" />`
                                        : `<span class="text-[10px] font-bold text-slate-400">${appt.patientName[0]}</span>`}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="text-[12.5px] font-bold text-brand truncate">${appt.patientName}</div>
                                    <div class="text-[10.5px] text-brand/40 truncate">${appt.serviceName}</div>
                                </div>
                                <div class="text-slate-300 group-hover:text-primary transition-colors">
                                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

// ── Modal Logic ──────────────────────────────────────────────────────────────
window.openViewModal = function(appt) {
    if (!appt) return;
    const modal = document.getElementById('view-modal');
    if (!modal) return;

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
    setEl("view-date", appt.appointmentDateFormatted || appt.appointmentDate.split('T')[0]);
    setEl("view-time", appt.appointmentTime);
    setEl("view-status", appt.status.toUpperCase());
    setEl("view-source", appt.source.toUpperCase());
    setEl("view-notes", appt.notes || "No additional notes.");

    // Status Badge
    const statusEl = document.getElementById("view-status-badge");
    if (statusEl) {
        const status = appt.status.toLowerCase();
        statusEl.className = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center ";
        if (status === "confirmed" || status === "completed") statusEl.className += "bg-emerald-50 text-emerald-600 border-emerald-100";
        else if (status === "pending") statusEl.className += "bg-orange-50 text-orange-600 border-orange-100";
        else if (status === "arrived") statusEl.className += "bg-blue-50 text-blue-600 border-blue-100";
        else if (status === "cancelled") statusEl.className += "bg-red-50 text-red-600 border-red-100";
        else statusEl.className += "bg-slate-50 text-slate-600 border-slate-100";
    }

    // Managed Profile
    const otherSection = document.getElementById("view-other-section");
    const typeBadge = document.getElementById("view-patient-type-badge");
    if (otherSection) {
        if (appt.isForOther) {
            otherSection.classList.remove("hidden");
            setEl("view-other-name", (appt.otherFirstName || "") + " " + (appt.otherLastName || ""));
            setEl("view-other-email", appt.otherEmail);
            setEl("view-other-phone", appt.otherPhone);
            if (typeBadge) {
                typeBadge.textContent = "Managed Profile";
                typeBadge.className = "text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded ml-2 border border-purple-100 uppercase tracking-tight";
            }
        } else {
            otherSection.classList.add("hidden");
            if (typeBadge) {
                typeBadge.textContent = appt.isGuest ? "Guest" : "Verified Patient";
                typeBadge.className = `text-[9px] font-bold ${appt.isGuest ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"} px-1.5 py-0.5 rounded ml-2 border uppercase tracking-tight`;
            }
        }
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        const box = document.getElementById('view-modal-box');
        if (box) { box.classList.remove('scale-95', 'opacity-0'); box.classList.add('scale-100', 'opacity-100'); }
    }, 10);
};

window.closeViewModal = function() {
    const box = document.getElementById('view-modal-box');
    const modal = document.getElementById('view-modal');
    if (box) { box.classList.add('scale-95', 'opacity-0'); box.classList.remove('scale-100', 'opacity-100'); }
    setTimeout(() => { if (modal) modal.classList.add('hidden'); }, 300);
};
