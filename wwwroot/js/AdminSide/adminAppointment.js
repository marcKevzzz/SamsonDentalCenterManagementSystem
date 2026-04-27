import { Toast, Modal } from '../ui.js';

// ── Data & State ─────────────────────────────────────────────────────────────
const ALL_APPT = JSON.parse(document.getElementById('appointments-data').textContent);
const PAGE_SIZE = 20;
let currentPage = 1;
let filtered = [...ALL_APPT];

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async r => {
    if (!r.ok) {
        let err = "Server error " + r.status;
        try { const data = await r.json(); err = data.error || err; } catch(e) {}
        throw new Error(err);
    }
    return r.json();
  }).catch(err => {
    console.error("[POST Error]", err);
    return { ok: false, error: err.message };
  });

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
});

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('appointments-body');
  const pagBar = document.getElementById('paginationBar');
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-[12px] text-brand-400">No appointments found.</td></tr>`;
    pagBar.classList.add('hidden');
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(appt => rowHTML(appt)).join('');

  if (filtered.length > PAGE_SIZE) {
    pagBar.classList.remove('hidden');
    pagBar.classList.add('flex');
    document.getElementById('paginationInfo').textContent = 
      `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} appointments`;
    renderPaginationBtns(totalPages);
  } else {
    pagBar.classList.add('hidden');
    pagBar.classList.remove('flex');
  }
}

function rowHTML(appt) {
  const shortId = "#APT-" + appt.id.slice(0, 4).toUpperCase();
  
  const statusConfig = {
    confirmed: { classes: "bg-emerald-50 text-emerald-600 border-emerald-100", label: "Confirmed" },
    pending:   { classes: "bg-blue-50 text-blue-600 border-blue-100",  label: "Pending" },
    arrived:   { classes: "bg-amber-50 text-amber-600 border-amber-100",  label: "Arrived" },
    completed: { classes: "bg-slate-50 text-slate-600 border-slate-100", label: "Completed" },
    no_show:   { classes: "bg-red-50 text-red-600 border-red-100",    label: "No-Show" },
    cancelled: { classes: "bg-red-50 text-red-600 border-red-100",    label: "Cancelled" },
    waitlist:  { classes: "bg-purple-50 text-purple-600 border-purple-100", label: "Waitlist" }
  };
  const config = statusConfig[appt.status.toLowerCase()] || { classes: "bg-slate-50 text-slate-600 border-slate-100", label: appt.status };

  const apptJson = JSON.stringify(appt).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

  let workflowBtn = '';
  if (appt.status === "pending") {
    workflowBtn = `<button onclick='confirmAppt(${apptJson})' class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-sm">Confirm</button>`;
  } else if (appt.status === "confirmed") {
    workflowBtn = `<button onclick='updateStatus(${apptJson}, "arrived")' class="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors shadow-sm">Check-In</button>`;
  } else if (appt.status === "arrived") {
    workflowBtn = `<button onclick='updateStatus(${apptJson}, "completed")' class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-sm">Checkout</button>`;
  }

  return `
    <tr class="group hover:bg-slate-50/80 transition-colors">
      <td class="px-4 py-4">
        <span class="text-[10px] font-bold text-brand-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">${shortId}</span>
      </td>
      <td class="px-4 py-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] uppercase">
            ${appt.patientName[0]}
          </div>
          <div>
            <div class="text-[13px] font-bold text-brand-900 leading-none mb-1">${appt.patientName}</div>
            <div class="text-[10.5px] text-brand-400">${appt.patientEmail}</div>
          </div>
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="text-[12.5px] font-medium text-brand-800">${appt.serviceName}</div>
        <div class="text-[11px] text-brand-400">
          <i class="fa-solid fa-user-doctor text-[9px] mr-1"></i>
          ${appt.doctorName || "Unassigned"}
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="text-[12.5px] font-bold text-brand-900">${appt.appointmentDateFormatted}</div>
        <div class="text-[11px] text-brand-400">${appt.appointmentTime}</div>
      </td>
      <td class="px-4 py-4 text-center">
        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${config.classes} font-display uppercase tracking-wider">
          ${config.label}
        </span>
      </td>
      <td class="px-4 py-4 text-right whitespace-nowrap">
        <div class="flex items-center justify-end gap-2">
          ${workflowBtn}
          <div class="inline-block text-left action-dropdown">
            <button onclick="toggleDropdown(event, this)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand-400 transition-colors">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="dropdown-menu hidden absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg shadow-brand-900/5 z-50 overflow-hidden">
              <div class="py-1">
                ${appt.status === "pending" ? `<button onclick='confirmAppt(${apptJson})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-check-circle w-4"></i> Confirm Booking</button>` : ''}
                ${appt.status === "confirmed" ? `<button onclick='updateStatus(${apptJson}, "arrived")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-person-walking-arrow-right w-4"></i> Mark Arrived</button>` : ''}
                ${appt.status === "confirmed" || appt.status === "arrived" ? `
                  <button onclick='updateStatus(${apptJson}, "completed")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-circle-check w-4"></i> Mark Completed</button>
                  <button onclick='updateStatus(${apptJson}, "no_show")' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-user-slash w-4"></i> Mark No-Show</button>
                ` : ''}
                <div class="h-px bg-slate-100 my-1"></div>
                ${['confirmed', 'pending', 'arrived'].includes(appt.status) ? `
                  <button onclick='openEditModal(${apptJson})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-brand-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-rotate w-4"></i> Reschedule</button>
                  <button onclick='cancelAppt(${apptJson})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-accent hover:bg-red-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-ban w-4"></i> Cancel</button>
                ` : ''}
                ${['cancelled', 'no-show', 'completed'].includes(appt.status) ? `<button onclick='openBookModal()' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-primary hover:bg-blue-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-plus w-4"></i> Book Again</button>` : ''}
                ${['waitlist', 'no-show', 'cancelled', 'completed'].includes(appt.status) ? `<button onclick='deleteAppt(${apptJson})' class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"><i class="fa-solid fa-trash-can w-4"></i> Remove Record</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}

function renderPaginationBtns(totalPages) {
  const container = document.getElementById("paginationBtns");
  let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-page="${i}" class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg ${i === currentPage ? "bg-primary text-white" : "border border-slate-200 text-brand-500 hover:bg-slate-50"}">${i}</button>`;
  }
  html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>`;
  container.innerHTML = html;
}

document.addEventListener("click", (e) => {
  const pageBtn = e.target.closest(".page-btn");
  if (!pageBtn || pageBtn.disabled) return;
  currentPage = parseInt(pageBtn.dataset.page);
  renderTable();
});

// ── Table filter ──────────────────────────────────────────────────────────────
window.filterTable = () => {
  const q      = document.getElementById('search-input').value.toLowerCase().trim();
  const status = document.getElementById('status-filter').value;
  const date   = document.getElementById('date-filter').value;

  filtered = ALL_APPT.filter(appt => {
    const matchSearch = !q || appt.patientName.toLowerCase().includes(q) || (appt.doctorName && appt.doctorName.toLowerCase().includes(q)) || appt.serviceName.toLowerCase().includes(q);
    const matchStatus = !status || appt.status.toLowerCase() === status.toLowerCase();
    const matchDate   = !date || appt.appointmentDate === date;
    return matchSearch && matchStatus && matchDate;
  });

  currentPage = 1;
  renderTable();
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
    event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== btn.nextElementSibling) menu.classList.add('hidden');
    });
    btn.nextElementSibling.classList.toggle('hidden');
}

window.addEventListener('click', function(e) {
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    }
});