

import { initProfile } from "./profile.js";

let isNavScrollDisabled = false;

// ── Navbar scroll behavior ────────────────────

export function toggleNavbar(isActive) {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  const logo = document.getElementById("logo");
  const navLinks = document.querySelectorAll(".nav-link");
  const profileChevron = document.getElementById("profileChevron");
  const hamburgerBtn = document.getElementById("hamburgerBtn");

  if (isActive) {
    navbar.classList.add("bg-white/90", "backdrop-blur-xl", "border-slate-100", "shadow-sm");
    navbar.classList.remove("border-transparent");
    logo?.classList.add("text-brand");
    logo?.classList.remove("text-white");
    hamburgerBtn?.classList.add("text-brand");
    hamburgerBtn?.classList.remove("text-white");
    navLinks.forEach(link => {
        link.classList.add("text-brand");
        link.classList.remove("text-white");
    });
    profileChevron?.classList.add("text-brand");
    profileChevron?.classList.remove("text-white");
    const guestAvatar = document.getElementById("guestAvatar");
    guestAvatar?.classList.add("text-brand");
    guestAvatar?.classList.remove("text-white");
  } else {
    navbar.classList.remove("bg-white/90", "backdrop-blur-xl", "border-slate-100", "shadow-sm");
    navbar.classList.add("border-transparent");
    
    // Only turn white if we're on a page with a dark hero (like Home or About)
    const hasDarkHero = document.querySelector(".bg-brand, #hero");
    if (hasDarkHero) {
        logo?.classList.add("text-white");
        logo?.classList.remove("text-brand");
        hamburgerBtn?.classList.add("text-white");
        hamburgerBtn?.classList.remove("text-brand");
        navLinks.forEach(link => {
            link.classList.add("text-white");
            link.classList.remove("text-brand");
        });
        profileChevron?.classList.add("text-white");
        profileChevron?.classList.remove("text-brand");
        const guestAvatar = document.getElementById("guestAvatar");
        guestAvatar?.classList.add("text-white");
        guestAvatar?.classList.remove("text-brand");
    } else {
        logo?.classList.add("text-brand");
        hamburgerBtn?.classList.add("text-brand");
        navLinks.forEach(link => link.classList.add("text-brand"));
        profileChevron?.classList.add("text-brand");
        const guestAvatar = document.getElementById("guestAvatar");
        guestAvatar?.classList.add("text-brand");
    }
  }
}

// ── Active nav link ───────────────────────────

function setActive(id) {
  const el = document.getElementById(id);
  const mel = document.getElementById(`m-${id}`);
  if (el) {
      el.classList.add("active", "text-primary");
  }
  if (mel) {
      mel.classList.add("active", "text-primary");
  }
}

function syncProfileLinks() {
  const path = window.location.pathname.toLowerCase();
  const allProfileLinks = document.querySelectorAll(".side-link, .menu-link");
  
  allProfileLinks.forEach(link => {
    link.classList.remove("active", "bg-primary/10", "text-primary");
    const href = link.getAttribute("href")?.toLowerCase();
    if (!href) return;

    if (path.includes("dashboard") && href.includes("dashboard")) link.classList.add("active", "bg-primary/10", "text-primary");
    if (path.includes("myappointments") && href.includes("myappointments")) link.classList.add("active", "bg-primary/10", "text-primary");
    if (path.includes("records") && href.includes("records")) link.classList.add("active", "bg-primary/10", "text-primary");
    if (path.includes("notifications") && href.includes("notifications")) link.classList.add("active", "bg-primary/10", "text-primary");
    if (path.includes("settings") && href.includes("settings")) link.classList.add("active", "bg-primary/10", "text-primary");
  });
}

export function syncActiveLink() {
  const path = window.location.pathname.toLowerCase();
  
  // Clear previous actives
  document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(l => l.classList.remove("active", "text-primary"));

  if (path === "/" || path === "") {
    setActive("nav-home");
  } else if (path.startsWith("/about")) {
    setActive("nav-about");
  } else if (path.startsWith("/services")) {
    setActive("servicesBtn");
  } else if (path.startsWith("/contacts")) {
    setActive("nav-contacts");
  } else if (path.startsWith("/profile")) {
    isNavScrollDisabled = true;
    toggleNavbar(true);
    syncProfileLinks();
  }
}

// ── Services mega menu ────────────────────────

