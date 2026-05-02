/**
 * Samson Dental Center - Records Management
 * Handles Master-Detail navigation and unread state for treatments.
 */

window.switchRecordTab = function(tab) {
    // Update nav buttons
    document.querySelectorAll('.record-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `rtab-${tab}`);
    });

    // Update content panes
    document.querySelectorAll('.record-section-pane').forEach(pane => {
        pane.classList.toggle('hidden', pane.id !== `sec-${tab}`);
    });

    // If switching to treatments, mark as read
    if (tab === 'treatments') {
        markTreatmentsAsRead();
    }
};

async function markTreatmentsAsRead() {
    const unreadDots = document.querySelectorAll('.unread-dot');
    if (unreadDots.length === 0) return;

    try {
        const response = await fetch('/api/patient/data/records/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            unreadDots.forEach(dot => dot.remove());
            // Update global notification badge
            if (window.updatePatientCounts) {
                window.updatePatientCounts();
            }
            
            // Remove red dot from sidebar nav
            const sidebarTreatmentDot = document.querySelector('#rtab-treatments .bg-red-500');
            if (sidebarTreatmentDot) sidebarTreatmentDot.remove();
        }
    } catch (error) {
        console.error('Failed to mark records as read:', error);
    }
}

// Entrance Animations
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(".fade-up").forEach((el, i) => {
        setTimeout(() => el.classList.add("animate"), i * 100);
    });
});
