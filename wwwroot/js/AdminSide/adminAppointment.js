import { Toast, Modal } from '../ui.js';

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async r => {
    if (!r.ok) {
        // Try to get error message if any
        let err = "Server error " + r.status;
        try { const data = await r.json(); err = data.error || err; } catch(e) {}
        throw new Error(err);
    }
    return r.json();
  }).catch(err => {
    console.error("[POST Error]", err);
    return { ok: false, error: err.message };
  });

// ── Table filter ──────────────────────────────────────────────────────────────
window.filterTable = () => {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('status-filter').value;
  const date   = document.getElementById('date-filter').value;

  document.querySelectorAll('#appointments-body tr[data-status]').forEach(row => {
    const matchSearch = !q || row.dataset.search?.toLowerCase().includes(q);
    const matchStatus = !status || row.dataset.status === status;
    const matchDate   = !date || row.dataset.date === date;
    
    row.style.display = matchSearch && matchStatus && matchDate ? '' : 'none';
  });
};

// ── MODAL UTILS ───────────────────────────────────────────────────────────────
const showModal = (id) => {
  const modal = document.getElementById(id);
  const box = document.getElementById(`${id}-box`);
  modal.classList.remove('hidden');
  gsap.fromTo(box, 
    { scale: 0.9, opacity: 0, y: 20 }, 
    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
  );
};

const hideModal = (id) => {
  const modal = document.getElementById(id);
  const box = document.getElementById(`${id}-box`);
  gsap.to(box, { 
    scale: 0.95, opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
    onComplete: () => modal.classList.add('hidden')
  });
};

window.openBookModal = () => showModal('book-modal');
window.closeBookModal = () => hideModal('book-modal');

window.submitBook = async () => {
  const name    = document.getElementById('book-patient-name').value.trim();
  const email   = document.getElementById('book-patient-email').value.trim();
  const phone   = document.getElementById('book-patient-phone').value.trim();
  const svcEl   = document.getElementById('book-service');
  const docEl   = document.getElementById('book-doctor');
  const date    = document.getElementById('book-date').value;
  const time    = document.getElementById('book-time').value;
  const notes   = document.getElementById('book-notes').value.trim();

  const svcId   = svcEl.value;
  const svcName = svcEl.selectedOptions[0]?.dataset.name ?? '';
  const docId   = docEl.value || null;
  const docName = docEl.value ? docEl.selectedOptions[0]?.dataset.name : null;

  if (!name || !email || !svcId || !date || !time) {
    Toast.show('Please fill in all required fields.', 'warning');
    return;
  }

  const res = await post('/api/admin/appointments/book', {
    patientName: name, patientEmail: email, patientPhone: phone,
    serviceId: svcId, serviceName: svcName,
    doctorId: docId, doctorName: docName,
    appointmentDate: date, appointmentTime: time,
    notes, isGuest: false
  });

  if (res.ok) {
    Toast.show('Appointment booked!', 'success');
    closeBookModal();
    setTimeout(() => location.reload(), 800);
  } else {
    Toast.show(res.error ?? 'Failed to book appointment.', 'danger');
  }
};

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
window.confirmAppt = (appt) => {
  document.getElementById('confirm-appt-id').value = appt.id;
  document.getElementById('confirm-modal-message').innerHTML = 
    `Confirming appointment for <strong>${appt.patientName}</strong>.<br/><span class="text-[11px] opacity-70">${appt.serviceName} (${appt.serviceCategory})</span>`;
  
  const docSel = document.getElementById('confirm-doctor');
  const hint  = document.getElementById('doctor-hint');
  
  docSel.value = appt.doctorId || '';
  const category = appt.serviceCategory ? appt.serviceCategory.toLowerCase() : "";
  let shownCount = 0;
  
  Array.from(docSel.options).forEach(opt => {
    if (!opt.value) return;
    const specs = opt.dataset.specialties ? opt.dataset.specialties.toLowerCase().split(',') : [];
    const isMatch = !category || specs.some(s => s.trim() === category || category.includes(s.trim()) || s.trim().includes(category));
    opt.style.display = isMatch ? '' : 'none';
    if (isMatch) shownCount++;
  });

  hint.classList.toggle('hidden', shownCount === 0);
  if (shownCount > 0) hint.textContent = `Matching specialists for ${appt.serviceCategory} shown.`;
  
  showModal('confirm-modal');
};

window.closeConfirmModal = () => hideModal('confirm-modal');

window.submitConfirm = async () => {
  const id       = document.getElementById('confirm-appt-id').value;
  const doctorId = document.getElementById('confirm-doctor').value;

  if (!doctorId) {
    Toast.show('Please assign a doctor to confirm this appointment.', 'warning');
    return;
  }

  const res = await post('/api/admin/appointments/status', { id, status: 'confirmed', doctorId });
  
  if (res.ok) {
    Toast.show('Appointment confirmed!', 'success');
    closeConfirmModal();
    setTimeout(() => location.reload(), 600);
  } else {
    Toast.show(res.error ?? 'Failed to confirm.', 'danger');
  }
};

