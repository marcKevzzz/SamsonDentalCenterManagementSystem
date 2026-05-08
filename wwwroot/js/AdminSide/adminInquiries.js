import { AdminStore } from "./adminStore.js";

/**
 * Admin Inquiries Module
 * Handles real-time patient messaging and support tickets.
 */
let ALL_INQUIRIES = [];
let ACTIVE_INQUIRY_ID = null;

const selectors = {
  list: "#inquiry-list",
  chatEmpty: "#chat-empty",
  chatMain: "#chat-main",
  chatMessages: "#chat-messages",
  chatPatientName: "#chat-patient-name",
  chatSubject: "#chat-subject",
  chatDeactivatedBadge: "#chat-deactivated-badge",
  chatAvatar: "#chat-avatar",
  chatInput: "#chat-input",
  sidebar: "#inquiry-sidebar",
  adminId: "#admin-id",
};

const predefined = {
  schedule:
    "We can help with that. Please let us know your preferred new date and time so we can check our availability.",
  billing:
    "Our billing department has been notified of your concern. We will review your account and get back to you within 24 hours.",
  followup:
    "Thank you for the update. We have noted this in your records. Would you like to schedule a follow-up consultation?",
  thankyou:
    "You're very welcome! If you have any more questions, feel free to reach out. Have a great day!",
};

async function refreshInquiries(force = false) {
  const data = await AdminStore.loadData(
    "inquiries",
    "/api/admin/data/inquiries",
    { force }
  );
  if (data) initializeWithData({ inquiries: data });
}

