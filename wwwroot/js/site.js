// ─────────────────────────────────────────────
// navbar.js  —  ES Module
// ─────────────────────────────────────────────

import { initProfile } from "./profile.js";

let isNavScrollDisabled = false;

// ── Navbar scroll behavior ────────────────────

export function toggleNavbar(isActive) {
  const { primary, dark, white, textMuted, offwhite, text } = window.COLORS;

  const navbar = document.getElementById("navbar");
  if (!navbar) return; // Exit early if the navbar isn't on this page
  const logo = document.getElementById("logo");
  const bookBtn = document.getElementById("bookBtn");
  const guestAvatar = document.getElementById("guestAvatar");

  if (isActive) {
    navbar.style.background = white;
    navbar.style.backdropFilter = "blur(18px)";
    navbar.style.webkitBackdropFilter = "blur(18px)";
    navbar.style.boxShadow = "0 2px 24px rgba(0,0,0,0.25)";
    navbar.style.color = text;
    logo.style.color = text;
    bookBtn.style.borderColor = dark;
    guestAvatar.style.borderColor = textMuted;
  } else {
    navbar.style.background = "transparent";
    navbar.style.backdropFilter = "none";
    navbar.style.boxShadow = "none";
    navbar.style.color = white;
    logo.style.color = white;
    bookBtn.style.borderColor = white;
    guestAvatar.style.borderColor = offwhite;
  }
}

// ── Active nav link ───────────────────────────

function setActive(id) {
  document.getElementById(id)?.classList.add("active");
}

export function syncActiveLink() {
  const path = window.location.pathname.toLowerCase();

  if (path === "/" || path === "") {
    setActive("nav-home");
  } else if (path.startsWith("/about")) {
    setActive("nav-about");
  } else if (path.startsWith("/services")) {
    setActive("servicesBtn");
  } else if (path.startsWith("/contacts")) {
    setActive("nav-contacts");
  } else if (path.startsWith("/profile/dashboard")) {
    setActive("side-dashboard");
    setActive("nav-dashboard");
    isNavScrollDisabled = true;
    toggleNavbar(true);
  } else if (path.startsWith("/profile/myappointments")) {
    setActive("side-myappointments");
    setActive("nav-myappointments");
    isNavScrollDisabled = true;
    toggleNavbar(true);
  } else if (path.startsWith("/profile/settings")) {
    setActive("side-settings");
    setActive("nav-settings");
    isNavScrollDisabled = true;
    toggleNavbar(true);
  } else if (path.startsWith("/profile/notifications")) {
    setActive("side-notifications");
    setActive("nav-notifications");
    isNavScrollDisabled = true;
    toggleNavbar(true);
  } else if (path.startsWith("/profile/records")) {
    setActive("side-records");
    setActive("nav-records");
    isNavScrollDisabled = true;
    toggleNavbar(true);
  }
}

// ── Services mega menu ────────────────────────

export function initServicesMenu() {
  const servicesBtn = document.getElementById("servicesBtn");
  const servicesMega = document.getElementById("servicesMega");
  const chevronIcon = document.getElementById("chevronIcon");

  servicesBtn?.addEventListener("click", () => {
    servicesMega.classList.toggle("hidden");
    chevronIcon.classList.toggle("rotate-180");
  });

  document.addEventListener("click", (e) => {
    const insideWrapper = document
      .getElementById("servicesWrapper")
      ?.contains(e.target);
    const insidePanel = document
      .getElementById("megaPanel")
      ?.contains(e.target);

    if (!insideWrapper && !insidePanel) {
      servicesMega?.classList.add("hidden");
      chevronIcon?.classList.remove("rotate-180");
    }
  });
}

// ── Mobile menu ───────────────────────────────

export function initMobileMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const navIconPath = document.getElementById("navIconPath");
  const servicesMega = document.getElementById("servicesMega");

  const hamburgerPath = "M4 7h16M4 12h16M4 17h16";
  const closePath = "M6 18L18 6M6 6l12 12";

  hamburgerBtn?.addEventListener("click", () => {
    const isMenuOpening = mobileMenu.classList.contains("hidden");

    if (window.scrollY < 50 && !isNavScrollDisabled)
      toggleNavbar(isMenuOpening);

    mobileMenu.classList.toggle("hidden");
    servicesMega?.classList.add("hidden");
    navIconPath?.setAttribute("d", isMenuOpening ? closePath : hamburgerPath);
  });

  const mobileServicesBtn = document.getElementById("mobileServicesBtn");
  const mobileServicesMenu = document.getElementById("mobileServicesMenu");
  const mobileChevron = document.getElementById("mobileChevron");

  mobileServicesBtn?.addEventListener("click", () => {
    if (mobileServicesMenu.style.maxHeight) {
      mobileServicesMenu.style.maxHeight = null;
      mobileChevron?.classList.remove("rotate-180");
    } else {
      mobileServicesMenu.style.maxHeight =
        mobileServicesMenu.scrollHeight + "px";
      mobileChevron?.classList.add("rotate-180");
    }
  });
}

// ── FAQ accordion ─────────────────────────────

export function toggleFaq(i) {
  const answer = document.getElementById(`faq-${i}`);
  const chevron = document.getElementById(`chevron-${i}`);
  const isOpen = answer?.classList.contains("open");

  document
    .querySelectorAll(".faq-answer")
    .forEach((el) => el.classList.remove("open"));
  document
    .querySelectorAll(".faq-chevron")
    .forEach((el) => el.classList.remove("open"));

  if (!isOpen) {
    answer?.classList.add("open");
    chevron?.classList.add("open");
  }
}

// ── GSAP scroll animations ────────────────────

export function initScrollAnimations() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP or ScrollTrigger not found. Skipping animations.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray(".fade-up").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });
  });
}

// ── Entry point ───────────────────────────────

export function initNavbar() {
  toggleNavbar(false);
  syncActiveLink();
  initServicesMenu();
  initMobileMenu();
  initScrollAnimations();
  initProfile();

  // Scroll listener

  window.addEventListener("scroll", () => {
    // 1. If scrolling is disabled, STOP everything and exit the function immediately
    if (isNavScrollDisabled) return;

    // 2. Otherwise, handle the toggle
    const isScrolled = window.scrollY > 60;
    toggleNavbar(isScrolled);

    document
      .getElementById("navbar")
      ?.classList.toggle("scrolled", window.scrollY > 20);
  });
}

// ── Bootstrap on DOM ready ────────────────────

document.addEventListener("DOMContentLoaded", initNavbar);
