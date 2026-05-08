import { AdminStore } from './adminStore.js';

/**
 * Samson Dental Center - Admin Dashboard Module
 */
let DASHBOARD_DATA = null;

document.addEventListener('DOMContentLoaded', async () => {
    const role = document.getElementById('currentUserRole')?.value?.toLowerCase() || 'admin';
    
    // Dashboard needs stats and a few items
    const stats = await AdminStore.loadData('stats', '/api/admin/data/stats');
    const appts = await AdminStore.loadData('appointments', '/api/admin/data/appointments');
    const logs = await AdminStore.loadData('activity-logs', '/api/admin/data/activity-logs');
    const leaves = role === 'admin' ? await AdminStore.loadData('leaves', '/api/staff/leave/all') : [];
    const inqs = await AdminStore.loadData('inquiries', '/api/admin/data/inquiries');
    const invoices = await AdminStore.loadData('invoices', '/api/admin/data/invoices');
    
    DASHBOARD_DATA = {
        stats: stats,
        appointments: appts,
        logs: logs,
        leaves: leaves,
        inquiries: inqs,
        invoices: invoices
    };
    
    hydrateDashboard(DASHBOARD_DATA);
    initDashboardEvents();
});

function initDashboardEvents() {
    const btnWeek = document.getElementById('btn-visits-week');
    const btnMonth = document.getElementById('btn-visits-month');

    if (btnWeek && btnMonth) {
        btnWeek.addEventListener('click', () => {
            btnWeek.className = "px-3 py-1 text-[10.5px] font-medium rounded-lg bg-primary text-white";
            btnMonth.className = "px-3 py-1 text-[10.5px] font-medium rounded-lg bg-slate-100 text-brand/50 hover:bg-slate-200 transition-colors";
            if (DASHBOARD_DATA?.stats?.weeklyVisits) {
                initVisitsChart(DASHBOARD_DATA.stats.weeklyVisits);
            }
        });

        btnMonth.addEventListener('click', () => {
            btnMonth.className = "px-3 py-1 text-[10.5px] font-medium rounded-lg bg-primary text-white";
            btnWeek.className = "px-3 py-1 text-[10.5px] font-medium rounded-lg bg-slate-100 text-brand/50 hover:bg-slate-200 transition-colors";
            if (DASHBOARD_DATA?.stats?.monthlyVisits) {
                initVisitsChart(DASHBOARD_DATA.stats.monthlyVisits);
            }
        });
    }
}

