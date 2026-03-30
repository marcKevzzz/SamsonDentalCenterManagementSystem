document.addEventListener("DOMContentLoaded", () => {
  // Set default tab
  document.querySelectorAll(".tab-btn")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  document
    .getElementById("newPw")
    ?.addEventListener("input", (e) => checkStrength(e.target.value));

  initAvatarActions();
  initSecurity();
});

function switchTab(name) {
  ["personal", "contact", "security"].forEach((t) => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tab-btn-" + t);
    if (t === name) {
      panel.classList.remove("hidden");
      btn.classList.remove("text-muted", "border-transparent");
      btn.classList.add("text-primary", "border-primary");
    } else {
      panel.classList.add("hidden");
      btn.classList.remove("text-primary", "border-primary");
      btn.classList.add("text-muted", "border-transparent");
    }
  });
}

function previewAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("avatarCircle").innerHTML =
      `<img src="${ev.target.result}" class="avatar-img" alt="avatar"/>`;
  };
  reader.readAsDataURL(file);
}
function removeAvatar() {
  document.getElementById("avatarCircle").innerHTML = "JD";
  document.getElementById("avatarInput").value = "";
}

function initSecurity() {
  // Re-implement your togglePw logic using addEventListener
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      const isPw = input.type === "password";
      input.type = isPw ? "text" : "password";
      btn.innerHTML = isPw
        ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke-width="2" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`;
    });
  });
}

/* ── Password strength ── */
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const colorss = ["#c0392b", "#f59e0b", "#3b82f6", "#059669"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const barIds = ["s1", "s2", "s3", "s4"];

  barIds.forEach((id, i) => {
    const el = document.getElementById(id);
    el.style.background = i < score ? colorss[score - 1] : "#e5e7eb";
  });

  const lbl = document.getElementById("strengthLabel");
  lbl.textContent = pw ? (labels[score - 1] ?? "") : "";
  lbl.style.color = score > 0 ? colorss[score - 1] : "#6b7280";
}

function handlePasswordSave() {
  const np = document.getElementById("newPw").value;
  const cp = document.getElementById("confirmPw").value;
  if (!np || !cp) {
    showToast("Please fill in all fields.", true);
    return;
  }
  if (np !== cp) {
    showToast("Passwords do not match.", true);
    return;
  }
  showToast("Password updated!");
}

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.style.background = isError ? "#c0392b" : "#0f1117";
  t.style.transform = "translateY(0)";
  setTimeout(() => {
    t.style.transform = "translateY(120%)";
  }, 3000);
}

function initAvatarActions() {
  const input = document.getElementById("avatarInput");
  const trigger = document.getElementById("triggerAvatar");
  const uploadBtn = document.getElementById("uploadBtn");
  const removeBtn = document.getElementById("removeBtn");

  [trigger, uploadBtn].forEach((el) =>
    el?.addEventListener("click", () => input.click()),
  );

  input?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Preview locally
    const reader = new FileReader();
    reader.onload = (ev) => updateAvatarUI(ev.target.result);
    reader.readAsDataURL(file);

    // 2. Upload to Supabase Storage
    await uploadAvatar(file);
  });

  removeBtn?.addEventListener("click", () => removeAvatar());
}

async function uploadAvatar(file) {
  const userId = document.getElementById("settingsContainer").dataset.userid;
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Math.random()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload to 'avatars' bucket
  let { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return showToast("Upload failed", true);

  // Get Public URL
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  // Update Profile Table
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (!updateError) {
    showToast("Profile picture updated!");
    // Sync with Navbar avatar (if it has a shared class)
    document
      .querySelectorAll(".nav-profile-img")
      .forEach((img) => (img.src = publicUrl));
  }
}

function updateAvatarUI(url, name = "User") {
  const circle = document.getElementById("avatarCircle");
  if (url) {
    circle.innerHTML = `<img src="${url}" class="w-full h-full object-cover" alt="avatar"/>`;
  } else {
    circle.innerHTML = name.substring(0, 2).toUpperCase();
  }
}
