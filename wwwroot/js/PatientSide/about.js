import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  initEntranceAnimations();
  initTimelineAnimations();
});

function initEntranceAnimations() {
  const mainTl = gsap.timeline();
  const heroElements = document.querySelectorAll(".about-hero-text");
  
  if (heroElements.length > 0) {
    mainTl.fromTo(heroElements, 
      { y: 30, autoAlpha: 0 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.2, ease: "expo.out" }
    );
  }

  // Generic reveal-up
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(el, 
      { autoAlpha: 0, y: 40 }, 
      {
        autoAlpha: 1, y: 0, duration: 1, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      }
    );
  });

  // Story Image Parallax
  const storyTrigger = document.querySelector(".reveal-up.relative.group");
  if (storyTrigger) {
    gsap.fromTo("#aboutimg1", 
      { scale: 1.1, yPercent: 0 },
      { 
        yPercent: 15, scale: 1.2, 
        scrollTrigger: {
          trigger: storyTrigger,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  }
}

function initTimelineAnimations() {
    gsap.utils.toArray(".milestone-item").forEach((item, i) => {
        gsap.fromTo(item, 
            { autoAlpha: 0, x: -20 },
            {
                autoAlpha: 1, x: 0, duration: 0.8,
                scrollTrigger: {
                    trigger: item,
                    start: "top 85%",
                    once: true
                }
            }
        );
    });
}
