const { primary, dark, white, textMuted, offwhite, text } = window.COLORS;

const navbar = document.getElementById("navbar");
const logo = document.getElementById("logo");
const bookBtn = document.getElementById("bookBtn");
const guestAvatar = document.getElementById("guestAvatar");

window.toggleNavbar = function (isActive) {
  if (isActive) {
    navbar.style.background = white;
    navbar.style.backdropFilter = "blur(18px)";
    navbar.style.webkitBackdropFilter = "blur(18px)";
    navbar.style.boxShadow = "0 2px 24px rgba(0,0,0,0.25)";
    navbar.style.color = text;
    logo.style.color = text;
    bookBtn.style.borderColor = dark;
    guestAvatar.style.borderColor = textMuted;
  } else {
    navbar.style.background = "transparent";
    navbar.style.backdropFilter = "none";
    navbar.style.boxShadow = "none";
    navbar.style.color = white;
    logo.style.color = white;
    bookBtn.style.borderColor = white;
    guestAvatar.style.borderColor = offwhite;
  }
};

window.disableNavScroll = false;

window.addEventListener("scroll", () => {
  if (window.disableNavScroll) return;
  toggleNavbar(window.scrollY > 60);
});

toggleNavbar(false);

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
} else if (path.startsWith("/profile/dashboard")) {
  setActive("side-dashboard");
  setActive("nav-dashboard");
} else if (path.startsWith("/profile/myappointments")) {
  setActive("side-myappointments");
  setActive("nav-myappointments");
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
const navIconPath = document.getElementById("navIconPath");

const hamburgerPath = "M4 7h16M4 12h16M4 17h16";
const closePath = "M6 18L18 6M6 6l12 12";

hamburgerBtn.addEventListener("click", () => {
  const isMenuOpening = mobileMenu.classList.contains("hidden");

  if (window.scrollY < 50) {
    toggleNavbar(isMenuOpening);
  }

  // Toggle the menu visibility
  mobileMenu.classList.toggle("hidden");
  servicesMega.classList.add("hidden");

  // Swap the icon path
  if (isMenuOpening) {
    navIconPath.setAttribute("d", closePath);
  } else {
    navIconPath.setAttribute("d", hamburgerPath);
  }
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