document.addEventListener("DOMContentLoaded", async () => {
  window.openNewInquiryModal = openNewInquiryModal;
  window.closeNewInquiryModal = closeNewInquiryModal;
  window.assignDoctor = assignDoctor;

  await refreshInquiries();
  await loadDoctorsForAssignment();

  // Show Assign Doctor only for Admin and Doctor
  const role = document.body.dataset.role || 'admin';
  if (role === 'admin' || role === 'doctor') {
      const container = document.getElementById("assign-doctor-container");
      if (container) container.classList.remove("hidden");
  }

  // Check for patientId in URL
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patientId');
  if (patientId) {
    await openNewInquiryModal();
    const select = document.getElementById("new-inquiry-patient");
    if (select) {
      select.value = patientId;
      // Also clear URL param to prevent re-opening on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
});

async function openNewInquiryModal() {
  const modal = document.getElementById("new-inquiry-modal");
  const select = document.getElementById("new-inquiry-patient");
  if (!modal || !select) return;

  modal.classList.remove("hidden");

  // Fetch staff
  try {
    const res = await fetch("/api/admin/data/users");
    const data = await res.json();
    if (data.ok) {
      const staffRoles = ["admin", "doctor", "receptionist"];
      const staff = data.data.filter(u => staffRoles.includes(u.role?.toLowerCase()));
      
      select.innerHTML = '<option value="">Select a colleague...</option>' + 
        staff.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName} (${p.role})</option>`).join("");
    }
  } catch (err) {
    select.innerHTML = '<option value="">Failed to load staff</option>';
  }
}

function closeNewInquiryModal() {
  const modal = document.getElementById("new-inquiry-modal");
  if (modal) modal.classList.add("hidden");
  document.getElementById("new-inquiry-form")?.reset();
}

document.getElementById("new-inquiry-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const patientId = document.getElementById("new-inquiry-patient").value;
  const subject = document.getElementById("new-inquiry-subject").value;
  const message = document.getElementById("new-inquiry-message").value;

  if (!patientId || !subject || !message) return;

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';

  try {
    const res = await fetch("/api/inquiry/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        subject,
        message,
        senderId: document.getElementById("admin-id")?.value,
        isFromStaff: true
      })
    });
    const data = await res.json();
    if (data.ok) {
      closeNewInquiryModal();
      await refreshInquiries(true); // Refresh sidebar
      
      // Auto-select the new inquiry
      setTimeout(() => {
        const item = document.querySelector(`[data-id="${data.inquiryId}"]`);
        if (item) item.click();
      }, 500);
    } else {
      alert(data.error || "Failed to create inquiry");
    }
  } catch (err) {
    alert("An error occurred");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
});

// Listen for SignalR updates from AdminStore
window.addEventListener("admin:inquiries:updated", (e) => {
  console.log("Inquiry update received via SignalR", e.detail);
  refreshInquiries(true);
  if (ACTIVE_INQUIRY_ID) fetchMessages();
});

function initializeWithData(data) {
  console.log("[Inquiry Debug] Initializing with data:", data);
  ALL_INQUIRIES = data.inquiries || [];
  renderInquiryList();

  // Auto-select first inquiry on desktop if none active
  if (
    !ACTIVE_INQUIRY_ID &&
    ALL_INQUIRIES.length > 0 &&
    window.innerWidth >= 768
  ) {
    const first = ALL_INQUIRIES[0];
    const other = getOtherParty(first);
    const displayName = getDisplayName(first);
    const avatarUrl = other?.avatarUrl || "";
    const isActive = other?.isActive ?? true;

    // We can't easily find the "element" here, so we simulate the click after a short delay
    setTimeout(() => {
      const firstEl = document.querySelector(`${selectors.list} > div`);
      if (firstEl) firstEl.click();
    }, 100);
  }
}

function getOtherParty(inq) {
  const myId = document.querySelector(selectors.adminId)?.value;
  if (!myId) return inq.patient;

  // If I am the creator (sender), the other party is the 'patient' target
  if (inq.senderId === myId) return inq.patient;

  // If I am the 'patient' target, the other party is the 'sender' creator
  if (inq.patientId === myId) return inq.sender;

  // Default fallback for staff viewing patient support tickets
  return inq.patient;
}

function getDisplayName(inq) {
  console.log("[Inquiry Debug] Resolving name for:", inq);
  const other = getOtherParty(inq);
  
  if (other && (other.firstName || other.lastName))
    return `${other.firstName || ''} ${other.lastName || ''}`.trim();
  if (other && other.fullName) return other.fullName;

  const guestName =
    `${inq.guestFirstName || ""} ${inq.guestLastName || ""}`.trim();
  if (guestName) return guestName;

  if (inq.patientName && inq.patientName !== "null null")
    return inq.patientName;
    
  return "Guest Patient";
}

function timeAgo(date) {
  if (!date) return "N/A";
  let dStr = String(date);
  if (!dStr.endsWith('Z') && !dStr.includes('+') && dStr.includes('T')) dStr += 'Z';
  
  const now = new Date();
  const past = new Date(dStr);
  
  if (isNaN(past.getTime())) return "N/A";

  const seconds = Math.floor((now - past) / 1000);
  
  // Handle clock skew: if event happened up to 5 seconds in the future or within 60 seconds in the past
  if (seconds < 60) return "just now";

  let interval = seconds / 31536000;
  if (interval >= 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval >= 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval >= 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval >= 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + "m ago";
  return "just now";
}

function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
}

function formatDateSeparator(date) {
  let dStr = String(date);
  if (!dStr.endsWith('Z') && !dStr.includes('+') && dStr.includes('T')) dStr += 'Z';
  const d = new Date(dStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function renderInquiryList() {
  const container = document.querySelector(selectors.list);
  if (!container) return;

  if (ALL_INQUIRIES.length === 0) {
    container.innerHTML = `
            <div class="p-8 text-center">
                <i class="fa-solid fa-inbox text-slate-200 text-3xl mb-3 block"></i>
                <p class="text-[12px] text-brand/40 font-medium">No inquiries found</p>
            </div>`;
    return;
  }

  container.innerHTML = ALL_INQUIRIES.map((inq) => {
    const other = getOtherParty(inq);
    const displayName = getDisplayName(inq);
    const avatarUrl = other?.avatarUrl || "";
    const isActive = other?.isActive ?? true;
    const initials = displayName.trim().split(" ").map(n => n[0]).slice(0, 2).join("");
    const isPending = inq.status === "pending";
    const isUnread = !inq.isRead;
    
    let cStr = String(inq.createdAt);
    if (!cStr.endsWith('Z') && !cStr.includes('+') && cStr.includes('T')) cStr += 'Z';
    const date = new Date(cStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const statusBadge = `
      <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
        inq.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 
        inq.status === 'replied' ? 'bg-blue-100 text-blue-700' : 
        'bg-amber-100 text-amber-700'
      }">
        ${inq.status}
      </span>
    `;

    return `
            <div class="inquiry-item px-4 py-2 hover:bg-slate-50 cursor-pointer transition-all border-l-2 ${isUnread ? "border-primary bg-primary/5" : "border-transparent"} ${ACTIVE_INQUIRY_ID === inq.id ? "bg-slate-100 border-primary" : ""}"
                data-id="${inq.id}" data-name="${displayName.replace(/"/g, "&quot;")}" data-subject="${inq.subject.replace(/"/g, "&quot;")}" data-avatar="${avatarUrl}" data-active="${isActive}">
                <div class="flex items-center gap-3 mb-1 pointer-events-none">
                    ${
                      avatarUrl
                        ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover border border-slate-200" />`
                        : `<div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">${initials}</div>`
                    }
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="text-[13px] ${isUnread ? "font-bold text-brand" : "font-medium text-slate-600"} truncate">${displayName}</span>
                                    ${isUnread ? `<span class="unread-dot w-2 h-2 rounded-full bg-primary animate-pulse"></span>` : ""}
                                </div>
                                <div class="flex items-center gap-2 mt-0.5">
                                    ${statusBadge}
                                    ${!isActive ? `<span class="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Deactivated</span>` : ""}
                                </div>
                            </div>
                            <span class="text-[10px] text-slate-400">${timeAgo(inq.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
  }).join("");

  // Re-attach listeners
  container.querySelectorAll(".inquiry-item").forEach((el) => {
    el.onclick = () => {
      const { id, name, subject, avatar, active } = el.dataset;
      loadInquiry(id, name, subject, avatar, active === "true", el);
    };
  });
}

async function loadInquiry(id, name, subject, avatarUrl, isActive, element) {
  ACTIVE_INQUIRY_ID = id;
  const inq = ALL_INQUIRIES.find(x => x.id === id);

  // Mobile visibility
  if (window.innerWidth < 768) {
    document.querySelector(selectors.sidebar).classList.add("hidden");
    document.querySelector(selectors.chatMain).classList.remove("hidden");
    document.querySelector(selectors.chatMain).classList.add("flex");
  }

  // Highlight active item
  document.querySelectorAll(".inquiry-item").forEach((el) => {
    el.classList.remove("bg-slate-100", "border-primary");
    el.classList.add("border-transparent");
  });
  if (element) {
    element.classList.add("bg-slate-100", "border-primary");
    element.classList.remove("border-transparent");
    const dot = element.querySelector(".unread-dot");
    if (dot) dot.remove();
  }

  document
    .querySelector(selectors.chatEmpty)
    .classList.add("opacity-0", "pointer-events-none");
  document.querySelector(selectors.chatPatientName).innerText = name;
  document.querySelector(selectors.chatSubject).innerText = subject;

  const badge = document.querySelector(selectors.chatDeactivatedBadge);
  isActive ? badge.classList.add("hidden") : badge.classList.remove("hidden");

  const avatarBox = document.querySelector(selectors.chatAvatar);
  if (avatarUrl) {
    avatarBox.innerHTML = `<img src="${avatarUrl}" class="w-full h-full rounded-full object-cover" />`;
    avatarBox.classList.remove("bg-primary");
  } else {
    const initials = name.trim().split(" ").map(n => n[0]).slice(0, 2).join("");
    avatarBox.innerText = (initials || "G").toUpperCase();
    avatarBox.classList.add("bg-primary");
  }

  const select = document.getElementById("assign-doctor-select");
  if (select) {
    select.value = inq.assignedDoctorId || "";
  }

  // Render Patient Details Sidebar
  renderPatientSidebar(inq);

  // Mark as read in DB if not read
  if (!inq.isRead) {
    fetch(`/api/admin/data/inquiries/mark-read/${id}`, { method: 'POST' });
    inq.isRead = true;
    renderInquiryList();
  }

  // Show/Hide features if it's a staff-to-staff thread
  const isStaffThread = inq.isFromStaff === true || inq.is_from_staff === true;
  const resolveBtn = document.getElementById('resolve-btn');
  const predefinedReplies = document.getElementById('predefined-replies');
  const patientSidebar = document.getElementById('inquiry-patient-sidebar');
  const internalNoteContainer = document.getElementById('internal-note-container');
  const assignDoctorContainer = document.getElementById('assign-doctor-container');

  if (isStaffThread) {
    if (resolveBtn) resolveBtn.classList.add('hidden');
    if (predefinedReplies) predefinedReplies.classList.add('hidden');
    if (internalNoteContainer) internalNoteContainer.classList.add('hidden');
    if (assignDoctorContainer) assignDoctorContainer.classList.add('hidden');
    if (patientSidebar) patientSidebar.classList.remove('hidden');
  } else {
    // Show them for patient threads
    if (resolveBtn) {
        if (inq.status === 'resolved') resolveBtn.classList.add('hidden');
        else resolveBtn.classList.remove('hidden');
    }
    if (predefinedReplies) predefinedReplies.classList.remove('hidden');
    if (patientSidebar) patientSidebar.classList.remove('hidden');
    if (internalNoteContainer) internalNoteContainer.classList.remove('hidden');
    
    if (assignDoctorContainer) {
        const role = document.body.dataset.role || 'admin';
        // Receptionists and Admins can assign doctors; Doctors cannot assign themselves/others here.
        if (role === 'admin' || role === 'receptionist') {
            assignDoctorContainer.classList.remove('hidden');
        } else {
            assignDoctorContainer.classList.add('hidden');
        }
    }
  }

  await fetchMessages();
}

async function loadDoctorsForAssignment() {
  const select = document.getElementById("assign-doctor-select");
  if (!select) return;
  try {
    const res = await fetch("/api/admin/data/doctors");
    const data = await res.json();
    if (data.ok) {
      let html = '<option value="">Assign to Doctor...</option>';
      data.data.forEach(d => {
        html += `<option value="${d.profileId}">${d.title} ${d.profile?.firstName || ''} ${d.profile?.lastName || ''}</option>`;
      });
      select.innerHTML = html;
    }
  } catch (e) {
    console.error("Failed to load doctors for assignment", e);
  }
}

async function assignDoctor(doctorId) {
  if (!ACTIVE_INQUIRY_ID) return;
  
  try {
    const res = await fetch("/api/admin/data/inquiries/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ACTIVE_INQUIRY_ID, doctorId: doctorId || null })
    });
    
    if (res.ok) {
      const inq = ALL_INQUIRIES.find(x => x.id === ACTIVE_INQUIRY_ID);
      if (inq) inq.assignedDoctorId = doctorId || null;
      Toast.show(doctorId ? "Inquiry assigned to doctor" : "Doctor assignment removed", "success");
    } else {
      throw new Error("Failed to assign doctor");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to assign doctor");
  }
}

window.markAsResolved = async function() {
  if (!ACTIVE_INQUIRY_ID) return;
  
  if (!confirm("Are you sure you want to mark this inquiry as resolved?")) return;

  try {
    const res = await fetch("/api/admin/data/inquiries/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ACTIVE_INQUIRY_ID, status: "resolved" })
    });

    if (res.ok) {
      const inq = ALL_INQUIRIES.find(x => x.id === ACTIVE_INQUIRY_ID);
      if (inq) inq.status = "resolved";
      
      const resolveBtn = document.getElementById('resolve-btn');
      if (resolveBtn) resolveBtn.classList.add('hidden');
      renderInquiryList();
      Toast.show("Inquiry marked as resolved", "success");
    }
  } catch (err) {
    console.error("Failed to mark resolved:", err);
  }
}

function renderPatientSidebar(inq) {
  const sidebar = document.getElementById('inquiry-patient-sidebar');
  if (!sidebar) return;

  const other = inq ? getOtherParty(inq) : null;

  if (!inq || !other) {
      sidebar.innerHTML = `
        <div class="p-6 text-center">
            <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                <i class="fa-solid fa-user-secret text-2xl"></i>
            </div>
            <h4 class="text-[14px] font-bold text-brand">${inq ? getDisplayName(inq) : 'Guest Patient'}</h4>
            <p class="text-[11px] text-brand/40 mt-1">${inq && inq.patientId ? 'Patient account found but profile error.' : 'This user is not registered in our system yet.'}</p>
            ${inq && inq.guestEmail ? `<div class="mt-4 p-3 bg-slate-50 rounded-xl text-left border border-slate-100">
                <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">Guest Email</div>
                <div class="text-[11px] text-brand truncate">${inq.guestEmail}</div>
            </div>` : ''}
        </div>
      `;
      return;
  }

  const role = document.body.dataset.role || 'admin';
  const basePath = role === 'admin' ? '/Admin' : (role === 'doctor' ? '/Doctor' : '/Receptionist');

  const p = other;
  const initials = (p.firstName?.[0] || '') + (p.lastName?.[0] || '');

  sidebar.innerHTML = `
    <div class="p-6">
        <div class="text-center mb-6">
            <div class="relative inline-block">
                ${p.avatarUrl ? `<img src="${p.avatarUrl}" class="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md mx-auto" />` : `<div class="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto border-2 border-white shadow-sm">${initials}</div>`}
                <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${p.isActive ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
            </div>
            <h4 class="text-[15px] font-bold text-brand mt-3">${p.fullName || (p.firstName + ' ' + p.lastName)}</h4>
            ${(inq.isFromStaff || inq.is_from_staff) 
                ? `<p class="text-[11px] text-brand/40 uppercase font-bold tracking-widest">Role: ${p.role || 'Staff'}</p>`
                : `<p class="text-[11px] text-brand/40">Patient ID: ${inq.patientId?.split('-')[0] || 'N/A'}</p>`
            }
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact Information</label>
                <div class="space-y-2">
                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:border-primary/20">
                        <div class="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                            <i class="fa-solid fa-envelope text-[11px]"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Email</div>
                            <div class="text-[12px] font-medium text-brand truncate">${p.email || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:border-primary/20">
                        <div class="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                            <i class="fa-solid fa-phone text-[11px]"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Phone</div>
                            <div class="text-[12px] font-medium text-brand truncate">${p.phone || p.phoneNumber || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quick Stats</label>
                <div class="grid grid-cols-2 gap-2">
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Gender</div>
                        <div class="text-[12px] font-medium text-brand capitalize">${p.sex || 'N/A'}</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Age</div>
                        <div class="text-[12px] font-medium text-brand">${p.dob ? Math.floor((new Date() - new Date(p.dob)) / 31557600000) : 'N/A'}</div>
                    </div>
                </div>
                <div class="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div class="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Address</div>
                    <div class="text-[12px] font-medium text-brand leading-relaxed">${p.address || 'No address provided'}</div>
                </div>
            </div>
        </div>

        ${!(inq.isFromStaff || inq.is_from_staff) ? `
        <div class="mt-8 pt-6 border-t border-slate-100">
            <a href="${basePath}/Patients/Details?id=${inq.patientId}" class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-white text-[12px] font-bold hover:bg-brand/90 transition-all">
                <i class="fa-solid fa-folder-open"></i>
                View Full Medical Record
            </a>
        </div>` : ''}
    </div>
  `;
}

async function fetchMessages() {
  if (!ACTIVE_INQUIRY_ID) return;
  try {
    const res = await fetch(`/api/inquiry/messages/${ACTIVE_INQUIRY_ID}`);
    if (!res.ok) throw new Error("Failed to load messages");

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json"))
      throw new Error("Invalid response format");

    const data = await res.json();

    const container = document.querySelector(selectors.chatMessages);
    const wasAtBottom =
      container.scrollHeight - container.clientHeight <=
      container.scrollTop + 100;

    let html = "";
    let lastDate = null;

    data.messages.forEach((msg) => {
      let dStr = String(msg.created_at);
      if (!dStr.endsWith('Z') && !dStr.includes('+') && dStr.includes('T')) dStr += 'Z';
      const msgDate = new Date(dStr).toDateString();
      if (msgDate !== lastDate) {
        html += `
                    <div class="flex items-center gap-4 ">
                        <div class="flex-1 h-px bg-slate-200"></div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">${formatDateSeparator(msg.created_at)}</span>
                        <div class="flex-1 h-px bg-slate-200"></div>
                    </div>`;
        lastDate = msgDate;
      }

      const currentUserId = document.querySelector(selectors.adminId)?.value?.toLowerCase();
      const senderId = msg.sender_id?.toLowerCase();
      // Primary: match by UUID. Fallback: if sender_id missing, match by is_from_staff AND sender matches current user name hint
      const isMe = senderId ? senderId === currentUserId : false;

      if (msg.is_internal) {
          html += `
                <div class="flex justify-center my-2">
                    <div class="max-w-[90%] bg-amber-50 border border-amber-100 rounded-2xl p-3 shadow-sm">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Internal Note</span>
                            <span class="text-[10px] font-bold text-brand">${msg.sender_name} (${msg.sender_role})</span>
                        </div>
                        <p class="text-[12px] text-brand/70 leading-relaxed italic">${msg.message}</p>
                        <div class="text-[9px] mt-1 text-amber-500/70 font-bold">${new Date(dStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                </div>`;
      } else {
          html += `
                <div class="flex ${isMe ? "justify-end" : "justify-start"}">
                    <div class="max-w-[85%] md:max-w-[70%]">
                        ${!isMe ? `<div class="text-left text-[9px] font-bold text-slate-400 mb-1 px-1">${msg.sender_name} (${msg.sender_role})</div>` : ''}
                        <div class="px-4 py-3 rounded-2xl text-[12.5px] ${isMe ? "bg-primary text-white rounded-tr-none shadow-md shadow-primary/20" : "bg-slate-100 border border-slate-200 text-brand rounded-tl-none shadow-sm shadow-slate-900/15"}">
                            <p class="leading-relaxed font-medium whitespace-pre-wrap">${msg.message}</p>
                            <div class="text-[9px] mt-1.5 opacity-60 font-bold">${new Date(dStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                    </div>
                </div>`;
      }
    });

    container.innerHTML = html;

    if (wasAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error("Failed to fetch messages:", err);
  }
}

async function sendMessage() {
  const input = document.querySelector(selectors.chatInput);
  const adminId = document.querySelector(selectors.adminId).value;
  const msg = input.value.trim();
  if (!msg || !ACTIVE_INQUIRY_ID) return;

  input.disabled = true;

  const isInternal = document.getElementById("internal-note-toggle")?.checked || false;

  try {
    const res = await fetch("/api/inquiry/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: ACTIVE_INQUIRY_ID,
        senderId: adminId,
        message: msg,
        isFromStaff: true,
        isInternal: isInternal
      }),
    });

    if (res.ok) {
      input.value = "";
      input.style.height = "auto";
      const toggle = document.getElementById("internal-note-toggle");
      if (toggle) toggle.checked = false;
      
      await fetchMessages();
      const container = document.querySelector(selectors.chatMessages);
      container.scrollTop = container.scrollHeight;

      // Mark as replied in the list
      const inq = ALL_INQUIRIES.find((x) => x.id === ACTIVE_INQUIRY_ID);
      if (inq) inq.status = "replied";
      renderInquiryList();
    }
  } finally {
    input.disabled = false;
    input.focus();
  }
}

// Global Exports
window.backToList = () => {
  document.querySelector(selectors.sidebar).classList.remove("hidden");
  const main = document.querySelector(selectors.chatMain);
  main.classList.add("hidden");
  main.classList.remove("flex");
};

window.usePredefined = (key) => {
  const input = document.querySelector(selectors.chatInput);
  input.value = predefined[key];
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
  input.focus();
};

window.sendMessage = sendMessage;

// Event Listeners for Input
document.addEventListener("input", (e) => {
  if (e.target.id === "chat-input") {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  }
});

document.addEventListener("keypress", (e) => {
  if (e.target.id === "chat-input" && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const openNew = params.get('openNew');
  if (openNew === 'true') {
    openNewInquiryModal();
  }
});
