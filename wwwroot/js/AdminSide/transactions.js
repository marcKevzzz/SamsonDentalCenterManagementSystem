import { AdminStore } from './AdminStore.js';

let ALL_INVOICES = [];

document.addEventListener('DOMContentLoaded', async () => {
    await refreshData();

    // Filtering
    document.getElementById('searchInput')?.addEventListener('input', filterTable);
    document.getElementById('statusFilter')?.addEventListener('change', filterTable);
});

async function refreshData(force = false) {
    ALL_INVOICES = await AdminStore.loadData('invoices', '/api/admin/data/invoices', { force });
    renderTable();
    updateSummary();
}

function renderTable() {
    const tbody = document.getElementById('txnTableBody');
    if (!tbody) return;

    if (ALL_INVOICES.length === 0) {
        document.getElementById('emptyState')?.classList.remove('hidden');
        tbody.innerHTML = '';
        return;
    }

    document.getElementById('emptyState')?.classList.add('hidden');

    tbody.innerHTML = ALL_INVOICES.map(inv => {
        const date = new Date(inv.createdAt);
        const statusClass = getStatusClass(inv.status);
        const services = inv.items?.map(i => i.description).join(', ') || 'N/A';
        
        return `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            ${inv.patientAvatarUrl ? `<img src="${inv.patientAvatarUrl}" class="w-full h-full object-cover"/>` : `<span class="text-[10px] font-bold text-slate-400">${inv.patientName?.[0] || 'P'}</span>`}
                        </div>
                        <div class="truncate">
                            <p class="text-[12.5px] font-semibold text-brand truncate">${inv.patientName}</p>
                            <p class="text-[9.5px] text-slate-400">#${inv.id.substring(0,8)}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <p class="text-[12px] text-brand truncate" title="${services}">${services}</p>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">General</span>
                </td>
                <td class="px-4 py-3">
                    <p class="text-[12px] text-brand truncate">${inv.doctorName}</p>
                </td>
                <td class="px-4 py-3 text-right">
                    <p class="text-[12px] font-bold text-brand">₱${inv.finalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </td>
                <td class="px-4 py-3 text-right text-[12px] text-emerald-600 font-bold">
                    ₱${inv.finalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">Cash</span>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}">${inv.status}</span>
                </td>
                <td class="px-4 py-3">
                    <p class="text-[11px] text-slate-500">${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                </td>
                <td class="px-4 py-3 text-right">
                    <button onclick="window.viewInvoice('${inv.id}')" class="w-8 h-8 rounded-lg border border-primary/10 text-primary hover:bg-primary/5 transition-all">
                        <i class="fa-solid fa-receipt text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSummary() {
    const revenue = ALL_INVOICES.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.finalAmount : 0), 0);
    const paidCount = ALL_INVOICES.filter(inv => inv.status === 'paid').length;
    const pendingCount = ALL_INVOICES.filter(inv => inv.status === 'pending').length;

    if (document.getElementById('summaryRevenue')) document.getElementById('summaryRevenue').innerText = `₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    if (document.getElementById('summaryCount')) document.getElementById('summaryCount').innerText = ALL_INVOICES.length;
    if (document.getElementById('summaryPaid')) document.getElementById('summaryPaid').innerText = paidCount;
    if (document.getElementById('summaryPending')) document.getElementById('summaryPending').innerText = pendingCount;
    if (document.getElementById('txnCount')) document.getElementById('txnCount').innerText = `${ALL_INVOICES.length} records`;
}

function filterTable() {
    const query = document.getElementById('searchInput')?.value.toLowerCase();
    const status = document.getElementById('statusFilter')?.value.toLowerCase();
    
    // For now simple re-render filtering or just hide rows
    const rows = document.querySelectorAll('#txnTableBody tr');
    rows.forEach((row, idx) => {
        const inv = ALL_INVOICES[idx];
        if (!inv) return;

        const matchesSearch = inv.patientName.toLowerCase().includes(query) || inv.items?.some(i => i.description.toLowerCase().includes(query));
        const matchesStatus = !status || inv.status.toLowerCase() === status;

        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'paid': return 'bg-emerald-50 text-emerald-600';
        case 'pending': return 'bg-amber-50 text-amber-600';
        case 'partial': return 'bg-blue-50 text-blue-600';
        case 'cancelled': return 'bg-rose-50 text-rose-600';
        default: return 'bg-slate-100 text-slate-500';
    }
}

// Global functions for modal
window.viewInvoice = async function(id) {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    
    document.getElementById('receipt-id').innerText = "#" + id.substring(0, 8).toUpperCase();
    
    try {
        const res = await fetch(`/api/admin/data/invoices/${id}`);
        const data = await res.json();
        
        if (data.ok && data.invoice) {
            const inv = data.invoice;
            
            document.getElementById('receipt-patient-name').innerText = inv.patient?.fullName || "Guest";
            document.getElementById('receipt-patient-email').innerText = inv.patient?.email || "No email";
            if (document.getElementById('receipt-patient-phone')) document.getElementById('receipt-patient-phone').innerText = inv.patient?.phone || "No phone record";
            if (document.getElementById('receipt-patient-address')) document.getElementById('receipt-patient-address').innerText = inv.patient?.address || "No address record";
            document.getElementById('receipt-date').innerText = new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            document.getElementById('receipt-doctor-name').innerText = inv.doctor?.fullName || "Dr. Samson Staff";
            
            const statusBadge = document.getElementById('receipt-status-badge');
            statusBadge.innerText = inv.status;
            statusBadge.className = `px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                (inv.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100')
            }`;

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

            document.getElementById('receipt-subtotal').innerText = "₱" + parseFloat(inv.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            document.getElementById('receipt-discount').innerText = "-₱" + parseFloat(inv.discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            document.getElementById('receipt-total').innerText = "₱" + parseFloat(inv.finalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
        }
    } catch (err) {
        console.error('[ViewInvoice Error]', err);
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
