/**
 * Doctor Invoice System - Modular Script
 * Handles: Tab switching, dynamic calculations, service management, and API submission.
 */

let addedItems = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for pre-selected appointment from dashboard
    const preselectApptId = document.getElementById('inv-preselect-appt')?.value;
    if (preselectApptId) {
        // Wait a bit for the modal to be ready if we're going to auto-open it
        setTimeout(() => {
            const patientSelect = document.getElementById('inv-patient');
            if (patientSelect) {
                patientSelect.value = preselectApptId;
                // Trigger change to auto-load service
                const event = new Event('change');
                patientSelect.dispatchEvent(event);
                
                // Open the modal
                openCreateInvoice();
            }
        }, 300);
    }

    // Patient select change handler
    const patientSelect = document.getElementById('inv-patient');
    if (patientSelect) {
        patientSelect.addEventListener('change', () => {
            const option = patientSelect.options[patientSelect.selectedIndex];
            if (!option || !option.value) return;

            const serviceName = option.getAttribute('data-service');
            const serviceId = option.getAttribute('data-serviceid');
            const servicePrice = parseFloat(option.getAttribute('data-price') || "0");

            if (serviceId && addedItems.length === 0) {
                // Auto-add the primary service from appointment
                addServiceItemManual(serviceId, serviceName, servicePrice, 1);
            }
        });
    }

    // Discount input handler
    const discountInput = document.getElementById('inv-discount-input');
    if (discountInput) {
        discountInput.addEventListener('input', calculateTotals);
    }
});

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
        // Optional: clear form
        // resetInvoiceForm();
    }, 300);
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
    if (window.Toast) {
        window.Toast.show(msg, type);
    } else {
        alert(msg);
    }
}
