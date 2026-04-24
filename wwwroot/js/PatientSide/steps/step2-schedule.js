// ── steps/step2-schedule.js ───────────────────────────────────────────────────
import {
  STATE,
  ALL_SLOTS,
  AVAILABILITY_CACHE,
  formatDate,
  isDateFullyBooked,
  isSlotAvailable,
} from "../appointment-state.js";

const CAL = { year: new Date().getFullYear(), month: new Date().getMonth() };
const MONTHS = [
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
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Render step 2 ─────────────────────────────────────────────────────────────
export function renderStep2() {
  const nameEl = document.getElementById("s2ServiceName");
  if (nameEl) nameEl.textContent = STATE.service?.name ?? "";
  renderCalendar();
  if (STATE.date) renderTimeSlots(STATE.date);
  updateSlotSummary();
}

// ── Fetch availability for a month ───────────────────────────────────────────
async function fetchAvailabilityForDate(dateStr) {
  if (AVAILABILITY_CACHE[dateStr]) return; // already cached
  if (!STATE.service) return;

  try {
    const res = await fetch(
      `/api/appointments/availability?category=${encodeURIComponent(STATE.service.category)}&date=${dateStr}`,
    );
    AVAILABILITY_CACHE[dateStr] = await res.json();
  } catch (err) {
    console.error("[step2] Availability fetch failed:", err);
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export function renderCalendar() {
  const today = new Date();
  const { year: y, month: m } = CAL;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMon = new Date(y, m + 1, 0).getDate();

  let cells = Array(firstDay).fill("<div></div>").join("");

  for (let d = 1; d <= daysInMon; d++) {
    // Replace the two lines inside the for loop:
const dstr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dt = new Date(y, m, d); // Keep this for isPast and isSun checks
    const isPast =
      dt < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSun = dt.getDay() === 0;
    const isToday = dt.toDateString() === today.toDateString();
    const isSel = STATE.date === dstr;
    const isFull = isDateFullyBooked(dstr);
    const disabled = isPast || isSun;

    let cls = "cal-day ";
    if (disabled) cls += "disabled";
    else if (isSel) cls += "selected";
    else if (isToday) cls += "today";
    else if (isFull) cls += "fullbooked";

    cells += `<button type="button" class="${cls}"
            ${disabled ? "disabled" : `onclick="pickDate('${dstr}')"`}>${d}</button>`;
  }

  const widget = document.getElementById("calWidget");
  if (!widget) return;

  widget.innerHTML = `
    <div class="flex items-center justify-between mb-4">
        <button onclick="shiftCal(-1)" type="button"
            class="w-8 h-8 rounded-lg border border-[#e5e7eb] flex items-center justify-center hover:border-brand transition-colors bg-transparent cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="brand-font font-bold text-[.9rem] text-brand">${MONTHS[m]} ${y}</span>
        <button onclick="shiftCal(1)" type="button"
            class="w-8 h-8 rounded-lg border border-[#e5e7eb] flex items-center justify-center hover:border-brand transition-colors bg-transparent cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
    </div>
    <div class="grid grid-cols-7 mb-1">
        ${DAYS.map((d) => `<div class="w-9 h-7 flex items-center justify-center font-body text-[.65rem] font-semibold uppercase text-muted">${d}</div>`).join("")}
    </div>
    <div class="grid grid-cols-7 gap-y-1">${cells}</div>
    <div class="flex items-center gap-4 mt-4 pt-4 border-t border-[#e5e7eb]">
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm bg-primary"></div>
            <span class="font-body text-[.65rem] text-muted">Selected</span></div>
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm border-2 border-primary"></div>
            <span class="font-body text-[.65rem] text-muted">Today</span></div>
        <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-sm bg-[#f59e0b]"></div>
            <span class="font-body text-[.65rem] text-muted">Fully booked</span></div>
    </div>`;
}

export function shiftCal(dir) {
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

// ── Pick date ─────────────────────────────────────────────────────────────────
export async function pickDate(dateStr) {
  STATE.date = dateStr;
  STATE.time = null;

  // Show loading state
  const timeWidget = document.getElementById("timeWidget");
  if (timeWidget)
    timeWidget.innerHTML = `
        <div class="flex items-center justify-center h-36">
            <div class="text-center">
                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p class="font-body text-[.8rem] text-muted">Loading availability…</p>
            </div>
        </div>`;

  // Fetch availability
  await fetchAvailabilityForDate(dateStr);
  renderCalendar();

  const isFull = isDateFullyBooked(dateStr);
  const fullyBar = document.getElementById("fullyBookedBar");

  if (isFull) {
    if (timeWidget)
      timeWidget.innerHTML = `
        <div class="mb-2 flex items-center justify-between">
            <div class="brand-font font-bold text-[.88rem] text-brand">
                ${formatDate(dateStr, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <span class="font-body text-[.65rem] font-semibold uppercase tracking-wider bg-[#fef3c7] text-[#b45309] px-2 py-1 rounded-full">
                Fully Booked
            </span>
        </div>
        <p class="font-body text-[.82rem] text-muted leading-relaxed">
            All time slots are taken. Join the <span class="text-primary font-semibold">waitlist</span> below.
        </p>`;

    if (fullyBar) {
      fullyBar.classList.remove("hidden");
      fullyBar.innerHTML = `
            <div class="bg-[#fef3c7] border border-[#fde68a] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-xl bg-[#f59e0b] flex items-center justify-center shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div>
                        <div class="brand-font font-bold text-[#92400e] text-[.9rem]">
                            ${formatDate(dateStr, { weekday: "long", month: "long", day: "numeric" })} is Fully Booked
                        </div>
                        <div class="font-body text-[.8rem] text-[#b45309] mt-0.5">
                            Join the waitlist and we'll notify you if a slot opens up.
                        </div>
                    </div>
                </div>
                <button onclick="joinWaitlist()" type="button"
                    class="brand-font font-bold text-[.78rem] tracking-wider uppercase bg-[#f59e0b] text-white px-5 py-2.5 rounded-xl hover:bg-[#d97706] transition-colors cursor-pointer whitespace-nowrap shrink-0">
                    Join Waitlist
                </button>
            </div>`;
    }

    document.getElementById("slotSummary")?.classList.add("hidden");
    const btn = document.getElementById("step2Btn");
    if (btn) btn.disabled = true;
  } else {
    fullyBar?.classList.add("hidden");
    renderTimeSlots(dateStr);
  }
}

// ── Time slots ────────────────────────────────────────────────────────────────
export function renderTimeSlots(dateStr) {
  const widget = document.getElementById("timeWidget");
  if (!widget) return;

  const dl = formatDate(dateStr, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const slots = AVAILABILITY_CACHE[dateStr] ?? {};

  widget.innerHTML = `
    <div class="brand-font font-bold text-[.88rem] text-brand mb-1">${dl}</div>
    <p class="font-body text-[.74rem] text-muted mb-4">
        Select a time. Greyed slots are fully booked — <span class="font-semibold">numbers show available doctors</span>.
    </p>
    <div class="grid grid-cols-3 gap-2">
        ${ALL_SLOTS.map((t) => {
          const info = slots[t];
          const avail = info?.available ?? true;
          const count = info?.doctorCount ?? 0;
          const isSel = STATE.time === t;
          const isBooked = !avail;

          return `<button type="button"
                onclick="${!isBooked ? `pickTime('${t}')` : ""}"
                class="time-btn ${isSel ? "selected" : isBooked ? "booked" : ""}"
                ${isBooked ? "disabled" : ""}>
                ${t}
                ${!isBooked && count > 0 ? `<span class="block text-[9px] opacity-60 mt-0.5">${count} dr${count > 1 ? "s" : ""}</span>` : ""}
            </button>`;
        }).join("")}
    </div>`;
}

// ── Pick time ─────────────────────────────────────────────────────────────────
export function pickTime(t) {
  STATE.time = t;
  renderTimeSlots(STATE.date);
  updateSlotSummary();
  const btn = document.getElementById("step2Btn");
  if (btn) btn.disabled = false;
}

// ── Slot summary ──────────────────────────────────────────────────────────────
export function updateSlotSummary() {
  const el = document.getElementById("slotSummary");
  if (!el) return;
  if (!STATE.date || !STATE.time) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
            <div class="brand-font font-bold text-green-800 text-[.88rem]">Slot Selected</div>
            <div class="font-body text-[.8rem] text-green-700">
                ${formatDate(STATE.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${STATE.time}
            </div>
        </div>
    </div>`;
}

// ── Waitlist ──────────────────────────────────────────────────────────────────
export function joinWaitlist() {
  import("../appointment-nav.js").then(({ goToStep }) => {
    STATE.isWaitlist = true;
    STATE.step = "2b";
    goToStep("2b");
  });
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.shiftCal = shiftCal;
window.pickDate = pickDate;
window.pickTime = pickTime;
window.joinWaitlist = joinWaitlist;
