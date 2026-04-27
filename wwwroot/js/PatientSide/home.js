import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  // Animate fade-up elements
  document.getElementById("nextReview")?.addEventListener("click", nextReview);
  document.getElementById("prevReview")?.addEventListener("click", prevReview);

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
});

function initScrollAnimations() {


  // 2. Count-up Animation for Stats
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

  // 3. Reveal feature cards
  gsap.fromTo(".hp-feature-card", 
    { autoAlpha: 0, y: 60, rotateY: 15 },
    {
      scrollTrigger: {
        trigger: "#features",
        start: "top 80%",
        once: true
      },
      autoAlpha: 1,
      y: 0,
      rotateY: 0,
      duration: 1,
      stagger: 0.2,
      ease: "expo.out",
      onComplete: function() {
        this.targets().forEach(el => el.classList.add('revealed'));
        gsap.set(this.targets(), { clearProps: "all" });
      }
    }
  );

  // 4. Generic Fade-Up Reveal (For reviews header, location items, etc.)
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(el, 
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
        },
        onComplete: function() {
          el.classList.add('revealed');
          gsap.set(el, { clearProps: "all" });
        }
      }
    );
  });

  // 5. Section Background Reveal
  gsap.from("#location", {
    scrollTrigger: {
        trigger: "#location",
        start: "top 80%"
    },
    backgroundColor: "#fff",
    duration: 1.5
  });
}

function initHeroAnimations() {
  const tl = gsap.timeline({
    defaults: { ease: "expo.out" }
  });

  // 1. Initial set for FOUC elements (just in case)
  gsap.set(".hp-reveal, .hp-reveal-late, .hp-word, .hp-doctor-img, .hp-glass-badge", { autoAlpha: 0 });

  tl.fromTo(".hp-reveal",
    { autoAlpha: 0, y: 40, skewY: 5 },
    { autoAlpha: 1, y: 0, skewY: 0, duration: 1.2, stagger: 0.2 }
  )
    .fromTo(".hp-word",
      { autoAlpha: 0, y: 60, rotateX: -60 },
      {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: 1.5,
        stagger: 0.08,
        ease: "expo.out"
      },
      "-=0.8"
    )
    .fromTo(".hp-reveal-late",
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 1, stagger: 0.2 },
      "-=1"
    )
    .fromTo(".hp-doctor-img",
      { autoAlpha: 0, scale: 0.8, x: 40, filter: "brightness(0.5) blur(10px)" },
      { autoAlpha: 1, scale: 1, x: 0, filter: "brightness(1.05) blur(0px)", duration: 2, ease: "expo.out" },
      "-=1.2"
    )
    .fromTo(".hp-glass-badge",
      { autoAlpha: 0, x: -30, scale: 0.8 },
      { autoAlpha: 1, x: 0, scale: 1, duration: 1.2, ease: "back.out(1.7)" },
      "-=1"
    );
}

function initMagneticBadge() {
    const badge = document.querySelector('.hp-glass-badge');
    if (badge) {
        badge.addEventListener('mousemove', (e) => {
            const rect = badge.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            gsap.to(badge, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.4,
                ease: "power2.out"
            });
        });
        
        badge.addEventListener('mouseleave', () => {
            gsap.to(badge, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: "elastic.out(1, 0.3)"
            });
        });
    }
}

/* ── Reviews Scroll Trigger Logic ── */
const defaultReviews = [
  {
    author_name: "Marieme",
    created_at: "2024-05-15",
    author_avatar: "https://randomuser.me/api/portraits/women/25.jpg",
    review_text: "10/10 would recommend. I've never met a doctor who cares about patients as much as this clinic takes care of its patients. The attention to detail is unmatched and the results are truly life-changing.",
    rating: 5,
    platform: "Google"
  },
  {
    author_name: "Alexandria Sadang",
    created_at: "2023-10-02",
    author_avatar: "https://randomuser.me/api/portraits/women/55.jpg",
    review_text: "Samson Dental Center has been my family's go-to clinic ever since we found them. It's definitely the best decision we made for our oral health. Every visit feels like visiting family.",
    rating: 5,
    platform: "Google"
  },
  {
    author_name: "Carlos Reyes",
    created_at: "2024-01-20",
    author_avatar: "https://randomuser.me/api/portraits/men/41.jpg",
    review_text: "Professional staff and painless procedures. I was nervous but they made me feel completely at ease. Highly recommend to anyone anxious about dentist visits!",
    rating: 5,
    platform: "Facebook"
  }
];

const reviewsData = (window.reviewsData && window.reviewsData.length > 0) ? window.reviewsData : defaultReviews;

