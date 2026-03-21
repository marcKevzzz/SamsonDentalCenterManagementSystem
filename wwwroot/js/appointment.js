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

const SERVICES = [];

fetch("/api/services")
  .then((res) => res.json())
  .then((data) => SERVICES.push(...data));

const CATEGORIES = ["General Dentistry", "Cosmetic", "Specialized"];
const ALL_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];
// Simulated booked slots — replace with API call in ASP.NET
const BOOKED = {
  [offsetDate(1)]: ["9:00 AM", "10:00 AM", "2:00 PM"],
  [offsetDate(2)]: ALL_SLOTS.slice(), // fully booked
  [offsetDate(5)]: ["11:00 AM", "3:00 PM"],
};

/* ══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
const STATE = {
  step: 1,
  service: null,
  date: null,
  time: null,
  isWaitlist: false,
  details: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    patientType: "New Patient",
    notes: "",
  },
  ref: "",
};

/* ══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
function offsetDate(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function isFullyBooked(dateStr) {
  const b = BOOKED[dateStr] || [];
  return ALL_SLOTS.every((s) => b.includes(s));
}
function formatDate(
  dateStr,
  opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" },
) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", opts);
}
function genRef() {
  return "SDC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
const STEP_META = [
  { id: 1, label: "Service" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Your Details" },
  { id: 4, label: "Confirm" },
];

function showPanel(id, dir = "forward") {
  document.querySelectorAll(".step-panel").forEach((p) => {
    p.classList.remove("active", "back-active");
  });
  const el = document.getElementById(`step-${id}`);
  if (!el) return;
  el.classList.add(dir === "forward" ? "active" : "back-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToStep(id) {
  STATE.step = id;
  showPanel(id, "forward");
  updateChrome();
  if (id === 2) renderSchedule();
  if (id === "2b") renderWaitlist();
  if (id === 3) renderDetails();
  if (id === 4) renderReview();
}

function goBack() {
  const cur = STATE.step;
  let prev;
  if (cur === "2b") prev = 2;
  else if (cur === 2) prev = 1;
  else if (cur === 3) prev = STATE.isWaitlist ? "2b" : 2;
  else if (cur === 4) prev = 3;
  else return;
  STATE.step = prev;
  showPanel(prev, "back");
  updateChrome();
  if (prev === 2) renderSchedule();
  if (prev === "2b") renderWaitlist();
  if (prev === 3) renderDetails();
}

function cancelBooking() {
  if (confirm("Cancel booking? Your progress will be lost.")) {
    window.location.href = "../";
  }
}

function resetBooking() {
  STATE.step = 1;
  STATE.service = null;
  STATE.date = null;
  STATE.time = null;
  STATE.isWaitlist = false;
  STATE.details = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    patientType: "New Patient",
    notes: "",
  };
  showPanel(1, "back");
  updateChrome();
  document.getElementById("progressWrap").style.display = "";
}
function updateChrome() {
  const cur = STATE.step;
  const isSuccess = cur === 5;

  // Hide progress on success
  document.getElementById("progressWrap").style.display = isSuccess
    ? "none"
    : "";

  // Back button
  const backBtn = document.getElementById("backBtn");
  const show = cur !== 1 && cur !== 5;
  backBtn.style.display = show ? "flex" : "none";

  const dispStep = cur === "2b" ? 2 : cur === 5 ? 4 : Number(cur);
  document.getElementById("stepIndicators").innerHTML = STEP_META.map(
    (s, i) => {
      const done = s.id < dispStep;
      const active = s.id === dispStep;
      const last = i === STEP_META.length - 1;
      return `<div class="flex items-center ${last ? "" : "flex-1"}">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[.68rem] font-bold brand-font
          ${done ? "bg-primary text-white" : active ? "bg-brand text-white" : "bg-[#e5e7eb] text-muted"}">
          ${done ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : s.id}
        </div>
        <span class="hidden sm:block font-body text-[.72rem] font-medium ${active ? "text-brand" : done ? "text-primary" : "text-muted"}">${s.label}</span>
      </div>
      ${!last ? `<div class="flex-1 h-px mx-3 ${done ? "bg-primary" : "bg-[#e5e7eb]"}"></div>` : ""}
    </div>`;
    },
  ).join("");
}

let _activeCat = CATEGORIES[0];

function renderStep1() {
  const tabs = document.getElementById("catTabs");
  tabs.innerHTML = CATEGORIES.map(
    (cat) => `
    <button onclick="filterCat('${cat}')"
      class="cat-tab font-body text-[.75rem] font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer
        ${cat === _activeCat ? "bg-brand text-white border-brand" : "bg-white text-muted border-[#e5e7eb] hover:border-brand hover:text-brand"}">
      ${cat}
    </button>`,
  ).join("");
  renderServiceList();
}

function filterCat(cat) {
  _activeCat = cat;
  renderStep1();
}

function renderServiceList() {
  const items = SERVICES.filter((s) => s.category === _activeCat);
  document.getElementById("svcList").innerHTML = items
    .map((s) => {
      const sel = STATE.service?.slug === s.slug;
      return `<div onclick="selectService('${s.slug}')"
      class="svc-card ${sel ? "selected" : ""}">
      <div class="flex items-start gap-4">
        <div class="svc-radio mt-0.5"><div class="svc-radio-dot"></div></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 class="brand-font font-bold text-[1rem] text-brand">${s.name}</h3>
              <p class="font-body text-[.8rem] text-muted mt-0.5">${s.tagline}</p>
            </div>
            <span class="font-body text-[.78rem] font-semibold text-primary whitespace-nowrap">${s.price}</span>
          </div>
          <div class="flex items-center gap-4 mt-3">
            <span class="flex items-center gap-1 font-body text-[.72rem] text-muted">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${s.duration}
            </span>
            <span class="flex items-center gap-1 font-body text-[.72rem] text-muted">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>${s.recovery}
            </span>
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("");

  // Detail panel
  const detailEl = document.getElementById("svcDetail");
  if (STATE.service) {
    detailEl.classList.remove("hidden");
    detailEl.innerHTML = `
      <div class="bg-brand rounded-2xl p-6 text-white">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <div class="font-body text-[.62rem] font-semibold tracking-[.13em] uppercase text-white/40 mb-1">${STATE.service.category}</div>
            <h3 class="brand-font font-bold text-[1.1rem]">${STATE.service.name}</h3>
          </div>
          <span class="font-body text-[.78rem] font-semibold text-primary bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">${STATE.service.price}</span>
        </div>
        <p class="font-body text-[.85rem] text-white/60 leading-relaxed mb-5">${STATE.service.summary}</p>
        <div class="grid grid-cols-2 gap-3">
          ${STATE.service.benefits
            .slice(0, 4)
            .map(
              (b) => `
            <div class="flex items-start gap-2 font-body text-[.78rem] text-white/70">
              <span class="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>${b}
            </div>`,
            )
            .join("")}
        </div>
      </div>`;
  } else {
    detailEl.classList.add("hidden");
  }
}

function selectService(slug) {
  STATE.service = SERVICES.find((s) => s.slug === slug);
  document.getElementById("step1Btn").disabled = false;
  renderServiceList();
}

/* ══════════════════════════════════════════════
   STEP 2 — CALENDAR + TIME SLOTS
═══════════════════════════════════════════════ */
const CAL = { year: new Date().getFullYear(), month: new Date().getMonth() };
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function renderSchedule() {
  document.getElementById("s2ServiceName").textContent =
    STATE.service?.name || "";
  renderCalendar();
  if (STATE.date) renderTimeSlots(STATE.date);
  updateSlotSummary();
}

