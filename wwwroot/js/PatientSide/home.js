import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
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
  initMagneticBadge();
  renderDynamicContent();
  
  // Reviews need a small delay to ensure cards are in DOM before GSAP measures
  setTimeout(initReviewsScroll, 500);
});

function renderDynamicContent() {
    const data = window.clinicSettings;
    if (!data) return;

    // 2. Hours
    const hoursTable = document.querySelector('#location .bg-\\[var\\(--bg-soft\\)\\]');
    if (hoursTable && data.hours && Array.isArray(data.hours)) {
        hoursTable.innerHTML = data.hours.map((h, i) => `
            <div class="flex justify-between items-center px-7 py-4 border-b border-[#e5e7eb] last:border-0 ${h.closed ? 'bg-slate-50 opacity-60' : ''}">
                <span class="font-body text-[0.85rem] font-bold text-brand uppercase tracking-tighter">${h.day}</span>
                <span class="brand-font font-black text-[0.85rem] ${h.closed ? 'text-red-500 italic' : 'text-slate-700'}">
                    ${h.closed ? 'Closed' : `${formatTime(h.open)} - ${formatTime(h.close)}`}
                </span>
            </div>
        `).join('');
    }
}

function formatTime(time) {
    if (!time) return '';
    try {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    } catch { return time; }
}

function initScrollAnimations() {
  // Gallery Logic
  const galleryImages = gsap.utils.toArray(".gallery-img-pop");
  galleryImages.forEach((img, i) => {
      gsap.fromTo(img, 
          { 
              autoAlpha: 0, 
              scale: 0.5, 
              xPercent: 0, 
              yPercent: 0 
          }, 
          {
              autoAlpha: 1, 
              scale: 1, 
              xPercent: img.dataset.x.replace('%',''), 
              yPercent: img.dataset.y.replace('%',''),
              scrollTrigger: {
                  trigger: "#gallery",
                  start: "top 60%",
                  end: "bottom 20%",
                  scrub: 1.5,
                  toggleActions: "play reverse play reverse"
              }
          }
      );
  });

  gsap.fromTo(".hp-feature-card", 
    { autoAlpha: 0, y: 60, rotateY: 15 },
    {
      scrollTrigger: { trigger: "#features", start: "top 80%", once: true },
      autoAlpha: 1, y: 0, rotateY: 0, duration: 1, stagger: 0.15, ease: "expo.out"
    }
  );

  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 40 }, {
        autoAlpha: 1, y: 0, duration: 1, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  });
}

function initHeroAnimations() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  gsap.set(".hp-reveal, .hp-reveal-late, .hp-word, .hp-doctor-img, .hp-glass-badge", { autoAlpha: 0 });
  tl.fromTo(".hp-reveal", { autoAlpha: 0, y: 40, skewY: 5 }, { autoAlpha: 1, y: 0, skewY: 0, duration: 1.2, stagger: 0.2 })
    .fromTo(".hp-word", { autoAlpha: 0, y: 60, rotateX: -60 }, { autoAlpha: 1, y: 0, rotateX: 0, duration: 1.5, stagger: 0.08, ease: "expo.out" }, "-=0.8")
    .fromTo(".hp-reveal-late", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.2 }, "-=1")
    .fromTo(".hp-doctor-img", { autoAlpha: 0, scale: 0.8, x: 40, filter: "brightness(0.5) blur(10px)" }, { autoAlpha: 1, scale: 1, x: 0, filter: "brightness(1.05) blur(0px)", duration: 2, ease: "expo.out" }, "-=1.2")
    .fromTo(".hp-glass-badge", { autoAlpha: 0, x: -30, scale: 0.8 }, { autoAlpha: 1, x: 0, scale: 1, duration: 1.2, ease: "back.out(1.7)" }, "-=1");
}

function initMagneticBadge() {
    const badge = document.querySelector('.hp-glass-badge');
    if (badge) {
        badge.addEventListener('mousemove', (e) => {
            const rect = badge.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(badge, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
        });
        badge.addEventListener('mouseleave', () => {
            gsap.to(badge, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
        });
    }
}

const defaultReviews = [
  { author_name: "Marieme", created_at: "2024-05-15", author_avatar: "https://randomuser.me/api/portraits/women/25.jpg", review_text: "Samson Dental Center is top-notch! The precision and care they provide is unparalleled. I felt safe and comfortable throughout my surgery.", rating: 5, platform: "Google" },
  { author_name: "Juan Dela Cruz", created_at: "2024-06-20", author_avatar: "https://randomuser.me/api/portraits/men/32.jpg", review_text: "Highly recommend Dr. Marcus and the team. The facilities are modern and the service is excellent. My braces journey has been smooth and rewarding.", rating: 5, platform: "Facebook" }
];

function initReviewsScroll() {
  // Pure CSS animation is used for the marquee as defined in site.css
  // This function is kept for refresh consistency
  ScrollTrigger.refresh();
}
