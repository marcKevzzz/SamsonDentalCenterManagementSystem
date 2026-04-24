import { Toast, Modal } from "../ui.js";
import { setupUserDisplay } from "../profile.js";

document.addEventListener("DOMContentLoaded", () => {
  initProfileData();
  initTabs();
  initAvatarActions();
  initSecurity();
  // Set default tab

  document
    .getElementById("saveAllInfo")
    ?.addEventListener("click", saveAllInfo);

  document
    .getElementById("savePassword")
    ?.addEventListener("click", savePasswordHandler);
});

function initProfileData() {
  const userDataElement = document.getElementById("user-data");
  if (!userDataElement) return;

  const profile = JSON.parse(userDataElement.textContent);
  console.log("Profile data:", profile); // verify all fields are populated

  displayProfile(profile);
}

function displayProfile(profile) {
  // Populate Inputs
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const addressInput = document.getElementById("address");

  if (firstNameInput) firstNameInput.value = profile.firstName || "";
  if (lastNameInput) lastNameInput.value = profile.lastName || "";
  if (emailInput) emailInput.value = profile.email || "";
  if (addressInput) addressInput.value = profile.address || "";

  // Handle Avatar Logic
  // if (profile.avatarUrl) {
  //   avatarCircle.innerHTML = `<img src="${profile.avatarUrl}" class="w-full h-full object-cover" />`;
  // } else {
  //   const initials =
  //     (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "");
  //   avatarCircle.innerText = initials.toUpperCase() || "JD";
  // }

  updateAvatarUI(profile.avatarUrl);
}

function initTabs() {
  document.querySelectorAll(".tab-btn")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  document
    .getElementById("newPw")
    ?.addEventListener("input", (e) => checkStrength(e.target.value));
}

function switchTab(name) {
  ["personal", "contact", "security"].forEach((t) => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tab-btn-" + t);
    const grpBtn = document.getElementById("grpBtn");
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
  if (name === "security") {
    grpBtn.classList.add("hidden");
  } else {
    grpBtn.classList.remove("hidden");
  }
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
  Modal.open({
    title: "Remove Profile Picture",
    message:
      "Are you sure you want to remove your profile picture? This action cannot be undone.",
    type: "warning",
    confirmText: "Confirm",
    onConfirm: async () => {
      try {
        const res = await fetch("/api/settings/remove-avatar", {
          method: "DELETE",
          credentials: "include",
        });

        const text = await res.text(); // read raw first

        let result;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error("Invalid JSON response");
        }

        if (res.ok && result.ok) {
          const saved = localStorage.getItem("sb_user");
          if (saved) {
            const user = JSON.parse(saved);
            user.avatarUrl = null;
            localStorage.setItem("sb_user", JSON.stringify(user));
          }

          Toast.show("Profile avatar removed.", "success");

          setTimeout(() => {
            window.location.reload();
          }, 800);
        } else {
          throw new Error(result?.error || "Delete failed");
        }
      } catch (err) {
        Toast.show(err.message || "Unexpected error", "danger");
        throw new Error(result.value?.error ?? "Delete failed");
      }
    },
  });
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

async function savePasswordHandler() {
  const btn = document.getElementById("savePassword");
  const original = btn.textContent;

  const currentPw = document.getElementById("currentPw").value;
  const newPw = document.getElementById("newPw").value;
  const confirmPw = document.getElementById("confirmPw").value;

  if (!currentPw || !newPw || !confirmPw) {
    Toast.show("Please fill in all password fields.", "warning");
    return;
  }
  if (newPw !== confirmPw) {
    Toast.show("Passwords do not match.", "danger");
    return;
  }
  if (newPw.length < 8) {
    Toast.show("Password must be at least 8 characters.", "danger");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Updating…";

  Modal.open({
    title: "Update Password",
    message: "Are you sure you want to update your password?",
    type: "info",
    onConfirm: async () => {
      try {
        const res = await fetch("/api/settings/update-password", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: currentPw,
            newPassword: newPw,
            confirmPassword: confirmPw,
          }),
        });

        const result = await res.json();
        if (result.ok) {
          Toast.show("Password updated!", "success");
          document.getElementById("currentPw").value = "";
          document.getElementById("newPw").value = "";
          document.getElementById("confirmPw").value = "";
          checkStrength("");
        } else {
          Toast.show(result.error ?? "Update failed.", "danger");
        }
      } catch {
        Toast.show("An unexpected error occurred.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    },
  });
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

async function saveAllInfo() {
  const btn = document.getElementById("saveAllInfo");
  btn.disabled = true;

  Modal.open({
    title: "Save Changes",
    message:
      "Are you sure you want to save all changes to your profile information?",
    type: "info",
    onConfirm: async () => {
      try {
        const dob = document.getElementById("dateOfBirth").value;
        if (dob) {
          const date = new Date(dob);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date > today) {
            Toast.show("Birthday cannot be in the future.", "warning");
            btn.disabled = false;
            return;
          }
        }

        const res = await fetch("/api/settings/update-profile", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: document.getElementById("firstName").value.trim(),
            lastName: document.getElementById("lastName").value.trim(),
            dateOfBirth: document.getElementById("dateOfBirth").value || null,
            sex: document.getElementById("sex").value,
            email: document.getElementById("email").value.trim(),
            phoneNumber: document.getElementById("contactNumber").value.trim(),
            address: document.getElementById("address").value.trim(),
          }),
        });

        const text = await res.text();
        const result = text ? JSON.parse(text) : {};

        if (result.ok) {
          Toast.show("Profile saved!", "success");
        } else {
          Toast.show(result.error ?? "Save failed.", "danger");
        }
      } catch (err) {
        Toast.show("An unexpected error occurred." + err.message, "danger");
      } finally {
        btn.disabled = false;
      }
    },
  });
}

async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/settings/upload-avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        RequestVerificationToken:
          document.querySelector('input[name="__RequestVerificationToken"]')
            ?.value ?? "",
      },
    });

    if (response.status === 401) {
      Toast.show("Session expired. Please sign in again.", "danger");
      return;
    }

    if (!response.ok) {
      Toast.show("Upload failed. Try again.", "danger");
      return;
    }

    const result = await response.json();

    if (result.ok) {
      // 1. Update avatar circle on this page
      updateAvatarUI(result.url);

      // 2. Sync localStorage so navbar reflects new avatar
      const saved = localStorage.getItem("sb_user");
      if (saved) {
        const user = JSON.parse(saved);
        user.avatarUrl = result.url;
        localStorage.setItem("sb_user", JSON.stringify(user));

        // 3. Update navbar avatar immediately
        setupUserDisplay(
          `${user.firstName} ${user.lastName}`,
          user.email,
          user.initials,
          result.url,
        );
      }

      Toast.show("Profile picture updated!", "success");
    } else {
      Toast.show(result.error || "Upload failed.", "danger");
    }
  } catch (err) {
    console.error("Upload error:", err);
    Toast.show("An unexpected error occurred.", "danger");
  }
}

function updateAvatarUI(url) {
  const circle = document.getElementById("avatarCircle");
  let name = "";

  const saved = localStorage.getItem("sb_user");
  if (saved) {
    const user = JSON.parse(saved);
    name = user.initials;
  }

  if (url) {
    circle.innerHTML = `<img src="${url}" class="w-full h-full object-cover" alt="avatar"/>`;
  } else {
    circle.innerHTML = name;
  }
}
