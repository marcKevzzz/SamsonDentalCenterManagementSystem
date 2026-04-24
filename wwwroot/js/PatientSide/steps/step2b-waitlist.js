// ── steps/step2b-waitlist.js ──────────────────────────────────────────────────
import {
  STATE,
  formatDate,
  isDateFullyBooked,
  AVAILABILITY_CACHE,
} from "../appointment-state.js";

export function renderStep2b() {
  const dl = STATE.date
    ? formatDate(STATE.date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "your selected date";

  const intro = document.getElementById("wlIntro");
  if (intro)
    intro.innerHTML = `<span class="font-semibold text-brand">${dl}</span> is fully booked. Sign up for the waitlist and we'll reach out as soon as a slot opens.`;

  const summary = document.getElementById("wlSummary");
  if (summary)
    summary.innerHTML = `
    <div class="brand-font font-bold text-[.85rem] text-brand mb-4">Waitlist Summary</div>
    <div class="flex flex-col gap-3">
        <div class="flex justify-between">
            <span class="font-body text-[.82rem] text-muted">Service</span>
            <span class="font-body text-[.82rem] font-semibold text-brand">${STATE.service?.name}</span>
        </div>
        <div class="flex justify-between">
            <span class="font-body text-[.82rem] text-muted">Requested Date</span>
            <span class="font-body text-[.82rem] font-semibold text-brand">${dl}</span>
        </div>
        <div class="flex justify-between items-center">
            <span class="font-body text-[.82rem] text-muted">Status</span>
            <span class="font-body text-[.75rem] font-semibold uppercase tracking-wider text-[#b45309] bg-[#fef3c7] px-2.5 py-1 rounded-full">
                Waitlist
            </span>
        </div>
    </div>`;

  // Alt dates — find next 5 available dates
  const altDatesEl = document.getElementById("altDates");
  if (altDatesEl) {
    const today = new Date();
    const alts = [];
    for (let i = 1; i <= 60 && alts.length < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === 0) continue; // skip Sundays
      const str = d.toISOString().split("T")[0];
      // Only show if we have data and it's not fully booked, or if we don't have data yet
      if (!AVAILABILITY_CACHE[str] || !isDateFullyBooked(str)) {
        alts.push({
          str,
          label: d.toLocaleDateString("en-PH", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        });
      }
    }
    altDatesEl.innerHTML = alts
      .map(
        (a) =>
          `<button type="button" onclick="switchToDate('${a.str}')" class="alt-date-chip">${a.label}</button>`,
      )
      .join("");
  }
}

export function switchToDate(dateStr) {
  import("../appointment-nav.js").then(({ goToStep }) => {
    STATE.date = dateStr;
    STATE.isWaitlist = false;
    STATE.step = 2;
    goToStep(2);
  });
}

window.switchToDate = switchToDate;
