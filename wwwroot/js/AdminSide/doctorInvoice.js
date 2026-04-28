
import { AdminStore } from './AdminStore.js';

let addedItems = [];
let ARRIVED_APPTS = [];
let RECENT_INVOICES = [];
let SERVICES = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const appts = await AdminStore.loadData('appointments', '/api/admin/data/appointments');
    const invoices = await AdminStore.loadData('invoices', '/api/admin/data/invoices');
    const services = await AdminStore.loadData('services', '/api/services/all');
    
    initializeWithData({
        appointments: appts,
        invoices: invoices,
        services: services
    });

    // Discount input handler
    const discountInput = document.getElementById('inv-discount-input');
    if (discountInput) {
        discountInput.addEventListener('input', calculateTotals);
    }
});

function initializeWithData(data) {
    ARRIVED_APPTS = data.appointments?.filter(a => a.status === 'arrived') || [];
    RECENT_INVOICES = data.invoices || [];
    SERVICES = data.services || [];

    // Filter by doctor if applicable
    const doctorRecordId = document.getElementById('inv-doctor-id')?.value;
    if (doctorRecordId) {
        ARRIVED_APPTS = ARRIVED_APPTS.filter(a => a.doctorId === doctorRecordId);
        RECENT_INVOICES = RECENT_INVOICES.filter(i => i.doctorId === doctorRecordId);
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
                    <div class="flex items-center gap-2 text-[12px] text-brand-600"><i class="fa-solid fa-file-invoice opacity-40 w-4"></i>Status: <span class="font-bold text-amber-600 uppercase text-[10px]">Ready for Invoice</span></div>
                </div>
                <button class="w-full py-3 bg-brand text-white rounded-xl text-[12px] font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center">Create Invoice</button>
            </div>`).join('');
    }

    // 3. Render Recent Invoices
    const invoiceTbody = document.getElementById('invoices-table-body');
    const loadingInvoices = document.getElementById('invoices-loading');
    if (loadingInvoices) loadingInvoices.closest('tr')?.remove();

    if (RECENT_INVOICES.length === 0) {
        invoiceTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-20 text-center"><div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100"><i class="fa-solid fa-file-invoice text-slate-200 text-2xl"></i></div><p class="text-[13px] text-brand-400 font-medium">No invoices found yet.</p></td></tr>`;
    } else {
        invoiceTbody.innerHTML = RECENT_INVOICES.map(inv => {
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
            return `<option value="${appt.id}" data-name="${appt.patientName}" data-patientid="${appt.patientId}" data-service="${appt.serviceName}" data-serviceid="${appt.serviceId}" data-price="${svc?.price || 0}">${appt.patientName} — ${appt.serviceName} (${new Date(appt.appointmentDate).toLocaleDateString('en-PH', { month: 'short', day: '2-digit' })})</option>`;
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
            const serviceId = option.getAttribute('data-serviceid');
            const servicePrice = parseFloat(option.getAttribute('data-price') || "0");

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

/** ── SERVICE MANAGEMENT ─────────────────────────────────────────────────── */

window.addServiceItem = function() {
    const select = document.getElementById('inv-service-select');
    const qtyInput = document.getElementById('inv-qty');
    const option = select.options[select.selectedIndex];

    if (!option.value) {
        showToast("Select a service first.", "warning");
        return;
    }

    const id = option.value;
    const name = option.getAttribute('data-name');
    const price = parseFloat(option.getAttribute('data-price'));
    const qty = parseInt(qtyInput.value) || 1;

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
    
    container.innerHTML = addedItems.map((item, idx) => `
        <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <div class="flex items-center justify-between">
                <h5 class="text-[13px] font-bold text-brand flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px]">${idx + 1}</span>
                    ${item.name}
                </h5>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tooth Number(s)</label>
                    <input type="text" class="inv-treat-tooth w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none" placeholder="e.g. 14, 15 or 'Upper Right'" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Status</label>
                    <select class="inv-treat-status w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none">
                        <option value="completed">Completed</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="planned">Planned</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Procedure Details</label>
                <textarea class="inv-treat-proc w-full text-[12px] px-3 py-2 rounded-xl border border-slate-200 outline-none resize-none" rows="2" placeholder="What was done?"></textarea>
            </div>
            <input type="hidden" class="inv-treat-svc-id" value="${item.serviceId}" />
            <input type="hidden" class="inv-treat-svc-name" value="${item.name}" />
        </div>
    `).join('');
}

/** ── SUBMISSION ──────────────────────────────────────────────────────────── */

window.submitInvoice = async function() {
    const submitBtn = document.getElementById('inv-submit-btn');
    const doctorId = document.getElementById('inv-doctor-id').value;
    const apptId = document.getElementById('inv-patient').value;
    const patientOption = document.getElementById('inv-patient').options[document.getElementById('inv-patient').selectedIndex];
    const patientId = patientOption.getAttribute('data-patientid');
    const discount = parseFloat(document.getElementById('inv-discount-input').value) || 0;
    const notes = document.getElementById('inv-notes').value;

    // Gather treatments
    const treatmentBlocks = document.querySelectorAll('#treatment-body > div');
    const treatments = Array.from(treatmentBlocks).map(block => ({
        serviceId: block.querySelector('.inv-treat-svc-id').value,
        serviceName: block.querySelector('.inv-treat-svc-name').value,
        toothNumbers: block.querySelector('.inv-treat-tooth').value,
        procedure: block.querySelector('.inv-treat-proc').value,
        status: block.querySelector('.inv-treat-status').value
    }));

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
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Generating…';

    try {
        const response = await fetch('/api/invoice/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.ok) {
            showToast("Invoice generated successfully!", "success");
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(result.error || "Failed to create invoice.", "error");
        }
    } catch (err) {
        showToast("Network error occurred.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-file-invoice mr-2"></i> Generate Invoice';
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
