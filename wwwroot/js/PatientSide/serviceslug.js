import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  setupFaqInteractions();
  playEntranceAnimations();
});

function playEntranceAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // 1. Hero Content & Stats Entrance
  const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } });

  heroTimeline
    .from(".hero-title", { opacity: 0, y: 50, duration: 1.5 })
    .from(".hero-description", { opacity: 0, y: 30, duration: 1.2 }, "-=1")
    .from(
      ".hero-actions a",
      {
        opacity: 0,
        scale: 0.8,
        y: 20, 
        duration: 1,
        stagger: 0.15, 
        ease: "back.out(1.7)",
        clearProps: "all"
      },
      "-=0.6",
    )
    .from(
      ".service-stats-item",
      {
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.15,
        ease: "back.out(1.4)",
      },
      "-=0.4",
    );

  // 2. Background Parallax Effect
  gsap.to(".hero-parallax-bg", {
    yPercent: 20,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  // 3. Scroll-triggered Reveal (Generic Fade Ups)
  gsap.utils.toArray(".reveal-on-scroll").forEach((element) => {
    gsap.from(element, {
      opacity: 0,
      y: 40,
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: {
        trigger: element,
        start: "top 90%",
        once: true,
      },
    });
  });

  // 4. Benefits List Stagger
  gsap.from(".benefit-list-item", {
    opacity: 0,
    x: -30,
    scale: 0.95,
    duration: 1,
    stagger: 0.12,
    ease: "expo.out",
    scrollTrigger: {
      trigger: ".benefits-container",
      start: "top 85%",
      once: true,
    },
  });
}

function setupFaqInteractions() {
  const faqButtons = document.querySelectorAll(".faq-toggle");

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Cleaner extraction of the index using dataset or ID replacement
      const faqIndex = button.id.replace("toggleFaq", "");
      toggleFaq(faqIndex);
    });
  });
}
