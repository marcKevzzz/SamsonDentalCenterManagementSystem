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
