// ── steps/step3-details.js ────────────────────────────────────────────────────
import { STATE, formatDate, isLoggedIn } from "../appointment-state.js";
import { Toast } from "../../ui.js";

export function renderStep3() {
  const s3Sub = document.getElementById("s3Subtitle");
  if (s3Sub)
    s3Sub.textContent = `We need a few details to complete your ${STATE.isWaitlist ? "waitlist registration" : "booking"}.`;

  renderMiniBar();
  renderDetailsForm();
}


// ── Mini summary bar ──────────────────────────────────────────────────────────
function renderMiniBar() {
  const el = document.getElementById("s3MiniBar");
  if (!el) return;
  const dl = STATE.date
    ? formatDate(STATE.date, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    : "";

  el.innerHTML = `
    <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
        </div>
        <div>
            <div class="brand-font font-bold text-white text-[.88rem]">${STATE.service?.name}</div>
            <div class="font-body text-[.74rem] text-white/50">${STATE.service?.category}</div>
        </div>
    </div>
    <div class="flex items-center gap-4">
        ${dl
      ? `<div class="text-right">
            <div class="font-body text-[.7rem] text-white/40 uppercase tracking-wider">Date</div>
            <div class="brand-font font-bold text-white text-[.82rem]">${dl}</div>
        </div>`
      : ""
    }
        ${STATE.time
      ? `<div class="text-right">
            <div class="font-body text-[.7rem] text-white/40 uppercase tracking-wider">Time</div>
            <div class="brand-font font-bold text-white text-[.82rem]">${STATE.time}</div>
        </div>`
      : ""
    }
        ${STATE.isWaitlist ? `<span class="font-body text-[.68rem] font-medium uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/20 px-2.5 py-1 rounded-full">Waitlist</span>` : ""}
    </div>`;
}

// ── Render the form differently based on login state ──────────────────────────
// ── Render the form differently based on login state ──────────────────────────
function renderDetailsForm() {
  const formContainer = document.getElementById("detailsFormContainer");
  if (!formContainer) return;

  const loggedIn = isLoggedIn();
  const s = STATE.service;

  // On first render, seed details from server user data
  // On back-navigation, STATE.details already has values — keep those
  const p = STATE.patient ?? {};
  const d = STATE.details;

  const firstName = d.firstName || p.firstName || "";
  const lastName = d.lastName || p.lastName || "";
  const email = d.email || p.email || "";
  const phone = d.phone || p.phone || "";
  const sex = d.sex || p.sex || "";
  const dob = d.dob || p.dob || "";

  formContainer.innerHTML = `
    <div class="bg-white rounded-2xl p-6 shadow-sm mb-6">

        ${loggedIn ? `
        <!-- Logged-in: show account badge -->
        <div class="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-6">
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[.75rem] brand-font shrink-0">
                ${p.initials ?? "??"}
            </div>
            <div class="min-w-0">
                <div class="font-body font-medium text-brand text-[.85rem] truncate">${p.firstName} ${p.lastName}</div>
                <div class="font-body text-[.73rem] text-muted truncate">${p.email}</div>
            </div>
            <span class="ml-auto text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                Verified
            </span>
        </div>

        <!-- Tab switcher — only for logged-in users -->
        <div class="flex p-1 bg-offwhite rounded-xl mb-6 border border-mute">
            <button onclick="toggleBookingTab(false)" id="tab-self"
                class="flex-1 py-2.5 text-[.8rem] font-bold brand-font rounded-lg transition-all duration-200 bg-brand text-white shadow-sm">
                For Myself
            </button>
            <button onclick="toggleBookingTab(true)" id="tab-other"
                class="flex-1 py-2.5 text-[.8rem] font-bold brand-font rounded-lg transition-all duration-200 text-muted hover:bg-white hover:text-brand hover:shadow-sm">
                Someone Else
            </button>
        </div>
        ` : `
        <!-- Guest: simple header -->
        <div class="brand-font font-bold text-[.9rem] text-brand mb-5">Your Information</div>
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
            <p class="font-body text-[.78rem] text-blue-800">
                <i class="fa-solid fa-circle-info text-blue-500 mr-1.5"></i>
                You'll receive an email confirmation link to secure your slot.
                <a href="/sign-in?returnUrl=/Appointments" class="text-primary font-medium hover:underline ml-1">
                    Sign in
                </a> for faster booking.
            </p>
        </div>
        `}

        <!-- Self fields -->
        <div id="selfFields" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        First Name <span class="text-primary">*</span>
                    </label>
                    <input id="f_firstName" type="text" class="form-input ${loggedIn ? "bg-slate-50" : ""}"
                        placeholder="Juan" value="${firstName}"
                        ${loggedIn ? "readonly" : 'oninput="clearErr(\'firstName\')"'} />
                    <div id="err_firstName" class="field-error">First name is required.</div>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Last Name <span class="text-primary">*</span>
                    </label>
                    <input id="f_lastName" type="text" class="form-input ${loggedIn ? "bg-slate-50" : ""}"
                        placeholder="Dela Cruz" value="${lastName}"
                        ${loggedIn ? "readonly" : 'oninput="clearErr(\'lastName\')"'} />
                    <div id="err_lastName" class="field-error">Last name is required.</div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Email <span class="text-primary">*</span>
                    </label>
                    <input id="f_email" type="email" class="form-input ${(loggedIn && email) ? "bg-slate-50" : ""}"
                        placeholder="juan@email.com" value="${email}"
                        ${(loggedIn && email) ? "readonly" : 'oninput="clearErr(\'email\')"'} />
                    <div id="err_email" class="field-error">Valid email is required.</div>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Phone <span class="text-primary">*</span>
                    </label>
                    <input id="f_phone" type="tel" class="form-input ${(loggedIn && phone) ? "bg-slate-50" : ""}"
                        placeholder="0912 345 6789" value="${phone}"
                        ${(loggedIn && phone) ? "readonly" : 'oninput="clearErr(\'phone\')"'} />
                    <div id="err_phone" class="field-error">Phone is required.</div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">Sex</label>
                    <select id="f_sex" class="form-input ${loggedIn ? "bg-slate-50" : ""}" ${loggedIn ? "disabled" : ""}>
                        <option value="">Select</option>
                        <option value="Male"       ${sex === "Male" ? "selected" : ""}>Male</option>
                        <option value="Female"     ${sex === "Female" ? "selected" : ""}>Female</option>
                        <option value="prefer_not" ${sex === "prefer_not" ? "selected" : ""}>Prefer not to say</option>
                    </select>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">Birthday</label>
                    <input id="f_dob" type="date" class="form-input ${loggedIn ? "bg-slate-50" : ""}"
                        value="${dob}" ${loggedIn ? "readonly" : ""} oninput="clearErr('dob')" />
                    <div id="err_dob" class="field-error">Patient must be at least 6 months old.</div>
                </div>
            </div>
            ${loggedIn ? `
            <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <i class="fa-solid fa-lock text-[10px] text-muted"></i>
                <p class="font-body text-[.72rem] text-muted">
                    Details locked to account. 
                    <a href="/Profile/Settings" target="_blank" class="text-primary font-medium hover:underline">Edit Settings</a>
                </p>
            </div>` : ""}
        </div>

        <!-- For-other fields (hidden by default) -->
        <div id="forOtherFields" class="hidden space-y-4">
            <div class="brand-font font-bold text-[.9rem] text-brand mb-2">Patient Information</div>
            <p class="font-body text-[.78rem] text-muted mb-4">
                Your account details will be used as the booking contact. Fill in the patient's info below.
            </p>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        First Name <span class="text-primary">*</span>
                    </label>
                    <input id="f_otherFirstName" type="text" class="form-input" placeholder="Patient's first name"
                        oninput="clearErr('otherFirstName')" />
                    <div id="err_otherFirstName" class="field-error">First name is required.</div>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Last Name <span class="text-primary">*</span>
                    </label>
                    <input id="f_otherLastName" type="text" class="form-input" placeholder="Patient's last name"
                        oninput="clearErr('otherLastName')" />
                    <div id="err_otherLastName" class="field-error">Last name is required.</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Relationship <span class="text-primary">*</span>
                    </label>
                    <input id="f_relationship" type="text" class="form-input" placeholder="e.g. Mother, Father, Friend"
                        oninput="clearErr('relationship')" />
                    <div id="err_relationship" class="field-error">Relationship is required.</div>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">
                        Patient Email <span class="text-muted">(Optional)</span>
                    </label>
                    <input id="f_otherEmail" type="email" class="form-input" placeholder="patient@email.com"
                        oninput="clearErr('otherEmail')" />
                    <div id="err_otherEmail" class="field-error">Invalid email format.</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">Sex</label>
                    <select id="f_otherSex" class="form-input">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="prefer_not">Prefer not to say</option>
                    </select>
                </div>
                <div>
                    <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2">Birthday</label>
                    <input id="f_otherDob" type="date" class="form-input" oninput="clearErr('otherDob')" />
                    <div id="err_otherDob" class="field-error">Patient must be at least 6 months old.</div>
                </div>
            </div>
        </div>

        <!-- Patient type — logged-in only, hidden when booking for other -->
        
      <label class="block font-body text-[.7rem] font-medium tracking-[.08em] uppercase text-muted mb-2 mt-4">Additional Notes</label>
            <textarea id="f_notes" class="form-input" rows="3" maxlength="500"
                placeholder="${loggedIn
      ? "Doctor preference, concerns, or special instructions…"
      : "Any allergies, medications, or concerns…"}">${d.notes || ""}</textarea>
            <div class="flex justify-end mt-1">
                <span id="notesCount" class="text-[10px] text-muted">0/500</span>
            </div>
        </div>
    </div>

    <!-- Consent -->
    <div class="bg-offwhite rounded-2xl p-4 mb-8 flex items-start gap-3 mt-4" id="consentBox">
        <input type="checkbox" id="f_consent" class="accent-primary w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
            onchange="clearErr('consent')" />
        <label for="f_consent" class="font-body text-[.8rem] text-muted leading-relaxed cursor-pointer">
            I consent to Samson Dental Center collecting my information in accordance with their
            <a href="javascript:void(0)" onclick="openLegalModal('privacy')" class="text-primary hover:underline">Privacy Policy</a>.
        </label>
    </div>
    <div id="err_consent" class="field-error -mt-6 mb-6 pl-1">You must accept the privacy policy.</div>

    <div class="flex justify-end">
        <button onclick="submitDetails()"
            class="brand-font font-bold text-[.85rem] tracking-wider uppercase bg-brand text-white px-8 py-3.5 rounded-xl hover:bg-primary transition-colors cursor-pointer">
            Review Booking →
        </button>
    </div>`;

  // Restore back-navigation values on top of pre-fill
  if (d.isForOther) toggleBookingTab(true);

  // Character count logic
  setTimeout(() => {
    const notesArea = document.getElementById("f_notes");
    const count = document.getElementById("notesCount");
    if (notesArea && count) {
      count.textContent = `${notesArea.value.length}/500`;
      notesArea.addEventListener("input", (e) => {
        count.textContent = `${e.target.value.length}/500`;
      });
    }
  }, 0);
}

function toggleBookingTab(isOther) {
  const selfFields = document.getElementById("selfFields");
  const forOtherFields = document.getElementById("forOtherFields");
  const tabSelf = document.getElementById("tab-self");
  const tabOther = document.getElementById("tab-other");

  STATE.details.isForOther = isOther;

  const activeCls = "flex-1 py-2.5 text-[.8rem] font-bold brand-font rounded-lg transition-all duration-200 bg-brand text-white shadow-sm";
  const inactiveCls = "flex-1 py-2.5 text-[.8rem] font-bold brand-font rounded-lg transition-all duration-200 text-muted hover:bg-white hover:text-brand hover:shadow-sm";

  if (isOther) {
    selfFields?.classList.add("hidden");
    forOtherFields?.classList.remove("hidden");
    if (tabOther) tabOther.className = activeCls;
    if (tabSelf) tabSelf.className = inactiveCls;
  } else {
    selfFields?.classList.remove("hidden");
    forOtherFields?.classList.add("hidden");
    if (tabSelf) tabSelf.className = activeCls;
    if (tabOther) tabOther.className = inactiveCls;
  }
}

// ── Autofill from logged-in account ──────────────────────────────────────────
function autofillFromAccount() {
  const p = STATE.patient;
  if (!p) return;

  if (STATE.details.notes) {
    const notes = document.getElementById("f_notes");
    if (notes) notes.value = STATE.details.notes;
  }
}

// ── Restore form values if going back ────────────────────────────────────────
function restoreFormValues() {
  const d = STATE.details;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  };
  set("f_firstName", d.firstName);
  set("f_lastName", d.lastName);
  set("f_email", d.email);
  set("f_phone", d.phone);
  set("f_notes", d.notes);
  set("f_otherFirstName", d.otherFirstName);
  set("f_otherLastName", d.otherLastName);
  set("f_relationship", d.relationship);
  set("f_otherEmail", d.otherEmail);
  set("f_otherSex", d.otherSex);
  set("f_otherDob", d.otherDob);

  if (d.isForOther) {
    const cb = document.getElementById("f_forOther");
    if (cb) {
      cb.checked = true;
      toggleForOther(true);
    }
  }
}

