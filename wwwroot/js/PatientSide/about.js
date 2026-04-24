// ── Entrance Animations ──
function initEntranceAnimations() {
  // 1. Hero Text (Top of Page - No ScrollTrigger needed)
 // Create a master timeline for the page entrance
const mainTl = gsap.timeline();

// 1. SEQUENCE PART ONE: Hero Entrance (Immediate)
const heroElements = document.querySelectorAll(".about-hero-text");
if (heroElements.length > 0) {

   mainTl.set(heroElements, { y: 30, autoAlpha: 0 });
  mainTl.to(heroElements, {
    autoAlpha: 1,
    y: 0,
    duration: 1.2,
    stagger: 0.2,
    ease: "expo.out",
    onComplete: function() {
      this.targets().forEach(el => {
        el.classList.add('revealed');
        gsap.set(el, { clearProps: "all" });
      });
    }
  });
}

// 2. SEQUENCE PART TWO: Scroll Reveals (Initialized after/with Hero)
const revealElements = gsap.utils.toArray(".reveal-up:not(.mission-card)");

if (revealElements.length > 0) {
  // Use 'set' to lock the starting position immediately
  gsap.set(revealElements, { y: 40, autoAlpha: 0 });

  revealElements.forEach((el) => {
    gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 92%", 
        once: true,
      },
      onComplete: function() {
        el.classList.add('revealed');
        gsap.set(el, { clearProps: "all" });
      }
    });
  });
}

  const storyTrigger = document.querySelector(".reveal-up.relative.group"); // Fixed selector
if (storyTrigger) {
  // Lock the initial state to prevent jump on scrub start
  gsap.set("#aboutimg1", { scale: 1.1 }); 

  const storyTl = gsap.timeline({
    scrollTrigger: {
      trigger: storyTrigger,
      start: "top bottom",
      end: "bottom top",
      scrub: 1 // Adding a small smoothing value helps with "jumpy" scrolls
    }
  });
  storyTl.to("#aboutimg1", { yPercent: 15, scale: 1.2, ease: "none" }, 0);
  storyTl.to("#aboutimg", { yPercent: -10, ease: "none" }, 0);
}


  // 3. Mission Section (Staggered Group)
  const infoSection = document.querySelector(".mission-section");
  if (infoSection) {
    const cards = document.querySelectorAll(".mission-card");
    // Lock start state
    gsap.set(cards, { y: 30, autoAlpha: 0 });

    gsap.to(cards, {
      scrollTrigger: {
        trigger: infoSection,
        start: "top 85%",
        once: true,
      },
      autoAlpha: 1,
      y: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: "power2.out",
      onComplete: function() {
        this.targets().forEach(el => el.classList.add('revealed'));
        gsap.set(this.targets(), { clearProps: "all" });
      }
    });
  }
  // 4. Stats Animation (Jump Effect)
 const statsItems = gsap.utils.toArray(".stats-item");
const statsSection = document.querySelector(".grid.grid-cols-3.gap-4.mt-10"); // Select the parent container

if (statsItems.length > 0 && statsSection) {
  // 1. Lock the initial state immediately
  gsap.set(statsItems, { y: 30, autoAlpha: 0 });

  // 2. Animate as a group using the parent as the trigger
  gsap.to(statsItems, {
    scrollTrigger: {
      trigger: statsSection,
      start: "top 85%", // Triggers when the top of the stats grid hits 85% of viewport
      once: true
    },
    y: 0,
    autoAlpha: 1,
    duration: 0.8,
    stagger: 0.15, // The magic sauce: 0.15s delay between each card
    ease: "back.out(1.5)", 
    onComplete: function() {
      // Apply cleanup to each item in the group
      this.targets().forEach(el => {
        el.classList.add('revealed');
        gsap.set(el, { clearProps: "all" });
      });
    }
  });
}

}

initEntranceAnimations();
initMagneticFacilityCards();

function initMagneticFacilityCards() {
    const cards = document.querySelectorAll(".fac-card");
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            gsap.to(card, {
                x: x * 0.1,
                y: y * 0.1,
                rotationX: -y * 0.05,
                rotationY: x * 0.05,
                duration: 0.5,
                ease: "power2.out"
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                x: 0,
                y: 0,
                rotationX: 0,
                rotationY: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.3)"
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Team Thumbs
  const thumbs = document.querySelectorAll(".team-thumb");
  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => handleManualSelect(i));
  });

  // 2. Facility Navigation
  document
    .getElementById("facPrev")
    ?.addEventListener("click", () => shiftFac(-1));
  document
    .getElementById("facNext")
    ?.addEventListener("click", () => shiftFac(1));

  // 3. Facility Hover Pause
  const facTrack = document.getElementById("facTrack");
  facTrack?.addEventListener("mouseenter", stopFacTimer);
  facTrack?.addEventListener("mouseleave", startFacTimer);

  // 4. Initialization
  initFacDots();
  startFacTimer();
});

// Resize handler
window.addEventListener("resize", () => {
  initFacDots();
  goFac(facIdx);
});

