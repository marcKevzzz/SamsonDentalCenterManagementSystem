import { Toast, Modal } from "../ui.js";
import { signIn } from "./../profile.js";

// ── Config ─────────────────────────────────────────────────────────────────
const STEPS = {
  1: {
    label: "Personal Details",
    pct: 33,
    fields: [
      { id: "su_fn", validate: (v) => !!v, msg: "First name is required." },
      { id: "su_ln", validate: (v) => !!v, msg: "Last name is required." },
      { id: "su_dob", validate: (v) => !!v, msg: "Date of birth is required." },
      { id: "su_sex", validate: (v) => !!v, msg: "Please select your sex." },
    ],
  },
  2: {
    label: "Contact Info",
    pct: 66,
    fields: [
      {
        id: "su_email",
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        msg: "Please enter a valid email address.",
      },
      {
        id: "su_phone",
        validate: (v) => /^(09|\+639|639)\d{9}$/.test(v.replace(/\s/g, "")),
        msg: "Phone number is required.",
      },
    ],
  },
  3: {
    label: "Security",
    pct: 100,
    fields: [
      {
        id: "su_pw",
        validate: (v) => v.length >= 8,
        msg: "Password must be at least 8 characters.",
      },
      {
        id: "su_pw2",
        validate: (v) => v === document.getElementById("su_pw")?.value,
        msg: "Passwords do not match.",
      },
      {
        id: "su_consent",
        isCheckbox: true,
        validate: (_, el) => el.checked,
        msg: "You must agree to the terms to continue.",
      },
    ],
  },
};

// ── State ───────────────────────────────────────────────────────────────────
let currentStep = 1;

// ── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Step navigation
  document
    .getElementById("gostep-2")
    ?.addEventListener("click", () => goStep(2));
  document
    .getElementById("gostep-3")
    ?.addEventListener("click", () => goStep(3));
  document
    .getElementById("goback-1")
    ?.addEventListener("click", () => goStep(1));
  document
    .getElementById("goback-2")
    ?.addEventListener("click", () => goStep(2));

  // Final submit
  document
    .getElementById("create-acc-btn")
    ?.addEventListener("click", handleSignUp);

  document.getElementById("signinForm")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default form submission
      document.getElementById("signin-btn")?.click();
    }
  });

  document
    .getElementById("signin-btn")
    ?.addEventListener("click", handleSignIn);

  // Password strength
  const passwordInput = document.getElementById("su_pw");
  if (passwordInput) {
    passwordInput.addEventListener("input", (e) => {
      clearErr("su_pw");
      renderStrength(e.target.value);
    });
  }

  // Auto-clear errors on input
  document
    .querySelectorAll(".auth-input")
    .forEach((el) => el.addEventListener("input", () => clearErr(el.id)));
  document
    .getElementById("su_consent")
    ?.addEventListener("change", function () {
      if (this.checked) clearErr("su_consent");
    });

  // Password visibility toggles
  document.querySelectorAll(".check-pw").forEach((btn) =>
    btn.addEventListener("click", function () {
      togglePw(this.dataset.input, this);
    }),
  );

  // Phone sanitiser
  const phoneInput = document.getElementById("su_phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^\d+]/g, "");
      if (this.value.startsWith("09") && this.value.length > 11)
        this.value = this.value.slice(0, 11);
    });
  }
});

// ── Navigation ──────────────────────────────────────────────────────────────
function goStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;

  currentStep = n;

  [1, 2, 3].forEach((i) =>
    document.getElementById(`step${i}`)?.classList.toggle("hidden", i !== n),
  );

  updateProgressVisuals(n);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgressVisuals(n) {
  // Progress bar
  document.getElementById("stepBar").style.width = STEPS[n].pct + "%";

  // Dots
  [1, 2, 3].forEach((i) => {
    const dot = document.getElementById(`step_dot_${i}`);
    if (!dot) return;
    dot.style.background = i <= n ? "#1E40AF" : "#e5e7eb";
    dot.style.width = i === n ? "20px" : "8px";
  });

  // Left-panel indicators
  [1, 2, 3].forEach((i) => {
    const el = document.getElementById(`lp_step${i}`);
    if (!el) return;
    const active = i === n || i < n;
    el.className = `w-8 h-8 rounded-full flex items-center justify-center shrink-0
      font-body text-[0.75rem] font-bold transition-all duration-300
      ${active ? "bg-primary text-white" : "bg-white/10 text-white/40"}`;
  });

  // Step label
  document.getElementById("stepLabel").textContent =
    `Step ${n} of 3 — ${STEPS[n].label}`;
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateStep(step) {
  let ok = true;

  for (const field of STEPS[step].fields) {
    const el = document.getElementById(field.id);
    const val = el?.value?.trim() ?? "";
    const passes = field.validate(val, el);
    if (!passes) {
      showErr(field.id, field.msg);
      ok = false;
    }
  }

  if (!ok) Toast.show("Please correct the highlighted fields.", "warning");
  return ok;
}

// ── Final Submission ─────────────────────────────────────────────────────────
function handleSignUp() {
  if (!validateStep(3)) return;

  Modal.open({
    title: "Confirm Registration",
    message:
      "By confirming, you agree to create a patient account at Samson Dental Center. Would you like to proceed?",
    type: "info",
    confirmText: "Yes, Create Account",
    onConfirm: async () => {
      try {
        const form = document.getElementById("signup-form");
        const token = document.querySelector(
          'input[name="__RequestVerificationToken"]',
        )?.value;

        const res = await fetch(form.action || window.location.pathname, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            RequestVerificationToken: token ?? "",
          },
          body: new URLSearchParams(new FormData(form)),
        });

        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
          console.log(`${key}: ${value}`);
        }

        const json = await res.json();

        if (!json.ok) {
          Toast.show(json.errors?.[0] ?? "Registration failed.", "danger");
          return;
        }
        if (json.user) {
          signIn(json.user); // Run your fancy GSAP/UI update
        }
        Toast.show("Welcome! Please check your email to verify.", "success");
        setTimeout(() => (window.location.href = "../"), 2000);
      } catch (err) {
        Toast.show("An unexpected error occurred.", "danger");
      }
    },
  });
}

