// ─────────────────────────────────────────────
// profile.js  —  ES Module
// ─────────────────────────────────────────────

// ── Cookie helper ─────────────────────────────

import { Modal, Toast } from "./ui.js";

export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// ── Color helper ──────────────────────────────

export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "000000".substring(0, 6 - c.length) + c;
}

// ── UI helpers ────────────────────────────────

export function setupUserDisplay(name, email, initials, avatarUrl = null) {
  if (!name) return;

  // ── Grab Elements ──
  const navInit = document.getElementById("navInitials");
  const modalInit = document.getElementById("modalInitials");
  const modalName = document.getElementById("modalName");
  const modalEmail = document.getElementById("modalEmail");
  const navAvatarContainer = document.querySelector("#signedInAvatar > div");
  const modalAvatarContainer = document.getElementById("modalAvatar");

  // 1. Set Text Data
  if (navInit) navInit.innerText = initials;
  if (modalInit) modalInit.innerText = initials;
  if (modalName) modalName.innerText = name;
  if (modalEmail) modalEmail.innerText = email;

  // 2. Handle Image Reflection
  const containers = [navAvatarContainer, modalAvatarContainer];

  containers.forEach((container) => {
    if (!container) return;

    if (avatarUrl) {
      // Clear initials and set image
      container.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" alt="profile" />`;
      container.style.backgroundColor = "transparent"; // Remove background color if image exists
    } else {
      // Fallback: Show initials with background color
      // container.innerHTML = initials;
    }
  });
}

async function updatePatientCounts() {
  try {
    const res = await fetch("/api/patient/data/counts");
    if (!res.ok) return;
    const { data } = await res.json();

    const elements = {
      total: document.getElementById("notif-total-badge"),
      dashboard: document.getElementById("notif-patient-dashboard-count"),
      records: document.getElementById("notif-patient-records-count"),
      general: document.getElementById("notif-patient-general-count"),
    };

    // Total unread notifications (User requested removal of appointment count from global badge)
    const total = data.unreadNotifications;

    if (elements.total) {
      elements.total.classList.toggle("hidden", total === 0);
    }

    if (elements.general) {
      const count = data.unreadNotifications;
      elements.general.classList.toggle("hidden", count === 0);
      if (count > 0) {
        elements.general.innerText = count > 99 ? "99+" : count;
      }
    }

    // Dental Records currently don't have an 'unread' state in the DB.
    // User requested badges indicate unread/pending, not total data.
    if (elements.records) {
        elements.records.classList.add("hidden");
    }

  } catch (err) {
    console.error("Failed to load patient counts:", err);
  }
}

window.updatePatientCounts = updatePatientCounts;

export function updateProfileState() {
  const savedUser = localStorage.getItem("sb_user");
  if (!savedUser) return;

  try {
    const user = JSON.parse(savedUser);

    document.getElementById("guestAvatar")?.classList.add("hidden");
    document.getElementById("signedInAvatar")?.classList.remove("hidden");
    document.getElementById("guestState")?.classList.add("hidden");
    document.getElementById("signedInState")?.classList.remove("hidden");

    setupUserDisplay(
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.initials,
      user.avatarUrl ?? null,
    );

    if (user.role === "patient") {
        updatePatientCounts();
        
        // Setup real-time notifications
        if (window.signalR && !window.patientHubConnected) {
            window.patientHubConnected = true;
            const connection = new signalR.HubConnectionBuilder()
              .withUrl("/adminHub")
              .withAutomaticReconnect()
              .build();

            connection.on("ReceiveNotification", (n) => {
              updatePatientCounts();
              Toast.show(`New: ${n.title}`, "info");
            });

            connection.start()
                .then(() => console.log("SignalR Connected (Patient Notifications)"))
                .catch(err => console.error("SignalR Connection Error:", err));
        }
    }
  } catch (e) {
    console.error("Error parsing saved user", e);
    localStorage.removeItem("sb_user");
  }
}

export function authGuard() {
  const path = window.location.pathname.toLowerCase();
  const isAuthPage = path.startsWith("/profile");
  const hasToken = !!getCookie("sb-access-token");

  if (isAuthPage && !hasToken) {
    // Save the intended destination to return after login
    localStorage.setItem("returnUrl", window.location.pathname);
    window.location.href = "/sign-in?error=unauthorized";
  }
}

// ── Dropdown toggle ───────────────────────────

export function toggleProfile() {
  document.getElementById("profilePanel").classList.toggle("panel-hidden");
}

export function closeProfile() {
  document.getElementById("profilePanel").classList.add("panel-hidden");
}

// ── Auth actions ──────────────────────────────

export function signIn(user) {
  // Always ensure avatarUrl key exists even if null
  user.avatarUrl = user.avatarUrl ?? null;

  localStorage.setItem("sb_user", JSON.stringify(user));

  document.getElementById("guestAvatar")?.classList.add("hidden");
  document.getElementById("signedInAvatar")?.classList.remove("hidden");
  document.getElementById("guestState")?.classList.add("hidden");
  document.getElementById("signedInState")?.classList.remove("hidden");

  setupUserDisplay(
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.initials,
    user.avatarUrl,
  );
}

export function signOut(e) {
  e?.preventDefault();
  Modal.open({
    title: "Confirm Sign Out",
    message: "Are you sure you want to sign out?",
    type: "danger",
    confirmText: "Sign Out",
    cancelText: "Cancel",
    onConfirm: () => {
      localStorage.clear();
      window.location.href = "/signout";
    },
  });
}

// ── Event bindings ────────────────────────────

export function initProfile() {
  updateProfileState();

  // Toggle on button click
  document.getElementById("profileBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfile();
  });

  // Sign out button
  document
    .getElementById("signOutBtn")
    ?.addEventListener("click", (e) => signOut(e));

  // Close on outside click
  window.addEventListener("click", (e) => {
    const trigger = document.getElementById("profileTrigger");
    if (trigger && !trigger.contains(e.target)) {
      closeProfile();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProfile();
  });
}