/* ── Team data ── */
const doctors = [
  {
    name: "Dr. Marcus Rivera",
    role: "Chief Oral Surgeon",
    quote:
      '"Surgery is an art where precision meets compassion. My goal is to ensure safety and comfort in every procedure."',
    edu: "DMD, UP Manila | Residency at Mount Sinai",
    exp: "16 Years Experience",
    img: "https://randomuser.me/api/portraits/men/46.jpg",
  },
  {
    name: "Dr. Leila Santos",
    role: "Orthodontics Specialist",
    quote:
      '"A beautiful smile changes everything — and I\'m honored to be part of that transformation journey."',
    edu: "DMD, Ateneo | Fellowship, ABO",
    exp: "11 Years Experience",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Dr. James Ocampo",
    role: "Pediatric Dentist",
    quote:
      '"Building trust with young patients early sets the foundation for a lifetime of healthy smiles."',
    edu: "DMD, UST | MS Pediatric Dentistry, UPH",
    exp: "9 Years Experience",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
  },
];
let doctorIndex = 0;
let doctorInterval;
const DOCTOR_SWAP_SPEED = 5000; // 5 seconds per doctor

// 1. The Main Function (Enhanced with GSAP)
function selectDoctor(index) {
  // Update our global tracker
  doctorIndex = index;

  const d = doctors[index];
  const teamCard = document.getElementById("teamCard");
  const thumbs = document.querySelectorAll(".team-thumb");

  thumbs.forEach((thumb, i) => {
    if (i === index) {
      thumb.classList.add("active");
      thumb.classList.remove("opacity-50");
    } else {
      thumb.classList.remove("active");
      thumb.classList.add("opacity-50");
    }
  });

  // GSAP Transition
  const tl = gsap.timeline();

  tl.to(teamCard, { opacity: 0, y: 10, duration: 0.2 })
    .call(() => {
      // Content Swap
      document.getElementById("teamName").textContent = d.name;
      document.getElementById("teamRole").textContent = d.role;
      document.getElementById("teamQuote").textContent = d.quote;
      document.getElementById("teamEdu").textContent = d.edu;
      document.getElementById("teamExp").textContent = d.exp;
      document.getElementById("teamImg").src = d.img;
    })
    .to(teamCard, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" });
}

// 2. The Auto-Swapping Logic
function startDoctorTimer() {
  stopDoctorTimer(); // Clear existing
  doctorInterval = setInterval(() => {
    doctorIndex = (doctorIndex + 1) % doctors.length; // Loop back to 0 at the end
    selectDoctor(doctorIndex);
  }, DOCTOR_SWAP_SPEED);
}

function stopDoctorTimer() {
  clearInterval(doctorInterval);
}

// 3. Manual Click Interruption
// We wrap the original click so it also resets the timer
function handleManualSelect(index) {
  selectDoctor(index);
  startDoctorTimer(); // Restarting the timer gives the user 5 fresh seconds
}

// 4. Initialize and Event Listeners
window.addEventListener("load", () => {
  // Initialize with first doctor
  selectDoctor(0);
  startDoctorTimer();

  // Pause when user is reading (hovering over the card)
  const teamCard = document.getElementById("teamCard");
  teamCard.addEventListener("mouseenter", stopDoctorTimer);
  teamCard.addEventListener("mouseleave", startDoctorTimer);
});

/* ── Facilities & Offers Carousel ── */
/* ── Facilities & Offers Carousel ── */
let facIdx = 0;
let facInterval;
const FAC_SWAP_SPEED = 3000;

function goFac(n) {
  const track = document.getElementById("facTrack");
  const cards = document.querySelectorAll(".fac-card");
  const dotsWrap = document.getElementById("facDots");
  if (!track || cards.length === 0) return;

  const total = cards.length;
  const perView = window.innerWidth < 768 ? 1 : 3;
  const maxIdx = Math.max(0, total - perView);

  // Loop logic
  if (n > maxIdx) facIdx = 0;
  else if (n < 0) facIdx = maxIdx;
  else facIdx = n;

  const cardW = cards[0].offsetWidth;
  const gap = 20;
  const offset = facIdx * (cardW + gap);

  track.style.transform = `translateX(-${offset}px)`;

  // Update Dots
  const dots = dotsWrap?.querySelectorAll("button");
  dots?.forEach((d, i) => {
    d.className = `rounded-full transition-all duration-300 cursor-pointer border-none h-2 ${
      i === facIdx ? "bg-brand w-5" : "bg-[#d1d5db] w-2"
    }`;
  });
}

function shiftFac(dir) {
  goFac(facIdx + dir);
  startFacTimer(); // Reset timer on manual click
}

function startFacTimer() {
  stopFacTimer();
  facInterval = setInterval(() => shiftFac(1), FAC_SWAP_SPEED);
}

function stopFacTimer() {
  clearInterval(facInterval);
}

// Initialize Dots
function initFacDots() {
  const dotsWrap = document.getElementById("facDots");
  const cards = document.querySelectorAll(".fac-card");
  if (!dotsWrap) return;

  const perView = window.innerWidth < 768 ? 1 : 3;
  const maxIdx = Math.max(0, cards.length - perView);

  dotsWrap.innerHTML = "";
  for (let i = 0; i <= maxIdx; i++) {
    const dot = document.createElement("button");
    dot.className = `w-2 h-2 rounded-full transition-all duration-300 cursor-pointer border-none bg-[#d1d5db]`;
    dot.onclick = () => {
      goFac(i);
      startFacTimer();
    };
    dotsWrap.appendChild(dot);
  }
}
