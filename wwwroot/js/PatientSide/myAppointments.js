import { Modal, Toast } from "../ui.js";

// Animation for cards
document.querySelectorAll(".fade-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("animate"), i * 80);
});

// ── Search Logic ──────────────────────────────────────────────────────────────
window.searchAppts = function(val) {
  const q = val.toLowerCase().trim();
  const filter = document.querySelector(".filter-tab.active").dataset.filter;
  applyFilters(q, filter);
}

// ── Filter Logic ──────────────────────────────────────────────────────────────
window.filterAppts = function(filter) {
  // Update active tab UI
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === filter);
    t.classList.toggle("border-primary", t.dataset.filter === filter);
    t.classList.toggle("text-primary", t.dataset.filter === filter);
  });

  const q = document.getElementById("apptSearch").value;
  applyFilters(q, filter);
}

function applyFilters(q, filter) {
  const cards = document.querySelectorAll(".appt-card");
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
  const apptList = document.getElementById("apptList");

  if (visibleCount === 0) {
      noResults.classList.remove("hidden");
      // If there are no cards at all (not just filtered out), hide the list
      // but if we are just filtering, we want the "no results" state
  } else {
      noResults.classList.add("hidden");
  }
}

window.clearFilters = function() {
    document.getElementById("apptSearch").value = "";
    window.filterAppts("all");
}

// ── Cancellation Logic ────────────────────────────────────────────────────────
window.cancelAppointment = function(id) {
    Modal.open({
        title: "Cancel Appointment",
        message: "Are you sure you want to cancel this appointment? This action cannot be undone.",
        type: "danger",
        confirmText: "Yes, Cancel",
        onConfirm: async () => {
            try {
                const res = await fetch(`/api/appointments/${id}/cancel`, {
                    method: "DELETE"
                });
                const data = await res.json();

                if (data.ok) {
                    Toast.show("Appointment cancelled successfully", "success");
                    // Refresh the page or update the card status
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

// ── Details Modal ─────────────────────────────────────────────────────────────
window.viewApptDetails = (appt) => {
    const modal = document.getElementById('details-modal');
    const box = document.getElementById('details-modal-box');
    
    document.getElementById('det-service').textContent = appt.serviceName;
    document.getElementById('det-id').textContent = `#${appt.id.substring(0, 8).toUpperCase()}`;
    document.getElementById('det-date').textContent = appt.date;
    document.getElementById('det-time').textContent = appt.time;
    document.getElementById('det-doctor').textContent = appt.doctorName || 'Not Assigned';
    document.getElementById('det-notes').textContent = appt.notes || 'No additional notes provided.';
    
    const badge = document.getElementById('det-status-badge');
    badge.textContent = appt.status;
    
    const s = appt.status.toLowerCase();
    badge.className = 'inline-flex px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase ' + 
        (s === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 
         s === 'completed' ? 'bg-blue-100 text-blue-600' : 
         s === 'cancelled' ? 'bg-red-100 text-red-600' : 
         s === 'arrived'   ? 'bg-yellow-100 text-yellow-600' : 
         s === 'no-show'   ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => box.classList.remove('scale-95', 'opacity-0'));
};

window.closeDetailsModal = () => {
    const box = document.getElementById('details-modal-box');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => document.getElementById('details-modal').classList.add('hidden'), 200);
};

