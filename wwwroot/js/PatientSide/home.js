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

    // 1. FAQs
    const faqList = document.getElementById("faqList");
    if (faqList && data.faqs && Array.isArray(data.faqs)) {
        faqList.innerHTML = data.faqs.map((item, i) => `
            <div class="border border-[#e5e7eb] rounded-2xl overflow-hidden">
                <button class="faq-toggle w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-slate-50 transition-colors" data-index="${i}">
                    <span class="brand-font font-semibold text-[0.9rem] text-brand">${item.question}</span>
                    <svg id="chevron-${i}" class="faq-chevron shrink-0 ml-4 text-muted w-4 h-4 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <div id="faq-${i}" class="faq-answer bg-white px-6 hidden overflow-hidden transition-all duration-300">
                    <p class="font-body text-[0.86rem] text-muted leading-relaxed pb-5 pt-1">${item.answer}</p>
                </div>
            </div>`).join('');

        document.querySelectorAll('.faq-toggle').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.getAttribute('data-index');
                toggleFaq(idx);
            };
        });
    }

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
  const stats = document.querySelector(".hero-reveal-late div .font-body");
  if (stats) {
    ScrollTrigger.create({
        trigger: stats,
        start: "top 95%",
        onEnter: () => {
            const countTarget = { val: 0 };
            gsap.to(countTarget, {
                val: 2000,
                duration: 2.5,
                ease: "power3.out",
                onUpdate: () => {
                    const el = document.querySelector(".hero-reveal-late .text-muted");
                    if (el) el.innerHTML = `Trusted by ${Math.floor(countTarget.val).toLocaleString()}+ Happy Patients`;
                }
            });
        }
    });
  }

  gsap.fromTo(".hp-feature-card", 
    { autoAlpha: 0, y: 60, rotateY: 15 },
    {
      scrollTrigger: { trigger: "#features", start: "top 80%", once: true },
      autoAlpha: 1, y: 0, rotateY: 0, duration: 1, stagger: 0.2, ease: "expo.out"
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
  const container = document.getElementById("reviewsContainer");
  const section = document.querySelector(".horizontal-scroll-section");
  const dotsContainer = document.getElementById("reviewDots");
  if (!container || !section) return;

  const data = (window.reviewsData && window.reviewsData.length > 0) ? window.reviewsData : defaultReviews;
  
  container.innerHTML = data.map((r, i) => {
    const platformIcon = r.platform === 'Google' 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18c-.77 1.54-1.21 3.27-1.21 5.1s.44 3.56 1.21 5.1l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>` 
      : '<i class="fa-brands fa-facebook"></i>';

    return `
        <div class="review-card-premium${i === 0 ? ' review-active' : ''}">
          <div class="review-quote-mark">"</div>
          <p class="review-text">${r.review_text}</p>
          <div class="review-footer">
            <div class="review-author">
              <div class="relative w-10 h-10 shrink-0">
                ${r.author_avatar ? `<img src="${r.author_avatar}" class="review-avatar w-full h-full rounded-full object-cover" />` : `<div class="w-full h-full rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">${(r.author_name || 'U')[0]}</div>`}
              </div>
              <div><div class="review-name">${r.author_name || 'Anonymous'}</div><div class="review-date">${new Date(r.review_date || r.created_at || Date.now()).toLocaleDateString()}</div></div>
            </div>
            <div class="review-meta">
              <div class="flex gap-0.5 text-orange-400 justify-end">${Array(5).fill(0).map((_, idx) => `<i class="fa-solid fa-star text-[9px] ${idx < r.rating ? '' : 'opacity-20'}"></i>`).join('')}</div>
              <div class="review-verified"><span class="mr-1 mt-0.5">${r.platform}</span>${platformIcon}</div>
            </div>
          </div>
        </div>`;
  }).join("");

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    data.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = `review-dot${i === 0 ? " review-dot-active" : ""}`;
      dotsContainer.appendChild(dot);
    });
  }

  const cards = gsap.utils.toArray(".review-card-premium");
  const dots = dotsContainer ? dotsContainer.querySelectorAll(".review-dot") : [];

  function setActiveCard(index) {
    cards.forEach((card, i) => {
      card.classList.toggle("review-active", i === index);
      card.classList.toggle("review-dim", i !== index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("review-dot-active", i === index);
    });
  }

  // Refresh ScrollTrigger after render
  ScrollTrigger.refresh();
  
  const travelDistance = container.scrollWidth - section.offsetWidth;
  if (travelDistance > 0) {
    gsap.to(container, {
      x: -travelDistance,
      ease: "none",
      scrollTrigger: {
        trigger: "#reviewsPin",
        start: "top top",
        end: () => `+=${travelDistance * 1.5}`,
        pin: true,
        scrub: 1.2,
        onUpdate: (self) => {
          const index = Math.round(self.progress * (cards.length - 1));
          setActiveCard(index);
        }
      }
    });
  }
}
