/* ── Knowledge Base (Initialized with defaults) ── */
let KB = {
  clinic: {
    name: "Samson Dental Center",
    address: "7 Himlayan Rd, Tandang Sora, Quezon City, Metro Manila",
    phone: "+63 2 8888 1234",
    email: "hello@samsondentalph",
    founded: "1964",
  },
  hours: {
    weekdays: "9:00 AM – 6:00 PM",
    saturday: "8:00 AM – 5:00 PM",
    sunday: "Closed (By Appointment Only)",
  },
  services: {
    general: [],
    cosmetic: [],
    specialized: [],
  },
  faqs: [],
  team: [],
  insurance: ["Maxicare", "Intellicare", "Medicard", "PhilHealth"],
  integrity: "",
  leadership: { ceo: "", admin: "" }
};

let chatbotName = "SDC Assistant";
let welcomeMessage = "Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI'm your virtual assistant — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?";
let chatSessionId = localStorage.getItem("chatbot_session_id") || crypto.randomUUID();
localStorage.setItem("chatbot_session_id", chatSessionId);

/* ── Dynamic Initialization ── */
async function initChatbot() {
  try {
    const res = await fetch('/api/public/init');
    if (!res.ok) throw new Error('Failed to fetch chatbot data');
    const data = await res.json();

    // Update KB with dynamic data
    if (data.settings) {
      KB.clinic.name = data.settings.name || KB.clinic.name;
      KB.clinic.address = data.settings.address || KB.clinic.address;
      KB.clinic.phone = data.settings.phone || KB.clinic.phone;
      KB.clinic.email = data.settings.email || KB.clinic.email;
      KB.faqs = data.settings.faqs || [];
      KB.integrity = data.settings.integrity || "";
      KB.leadership = data.settings.leadership || { ceo: "Dr. Marcus Rivera", admin: "Samson Admin" };
      
      if (data.settings.chatbot) {
        chatbotName = data.settings.chatbot.name || chatbotName;
        welcomeMessage = data.settings.chatbot.welcome || welcomeMessage;
      }

      if (data.settings.hours && Array.isArray(data.settings.hours)) {
        const weekdays = data.settings.hours.filter(h => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(h.day));
        const sat = data.settings.hours.find(h => h.day === "Saturday");
        const sun = data.settings.hours.find(h => h.day === "Sunday");

        if (weekdays.length > 0) {
            const first = weekdays[0];
            KB.hours.weekdays = first.closed ? "Closed" : `${formatTimeSimple(first.open)} – ${formatTimeSimple(first.close)}`;
        }
        if (sat) KB.hours.saturday = sat.closed ? "Closed" : `${formatTimeSimple(sat.open)} – ${formatTimeSimple(sat.close)}`;
        if (sun) KB.hours.sunday = sun.closed ? "Closed" : `${formatTimeSimple(sun.open)} – ${formatTimeSimple(sun.close)}`;
      }
    }

    if (data.services) {
      KB.services.all = data.services;
      KB.services.general = data.services.filter(s => s.category === "General Dentistry").map(s => `${s.name} (₱${s.price.toLocaleString()})`);
      KB.services.cosmetic = data.services.filter(s => s.category === "Cosmetic").map(s => `${s.name} (₱${s.price.toLocaleString()})`);
      KB.services.specialized = data.services.filter(s => s.category === "Specialized").map(s => `${s.name} (₱${s.price.toLocaleString()})`);
    }

    if (data.doctors) {
      KB.team = data.doctors.map(d => ({ name: d.name, role: d.specialties.join(", ") || "Dental Specialist" }));
    }

    // Update UI
    const nameEl = document.querySelector('.win-header .text-\\[13px\\]');
    if (nameEl) nameEl.textContent = chatbotName;
    
    // Load History
    const user = JSON.parse(localStorage.getItem("sb_user") || "{}");
    const historyRes = await fetch(`/api/public/chatbot/history?sessionId=${chatSessionId}${user.id ? `&userId=${user.id}` : ''}`);
    const history = await historyRes.json();

    document.getElementById('chatMessages').innerHTML = ''; 
    addDivider("Today");

    if (history.ok && history.data && history.data.length > 0) {
        history.data.forEach(msg => {
            if (msg.is_bot) {
                appendBot(msg.message, [], null, false);
            } else {
                appendUser(msg.message, false);
            }
        });
    } else {
        appendBot(welcomeMessage, [
            "What are your hours?",
            "What services do you offer?",
            "How do I book?",
            "Meet the team",
        ], null, false); // Don't save initial welcome message automatically
    }

  } catch (err) {
    console.error('[Chatbot] Init Error:', err);
    // Fallback to static if needed
    appendBot(welcomeMessage, ["How do I book?", "Contact us"]);
  }
}

