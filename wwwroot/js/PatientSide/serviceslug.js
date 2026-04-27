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

  gsap.fromTo(".step-item", 
    { autoAlpha: 0, x: -20 },
    {
      autoAlpha: 1,
      x: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".steps-container",
        start: "top 80%",
      }
    }
  );
}

function setupFaqInteractions() {
  const toggles = document.querySelectorAll(".faq-toggle");

  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      const index = button.getAttribute("data-index");
      const answer = document.getElementById(`faq-${index}`);
      const icon = document.getElementById(`chevron-${index}`);
      
      // Check if this specific item is already open
      const isOpen = answer?.style.maxHeight !== "0px" && answer?.style.maxHeight !== "";

      // Close ALL open FAQs (Accordion behavior)
      document.querySelectorAll(".faq-answer").forEach((el) => {
        el.style.maxHeight = "0px";
      });
      document.querySelectorAll(".faq-chevron").forEach((el) => {
        el.style.transform = "rotate(0deg)";
      });

      // If it wasn't open, open it now
      if (!isOpen && answer) {
        // Set maxHeight to the actual height of the content
        answer.style.maxHeight = answer.scrollHeight + "px";
        if (icon) icon.style.transform = "rotate(180deg)";
      }
    });
  });
}
