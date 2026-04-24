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

  playHero();
  initScrollAnimations();
  initMagneticButtons();
});

function initScrollAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // 1. Parallax Hero Effect (Mouse Move)
  const hero = document.querySelector("#hero");
  if (hero) {
    hero.addEventListener("mousemove", (e) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 30;
      const yPos = (clientY / window.innerHeight - 0.5) * 30;
      
      gsap.to("#heroContent", {
        x: xPos,
        y: yPos,
        duration: 1.5,
        ease: "power2.out"
      });
      
      gsap.to("#heroBg", {
        x: -xPos * 0.5,
        y: -yPos * 0.5,
        scale: 1.05,
        duration: 2,
        ease: "power2.out"
      });
    });
  }

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

  // 3. Reveal features (Staggered cards)
  gsap.from(".feature-card", {
    scrollTrigger: {
      trigger: "#features",
      start: "top 80%",
      once: true
    },
    opacity: 0,
    y: 60,
    rotateY: 15,
    duration: 1,
    stagger: 0.2,
    ease: "expo.out",
    clearProps: "all"
  });

  // 4. Reveal reviews header
  gsap.from("#reviews h2", {
    scrollTrigger: {
      trigger: "#reviews h2",
      start: "top 90%",
      once: true
    },
    opacity: 0,
    x: -50,
    duration: 1.2,
    ease: "power4.out"
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

function playHero() {
  const tl = gsap.timeline({
    defaults: { ease: "expo.out" }
  });

  tl.fromTo(".hero-reveal",
    { opacity: 0, y: 40, skewY: 5 },
    { opacity: 1, y: 0, skewY: 0, duration: 1.2, stagger: 0.2 }
  )
    .fromTo(".word",
      { opacity: 0, y: 60, rotateX: -60 },
      {
        opacity: 1, y: 0, rotateX: 0,
        duration: 1.5,
        stagger: 0.08,
        ease: "expo.out"
      },
      "-=0.8"
    )
    .fromTo(".hero-reveal-late",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.2 },
      "-=1"
    )
    .fromTo(".hero-doctor-img",
      { opacity: 0, scale: 0.8, x: 40, filter: "brightness(0.5) blur(10px)" },
      { opacity: 1, scale: 1, x: 0, filter: "brightness(1.05) blur(0px)", duration: 2, ease: "expo.out" },
      "-=1.2"
    )
    .fromTo(".glass-pill",
      { opacity: 0, x: -30, scale: 0.8 },
      { opacity: 1, x: 0, scale: 1, duration: 1.2, ease: "back.out(1.7)" },
      "-=1"
    );
}

function initMagneticButtons() {
    const buttons = document.querySelectorAll('a[href="/Appointments"], a[href="/Services"]');
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.4,
                ease: "power2.out"
            });
        });
        
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
}

/* ── Reviews Scroll Trigger Logic ── */
const reviewsData = [
  {
    name: "Marieme",
    date: "2024-05-15",
    img: "https://randomuser.me/api/portraits/women/25.jpg",
    text: "10/10 would recommend. I've never met a doctor who cares about patients as much as this clinic takes care of its patients. The attention to detail is unmatched and the results are truly life-changing.",
  },
  {
    name: "Alexandria Sadang",
    date: "2023-10-02",
    img: "https://randomuser.me/api/portraits/women/55.jpg",
    text: "Samson Dental Center has been my family's go-to clinic ever since we found them. It's definitely the best decision we made for our oral health. Every visit feels like visiting family.",
  },
  {
    name: "Carlos Reyes",
    date: "2024-01-20",
    img: "https://randomuser.me/api/portraits/men/41.jpg",
    text: "Professional staff and painless procedures. I was nervous but they made me feel completely at ease. Highly recommend to anyone anxious about dentist visits! The technology they use is top-notch.",
  },
  {
    name: "Maria Santos",
    date: "2024-03-05",
    img: "https://randomuser.me/api/portraits/women/30.jpg",
    text: "Absolutely world-class service. The team is warm and truly cares. My kids actually look forward to dental appointments now! I never thought I'd see the day they'd be excited for a checkup.",
  },
  {
    name: "John Doe",
    date: "2024-04-10",
    img: "https://randomuser.me/api/portraits/men/12.jpg",
    text: "The best dental experience I've ever had. Clean, modern, and very professional. The results are amazing! I've been to many clinics but this one stands out for its excellence.",
  },
  {
    name: "Sarah Jenkins",
    date: "2024-02-28",
    img: "https://randomuser.me/api/portraits/women/15.jpg",
    text: "I was always afraid of dentists, but the team here made me feel so comfortable. I'm actually excited for my next cleaning! They explain everything so clearly and really listen to your concerns.",
  },
  {
    name: "Michael Chen",
    date: "2024-06-12",
    img: "https://randomuser.me/api/portraits/men/65.jpg",
    text: "Exceptional care and very friendly environment. The doctors are highly skilled and take the time to ensure you are comfortable. My veneers look incredibly natural!",
  },
  {
    name: "Elena Rodriguez",
    date: "2024-05-20",
    img: "https://randomuser.me/api/portraits/women/42.jpg",
    text: "Fast, efficient, and high-quality work. I came in for an emergency and they handled it with such grace and expertise. I'm definitely making this my regular clinic.",
  },
];

function initReviewsScroll() {
  const container = document.getElementById("reviewsContainer");
  const section = document.querySelector(".horizontal-scroll-section");
  const dotsContainer = document.getElementById("reviewDots");
  if (!container || !section) return;

  container.innerHTML = reviewsData
    .map(
      (r, i) => `
    <div class="review-card-premium${i === 0 ? ' review-active' : ''}">
      <div class="review-quote-mark">"</div>
      <div>
        <p class="review-text">"${r.text}"</p>
      </div>
      <div class="review-footer">
        <div class="review-author">
          <img src="${r.img}" class="review-avatar" alt="${r.name}"/>
          <div>
            <div class="review-name">${r.name}</div>
            <div class="review-date">${r.date}</div>
          </div>
        </div>
        <div class="review-meta">
          <div class="flex gap-0.5 text-[#f59e0b] mb-1 justify-end">
            ${Array(5).fill('<i class="fa-solid fa-star text-[9px]"></i>').join('')}
          </div>
          <div class="review-verified">
            <span>Verified</span>
            <i class="fa-brands fa-google"></i>
          </div>
        </div>
      </div>
    </div>
  `
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

    const totalWidth = container.scrollWidth;
    const viewportWidth = section.offsetWidth;
    const travelDistance = totalWidth - viewportWidth;

    if (travelDistance > 0) {
      const snapPoints = cards.map((card) => {
        const cardOffset = card.offsetLeft;
        const cardWidth = card.offsetWidth;
        const targetX = cardOffset - viewportWidth / 2 + cardWidth / 2;
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
            const currentX = -gsap.getProperty(container, "x");
            let closestIndex = 0;
            let minDiff = Infinity;
            cards.forEach((card, i) => {
              const cardCenter = card.offsetLeft + card.offsetWidth / 2;
              const diff = Math.abs(currentX + viewportWidth / 2 - cardCenter);
              if (diff < minDiff) { minDiff = diff; closestIndex = i; }
            });
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
