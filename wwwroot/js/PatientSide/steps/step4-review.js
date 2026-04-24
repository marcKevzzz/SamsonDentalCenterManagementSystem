// ── steps/step4-review.js ─────────────────────────────────────────────────────
import { STATE, formatDate, isLoggedIn } from "../appointment-state.js";
import { showPanel, updateChrome }       from "../appointment-nav.js";
import { renderStep5 }                   from "./step5-success.js";
import { Toast }                         from "../../ui.js";

// ── Render review panel ───────────────────────────────────────────────────────
export function renderStep4() {
    const isWL  = STATE.isWaitlist;
    const s     = STATE.service;
    const d     = STATE.details;
    const guest = !isLoggedIn();

    const s4Sub = document.getElementById("s4Subtitle");
    if (s4Sub) s4Sub.textContent =
        `Please review your ${isWL ? "waitlist registration" : "appointment details"} before submitting.`;

    const dateLabel = STATE.date
        ? formatDate(STATE.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "—";

    const patientDisplay = d.isForOther && d.otherName
        ? `${d.otherName} <span class="text-[10px] text-muted ml-1">(booked by ${d.firstName} ${d.lastName})</span>`
        : `${d.firstName} ${d.lastName}`;

    const s4sum = document.getElementById("s4Summary");
    if (!s4sum) return;

    s4sum.innerHTML = `
    <div class="bg-brand p-6 rounded-t-2xl">
        <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <div class="font-body text-[.65rem] font-semibold tracking-[.12em] uppercase text-white/40 mb-1">
                    ${s?.category}
                </div>
                <h2 class="brand-font font-extrabold text-white text-[1.3rem]">${s?.name}</h2>
                <p class="font-body text-[.8rem] text-white/55 mt-1">${s?.tagline}</p>
            </div>
            <div class="text-right shrink-0">
                <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-white/40 mb-1">
                    Starting at
                </div>
                <div class="brand-font font-bold text-primary text-[1.05rem]">${s?.price}</div>
            </div>
        </div>
        <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
            ${s?.duration ? `
            <div class="flex items-center gap-1.5 font-body text-[.74rem] text-white/55">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>${s.duration}
            </div>` : ""}
            ${s?.recovery ? `
            <div class="flex items-center gap-1.5 font-body text-[.74rem] text-white/55">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>Recovery: ${s.recovery}
            </div>` : ""}
        </div>
    </div>

    <div class="p-6 border-b border-[#e5e7eb]">
        <div class="flex items-center justify-between mb-4">
            <div class="brand-font font-bold text-[.88rem] text-brand">Schedule</div>
            <button onclick="goToStep(2)" type="button"
                class="font-body text-[.74rem] text-primary hover:underline cursor-pointer bg-transparent border-none p-0">
                Edit
            </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="bg-offwhite rounded-xl p-4">
                <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Date</div>
                <div class="brand-font font-bold text-brand text-[.88rem] leading-snug">${dateLabel}</div>
            </div>
            <div class="bg-offwhite rounded-xl p-4">
                <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Time</div>
                <div class="brand-font font-bold text-[.88rem] ${isWL ? "text-amber-600" : "text-brand"}">
                    ${isWL ? "TBD — Waitlist" : (STATE.time ?? "—")}
                </div>
            </div>
            <div class="bg-offwhite rounded-xl p-4">
                <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Status</div>
                <div class="brand-font font-bold text-[.88rem] ${isWL ? "text-amber-600" : "text-green-600"}">
                    ${isWL ? "Waitlist" : "Available"}
                </div>
            </div>
        </div>
    </div>

    <div class="p-6">
        <div class="flex items-center justify-between mb-4">
            <div class="brand-font font-bold text-[.88rem] text-brand">Patient Details</div>
            <button onclick="goToStep(3)" type="button"
                class="font-body text-[.74rem] text-primary hover:underline cursor-pointer bg-transparent border-none p-0">
                Edit
            </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            ${[
                ["Patient",      patientDisplay],
                ["Email",        d.email],
                ["Phone",        d.phone],
                ["Birthday",     d.dob]
            ].map(([l, v]) => `
            <div>
                <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-0.5">${l}</div>
                <div class="font-body text-[.88rem] text-brand font-medium">${v || "—"}</div>
            </div>`).join("")}
        </div>
        ${d.notes ? `
        <div class="mt-4 pt-4 border-t border-[#e5e7eb]">
            <div class="font-body text-[.65rem] font-semibold tracking-[.1em] uppercase text-muted mb-1">Notes</div>
            <div class="font-body text-[.85rem] text-muted leading-relaxed">${d.notes}</div>
        </div>` : ""}
        ${guest ? `
        <div class="mt-4 pt-4 border-t border-[#e5e7eb]">
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 font-body text-[.78rem] text-amber-800">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 mr-1.5"></i>
                A confirmation email will be sent to <strong>${d.email}</strong>.
                You must click the link to finalize your booking.
            </div>
        </div>` : ""}
    </div>`;

    // Waitlist notice
    document.getElementById("s4WLNotice")?.classList.toggle("hidden", !isWL);

    // Confirm button styling
    const confirmBtn = document.getElementById("confirmBtn");
    if (confirmBtn) {
        if (isWL) {
            confirmBtn.className = "brand-font font-bold text-[.88rem] tracking-wider uppercase bg-amber-500 text-white px-10 py-4 rounded-xl hover:bg-amber-600 transition-colors cursor-pointer";
            confirmBtn.textContent = "Join Waitlist ✓";
        } else {
            confirmBtn.className = "brand-font font-bold text-[.88rem] tracking-wider uppercase bg-primary text-white px-10 py-4 rounded-xl hover:bg-brand transition-colors cursor-pointer";
            confirmBtn.textContent = isLoggedIn() ? "Confirm Appointment ✓" : "Submit Booking ✓";
        }
    }
}

// ── Confirm booking — POST to API ─────────────────────────────────────────────
export async function confirmBooking() {
    const btn      = document.getElementById("confirmBtn");
    const original = btn?.textContent ?? "";
    if (btn) { btn.disabled = true; btn.textContent = "Processing…"; }

    try {
        const d       = STATE.details;
        const loggedIn = isLoggedIn();

        const payload = {
            patientId:       loggedIn ? STATE.patient?.id    : null,
            patientName:     `${d.firstName} ${d.lastName}`.trim(),
            patientEmail:    d.email,
            patientPhone:    d.phone,
            patientSex:      d.sex   || null,
            patientDob:      d.dob   ? new Date(d.dob + "T00:00:00").toISOString() : null,
            patientType:     d.patientType ?? "New Patient",
            isGuest:         !loggedIn,
            isForOther:      d.isForOther,
            otherName:       d.otherName || null,
            otherSex:        d.otherSex  || null,
            otherDob:        d.otherDob  ? new Date(d.otherDob + "T00:00:00").toISOString() : null,
            serviceId:       STATE.service?.id   ?? "",
            serviceName:     STATE.service?.name ?? "",
            doctorId:        STATE.doctor?.id    ?? null,
            doctorName:      STATE.doctor?.name  ?? null,
            appointmentDate: STATE.date ? new Date(STATE.date + "T00:00:00").toISOString() : "",
            appointmentTime: STATE.time ?? "",
            isWaitlist:      STATE.isWaitlist,
            notes:           d.notes || null
        };

        const res    = await fetch("/api/appointments", {
            method:      "POST",
            headers:     { "Content-Type": "application/json" },
            credentials: "include",
            body:        JSON.stringify(payload)
        });

        const text   = await res.text();
        const result = text ? JSON.parse(text) : {};

        if (res.status === 409) {
            Toast.show("You already have an appointment on this date.", "warning");
            if (btn) { btn.disabled = false; btn.textContent = original; }
            return;
        }

        if (!res.ok || !result.ok) {
            Toast.show(result.error ?? "Booking failed. Please try again.", "danger");
            if (btn) { btn.disabled = false; btn.textContent = original; }
            return;
        }

        // Success — go to step 5
        STATE.ref  = result.refNumber ?? "";
        STATE.step = 5;
        showPanel(5, "forward");
        updateChrome();
        renderStep5(result);

    } catch (err) {
        console.error("[step4] confirmBooking:", err);
        Toast.show("An unexpected error occurred.", "danger");
        if (btn) { btn.disabled = false; btn.textContent = original; }
    }
}

window.confirmBooking = confirmBooking;