// ── STATUS UPDATES ───────────────────────────────────────────────────────────
window.updateStatus = (appt, status) => {
  const statusLabels = {
    arrived: { label: "Arrived", type: "info", msg: "Mark patient as <strong>Arrived</strong>? This will notify the doctor and start the wait-time tracker." },
    completed: { label: "Completed", type: "success", msg: "Mark appointment as <strong>Completed</strong>? Ensure all treatments and payments are finalized." },
    no_show: { label: "No-Show", type: "warning", msg: "Mark as <strong>No-Show</strong>? This will free up the slot for other patients." }
  };
  
  const config = statusLabels[status] || { label: status.replace('_', ' '), type: "info", msg: `Update status to ${status}?` };

  Modal.open({
    title: `Change Status: ${config.label}`,
    message: `Patient: <strong>${appt.patientName}</strong><br/>${config.msg}`,
    type: config.type,
    confirmText: `Confirm ${config.label}`,
    onConfirm: async () => {
      const res = await post('/api/admin/appointments/status', { id: appt.id, status: status });
      if (res.ok) { 
        Toast.show(`Status updated to ${config.label}.`, 'success'); 
        setTimeout(() => location.reload(), 600); 
      }
      else Toast.show(res.error ?? 'Failed to update status.', 'danger');
    }
  });
};

// ── CANCEL ────────────────────────────────────────────────────────────────────
window.cancelAppt = (appt) => {
  Modal.open({
    title: 'Cancel Appointment',
    message: `Cancel appointment for <strong>${appt.patientName}</strong>? A waitlist patient may be promoted automatically.`,
    type: 'danger',
    confirmText: 'Yes, Cancel',
    onConfirm: async () => {
      const res = await post('/api/admin/appointments/status', { id: appt.id, status: 'cancelled' });
      if (res.ok) { Toast.show('Appointment cancelled.', 'info'); setTimeout(() => location.reload(), 600); }
      else Toast.show(res.error ?? 'Failed to cancel.', 'danger');
    }
  });
};

// ── DELETE ────────────────────────────────────────────────────────────────────
window.deleteAppt = (appt) => {
    Modal.open({
        title: 'Remove Appointment',
        message: `Permanently remove appointment for <strong>${appt.patientName}</strong> from the records?`,
        type: 'danger',
        confirmText: 'Yes, Remove',
        onConfirm: async () => {
            const res = await post('/api/admin/appointments/delete', { id: appt.id });
            if (res.ok) { Toast.show('Appointment removed.', 'success'); setTimeout(() => location.reload(), 600); }
            else Toast.show(res.error ?? 'Failed to remove.', 'danger');
        }
    });
};

// ── EDIT / RESCHEDULE MODAL ───────────────────────────────────────────────────
window.openEditModal = (appt) => {
  document.getElementById('edit-modal-title').textContent = 'Edit Appointment';
  _setupEditModal(appt);
};

window.openRescheduleModal = (appt) => {
  document.getElementById('edit-modal-title').textContent = 'Reschedule Appointment';
  _setupEditModal(appt);
};

function _setupEditModal(appt) {
  document.getElementById('edit-appt-id').value = appt.id;
  document.getElementById('edit-date').value     = appt.appointmentDate;
  document.getElementById('edit-time').value     = appt.appointmentTime;
  document.getElementById('edit-doctor').value   = appt.doctorId ?? '';
  showModal('edit-modal');
}

window.closeEditModal = () => hideModal('edit-modal');

window.submitReschedule = async () => {
  const id       = document.getElementById('edit-appt-id').value;
  const date     = document.getElementById('edit-date').value;
  const time     = document.getElementById('edit-time').value;
  const doctorId = document.getElementById('edit-doctor').value || null;

  if (!date || !time) {
    Toast.show('Please select a date and time.', 'warning');
    return;
  }

  const res = await post('/api/admin/appointments/reschedule', { id, newDate: date, newTime: time, doctorId });

  if (res.ok) {
    Toast.show('Appointment updated!', 'success');
    closeEditModal();
    setTimeout(() => location.reload(), 800);
  } else {
    Toast.show(res.error ?? 'Failed to update.', 'danger');
  }
};

window.toggleDropdown = (event, btn) => {
    event.stopPropagation(); // Prevents the click from reaching the window
    
    // Close all other dropdowns first
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== btn.nextElementSibling) {
            menu.classList.add('hidden');
        }
    });

    // Toggle the current one
    const currentMenu = btn.nextElementSibling;
    currentMenu.classList.toggle('hidden');
}

// Global click listener to close dropdowns when clicking anywhere else
window.addEventListener('click', function(e) {
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});