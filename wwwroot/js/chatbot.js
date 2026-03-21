/* ── Knowledge Base ── */
const KB = {
  clinic: {
    name: "Samson Dental Center",
    address: "7 Himlayan Rd, Tandang Sora, Quezon City, Metro Manila",
    phone: "+63 2 8888 1234",
    email: "hello@samsondentalph",
    founded: "2008",
  },
  hours: {
    weekdays: "9:00 AM – 6:00 PM",
    saturday: "8:00 AM – 5:00 PM",
    sunday: "Closed (By Appointment Only)",
  },
  services: {
    general: [
      "Dental Checkup (₱500+)",
      "Teeth Cleaning (₱800+)",
      "Tooth Filling (₱1,200+)",
      "Fluoride Treatment (₱400+)",
    ],
    cosmetic: [
      "Teeth Whitening (₱3,500+)",
      "Dental Veneers (₱8,000+/tooth)",
      "Smile Makeover (₱15,000+)",
      "Composite Bonding (₱2,500+/tooth)",
    ],
    specialized: [
      "Root Canal (₱5,000+)",
      "Braces & Aligners (₱25,000+)",
      "Dental Implants (₱35,000+)",
      "Oral Surgery (₱2,500+)",
    ],
  },
  promos: [
    {
      name: "New Patient Special",
      discount: "20% OFF",
      code: "NEW20",
      desc: "First exam, X-rays & cleaning",
    },
    {
      name: "Teeth Whitening",
      discount: "₱100 OFF",
      code: "BRIGHT100",
      desc: "In-office whitening treatment",
    },
    {
      name: "Invisalign Consult",
      discount: "FREE",
      code: "SMILEFREE",
      desc: "Complimentary Invisalign consult",
    },
  ],
  team: [
    { name: "Dr. Marcus Rivera", role: "Chief Oral Surgeon", exp: "16 years" },
    {
      name: "Dr. Leila Santos",
      role: "Orthodontics Specialist",
      exp: "11 years",
    },
    { name: "Dr. James Ocampo", role: "Pediatric Dentist", exp: "9 years" },
  ],
  insurance: ["Maxicare", "Intellicare", "Medicard", "PhilHealth"],
};

