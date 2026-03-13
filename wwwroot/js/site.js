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
function updateNav() {
  if (window.scrollY > 60) {
    navbar.style.background = COLORS.offwhite;
    navbar.style.backdropFilter = "blur(18px)";
    navbar.style.webkitBackdropFilter = "blur(18px)";
    navbar.style.boxShadow = "0 2px 24px rgba(0,0,0,0.25)";
  } else {
    navbar.style.background = "transparent";
    navbar.style.backdropFilter = "none";
    navbar.style.boxShadow = "none";
  }
}
window.addEventListener("scroll", updateNav);
updateNav();

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 20);
});

const servicesBtn = document.getElementById("servicesBtn");
const servicesMega = document.getElementById("servicesMega");
const chevronIcon = document.getElementById("chevronIcon");

servicesMega.classList.add("hidden");

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

let reviewIndex = 0;

function renderReviews() {
  const container = document.getElementById("reviewsContainer");
  const cards = [0, 1].map((offset) => {
    const r = reviewsData[(reviewIndex + offset) % reviewsData.length];
    const dim = offset === 1 ? "review-dim" : "";
    return `
        <div class="bg-white rounded-2xl p-7 flex-1 min-w-[260px] ${dim}">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <img src="${r.img}" alt="${r.name}" class="w-12 h-12 rounded-full object-cover"/>
              <div>
                <div class="brand-font font-bold text-[0.88rem] text-[#1a1a2e]">${r.name}</div>
                <div class="font-body text-[0.68rem] text-muted mt-0.5">${r.date}</div>
              </div>
            </div>
            <span class="font-bold text-lg" style="color:#4285F4;">G</span>
          </div>
          <div class="flex items-center gap-0.5 text-[#f59e0b] text-[0.95rem] mb-3">
            ★★★★★
            <span class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ml-1.5">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </div>
          <p class="font-body text-[0.84rem] text-muted leading-relaxed mb-4">${r.text}</p>
          <a href="#" class="font-body text-[0.76rem] text-muted hover:text-primary transition-colors font-medium">Read more</a>
        </div>`;
  });
  container.innerHTML = cards.join("");
}

function nextReview() {
  reviewIndex = (reviewIndex + 1) % reviewsData.length;
  renderReviews();
}
function prevReview() {
  reviewIndex = (reviewIndex - 1 + reviewsData.length) % reviewsData.length;
  renderReviews();
}

renderReviews();

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
