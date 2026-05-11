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
    const promotionActions = document.getElementById('promotionActions');
    
    if (activeActions && completedActions && promotionActions) {
        const s = appt.status.toLowerCase();
        
        // Promotion check: pending + softLockUntil in future
        const isPromoted = s === 'pending' && appt.softLockUntil && new Date(appt.softLockUntil) > new Date();

        if (isPromoted) {
            promotionActions.classList.remove('hidden');
            activeActions.classList.add('hidden');
            completedActions.classList.add('hidden');
        } else if (s === 'completed' || s === 'cancelled') {
            promotionActions.classList.add('hidden');
            activeActions.classList.add('hidden');
            completedActions.classList.toggle('hidden', s === 'cancelled');
        } else {
            promotionActions.classList.add('hidden');
            activeActions.classList.remove('hidden');
            completedActions.classList.add('hidden');
        }
    }

    // Bind Button Events
    const btnReschedule = document.getElementById('btnReschedule');
    const btnCancel = document.getElementById('btnCancel');
    const btnConfirmPromotion = document.getElementById('btnConfirmPromotion');

    if (btnReschedule) btnReschedule.onclick = () => rescheduleAppointment(appt.id);
    if (btnCancel) btnCancel.onclick = () => cancelAppointment(appt.id);
    if (btnConfirmPromotion) btnConfirmPromotion.onclick = () => confirmPromotion(appt.id);
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

window.confirmPromotion = async function(id) {
    Modal.open({
        title: "Confirm Your Slot",
        message: "This will officially confirm your appointment. Are you ready to secure this slot?",
        type: "success",
        confirmText: "Yes, Confirm",
        onConfirm: async () => {
            try {
                window.location.href = `/api/public/confirm-promotion?id=${id}`;
            } catch (err) {
                console.error("Confirm Error:", err);
                Toast.show("An error occurred. Please try again.", "danger");
            }
        }
    });
}

// ── Review Logic ─────────────────────────────────────────────────────────────
let CURRENT_RATING = 0;

window.openReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setRating(5); // Default to 5
    }
}

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        // Reset form
        CURRENT_RATING = 0;
        const text = document.getElementById('reviewText');
        if (text) text.value = '';
    }
}

window.setRating = function(rating) {
    CURRENT_RATING = rating;
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(btn => {
        const r = parseInt(btn.dataset.rating);
        if (r <= rating) {
            btn.classList.remove('text-slate-200');
            btn.classList.add('text-yellow-400');
        } else {
            btn.classList.remove('text-yellow-400');
            btn.classList.add('text-slate-200');
        }
    });
}

window.submitReview = async function() {
    const text = document.getElementById('reviewText')?.value || '';
    const btn = document.getElementById('btnSubmitReview');

    if (CURRENT_RATING === 0) {
        Toast.show("Please select a rating", "warning");
        return;
    }

    if (!text.trim()) {
        Toast.show("Please enter your comments", "warning");
        return;
    }

    try {
        if (btn) btn.disabled = true;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';

        const res = await fetch('/api/patient/data/submit-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rating: CURRENT_RATING,
                reviewText: text
            })
        });

        const data = await res.json();
        if (data.ok) {
            Toast.show(data.message, "success");
            closeReviewModal();
        } else {
            Toast.show(data.error || "Failed to submit review", "danger");
        }
    } catch (err) {
        console.error("Review Error:", err);
        Toast.show("An error occurred. Please try again.", "danger");
    } finally {
        if (btn) btn.disabled = false;
        if (btn) btn.innerHTML = 'Submit Review';
    }
}
