// wwwroot/js/AdminSide/staffAvailability.js

document.addEventListener('DOMContentLoaded', () => {
    loadMySchedule();
    loadMyLeaves();
});

async function loadMySchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    try {
        // We reuse the standard appointments endpoint but filtered for the current user
        // Note: For Doctor, they only see their own. For Receptionist, they see all? 
        // User instruction said: "Availability page where you can see the user schedule"
        // Let's assume it fetches from a staff-specific schedule endpoint or we use the general one.
        const res = await fetch('/api/admin/data/my-schedule');
        const json = await res.json();
        const data = json.data || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="py-8 text-center text-brand-400 text-[12px]">No upcoming appointments scheduled.</div>';
            return;
        }

        // Group by date
        const groups = {};
        data.slice(0, 10).forEach(appt => {
            const d = appt.appointment_date || appt.appointmentDate;
            if (!groups[d]) groups[d] = [];
            groups[d].push(appt);
        });

        container.innerHTML = Object.keys(groups).sort().map(date => `
            <div class="mb-4">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div class="space-y-2">
                    ${groups[date].map(appt => `
                        <div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-brand font-bold text-[10px]">
                                    ${appt.appointment_time || appt.appointmentTime}
                                </div>
                                <div>
                                    <div class="text-[13px] font-bold text-brand">${appt.patient_name || (appt.patient ? appt.patient.first_name + ' ' + appt.patient.last_name : 'Patient')}</div>
                                    <div class="text-[10px] text-brand-400">${appt.service_name || 'General Checkup'}</div>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="py-8 text-center text-red-500 text-[12px]">Failed to load schedule.</div>';
    }
}

async function loadMyLeaves() {
    const container = document.getElementById('leaves-container');
    if (!container) return;

    try {
        const res = await fetch('/api/staff/leave/my-leaves');
        const json = await res.json();
        
        if (!json.ok || json.data.length === 0) {
            container.innerHTML = '<div class="py-8 text-center text-brand-400 text-[12px]">No leave requests found.</div>';
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
                    <div class="flex items-center gap-2 text-[11px] text-brand-400">
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
