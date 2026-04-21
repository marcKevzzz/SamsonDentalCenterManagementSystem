// ── appointment-state.js ──────────────────────────────────────────────────────

export const ALL_SLOTS = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM",  "2:00 PM",  "3:00 PM",  "4:00 PM",  "5:00 PM"
];

export const CATEGORIES = ["General Dentistry", "Cosmetic", "Specialized"];
export const RESTRICTED_CATEGORIES = ["Specialized"];

// ── Load user from server-injected JSON bridge ────────────────────────────────
function readServerUser() {
    try {
        const el = document.getElementById("appointment-user");
        if (!el) return null;
        const data = JSON.parse(el.textContent);
        return data.isLoggedIn ? data : null;
    } catch {
        return null;
    }
}

// ── State ─────────────────────────────────────────────────────────────────────
export const STATE = {
    step:       1,
    service:    null,
    doctor:     null,
    date:       null,   // "yyyy-MM-dd" — persists across steps, only reset on new service
    time:       null,   // "9:00 AM"
    isWaitlist: false,
    details: {
        firstName:   "",
        lastName:    "",
        email:       "",
        phone:       "",
        sex:         "",
        dob:         "",
        patientType: "New Patient",
        notes:       "",
        isForOther:  false,
        otherName:   "",
        otherSex:    "",
        otherDob:    ""
    },
    patient: readServerUser(),  // from server — never from localStorage
    ref:     ""
};

// ── FIX Bug 1: Availability cache keyed by serviceId+date ─────────────────────
// Was: { "2026-04-20": { ... } }  ← shared across ALL services — WRONG
// Now: { "svcId|2026-04-20": { ... } } ← per-service — CORRECT
export const AVAILABILITY_CACHE = {};

export function availCacheKey(serviceId, dateStr) {
    return `${serviceId}|${dateStr}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isLoggedIn() {
    return !!STATE.patient?.isLoggedIn;
}

export function resetState() {
    STATE.step       = 1;
    STATE.service    = null;
    STATE.doctor     = null;
    STATE.date       = null;
    STATE.time       = null;
    STATE.isWaitlist = false;
    STATE.ref        = "";
    STATE.details    = {
        firstName: "", lastName: "", email: "", phone: "",
        sex: "", dob: "", patientType: "New Patient", notes: "",
        isForOther: false, otherName: "", otherSex: "", otherDob: ""
    };
    // patient stays — it's from the server
}

export function formatDate(dateStr, opts = {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
}) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", opts);
}

export function isDateFullyBooked(dateStr) {
    if (!STATE.service) return false;
    const key   = availCacheKey(STATE.service.id, dateStr);
    const slots = AVAILABILITY_CACHE[key];
    if (!slots) return false;
    return Object.values(slots).every(s => !s.available);
}

export function isSlotAvailable(dateStr, time) {
    if (!STATE.service) return true;
    const key = availCacheKey(STATE.service.id, dateStr);
    return AVAILABILITY_CACHE[key]?.[time]?.available ?? true;
}