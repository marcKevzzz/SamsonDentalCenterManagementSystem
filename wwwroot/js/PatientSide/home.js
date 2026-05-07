import { toggleFaq } from "../site.js";

// 1. Force manual scroll restoration to prevent browser from "jumping" mid-page on reload
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// 2. Early scroll to top
window.scrollTo(0, 0);

// We use window 'load' instead of DOMContentLoaded to ensure:
// 1. All images (like the hero portrait) are loaded (setting correct heights).
// 2. Tailwind CDN has finished parsing and applying classes (setting correct widths/margins).
window.addEventListener("load", () => {
  // Extra safety scroll
  window.scrollTo(0, 0);
  
  // Lock scroll immediately
  document.body.classList.add("overflow-hidden");

  // Background reveal logic
  const bg = document.getElementById("heroBg");
  if (bg) {
    bg.classList.add("opacity-100");
    bg.classList.remove("scale-105");
    const skeleton = document.getElementById("heroSkeleton");
    if (skeleton) {
      skeleton.classList.add("opacity-0");
      setTimeout(() => skeleton.remove(), 1000);
    }
  }

  initHeroAnimations();
  initScrollAnimations();
  initDoctorFollow();
  initGalleryPin();
  initReviewsPin();
  renderDynamicContent();

  // Final refresh to lock in positions
  ScrollTrigger.refresh();
});

function renderDynamicContent() {
  const data = window.clinicSettings;
  if (!data) return;

  const hoursTable = document.querySelector(
    "#location .bg-\\[var\\(--bg-soft\\)\\]",
  );
  if (hoursTable && data.hours && Array.isArray(data.hours)) {
    hoursTable.innerHTML = data.hours
      .map(
        (h, i) => `
            <div class="hours-row flex justify-between items-center px-7 py-4 border-b border-[#e5e7eb] last:border-0 ${h.closed ? "bg-slate-50 opacity-60" : ""}">
                <span class="font-body text-[0.85rem] font-medium text-brand/60 uppercase ">${h.day}</span>
                <span class="brand-font font-semibold text-[0.85rem] ${h.closed ? "text-red-700 italic" : "text-brand/80"}">
                    ${h.closed ? "Closed" : `${formatTime(h.open)} - ${formatTime(h.close)}`}
                </span>
            </div>
        `,
      )
      .join("");

    // Add scroll animation to the newly rendered rows
    gsap.from(".hours-row", {
      scrollTrigger: {
        trigger: "#location",
        start: "top 92%", // More forgiving for big screens
      },
      x: -20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power2.out",
    });

    // Recalculate everything because the page just got longer
    ScrollTrigger.refresh();
  }
}

function formatTime(time) {
  if (!time) return "";
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

function initScrollAnimations() {
  gsap.fromTo(
    ".hp-feature-card",
    {
      autoAlpha: 0,
      y: 60,
      rotateY: 15,
    },
    {
      scrollTrigger: {
        trigger: "#features",
        start: "top 80%", // Lower threshold ensures it triggers even on short desktops
        once: true,
      },
      autoAlpha: 1,
      y: 0,
      rotateY: 0,
      duration: 0.5,
      ease: "expo.out",
      stagger: 0.15,
    },
  );

  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
      },
    );
  });
}

function initHeroAnimations() {
  const tl = gsap.timeline({
    defaults: { ease: "expo.out" },
    onComplete: () => {
      document.body.classList.remove("overflow-hidden");
      // Refresh ScrollTrigger to ensure positions are correct now that overflow is back
      ScrollTrigger.refresh();
    },
  });
  gsap.set(
    ".hp-reveal, .hp-reveal-late, .hp-word, .hp-doctor-img, .hp-glass-badge",
    { autoAlpha: 0 },
  );
  tl.fromTo(
    ".hp-reveal",
    { autoAlpha: 0, y: 40, skewY: 5 },
    { autoAlpha: 1, y: 0, skewY: 0, duration: 1, delay: 0.8, stagger: 0.2 },
  )
    .fromTo(
      ".hp-word",
      { autoAlpha: 0, y: 60, rotateX: -60 },
      {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: 2,
        stagger: 0.18,
        ease: "expo.out",
      },
      "-=0.8",
    )
    .fromTo(
      ".hp-reveal-late",
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.2 },
      "-=1",
    )
    .fromTo(
      ".hp-doctor-img",
      { autoAlpha: 0, scale: 0.8, x: 40, filter: "brightness(0.5) blur(10px)" },
      {
        autoAlpha: 1,
        scale: 1,
        x: 0,
        filter: "brightness(1.05) blur(0px)",
        duration: 1,
        ease: "expo.out",
      },
      "-=1.2",
    )
    .fromTo(
      ".hp-glass-badge",
      { autoAlpha: 0, x: -30, scale: 0.8 },
      { autoAlpha: 1, x: 0, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
      "-=1",
    );
}

