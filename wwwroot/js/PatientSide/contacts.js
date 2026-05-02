document.addEventListener("DOMContentLoaded", () => {
  initContactsAnimations();
  initFormInteractions();
  renderDynamicContent();

  if (window.activeInquiryId && window.activeInquiryId !== "") {
    const contactForm = document.getElementById("contactForm");
    const successMsg = document.getElementById("successMsg");
    const chatContainer = document.getElementById("chatContainer");

    if (contactForm) contactForm.classList.add("hidden");
    if (successMsg) successMsg.classList.remove("hidden");
    if (chatContainer) chatContainer.classList.remove("hidden");

    fetchChatMessages();
    startChatPolling();
  }
});

function renderDynamicContent() {
  const data = window.clinicSettings;
  if (!data) return;

  // 1. Operating Hours Table
  const hoursList = document.getElementById("operatingHoursList");
  if (hoursList && data.hours && Array.isArray(data.hours)) {
    hoursList.innerHTML = data.hours
      .map(
        (h, i) => `
            <div class="flex justify-between items-center py-3 ${i < data.hours.length - 1 ? "border-b border-[#e5e7eb]" : ""} ${h.closed ? "opacity-50 grayscale" : ""}">
                <span class="font-body text-[0.87rem] text-muted">${h.day}</span>
                <span class="brand-font font-bold text-[0.87rem] ${h.closed ? "text-red-500 italic" : "text-brand"}">
                    ${h.closed ? "Closed" : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                </span>
            </div>
        `,
      )
      .join("");
  }

  // 2. Real-time Status
  updateClinicStatus();
  setInterval(updateClinicStatus, 60000); // Check every minute
}

function updateClinicStatus() {
  const data = window.clinicSettings;
  const display = document.getElementById("clinicStatusDisplay");
  if (!display || !data) return;

  let isOpen = false;
  let statusText = "Closed Now";
  let subText = "Opening soon";
  let colorClass = "text-red-500";
  let dotClass = "bg-red-500";

  const now = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDay = dayNames[now.getDay()];
  const currentTime = now.getHours() * 100 + now.getMinutes();

  // Check manual status first
  if (!data.status.isAutomated) {
    if (data.status.manual === "open") {
      isOpen = true;
      statusText = "Open Now";
      subText = "Manual override: Open";
      colorClass = "text-emerald-600";
      dotClass = "bg-emerald-500";
    } else {
      isOpen = false;
      statusText = "Closed Now";
      subText = "Manual override: Closed";
    }
  } else {
    // Automated check
    const todayHours = data.hours.find((h) => h.day === currentDay);
    if (todayHours && !todayHours.closed) {
      const openTime = parseInt(todayHours.open.replace(":", ""));
      const closeTime = parseInt(todayHours.close.replace(":", ""));
      const noonStart = todayHours.noonStart
        ? parseInt(todayHours.noonStart.replace(":", ""))
        : null;
      const noonEnd = todayHours.noonEnd
        ? parseInt(todayHours.noonEnd.replace(":", ""))
        : null;

      if (currentTime >= openTime && currentTime < closeTime) {
        // Check for noon break
        if (
          noonStart &&
          noonEnd &&
          currentTime >= noonStart &&
          currentTime < noonEnd
        ) {
          isOpen = false;
          statusText = "On Noon Break";
          subText = `Resumes at ${formatTime(todayHours.noonEnd)}`;
          colorClass = "text-orange-500";
          dotClass = "bg-orange-500";
        } else {
          isOpen = true;
          statusText = "Open Now";
          subText = `Closes at ${formatTime(todayHours.close)} today`;
          colorClass = "text-emerald-600";
          dotClass = "bg-emerald-500";
        }
      } else {
        isOpen = false;
        statusText = "Closed Now";
        subText =
          currentTime < openTime
            ? `Opens at ${formatTime(todayHours.open)}`
            : `Closed for today`;
      }
    }
  }

  display.innerHTML = `
        <div class="flex items-center gap-2 mb-0.5">
          <span class="dot-pulse w-2 h-2 rounded-full ${dotClass} inline-block"></span>
          <span class="brand-font font-bold text-[0.95rem] ${colorClass}">${statusText}</span>
        </div>
        <div class="font-body text-[0.78rem] text-muted">${subText}</div>
    `;
}

