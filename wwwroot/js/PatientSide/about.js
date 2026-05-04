document.addEventListener("DOMContentLoaded", () => {
  initEntranceAnimations();
  initTimelineAnimations();
  initDoctorCarousel();
});

function initEntranceAnimations() {
  const mainTl = gsap.timeline();
  const heroElements = document.querySelectorAll(".about-hero-text");

  if (heroElements.length > 0) {
    mainTl.fromTo(
      heroElements,
      { y: 30, autoAlpha: 0 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.5,
        delay: 1,
        stagger: 0.2,
        ease: "expo.out",
      },
    );
  }

  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.5,
        delay: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      },
    );
  });

  const storyTrigger = document.querySelector(".reveal-up.relative.group");
  if (storyTrigger) {
    gsap.fromTo(
      "#aboutimg1",
      { scale: 1.1, yPercent: 0 },
      {
        yPercent: 15,
        scale: 1.2,
        scrollTrigger: {
          trigger: storyTrigger,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  }

  gsap.fromTo(
    ".amission-card",
    { autoAlpha: 0, y: 40, scale: 0.95, opacity: 0 },
    {
      autoAlpha: 1,
      opacity: 1,
      y: 0,
      scale: 1,
      delay: 1,
      duration: 1,
      stagger: 0.25,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".amission-card",
        start: "top 80%",
        once: true,
      },
    },
  );
}

function initTimelineAnimations() {
  const section = document.getElementById("journey-section");
  const track = document.getElementById("timeline-track");
  const container = document.getElementById("timeline-container");
  const pathEl = document.getElementById("snake-path");
  const items = Array.from(document.querySelectorAll(".milestone-item"));

  if (!section || !track || !container || !pathEl || !items.length) return;

  const getScrollDist = () => container.scrollWidth - window.innerWidth;

  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 1,
      start: "top top",
      end: () => `+=${getScrollDist()}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => updateSnake(self.progress),
    },
  });

  scrollTl.to(track, { x: () => -getScrollDist(), ease: "none" });

  items.forEach((item) => {
    const card = item.querySelector(".milestone-card");
    const dot = item.querySelector(".connector-dot");
    const isTop = card.style.bottom !== "";

    ScrollTrigger.create({
      trigger: item,
      containerAnimation: scrollTl,
      start: "left 65%",
      end: "right 35%",
      onEnter() {
        card.style.opacity = "1";
        card.style.transform = "translateX(-50%) translateY(0)";
        dot.style.opacity = "1";
        dot.style.transform = "translate(-50%, -50%) scale(1)";
      },
      onLeave() {
        card.style.opacity = "0";
        card.style.transform = `translateX(-50%) translateY(${isTop ? "-8px" : "8px"})`;
        dot.style.opacity = "0";
        dot.style.transform = "translate(-50%, -50%) scale(0)";
      },
      onEnterBack() {
        card.style.opacity = "1";
        card.style.transform = "translateX(-50%) translateY(0)";
        dot.style.opacity = "1";
        dot.style.transform = "translate(-50%, -50%) scale(1)";
      },
      onLeaveBack() {
        card.style.opacity = "0";
        card.style.transform = `translateX(-50%) translateY(${isTop ? "12px" : "-12px"})`;
        dot.style.opacity = "0";
        dot.style.transform = "translate(-50%, -50%) scale(0)";
      },
    });
  });

  function updateSnake(progress) {
    const total = pathEl.getTotalLength();
    if (!total) return;
    const revealed = total * progress;
    pathEl.style.strokeDasharray = `${revealed} ${total}`;
    pathEl.style.strokeDashoffset = "0";
  }

  updateSnake(0);
  ScrollTrigger.addEventListener("refreshInit", () => updateSnake(0));
}

function initDoctorCarousel() {
  const track = document.getElementById("doctor-track");
  const dotsEl = document.getElementById("doctor-dots");
  const prevBtn = document.getElementById("doctor-prev");
  const nextBtn = document.getElementById("doctor-next");
  if (!track || !dotsEl) return;

  const cards = Array.from(track.querySelectorAll(".doctor-card"));
  const GAP = 20;
  const CARD_W = cards[0].offsetWidth + GAP;
  let current = 0;
  let startX = 0;
  let dragging = false;

  function buildDots() {
    dotsEl.innerHTML = "";
    const max = Math.max(1, cards.length - visible() + 1);
    for (let i = 0; i < max; i++) {
      const dot = document.createElement("div");
      dot.className =
        "transition-all duration-300 rounded-full cursor-pointer h-[4px] " +
        (i === current ? "w-6 bg-primary" : "w-[4px] bg-white/20");
      dot.addEventListener("click", () => goTo(i));
      dotsEl.appendChild(dot);
    }
  }

  function visible() {
    return Math.floor(track.parentElement.offsetWidth / CARD_W) || 1;
  }

  function goTo(i) {
    const max = Math.max(0, cards.length - visible());
    current = Math.max(0, Math.min(i, max));
    track.style.transform = `translateX(-${current * CARD_W}px)`;
    dotsEl.querySelectorAll("div").forEach((d, idx) => {
      d.className =
        "transition-all duration-300 rounded-full cursor-pointer h-[4px] " +
        (idx === current ? "w-6 bg-primary" : "w-[4px] bg-white/20");
    });
  }

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));

  track.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    dragging = true;
    track.style.transitionDuration = "0ms";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const move = -current * CARD_W + dx;
    track.style.transform = `translateX(${move}px)`;
  });

  window.addEventListener("mouseup", (e) => {
    if (!dragging) return;
    dragging = false;
    track.style.transitionDuration = "450ms";
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 100) {
      goTo(dx < 0 ? current + 1 : current - 1);
    } else {
      goTo(current);
    }
  });

  track.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      track.style.transitionDuration = "0ms";
    },
    { passive: true },
  );

  track.addEventListener(
    "touchmove",
    (e) => {
      const dx = e.touches[0].clientX - startX;
      const move = -current * CARD_W + dx;
      track.style.transform = `translateX(${move}px)`;
    },
    { passive: true },
  );

  track.addEventListener("touchend", (e) => {
    track.style.transitionDuration = "450ms";
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      goTo(dx < 0 ? current + 1 : current - 1);
    } else {
      goTo(current);
    }
  });

  buildDots();
  window.addEventListener("resize", () => {
    buildDots();
    goTo(current);
  });
}