function renderCalendar() {
  const today = new Date();
  const y = CAL.year,
    m = CAL.month;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMon = new Date(y, m + 1, 0).getDate();
  const prevM = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
  const nextM = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };

  let cells = Array(firstDay).fill("<div></div>").join("");
  for (let d = 1; d <= daysInMon; d++) {
    const dt = new Date(y, m, d);
    const dstr = dt.toISOString().split("T")[0];
    const isPast =
      dt < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSun = dt.getDay() === 0;
    const isToday = dt.toDateString() === today.toDateString();
    const isSel = STATE.date === dstr;
    const isFull = isFullyBooked(dstr);
    const disabled = isPast || isSun;

    let cls = "cal-day ";
    if (disabled) cls += "disabled";
    else if (isSel) cls += "selected";
    else if (isToday) cls += "today";
    else if (isFull) cls += "fullbooked";

    cells += `<button type="button" class="${cls}" ${disabled ? "disabled" : `onclick="pickDate('${dstr}')"`} title="${isFull && !disabled ? "Fully booked" : ""}">${d}</button>`;
  }

  document.getElementById("calWidget").innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button onclick="shiftCal(-1)" type="button" class="w-8 h-8 rounded-lg border border-[#e5e7eb] flex items-center justify-center hover:border-brand transition-colors bg-transparent cursor-pointer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="brand-font font-bold text-[.9rem] text-brand">${MONTH_NAMES[m]} ${y}</span>
      <button onclick="shiftCal(1)" type="button" class="w-8 h-8 rounded-lg border border-[#e5e7eb] flex items-center justify-center hover:border-brand transition-colors bg-transparent cursor-pointer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="grid grid-cols-7 mb-1">
      ${DAY_NAMES.map((d) => `<div class="w-9 h-7 flex items-center justify-center font-body text-[.65rem] font-semibold uppercase text-muted">${d}</div>`).join("")}
    </div>
    <div class="grid grid-cols-7 gap-y-1">${cells}</div>
    <div class="flex items-center gap-4 mt-4 pt-4 border-t border-[#e5e7eb]">
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm bg-primary"></div><span class="font-body text-[.65rem] text-muted">Selected</span></div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm border-2 border-primary"></div><span class="font-body text-[.65rem] text-muted">Today</span></div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm bg-[#f59e0b]"></div><span class="font-body text-[.65rem] text-muted">Fully booked</span></div>
    </div>`;
}

function shiftCal(dir) {
  CAL.month += dir;
  if (CAL.month > 11) {
    CAL.month = 0;
    CAL.year++;
  }
  if (CAL.month < 0) {
    CAL.month = 11;
    CAL.year--;
  }
  renderCalendar();
}

function pickDate(dateStr) {
  STATE.date = dateStr;
  STATE.time = null;
  renderCalendar();

  if (isFullyBooked(dateStr)) {
    // Show fully booked notice, hide time widget, disable continue
    document.getElementById("timeWidget").innerHTML = `
      <div class="mb-2 flex items-center justify-between">
        <div class="brand-font font-bold text-[.88rem] text-brand">${formatDate(dateStr, { weekday: "long", month: "long", day: "numeric" })}</div>
        <span class="font-body text-[.65rem] font-semibold uppercase tracking-wider bg-[#fef3c7] text-[#b45309] px-2 py-1 rounded-full">Fully Booked</span>
      </div>
      <p class="font-body text-[.82rem] text-muted leading-relaxed">All time slots are taken. Join the <span class="text-primary font-semibold">waitlist</span> below and we'll notify you when a slot opens.</p>`;

    document.getElementById("fullyBookedBar").classList.remove("hidden");
    document.getElementById("fullyBookedBar").innerHTML = `
      <div class="bg-[#fef3c7] border border-[#fde68a] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#f59e0b] flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="brand-font font-bold text-[#92400e] text-[.9rem]">${formatDate(dateStr, { weekday: "long", month: "long", day: "numeric" })} is Fully Booked</div>
            <div class="font-body text-[.8rem] text-[#b45309] mt-0.5">Join the waitlist and we'll notify you if a slot opens up.</div>
          </div>
        </div>
        <button onclick="joinWaitlist()" type="button"
          class="brand-font font-bold text-[.78rem] tracking-wider uppercase bg-[#f59e0b] text-white px-5 py-2.5 rounded-xl hover:bg-[#d97706] transition-colors cursor-pointer whitespace-nowrap shrink-0">
          Join Waitlist
        </button>
      </div>`;

    document.getElementById("slotSummary").classList.add("hidden");
    document.getElementById("step2Btn").disabled = true;
  } else {
    document.getElementById("fullyBookedBar").classList.add("hidden");
    renderTimeSlots(dateStr);
  }
}