function formatTime(time) {
  if (!time) return "";
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

function initContactsAnimations() {
  gsap.fromTo(
    ".contact-reveal h1, .contact-reveal p",
    { autoAlpha: 0, y: 30 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 1.5,
      delay: 0.5,
      stagger: 0.2,
      ease: "power3.out",
    },
  );

  gsap.fromTo(
    ".mission-card",
    { autoAlpha: 0, y: 40, scale: 0.95 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 1.2,
      stagger: 0.1,
      ease: "back.out(1.7)",
      scrollTrigger: { trigger: ".mission-card", start: "top 90%", once: true },
    },
  );

  gsap.fromTo(
    "#contactSection .reveal-up",
    { autoAlpha: 0, y: 50 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power4.out",
      scrollTrigger: {
        trigger: "#contactSection",
        start: "top 80%",
        once: true,
      },
    },
  );

  // Deep stagger for contact info and form groups
  gsap.fromTo(
    ".contact-info-item, .form-group",
    { autoAlpha: 0, y: 15 },
    {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
            trigger: "#contactSection",
            start: "top 85%",
            once: true
        }
    }
  );
}

function initFormInteractions() {
  const inputs = document.querySelectorAll(".form-input");
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      gsap.to(input, {
        borderColor: "#1E40AF",
        backgroundColor: "#fff",
        duration: 0.3,
      });
    });
    input.addEventListener("blur", () => {
      if (!input.value) {
        gsap.to(input, {
          borderColor: "#e5e7eb",
          backgroundColor: "#f9fafb",
          duration: 0.3,
        });
      }
    });
  });
}

window.handleSubmit = async function (event) {
  event.preventDefault();
  const btn = document.getElementById("submitBtn");
  const successMsg = document.getElementById("successMsg");
  const contactForm = document.getElementById("contactForm");
  const chatContainer = document.getElementById("chatContainer");

  const patientId = document.getElementById("patientId").value;
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...`;

  try {
    const res = await fetch("/api/inquiry/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientId || null,
        subject: subject,
        message: message,
        guestEmail: email,
        guestFirstName: firstName,
        guestLastName: lastName,
        guestPhone: phone,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      window.activeInquiryId = data.inquiryId;
      gsap.to(contactForm, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        onComplete: () => {
          contactForm.classList.add("hidden");
          successMsg.classList.remove("hidden");
          chatContainer.classList.remove("hidden");
          gsap.fromTo(
            [successMsg, chatContainer],
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.2,
              ease: "back.out(1.7)",
            },
          );
          fetchChatMessages();
          startChatPolling();
        },
      });
    } else {
      alert(data.error || "Failed to send inquiry.");
      btn.disabled = false;
      btn.innerHTML = "Send Message";
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = "Send Message";
  }
};

window.fetchChatMessages = async function () {
  if (!window.activeInquiryId) return;
  try {
    const res = await fetch(`/api/inquiry/messages/${window.activeInquiryId}`);
    const data = await res.json();
    if (data.ok) {
      const container = document.getElementById("chatMessages");
      const wasAtBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 100;
      container.innerHTML = data.messages
        .map((msg) => {
          const isMe = !msg.is_from_staff;
          return `
                    <div class="flex ${isMe ? "justify-end" : "justify-start"}">
                        <div class="max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl text-[12px] ${isMe ? "bg-primary text-white rounded-tr-none" : "bg-white border border-slate-100 text-brand rounded-tl-none"}">
                            <p class="leading-relaxed font-medium whitespace-pre-wrap">${msg.message}</p>
                            <div class="text-[9px] mt-1.5 opacity-60 font-bold">${new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                    </div>
                `;
        })
        .join("");
      if (wasAtBottom) container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
};

window.sendFollowup = async function () {
  const input = document.getElementById("chatReply");
  const msg = input.value.trim();
  if (!msg || !window.activeInquiryId) return;
  input.disabled = true;
  try {
    const res = await fetch("/api/inquiry/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: window.activeInquiryId,
        message: msg,
        isFromStaff: false,
      }),
    });
    if (res.ok) {
      input.value = "";
      input.style.height = "auto";
      await fetchChatMessages();
      document.getElementById("chatMessages").scrollTop =
        document.getElementById("chatMessages").scrollHeight;
    }
  } finally {
    input.disabled = false;
    input.focus();
  }
};

function startChatPolling() {
  setInterval(fetchChatMessages, 5000);
}
