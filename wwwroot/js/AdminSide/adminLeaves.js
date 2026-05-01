import { Toast, Modal } from "../ui.js";

let ALL_LEAVES = [];
let CURRENT_FILTER = 'all';

async function fetchLeaves() {
    try {
        const res = await fetch('/api/admin/data/staff-leaves');
        if (!res.ok) throw new Error("Failed to load leaves");
        const json = await res.json();
        ALL_LEAVES = json.data || [];
        renderLeaves();
    } catch (err) {
        console.error(err);
        Toast.show("Failed to load leave requests", "error");
    }
}

function renderLeaves() {
    const container = document.getElementById('leaves-table-body');
    if (!container) return;

    const filtered = CURRENT_FILTER === 'all' 
        ? ALL_LEAVES 
        : ALL_LEAVES.filter(l => l.status.toLowerCase() === CURRENT_FILTER);

    if (filtered.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-2 opacity-40">
                        <i class="fa-solid fa-calendar-xmark text-3xl"></i>
                        <span class="text-[12px] font-medium">No ${CURRENT_FILTER === 'all' ? '' : CURRENT_FILTER} leave requests found</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = filtered.map(leave => {
        const statusClass = 
            leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
            leave.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
            'bg-amber-100 text-amber-700';

        const startDate = new Date(leave.startDate).toLocaleDateString();
        const endDate = new Date(leave.endDate).toLocaleDateString();

        return `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-brand-50 text-brand flex items-center justify-center font-bold text-[11px]">
                            ${leave.staffName ? leave.staffName[0] : 'S'}
                        </div>
                        <span class="text-[13px] font-bold text-brand">${leave.staffName || 'Unknown Staff'}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-[12px] font-medium text-slate-600">${leave.leaveType}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="text-[12px] font-bold text-brand">${startDate}</span>
                        <span class="text-[10px] text-slate-400">until ${endDate}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-[12px] text-slate-500 max-w-[200px] truncate" title="${leave.reason || ''}">${leave.reason || 'No reason provided'}</p>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                        ${leave.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    ${leave.status === 'pending' ? `
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="updateLeaveStatus('${leave.id}', 'approved')" class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                <i class="fa-solid fa-check text-[11px]"></i>
                            </button>
                            <button onclick="updateLeaveStatus('${leave.id}', 'rejected')" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                <i class="fa-solid fa-times text-[11px]"></i>
                            </button>
                        </div>
                    ` : `
                        <span class="text-[10px] font-bold text-slate-300 uppercase italic">Processed</span>
                    `}
                </td>
            </tr>
        `;
    }).join("");
}

window.updateLeaveStatus = async function(id, status) {
    const action = status === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this leave request?`)) return;

    try {
        const res = await fetch('/api/admin/data/staff-leaves/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });

        if (res.ok) {
            Toast.show(`Leave request ${status} successfully`, "success");
            fetchLeaves();
            // Trigger badge update
            window.dispatchEvent(new CustomEvent('admin:leaves:updated'));
        } else {
            throw new Error("Failed to update status");
        }
    } catch (err) {
        console.error(err);
        Toast.show("Failed to process request", "error");
    }
}

window.filterLeaves = function(filter) {
    CURRENT_FILTER = filter;
    
    // Update UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('bg-brand', 'text-white', 'shadow-sm');
            btn.classList.remove('text-slate-500', 'hover:text-brand');
        } else {
            btn.classList.remove('bg-brand', 'text-white', 'shadow-sm');
            btn.classList.add('text-slate-500', 'hover:text-brand');
        }
    });

    renderLeaves();
}

// Init
document.addEventListener('DOMContentLoaded', fetchLeaves);

// SignalR listeners would go here
