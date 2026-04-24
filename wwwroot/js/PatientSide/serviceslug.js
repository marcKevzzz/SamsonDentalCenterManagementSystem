import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  setupFaqInteractions();
  playEntranceAnimations();
});

function playEntranceAnimations() {

  // 1. Hero Content & Stats Entrance
  const heroTimeline = gsap.timeline({ defaults: { ease: "expo.out" } });

  heroTimeline
    .fromTo(".service-reveal h1", { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1.5 })
    .fromTo(".service-reveal p", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.2, onComplete: function() {
        const parent = document.querySelector('.service-reveal');
        if (parent) {
          parent.querySelectorAll('h1, p').forEach(el => el.classList.add('revealed'));
          gsap.set(parent.querySelectorAll('h1, p'), { clearProps: "all" });
        }
    } }, "-=1")
    .fromTo(
      ".hero-actions a",
      {
        autoAlpha: 0,
        scale: 0.8,
        y: 20
      },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0, 
        duration: 1,
        stagger: 0.15, 
        ease: "back.out(1.7)",
        onComplete: function() {
          this.targets().forEach(el => el.classList.add('revealed'));
          gsap.set(this.targets(), { clearProps: "all" });
        }
      },
      "-=0.6",
    )
    .fromTo(
      ".stats-item",
      {
        autoAlpha: 0,
        y: 40
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        stagger: 0.15,
        ease: "back.out(1.4)",
        onComplete: function() {
          this.targets().forEach(el => el.classList.add('revealed'));
          gsap.set(this.targets(), { clearProps: "all" });
        }
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
  gsap.utils.toArray(".reveal-up").forEach((element) => {
    gsap.fromTo(element, 
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: element,
          start: "top 90%",
          once: true,
        },
        onComplete: function() {
          element.classList.add('revealed');
          gsap.set(element, { clearProps: "all" });
        }
      }
    );
  });

  // 4. Benefits List Stagger
  gsap.fromTo(".benefit-item", 
    { autoAlpha: 0, x: -30, scale: 0.95 },
    {
      autoAlpha: 1,
      x: 0,
      scale: 1,
      duration: 1,
      stagger: 0.12,
      ease: "expo.out",
      scrollTrigger: {
        trigger: ".benefits-container",
        start: "top 85%",
        once: true,
      },
      onComplete: function() {
        this.targets().forEach(el => el.classList.add('revealed'));
        gsap.set(this.targets(), { clearProps: "all" });
      }
    }
  );
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
