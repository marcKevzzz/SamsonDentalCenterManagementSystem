// wwwroot/js/AdminSide/staffAvailability.js

document.addEventListener('DOMContentLoaded', () => {
    loadMyAvailability();
    loadMyLeaves();
});

async function loadMyAvailability() {
    const container = document.getElementById('availability-container');
    if (!container) return;

    try {
        const res = await fetch('/api/admin/data/my-availability');
        const json = await res.json();

        // Admin role — no personal availability
        if (json.message === 'admin') {
            container.innerHTML = '<div class="col-span-full py-8 text-center text-brand/40 text-[12px]"><i class="fa-solid fa-circle-info mr-2"></i>Availability schedules are managed per doctor and receptionist.</div>';
            return;
        }

        const data = json.data || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="col-span-full py-8 text-center text-brand/40 text-[12px]"><i class="fa-solid fa-calendar-xmark mr-2"></i>No availability schedule set. Contact an admin to configure your schedule.</div>';
            return;
        }

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        container.innerHTML = data.map(slot => `
            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                        <div class="text-[14px] font-bold text-brand">${days[slot.dayOfWeek]}</div>
                        <div class="text-[11px] font-bold text-brand/40 uppercase tracking-widest">${slot.startTime} - ${slot.endTime}</div>
                    </div>
                </div>
                <div class="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                    Active
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="col-span-full py-8 text-center text-red-500 text-[12px]">Failed to load availability.</div>';
    }
}

async function loadMyLeaves() {
    const container = document.getElementById('leaves-container');
    if (!container) return;

    try {
        const res = await fetch('/api/staff/leave/my-leaves');
        const json = await res.json();
        
        if (!json.ok || json.data.length === 0) {
            container.innerHTML = '<div class="py-8 text-center text-brand/40 text-[12px]">No leave requests found.</div>';
            return;
        }

        container.innerHTML = json.data.map(leave => {
            const statusClass = leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              leave.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-amber-50 text-amber-600 border-amber-100';
            
            return `
                <div class="py-3 first:pt-0">
                    <div class="flex items-center justify-between mb-1">
                        <div class="text-[13px] font-bold text-brand">${leave.leave_type || leave.leaveType}</div>
                        <span class="px-2 py-0.5 rounded-md border ${statusClass} text-[9px] font-bold uppercase tracking-wider">${leave.status}</span>
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-brand/40">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${new Date(leave.start_date || leave.startDate).toLocaleDateString()} - ${new Date(leave.end_date || leave.endDate).toLocaleDateString()}</span>
                    </div>
                    ${leave.reason ? `<div class="mt-1.5 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-1">${leave.reason}</div>` : ''}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="py-8 text-center text-red-500 text-[12px]">Failed to load leaves.</div>';
    }
}

window.submitLeave = async function() {
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const type = document.getElementById('leave-type').value;
    const reason = document.getElementById('leave-reason').value;

    if (!start || !end) {
        alert('Please select start and end dates');
        return;
    }

    try {
        const res = await fetch('/api/staff/leave/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: start,
                endDate: end,
                leaveType: type,
                reason: reason
            })
        });

        const json = await res.json();
        if (json.ok) {
            document.getElementById('leave-modal').classList.add('hidden');
            // Reset form
            document.getElementById('leave-start').value = '';
            document.getElementById('leave-end').value = '';
            document.getElementById('leave-reason').value = '';
            loadMyLeaves();
            // Show toast if available
            if (window.showToast) window.showToast('Leave request submitted successfully', 'success');
        } else {
            alert(json.error || 'Failed to submit request');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred');
    }
}