function hydrateDashboard(data) {
    if (!data) return;

    // 1. Update Stats
    if (data.stats) {
        const stats = data.stats;
        const totalPatients = document.getElementById('stat-total-patients');
        if (totalPatients && stats.totalPatients !== undefined) totalPatients.textContent = stats.totalPatients.toLocaleString();

        const activeDoctors = document.getElementById('stat-active-doctors');
        if (activeDoctors && stats.activeDoctors !== undefined) activeDoctors.textContent = stats.activeDoctors;

        const todayAppts = document.getElementById('stat-today-appts');
        if (todayAppts && stats.todayAppointments !== undefined) todayAppts.textContent = stats.todayAppointments;

        const monthlyRevenue = document.getElementById('stat-monthly-revenue');
        if (monthlyRevenue && stats.monthlyRevenue !== undefined) monthlyRevenue.textContent = `₱${stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        // Trends (Now using real logic or approximations from key metrics)
        const trendPatients = document.getElementById('stat-patients-trend');
        if (trendPatients && stats.totalPatients !== undefined) trendPatients.textContent = `Total registered patients`;
        
        const trendDoctors = document.getElementById('stat-doctors-trend');
        if (trendDoctors && stats.activeDoctors !== undefined) trendDoctors.textContent = `${stats.activeDoctors} specialists active`;
        
        const trendAppts = document.getElementById('stat-appts-trend');
        if (trendAppts) trendAppts.textContent = `Today's schedule`;
        
        const trendRevenue = document.getElementById('stat-revenue-trend');
        if (trendRevenue && stats.monthlyRevenue !== undefined) trendRevenue.textContent = `Current month`;

        // Initialize Charts
        if (stats.weeklyVisits) {
            initVisitsChart(stats.weeklyVisits);
        }
        if (stats.departmentLoad) {
            initDepartmentChart(stats.departmentLoad);
        }
    }

    // 2. Hydrate Upcoming Appointments
    const apptsBody = document.getElementById('upcoming-appts-body');
    if (apptsBody) {
        const upcoming = (data.appointments || [])
            .filter(a => a.status === 'confirmed' || a.status === 'pending')
            .sort((a, b) => {
                const da = a.appointmentDate.split('T')[0];
                const db = b.appointmentDate.split('T')[0];
                return da.localeCompare(db);
            })
            .slice(0, 5);

        if (upcoming.length === 0) {
            apptsBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 text-[13px]">No upcoming appointments.</td></tr>`;
        } else {
            apptsBody.innerHTML = upcoming.map(appt => {
                const statusColors = {
                    'confirmed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    'arrived': 'bg-blue-50 text-blue-600 border-blue-100',
                    'pending': 'bg-orange-50 text-orange-600 border-orange-100',
                    'completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    'cancelled': 'bg-rose-50 text-rose-600 border-rose-100',
                    'no-show': 'bg-slate-50 text-slate-400 border-slate-100'
                };
                const statusClass = statusColors[appt.status.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-100';
                
                return `
                    <tr>
                        <td class="px-4 py-3 text-[13px]">
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                                    ${appt.patientProfile?.avatarUrl 
                                        ? `<img src="${appt.patientProfile.avatarUrl}" class="w-full h-full object-cover" />`
                                        : (() => {
                                            const parts = appt.patientName.split(' ').filter(p => p.length > 0);
                                            const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0]?.[0] || 'P').toUpperCase();
                                            return `<div class="w-full h-full bg-primary text-white flex items-center justify-center text-[9px] font-bold">${initials}</div>`;
                                          })()
                                    }
                                </div>
                                ${appt.patientId ? `<a href="/Admin/Patients/Details?id=${appt.patientId}" class="hover:text-primary transition-colors font-medium">${appt.patientName}</a>` : `<span>${appt.patientName}</span>`}
                            </div>
                        </td>
                        <td class="px-4 py-3 text-[12.5px] font-medium">${appt.serviceName}</td>
                        <td class="px-4 py-3 text-[12px] text-brand/50 whitespace-nowrap font-medium">${appt.appointmentTime}</td>
                        <td class="px-4 py-3">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass} uppercase tracking-wider">
                                ${appt.status}
                            </span>
                        </td>
                    </tr>`;
            }).join('');
        }
    }

    // 3. Hydrate Activity Logs
    const logsBody = document.getElementById('dashboard-activity-body');
    if (logsBody) {
        const recent = (data.logs || [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 7);

        if (recent.length === 0) {
            logsBody.innerHTML = `<p class="text-[12px] text-slate-400 text-center py-4 italic">No recent activity.</p>`;
        } else {
            logsBody.innerHTML = recent.map(log => {
                const colors = {
                    'Admin': 'bg-blue-50 text-blue-600',
                    'Staff': 'bg-indigo-50 text-indigo-600',
                    'Patient': 'bg-emerald-50 text-emerald-600',
                    'System': 'bg-slate-50 text-slate-400'
                };
                const colorClass = colors[log.category] || 'bg-slate-50 text-slate-500';

                return `
                <div class="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-all group">
                    <div class="w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0 mt-0.5">
                        <i class="fa-solid ${log.category === 'Admin' ? 'fa-user-shield' : log.category === 'Staff' ? 'fa-user-nurse' : 'fa-user'} text-[11px]"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <span class="text-[11.5px] font-bold text-brand truncate">${log.userName}</span>
                            <span class="text-[9px] text-slate-400 font-medium whitespace-nowrap">${timeAgo(log.createdAt)}</span>
                        </div>
                        <p class="text-[10.5px] text-brand/50 leading-snug">${log.action}: <span class="text-brand/40 font-medium">${log.details}</span></p>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 4. Hydrate Leave Requests
    const leavesBody = document.getElementById('leave-requests-body');
    if (leavesBody) {
        const pendingLeaves = (data.leaves || [])
            .filter(l => l.status === 'pending')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (pendingLeaves.length === 0) {
            leavesBody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 text-[13px]">No pending leave requests.</td></tr>`;
        } else {
            leavesBody.innerHTML = pendingLeaves.map(leave => {
                const parseLocal = (s) => {
                    const [y, m, d] = s.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d);
                };
                const sDate = parseLocal(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const eDate = parseLocal(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 text-[12.5px] font-bold text-brand">${leave.staff_name || 'Staff'}</td>
                        <td class="px-4 py-3 text-[12px] font-medium text-brand/50">${leave.leave_type}</td>
                        <td class="px-4 py-3 text-[12px] text-brand/50 whitespace-nowrap">${sDate} - ${eDate}</td>
                        <td class="px-4 py-3 text-[11px] text-slate-500 truncate max-w-[150px]" title="${leave.reason || ''}">${leave.reason || '-'}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-600 border-orange-100 uppercase tracking-wider">
                                Pending
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <button onclick="updateLeaveStatus('${leave.id}', 'approved')" class="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-colors">Approve</button>
                                <button onclick="updateLeaveStatus('${leave.id}', 'rejected')" class="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors">Reject</button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
        }
    }

    // 5. Hydrate Inquiries or Pending Payments (Receptionist)
    const inqsBody = document.getElementById('dashboard-inquiries-body');
    const paymentsBody = document.getElementById('pending-payments-body');

    if (inqsBody) {
        const unread = (data.inquiries || [])
            .filter(i => !i.isRead)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const role = document.getElementById('currentUserRole')?.value?.toLowerCase() || 'admin';
        const basePath = role === 'admin' ? '/Admin' : (role === 'doctor' ? '/Doctor' : '/Receptionist');

        if (unread.length === 0) {
            inqsBody.innerHTML = `<div class="py-12 text-center text-slate-400 text-[12px] italic">No new messages.</div>`;
        } else {
            inqsBody.innerHTML = unread.map(inq => `
                <a href="${basePath}/Inquiries" class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group">
                    <div class="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-envelope-open-text text-[13px]"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <span class="text-[12.5px] font-bold text-brand truncate">${inq.fullName}</span>
                            <span class="text-[9px] text-slate-400 font-medium whitespace-nowrap">${timeAgo(inq.createdAt)}</span>
                        </div>
                        <p class="text-[11px] text-brand/50 line-clamp-1 mt-0.5">${inq.message}</p>
                    </div>
                </a>
            `).join('');
        }
    }

    if (paymentsBody) {
        const pending = (data.invoices || [])
            .filter(inv => inv.status?.toLowerCase() === 'pending' || inv.status?.toLowerCase() === 'partial')
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 6);

        if (pending.length === 0) {
            paymentsBody.innerHTML = `<div class="py-12 text-center text-slate-400 text-[12px] italic">No pending payments.</div>`;
        } else {
            paymentsBody.innerHTML = pending.map(inv => `
                <a href="/Receptionist/Billing" class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group">
                    <div class="w-9 h-9 rounded-xl ${inv.status?.toLowerCase() === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-orange-50 text-orange-600'} flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-file-invoice-dollar text-[13px]"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <span class="text-[12.5px] font-bold text-brand truncate">${inv.patientName || 'Unknown Patient'}</span>
                            <span class="text-[10px] font-bold text-brand/70">₱${(inv.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-center mt-0.5">
                            <p class="text-[11px] text-brand/50 line-clamp-1">${inv.serviceName || 'Dental Service'}</p>
                            <span class="text-[9px] uppercase font-bold tracking-tighter ${inv.status?.toLowerCase() === 'partial' ? 'text-amber-500' : 'text-orange-500'}">${inv.status}</span>
                        </div>
                    </div>
                </a>
            `).join('');
        }
    }
}

window.updateLeaveStatus = async function(id, status) {
    if (!confirm(`Are you sure you want to ${status.slice(0, -1)} this leave request?`)) return;

    try {
        const res = await fetch('/api/staff/leave/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        
        if (res.ok) {
            AdminStore.clearCache('leaves'); // force refresh
            location.reload();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to update leave status');
        }
    } catch(err) {
        alert('Network error updating leave status');
    }
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
}

let visitsChartInstance = null;
function initVisitsChart(weeklyVisits) {
    const ctx = document.getElementById('visitsChart');
    if (!ctx) return;

    if (visitsChartInstance) {
        visitsChartInstance.destroy();
    }

    const labels = Object.keys(weeklyVisits);
    const data = Object.values(weeklyVisits);

    visitsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Appointments',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 4,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#94a3b8', font: { size: 10, family: 'DM Sans' } },
                    grid: { color: '#f1f5f9' },
                    border: { display: false }
                },
                x: {
                    ticks: { color: '#64748b', font: { size: 10, family: 'DM Sans' } },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

let deptChartInstance = null;
function initDepartmentChart(departmentLoad) {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;

    if (deptChartInstance) {
        deptChartInstance.destroy();
    }

    const labels = Object.keys(departmentLoad);
    const data = Object.values(departmentLoad);

    // Standard brand colors
    const colors = ['#1E40AF', '#c0392b', '#059669', '#7c3aed', '#f59e0b', '#0ea5e9'];

    deptChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        font: { size: 11, family: 'DM Sans' },
                        color: '#475569',
                        padding: 15
                    }
                }
            }
        }
    });
}
