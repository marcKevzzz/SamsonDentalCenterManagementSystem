// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF", // replace COLORS.primary
        brand: "#0F172A", // replace COLORS.dark
        muted: "#6B7280", // replace COLORS.textMuted
        offwhite: "#F8FAFC", // replace COLORS.offwhite
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
    },
  },
};

const COLORS = {
  primary: "#c0392b", // Red accent (buttons, badges, hover)
  dark: "#0f1117", // Dark backgrounds, footer, nav scrolled
  darkNavBg: "rgba(15,17,23,0.92)", // Navbar bg after scroll
  white: "#ffffff",
  offwhite: "#f5f5f7", // Section bg, card bg
  text: "#1a1a2e",
  textMuted: "#6b7280",
  badgePurple: "#7c3aed", // Whitening promo badge
  badgeTeal: "#059669", // Free consultation badge
  star: "#f59e0b", // Star rating
  border: "#e5e7eb",
};

const navbar = document.getElementById("navbar");
const logo = document.getElementById("logo");
const bookBtn = document.getElementById("bookBtn");
const guestAvatar = document.getElementById("guestAvatar");
function updateNav() {
  if (window.scrollY > 60) {
    navbar.style.background = COLORS.white;
    navbar.style.backdropFilter = "blur(18px)";
    navbar.style.webkitBackdropFilter = "blur(18px)";
    navbar.style.boxShadow = "0 2px 24px rgba(0,0,0,0.25)";
    navbar.style.color = COLORS.text;
    logo.style.color = COLORS.text;
    bookBtn.style.borderColor = COLORS.dark;
    guestAvatar.style.borderColor = COLORS.textMuted;
  } else {
    navbar.style.background = "transparent";
    navbar.style.backdropFilter = "none";
    navbar.style.boxShadow = "none";
    navbar.style.color = COLORS.white;
    logo.style.color = COLORS.white;
    bookBtn.style.borderColor = COLORS.white;
    guestAvatar.style.borderColor = COLORS.offwhite;
  }
}
window.addEventListener("scroll", updateNav);
updateNav();

const path = window.location.pathname.toLowerCase();

function setActive(id) {
  document.getElementById(id)?.classList.add("active");
}

if (path === "/" || path === "") {
  setActive("nav-home");
} else if (path.startsWith("/about")) {
  setActive("nav-about");
} else if (path.startsWith("/services")) {
  setActive("servicesBtn");
} else if (path.startsWith("/contacts")) {
  setActive("nav-contacts");
}

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 20);
});

const servicesBtn = document.getElementById("servicesBtn");
const servicesMega = document.getElementById("servicesMega");
const chevronIcon = document.getElementById("chevronIcon");

servicesBtn.addEventListener("click", () => {
  servicesMega.classList.toggle("hidden");
  chevronIcon.classList.toggle("rotate-180");
});

document.addEventListener("click", (e) => {
  if (
    !document.getElementById("servicesWrapper").contains(e.target) &&
    !document.getElementById("megaPanel").contains(e.target)
  ) {
    servicesMega.classList.add("hidden");
    chevronIcon.classList.remove("rotate-180");
  }
});

const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

hamburgerBtn.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
  servicesMega.classList.add("hidden");
});

const mobileServicesBtn = document.getElementById("mobileServicesBtn");
const mobileServicesMenu = document.getElementById("mobileServicesMenu");
const mobileChevron = document.getElementById("mobileChevron");

mobileServicesBtn.addEventListener("click", () => {
  if (mobileServicesMenu.style.maxHeight) {
    mobileServicesMenu.style.maxHeight = null;
    mobileChevron.classList.remove("rotate-180");
  } else {
    mobileServicesMenu.style.maxHeight = mobileServicesMenu.scrollHeight + "px";
    mobileChevron.classList.add("rotate-180");
  }
});

/* ── GSAP scroll-triggered fade-ups ── */
gsap.registerPlugin(ScrollTrigger);
gsap.utils.toArray(".fade-up").forEach((el) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.75,
    ease: "power2.out",
    scrollTrigger: {
      trigger: el,
      start: "top 88%",
      toggleActions: "play none none none",
    },
  });
});

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