export function initServicesMenu() {
  const servicesBtn = document.getElementById("servicesBtn");
  const servicesMega = document.getElementById("servicesMega");
  const chevronIcon = document.getElementById("chevronIcon");
  const panel = document.getElementById("megaPanel");

  servicesBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = servicesMega.classList.contains("servicesMega-hidden");
    
    if (isHidden) {
        servicesMega.classList.remove("servicesMega-hidden");
        chevronIcon.classList.add("rotate-180");
        gsap.fromTo(panel, 
            { opacity: 0, y: -20, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.2)" }
        );
    } else {
        closeMega();
    }
  });

  function closeMega() {
      gsap.to(panel, {
          opacity: 0, y: -10, scale: 0.98, duration: 0.2, 
          onComplete: () => {
              servicesMega.classList.add("servicesMega-hidden");
              chevronIcon.classList.remove("rotate-180");
          }
      });
  }

  document.addEventListener("click", (e) => {
    if (!servicesMega?.contains(e.target) && !servicesBtn?.contains(e.target)) {
      closeMega();
    }
  });
}

// ── Mobile menu ───────────────────────────────

export function initMobileMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const burgerTop = document.getElementById("burger-top");
  const burgerMid = document.getElementById("burger-mid");
  const burgerBot = document.getElementById("burger-bot");

  hamburgerBtn?.addEventListener("click", () => {
    const isOpening = mobileMenu.classList.contains("invisible");

    if (isOpening) {
        // Open
        mobileMenu.classList.remove("invisible");
        document.body.style.overflow = "hidden";
        
        // Force navbar to "active" style so burger is visible against white bg
        toggleNavbar(true);
        
        gsap.to(mobileMenu, { opacity: 1, duration: 0.5, ease: "power2.out" });

        // Burger Transform
        gsap.to(burgerTop, { y: 8, rotation: 45, duration: 0.3 });
        gsap.to(burgerMid, { opacity: 0, x: -10, duration: 0.3 });
        gsap.to(burgerBot, { y: -8, rotation: -45, duration: 0.3 });
        
        // Links Entrance
        gsap.fromTo(".mobile-nav-link", 
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 }
        );
    } else {
        // Close
        gsap.to(mobileMenu, { 
            opacity: 0, 
            duration: 0.4, 
            onComplete: () => {
                mobileMenu.classList.add("invisible");
                document.body.style.overflow = "";
                
                // Revert navbar style based on scroll
                if (!isNavScrollDisabled) {
                    const isScrolled = window.scrollY > 60;
                    toggleNavbar(isScrolled);
                }
            }
        });
        
        // Burger Reset
        gsap.to(burgerTop, { y: 0, rotation: 0, duration: 0.3 });
        gsap.to(burgerMid, { opacity: 1, x: 0, duration: 0.3 });
        gsap.to(burgerBot, { y: 0, rotation: 0, duration: 0.3 });
    }
  });

  const mobileServicesBtn = document.getElementById("mobileServicesBtn");
  const mobileServicesMenu = document.getElementById("mobileServicesMenu");
  const mobileChevron = document.getElementById("mobileChevron");

  mobileServicesBtn?.addEventListener("click", () => {
    if (mobileServicesMenu.style.maxHeight) {
      mobileServicesMenu.style.maxHeight = null;
      mobileChevron?.classList.remove("rotate-180");
    } else {
      mobileServicesMenu.style.maxHeight = mobileServicesMenu.scrollHeight + "px";
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

async function loadDynamicServices() {
  try {
    const response = await fetch("/api/services");
    if (!response.ok) return;

    const services = await response.json();

    // Containers for Desktop
    const containers = {
      "General Dentistry": document.getElementById("cat-general-desktop"),
      Cosmetic: document.getElementById("cat-cosmetic-desktop"),
      Specialized: document.getElementById("cat-specialized-desktop"),
      // Containers for Mobile
      "General Dentistry-m": document.getElementById("cat-general-mobile"),
      "Cosmetic-m": document.getElementById("cat-cosmetic-mobile"),
      "Specialized-m": document.getElementById("cat-specialized-mobile"),
    };

    services.forEach((service) => {
      if (!service.isActive) return;

      const cat = service.category;

      // 1. Desktop Logic
      if (containers[cat]) {
        const desktopLink = document.createElement("a");
        desktopLink.href = `/Services/${service.slug}`;
        desktopLink.className =
          "block py-1.5 text-[0.85rem] hover:text-primary";
        desktopLink.textContent = service.name;
        containers[cat].appendChild(desktopLink);
      }

      // 2. Mobile Logic - FIX IS HERE
      const mobileKey = `${cat}-m`;
      if (containers[mobileKey]) {
        const mobileLink = document.createElement("a");
        mobileLink.href = `/Services/${service.slug}`;
        mobileLink.className =
          "block py-2 pl-3 text-sm text-gray-600 hover:text-primary";
        mobileLink.textContent = service.name;

        // You previously had containers[cat].appendChild(mobileLink)
        containers[mobileKey].appendChild(mobileLink);
      }
    });
  } catch (err) {
    console.error("Failed to load services:", err);
  }
}

// ── Entry point ───────────────────────────────

export function initNavbar() {
  if (window.__navbarInitialized) return;
  window.__navbarInitialized = true;

  loadDynamicServices();
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
