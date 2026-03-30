import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  // Animate fade-up elements
  document.getElementById("nextReview")?.addEventListener("click", nextReview);
  document.getElementById("prevReview")?.addEventListener("click", prevReview);
});

function playHero() {
  const tl = gsap.timeline();

  // 1. Reveal the container
  gsap.set("#heroContent", { opacity: 1 });

  // 2. The Stagger Timeline
  tl.fromTo(
    ".hero-reveal", // Animate other reveals first (like the welcome badge)
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6 },
  )
    .fromTo(
      ".word",
      {
        opacity: 0,
        y: 40, // Start lower
        rotateX: -40, // Adds a 3D "leaning" effect as they come up
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        ease: "back.out(1.7)", // Gives it a slight "bounce"
        stagger: 0.1, // 100ms delay between each word
      },
      "-=0.4", // Start this animation slightly before the previous one finishes
    )
    .fromTo(
      ".hero-reveal-late", // Animate buttons and social proof last
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.2 },
      "-=0.5",
    );
}

playHero();

/* ── Reviews carousel ── */
const reviewsData = [
  {
    name: "Marieme",
    date: "2024-05-15",
    img: "https://randomuser.me/api/portraits/women/25.jpg",
    text: "10/10 would recommend. I've never met a doctor who cares about patients as much as this clinic takes care of its patients. The attention to detail is unmatched.",
  },
  {
    name: "Alexandria Sadang",
    date: "2023-10-02",
    img: "https://randomuser.me/api/portraits/women/55.jpg",
    text: "Samson Dental Center has been my family's go-to clinic ever since we found them. It's definitely the best decision we made for our oral health.",
  },
  {
    name: "Carlos Reyes",
    date: "2024-01-20",
    img: "https://randomuser.me/api/portraits/men/41.jpg",
    text: "Professional staff and painless procedures. I was nervous but they made me feel completely at ease. Highly recommend to anyone anxious about dentist visits!",
  },
  {
    name: "Maria Santos",
    date: "2024-03-05",
    img: "https://randomuser.me/api/portraits/women/30.jpg",
    text: "Absolutely world-class service. The team is warm and truly cares. My kids actually look forward to dental appointments now — I never thought that'd happen!",
  },
];
const track = document.getElementById("reviewsContainer");
let currentIndex = 0;
let isAnimating = false;
let autoPlayInterval;

// --- CONFIGURATION ---
const AUTO_PLAY_SPEED = 4000; // 4 seconds per slide

function initCarousel() {
  const items = [...reviewsData, ...reviewsData, ...reviewsData];

  track.innerHTML = items
    .map(
      (r) => `
    <div class="review-card bg-white rounded-2xl p-7 flex-shrink-0 w-full sm:w-[400px] shadow-sm">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-3">
          <img src="${r.img}" class="w-12 h-12 rounded-full object-cover" alt="${r.name}"/>
          <div>
            <div class="font-bold text-sm text-[#1a1a2e]">${r.name}</div>
            <div class="text-xs text-gray-400">${r.date}</div>
          </div>
        </div>
        <span class="font-bold text-lg text-blue-600">G</span>
      </div>
      <div class="text-yellow-500 mb-3 text-xs">★★★★★</div>
      <p class="text-sm text-gray-600 leading-relaxed">${r.text}</p>
    </div>
  `,
    )
    .join("");

  currentIndex = reviewsData.length;

  requestAnimationFrame(() => {
    updatePosition(false);
    startAutoPlay(); // Start the loop
  });
}

function getMoveDistance() {
  const card = track.querySelector(".review-card");
  if (!card) return 0;
  const style = window.getComputedStyle(track);
  const gap = parseFloat(style.columnGap) || 0;
  return card.offsetWidth + gap;
}

function updatePosition(animate = true) {
  const xPos = -currentIndex * getMoveDistance();

  if (animate) {
    isAnimating = true;
    gsap.to(track, {
      x: xPos,
      duration: 0.8,
      ease: "power3.inOut", // Slightly smoother ease for auto-scrolling
      onComplete: () => {
        isAnimating = false;
        checkLoop();
      },
    });
  } else {
    gsap.set(track, { x: xPos });
  }
}

function checkLoop() {
  if (currentIndex >= reviewsData.length * 2) {
    currentIndex = reviewsData.length;
    updatePosition(false);
  } else if (currentIndex < reviewsData.length) {
    currentIndex = reviewsData.length * 2 - 1;
    updatePosition(false);
  }
}

// --- CONTROLS ---

function nextReview() {
  if (isAnimating) return;
  currentIndex++;
  updatePosition();
}

function prevReview() {
  if (isAnimating) return;
  currentIndex--;
  updatePosition();
}

// --- AUTO-PLAY LOGIC ---

function startAutoPlay() {
  stopAutoPlay(); // Clear any existing intervals
  autoPlayInterval = setInterval(() => {
    nextReview();
  }, AUTO_PLAY_SPEED);
}

function stopAutoPlay() {
  clearInterval(autoPlayInterval);
}

// --- EVENT LISTENERS ---

// Pause when mouse enters, resume when it leaves
track.addEventListener("mouseenter", stopAutoPlay);
track.addEventListener("mouseleave", startAutoPlay);

window.addEventListener("resize", () => updatePosition(false));

window.addEventListener("load", () => {
  initCarousel();
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
