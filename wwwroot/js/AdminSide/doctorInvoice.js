
import { AdminStore } from './AdminStore.js';

let addedItems = [];
let ARRIVED_APPTS = [];
let RECENT_TREATMENTS = [];
let SERVICES = [];

async function refreshData(force = false) {
    const appts    = await AdminStore.loadData('appointments', '/api/admin/data/appointments', { force });
    const treatments = await AdminStore.loadData('treatments', '/api/admin/data/invoices', { force });
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

    // Filter by doctor if applicable
    const doctorRecordId = document.getElementById('inv-doctor-id')?.value;
    if (doctorRecordId) {
        ARRIVED_APPTS = ARRIVED_APPTS.filter(a => a.doctorId === doctorRecordId);
        RECENT_TREATMENTS = RECENT_TREATMENTS.filter(i => i.doctorId === doctorRecordId);
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
            <div class="col-span-full py-20 text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <i class="fa-solid fa-chair text-slate-200 text-2xl"></i>
                </div>
                <p class="text-[13px] text-brand-400 font-medium">No arrived patients at the moment.</p>
            </div>`;
    } else {
        cardContainer.innerHTML = ARRIVED_APPTS.map(appt => `
            <div class="bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-lg shadow-amber-900/5 relative group hover:border-amber-300 transition-all cursor-pointer"
                 onclick="openCreateInvoiceWithPreselect('${appt.id}')">
                <div class="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase">Arrived</div>
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-lg">${appt.patientName?.[0] || 'P'}</div>
                    <div>
                        <h4 class="text-[15px] font-bold text-brand-900">${appt.patientName}</h4>
                        <p class="text-[11px] text-brand-400 font-medium">${appt.serviceName}</p>
                    </div>
                </div>
                <div class="space-y-3 mb-5">
                    <div class="flex items-center gap-2 text-[12px] text-brand-600"><i class="fa-solid fa-clock opacity-40 w-4"></i>Scheduled: ${appt.appointmentTime}</div>
                    <div class="flex items-center gap-2 text-[12px] text-brand-600"><i class="fa-solid fa-file-invoice opacity-40 w-4"></i>Status: <span class="font-bold text-amber-600 uppercase text-[10px]">Ready for Treatment</span></div>
                </div>
                <button class="w-full py-3 bg-brand text-white rounded-xl text-[12px] font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center">Record Treatment</button>
            </div>`).join('');
    }

    // 3. Render Recent Treatments
    const invoiceTbody = document.getElementById('invoices-table-body');
    const loadingInvoices = document.getElementById('invoices-loading');
    if (loadingInvoices) loadingInvoices.closest('tr')?.remove();

    if (RECENT_TREATMENTS.length === 0) {
        invoiceTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-20 text-center"><div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100"><i class="fa-solid fa-file-invoice text-slate-200 text-2xl"></i></div><p class="text-[13px] text-brand-400 font-medium">No treatment records found yet.</p></td></tr>`;
    } else {
        invoiceTbody.innerHTML = RECENT_TREATMENTS.map(inv => {
            const date = new Date(inv.createdAt);
            const statusClass = inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : inv.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100';
            return `
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="text-[13px] font-bold text-brand-900">${date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                        <div class="text-[10px] text-brand-400">${date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center text-[10px] font-bold">${inv.patient?.fullName?.[0] || 'P'}</div>
                            <div>
                                <div class="text-[13px] font-bold text-brand-900">${inv.patientName || inv.patient?.fullName || 'Unknown'}</div>
                                <div class="text-[10px] text-brand-400">#${inv.id.slice(0, 8)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap gap-1 max-w-[200px]">
                            ${(inv.items || []).slice(0, 2).map(i => `<span class="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-brand-600 font-medium">${i.description}</span>`).join('')}
                            ${inv.items?.length > 2 ? `<span class="px-2 py-0.5 bg-brand-50 rounded-md text-[10px] text-brand-600 font-bold">+${inv.items.length - 2}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="text-[13px] font-bold text-brand-900">₱${inv.finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        ${inv.discountAmount > 0 ? `<div class="text-[10px] text-emerald-500 font-bold">-₱${inv.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Disc.</div>` : ''}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-3 py-1 ${statusClass} border rounded-full text-[10px] font-bold uppercase tracking-wider">${inv.status}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="w-8 h-8 rounded-lg border border-slate-100 text-brand-400 hover:text-brand-900 hover:border-brand-200 transition-all"><i class="fa-solid fa-eye text-xs"></i></button>
                        <button class="w-8 h-8 rounded-lg border border-slate-100 text-brand-400 hover:text-brand-900 hover:border-brand-200 transition-all"><i class="fa-solid fa-print text-xs"></i></button>
                    </td>
                </tr>`;
        }).join('');
    }

    // 4. Update Modal Selects
    const patientSelect = document.getElementById('inv-patient');
    if (patientSelect) {
        patientSelect.innerHTML = '<option value="">Select arrived patient…</option>' + ARRIVED_APPTS.map(appt => {
            const svc = SERVICES.find(s => s.id === appt.serviceId);
            return `<option value="${appt.id}" data-name="${appt.patientName}" data-patientid="${appt.patientId}" data-doctorid="${appt.doctorId}" data-service="${appt.serviceName}" data-serviceid="${appt.serviceId}" data-price="${svc?.price || 0}">${appt.patientName} — ${appt.serviceName} (${new Date(appt.appointmentDate).toLocaleDateString('en-PH', { month: 'short', day: '2-digit' })})</option>`;
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
                addServiceItemManual(serviceId, serviceName, servicePrice, 1);
            }
        });
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

    if (!result.exists) {
        medContainer.innerHTML = `
            <div class="p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl mb-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                        <i class="fa-solid fa-file-medical text-lg"></i>
                    </div>
                    <div>
                        <h6 class="text-[14px] font-bold text-brand-900 leading-tight">Missing Medical Information</h6>
                        <p class="text-[11px] text-brand-400">Please complete the patient's medical profile before submitting treatments.</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Blood Type</label>
                        <select id="med-blood" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none bg-white">
                            <option value="">Unknown</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2 pt-4">
                        <input type="checkbox" id="med-smoker" class="w-4 h-4 rounded border-slate-300 text-primary" />
                        <label for="med-smoker" class="text-[12px] font-bold text-brand-600">Is Smoker?</label>
                    </div>
                </div>
                <div class="mt-4">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Known Allergies</label>
                    <textarea id="med-allergies" class="w-full text-[12px] px-3 py-2.5 rounded-xl border border-slate-200 outline-none resize-none bg-white" rows="2" placeholder="List any drug or food allergies..."></textarea>
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

function addServiceItemManual(id, name, price, qty) {
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
    showToast(`Added ${name}`, "success");
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
    
    container.innerHTML = addedItems.map((item, idx) => {
        // Simple logic to detect if x-ray or tooth-related
        const nameLower = item.name.toLowerCase();
        const isXRay = nameLower.includes("x-ray") || nameLower.includes("xray") || nameLower.includes("radiograph");
        const isTooth = !isXRay; // Default to tooth chart for most services

        let extraUI = "";

        if (isXRay) {
            extraUI = `
                <div class="mt-4 p-4 border border-brand-100 bg-white rounded-xl">
                    <h6 class="text-[11px] font-bold text-brand uppercase tracking-wider mb-3">X-Ray Details</h6>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">X-Ray Type</label>
                            <select class="inv-treat-xray-type w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-primary">
                                <option value="Panoramic">Panoramic</option>
                                <option value="Periapical">Periapical</option>
                                <option value="Cephalometric">Cephalometric</option>
                                <option value="CBCT">CBCT</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Upload File (Optional)</label>
                            <input type="file" class="inv-treat-xray-file text-[11px] file:mr-2 file:py-1 file:px-2 file:border-0 file:rounded-md file:bg-primary/10 file:text-primary file:font-semibold" />
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1">Findings / Radiographic Report</label>
                        <textarea class="inv-treat-xray-notes w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none" rows="2" placeholder="Describe findings..."></textarea>
                    </div>
                </div>
            `;
        } else if (isTooth) {
            // Build simple FDI Odontogram Grid
            const upperRight = [18,17,16,15,14,13,12,11];
            const upperLeft = [21,22,23,24,25,26,27,28];
            const lowerRight = [48,47,46,45,44,43,42,41];
            const lowerLeft = [31,32,33,34,35,36,37,38];
            
            const renderRow = (arr) => arr.map(t => `<button type="button" onclick="toggleToothStatus(this, ${t})" data-tooth="${t}" data-status="Healthy" class="tooth-btn w-6 h-8 text-[9px] font-bold rounded border border-slate-200 bg-white text-slate-500 hover:border-primary transition-colors flex items-center justify-center">${t}</button>`).join('');

            extraUI = `
                <div class="mt-4 p-4 border border-brand-100 bg-white rounded-xl">
                    <div class="flex items-center justify-between mb-3">
                        <h6 class="text-[11px] font-bold text-brand uppercase tracking-wider">Tooth Chart (Odontogram)</h6>
                        <span class="text-[9px] font-bold text-slate-400">Click tooth to cycle status: Healthy → Filled → Crown → RCT → Extracted → Missing → Decay</span>
                    </div>
                    
                    <div class="flex flex-col gap-1 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <!-- Upper -->
                        <div class="flex gap-4">
                            <div class="flex gap-1">${renderRow(upperRight)}</div>
                            <div class="flex gap-1">${renderRow(upperLeft)}</div>
                        </div>
                        <div class="w-full h-px bg-slate-200 my-1"></div>
                        <!-- Lower -->
                        <div class="flex gap-4">
                            <div class="flex gap-1">${renderRow(lowerRight)}</div>
                            <div class="flex gap-1">${renderRow(lowerLeft)}</div>
                        </div>
                    </div>
                    
                    <input type="hidden" class="inv-treat-tooth-data" value="{}" />
                </div>
            `;
        }

        return `
        <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4 treatment-block">
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
                <textarea class="inv-treat-proc w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none bg-white" rows="2" placeholder="What was done?"></textarea>
            </div>
            <input type="hidden" class="inv-treat-svc-id" value="${item.serviceId}" />
            <input type="hidden" class="inv-treat-svc-name" value="${item.name}" />
            <input type="hidden" class="inv-treat-is-xray" value="${isXRay}" />
        </div>
        `;
    }).join('');
}

// Global toggle for Odontogram
window.toggleToothStatus = function(btn, toothNum) {
    const statuses = ['Healthy', 'Filled', 'Crown', 'RCT', 'Extracted', 'Missing', 'Decay'];
    const colors = {
        'Healthy': 'bg-white text-slate-500 border-slate-200',
        'Filled': 'bg-blue-100 text-blue-700 border-blue-300',
        'Crown': 'bg-purple-100 text-purple-700 border-purple-300',
        'RCT': 'bg-emerald-100 text-emerald-700 border-emerald-300',
        'Extracted': 'bg-slate-200 text-slate-400 border-slate-300 line-through',
        'Missing': 'bg-red-50 text-red-300 border-red-200 opacity-50',
        'Decay': 'bg-red-100 text-red-700 border-red-300'
    };

    let current = btn.getAttribute('data-status');
    let nextIdx = (statuses.indexOf(current) + 1) % statuses.length;
    let next = statuses[nextIdx];
    
    btn.setAttribute('data-status', next);
    btn.className = `tooth-btn w-6 h-8 text-[9px] font-bold rounded border flex items-center justify-center transition-colors ${colors[next]}`;
    
    // Update hidden data
    const block = btn.closest('.treatment-block');
    const input = block.querySelector('.inv-treat-tooth-data');
    let data = {};
    try { data = JSON.parse(input.value); } catch(e){}
    
    if (next === 'Healthy') {
        delete data[toothNum];
    } else {
        data[toothNum] = next;
    }
    input.value = JSON.stringify(data);
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

    // Gather treatments
    const treatmentBlocks = document.querySelectorAll('#treatment-body > div');
    const treatments = Array.from(treatmentBlocks).map(block => {
        const isXRay = block.querySelector('.inv-treat-is-xray').value === "true";
        let toothData = {};
        let xrayData = {};

        if (isXRay) {
            xrayData = {
                type: block.querySelector('.inv-treat-xray-type')?.value,
                notes: block.querySelector('.inv-treat-xray-notes')?.value
            };
        } else {
            try {
                toothData = JSON.parse(block.querySelector('.inv-treat-tooth-data')?.value || '{}');
            } catch(e){}
        }

        return {
            serviceId: block.querySelector('.inv-treat-svc-id').value,
            serviceName: block.querySelector('.inv-treat-svc-name').value,
            toothData: JSON.stringify(toothData),
            xrayData: JSON.stringify(xrayData),
            procedure: block.querySelector('.inv-treat-proc').value,
            status: block.querySelector('.inv-treat-status').value
        };
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
        treatments: treatments
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving…';

    try {
        // 1. If medical info was missing and filled out, save it first
        if (window.HAS_MEDICAL_INFO === false) {
            const medPayload = {
                patientId: patientId,
                bloodType: document.getElementById('med-blood').value,
                isSmoker: document.getElementById('med-smoker').checked,
                allergiesJson: JSON.stringify(document.getElementById('med-allergies').value.split(',').map(s => s.trim()).filter(s => s))
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
            showToast("Treatment recorded successfully!", "success");
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
