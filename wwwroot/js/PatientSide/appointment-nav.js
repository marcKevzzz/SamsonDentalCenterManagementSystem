// ── appointment-nav.js ────────────────────────────────────────────────────────
import { STATE, resetState } from "./appointment-state.js";
import { renderStep1 }    from "./steps/step1-service.js";
import { renderStep2 }    from "./steps/step2-schedule.js";
import { renderStep2b }   from "./steps/step2b-waitlist.js";
import { renderStep3 }    from "./steps/step3-details.js";
import { renderStep4 }    from "./steps/step4-review.js";
import { renderStep5 }    from "./steps/step5-success.js";

const STEP_META = [
    { id: 1, label: "Service" },
    { id: 2, label: "Schedule" },
    { id: 3, label: "Details" },
    { id: 4, label: "Confirm" }
];

// ── Panel transition ──────────────────────────────────────────────────────────
export function showPanel(id, dir = "forward") {
    document.querySelectorAll(".step-panel").forEach(p =>
        p.classList.remove("active", "back-active")
    );
    const el = document.getElementById(`step-${id}`);
    if (!el) return;
    el.classList.add(dir === "forward" ? "active" : "back-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Go to step ────────────────────────────────────────────────────────────────
export function goToStep(id) {
    STATE.step = id;
    showPanel(id, "forward");
    updateChrome();
    if (id === 1)    renderStep1();
    if (id === 2)    renderStep2();
    if (id === "2b") renderStep2b();
    if (id === 3)    renderStep3();
    if (id === 4)    renderStep4();
    console.log(STATE)
}

// ── Go back ───────────────────────────────────────────────────────────────────
export function goBack() {
  console.trace("goBack called");
    const cur = STATE.step;
    let prev;
    if (cur === "2b") prev = 2;
    else if (cur === 2)  prev = 1;
    else if (cur === 3)  prev = STATE.isWaitlist ? "2b" : 2;
    else if (cur === 4)  prev = 3;
    else return;

    STATE.step = prev;
    showPanel(prev, "back");
    updateChrome();
    if (prev === 1)    renderStep1();
    if (prev === 2)    renderStep2();
    if (prev === "2b") renderStep2b();
    if (prev === 3)    renderStep3();
}

// ── Chrome (progress bar + back btn) ─────────────────────────────────────────
export function updateChrome() {
    const cur       = STATE.step;
    const isSuccess = cur === 5;

    document.getElementById("progressWrap").style.display = isSuccess ? "none" : "";

    const backBtn = document.getElementById("backBtn");
    backBtn.style.display = (cur !== 1 && cur !== 5) ? "flex" : "none";

    const dispStep = cur === "2b" ? 2 : cur === 5 ? 4 : Number(cur);
    document.getElementById("stepIndicators").innerHTML = STEP_META.map((s, i) => {
        const done   = s.id < dispStep;
        const active = s.id === dispStep;
        const last   = i === STEP_META.length - 1;
        return `
        <div class="flex items-center ${last ? "" : "flex-1"}">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[.68rem] font-bold brand-font
                    ${done ? "bg-primary text-white" : active ? "bg-brand text-white" : "bg-[#e5e7eb] text-muted"}">
                    ${done
                        ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"
                            stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                        : s.id}
                </div>
                <span class="hidden sm:block font-body text-[.72rem] font-medium
                    ${active ? "text-brand" : done ? "text-primary" : "text-muted"}">${s.label}</span>
            </div>
            ${!last ? `<div class="flex-1 h-px mx-3 ${done ? "bg-primary" : "bg-[#e5e7eb]"}"></div>` : ""}
        </div>`;
    }).join("");
}

// ── Cancel ────────────────────────────────────────────────────────────────────
export function cancelBooking() {
    import("../ui.js").then(({ Modal }) => {
        Modal.open({
            title:       "Cancel Booking",
            message:     "Are you sure you want to cancel? Your progress will be lost.",
            type:        "warning",
            confirmText: "Yes, Cancel",
            onConfirm:   () => { window.location.href = "/"; }
        });
    });
}

// ── Reset ─────────────────────────────────────────────────────────────────────
export function resetBooking() {
    resetState();
    goToStep(1);
    document.getElementById("progressWrap").style.display = "";
}

// ── Expose globals for inline HTML onclick ────────────────────────────────────
// (Razor partials use onclick="goBack()" etc.)
window.goBack        = goBack;
window.goToStep      = goToStep;
window.cancelBooking = cancelBooking;
window.resetBooking  = resetBooking;