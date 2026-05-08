import { AdminStore } from './adminStore.js';

let statusChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    loadReports();

    document.getElementById('btn-update-reports').addEventListener('click', loadReports);
    document.getElementById('btn-print-report')?.addEventListener('click', printReport);
});

function initDatePicker() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startInput = document.getElementById('report-start');
    const endInput = document.getElementById('report-end');

    if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
    if (endInput) endInput.value = lastDay.toISOString().split('T')[0];
}

async function loadReports() {
    const start = document.getElementById('report-start')?.value;
    const end = document.getElementById('report-end')?.value;

    document.getElementById('reports-loading').classList.remove('hidden');
    document.getElementById('reports-content').classList.add('hidden');

    try {
        let url = '/api/admin/data/reports-data';
        if (start && end) {
            url += `?start=${start}&end=${end}`;
        }

        const data = await AdminStore.loadData('reports', url);
        if (data) hydrateReports(data);
    } catch (e) {
        console.error("Failed to load reports", e);
    } finally {
        document.getElementById('reports-loading').classList.add('hidden');
        document.getElementById('reports-content').classList.remove('hidden');
    }
}

function hydrateReports(reports) {
    if (!reports) return;

    // 1. Big Three
    document.getElementById('kpi-bookings').textContent = reports.totalBookings || 0;
    document.getElementById('kpi-completion').textContent = `${reports.completionRate || 0}%`;
    document.getElementById('kpi-peak').textContent = reports.peakHours || 'N/A';

    // 2. Status Distribution Chart
    if (reports.statusDistribution) {
        initStatusChart(reports.statusDistribution);
    }

    // 3. Demographics
    if (reports.demographics) {
        document.getElementById('demo-first').textContent = reports.demographics.firstTime || 0;
        document.getElementById('demo-returning').textContent = reports.demographics.returning || 0;
        renderHeatmap(reports.demographics.heatmap);
    }

    // 4. Provider Utilization Table
    if (reports.providerUtilization) {
        renderProviderTable(reports.providerUtilization);
    }

    // 5. Pulse Grid
    if (reports.pulseGrid) {
        document.getElementById('pulse-noshow').textContent = `${reports.pulseGrid.noShowRate || 0}%`;
        document.getElementById('pulse-busyday').textContent = reports.pulseGrid.busyDay || 'N/A';
        document.getElementById('pulse-service').textContent = reports.pulseGrid.topService || 'N/A';
        document.getElementById('pulse-leak').textContent = `${reports.pulseGrid.timeLeakPercentage || 0}%`;
    }
}

function initStatusChart(dist) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    // Colors mapping
    const colorMap = {
        'confirmed': '#1E40AF', // primary
        'pending': '#f59e0b',   // amber
        'cancelled': '#94a3b8', // slate
        'no_show': '#e11d48',   // rose
        'completed': '#059669', // emerald
        'arrived': '#0ea5e9'    // sky
    };

    const labels = Object.keys(dist);
    const data = Object.values(dist);
    const bgColors = labels.map(l => colorMap[l] || '#cbd5e1');

    statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1).replace('_', '-')),
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
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

function renderHeatmap(heatmap) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    if (!heatmap || Object.keys(heatmap).length === 0) {
        container.innerHTML = '<p class="text-[11px] text-slate-400">No location data available.</p>';
        return;
    }

    // Sort by count descending and take top 5
    const sorted = Object.entries(heatmap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0][1];

    let html = '';
    for (const [location, count] of sorted) {
        const pct = Math.max(5, (count / max) * 100);
        html += `
        <div>
            <div class="flex justify-between text-[11px] mb-1">
                <span class="text-brand/50 truncate pr-2">${location}</span>
                <span class="font-bold text-brand">${count}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100">
                <div class="h-1.5 rounded-full bg-brand/50 opacity-70" style="width: ${pct}%"></div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderProviderTable(providers) {
    const tbody = document.getElementById('provider-table-body');
    if (!tbody) return;

    if (!providers || providers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-[11px] text-slate-400">No provider data for this period.</td></tr>';
        return;
    }

    tbody.innerHTML = providers.map(p => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3">
                <div class="font-bold text-[12px] text-brand">${p.doctorName}</div>
            </td>
            <td class="px-4 py-3 text-[12px] text-brand/50 font-medium">${p.totalHoursBooked} hrs</td>
            <td class="px-4 py-3">
                <span class="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                    ${p.avgApptsPerDay} / day
                </span>
            </td>
        </tr>
    `).join('');
}

function printReport() {
    const start = document.getElementById('report-start')?.value;
    const end = document.getElementById('report-end')?.value;
    const content = document.getElementById('reports-content');
    
    if (!content) return;

    // We can use window.print() but it needs some CSS handling to look good.
    // For a more professional feel, we'll use html2pdf if available or just a clean print.
    const originalTitle = document.title;
    document.title = `SamsonDental_Report_${start}_to_${end}`;
    
    window.print();
    
    document.title = originalTitle;
}