/* ── Intent definitions ── */
const INTENTS = [
  {
    keys: [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
      "sup",
      "start",
    ],
    reply: () => ({
      text: `Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI'm your virtual assistant — here to help with services, schedules, pricing, and more. What can I help you with today?`,
      quick: [
        "Book appointment",
        "Our services",
        "Opening hours",
        "Where are you?",
      ],
    }),
  },
  {
    keys: [
      "hour",
      "open",
      "schedule",
      "time",
      "operating",
      "when",
      "close",
      "weekend",
      "saturday",
      "sunday",
    ],
    reply: () => ({
      text: `🕐 **Our Operating Hours:**\n\n• **Mon – Fri:** ${KB.hours.weekdays}\n• **Saturday:** ${KB.hours.saturday}\n• **Sunday:** ${KB.hours.sunday}\n\nWe're currently accepting appointments!`,
      quick: ["Book an appointment", "Walk-in patients?", "Contact us"],
    }),
  },
  {
    keys: [
      "service",
      "treat",
      "procedure",
      "offer",
      "available",
      "what can you",
      "list",
      "do you do",
    ],
    reply: () => ({
      text: `🦷 **Our Services:**\n\n**General Dentistry**\n${KB.services.general.map((s) => "• " + s).join("\n")}\n\n**Cosmetic**\n${KB.services.cosmetic.map((s) => "• " + s).join("\n")}\n\n**Specialized**\n${KB.services.specialized.map((s) => "• " + s).join("\n")}\n\nWant details on a specific service?`,
      quick: [
        "Teeth whitening",
        "Dental implants",
        "Braces & aligners",
        "Root canal",
      ],
    }),
  },
  {
    keys: [
      "location",
      "address",
      "where",
      "find",
      "direction",
      "map",
      "how to get",
      "near",
    ],
    reply: () => ({
      text: `📍 **Find Us:**\n\n**${KB.clinic.address}**\n\nLocated near Tandang Sora Market, accessible via Commonwealth Avenue. Ample on-site parking available.\n\n→ <a href="https://maps.google.com/?q=Tandang+Sora+Quezon+City" target="_blank" style="color:#c0392b">Open in Google Maps</a>`,
      quick: ["Parking available?", "Contact number", "Book appointment"],
    }),
  },
  {
    keys: [
      "price",
      "cost",
      "fee",
      "how much",
      "rate",
      "promo",
      "discount",
      "offer",
      "deal",
      "package",
      "afford",
    ],
    reply: () => ({
      text: `💰 **Pricing & Promotions:**\n\nServices start at ₱400 (fluoride) up to ₱35,000+ (implants).\n\n**Current Promos:**\n${KB.promos.map((p) => `• **${p.name}** — ${p.discount} *(${p.code})*`).join("\n")}\n\nWant pricing on a specific treatment?`,
      quick: [
        "Whitening price",
        "Implant cost",
        "All services",
        "Promos explained",
      ],
    }),
  },
  {
    keys: [
      "insurance",
      "hmo",
      "medicard",
      "maxicare",
      "intellicare",
      "philhealth",
      "coverage",
      "plan",
    ],
    reply: () => ({
      text: `🏥 **Accepted HMO & Insurance:**\n\n${KB.insurance.map((i) => "• " + i).join("\n")}\n\nBring your HMO card on your visit and our front desk will verify coverage. Questions? Call **${KB.clinic.phone}**.`,
      quick: ["What's covered?", "Book appointment", "Contact us"],
    }),
  },
  {
    keys: [
      "book",
      "appointment",
      "reserve",
      "slot",
      "visit",
      "consult",
      "schedule a",
    ],
    reply: () => ({
      text: `📅 **Book an Appointment:**\n\nYou can book online through our portal or reach us directly:\n\n📞 **${KB.clinic.phone}**\n📧 **${KB.clinic.email}**`,
      quick: ["Call us", "Opening hours", "Walk-in available?"],
      action: { label: "📅 Book Online", url: "appointment/index.html" },
    }),
  },
  {
    keys: ["contact", "phone", "call", "email", "reach", "number"],
    reply: () => ({
      text: `📞 **Contact Us:**\n\n• **Phone:** ${KB.clinic.phone}\n• **Email:** ${KB.clinic.email}\n• **Address:** ${KB.clinic.address}\n\nAvailable **Mon–Fri 9AM–6PM** and **Sat 8AM–5PM**.`,
      quick: ["Opening hours", "Book appointment", "Where are you?"],
    }),
  },
  {
    keys: ["walk", "walkin", "walk-in", "no appointment", "drop in", "drop-in"],
    reply: () => ({
      text: `✅ **Yes, we accept walk-in patients!**\n\nHowever, booking in advance guarantees your preferred time and reduces wait time. Would you like to book now?`,
      quick: ["Book appointment", "Opening hours", "Location"],
    }),
  },
  {
    keys: ["park", "parking", "car"],
    reply: () => ({
      text: `🚗 **Yes, we have ample parking on-site** at 7 Himlayan Rd, Tandang Sora. Additional street parking is available along Commonwealth Avenue.`,
      quick: ["Get directions", "Opening hours", "Contact us"],
    }),
  },
  {
    keys: [
      "child",
      "kid",
      "children",
      "baby",
      "pedia",
      "pediatric",
      "young",
      "son",
      "daughter",
    ],
    reply: () => ({
      text: `👶 **Yes! We specialize in pediatric care.**\n\n**Dr. James Ocampo** (9 years experience) makes dental visits fun and comfortable for children. We recommend a child's first visit around age 1 or when their first tooth appears.`,
      quick: ["Book kids appointment", "All services", "Contact us"],
    }),
  },
  {
    keys: [
      "emergency",
      "urgent",
      "pain",
      "ache",
      "broken",
      "chip",
      "crack",
      "swollen",
      "bleeding",
    ],
    reply: () => ({
      text: `🚨 **Dental Emergency?**\n\nCall us immediately at **${KB.clinic.phone}**. We accommodate same-day emergency appointments whenever possible.\n\nFor severe pain or swelling, please call rather than waiting for a chat response.`,
      quick: ["Call us now", "Location", "Opening hours"],
    }),
  },
  {
    keys: [
      "whiten",
      "whitening",
      "white",
      "bright",
      "stain",
      "yellow",
      "shade",
    ],
    reply: () => ({
      text: `✨ **Teeth Whitening at SDC:**\n\n• **Price:** From ₱3,500\n• **Promo:** ₱100 OFF with code **BRIGHT100**\n• **Duration:** 60–90 minutes\n• **Results:** Up to 8 shades lighter in one visit\n• **Take-home kit** also available\n\nResults last 1–3 years.`,
      quick: ["Book whitening", "All cosmetic services", "Current promos"],
    }),
  },
  {
    keys: ["implant", "missing tooth", "replace tooth", "artificial tooth"],
    reply: () => ({
      text: `🦷 **Dental Implants:**\n\n• **Price:** From ₱35,000/implant\n• **Timeline:** 3–6 months (implant fuses with jawbone)\n• **Result:** Looks, feels, and functions like a natural tooth\n• Preserves jawbone density\n• Brush and floss normally\n\nA free consultation is available to assess your candidacy.`,
      quick: [
        "Book implant consult",
        "Implant pricing",
        "All specialized services",
      ],
    }),
  },
  {
    keys: [
      "brace",
      "aligner",
      "invisalign",
      "ortho",
      "crooked",
      "gap",
      "spacing",
      "straight",
    ],
    reply: () => ({
      text: `😁 **Braces & Aligners:**\n\n• **Braces from:** ₱25,000\n• **Clear aligners from:** ₱45,000\n• **Duration:** 12–24 months typical\n• Retainer included after treatment\n• **Free Invisalign consult** with code **SMILEFREE**`,
      quick: ["Book ortho consult", "Aligners vs braces", "All services"],
    }),
  },
  {
    keys: ["root canal", "nerve", "pulp", "infection", "abscess"],
    reply: () => ({
      text: `🔬 **Root Canal Treatment:**\n\nDespite its reputation, a modern root canal is no more painful than a filling — we use full local anesthesia.\n\n• **Price:** From ₱5,000\n• **Duration:** 60–90 min (1–2 visits)\n• **Recovery:** Mild soreness 2–3 days\n• Saves your natural tooth from extraction`,
      quick: ["Book root canal", "All specialized services", "Pain management"],
    }),
  },
  {
    keys: [
      "veneer",
      "porcelain",
      "makeover",
      "composite",
      "bonding",
      "cosmetic",
    ],
    reply: () => ({
      text: `💎 **Cosmetic Services:**\n\n• **Veneers** — ₱8,000+/tooth (10–15 yr lifespan)\n• **Whitening** — ₱3,500+ (8 shades lighter)\n• **Bonding** — ₱2,500+/tooth (chips & gaps)\n• **Smile Makeover** — ₱15,000+ (fully customized)\n\nAll include a **digital smile preview** before you commit.`,
      quick: ["Book cosmetic consult", "Current promos", "Cosmetic prices"],
    }),
  },
  {
    keys: [
      "team",
      "doctor",
      "dentist",
      "specialist",
      "staff",
      "who are",
      "dr ",
      "physician",
    ],
    reply: () => ({
      text: `👨‍⚕️ **Our Dental Team:**\n\n${KB.team.map((d) => `• **${d.name}** — ${d.role} (${d.exp})`).join("\n")}\n\nAll doctors are licensed, highly experienced, and committed to gentle, patient-first care.`,
      quick: ["Book with a doctor", "Our services", "About us"],
    }),
  },
  {
    keys: ["about", "story", "history", "since", "founded", "clinic", "samson"],
    reply: () => ({
      text: `🏥 **About Samson Dental Center:**\n\nFounded in **${KB.clinic.founded}** in Quezon City, SDC bridges world-class medical precision with genuine hospitality.\n\nToday we serve **2,000+ happy patients** with **12 expert specialists** across general, cosmetic, and specialized dentistry.`,
      quick: ["Meet our team", "Our services", "Location & hours"],
    }),
  },
  {
    keys: [
      "payment",
      "pay",
      "cash",
      "credit",
      "card",
      "installment",
      "gcash",
      "maya",
      "bank",
    ],
    reply: () => ({
      text: `💳 **Payment Options:**\n\n• Cash\n• Credit & debit cards\n• Major HMO cards\n• Installment plans available for select procedures\n\nAsk our coordinators about financing options for implants, veneers, or orthodontics.`,
      quick: ["HMO & insurance", "Pricing", "Book appointment"],
    }),
  },
  {
    keys: ["promo", "code", "voucher", "discount", "special", "deal"],
    reply: () => ({
      text: `🎁 **Current Promotions:**\n\n${KB.promos.map((p) => `• **${p.name}** — ${p.discount}\n  Code: **${p.code}**\n  _(${p.desc})_`).join("\n\n")}\n\nMention your promo code when booking!`,
      quick: ["Book with promo", "All services", "Pricing"],
    }),
  },
  {
    keys: [
      "thank",
      "thanks",
      "great",
      "awesome",
      "perfect",
      "nice",
      "helpful",
      "appreciate",
    ],
    reply: () => ({
      text: `You're very welcome! 😊 Is there anything else I can help you with? Feel free to ask anytime or call us at **${KB.clinic.phone}**.`,
      quick: ["Book appointment", "More questions", "Goodbye"],
    }),
  },
  {
    keys: [
      "bye",
      "goodbye",
      "see you",
      "later",
      "done",
      "no thanks",
      "that's all",
      "nothing",
    ],
    reply: () => ({
      text: `Take care! 😊 See you at Samson Dental Center — **your smile is our first priority!** Don't hesitate to chat again anytime.`,
      quick: ["Start over"],
    }),
  },
];