async function handleSignIn() {
  const signinForm = document.getElementById("signinForm");
  const signinBtn = document.getElementById("signin-btn");

  clearErr("si_email");
  clearErr("si_pw");

  const email = document.getElementById("si_email")?.value.trim() || "";
  const password = document.getElementById("si_pw")?.value.trim() || "";

  if (!email || !password) {
    if (!email) showErr("si_email", "Email is required.");
    if (!password) showErr("si_pw", "Password is required.");
    return;
  }

  // 1. UI Loading State
  const originalBtnText = signinBtn.innerHTML;
  signinBtn.disabled = true;
  signinBtn.innerHTML = `<span class="animate-pulse">Signing in...</span>`;

  // 2. Prepare Data (Match the 'Input.' prefix for C# Binding)
  const formData = new FormData(signinForm);

  const rememberMeEl = document.getElementById("rememberMe");
  const isRemembered = rememberMeEl ? rememberMeEl.checked : false;
  formData.set("rememberMe", isRemembered ? "true" : "false");

  // if (!form.checkValidity()) {
  //   form.reportValidity();
  //   return;
  // }

  try {
    const response = await fetch("/sign-in", {
      method: "POST",
      body: formData,
      headers: {
        RequestVerificationToken: document.querySelector(
          'input[name="__RequestVerificationToken"]',
        ).value,
      },
    });

    const result = await response.json();

    if (result.ok) {
      // 3. Success! Redirect to Dashboard
      if (result.user) {
        signIn(result.user);
      }
      console.log(result);
      Toast.show("Welcome back!", "success");
      setTimeout(() => {
        window.location.href = "/"; // Go to site root
      }, 2000);
    } else {
      // 4. Handle Errors (Show a toast or label)
      Toast.show(result.errors[0] || "Login failed", "danger");
      resetBtn(signinBtn, originalBtnText);
    }
  } catch (err) {
    Toast.show(err.message, "danger");
    resetBtn(signinBtn, originalBtnText);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function showErr(id, msg) {
  const errEl = document.getElementById(`err_${id}`);
  const inputEl = document.getElementById(id);

  // Use optional chaining or explicit null checks
  if (errEl) {
    if (msg) errEl.textContent = msg;
    errEl.classList.add("show");
  }

  // CRITICAL: Ensure inputEl exists before touching classList
  if (inputEl) {
    inputEl.classList.add("has-error");
    if (id === "su_consent") {
      inputEl.classList.add("ring-1", "ring-red-500");
    }
  }
}

function clearErr(id) {
  // Safe way to remove classes only if the element is found
  const errEl = document.getElementById(`err_${id}`);
  const inputEl = document.getElementById(id);

  errEl?.classList.remove("show");
  inputEl?.classList.remove("has-error");

  if (id === "su_consent" && inputEl) {
    inputEl.classList.remove("ring-1", "ring-red-500");
  }
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isPw = inp.type === "password";
  inp.type = isPw ? "text" : "password";
  btn.querySelector(".eye-show").classList.toggle("hidden", isPw);
  btn.querySelector(".eye-hide").classList.toggle("hidden", !isPw);
}

function renderStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const colors = ["#c0392b", "#f59e0b", "#3b82f6", "#059669"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  [1, 2, 3, 4].forEach((i) => {
    document.getElementById(`sb${i}`).style.background =
      i <= score ? colors[score - 1] : "#e5e7eb";
  });

  const lbl = document.getElementById("strengthLabel");
  lbl.textContent = pw ? labels[score - 1] : "";
  lbl.style.color = pw ? colors[score - 1] : "";
}

function resetBtn(btn, text) {
  btn.disabled = false;
  btn.innerHTML = text;
}