async function saveMessage(text, isBot) {
    try {
        const user = JSON.parse(localStorage.getItem("sb_user") || "{}");
        await fetch('/api/public/chatbot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: chatSessionId,
                user_id: user.id || null,
                message: text,
                is_bot: isBot
            })
        });
    } catch (err) {
        console.error('[Chatbot] Save Error:', err);
    }
}

function formatTimeSimple(time) {
    if (!time) return "9:00 AM";
    if (time.includes('AM') || time.includes('PM')) return time; // Already formatted
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
}

/* ── Intent definitions ── */
const INTENTS = [
  // ── Greeting ──
  {
    keys: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "sup", "start"],
    reply: () => ({
      text: `Hi there! 👋 Welcome to **${KB.clinic.name}**.\n\nI'm ${chatbotName} — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?`,
      quick: ["What are your hours?", "What services do you offer?", "How do I book?", "Meet the team"],
    }),
  },

  // ── About / History ──
  {
    keys: ["history", "founded", "established", "story", "about us", "about the clinic", "since", "background", "how long have you"],
    reply: () => ({
      text: `🏛️ **Our History:**\n\n**${KB.clinic.name}** has been proudly serving patients since **${KB.clinic.founded}** — over 60 years of trusted dental care in Quezon City, Metro Manila.\n\nWhat began as a small family dental practice has grown into a full-service center offering general, cosmetic, and specialized dental treatments. We remain committed to the same values we started with: gentle care, honest pricing, and healthy smiles.`,
      quick: ["Meet the team", "Our services", "Location"],
    }),
  },

  // ── Leadership ──
  {
    keys: ["ceo", "admin", "leadership", "owner", "boss", "head of"],
    reply: () => ({
      text: `🏢 **Clinic Leadership:**\n\n• **CEO / Head Dentist:** ${KB.leadership.ceo}\n• **Administrator:** ${KB.leadership.admin}\n\nOur clinic is led by experienced professionals dedicated to delivering the highest standard of dental care.`,
      quick: ["Meet the team", "Contact us"],
    }),
  },

  // ── Security / Integrity ──
  {
    keys: ["integrity", "security", "safe", "encryption", "hipaa", "protection", "secure"],
    reply: () => ({
      text: `🛡️ **System Integrity & Security:**\n\n${KB.integrity || "We follow industry-standard security protocols to protect your medical records and personal data."}\n\nYour privacy is our priority. All patient data is encrypted, stored securely, and never shared without your consent.`,
      quick: ["Privacy policy", "Contact us"],
    }),
  },

  // ── Privacy Policy & Terms ──
  {
    keys: ["privacy policy", "terms of service", "terms and condition", "data policy", "your policy", "legal"],
    reply: () => ({
      text: `🔒 **Privacy & Terms:**\n\nWe take your personal and medical data seriously.\n\n• All records are encrypted and stored securely\n• We never sell or share your information with third parties\n• You may request access or deletion of your data at any time\n• Our systems comply with Philippine Data Privacy Act (RA 10173)\n\nFor the full documents, please contact us at **${KB.clinic.email}** or visit the clinic.`,
      quick: ["Security info", "Contact us", "Book appointment"],
    }),
  },

  // ── Opening Hours ──
  {
    keys: ["hour", "open", "schedule", "time", "operating", "when", "close", "weekend", "saturday", "sunday", "what time do you"],
    reply: () => ({
      text: `🕐 **Operating Hours (Philippine Standard Time):**\n\n• **Monday – Friday:** ${KB.hours.weekdays}\n• **Saturday:** ${KB.hours.saturday}\n• **Sunday:** ${KB.hours.sunday}\n\n💡 Tip: For Sunday visits, please call ahead to confirm your slot at **${KB.clinic.phone}**.`,
      quick: ["Book an appointment", "Walk-in patients?", "Contact us"],
    }),
  },

  // ── Availability Check ──
  {
    keys: ["available", "availability", "check date", "slot", "when can i", "free", "opening on", "what time", "when is"],
    reply: async (input) => {
      const date = extractDate(input);
      if (!date) {
        return {
          text: "To check availability, please specify a date (e.g., 'May 10' or 'next Tuesday').",
          quick: ["Available today", "Check tomorrow", "Opening hours"],
        };
      }
      showTyping();
      try {
        const res = await fetch(`/api/public/availability?date=${date}`);
        const data = await res.json();
        removeTyping();
        if (data.status === "blocked") {
          return {
            text: `I checked our schedule for **${formatFriendlyDate(date)}**. Unfortunately that date is unavailable due to a scheduled clinic event. Would you like to try another day?`,
            quick: ["Check another date", "Opening hours"],
          };
        }
        if (data.status === "closed") {
          return {
            text: `We're closed on **${data.day}s**. ${data.day === "Sunday" ? "Sunday visits are by appointment only — call us at **" + KB.clinic.phone + "** to arrange." : "Would you like to check a weekday instead?"}`,
            quick: ["Check Monday", "Opening hours", "Contact us"],
          };
        }
        const openTime = data.hours?.open ? formatTimeSimple(data.hours.open) : "9:00 AM";
        const closeTime = data.hours?.close ? formatTimeSimple(data.hours.close) : "6:00 PM";
        return {
          text: `✅ We have slots available on **${formatFriendlyDate(date)}**!\n\n• First slot: **${openTime}**\n• Last slot: **${closeTime}**\n\nWould you like to book one of these times?`,
          quick: [openTime, "1:30 PM", "4:00 PM", "Book online"],
        };
      } catch (err) {
        removeTyping();
        return { text: "I had trouble checking the schedule. Please try again or call us at **" + KB.clinic.phone + "**.", quick: ["Call us", "Opening hours"] };
      }
    },
  },

  // ── Walk-in ──
  {
    keys: ["walk in", "walk-in", "no appointment", "drop by", "just come", "without booking"],
    reply: () => ({
      text: `🚶 **Walk-in Patients:**\n\nWalk-ins are welcome during operating hours, subject to doctor availability. However, we **strongly recommend booking** in advance to secure your preferred time slot and avoid waiting.\n\n📞 Call **${KB.clinic.phone}** to check same-day availability.`,
      quick: ["Book appointment", "Opening hours", "Contact us"],
    }),
  },

  // ── First Visit ──
  {
    keys: ["first time", "new patient", "first visit", "never been", "first appointment"],
    reply: () => ({
      text: `👋 **Welcome, new patient!**\n\nHere's what to expect on your first visit:\n\n1. **Registration** — Bring a valid ID and any existing dental records\n2. **Initial Consultation** — Your dentist will review your dental history\n3. **Oral Examination** — Full checkup including X-rays if needed\n4. **Treatment Plan** — We'll discuss your options and pricing\n\n⏱️ Allow about **60–90 minutes** for your first visit. We recommend booking an early slot!`,
      quick: ["Book appointment", "What to bring", "Pricing", "Opening hours"],
    }),
  },

  // ── Cancellation / Reschedule ──
  {
    keys: ["cancel", "reschedule", "move appointment", "change booking", "postpone"],
    reply: () => ({
      text: `📋 **Cancellation & Rescheduling:**\n\nWe understand plans change! Please notify us at least **24 hours in advance** to cancel or reschedule.\n\n📞 **${KB.clinic.phone}**\n📧 **${KB.clinic.email}**\n\nLate cancellations (less than 24 hours) may affect future priority booking.`,
      quick: ["Book new appointment", "Contact us", "Opening hours"],
    }),
  },

  // ── Booking Limit ──
  {
    keys: ["how many", "book twice", "multiple appointment", "two appointment", "book more", "book again", "book limit"],
    reply: () => ({
      text: `📋 **Booking Policy:**\n\nYou may book **one appointment per day** per doctor. If you need multiple services, we can schedule them within a single extended visit depending on availability.\n\nNeed help planning your visit? Call us at **${KB.clinic.phone}** and our team will assist.`,
      quick: ["Book appointment", "Check availability", "Contact us"],
    }),
  },

  // ── Services (all + specific lookup) ──
  {
    keys: ["service", "treat", "procedure", "offer", "available", "what can you do", "list", "do you do"],
    reply: (input) => {
      const lower = input?.toLowerCase() || "";
      if (KB.services.all) {
        const aliases = {
          "filling": "filling", "cavity": "filling", "restoration": "filling",
          "whitening": "whitening", "bleaching": "whitening", "bright": "whitening",
          "braces": "braces", "orthodon": "braces", "aligner": "braces", "retainer": "braces",
          "implant": "implant", "missing tooth": "implant",
          "root canal": "root canal", "pulp": "root canal", "nerve": "root canal",
          "extraction": "extraction", "pull tooth": "extraction", "remove tooth": "extraction",
          "cleaning": "cleaning", "prophylaxis": "cleaning", "scale": "cleaning",
          "veneer": "veneer", "porcelain": "veneer", "laminate": "veneer",
        };
        const aliasKey = Object.keys(aliases).find(k => lower.includes(k));
        const searchTerm = aliasKey ? aliases[aliasKey] : null;
        const matched = KB.services.all.find(s =>
          lower.includes(s.name.toLowerCase()) ||
          (searchTerm && s.name.toLowerCase().includes(searchTerm))
        );
        if (matched) {
          let res = `🦷 **${matched.name}**\n\n📁 Category: ${matched.category}\n\n`;
          if (matched.benefits?.length) res += `✨ **Benefits:**\n${matched.benefits.map(b => `• ${b}`).join("\n")}\n\n`;
          if (matched.steps?.length) res += `📝 **Procedure Steps:**\n${matched.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n`;
          res += `💰 **Price:** Starts at ₱${matched.price.toLocaleString()}\n⏱️ **Duration:** ~${matched.duration} mins`;
          return { text: res, quick: ["Other services", "Book appointment", "Pricing"] };
        }
      }
      return {
        text: `🦷 **Our Services:**\n\n**General Dentistry**\n${KB.services.general.map(s => "• " + s).join("\n") || "• Checkup & Consultation\n• Teeth Cleaning\n• Dental Fillings\n• Tooth Extraction"}\n\n**Cosmetic**\n${KB.services.cosmetic.map(s => "• " + s).join("\n") || "• Teeth Whitening\n• Veneers\n• Smile Makeover"}\n\n**Specialized**\n${KB.services.specialized.map(s => "• " + s).join("\n") || "• Dental Implants\n• Root Canal\n• Orthodontics / Braces"}\n\nAsk me about any specific procedure for full details!`,
        quick: ["Dental fillings", "Root canal", "Teeth whitening", "Pricing"],
      };
    },
  },

  // ── General Dentistry Process ──
  {
    keys: ["general dentistry", "checkup process", "routine checkup", "dental checkup", "what happens during", "what to expect", "oral exam", "examination process"],
    reply: () => ({
      text: `🦷 **General Dentistry — What to Expect:**\n\n**1. Check-in & Medical History Review**\nWe review your health history and any concerns you have.\n\n**2. Oral Examination**\nYour dentist examines teeth, gums, tongue, and jaw for signs of issues.\n\n**3. X-Rays (if needed)**\nDigital X-rays help detect cavities, bone loss, or hidden problems.\n\n**4. Professional Cleaning**\nRemoval of plaque and tartar buildup followed by polishing.\n\n**5. Diagnosis & Treatment Plan**\nYour dentist explains findings and recommends next steps.\n\n**6. Preventive Advice**\nPersonalized tips on brushing, flossing, and diet.\n\n⏱️ A standard checkup takes about **45–60 minutes**.`,
      quick: ["Book a checkup", "Pricing", "What to bring", "Services"],
    }),
  },

  // ── Dental Fillings ──
  {
    keys: ["filling", "cavity", "tooth decay", "decayed tooth", "cavities"],
    reply: () => ({
      text: `🦷 **Dental Fillings — Procedure:**\n\n**1. Examination & X-ray**\nWe identify the extent of decay using digital imaging.\n\n**2. Anesthesia**\nLocal anesthesia is applied so you feel no pain.\n\n**3. Decay Removal**\nThe decayed portion of the tooth is carefully removed.\n\n**4. Tooth Preparation**\nThe cavity is cleaned and shaped to hold the filling.\n\n**5. Filling Placement**\nWe use tooth-colored composite resin for a natural look.\n\n**6. Bite Check & Polish**\nWe ensure your bite is perfect and polish the filling.\n\n⏱️ Duration: **30–60 minutes** per tooth\n💰 Price: Check our general dentistry rates or ask at the front desk.`,
      quick: ["Pricing", "Book appointment", "Other procedures"],
    }),
  },

  // ── Teeth Cleaning ──
  {
    keys: ["cleaning", "prophylaxis", "scale", "polish", "tartar", "plaque removal"],
    reply: () => ({
      text: `🦷 **Teeth Cleaning (Prophylaxis) — Procedure:**\n\n**1. Initial Assessment**\nYour dentist checks gum health and plaque levels.\n\n**2. Scaling**\nUltrasonic tools remove hardened tartar above and below the gumline.\n\n**3. Polishing**\nA gritty paste removes surface stains and smooths enamel.\n\n**4. Flossing**\nProfessional flossing clears debris between teeth.\n\n**5. Fluoride Treatment (optional)**\nA fluoride gel strengthens enamel and prevents cavities.\n\n⏱️ Duration: **30–45 minutes**\n📅 Recommended: Every **6 months**`,
      quick: ["Pricing", "Book cleaning", "General services"],
    }),
  },

  // ── Tooth Extraction ──
  {
    keys: ["extraction", "pull tooth", "remove tooth", "tooth pulled", "cabutan"],
    reply: () => ({
      text: `🦷 **Tooth Extraction — Procedure:**\n\n**1. Examination & X-ray**\nWe assess the tooth position and root structure.\n\n**2. Anesthesia**\nLocal anesthesia ensures a pain-free experience.\n\n**3. Loosening the Tooth**\nYour dentist gently widens the socket using specialized tools.\n\n**4. Extraction**\nThe tooth is carefully removed.\n\n**5. Aftercare Instructions**\nWe provide gauze and detailed post-extraction care tips.\n\n⏱️ Duration: **20–40 minutes**\n\n⚠️ Avoid hard foods, smoking, and using straws for 24 hours after.`,
      quick: ["Pricing", "Book appointment", "Dental implants", "Other services"],
    }),
  },

  // ── Root Canal ──
  {
    keys: ["root canal", "pulp", "nerve treatment", "infected tooth", "endodont"],
    reply: () => ({
      text: `🦷 **Root Canal Treatment — Procedure:**\n\n**1. Diagnosis**\nX-rays confirm infection or nerve damage.\n\n**2. Anesthesia**\nLocal anesthesia — most patients feel little to no pain.\n\n**3. Pulp Removal**\nThe infected pulp (nerve) is carefully removed.\n\n**4. Canal Cleaning & Shaping**\nThe root canals are cleaned, shaped, and disinfected.\n\n**5. Filling the Canal**\nCanals are sealed with a biocompatible material (gutta-percha).\n\n**6. Crown Placement**\nA crown is placed over the tooth to restore strength.\n\n⏱️ Duration: **60–90 minutes** (may require 2 visits)\n\n💡 Root canals save teeth — early treatment avoids extraction.`,
      quick: ["Pricing", "Book appointment", "Dental crowns", "Services"],
    }),
  },

  // ── Teeth Whitening ──
  {
    keys: ["whitening", "bleaching", "bright teeth", "whiter teeth", "stain removal", "pampaputi"],
    reply: () => ({
      text: `✨ **Teeth Whitening — Procedure:**\n\n**1. Shade Assessment**\nWe record your current tooth shade as a baseline.\n\n**2. Gum Protection**\nA protective gel shields your gums before treatment.\n\n**3. Whitening Gel Application**\nProfessional-grade whitening gel is applied to teeth.\n\n**4. Activation**\nA special light activates the gel for deeper whitening.\n\n**5. Rinse & Reveal**\nGel is removed and your new shade is compared!\n\n⏱️ Duration: **45–60 minutes**\n💡 Results can last **6–12 months** with proper care.\n\n⚠️ Avoid coffee, tea, and colored drinks for 48 hours after.`,
      quick: ["Pricing", "Book whitening", "Veneers", "Cosmetic services"],
    }),
  },

  // ── Braces / Orthodontics ──
  {
    keys: ["braces", "orthodon", "aligner", "retainer", "crooked teeth", "malocclusion", "teeth alignment"],
    reply: () => ({
      text: `😁 **Orthodontic Treatment (Braces) — Overview:**\n\n**Types we offer:**\n• Metal braces — most affordable, highly effective\n• Ceramic braces — tooth-colored, less visible\n• Clear aligners — removable, nearly invisible\n\n**General Process:**\n1. Consultation & X-rays / photos\n2. Custom treatment plan\n3. Braces / aligner fitting\n4. Monthly adjustments\n5. Retainer phase after completion\n\n⏱️ Treatment duration: **12–24 months** on average\n\n📅 Regular check-ins every **4–6 weeks** are required.`,
      quick: ["Pricing", "Book consultation", "Clear aligners", "Services"],
    }),
  },

  // ── Dental Implants ──
  {
    keys: ["implant", "missing tooth", "replace tooth", "artificial tooth", "tanim ngipin"],
    reply: () => ({
      text: `🦷 **Dental Implants — Procedure:**\n\n**1. Consultation & Bone Assessment**\nX-rays and 3D scans determine if you're a candidate.\n\n**2. Implant Placement (Surgery)**\nA titanium post is placed into the jawbone under local anesthesia.\n\n**3. Healing Period (Osseointegration)**\nThe implant fuses with bone over **3–6 months**.\n\n**4. Abutment Placement**\nA connector piece is attached once healing is complete.\n\n**5. Crown Attachment**\nA custom crown is placed — looks and feels like a real tooth!\n\n⏱️ Total process: **3–9 months** depending on healing\n💡 Implants can last **20+ years** with proper care.`,
      quick: ["Pricing", "Book consultation", "Tooth extraction", "Services"],
    }),
  },

  // ── Veneers ──
  {
    keys: ["veneer", "porcelain veneer", "laminate", "chipped tooth", "gap tooth", "cosmetic shell"],
    reply: () => ({
      text: `✨ **Dental Veneers — Procedure:**\n\n**1. Consultation**\nWe assess your smile goals and tooth condition.\n\n**2. Tooth Preparation**\nA thin layer of enamel is removed to make space for the veneer.\n\n**3. Impression / Digital Scan**\nA mold is sent to the dental lab to craft your custom veneer.\n\n**4. Temporary Veneer**\nTemporary shells protect teeth while your veneers are made.\n\n**5. Bonding**\nVeneers are permanently bonded to your teeth and polished.\n\n⏱️ Duration: **2 visits over 1–2 weeks**\n💡 Veneers can fix chips, gaps, stains, and uneven teeth.`,
      quick: ["Pricing", "Book consultation", "Whitening", "Cosmetic services"],
    }),
  },

  // ── Pricing ──
  {
    keys: ["price", "cost", "fee", "how much", "rate", "promo", "discount", "offer", "deal", "package", "afford", "magkano", "presyo"],
    reply: () => ({
      text: `💰 **Pricing Guide:**\n\n**General Dentistry**\n${KB.services.general.slice(0, 4).map(s => "• " + s).join("\n") || "• Consultation — ₱300–₱500\n• Cleaning — ₱800–₱1,500\n• Filling — ₱1,000–₱2,500\n• Extraction — ₱500–₱2,000"}\n\n**Cosmetic**\n${KB.services.cosmetic.slice(0, 3).map(s => "• " + s).join("\n") || "• Whitening — ₱3,000–₱8,000\n• Veneers — ₱8,000–₱15,000 per tooth"}\n\n**Specialized**\n${KB.services.specialized.slice(0, 3).map(s => "• " + s).join("\n") || "• Root Canal — ₱5,000–₱12,000\n• Implants — ₱50,000–₱80,000\n• Braces — ₱35,000–₱80,000"}\n\n💡 Prices vary by complexity. Book a consultation for an exact quote!`,
      quick: ["Book consultation", "Insurance coverage", "Payment methods", "All services"],
    }),
  },

  // ── Payment Methods ──
  {
    keys: ["payment", "pay", "gcash", "maya", "credit card", "debit", "cash", "installment", "how to pay"],
    reply: () => ({
      text: `💳 **Accepted Payment Methods:**\n\n• 💵 Cash\n• 💳 Credit & Debit Cards (Visa, Mastercard)\n• 📱 GCash\n• 📱 Maya (PayMaya)\n• 🏥 HMO / Insurance (Maxicare, Intellicare, Medicard, PhilHealth)\n\n💡 Installment plans may be available for major procedures. Ask our front desk for details.\n\n📞 **${KB.clinic.phone}**`,
      quick: ["Insurance coverage", "Pricing", "Book appointment"],
    }),
  },

  // ── Insurance / HMO ──
  {
    keys: ["insurance", "hmo", "medicard", "maxicare", "intellicare", "philhealth", "coverage", "plan"],
    reply: () => ({
      text: `🏥 **Accepted HMO & Insurance:**\n\n${KB.insurance.map(i => "• " + i).join("\n")}\n\n**How it works:**\n1. Bring your HMO card on your visit\n2. Our front desk verifies your coverage\n3. Covered services are billed directly to your HMO\n\n⚠️ Not all procedures may be covered. Call us to confirm before your visit.\n📞 **${KB.clinic.phone}**`,
      quick: ["Payment methods", "Book appointment", "Contact us"],
    }),
  },

  // ── Location ──
  {
    keys: ["location", "address", "where", "find", "direction", "map", "how to get", "near", "saan"],
    reply: () => ({
      text: `📍 **Find Us:**\n\n**${KB.clinic.address}**\n\n🚗 Ample on-site parking is available.\n🚌 Accessible via public transport along Tandang Sora Ave.\n\n→ <a href="https://maps.google.com/?q=${encodeURIComponent(KB.clinic.address)}" target="_blank" style="color:#c0392b">Open in Google Maps</a>`,
      quick: ["Parking info", "Contact number", "Book appointment"],
    }),
  },

  // ── Parking ──
  {
    keys: ["parking", "park", "car", "vehicle", "motor", "garage"],
    reply: () => ({
      text: `🚗 **Parking:**\n\nYes! We have **free on-site parking** available for patients at **${KB.clinic.name}**.\n\nFor motorcycles and bicycles, there is also a designated area near the entrance.\n\n📍 **${KB.clinic.address}**`,
      quick: ["Get directions", "Book appointment", "Opening hours"],
    }),
  },

  // ── Contact ──
  {
    keys: ["contact", "phone", "call", "email", "reach", "number", "makipag-ugnayan"],
    reply: () => ({
      text: `📞 **Contact Us:**\n\n• **Phone:** ${KB.clinic.phone}\n• **Email:** ${KB.clinic.email}\n• **Address:** ${KB.clinic.address}\n\n🕐 Available **Monday – Saturday** during clinic hours.\n\nFor urgent dental concerns outside clinic hours, please leave a message and we'll get back to you the next business day.`,
      quick: ["Opening hours", "Book appointment", "Location"],
    }),
  },

  // ── Book Appointment ──
  {
    keys: ["book", "appointment", "reserve", "slot", "visit", "consult", "schedule a", "mag-book"],
    reply: () => ({
      text: `📅 **Book an Appointment:**\n\nChoose the option that works best for you:\n\n📞 **Call us:** ${KB.clinic.phone}\n📧 **Email us:** ${KB.clinic.email}\n🌐 **Book online:** Use our patient portal below\n\n💡 We recommend booking at least **1–2 days in advance** to secure your preferred slot.`,
      quick: ["Check availability", "Opening hours", "Location"],
      action: { label: "📅 Book Online", url: "/Appointments" },
    }),
  },

  // ── Team / Doctors ──
  {
    keys: ["team", "doctor", "dentist", "specialist", "who are", "dr ", "physician", "sino"],
    reply: (input) => {
      const lower = input?.toLowerCase() || "";
      if (KB.team.length > 0) {
        const specialtyKeywords = ["orthodon", "implant", "surgery", "pediatric", "cosmetic",
          "endodont", "periodon", "prostho", "oral", "whitening", "general"];
        const askedSpecialty = specialtyKeywords.find(k => lower.includes(k));
        if (askedSpecialty) {
          const filtered = KB.team.filter(d => d.role.toLowerCase().includes(askedSpecialty));
          if (filtered.length > 0) {
            return {
              text: `👨‍⚕️ **Specialists — ${askedSpecialty.charAt(0).toUpperCase() + askedSpecialty.slice(1)}:**\n\n${filtered.map(d => `• **${d.name}** — ${d.role}`).join("\n")}\n\nWould you like to book with one of them?`,
              quick: ["Book appointment", "All doctors", "Our services"],
            };
          }
        }
      }
      return {
        text: `👨‍⚕️ **Our Dental Team:**\n\n${KB.team.map(d => `• **${d.name}** — ${d.role}`).join("\n") || "• Dr. Marcus Rivera — General & Cosmetic Dentistry\n• Dr. Leila Santos — Orthodontics & Implants"}\n\nAll our doctors are PRC-licensed and committed to gentle, patient-first care.`,
        quick: ["Book with a doctor", "Our services", "About us"],
      };
    },
  },

  // ── Reviews / Rating ──
  {
    keys: ["rating", "review", "feedback", "testimonial", "stars", "score", "reputation", "maganda ba"],
    reply: () => ({
      text: `⭐ **Patient Reviews:**\n\nWe're proud to be highly rated by our patients across Quezon City!\n\nYou can read verified patient reviews on:\n\n→ <a href="https://maps.google.com/?q=${encodeURIComponent(KB.clinic.address)}" target="_blank" style="color:#c0392b">Google Maps Reviews</a>\n\nHave feedback from a recent visit? We'd love to hear from you at **${KB.clinic.email}**. Your experience helps us improve! 😊`,
      quick: ["Book appointment", "Contact us", "Our services"],
    }),
  },

  // ── FAQ ──
  {
    keys: ["faq", "question", "ask", "common question", "frequently"],
    reply: () => {
      if (!KB.faqs || KB.faqs.length === 0) return { text: "I'm here to help! What would you like to know about our clinic?", quick: ["Services", "Pricing", "Location"] };
      return {
        text: `💡 **Frequently Asked Questions:**\n\n${KB.faqs.slice(0, 5).map(f => `• **${f.question}**\n  ${f.answer}`).join("\n\n")}`,
        quick: ["More questions", "Book appointment", "Contact us"],
      };
    },
  },

  // ── Non-dental health deflection ──
  {
    keys: ["fever", "stomach", "headache", "sick", "medical advice", "general health"],
    reply: (input) => {
      const lower = input?.toLowerCase() || "";
      if (lower.includes("tooth") || lower.includes("gum") || lower.includes("mouth") || lower.includes("jaw")) return null;
      return {
        text: "I'm a specialized **dental assistant**. For non-dental health concerns, please consult a general physician or visit your nearest clinic. I can help with anything related to dental care though! 😊",
        quick: ["Dental services", "Book checkup", "Contact us"],
      };
    },
  },

  // ── Time selection (after availability) ──
  {
    keys: ["am", "pm", ":00", ":30", "o'clock"],
    reply: (input) => ({
      text: `✅ Great choice! **${input.toUpperCase()}** works well. To finalize your booking, please use our online portal or give us a call.\n\n📞 **${KB.clinic.phone}**`,
      quick: ["Book online", "Call us", "Check another time"],
      action: { label: "📅 Book Online", url: "/Appointments" },
    }),
  },

  // ── Thank you ──
  {
    keys: ["thank", "thanks", "great", "awesome", "perfect", "nice", "helpful", "appreciate", "salamat"],
    reply: () => ({
      text: `You're very welcome! 😊 It's our pleasure to help. Is there anything else I can assist you with?\n\nFeel free to ask anytime or reach us directly at **${KB.clinic.phone}**.`,
      quick: ["Book appointment", "Opening hours", "Goodbye"],
    }),
  },

  // ── Goodbye ──
  {
    keys: ["bye", "goodbye", "see you", "later", "done", "no thanks", "that's all", "nothing else", "paalam"],
    reply: () => ({
      text: `Take care! 😊 See you at **${KB.clinic.name}** — **your smile is our priority!**\n\nDon't hesitate to chat again anytime. Have a wonderful day! 🦷`,
      quick: ["Start over"],
    }),
  },
];