function getResponse(input) {
  const lower = input.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.keys.some((k) => lower.includes(k))) return intent.reply();
  }
  return {
    text: `I didn't quite catch that. Here are some things I can help with:`,
    quick: [
      "Opening hours",
      "Our services",
      "Book appointment",
      "Location",
      "Contact us",
    ],
  };
}

/* ── State ── */
let isBusy = false;

/* ── Boot ── */
window.addEventListener("DOMContentLoaded", () => {
  addDivider("Today");
  appendBot(
    `Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI'm your virtual assistant — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?`,
    [
      "What are your hours?",
      "What services do you offer?",
      "How do I book?",
      "Do you accept walk-ins?",
    ],
  );
  setQuickReplies([
    "What insurance do you accept?",
    "Where are you located?",
    "Do you have promos?",
    "How much does whitening cost?",
  ]);
});

/* ── Chat toggle ── */
function toggleChat() {
  const fab = document.getElementById("chatFab");
  const win = document.getElementById("chatWindow");

  const isOpen = !win.classList.contains("win-closed");

  if (isOpen) {
    // CLOSE
    win.classList.add("win-closed");
    fab.classList.remove("hidden");
    fab.classList.remove("fab-open");
  } else {
    // OPEN
    win.classList.remove("win-closed");
    fab.classList.add("fab-open");

    // Hide FAB on mobile only
    if (window.innerWidth < 580) {
      fab.classList.add("hidden");
    }
  }
}