function initCarousel() {
  // 1. Triple the data for seamless looping (Original + Buffer)
  const items = [...reviewsData, ...reviewsData, ...reviewsData];

  track.innerHTML = items
    .map(
      (r) => `
    <div class="review-card bg-white rounded-2xl p-7 flex-shrink-0 w-full sm:w-[400px]">
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

  // 2. Start at the middle set of data for infinite feel
  currentIndex = reviewsData.length;
  updatePosition(false);
}

function getMoveDistance() {
  const card = track.querySelector(".review-card");
  const gap = 24; // This matches your 'gap-6' (6 * 4px)
  return card.offsetWidth + gap;
}

function updatePosition(animate = true) {
  const xPos = -currentIndex * getMoveDistance();

  if (animate) {
    isAnimating = true;
    gsap.to(track, {
      x: xPos,
      duration: 0.7,
      ease: "power4.out",
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
  // If we reach the end of the third set or beginning of the first,
  // snap back to the middle set silently.
  if (currentIndex >= reviewsData.length * 2) {
    currentIndex = reviewsData.length;
    updatePosition(false);
  } else if (currentIndex < reviewsData.length) {
    currentIndex = reviewsData.length * 2 - 1;
    updatePosition(false);
  }
}

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

// Handle window resizing
window.addEventListener("resize", () => updatePosition(false));

// Initialize
initCarousel();

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
        <button onclick="toggleFaq(${i})"
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

function toggleFaq(i) {
  const answer = document.getElementById(`faq-${i}`);
  const chevron = document.getElementById(`chevron-${i}`);
  const isOpen = answer.classList.contains("open");
  document
    .querySelectorAll(".faq-answer")
    .forEach((el) => el.classList.remove("open"));
  document
    .querySelectorAll(".faq-chevron")
    .forEach((el) => el.classList.remove("open"));
  if (!isOpen) {
    answer.classList.add("open");
    chevron.classList.add("open");
  }
}

/* ── Mock user ── */
const MOCK_USER = {
  firstName: "Juan",
  lastName: "Dela Cruz",
  email: "juan@email.com",
  initials: "JD",
};

/* ── Toggle ── */
function toggleProfile() {
  const panel = document.getElementById("profilePanel");
  const backdrop = document.getElementById("profileBackdrop");
  const chevron = document.getElementById("profileChevron");
  const isOpen = !panel.classList.contains("panel-hidden");

  if (isOpen) {
    closeProfile();
  } else {
    panel.classList.remove("panel-hidden");
    backdrop.classList.remove("hidden");
    chevron.classList.add("rotated");
  }
}

function closeProfile() {
  document.getElementById("profilePanel").classList.add("panel-hidden");
  document.getElementById("profileBackdrop").classList.add("hidden");
  document.getElementById("profileChevron").classList.remove("rotated");
}

/* ── Sign in (call this from your real auth) ── */
function mockSignIn(user = MOCK_USER) {
  // Swap avatar
  document.getElementById("guestAvatar").classList.add("hidden");
  document.getElementById("signedInAvatar").classList.remove("hidden");
  document.getElementById("navInitials").textContent = user.initials;

  // Populate header
  document.getElementById("modalInitials").textContent = user.initials;
  document.getElementById("modalName").textContent =
    `${user.firstName} ${user.lastName}`;
  document.getElementById("modalEmail").textContent = user.email;

  // Swap panel content
  document.getElementById("guestState").classList.add("hidden");
  document.getElementById("signedInState").classList.remove("hidden");

  // Open dropdown
  document.getElementById("profilePanel").classList.remove("panel-hidden");
  document.getElementById("profileBackdrop").classList.remove("hidden");
  document.getElementById("profileChevron").classList.add("rotated");
}

/* ── Sign out (call this from your real auth) ── */
function mockSignOut() {
  document.getElementById("guestAvatar").classList.remove("hidden");
  document.getElementById("signedInAvatar").classList.add("hidden");
  document.getElementById("guestState").classList.remove("hidden");
  document.getElementById("signedInState").classList.add("hidden");
  closeProfile();
}

/* ── Close on Escape ── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeProfile();
});