async function getResponse(input) {
  const lower = input.toLowerCase();
  
  // Check FAQs first for specific matches
  if (KB.faqs) {
    const faqMatch = KB.faqs.find(f => lower.includes(f.question.toLowerCase()));
    if (faqMatch) return { text: faqMatch.answer, quick: ["More questions", "Book appointment"] };
  }

  for (const intent of INTENTS) {
    if (intent.keys.some((k) => lower.includes(k))) return await intent.reply(lower);
  }
  return {
    text: `I didn't quite catch that. I can help with hours, services, doctors, and general questions. What would you like to know?`,
    quick: ["Opening hours", "Our services", "Book appointment", "FAQ"],
  };
}

/* ── State ── */
let isBusy = false;

/* ── Boot ── */
window.addEventListener("DOMContentLoaded", () => {
  initChatbot();
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

  appendUser(msg, true);
  setQuickReplies([]);
  hideTopics();

  isBusy = true;
  showTyping();
  const delay = 500 + Math.min(msg.length * 10, 900);
  setTimeout(async () => {
    removeTyping();
    isBusy = false;
    const resp = await getResponse(msg);
    appendBot(resp.text, resp.quick || [], resp.action, true);
  }, delay);
}
function sendQuick(q) {
  sendMessage(q);
}

/* ── Append user bubble ── */
function appendUser(text, shouldSave = true) {
  const el = document.createElement("div");
  el.className = "msg-in flex justify-end";
  el.innerHTML = `<div class="max-w-[80%] bg-brand text-white font-body text-[0.85rem] leading-snug px-4 py-2.5 rounded-2xl rounded-br-md">${esc(text)}</div>`;
  document.getElementById("chatMessages").appendChild(el);
  scrollBot();
  if (shouldSave) saveMessage(text, false);
}

/* ── Append bot bubble ── */
function appendBot(text, quick = [], action = null, shouldSave = true) {
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
  if (shouldSave) saveMessage(text, true);
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
      "font-body text-[0.75rem] font-medium px-3.5 py-1.5 rounded-full border-[1.5px] border-[#e5e7eb] bg-white text-[#1a1a2e] cursor-pointer whitespace-nowrap hover:border-primary hover:text-primary hover:bg-blue-50 transition-all";
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
function formatTimeSimple(timeStr) {
    if (!timeStr) return "";
    try {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        return `${hours}:${minutes} ${modifier}`;
    } catch { return timeStr; }
}

/* ── Date Helpers for SLM ── */
function extractDate(input) {
    const lower = input.toLowerCase();
    const today = new Date();
    // Set base year to 2026 as per SLM rules
    today.setFullYear(2026);

    // 1. Check for specific months
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    for (let i = 0; i < months.length; i++) {
        if (lower.includes(months[i])) {
            const match = lower.match(new RegExp(`${months[i]}\\s*(\\d+)`));
            if (match) {
                const day = parseInt(match[1]);
                const date = new Date(2026, i, day);
                return date.toISOString().split('T')[0];
            }
        }
    }

    // 2. Relative dates
    if (lower.includes("today")) return today.toISOString().split('T')[0];
    if (lower.includes("tomorrow")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    // 3. Days of week
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
        if (lower.includes(days[i])) {
            const targetDay = i;
            const date = new Date(today);
            const currentDay = today.getDay();
            let diff = targetDay - currentDay;
            if (diff <= 0) diff += 7; // Next week
            date.setDate(today.getDate() + diff);
            return date.toISOString().split('T')[0];
        }
    }

    return null;
}

function formatFriendlyDate(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
   return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}
