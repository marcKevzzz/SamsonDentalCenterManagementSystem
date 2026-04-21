import { Toast, Modal } from '../ui.js';

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json());

// ── Table filter ──────────────────────────────────────────────────────────────
window.filterTable = () => {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('status-filter').value;
  document.querySelectorAll('#appointments-body tr[data-status]').forEach(row => {
    const matchSearch = !q || row.dataset.search?.toLowerCase().includes(q);
    const matchStatus = !status || row.dataset.status === status;
    row.style.display = matchSearch && matchStatus ? '' : 'none';
  });
};

// ── BOOK MODAL ────────────────────────────────────────────────────────────────
window.openBookModal = () => {
  const modal = document.getElementById('book-modal');
  const box   = document.getElementById('book-modal-box');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => box.classList.remove('scale-95', 'opacity-0'));
};

window.closeBookModal = () => {
  const box = document.getElementById('book-modal-box');
  box.classList.add('scale-95', 'opacity-0');
  setTimeout(() => document.getElementById('book-modal').classList.add('hidden'), 200);
};

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
  const modal = document.getElementById('confirm-modal');
  const box   = document.getElementById('confirm-modal-box');
  const msg   = document.getElementById('confirm-modal-message');
  const idInp = document.getElementById('confirm-appt-id');
  const docSel = document.getElementById('confirm-doctor');
  const hint  = document.getElementById('doctor-hint');

  idInp.value = appt.id;
  msg.innerHTML = `Confirming appointment for <strong>${appt.patientName}</strong>.<br/>Service: ${appt.serviceName} (${appt.serviceCategory})`;
  
  // Reset doctor selection
  docSel.value = appt.doctorId || '';
  
  // Filtering doctors by specialty
  const category = appt.serviceCategory ? appt.serviceCategory.toLowerCase() : "";
  let shownCount = 0;
  
  Array.from(docSel.options).forEach(opt => {
    if (!opt.value) return; // Skip "Select a doctor"
    
    const specs = opt.dataset.specialties ? opt.dataset.specialties.toLowerCase().split(',') : [];
    // If no specs defined, show anyway or filter? User said: "if the doctor cant do cosmetics then it shouldnt have the option"
    // We'll show if spec matches or if category is empty
    const isMatch = !category || specs.some(s => s.trim() === category || category.includes(s.trim()) || s.trim().includes(category));
    
    opt.style.display = isMatch ? '' : 'none';
    if (isMatch) shownCount++;
  });

  if (shownCount > 0) {
    hint.classList.remove('hidden');
    hint.textContent = `Note: Showing ${shownCount} doctors matching "${appt.serviceCategory}".`;
  } else {
    hint.classList.remove('hidden');
    hint.textContent = `Warning: No doctors found for specialty "${appt.serviceCategory}". Showing all active doctors.`;
    Array.from(docSel.options).forEach(opt => opt.style.display = '');
  }

  modal.classList.remove('hidden');
  requestAnimationFrame(() => box.classList.remove('scale-95', 'opacity-0'));
};

window.closeConfirmModal = () => {
  const box = document.getElementById('confirm-modal-box');
  box.classList.add('scale-95', 'opacity-0');
  setTimeout(() => document.getElementById('confirm-modal').classList.add('hidden'), 200);
};

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
    arrived: "Arrived",
    completed: "Completed",
    "no-show": "No-Show"
  };
  const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  const type = status === 'completed' ? 'success' : (status === 'no-show' ? 'warning' : 'info');

  Modal.open({
    title: `Mark as ${label}`,
    message: `Mark appointment for <strong>${appt.patientName}</strong> as <strong>${label}</strong>?`,
    type: type,
    confirmText: `Yes, ${label}`,
    onConfirm: async () => {
      const res = await post('/api/admin/appointments/status', { id: appt.id, status: status });
      if (res.ok) { Toast.show(`Appointment ${label.toLowerCase()}.`, 'success'); setTimeout(() => location.reload(), 600); }
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
  _openEditModalWith(appt);
};

window.openRescheduleModal = (appt) => {
  document.getElementById('edit-modal-title').textContent = 'Reschedule Appointment';
  _openEditModalWith(appt);
};

function _openEditModalWith(appt) {
  document.getElementById('edit-appt-id').value = appt.id;
  document.getElementById('edit-date').value     = appt.appointmentDate;
  document.getElementById('edit-time').value     = appt.appointmentTime;
  document.getElementById('edit-doctor').value   = appt.doctorId ?? '';

  const modal = document.getElementById('edit-modal');
  const box   = document.getElementById('edit-modal-box');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => box.classList.remove('scale-95', 'opacity-0'));
}

window.closeEditModal = () => {
  const box = document.getElementById('edit-modal-box');
  box.classList.add('scale-95', 'opacity-0');
  setTimeout(() => document.getElementById('edit-modal').classList.add('hidden'), 200);
};

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