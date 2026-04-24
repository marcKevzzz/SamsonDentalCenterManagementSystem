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
      localStorage.removeItem("sb_user");
      window.location.href = "/signout"; // Use an absolute path for reliability
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