function initReviewsScroll() {
  const container = document.getElementById("reviewsContainer");
  const section = document.querySelector(".horizontal-scroll-section");
  const dotsContainer = document.getElementById("reviewDots");
  if (!container || !section) return;

  container.innerHTML = reviewsData
    .map(
      (r, i) => {
        const platformIcon = r.platform === 'Google' 
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18c-.77 1.54-1.21 3.27-1.21 5.1s.44 3.56 1.21 5.1l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>` 
          : r.platform === 'Facebook' 
            ? '<i class="fa-brands fa-facebook"></i>' 
            : '<i class="fa-solid fa-pen-nib text-slate-500"></i>';

        return `
        <div class="review-card-premium${i === 0 ? ' review-active' : ''}">
          <div class="review-quote-mark">"</div>
          <div>
            <p class="review-text">"${r.review_text}"</p>
          </div>
          <div class="review-footer">
            <div class="review-author">
              <div class="relative w-10 h-10 shrink-0">
                ${r.author_avatar 
                  ? `<img src="${r.author_avatar}" class="review-avatar w-full h-full rounded-full object-cover" alt="${r.author_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                     <div class="hidden w-full h-full rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">${r.author_name[0]}</div>` 
                  : `<div class="w-full h-full rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">${r.author_name[0]}</div>`
                }
              </div>
              <div>
                <div class="review-name">${r.author_name}</div>
                <div class="review-date">${new Date(r.review_date || r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
            <div class="review-meta">
              <div class="flex gap-0.5 text-[#f59e0b] mb-1 justify-end">
                ${Array(5).fill(0).map((_, idx) => `<i class="fa-solid fa-star text-[9px] ${idx < r.rating ? '' : 'opacity-20'}"></i>`).join('')}
              </div>
              <div class="review-verified">
                <span class="mr-1 mt-0.5">${r.platform}</span>
                ${platformIcon}
              </div>
            </div>
          </div>
        </div>
      `;
      }
    )
    .join("");

  // Build dots
  if (dotsContainer) {
    reviewsData.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = `review-dot${i === 0 ? " review-dot-active" : ""}`;
      dot.setAttribute("aria-label", `Review ${i + 1}`);
      dotsContainer.appendChild(dot);
    });
  }

  const cards = gsap.utils.toArray(".review-card-premium");
  const dots = dotsContainer ? dotsContainer.querySelectorAll(".review-dot") : [];

  // Set starting horizontal position before paint
  gsap.set(container, { x: 0 });

  function setActiveCard(index) {
    cards.forEach((card, i) => {
      card.classList.toggle("review-active", i === index);
      card.classList.toggle("review-dim", i !== index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("review-dot-active", i === index);
    });
  }

  setTimeout(() => {
    ScrollTrigger.refresh();

    gsap.to(container, {
      scrollTrigger: {
        trigger: "#reviewsPin",
        start: "top 80%",
        once: true
      },
      autoAlpha: 1,
      duration: 1,
      ease: "power2.out"
    });

    const totalWidth = container.scrollWidth;
    const viewportWidth = section.offsetWidth;
    // Add extra padding to the end of scroll to account for the centered layout
    const travelDistance = totalWidth - viewportWidth;

    if (travelDistance > 0) {
      const snapPoints = cards.map((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const targetX = cardCenter - viewportWidth / 2;
        return gsap.utils.clamp(0, 1, targetX / travelDistance);
      });

      gsap.to(container, {
        x: () => -travelDistance,
        ease: "none",
        scrollTrigger: {
          trigger: "#reviewsPin",
          start: "top top",
          end: () => `+=${travelDistance * 1.5}`,
          pin: true,
          scrub: 1.2,
          invalidateOnRefresh: true,
          snap: {
            snapTo: snapPoints,
            duration: { min: 0.25, max: 0.5 },
            delay: 0.08,
            ease: "power3.inOut",
          },
         onUpdate: (self) => {
  const p = self.progress;
  
  // Find which snap point we are mathematically closest to based on scroll progress
  let closestIndex = 0;
  let minDiff = Infinity;
  
  snapPoints.forEach((point, i) => {
    const diff = Math.abs(point - p);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  });

  // This will fire instantly as you scroll, regardless of scrub lag
  setActiveCard(closestIndex);
},
        },
      });
    }
  }, 100);
}

window.addEventListener("load", () => {
  initReviewsScroll();
});

/* ── FAQ data ── */
const faqs = [
  {
    q: "Do you accept walk-in patients?",
    a: "Yes, we welcome walk-in patients during regular clinic hours. However, we recommend booking an appointment in advance to minimize your waiting time and ensure a dedicated slot with your preferred doctor.",
  },
  {
    q: "What insurance plans do you accept?",
    a: "We accept most major HMO providers including Maxicare, Intellicare, Medicard, and PhilHealth. Please bring your insurance card for verification prior to your appointment.",
  },
  {
    q: "Do you offer installment plans?",
    a: "Yes, we offer flexible installment options for select procedures through partner financing programs. Our patient coordinators can walk you through available payment schemes during your consultation.",
  },
  {
    q: "How often should I get a dental cleaning?",
    a: "We recommend professional dental cleanings every six months. Patients with a history of gum disease or higher plaque buildup may benefit from more frequent visits — your dentist will advise accordingly.",
  },
  {
    q: "Is there parking available?",
    a: "Yes, we have ample parking space on-site at 7 Himlayan Rd, Tandang Sora. Additional street parking is also available nearby along Commonwealth Avenue.",
  },
];

const faqList = document.getElementById("faqList");
faqs.forEach((item, i) => {
  faqList.innerHTML += `
      <div class="border border-[#e5e7eb] rounded-2xl overflow-hidden">
        <button id="toggleBtn"
          class="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-offwhite transition-colors">
          <span class="brand-font font-semibold text-[0.9rem] text-brand">${item.q}</span>
          <svg id="chevron-${i}" class="faq-chevron shrink-0 ml-4 text-muted w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div id="faq-${i}" class="faq-answer bg-white px-6">
          <p class="font-body text-[0.86rem] text-muted leading-relaxed pb-5 pt-1">${item.a}</p>
        </div>
      </div>`;
});

document.querySelectorAll("#toggleBtn").forEach((btn, i) => {
  btn.addEventListener("click", () => toggleFaq(i));
});