function renderTimeSlots(dateStr) {
  const booked = BOOKED[dateStr] || [];
  const dl = formatDate(dateStr, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  document.getElementById("timeWidget").innerHTML = `
    <div class="brand-font font-bold text-[.88rem] text-brand mb-1">${dl}</div>
    <p class="font-body text-[.74rem] text-muted mb-4">Select a preferred time. Struck-through slots are already booked.</p>
    <div class="grid grid-cols-3 gap-2">
      ${ALL_SLOTS.map((t) => {
        const isB = booked.includes(t),
          isSel = STATE.time === t;
        return `<button type="button" onclick="${!isB ? `pickTime('${t}')` : ""}"
          class="time-btn ${isSel ? "selected" : isB ? "booked" : ""}">${t}</button>`;
      }).join("")}
    </div>`;
}

function pickTime(t) {
  STATE.time = t;
  renderTimeSlots(STATE.date);
  updateSlotSummary();
  document.getElementById("step2Btn").disabled = false;
}

function updateSlotSummary() {
  const el = document.getElementById("slotSummary");
  if (!STATE.date || !STATE.time) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div class="brand-font font-bold text-green-800 text-[.88rem]">Slot Selected</div>
        <div class="font-body text-[.8rem] text-green-700">${formatDate(STATE.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${STATE.time}</div>
      </div>
    </div>`;
}

function joinWaitlist() {
  STATE.isWaitlist = true;
  STATE.step = "2b";
  showPanel("2b", "forward");
  updateChrome();
  renderWaitlist();
}

/* ══════════════════════════════════════════════
   STEP 2B — WAITLIST
═══════════════════════════════════════════════ */
function renderWaitlist() {
  const dl = STATE.date
    ? formatDate(STATE.date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "your selected date";
  document.getElementById("wlIntro").innerHTML =
    `<span class="font-semibold text-brand">${dl}</span> is fully booked. Sign up for the waitlist and we'll reach out as soon as a slot becomes available.`;

  document.getElementById("wlSummary").innerHTML = `
    <div class="brand-font font-bold text-[.85rem] text-brand mb-4">Waitlist Summary</div>
    <div class="flex flex-col gap-3">
      <div class="flex justify-between"><span class="font-body text-[.82rem] text-muted">Service</span><span class="font-body text-[.82rem] font-semibold text-brand">${STATE.service?.name}</span></div>
      <div class="flex justify-between"><span class="font-body text-[.82rem] text-muted">Requested Date</span><span class="font-body text-[.82rem] font-semibold text-brand">${dl}</span></div>
      <div class="flex justify-between items-center"><span class="font-body text-[.82rem] text-muted">Status</span><span class="font-body text-[.75rem] font-semibold uppercase tracking-wider text-[#b45309] bg-[#fef3c7] px-2.5 py-1 rounded-full">Waitlist</span></div>
    </div>`;

  // Alt dates
  const today = new Date();
  const alts = [];
  for (let i = 1; i <= 30 && alts.length < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0) continue;
    const str = d.toISOString().split("T")[0];
    if (!isFullyBooked(str))
      alts.push({
        str,
        label: d.toLocaleDateString("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      });
  }
  document.getElementById("altDates").innerHTML = alts
    .map(
      (a) =>
        `<button type="button" onclick="switchToDate('${a.str}')" class="alt-date-chip">${a.label}</button>`,
    )
    .join("");
}

function switchToDate(dateStr) {
  STATE.date = dateStr;
  STATE.isWaitlist = false;
  STATE.step = 2;
  showPanel(2, "back");
  updateChrome();
  renderSchedule();
  setTimeout(() => pickDate(dateStr), 50);
}

/* ══════════════════════════════════════════════
   STEP 3 — DETAILS
═══════════════════════════════════════════════ */
function renderDetails() {
  document.getElementById("s3Subtitle").textContent =
    `We need a few basic details to complete your ${STATE.isWaitlist ? "waitlist registration" : "booking"}.`;

  const dl = STATE.date
    ? formatDate(STATE.date, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  document.getElementById("s3MiniBar").innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>
      <div>
        <div class="brand-font font-bold text-white text-[.88rem]">${STATE.service?.name}</div>
        <div class="font-body text-[.74rem] text-white/50">${STATE.service?.category}</div>
      </div>
    </div>
    <div class="flex items-center gap-4">
      ${dl ? `<div class="text-right"><div class="font-body text-[.7rem] text-white/40 uppercase tracking-wider">Date</div><div class="brand-font font-bold text-white text-[.82rem]">${dl}</div></div>` : ""}
      ${STATE.time ? `<div class="text-right"><div class="font-body text-[.7rem] text-white/40 uppercase tracking-wider">Time</div><div class="brand-font font-bold text-white text-[.82rem]">${STATE.time}</div></div>` : ""}
      ${STATE.isWaitlist ? `<span class="font-body text-[.68rem] font-semibold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/20 px-2.5 py-1 rounded-full">Waitlist</span>` : ""}
    </div>`;

  // Restore saved values
  const d = STATE.details;
  if (d.firstName) document.getElementById("f_firstName").value = d.firstName;
  if (d.lastName) document.getElementById("f_lastName").value = d.lastName;
  if (d.email) document.getElementById("f_email").value = d.email;
  if (d.phone) document.getElementById("f_phone").value = d.phone;
  if (d.notes) document.getElementById("f_notes").value = d.notes;
  document.querySelectorAll('input[name="patientType"]').forEach((r) => {
    r.checked = r.value === (d.patientType || "New Patient");
  });
}

function clearErr(field) {
  const e = document.getElementById(`err_${field}`);
  const i = document.getElementById(`f_${field}`);
  if (e) e.classList.remove("show");
  if (i) i.classList.remove("error");
}

function submitDetails() {
  const fields = ["firstName", "lastName", "email", "phone"];
  let ok = true;

  fields.forEach((f) => {
    const val = document.getElementById(`f_${f}`)?.value.trim() || "";
    if (!val || (f === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))) {
      document.getElementById(`err_${f}`)?.classList.add("show");
      document.getElementById(`f_${f}`)?.classList.add("error");
      ok = false;
    }
  });

  if (!document.getElementById("f_consent").checked) {
    document.getElementById("err_consent").classList.add("show");
    document.getElementById("consentBox").style.outline = "2px solid #c0392b";
    ok = false;
  } else {
    document.getElementById("consentBox").style.outline = "";
  }

  if (!ok) return;

  STATE.details = {
    firstName: document.getElementById("f_firstName").value.trim(),
    lastName: document.getElementById("f_lastName").value.trim(),
    email: document.getElementById("f_email").value.trim(),
    phone: document.getElementById("f_phone").value.trim(),
    patientType:
      document.querySelector('input[name="patientType"]:checked')?.value ||
      "New Patient",
    notes: document.getElementById("f_notes").value.trim(),
  };

  goToStep(4);
}

/* ══════════════════════════════════════════════
   STEP 4 — REVIEW
═══════════════════════════════════════════════ */
function renderReview() {
  const s = STATE.service,
    d = STATE.details,
    isWL = STATE.isWaitlist;
  document.getElementById("s4Subtitle").textContent =
    `Please review your ${isWL ? "waitlist registration" : "appointment details"} before submitting.`;

  const dateLabel = STATE.date
    ? formatDate(STATE.date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  document.getElementById("s4Summary").innerHTML = `
    <!-- Service -->
    <div class="bg-brand p-6">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div class="font-body text-[.65rem] font-semibold tracking-[.12em] uppercase text-white/40 mb-1">${s?.category}</div>
          <h2 class="brand-font font-extrabold text-white text-[1.3rem]">${s?.name}</h2>
          <p class="font-body text-[.8rem] text-white/55 mt-1">${s?.tagline}</p>
        </div>
        <div class="text-right shrink-0">
          <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-white/40 mb-1">Starting at</div>
          <div class="brand-font font-bold text-primary text-[1.05rem]">${s?.price}</div>
        </div>
      </div>
      <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
        <div class="flex items-center gap-1.5 font-body text-[.74rem] text-white/55">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${s?.duration}
        </div>
        <div class="flex items-center gap-1.5 font-body text-[.74rem] text-white/55">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Recovery: ${s?.recovery}
        </div>
      </div>
    </div>
    <!-- Schedule -->
    <div class="p-6 border-b border-[#e5e7eb]">
      <div class="flex items-center justify-between mb-4">
        <div class="brand-font font-bold text-[.88rem] text-brand">Schedule</div>
        <button onclick="goToStep(2)" type="button" class="font-body text-[.74rem] text-primary hover:underline cursor-pointer bg-transparent border-none p-0">Edit</button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div class="bg-offwhite rounded-xl p-4"><div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Date</div><div class="brand-font font-bold text-brand text-[.88rem] leading-snug">${dateLabel}</div></div>
        <div class="bg-offwhite rounded-xl p-4"><div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Time</div><div class="brand-font font-bold text-[.88rem] ${isWL ? "text-[#b45309]" : "text-brand"}">${isWL ? "TBD (Waitlist)" : STATE.time || "—"}</div></div>
        <div class="bg-offwhite rounded-xl p-4"><div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Status</div><div class="brand-font font-bold text-[.88rem] ${isWL ? "text-[#b45309]" : "text-green-600"}">${isWL ? "Waitlist" : "Confirmed"}</div></div>
      </div>
    </div>
    <!-- Patient details -->
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="brand-font font-bold text-[.88rem] text-brand">Patient Details</div>
        <button onclick="goToStep(3)" type="button" class="font-body text-[.74rem] text-primary hover:underline cursor-pointer bg-transparent border-none p-0">Edit</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
        ${[
          ["Full Name", `${d.firstName} ${d.lastName}`],
          ["Email", d.email],
          ["Phone", d.phone],
          ["Patient Type", d.patientType],
        ]
          .map(
            ([l, v]) => `
          <div><div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-0.5">${l}</div><div class="font-body text-[.88rem] text-brand font-medium">${v || "—"}</div></div>`,
          )
          .join("")}
      </div>
      ${d.notes ? `<div class="mt-4 pt-4 border-t border-[#e5e7eb]"><div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Notes</div><div class="font-body text-[.85rem] text-muted leading-relaxed">${d.notes}</div></div>` : ""}
    </div>`;

  // Waitlist notice + confirm button color
  if (isWL) {
    document.getElementById("s4WLNotice").classList.remove("hidden");
    document.getElementById("confirmBtn").className =
      "brand-font font-bold text-[.88rem] tracking-wider uppercase bg-[#f59e0b] text-white px-10 py-4 rounded-xl hover:bg-[#d97706] transition-colors cursor-pointer";
    document.getElementById("confirmBtn").textContent =
      "Confirm Waitlist Registration ✓";
  } else {
    document.getElementById("s4WLNotice").classList.add("hidden");
    document.getElementById("confirmBtn").className =
      "brand-font font-bold text-[.88rem] tracking-wider uppercase bg-primary text-white px-10 py-4 rounded-xl hover:bg-brand transition-colors cursor-pointer";
    document.getElementById("confirmBtn").textContent = "Confirm Appointment ✓";
  }
}

/* ══════════════════════════════════════════════
   STEP 5 — SUCCESS
═══════════════════════════════════════════════ */
function confirmBooking() {
  STATE.ref = genRef();
  STATE.step = 5;
  showPanel(5, "forward");
  updateChrome();
  renderSuccess();
}

function renderSuccess() {
  const s = STATE.service,
    d = STATE.details,
    isWL = STATE.isWaitlist;
  const dateLabel = STATE.date
    ? formatDate(STATE.date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  if (isWL) {
    document.getElementById("successIcon").className =
      "w-20 h-20 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-6";
    document.getElementById("successIcon").innerHTML =
      '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>';
    document.getElementById("successTitle").textContent =
      "You're on the Waitlist!";
    document.getElementById("successMsg").innerHTML =
      `We've added you to the waitlist for <strong class="text-brand">${s?.name}</strong> on <strong class="text-brand">${dateLabel}</strong>. We'll notify you as soon as a slot opens.`;
  } else {
    document.getElementById("successTitle").textContent =
      "Appointment Confirmed!";
    document.getElementById("successMsg").innerHTML =
      `Your appointment for <strong class="text-brand">${s?.name}</strong> on <strong class="text-brand">${dateLabel}</strong> at <strong class="text-brand">${STATE.time}</strong> has been confirmed.`;
  }

  document.getElementById("refNumber").textContent = STATE.ref;

  document.getElementById("successCard").innerHTML = `
    <div class="space-y-3">
      ${[
        ["Patient", `${d.firstName} ${d.lastName}`],
        ["Service", s?.name],
        ["Date", dateLabel],
        ["Time", isWL ? "TBD (Waitlist)" : STATE.time],
        ["Clinic", "Samson Dental Center"],
      ]
        .map(
          ([l, v], i) => `
        <div class="flex justify-between items-center ${i === 4 ? "pt-3 border-t border-[#e5e7eb]" : ""}">
          <span class="font-body text-[.8rem] text-muted">${l}</span>
          <span class="font-body text-[.85rem] font-semibold text-brand">${v}</span>
        </div>`,
        )
        .join("")}
      <div class="flex justify-between items-center">
        <span class="font-body text-[.8rem] text-muted">Confirmation sent to</span>
        <span class="font-body text-[.8rem] text-primary">${d.email}</span>
      </div>
    </div>`;

  const tips = isWL
    ? [
        "You'll receive an SMS and email confirmation of your waitlist position.",
        "We'll notify you within 24 hours of an available slot opening.",
        "You have 2 hours to confirm once notified before it moves to the next patient.",
      ]
    : [
        `Check your inbox at ${d.email} for your booking confirmation.`,
        "You'll receive an SMS reminder 24 hours before your appointment.",
        "Arrive 10–15 minutes early with a valid ID and your HMO card if applicable.",
      ];

  document.getElementById("nextSteps").innerHTML = `
    <div class="brand-font font-bold text-[.85rem] text-brand mb-3">What happens next?</div>
    <div class="space-y-2.5">
      ${tips.map((t) => `<div class="flex items-start gap-2.5 font-body text-[.82rem] text-muted"><span class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>${t}</div>`).join("")}
    </div>`;
}

/* ══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
updateChrome();
renderStep1();
