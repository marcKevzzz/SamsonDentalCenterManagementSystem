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

function selectDoctor(index) {
  const d = doctors[index];
  document.getElementById("teamName").textContent = d.name;
  document.getElementById("teamRole").textContent = d.role;
  document.getElementById("teamQuote").textContent = d.quote;
  document.getElementById("teamEdu").textContent = d.edu;
  document.getElementById("teamExp").textContent = d.exp;
  document.getElementById("teamImg").src = d.img;
  document.getElementById("teamImg").alt = d.name;
  document.querySelectorAll(".team-thumb").forEach((el, i) => {
    el.classList.toggle("active", i === index);
    el.classList.toggle("opacity-50", i !== index);
  });
}

/* ── Facilities & Offers Carousel ── */
(function () {
  const track = document.getElementById("facTrack");
  const dotsWrap = document.getElementById("facDots");
  const cards = track.querySelectorAll(".fac-card");
  const total = cards.length;
  const perView = 3;
  const maxIdx = total - perView;
  let idx = 0;

  // Build dots
  for (let i = 0; i <= maxIdx; i++) {
    const dot = document.createElement("button");
    dot.className = `w-2 h-2 rounded-full transition-all duration-300 cursor-pointer border-none ${i === 0 ? "bg-brand w-5" : "bg-[#d1d5db]"}`;
    dot.onclick = () => goFac(i);
    dotsWrap.appendChild(dot);
  }

  function goFac(n) {
    if (n > maxIdx) {
      idx = 0; // loop back to start
    } else if (n < 0) {
      idx = maxIdx; // loop to end
    } else {
      idx = n;
    }

    const cardW = cards[0].offsetWidth;
    const gap = 20;
    const offset = idx * (cardW + gap);

    track.style.transform = `translateX(-${offset}px)`;

    dotsWrap.querySelectorAll("button").forEach((d, i) => {
      d.className = `rounded-full transition-all duration-300 cursor-pointer border-none h-2 ${
        i === idx ? "bg-brand w-5" : "bg-[#d1d5db] w-2"
      }`;
    });
  }

  setInterval(() => {
    goFac(idx + 1);
  }, 3000); // every 3 seconds

  window.shiftFac = function (dir) {
    goFac(idx + dir);
  };

  // Recalculate on resize
  window.addEventListener("resize", () => goFac(idx));
})();