window.addEventListener("resize", () => {
  const fab = document.getElementById("chatFab");
  const win = document.getElementById("chatWindow");

  // If screen becomes large again → ensure FAB is visible
  if (window.innerWidth >= 580) {
    fab.classList.remove("hidden");
  }

  // If chat is open on mobile → keep FAB hidden
  if (window.innerWidth < 580 && !win.classList.contains("win-closed")) {
    fab.classList.add("hidden");
  }
});

/* ── Send ── */
function sendMessage(text) {
  const input = document.getElementById("chatInput");
  const msg = text ?? input.value.trim();
  if (!msg || isBusy) return;
  if (!text) {
    input.value = "";
    autoResize(input);
  }

  appendUser(msg);
  setQuickReplies([]);
  hideTopics();

  isBusy = true;
  showTyping();
  const delay = 500 + Math.min(msg.length * 10, 900);
  setTimeout(() => {
    removeTyping();
    isBusy = false;
    const resp = getResponse(msg);
    appendBot(resp.text, resp.quick || [], resp.action);
  }, delay);
}
function sendQuick(q) {
  sendMessage(q);
}

/* ── Append user bubble ── */
function appendUser(text) {
  const el = document.createElement("div");
  el.className = "msg-in flex justify-end";
  el.innerHTML = `<div class="max-w-[80%] bg-brand text-white font-body text-[0.85rem] leading-snug px-4 py-2.5 rounded-2xl rounded-br-md">${esc(text)}</div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollBot();
}

/* ── Append bot bubble ── */
function appendBot(text, quick = [], action = null) {
  const el = document.createElement("div");
  el.className = "msg-in flex items-start gap-2.5";

  let actionHtml = "";
  if (action) {
    actionHtml = `<div class="mt-3"><a href="${action.url}" class="inline-block bg-primary text-white font-body text-[0.78rem] font-medium px-4 py-2 rounded-full no-underline hover:opacity-85 transition-opacity">${action.label}</a></div>`;
  }

  el.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="max-w-[80%] bg-white border border-[#e5e7eb] font-body text-[0.85rem] leading-relaxed text-[#1a1a2e] px-4 py-2.5 rounded-2xl rounded-tl-md shadow-sm">
      ${fmt(text)}
      ${actionHtml}
    </div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollBot();
  if (quick.length) setQuickReplies(quick);
}

/* ── Typing indicator ── */
function showTyping() {
  const el = document.createElement("div");
  el.className = "msg-in flex items-start gap-2.5";
  el.id = "typingEl";
  el.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="bg-white border border-[#e5e7eb] px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex gap-1.5 items-center">
      <span class="typing-dot w-1.5 h-1.5 rounded-full bg-muted inline-block"></span>
      <span class="typing-dot w-1.5 h-1.5 rounded-full bg-muted inline-block"></span>
      <span class="typing-dot w-1.5 h-1.5 rounded-full bg-muted inline-block"></span>
    </div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollBot();
}
function removeTyping() {
  document.getElementById("typingEl")?.remove();
}

/* ── Quick replies ── */
function setQuickReplies(replies) {
  const wrap = document.getElementById("quickReplies");
  wrap.innerHTML = "";
  replies.forEach((r) => {
    const btn = document.createElement("button");
    btn.className =
      "font-body text-[0.75rem] font-medium px-3.5 py-1.5 rounded-full border-[1.5px] border-[#e5e7eb] bg-white text-[#1a1a2e] cursor-pointer whitespace-nowrap hover:border-primary hover:text-primary hover:bg-red-50 transition-all";
    btn.textContent = r;
    btn.onclick = () => sendMessage(r);
    wrap.appendChild(btn);
  });
}

/* ── Hide topic chips after first message ── */
function hideTopics() {
  document.getElementById("topicChips").style.display = "none";
}

/* ── Date divider ── */
function addDivider(label) {
  const el = document.createElement("div");
  el.className = "flex items-center gap-3 my-1";
  el.innerHTML = `<div class="flex-1 h-px bg-[#e5e7eb]"></div><span class="font-body text-[0.66rem] text-muted whitespace-nowrap">${label}</span><div class="flex-1 h-px bg-[#e5e7eb]"></div>`;
  document.getElementById("chatMessages").appendChild(el);
}

/* ── Utilities ── */
function scrollBot() {
  const el = document.getElementById("chatMessages");
  el.scrollTop = el.scrollHeight;
}
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 96) + "px";
}
function esc(t) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function fmt(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(
      /→ &lt;a href="(.*?)"(.*?)&gt;(.*?)&lt;\/a&gt;/g,
      '→ <a href="$1"$2>$3</a>',
    )
    .replace(
      /&lt;a href="(.*?)" target="(.*?)" style="(.*?)"&gt;(.*?)&lt;\/a&gt;/g,
      '<a href="$1" target="$2" style="$3">$4</a>',
    )
    .replace(/\n/g, "<br/>");
}
