// ── steps/step5-success.js ────────────────────────────────────────────────────
import { STATE, formatDate, isLoggedIn } from "../appointment-state.js";

export function renderStep5(apiResult = {}) {
    const s = STATE.service;
    const d = STATE.details;
    const isWL = STATE.isWaitlist;
    const guest = !isLoggedIn();

    const dateLabel = STATE.date
        ? formatDate(STATE.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "—";

    // ── Icon ──────────────────────────────────────────────────────────────────
    const iconEl = document.getElementById("successIcon");
    if (iconEl) {
        if (isWL) {
            iconEl.className = "w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6";
            iconEl.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                <line x1="6" y1="1" x2="6" y2="4"/>
                <line x1="10" y1="1" x2="10" y2="4"/>
                <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>`;
        } else if (guest) {
            // Loading arrow icon for guest pending
            iconEl.className = "w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6";
            iconEl.innerHTML = `
            <svg class="animate-spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>`;
        } else {
            iconEl.className = "w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6";
            iconEl.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>`;
        }
    }

    // ── Title ─────────────────────────────────────────────────────────────────
    const titleEl = document.getElementById("successTitle");
    if (titleEl) {
        titleEl.textContent = isWL
            ? "You're on the Waitlist!"
            : guest
                ? "Almost There!"
                : "Appointment Confirmed!";
    }

    // ── Message ───────────────────────────────────────────────────────────────
    const msgEl = document.getElementById("successMsg");
    if (msgEl) {
        if (isWL) {
            msgEl.innerHTML = `Added to waitlist for <strong class="text-brand">${s?.name}</strong> on
                <strong class="text-brand">${dateLabel}</strong>. We'll notify you when a slot opens.`;
        } else if (guest) {
            msgEl.innerHTML = `Your booking is <strong>pending confirmation</strong>.
                Check your email to secure your slot.`;
        } else {
            msgEl.innerHTML = `Your appointment for <strong class="text-brand">${s?.name}</strong> on
                <strong class="text-brand">${dateLabel}</strong> at
                <strong class="text-brand">${STATE.time}</strong> is confirmed.`;
        }
    }

    // ── Ref number ────────────────────────────────────────────────────────────
    const refEl = document.getElementById("refNumber");
    if (refEl) refEl.textContent = apiResult.refNumber ?? STATE.ref ?? "—";

    // ── Guest email notice ────────────────────────────────────────────────────
    const guestNotice = document.getElementById("guestEmailNotice");
    const guestAddr = document.getElementById("guestEmailAddr");
    if (guestNotice) guestNotice.classList.toggle("hidden", !guest || isWL);
    if (guestAddr) guestAddr.textContent = d.email;

    // ── Summary card ──────────────────────────────────────────────────────────
    const patientDisplay = d.isForOther && d.otherName
        ? d.otherName
        : `${d.firstName} ${d.lastName}`;

    const card = document.getElementById("successCard");
    if (card) {
        const rows = [
            ["Patient", patientDisplay],
            ["Service", s?.name ?? "—"],
            ["Date", dateLabel],
            ["Time", isWL ? "TBD — Waitlist" : (STATE.time ?? "—")],
            ["Status", isWL ? "Waitlist" : guest ? "Pending Email Confirmation" : "Confirmed"],
            ["Clinic", "Samson Dental Center"]
        ];

        card.innerHTML = `
        <div class="space-y-3">
            ${rows.map(([l, v], i) => `
            <div class="flex justify-between items-start gap-4
                ${i === rows.length - 1 ? "pt-3 border-t border-[#e5e7eb]" : ""}">
                <span class="font-body text-[.8rem] text-muted shrink-0">${l}</span>
                <span class="font-body text-[.85rem] font-semibold text-brand text-right">${v}</span>
            </div>`).join("")}
            <div class="flex justify-between items-center pt-3 border-t border-[#e5e7eb] gap-4">
                <span class="font-body text-[.8rem] text-muted">Contact</span>
                <span class="font-body text-[.8rem] text-primary truncate">${d.email}</span>
            </div>
        </div>`;
    }

    // ── Next steps ────────────────────────────────────────────────────────────
    const tips = isWL
        ? [
            "You'll receive an SMS/email when a slot opens on your requested date.",
            "You have 2 hours to confirm once notified before it moves to the next person.",
            "Check your spam folder if you don't see our notification."
        ]
        : guest
            ? [
                `Click the confirmation link sent to <strong>${d.email}</strong> — required to secure your slot.`,
                "The link expires in 24 hours. Request a new one if it expires.",
                "Arrive 10–15 minutes early with a valid ID on the day of your appointment."
            ]
            : [
                `Booking confirmation details have been sent to <strong>${d.email}</strong>.`,
                "You'll receive an SMS reminder 24 hours before your appointment.",
                "Arrive 10–15 minutes early with a valid ID and your HMO card if applicable."
            ];

    const nextEl = document.getElementById("nextSteps");
    if (nextEl) nextEl.innerHTML = `
    <div class="brand-font font-bold text-[.85rem] text-brand mb-3">What happens next?</div>
    <div class="space-y-2.5">
        ${tips.map(t => `
        <div class="flex items-start gap-2.5 font-body text-[.82rem] text-muted">
            <span class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="3"
                    stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span>${t}</span>
        </div>`).join("")}
    </div>`;

    // ── Actions ───────────────────────────────────────────────────────────────
    const actionsEl = document.getElementById("successActions");
    if (actionsEl) {
        actionsEl.classList.toggle("hidden", guest && !isWL);
    }
}