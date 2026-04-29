import { AdminStore } from "./AdminStore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
  const data = await AdminStore.loadData(
    "inquiries",
    "/api/admin/data/inquiries",
  );
  if (data) initializeWithData({ inquiries: data });
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
    const displayName = getDisplayName(first);
    const avatarUrl = first.patient?.avatarUrl || "";
    const isActive = first.patient?.isActive ?? true;

    // We can't easily find the "element" here, so we simulate the click after a short delay
    setTimeout(() => {
      const firstEl = document.querySelector(`${selectors.list} > div`);
      if (firstEl) firstEl.click();
    }, 100);
  }
}

function getDisplayName(inq) {
  console.log("[Inquiry Debug] Resolving name for:", inq);
  if (inq.patient && inq.patient.firstName)
    return `${inq.patient.firstName} ${inq.patient.lastName}`;
  if (inq.patient && inq.patient.fullName) return inq.patient.fullName;

  const guestName =
    `${inq.guestFirstName || ""} ${inq.guestLastName || ""}`.trim();
  if (guestName) return guestName;

  if (inq.patientName && inq.patientName !== "null null")
    return inq.patientName;
  return "Guest Patient";
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "now";
}

function formatDateSeparator(date) {
  const d = new Date(date);
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
                <p class="text-[12px] text-brand-400 font-medium">No inquiries found</p>
            </div>`;
    return;
  }

  container.innerHTML = ALL_INQUIRIES.map((inq) => {
    const displayName = getDisplayName(inq);
    const avatarUrl = inq.patient?.avatarUrl || "";
    const isActive = inq.patient?.isActive ?? true;
    const initials =
      displayName.length > 0 ? displayName[0].toUpperCase() : "G";
    const isPending = inq.status === "pending";
    const date = new Date(inq.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return `
            <div class="inquiry-item px-4 py-2 hover:bg-slate-50 cursor-pointer transition-all border-l-2 ${isPending ? "border-amber-400 bg-primary/8" : "border-transparent"} ${ACTIVE_INQUIRY_ID === inq.id ? "bg-slate-100 border-primary" : ""}"
                data-id="${inq.id}" data-name="${displayName.replace(/"/g, "&quot;")}" data-subject="${inq.subject.replace(/"/g, "&quot;")}" data-avatar="${avatarUrl}" data-active="${isActive}">
                <div class="flex items-center gap-3 mb-1 pointer-events-none">
                    ${
                      avatarUrl
                        ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover border border-slate-200" />`
                        : `<div class="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[11px] font-bold">${initials}</div>`
                    }
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="text-[13px] font-bold text-slate-900 truncate">${displayName}</span>
                                    ${isPending ? `<span class="unread-dot w-2 h-2 rounded-full bg-amber-500"></span>` : ""}
                                </div>
                                ${!isActive ? `<span class="w-fit text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mt-0.5">Deactivated</span>` : ""}
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
    avatarBox.classList.remove("bg-brand");
  } else {
    avatarBox.innerText = name[0].toUpperCase();
    avatarBox.classList.add("bg-brand");
  }

  await fetchMessages();
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
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== lastDate) {
        html += `
                    <div class="flex items-center gap-4 ">
                        <div class="flex-1 h-px bg-slate-200"></div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">${formatDateSeparator(msg.created_at)}</span>
                        <div class="flex-1 h-px bg-slate-200"></div>
                    </div>`;
        lastDate = msgDate;
      }

      html += `
                <div class="flex ${msg.is_from_staff ? "justify-end" : "justify-start"}">
                    <div class="max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-[12.5px] ${msg.is_from_staff ? "bg-primary text-white rounded-tr-none shadow-md shadow-primary/20" : "bg-slate-100 border border-slate-200 text-brand rounded-tl-none shadow-sm shadow-slate-900/15"}">
                        <p class="leading-relaxed font-medium whitespace-pre-wrap">${msg.message}</p>
                        <div class="text-[9px] mt-1.5 opacity-60 font-bold">${new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                </div>`;
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

  try {
    const res = await fetch("/api/inquiry/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: ACTIVE_INQUIRY_ID,
        senderId: adminId,
        message: msg,
        isFromStaff: true,
      }),
    });

    if (res.ok) {
      input.value = "";
      input.style.height = "auto";
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

// Auto-refresh messages
setInterval(() => {
  if (ACTIVE_INQUIRY_ID) fetchMessages();
}, 10000);
