function handleSignIn(e) {
  e.preventDefault();
  let ok = true;
  const email = document.getElementById("si_email").value.trim();
  const pass = document.getElementById("si_password").value;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr("si_email");
    ok = false;
  }
  if (!pass) {
    showErr("si_password");
    ok = false;
  }
  if (ok) window.location.href = "../"; // TODO: connect auth API
}
function showErr(id) {
  document.getElementById("err_" + id)?.classList.add("show");
  document.getElementById(id)?.classList.add("has-error");
}
function clearErr(id) {
  document.getElementById("err_" + id)?.classList.remove("show");
  document.getElementById(id)?.classList.remove("has-error");
}
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  const hidden = inp.type === "password";
  inp.type = hidden ? "text" : "password";
  btn.querySelector(".eye-show").classList.toggle("hidden", hidden);
  btn.querySelector(".eye-hide").classList.toggle("hidden", !hidden);
}

let currentStep = 1;

/* ── Step navigation ── */
function goStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;
  currentStep = n;

  ["step1", "step2", "step3"].forEach((id, i) => {
    document.getElementById(id).classList.toggle("hidden", i + 1 !== n);
  });

  // Progress bar
  const pct = n === 1 ? 33 : n === 2 ? 66 : 100;
  document.getElementById("stepBar").style.width = pct + "%";

  // Dots
  ["step_dot_1", "step_dot_2", "step_dot_3"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.style.background = i + 1 <= n ? "#c0392b" : "#e5e7eb";
    el.style.width = i + 1 === n ? "20px" : "8px";
    el.style.borderRadius = "9999px";
  });

  // Left panel step indicators
  ["lp_step1", "lp_step2", "lp_step3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const done = i + 1 < n;
    const active = i + 1 === n;
    el.style.background = done
      ? "#c0392b"
      : active
        ? "#c0392b"
        : "rgba(255,255,255,0.1)";
    el.style.color = active || done ? "#fff" : "rgba(255,255,255,0.4)";
    el.nextElementSibling.querySelector(":first-child").style.color =
      active || done ? "#fff" : "rgba(255,255,255,0.5)";
  });

  // Label
  const labels = ["Personal Details", "Contact Info", "Security"];
  document.getElementById("stepLabel").textContent =
    `Step ${n} of 3 — ${labels[n - 1]}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── Validate per step ── */
function validateStep(step) {
  let ok = true;
  if (step === 1) {
    if (!v("su_fn")) ok = false;
    if (!v("su_ln")) ok = false;
    if (!v("su_dob")) ok = false;
    if (!v("su_sex")) ok = false;
  } else if (step === 2) {
    const email = document.getElementById("su_email").value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErr("su_email");
      ok = false;
    }
    if (!v("su_phone")) ok = false;
  } else if (step === 3) {
    const pw = document.getElementById("su_pw").value;
    const pw2 = document.getElementById("su_pw2").value;
    if (!pw || pw.length < 8) {
      showErr("su_pw");
      ok = false;
    } else if (pw !== pw2) {
      showErr("su_pw2");
      ok = false;
    }
    if (!document.getElementById("su_consent").checked) {
      showErr("su_consent");
      ok = false;
    }
  }
  return ok;
}

function v(id) {
  const val = document.getElementById(id)?.value?.trim();
  if (!val) {
    showErr(id);
    return false;
  }
  return true;
}

function handleSignUp() {
  if (!validateStep(3)) return;
  // TODO: connect to your auth API
  window.location.href = "index.html";
}

/* ── Password strength ── */
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const colors = ["#c0392b", "#f59e0b", "#3b82f6", "#059669"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const barIds = ["sb1", "sb2", "sb3", "sb4"];

  barIds.forEach((id, i) => {
    const el = document.getElementById(id);
    el.style.background = i < score ? colors[score - 1] : "#e5e7eb";
  });

  const lbl = document.getElementById("strengthLabel");
  lbl.textContent = pw ? (labels[score - 1] ?? "") : "";
  lbl.style.color = score > 0 ? colors[score - 1] : "#6b7280";
}

function clearErr(id) {
  document.getElementById("err_" + id)?.classList.remove("show");
  document.getElementById(id)?.classList.remove("has-error");
  if (id === "su_consent")
    document.getElementById("consentBox").style.outline = "";
}
