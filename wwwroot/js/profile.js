// ─────────────────────────────────────────────
// profile.js  —  ES Module
// ─────────────────────────────────────────────

// ── Cookie helper ─────────────────────────────

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

export function setupUserDisplay(name, email, initials) {
  if (!name) return;

  const nameParts = name.trim().split(" ");

  // ── Grab Elements ──
  const navInit = document.getElementById("navInitials");
  const modalInit = document.getElementById("modalInitials");
  const modalName = document.getElementById("modalName");
  const modalEmail = document.getElementById("modalEmail");

  // ── Only set if they exist ──
  if (navInit) navInit.innerText = initials;
  if (modalInit) modalInit.innerText = initials;
  if (modalName) modalName.innerText = name;
  if (modalEmail) modalEmail.innerText = email;

  // Handle Avatars safely
  const navAvatar = document.querySelector("#signedInAvatar > div");
  const modalAvatar = document.getElementById("modalAvatar");

  if (navAvatar)
    navAvatar.style.backgroundColor = window.COLORS?.primary || "#c0392b";
  if (modalAvatar)
    modalAvatar.style.backgroundColor = window.COLORS?.primary || "#c0392b";
}

export function updateProfileState() {
  // 1. Check localStorage first
  const savedUser = localStorage.getItem("sb_user");

  // 2. If we have saved data, show the signed-in UI immediately
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);

      // Safety checks for elements
      const guestAvatar = document.getElementById("guestAvatar");
      const signedInAvatar = document.getElementById("signedInAvatar");
      const guestState = document.getElementById("guestState");
      const signedInState = document.getElementById("signedInState");

      // UI Swaps
      guestAvatar?.classList.add("hidden");
      signedInAvatar?.classList.remove("hidden");
      guestState?.classList.add("hidden");
      signedInState?.classList.remove("hidden");

      // Fill the data
      setupUserDisplay(
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.initials,
      );
    } catch (e) {
      console.error("Error parsing saved user", e);
      localStorage.removeItem("sb_user");
    }
  } else {
    // Show Guest Mode
    document.getElementById("guestAvatar")?.classList.remove("hidden");
    document.getElementById("signedInAvatar")?.classList.add("hidden");
    document.getElementById("guestState")?.classList.remove("hidden");
    document.getElementById("signedInState")?.classList.add("hidden");
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
  // 1. Store the user object so it's available on the next page load
  localStorage.setItem("sb_user", JSON.stringify(user));

  // 2. Update the UI parts
  document.getElementById("guestAvatar")?.classList.add("hidden");
  document.getElementById("signedInAvatar")?.classList.remove("hidden");

  // 3. Use the helper to fill name/initials/colors
  setupUserDisplay(
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.initials,
  );

  // 4. Swap states in the dropdown
  document.getElementById("guestState")?.classList.add("hidden");
  document.getElementById("signedInState")?.classList.remove("hidden");
}

export function signOut(e) {
  localStorage.removeItem("sb_user");
  window.location.href = "/signout"; // Use an absolute path for reliability
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
    ?.addEventListener("click", () => signOut());

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