// ── Toggle "for other" fields ─────────────────────────────────────────────────
function toggleForOther(checked) {
  const fields = document.getElementById("forOtherFields");
  if (fields) fields.classList.toggle("hidden", !checked);
  STATE.details.isForOther = checked;
}

// ── Clear field error ─────────────────────────────────────────────────────────
function clearErr(field) {
  document.getElementById(`err_${field}`)?.classList.remove("show");
  document.getElementById(`f_${field}`)?.classList.remove("error");
  if (field === "consent") {
    document.getElementById("consentBox")?.classList.remove("ring-2", "ring-red-500/20", "border-red-200");
  }
}

// ── Submit details ────────────────────────────────────────────────────────────
function submitDetails() {
  let ok = true;
  const isOther = STATE.details.isForOther;

  // Validation
  const errors = [];
  const nameRegex = /\d/; // Regex to check for numbers

    const fields = [
      { id: "firstName", label: "First Name" },
      { id: "lastName", label: "Last Name" },
      { id: "email", label: "Email" },
      { id: "phone", label: "Phone" }
    ];

    fields.forEach((f) => {
      const el = document.getElementById(`f_${f.id}`);
      const val = el?.value.trim();

      if (!val) {
        // If it's a hidden field (isOther is true), we don't necessarily want to show the red error box 
        // unless it's actually empty. But since they are pre-filled for logged-in users, 
        // this only happens if the user's profile is incomplete.
        if (!isOther) {
            document.getElementById(`err_${f.id}`)?.classList.add("show");
            el?.classList.add("error");
        }
        errors.push(`${f.label} is required.`);
        ok = false;
      } else {
        // Specific format checks
        if (f.id === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            if (!isOther) {
                const errEl = document.getElementById("err_email");
                if (errEl) {
                  errEl.textContent = "Please enter a valid email address.";
                  errEl.classList.add("show");
                }
                el?.classList.add("error");
            }
            errors.push("Invalid email format.");
            ok = false;
          }
        }

        if (f.id === "firstName" || f.id === "lastName") {
          if (nameRegex.test(val)) {
            if (!isOther) {
                const errEl = document.getElementById(`err_${f.id}`);
                if (errEl) {
                  errEl.textContent = `${f.label} cannot contain numbers.`;
                  errEl.classList.add("show");
                }
                el?.classList.add("error");
            }
            errors.push(`${f.label} cannot contain numbers.`);
            ok = false;
          }
        }

        if (f.id === "phone") {
          const phoneRegex = /^(09|\+639|9)\d{9}$/;
          const cleanPhone = val.replace(/\s+/g, "");
          if (!phoneRegex.test(cleanPhone)) {
            if (!isOther) {
                const errEl = document.getElementById("err_phone");
                if (errEl) {
                  errEl.textContent = "Please enter a valid phone number.";
                  errEl.classList.add("show");
                }
                el?.classList.add("error");
            }
            errors.push("Invalid phone number.");
            ok = false;
          }
        }
      }
    });

  if (!isOther) {
    // Age validation
    const dobEl = document.getElementById("f_dob");
    if (dobEl?.value) {
        const dobDate = new Date(dobEl.value);
        const minAgeDate = new Date();
        minAgeDate.setMonth(minAgeDate.getMonth() - 6);
        if (dobDate > minAgeDate) {
            document.getElementById("err_dob")?.classList.add("show");
            dobEl.classList.add("error");
            errors.push("Patient must be at least 6 months old.");
            ok = false;
        }
    }

  } else {
    const fn = document.getElementById("f_otherFirstName");
    const ln = document.getElementById("f_otherLastName");
    const rel = document.getElementById("f_relationship");
    const ec = document.getElementById("f_emergencyContact");

    if (!fn?.value.trim()) {
      document.getElementById("err_otherFirstName")?.classList.add("show");
      fn?.classList.add("error");
      ok = false;
    }
    if (!ln?.value.trim()) {
      document.getElementById("err_otherLastName")?.classList.add("show");
      ln?.classList.add("error");
      ok = false;
    }

    if (!rel?.value.trim()) {
        document.getElementById("err_relationship")?.classList.add("show");
        rel?.classList.add("error");
        ok = false;
    }

    const oEmail = document.getElementById("f_otherEmail");
    if (oEmail?.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(oEmail.value.trim())) {
            document.getElementById("err_otherEmail")?.classList.add("show");
            oEmail.classList.add("error");
            ok = false;
        }
    }

    if (fn?.value && nameRegex.test(fn.value)) {
        document.getElementById("err_otherFirstName")?.classList.add("show");
        const errEl = document.getElementById("err_otherFirstName");
        if (errEl) errEl.textContent = "First name cannot contain numbers.";
        fn?.classList.add("error");
        ok = false;
    }
        if (ln?.value && nameRegex.test(ln.value)) {
            document.getElementById("err_otherLastName")?.classList.add("show");
            const errEl = document.getElementById("err_otherLastName");
            if (errEl) errEl.textContent = "Last name cannot contain numbers.";
            ln?.classList.add("error");
            ok = false;
        }

        // Age validation for other
        const otherDobEl = document.getElementById("f_otherDob");
        if (otherDobEl?.value) {
            const dobDate = new Date(otherDobEl.value);
            const minAgeDate = new Date();
            minAgeDate.setMonth(minAgeDate.getMonth() - 6);
            if (dobDate > minAgeDate) {
                document.getElementById("err_otherDob")?.classList.add("show");
                otherDobEl.classList.add("error");
                errors.push("Patient must be at least 6 months old.");
                ok = false;
            }
        }

    if (!ok) errors.push("Please check the patient details.");
  }

  if (!document.getElementById("f_consent")?.checked) {
    document.getElementById("err_consent")?.classList.add("show");
    document.getElementById("consentBox")?.classList.add("ring-2", "ring-red-500/20", "border-red-200");
    errors.push("Privacy policy consent is required.");
    ok = false;
  }

  if (!ok) {
    Toast.show(errors[0] || "Please check the required fields.", "danger");
    // Scroll to first error
    const firstErr = document.querySelector(".field-error.show");
    if (firstErr) {
      firstErr.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  // Save values to STATE
  STATE.details.firstName = document.getElementById("f_firstName").value;
  STATE.details.lastName = document.getElementById("f_lastName").value;
  STATE.details.email = document.getElementById("f_email").value;
  STATE.details.phone = document.getElementById("f_phone").value;
  STATE.details.sex = document.getElementById("f_sex").value;
  STATE.details.dob = document.getElementById("f_dob").value;

  STATE.details.otherFirstName = document.getElementById("f_otherFirstName").value;
  STATE.details.otherLastName = document.getElementById("f_otherLastName").value;
  STATE.details.relationship = document.getElementById("f_relationship").value;
  STATE.details.otherEmail = document.getElementById("f_otherEmail").value;
  STATE.details.otherPhone = STATE.details.phone; // Booker's phone is the primary contact
  STATE.details.otherSex = document.getElementById("f_otherSex").value;
  STATE.details.otherDob = document.getElementById("f_otherDob").value;
  STATE.details.notes = document.getElementById("f_notes").value;

  import("../appointment-nav.js").then(({ goToStep }) => goToStep(4));
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.clearErr = clearErr;
window.submitDetails = submitDetails;
window.toggleForOther = toggleForOther;
window.toggleBookingTab = toggleBookingTab;
