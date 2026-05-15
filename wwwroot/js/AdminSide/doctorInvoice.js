
import { AdminStore } from './adminStore.js';

let addedItems = [];
let ARRIVED_APPTS = [];
let RECENT_TREATMENTS = [];
let SERVICES = [];
let TOOTH_DATA = {}; // Global tooth status for current patient

async function refreshData(force = false) {
    const appts    = await AdminStore.loadData('appointments', '/api/admin/data/appointments', { force });
    const treatments = await AdminStore.loadData('treatments', '/api/admin/data/treatments', { force });
    // Always force-fresh services so price is never stale from a pre-auth-fix cache
    const services = await AdminStore.loadData('services', '/api/services/all', { force: true });
    
    initializeWithData({
        appointments: appts,
        treatments: treatments,
        services: services
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    refreshData();

    // Discount input handler
    const discountInput = document.getElementById('inv-discount-input');
    if (discountInput) {
        discountInput.addEventListener('input', calculateTotals);
    }
});

// Listen for SignalR updates
window.addEventListener("admin:appointments:updated", (e) => {
    console.log("Real-time Appt update (Doctor Treatment)");
    refreshData(true);
});

window.addEventListener("admin:treatments:updated", (e) => {
    console.log("Real-time Treatment update (Doctor Treatment)");
    refreshData(true);
});

function initializeWithData(data) {
    ARRIVED_APPTS = data.appointments?.filter(a => a.status === 'arrived') || [];
    RECENT_TREATMENTS = data.treatments || [];
    SERVICES = data.services || [];

    // Filter by doctor strictly
    const doctorRecordId = document.getElementById('inv-doctor-id')?.value;
    const staffRole = document.getElementById('inv-staff-role')?.value?.toLowerCase();

    if (staffRole === 'doctor') {
        if (doctorRecordId) {
            // Doctors ONLY see their assigned arrived patients
            ARRIVED_APPTS = ARRIVED_APPTS.filter(a => a.doctorId === doctorRecordId);
            // Doctors ONLY see their own treatments
            RECENT_TREATMENTS = RECENT_TREATMENTS.filter(i => i.doctorId === doctorRecordId);
        } else {
            // Edge case: User is a doctor but has no record in doctors table (shouldn't happen)
            ARRIVED_APPTS = [];
            RECENT_TREATMENTS = [];
        }
    } else if (staffRole === 'admin') {
        // Admins see all recent treatments
        // But for Arrived Patients (Create Invoice), they only see those assigned to them IF they have a doctor record
        if (doctorRecordId) {
            ARRIVED_APPTS = ARRIVED_APPTS.filter(a => a.doctorId === doctorRecordId);
        } else {
            // Admin with no doctor record sees NO arrived patients (matches "dont show create invoice card on admin if its not for him")
            ARRIVED_APPTS = [];
        }
        // RECENT_TREATMENTS remains unfiltered for Admins
    } else {
        // Other roles (Receptionist, etc.)
        ARRIVED_APPTS = [];
        RECENT_TREATMENTS = RECENT_TREATMENTS; // Usually they see all
    }

    hydrateUI();
}

function hydrateUI() {
    // 1. Update Arrived Summary
    const arrivedCountEl = document.getElementById('arrived-count');
    if (arrivedCountEl) arrivedCountEl.textContent = `Waiting: ${ARRIVED_APPTS.length}`;

    // 2. Render Arrived Cards
    const cardContainer = document.getElementById('arrived-patients-container');
    const loadingArrived = document.getElementById('arrived-loading');
    if (loadingArrived) loadingArrived.remove();

    if (ARRIVED_APPTS.length === 0) {
        cardContainer.innerHTML = `
            <div class="col-span-full py-8 text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <i class="fa-solid fa-chair text-slate-200 text-2xl"></i>
                </div>
                <p class="text-[13px] text-brand/40 font-medium">No arrived patients at the moment.</p>
            </div>`;
    } else {
        cardContainer.innerHTML = ARRIVED_APPTS.map(appt => `
            <div class="bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-lg shadow-amber-900/5 relative group hover:border-amber-300 transition-all cursor-pointer"
                 onclick="openCreateInvoiceWithPreselect('${appt.id}')">
                <div class="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase">Arrived</div>
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-2xl overflow-hidden shadow-sm">
                        ${appt.patientProfile?.avatarUrl 
                            ? `<img src="${appt.patientProfile.avatarUrl}" class="w-full h-full object-cover" />`
                            : (() => {
                                const fn = appt.patientFirstName || '';
                                const ln = appt.patientLastName || '';
                                const initials = (fn && ln) 
                                    ? (fn[0] + ln[0]).toUpperCase() 
                                    : (fn?.[0] || ln?.[0] || appt.patientName?.[0] || 'P').toUpperCase();
                                return `<div class="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-lg">${initials}</div>`;
                              })()
                        }
                    </div>
                    <div>
                        <h4 class="text-[15px] font-bold text-brand">${appt.patientName}</h4>
                        <p class="text-[11px] text-brand/40 font-medium">${appt.serviceName}</p>
                    </div>
                </div>
                <div class="space-y-3 mb-5">
                    <div class="flex items-center gap-2 text-[12px] text-brand/60"><i class="fa-solid fa-clock opacity-40 w-4"></i>Scheduled: ${appt.appointmentTime}</div>
                    <div class="flex items-center gap-2 text-[12px] text-brand/60"><i class="fa-solid fa-file-invoice opacity-40 w-4"></i>Status: <span class="font-bold text-amber-600 uppercase text-[10px]">Ready for Treatment</span></div>
                </div>
                <button class="w-full py-3 bg-brand text-white rounded-xl text-[12px] font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center">Record Treatment</button>
            </div>`).join('');
    }

    // 3. Render Recent Treatments
    const invoiceTbody = document.getElementById('invoices-table-body');
    const loadingInvoices = document.getElementById('invoices-loading');
    if (loadingInvoices) loadingInvoices.closest('tr')?.remove();

    if (RECENT_TREATMENTS.length === 0) {
        invoiceTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-20 text-center"><div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100"><i class="fa-solid fa-tooth text-slate-200 text-2xl"></i></div><p class="text-[13px] text-brand/40 font-medium">No treatment records found yet.</p></td></tr>`;
    } else {
        invoiceTbody.innerHTML = RECENT_TREATMENTS.map(treat => {
            const date = new Date(treat.createdAt);
            const statusClass = treat.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : treat.status === 'planned' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100';
            return `
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="text-[13px] font-bold text-brand">${date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                        <div class="text-[10px] text-brand/40">${date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full overflow-hidden shadow-sm bg-slate-100">
                                ${treat.patientAvatarUrl 
                                    ? `<img src="${treat.patientAvatarUrl}" class="w-full h-full object-cover" />`
                                    : (() => {
                                        const fn = treat.patientFirstName || '';
                                        const ln = treat.patientLastName || '';
                                        const initials = (fn && ln) 
                                            ? (fn[0] + ln[0]).toUpperCase() 
                                            : (fn?.[0] || ln?.[0] || treat.patientName?.[0] || 'P').toUpperCase();
                                        return `<div class="w-full h-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">${initials}</div>`;
                                      })()
                                }
                            </div>
                            <div>
                                <div class="text-[13px] font-bold text-brand">${treat.patientName || 'Unknown Patient'}</div>
                                <div class="text-[10px] text-brand/40">#${treat.id.slice(0, 8)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-brand/60 font-medium">${treat.serviceName}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="text-[13px] font-bold text-brand">₱${treat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-3 py-1 ${statusClass} border rounded-full text-[10px] font-bold uppercase tracking-wider">${treat.status}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="openViewTreatmentModal('${treat.id}')" title="View Treatment Notes" class="w-8 h-8 rounded-lg border border-slate-100 text-brand/40 hover:text-brand hover:border-brand/20 transition-all"><i class="fa-solid fa-notes-medical text-xs"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    // 4. Update Modal Selects
    const patientSelect = document.getElementById('inv-patient');
    if (patientSelect) {
        patientSelect.innerHTML = '<option value="">Select arrived patient…</option>' + ARRIVED_APPTS.map(appt => {
            const svc = SERVICES.find(s => s.id === appt.serviceId);
            const [y, m, d] = appt.appointmentDate.split('T')[0].split('-').map(Number);
            const dObj = new Date(y, m - 1, d);
            const dStr = dObj.toLocaleDateString('en-PH', { month: 'short', day: '2-digit' });
            return `<option value="${appt.id}" data-name="${appt.patientName}" data-patientid="${appt.patientId}" data-doctorid="${appt.doctorId}" data-service="${appt.serviceName}" data-serviceid="${appt.serviceId}" data-price="${svc?.price || 0}">${appt.patientName} — ${appt.serviceName} (${dStr})</option>`;
        }).join('');

        // Re-apply pre-select if pending
        const preselectApptId = document.getElementById('inv-preselect-appt')?.value;
        if (preselectApptId && patientSelect.querySelector(`option[value="${preselectApptId}"]`)) {
            patientSelect.value = preselectApptId;
            patientSelect.dispatchEvent(new Event('change'));
            openCreateInvoice();
            document.getElementById('inv-preselect-appt').value = ""; // Clear after use
        }
    }

    const serviceSelect = document.getElementById('inv-service-select');
    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Choose service…</option>' + SERVICES.map(svc => `
            <option value="${svc.id}" data-name="${svc.name}" data-price="${svc.price}">${svc.name} — ₱${svc.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</option>
        `).join('');
    }

    // Re-attach patient select change handler
    if (patientSelect) {
        patientSelect.addEventListener('change', () => {
            const option = patientSelect.options[patientSelect.selectedIndex];
            if (!option || !option.value) return;

            const serviceName = option.getAttribute('data-service');
            const serviceId   = option.getAttribute('data-serviceid');

            // Re-lookup price from live SERVICES array — never trust baked-in data-price
            const liveSvc = SERVICES.find(s => s.id === serviceId);
            const servicePrice = liveSvc ? parseFloat(liveSvc.price) : 0;

            if (serviceId && addedItems.length === 0) {
                addServiceItemManual(serviceId, serviceName, servicePrice, 1, true); // silent=true: no toast on auto-add
            }

            // Fetch tooth chart when patient changes
            const patientId = option.getAttribute('data-patientid');
            if (patientId) {
                fetchPatientToothChart(patientId);
            }
        });
    }
}

async function fetchPatientToothChart(patientId) {
    try {
        const res = await fetch(`/api/doctor/tooth-chart/${patientId}`);
        const result = await res.json();
        if (result.ok) {
            TOOTH_DATA = {};
            result.data.forEach(ts => {
                TOOTH_DATA[ts.toothNumber] = ts.status;
            });
            // If modal is open and on treatment tab, re-render
            const panel = document.getElementById('panel-treatment');
            if (panel && !panel.classList.contains('hidden')) {
                renderTreatmentForms();
            }
        }
    } catch (err) {
        console.error("Failed to fetch tooth chart:", err);
    }
}

/** ── UI CONTROLS ─────────────────────────────────────────────────────────── */

window.openCreateInvoice = function() {
    const modal = document.getElementById('create-invoice-modal');
    const box = document.getElementById('create-invoice-box');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        box.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

window.closeCreateInvoice = function() {
    const modal = document.getElementById('create-invoice-modal');
    const box = document.getElementById('create-invoice-box');
    
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        resetInvoiceForm();
    }, 300);
}

function resetInvoiceForm() {
    addedItems = [];
    renderItemsTable();
    calculateTotals();
    const patientSelect = document.getElementById('inv-patient');
    if (patientSelect) patientSelect.selectedIndex = 0;
    const notes = document.getElementById('inv-notes');
    if (notes) notes.value = '';
    const discount = document.getElementById('inv-discount-input');
    if (discount) discount.value = '0';
    // Vitals moved to medical info
    switchTab('billing');
}

window.switchTab = function(tab) {
    const billing = document.getElementById('panel-billing');
    const treatment = document.getElementById('panel-treatment');
    const tabB = document.getElementById('tab-billing');
    const tabT = document.getElementById('tab-treatment');
    
    const nextBtn = document.getElementById('inv-next-btn');
    const backBtn = document.getElementById('inv-back-btn');
    const submitBtn = document.getElementById('inv-submit-btn');

    if (tab === 'billing') {
        billing.classList.remove('hidden');
        treatment.classList.add('hidden');
        tabB.classList.add('text-primary', 'border-primary');
        tabB.classList.remove('text-slate-400', 'border-transparent');
        tabT.classList.remove('text-primary', 'border-primary');
        tabT.classList.add('text-slate-400', 'border-transparent');
        
        nextBtn.classList.remove('hidden');
        backBtn.classList.add('hidden');
        submitBtn.classList.add('hidden');
    } else {
        // Validation: Ensure patient and items exist
        const patientId = document.getElementById('inv-patient').value;
        if (!patientId) {
            showToast("Please select a patient first.", "error");
            return;
        }
        if (addedItems.length === 0) {
            showToast("Please add at least one service.", "error");
            return;
        }

        // Check Medical Info
        checkMedicalInfo(patientId);

        billing.classList.add('hidden');
        treatment.classList.remove('hidden');
        tabT.classList.add('text-primary', 'border-primary');
        tabT.classList.remove('text-slate-400', 'border-transparent');
        tabB.classList.remove('text-primary', 'border-primary');
        tabB.classList.add('text-slate-400', 'border-transparent');

        nextBtn.classList.add('hidden');
        backBtn.classList.remove('hidden');
        submitBtn.classList.remove('hidden');

        renderTreatmentForms();
    }
}

async function checkMedicalInfo(patientId) {
    const res = await fetch(`/api/doctor/medical-info/${patientId}`);
    const result = await res.json();
    
    const medContainer = document.getElementById('medical-info-check-container');
    if (!medContainer) return;

    const info = result.data;
    // Show form only if record doesn't exist at all
    const isMissing = !result.exists;

    if (isMissing) {
        const allergies = info?.allergiesJson ? JSON.parse(info.allergiesJson).join(', ') : '';
        
        medContainer.innerHTML = `
            <div class="p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl mb-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                        <i class="fa-solid fa-file-medical text-lg"></i>
                    </div>
                    <div>
                        <h6 class="text-[14px] font-bold text-brand leading-tight">${result.exists ? 'Incomplete' : 'Missing'} Medical Information</h6>
                        <p class="text-[11px] text-brand/40">Please complete the patient's medical profile before submitting treatments.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Blood Type</label>
                        <select id="med-blood" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none bg-white">
                            <option value="">Unknown</option>
                            <option value="A+" ${info?.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                            <option value="A-" ${info?.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                            <option value="B+" ${info?.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                            <option value="B-" ${info?.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                            <option value="O+" ${info?.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                            <option value="O-" ${info?.bloodType === 'O-' ? 'selected' : ''}>O-</option>
                            <option value="AB+" ${info?.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                            <option value="AB-" ${info?.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2 pt-4">
                        <input type="checkbox" id="med-smoker" class="w-4 h-4 rounded border-slate-300 text-primary" ${info?.isSmoker ? 'checked' : ''} />
                        <label for="med-smoker" class="text-[12px] font-bold text-brand/60">Is Smoker?</label>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Height (cm)</label>
                        <input type="number" id="med-height" step="0.1" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none bg-white" placeholder="0.0" value="${info?.height || ''}" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Weight (kg)</label>
                        <input type="number" id="med-weight" step="0.1" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none bg-white" placeholder="0.0" value="${info?.weight || ''}" />
                    </div>
                </div>
                <div class="mt-4">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Known Allergies</label>
                    <textarea id="med-allergies" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none resize-none bg-white" rows="2" placeholder="List any drug or food allergies...">${allergies}</textarea>
                </div>
            </div>
        `;
        window.HAS_MEDICAL_INFO = false;
    } else {
        medContainer.innerHTML = '';
        window.HAS_MEDICAL_INFO = true;
    }
}

/** ── SERVICE MANAGEMENT ─────────────────────────────────────────────────── */

window.addServiceItem = function() {
    const select = document.getElementById('inv-service-select');
    const qtyInput = document.getElementById('inv-qty');
    const option = select.options[select.selectedIndex];

    if (!option.value) {
        showToast("Select a service first.", "warning");
        return;
    }

    const id   = option.value;
    const name = option.getAttribute('data-name');
    // Re-lookup from live SERVICES so price is always current
    const liveSvc = SERVICES.find(s => s.id === id);
    const price = liveSvc ? parseFloat(liveSvc.price) : parseFloat(option.getAttribute('data-price') || '0');
    const qty  = parseInt(qtyInput.value) || 1;

    addServiceItemManual(id, name, price, qty);
    
    // Reset select
    select.selectedIndex = 0;
    qtyInput.value = 1;
}

function addServiceItemManual(id, name, price, qty, silent = false) {
    // Check if exists
    const existing = addedItems.find(i => i.serviceId === id);
    if (existing) {
        existing.quantity += qty;
    } else {
        addedItems.push({
            serviceId: id,
            name: name,
            price: price,
            quantity: qty
        });
    }

    renderItemsTable();
    calculateTotals();
    if (!silent) showToast(`Added ${name}`, "success");
}

window.removeItem = function(index) {
    addedItems.splice(index, 1);
    renderItemsTable();
    calculateTotals();
}

function renderItemsTable() {
    const tbody = document.getElementById('invoice-items-body');
    if (addedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-[12px] text-slate-400">
            <i class="fa-solid fa-cart-plus text-slate-200 text-2xl mb-2 block"></i>
            No services added yet.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = addedItems.map((item, idx) => `
        <tr class="text-[12px] border-b border-slate-50 last:border-0">
            <td class="px-4 py-3 text-slate-400">${idx + 1}</td>
            <td class="px-4 py-3 font-bold text-brand">${item.name}</td>
            <td class="px-4 py-3 text-right">₱${item.price.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            <td class="px-4 py-3 text-center">${item.quantity}</td>
            <td class="px-4 py-3 text-right font-bold">₱${(item.price * item.quantity).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="removeItem(${idx})" class="text-slate-300 hover:text-red-500 transition-colors">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function calculateTotals() {
    const subtotal = addedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById('inv-discount-input').value) || 0;
    const final = Math.max(0, subtotal - discount);

    document.getElementById('inv-subtotal').textContent = `₱${subtotal.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    document.getElementById('inv-final').textContent = `₱${final.toLocaleString(undefined, {minimumFractionDigits:2})}`;
}

/** ── TREATMENT FORMS ─────────────────────────────────────────────────────── */

function renderTreatmentForms() {
    const container = document.getElementById('treatment-body');
    if (!container) return;

    // Build Global Odontogram Header
    const renderRow = (start, end, reverse = false) => {
        const arr = [];
        if (reverse) {
            for (let i = start; i >= end; i--) arr.push(i);
        } else {
            for (let i = start; i <= end; i++) arr.push(i);
        }
        return arr.map(t => {
            const status = TOOTH_DATA[t] || 'Healthy';
            return `<button type="button" onclick="toggleToothStatus(this, ${t})" data-tooth="${t}" data-status="${status}" class="tooth-btn w-6 h-8 text-[9px] font-bold rounded border flex items-center justify-center transition-colors ${getToothColorClass(status)}">${t}</button>`;
        }).join('');
    };

    const odontogramUI = `
        <div class="bg-white rounded-2xl p-5 border border-brand/10 shadow-sm mb-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h6 class="text-[12px] font-bold text-brand uppercase tracking-wider">Patient Odontogram</h6>
                    <p class="text-[9px] text-brand/40 font-medium">Global tooth status for this session</p>
                </div>
                <span class="text-[9px] font-bold text-slate-400">Click tooth to cycle status</span>
            </div>

            <!-- Color Legend -->
            <div class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100">
                <span class="flex items-center gap-1 text-[9px] font-bold text-slate-500"><span class="w-3 h-3 rounded border border-slate-200 bg-white inline-block"></span>Healthy</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-blue-600"><span class="w-3 h-3 rounded border border-blue-300 bg-blue-100 inline-block"></span>Filled</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-purple-600"><span class="w-3 h-3 rounded border border-purple-300 bg-purple-100 inline-block"></span>Crown</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-emerald-600"><span class="w-3 h-3 rounded border border-emerald-300 bg-emerald-100 inline-block"></span>RCT</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-slate-400"><span class="w-3 h-3 rounded border border-slate-300 bg-slate-200 inline-block"></span>Extracted</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-red-300"><span class="w-3 h-3 rounded border border-red-200 bg-red-50 inline-block opacity-60"></span>Missing</span>
                <span class="flex items-center gap-1 text-[9px] font-bold text-red-600"><span class="w-3 h-3 rounded border border-red-300 bg-red-100 inline-block"></span>Decay</span>
            </div>
            
            <div class="flex flex-col gap-2 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <!-- Upper (1-16) -->
                <div class="flex gap-1.5 flex-wrap justify-center">${renderRow(1, 16)}</div>
                <div class="w-full h-px bg-slate-200 my-1"></div>
                <!-- Lower (32-17) -->
                <div class="flex gap-1.5 flex-wrap justify-center">${renderRow(32, 17, true)}</div>
            </div>
        </div>
    `;

    container.innerHTML = odontogramUI + addedItems.map((item, idx) => {
        const nameLower = item.name.toLowerCase();
        const isXRay = nameLower.includes("x-ray") || nameLower.includes("xray") || nameLower.includes("radiograph");

        const liveSvc = SERVICES.find(s => s.id === item.serviceId);
        const pills = liveSvc?.predefinedProcedures || [];
        const pillsUI = pills.length > 0 ? `
            <div class="flex flex-wrap gap-1.5 mb-2 mt-1">
                ${pills.map(p => `<button type="button" onclick="addProcedurePill(this, \`${p.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" class="px-3 py-1 bg-brand-50 text-brand text-[9px] font-bold rounded-full border border-brand/10 hover:bg-brand hover:text-white transition-all transition-colors">${p}</button>`).join('')}
            </div>
        ` : '';

        let extraUI = "";
        if (isXRay) {
            extraUI = `
                <div class="mt-4 p-4 border border-brand/10 bg-white rounded-xl">
                    <div class="flex items-center justify-between mb-3">
                        <h6 class="text-[11px] font-bold text-brand uppercase tracking-wider">X-Ray Images</h6>
                        <span class="text-[9px] text-brand/40">Select multiple files</span>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <div class="flex flex-wrap gap-2 mb-3" id="xray-previews-${idx}"></div>
                            <div class="relative group">
                                <input type="file" multiple accept="image/*" onchange="handleXRayPreview(this, ${idx})" class="inv-treat-xray-files hidden" id="xray-input-${idx}" />
                                <label for="xray-input-${idx}" class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 cursor-pointer group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                                    <i class="fa-solid fa-cloud-arrow-up text-slate-300 text-xl mb-1"></i>
                                    <span class="text-[10px] font-bold text-slate-400">Click to upload multiple X-rays</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1 ml-1">Type & Findings</label>
                            <div class="flex gap-2">
                                <select class="inv-treat-xray-type w-32 text-[11px] px-3 py-2 rounded-xl border border-slate-200 outline-none">
                                    <option value="Panoramic">Panoramic</option>
                                    <option value="Periapical">Periapical</option>
                                    <option value="Cephalometric">Cephalometric</option>
                                    <option value="CBCT">CBCT</option>
                                </select>
                                <textarea class="inv-treat-xray-notes flex-1 text-[11px] px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none" rows="1" placeholder="Findings / Report..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        return `
        <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4 treatment-block" data-idx="${idx}">
            <div class="flex items-center justify-between">
                <h5 class="text-[13px] font-bold text-brand flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px]">${idx + 1}</span>
                    ${item.name}
                </h5>
                <select class="inv-treat-status text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 outline-none font-bold text-brand">
                    <option value="completed">Completed</option>
                    <option value="in-progress">In-Progress</option>
                    <option value="planned">Planned</option>
                </select>
            </div>
            
            ${extraUI}

            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Procedure Notes</label>
                ${pillsUI}
                <textarea class="inv-treat-proc w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none bg-white" rows="2" placeholder="What was done?"></textarea>
            </div>
            <input type="hidden" class="inv-treat-svc-id" value="${item.serviceId}" />
            <input type="hidden" class="inv-treat-svc-name" value="${item.name}" />
            <input type="hidden" class="inv-treat-is-xray" value="${isXRay}" />
        </div>
        `;
    }).join('');
}

window.handleXRayPreview = function(input, idx) {
    const previewContainer = document.getElementById(`xray-previews-${idx}`);
    previewContainer.innerHTML = '';
    const files = Array.from(input.files);
    
    files.forEach((file, fIdx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = "relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group";
            div.innerHTML = `
                <img src="${e.target.result}" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-brand/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button type="button" onclick="removeXRayFile(${idx}, ${fIdx})" class="text-white text-[10px]"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.addProcedurePill = function(btn, text) {
    const block = btn.closest('.treatment-block');
    const textarea = block.querySelector('.inv-treat-proc');
    const current = textarea.value.trim();
    if (current) {
        textarea.value = current + ", " + text;
    } else {
        textarea.value = text;
    }
    btn.classList.add('bg-brand', 'text-white');
    setTimeout(() => btn.classList.remove('bg-brand', 'text-white'), 500);
}

// Global toggle for Odontogram
window.toggleToothStatus = function(btn, toothNum) {
    const statuses = ['Healthy', 'Filled', 'Crown', 'RCT', 'Extracted', 'Missing', 'Decay'];
    
    let current = btn.getAttribute('data-status');
    let nextIdx = (statuses.indexOf(current) + 1) % statuses.length;
    let next = statuses[nextIdx];
    
    btn.setAttribute('data-status', next);
    btn.className = `tooth-btn w-6 h-8 text-[9px] font-bold rounded border flex items-center justify-center transition-colors ${getToothColorClass(next)}`;
    
    // Update global data
    if (next === 'Healthy') {
        delete TOOTH_DATA[toothNum];
    } else {
        TOOTH_DATA[toothNum] = next;
    }
}

function getToothColorClass(status) {
    const colors = {
        'Healthy': 'bg-white text-slate-500 border-slate-200',
        'Filled': 'bg-blue-100 text-blue-700 border-blue-300',
        'Crown': 'bg-purple-100 text-purple-700 border-purple-300',
        'RCT': 'bg-emerald-100 text-emerald-700 border-emerald-300',
        'Extracted': 'bg-slate-200 text-slate-400 border-slate-300 line-through',
        'Missing': 'bg-red-50 text-red-300 border-red-200 opacity-50',
        'Decay': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[status] || colors['Healthy'];
}

/** ── SUBMISSION ──────────────────────────────────────────────────────────── */

window.submitInvoice = async function() {
    const submitBtn = document.getElementById('inv-submit-btn');
    const apptId = document.getElementById('inv-patient').value;
    const patientOption = document.getElementById('inv-patient').options[document.getElementById('inv-patient').selectedIndex];
    
    // Fallback to data-doctorid if hidden field is empty (Admin view)
    const doctorId = document.getElementById('inv-doctor-id').value || patientOption.getAttribute('data-doctorid');
    const patientId = patientOption.getAttribute('data-patientid');
    const discount = parseFloat(document.getElementById('inv-discount-input').value) || 0;
    const notes = document.getElementById('inv-notes').value;
    // Vitals moved to medical info

    // Gather treatments
    const treatmentBlocks = document.querySelectorAll('#treatment-body .treatment-block');
    const treatments = Array.from(treatmentBlocks).map(block => {
        const isXRay = block.querySelector('.inv-treat-is-xray').value === "true";
        if (isXRay) {
            const xrayType = block.querySelector('.inv-treat-xray-type')?.value;
            const xrayNotes = block.querySelector('.inv-treat-xray-notes')?.value;
            const xrayFiles = Array.from(block.querySelector('.inv-treat-xray-files')?.files || []);

            return {
                serviceId: block.querySelector('.inv-treat-svc-id').value,
                serviceName: block.querySelector('.inv-treat-svc-name').value,
                xrayType: xrayType,
                xrayNotes: xrayNotes,
                xrayFiles: xrayFiles, // Temporary for processing
                procedure: block.querySelector('.inv-treat-proc').value,
                status: block.querySelector('.inv-treat-status').value
            };
        } else {
            return {
                serviceId: block.querySelector('.inv-treat-svc-id').value,
                serviceName: block.querySelector('.inv-treat-svc-name').value,
                procedure: block.querySelector('.inv-treat-proc').value,
                status: block.querySelector('.inv-treat-status').value
            };
        }
    });

    const payload = {
        appointmentId: apptId,
        patientId: patientId,
        doctorId: doctorId,
        discountAmount: discount,
        notes: notes,
        items: addedItems.map(i => ({
            serviceId: i.serviceId,
            description: i.name,
            unitPrice: i.price,
            quantity: i.quantity
        })),
        treatments: treatments,
        toothData: JSON.stringify(TOOTH_DATA)
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving…';

    try {
        // 1. Upload X-Ray Files if any
        for (let treat of treatments) {
            if (treat.xrayFiles && treat.xrayFiles.length > 0) {
                treat.xrayImages = [];
                for (let file of treat.xrayFiles) {
                    try {
                        const url = await uploadXRayFile(file, patientId);
                        treat.xrayImages.push({
                            url: url,
                            caption: `${treat.xrayType} - ${new Date().toLocaleDateString()}`
                        });
                    } catch (err) {
                        console.error("X-Ray upload failed:", err);
                        showToast("X-Ray upload failed, but treatment will still save.", "warning");
                    }
                }
            }
            // Clean up temporary file reference before sending to API
            delete treat.xrayFiles;
        }

        // 2. If medical info was missing and filled out, save it first
        if (window.HAS_MEDICAL_INFO === false) {
            const hEl = document.getElementById('med-height');
            const wEl = document.getElementById('med-weight');
            const medPayload = {
                patientId: patientId,
                bloodType: document.getElementById('med-blood')?.value,
                isSmoker: document.getElementById('med-smoker')?.checked,
                height: hEl ? (parseFloat(hEl.value) || null) : null,
                weight: wEl ? (parseFloat(wEl.value) || null) : null,
                allergiesJson: JSON.stringify(document.getElementById('med-allergies')?.value.split(',').map(s => s.trim()).filter(s => s) || [])
            };
            await fetch('/api/doctor/save-medical-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medPayload)
            });
        }

        const response = await fetch('/api/invoice/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.ok) {
            if (result.warning) {
                showToast(result.warning, "warning");
            } else {
                showToast("Treatment recorded successfully!", "success");
            }
            closeCreateInvoice();
            refreshData(true);
        } else {
            showToast(result.error || "Failed to record treatment.", "error");
        }
    } catch (err) {
        showToast("Network error occurred.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Treatment';
    }
}

/** ── HELPERS ───────────────────────────────────────────────────────────── */

function showToast(msg, type) {
    if (Toast) {
        Toast.show(msg, type === 'danger' ? 'danger' : type);
    } else if (window.Toast) {
        window.Toast.show(msg, type);
    } else {
        alert(msg);
    }
}


// Helper to render tooth chart for view modal
function renderToothChart(toothData) {
    if (!toothData) return '';
    try {
        const data = typeof toothData === 'string' ? JSON.parse(toothData) : toothData;
        const renderViewRow = (start, end, reverse = false) => {
            const arr = [];
            if (reverse) for (let i = start; i >= end; i--) arr.push(i);
            else for (let i = start; i <= end; i++) arr.push(i);
            
            return arr.map(t => {
                const status = data[t] || 'Healthy';
                return `<div class="w-5 h-7 text-[8px] font-bold rounded border flex items-center justify-center ${getToothColorClass(status)}" title="Tooth ${t}: ${status}">${t}</div>`;
            }).join('');
        };

        return `
            <div class="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center justify-between mb-3">
                    <h6 class="text-[10px] font-bold text-brand uppercase tracking-wider">Odontogram Snapshot</h6>
                    <span class="text-[8px] text-slate-400">Status at time of treatment</span>
                </div>
                <div class="flex flex-col gap-1 items-center">
                    <div class="flex gap-1 flex-wrap justify-center">${renderViewRow(1, 16)}</div>
                    <div class="w-full h-px bg-slate-200 my-0.5"></div>
                    <div class="flex gap-1 flex-wrap justify-center">${renderViewRow(32, 17, true)}</div>
                </div>
            </div>
        `;
    } catch(e) { return ''; }
}

window.openViewTreatmentModal = function(treatmentId) {
    const treat = RECENT_TREATMENTS.find(t => t.id === treatmentId);
    if (!treat) return;

    const modal = document.getElementById('view-treatment-modal');
    if (!modal) return;

    // Set Header Info
    document.getElementById('view-treat-patient').textContent = treat.patientName || 'Unknown Patient';
    document.getElementById('view-treat-date').textContent = new Date(treat.createdAt).toLocaleDateString('en-PH', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('view-treat-id').textContent = `#${treat.id.slice(0, 8)}`;

    // Render Treatment
    const container = document.getElementById('view-treat-body');
    container.innerHTML = `
        <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <div class="flex items-center justify-between">
                <h5 class="text-[13px] font-bold text-brand flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px]">1</span>
                    ${treat.serviceName}
                </h5>
                <span class="px-2 py-0.5 ${treat.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} text-[9px] font-bold rounded-md uppercase tracking-wider">${treat.status}</span>
            </div>

            ${treat.toothNumbers ? `
            <div class="bg-white/50 p-3 rounded-xl border border-slate-100/50">
                <label class="block text-[9px] font-bold text-slate-400 uppercase mb-2">Affected Teeth</label>
                <div class="flex flex-wrap gap-2">
                    ${treat.toothNumbers.split(',').map(n => `
                        <div class="w-8 h-10 border border-slate-200 bg-white rounded-md flex flex-col items-center justify-center shadow-sm">
                            <i class="fa-solid fa-tooth text-slate-300 text-[10px] mb-0.5"></i>
                            <span class="text-[9px] font-bold text-brand">${n.trim()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${renderToothChart(treat.toothData)}

            ${treat.diagnosis ? `
            <div class="bg-white/50 p-3 rounded-xl border border-slate-100/50">
                <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Diagnosis</label>
                <p class="text-[12px] text-brand/60 italic">${treat.diagnosis}</p>
            </div>
            ` : ''}

            <div class="text-[12px] text-brand/60 bg-white/50 p-3 rounded-xl border border-slate-100/50 italic">
                <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Procedure Details</label>
                ${treat.procedureDetails || "No specific procedure details recorded."}
            </div>

            ${(treat.xrayUrl || treat.xrayData || (treat.xrayImages && treat.xrayImages.length > 0)) ? `
            <div class="mt-4 space-y-4">
                <label class="block text-[9px] font-bold text-slate-400 uppercase mb-2">Radiograph / X-Ray ${treat.xrayType ? `(${treat.xrayType})` : ''}</label>
                
                <div class="grid grid-cols-1 gap-4">
                    ${treat.xrayImages && treat.xrayImages.length > 0 
                        ? treat.xrayImages.map((img, iIdx) => `
                            <div class="space-y-2">
                                <div class="rounded-2xl border border-slate-200 overflow-hidden bg-black flex items-center justify-center aspect-video group relative">
                                    <img src="${img.url}" class="max-w-full max-h-full object-contain" alt="X-Ray ${iIdx + 1}" />
                                    <a href="${img.url}" download="XRay_${treat.id}_${iIdx}.png" class="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i class="fa-solid fa-download"></i>
                                    </a>
                                </div>
                                ${img.caption ? `<p class="text-[10px] text-brand/40 text-center font-medium">${img.caption}</p>` : ''}
                            </div>
                        `).join('')
                        : `
                        <div class="rounded-2xl border border-slate-200 overflow-hidden bg-black flex items-center justify-center aspect-video group relative">
                            <img src="${treat.xrayUrl || treat.xrayData}" class="max-w-full max-h-full object-contain" alt="Treatment X-Ray" />
                            <a href="${treat.xrayUrl || treat.xrayData}" download="XRay_${treat.id}.png" class="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i class="fa-solid fa-download"></i>
                            </a>
                        </div>
                        `
                    }
                </div>

                ${treat.xrayNotes ? `
                <div class="mt-3 p-3 bg-white/50 rounded-xl border border-slate-100/50 italic text-[11px] text-brand/60">
                    <label class="block text-[8px] font-bold text-slate-400 uppercase mb-1">Radiographic Findings</label>
                    ${treat.xrayNotes}
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;

    modal.classList.remove('hidden');
    setTimeout(() => {
        const box = document.getElementById('view-treatment-box');
        box.classList.remove('scale-95', 'opacity-0');
    }, 10);
};

window.closeViewTreatmentModal = function() {
    const box = document.getElementById('view-treatment-box');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        document.getElementById('view-treatment-modal').classList.add('hidden');
    }, 300);
};

window.viewInvoice = async function(id) {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    
    // Show loading state if needed
    document.getElementById('receipt-id').innerText = "#" + id.substring(0, 8).toUpperCase();
    
    try {
        const res = await fetch(`/api/admin/data/invoices/${id}`);
        const data = await res.json();
        
        if (data.ok && data.invoice) {
            const inv = data.invoice;
            
            // Populate Modal
            document.getElementById('receipt-patient-name').innerText = inv.patient?.fullName || "Guest";
            document.getElementById('receipt-patient-email').innerText = inv.patient?.email || "No email";
            document.getElementById('receipt-date').innerText = new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            document.getElementById('receipt-doctor-name').innerText = "Dr. " + (inv.doctor?.profile?.lastName || "TBD");
            
            // Status Badge
            const statusBadge = document.getElementById('receipt-status-badge');
            statusBadge.innerText = inv.status;
            statusBadge.className = `px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                (inv.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100')
            }`;

            // Items
            const itemsList = document.getElementById('receipt-items-list');
            itemsList.innerHTML = (inv.items || []).map(item => `
                <tr>
                    <td class="py-3">
                        <p class="text-[11px] font-bold text-brand">${item.description}</p>
                        <p class="text-[9px] text-brand/30">Qty: ${item.quantity} × ₱${parseFloat(item.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td class="py-3 text-right text-[11px] font-bold text-brand">
                        ₱${parseFloat(item.totalPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                </tr>
            `).join('');

            // Totals
            document.getElementById('receipt-subtotal').innerText = "₱" + parseFloat(inv.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            document.getElementById('receipt-discount').innerText = "-₱" + parseFloat(inv.discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            document.getElementById('receipt-total').innerText = "₱" + parseFloat(inv.finalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
        }
    } catch (err) {
        console.error('[ViewInvoice Error]', err);
        showToast('Failed to load invoice details.', 'danger');
    }
};

window.closeReceiptModal = function() {
    document.getElementById('receipt-modal').classList.add('hidden');
};

window.exportReceipt = async function(format) {
    const element = document.getElementById('receipt-capture');
    const invId = document.getElementById('receipt-id').innerText;
    
    if (format === 'pdf') {
        const opt = {
            margin: 0.5,
            filename: `SamsonDental_Receipt_${invId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    } else if (format === 'image') {
        const canvas = await html2canvas(element, { scale: 3, useCORS: true });
        const link = document.createElement('a');
        link.download = `SamsonDental_Receipt_${invId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
};
async function uploadXRayFile(file, patientId) {
    // 1. Get Supabase Config from a hidden element or use global config if available
    // We assume the page has access to supabaseUrl and serviceRoleKey or uses a server-side proxy
    // But since this is frontend, we should use a signed upload or a simple proxy endpoint.
    // For now, let's use a dedicated upload endpoint to keep it secure.
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    formData.append('bucket', 'treatment-xrays');

    const res = await fetch('/api/public/chatbot/upload-clinic-photo', { // Re-using existing upload logic if compatible
        method: 'POST',
        body: formData
    });
    
    const result = await res.json();
    if (result.ok) return result.url;
    throw new Error(result.error || "Upload failed");
}
