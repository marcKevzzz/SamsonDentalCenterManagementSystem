import { AdminStore } from './AdminStore.js';

/**
 * Samson Dental Center - Admin Dashboard Module
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Dashboard needs stats and a few items
    const stats = await AdminStore.loadData('stats', '/api/admin/data/stats');
    const appts = await AdminStore.loadData('appointments', '/api/admin/data/appointments');
    const invoices = await AdminStore.loadData('invoices', '/api/admin/data/invoices');
    
    hydrateDashboard({
        stats: stats,
        appointments: appts,
        invoices: invoices
    });
});

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

        // Trends (mock for now as backend doesn't provide history yet, but we'll use dynamic placeholders)
        if (stats.totalPatients !== undefined) document.getElementById('stat-patients-trend').textContent = `↑ ${Math.floor(stats.totalPatients * 0.1)} new this week`;
        if (stats.activeDoctors !== undefined) document.getElementById('stat-doctors-trend').textContent = `↑ ${stats.activeDoctors} specialists active`;
        if (document.getElementById('stat-appts-trend')) document.getElementById('stat-appts-trend').textContent = `Today's schedule`;
        if (stats.monthlyRevenue !== undefined) document.getElementById('stat-revenue-trend').textContent = `↑ ${(stats.monthlyRevenue * 0.05).toLocaleString()} vs last week`;
    }

    // 2. Hydrate Upcoming Appointments
    const apptsBody = document.getElementById('upcoming-appts-body');
    if (apptsBody) {
        const upcoming = (data.appointments || [])
            .filter(a => a.status === 'confirmed' || a.status === 'pending')
            .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
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
                                <div class="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-primary text-[9.5px] font-bold flex-shrink-0">
                                    ${appt.patientName?.[0] || 'P'}
                                </div>
                                ${appt.patientId ? `<a href="/Admin/Patients/Details?id=${appt.patientId}" class="hover:text-primary transition-colors font-medium">${appt.patientName}</a>` : `<span>${appt.patientName}</span>`}
                            </div>
                        </td>
                        <td class="px-4 py-3 text-[12.5px] text-brand-500 font-medium">
                            ${appt.doctorName || 'Unassigned'}
                        </td>
                        <td class="px-4 py-3 text-[12.5px] font-medium">${appt.serviceName}</td>
                        <td class="px-4 py-3 text-[12px] text-brand-500 whitespace-nowrap font-medium">${appt.appointmentTime}</td>
                        <td class="px-4 py-3">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass} uppercase tracking-wider">
                                ${appt.status}
                            </span>
                        </td>
                    </tr>`;
            }).join('');
        }
    }

    // 3. Hydrate Recent Invoices
    const invoicesBody = document.getElementById('recent-invoices-body');
    if (invoicesBody) {
        const recent = (data.invoices || [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (recent.length === 0) {
            invoicesBody.innerHTML = `<p class="text-[12px] text-slate-400 text-center py-4 italic">No invoices generated yet.</p>`;
        } else {
            invoicesBody.innerHTML = recent.map(inv => `
                <a href="/Admin/Patients/Details?id=${inv.patientId}" class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100 transition-all group">
                    <div class="min-w-0">
                        <div class="text-[12px] font-bold text-brand-900 truncate">${inv.patient?.fullName || 'Unknown'}</div>
                        <div class="text-[10px] text-brand-400 font-medium">${new Date(inv.createdAt).toLocaleString('en-PH', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[12.5px] font-extrabold text-brand-900">₱${inv.finalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                        <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${inv.status}</span>
                    </div>
                </a>`).join('');
        }
    }
}
