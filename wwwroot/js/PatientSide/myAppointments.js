import { Modal, Toast } from "../ui.js";

// ── Initialization ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Entrance animation for list items
    if (typeof gsap !== "undefined") {
        gsap.from(".fade-up-item", {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out",
            clearProps: "all"
        });
    }
});

// ── Search & Filter Logic ──────────────────────────────────────────────────────────────
window.searchAppts = function(val) {
  const q = val.toLowerCase().trim();
  const filterElement = document.querySelector(".filter-tab.active");
  const filter = filterElement ? filterElement.dataset.filter : "all";
  applyFilters(q, filter);
}

window.filterAppts = function(filter) {
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === filter);
  });

  const searchInput = document.getElementById("apptSearch");
  const q = searchInput ? searchInput.value : "";
  applyFilters(q, filter);
}

function applyFilters(q, filter) {
  const cards = document.querySelectorAll(".appt-item-card");
  let visibleCount = 0;

  cards.forEach((card) => {
    const status = card.dataset.status;
    const name = card.dataset.name.toLowerCase();

    const matchesFilter = filter === "all" || status === filter;
    const matchesSearch = !q || name.includes(q);

    const isVisible = matchesFilter && matchesSearch;
    card.style.display = isVisible ? "" : "none";
    
    if (isVisible) visibleCount++;
  });

  const noResults = document.getElementById("noResults");
  if (noResults) {
      if (visibleCount === 0) {
          noResults.classList.remove("hidden");
      } else {
          noResults.classList.add("hidden");
      }
  }
}

window.clearFilters = function() {
    const searchInput = document.getElementById("apptSearch");
    if (searchInput) searchInput.value = "";
    window.filterAppts("all");
}

// ── Details Interaction ─────────────────────────────────────────────────────────────
window.viewApptDetails = (appt, el) => {
    // 1. Highlight active item
    document.querySelectorAll(".appt-item-card").forEach(c => c.classList.remove("active"));
    if (el) el.classList.add("active");

    // 2. Show Detail Content
    const empty = document.getElementById('detailEmpty');
    const content = document.getElementById('detailContent');
    
    if (empty) empty.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // 3. Update DOM
    document.getElementById('det-service').textContent = appt.serviceName;
    document.getElementById('det-id').textContent = `#${appt.id.substring(0, 8).toUpperCase()}`;
    document.getElementById('det-date').textContent = appt.date;
    document.getElementById('det-time').textContent = appt.time;
    document.getElementById('det-doctor').textContent = appt.doctorName || 'Assigned on arrival';
    document.getElementById('det-notes').textContent = appt.notes || 'No specific instructions provided.';
    
    // Status Badge
    const badge = document.getElementById('det-status-badge');
    if (badge) {
        badge.textContent = appt.status;
        const s = appt.status.toLowerCase();
        const statusColors = {
            'confirmed': 'bg-emerald-100 text-emerald-600',
            'completed': 'bg-slate-100 text-slate-600',
            'cancelled': 'bg-red-100 text-red-600',
            'pending': 'bg-amber-100 text-amber-600'
        };
        badge.className = `status-pill ${statusColors[s] || 'bg-blue-100 text-primary'}`;
    }

    // Actions
    const activeActions = document.getElementById('activeActions');
    const completedActions = document.getElementById('completedActions');
    
    if (activeActions && completedActions) {
        const s = appt.status.toLowerCase();
        if (s === 'completed' || s === 'cancelled') {
            activeActions.classList.add('hidden');
            completedActions.classList.toggle('hidden', s === 'cancelled');
        } else {
            activeActions.classList.remove('hidden');
            completedActions.classList.add('hidden');
        }
    }

    // Bind Button Events
    const btnReschedule = document.getElementById('btnReschedule');
    const btnCancel = document.getElementById('btnCancel');
    if (btnReschedule) btnReschedule.onclick = () => rescheduleAppointment(appt.id);
    if (btnCancel) btnCancel.onclick = () => cancelAppointment(appt.id);
};

// ── Actions Logic ──────────────────────────────────────────────────────────────
window.cancelAppointment = function(id) {
    Modal.open({
        title: "Cancel Appointment",
        message: "Are you sure you want to cancel this appointment? This action cannot be undone.",
        type: "danger",
        confirmText: "Yes, Cancel",
        onConfirm: async () => {
            try {
                const res = await fetch(`/api/appointments/${id}/cancel`, { method: "DELETE" });
                const data = await res.json();
                if (data.ok) {
                    Toast.show("Appointment cancelled successfully", "success");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    Toast.show(data.error || "Failed to cancel appointment", "danger");
                }
            } catch (err) {
                console.error("Cancel Error:", err);
                Toast.show("An error occurred. Please try again.", "danger");
            }
        }
    });
}

window.rescheduleAppointment = function(id) {
    Modal.open({
        title: "Reschedule Appointment",
        message: "Are you sure you want to reschedule? Your current slot will be released and you'll be redirected to pick a new time.",
        type: "warning",
        confirmText: "Reschedule",
        onConfirm: () => {
            window.location.href = `/Appointments?rescheduleId=${id}`;
        }
    });
}