function initDoctorFollow() {
  const area = document.getElementById("doctor-interaction-area");
  const pill = document.getElementById("doctor-pill");

  if (!area || !pill) return;

  area.addEventListener("mousemove", (e) => {
    const rect = area.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Move pill dynamically
    gsap.to(pill, {
      x: x * 120,
      y: y * 80,
      rotation: x * 15,
      duration: 0.6,
      ease: "power3.out",
    });
  });

  // Removed mouseleave reset for the pill as per user request
}

function initGalleryPin() {
  const section = document.getElementById("gallery-pin");
  const items = gsap.utils.toArray(".gallery-item");
  if (!section || items.length === 0) return;

  const isMobile = window.innerWidth < 1024;
  
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      // On mobile, we reduce the scroll distance or disable pinning if preferred
      // but let's just make it shorter for now.
      end: isMobile ? "+=300%" : "+=800%",
      pin: true, // Only pin on desktop to avoid weird mobile scroll behavior
      scrub: 1.5,
      anticipatePin: 1,
    },
  });

  tl.fromTo(
    "#galleryText",
    { scale: 0.8, opacity: 0.1 },
    { scale: 1.1, opacity: 0.3, duration: 1 },
  );

  items.forEach((item, i) => {
    // 1. Entrance: Fast and snappy, heavily overlapping with the previous item
    tl.fromTo(
      item,
      { 
        scale: 0.3, 
        opacity: 0, 
        rotate: i % 2 === 0 ? -15 : 15, 
        y: 60 
      },
      {
        scale: 1.2,
        opacity: 1,
        rotate: 0,
        y: 0,
        duration: 4,
        ease: "expo.out",
      },
      i === 0 ? ">" : "-=5.2" // Overlap so next one starts while current is mid-reveal
    );

    // 2. Linger phase where it slowly grows/moves
    tl.to(item, { scale: 1.3, duration: 2 });

    // 3. Exit: Fades out as the next-next one is arriving
    tl.to(
      item,
      {
        scale: 1.4,
        opacity: 0,
        duration: 2,
        ease: "power2.in",
      },
      "-=3.5" // Start exit while another is already overlapping
    );
  });

  tl.to(".gallery-wrapper", { scale: 0.98, duration: 2, ease: "power2.inOut" });
}

function initReviewsPin() {
  const section = document.getElementById("reviews-pin");
  const track1 = document.getElementById("track-1");
  const track2 = document.getElementById("track-2");
  if (!section || !track1 || !track2) return;

  const isMobile = window.innerWidth < 1024;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: isMobile ? "+=150%" : "+=500%",
      pin: true,
      scrub: 1,
    },
  });

  tl.to(track1, { x: isMobile ? "-300%" : "-50%", duration: isMobile ? 5 : 3, ease: "none" }, 0);
  tl.to(track2, { x: isMobile ? "0%" : "50%", duration: isMobile ? 5 : 3, ease: "none" }, 0);

  // Scale cards on active
  gsap.utils.toArray(".review-card").forEach((card) => {
    gsap.to(card, {
      scale: 1.05,
      borderColor: "rgba(30, 64, 175, 0.4)",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      scrollTrigger: {
        trigger: card,
        containerAnimation: isMobile ? null : tl,
        start: isMobile ? "top 85%" : "left center",
        end: isMobile ? "top 50%" : "right center",
        scrub: true,
      },
    });
  });
}
