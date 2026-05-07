import { Toast, Modal } from "../ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initProfileData();
  initTabs();
  initAvatarActions();
  initSecurity();

  document
    .getElementById("saveAllInfo")
    ?.addEventListener("click", saveAllInfo);

  document
    .getElementById("savePassword")
    ?.addEventListener("click", savePasswordHandler);
  document
    .getElementById("nextTab")
    ?.addEventListener("click", () => switchTab("contact"));

  document
    .getElementById("deactivateAccount")
    ?.addEventListener("click", deactivateAccountHandler);
});

function initProfileData() {
  const userDataElement = document.getElementById("user-data");
  if (!userDataElement) return;

  const profile = JSON.parse(userDataElement.textContent);
  displayProfile(profile);
}

function displayProfile(profile) {
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const addressInput = document.getElementById("address");

  if (firstNameInput) firstNameInput.value = profile.firstName || "";
  if (lastNameInput) lastNameInput.value = profile.lastName || "";
  if (emailInput) emailInput.value = profile.email || "";
  if (addressInput) addressInput.value = profile.address || "";

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
  const nextTabBtn = document.getElementById("nextTab");
  const saveBtn = document.getElementById("saveAllInfo");
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
  if (name === "contact") {
    nextTabBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
  } else {
    nextTabBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
  }
}

function removeAvatar() {
  Modal.open({
    title: "Remove Profile Picture",
    message: "Are you sure you want to remove your profile picture? This action cannot be undone.",
    type: "warning",
    confirmText: "Confirm",
    onConfirm: async () => {
      try {
        const res = await fetch("/api/settings/remove-avatar", {
          method: "DELETE",
          credentials: "include",
        });

        const result = await res.json();
        if (res.ok && result.ok) {
          Toast.show("Profile avatar removed.", "success");
          setTimeout(() => window.location.reload(), 800);
        } else {
          throw new Error(result?.error || "Delete failed");
        }
      } catch (err) {
        Toast.show(err.message || "Unexpected error", "danger");
      }
    },
  });
}

function initSecurity() {
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

    const reader = new FileReader();
    reader.onload = (ev) => updateAvatarUI(ev.target.result);
    reader.readAsDataURL(file);

    await uploadAvatar(file);
  });

  removeBtn?.addEventListener("click", () => removeAvatar());
}

async function saveAllInfo() {
  const btn = document.getElementById("saveAllInfo");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Saving...";

  try {
    const dob = document.getElementById("dateOfBirth").value;
    if (dob) {
      const date = new Date(dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date > today) {
        Toast.show("Birthday cannot be in the future.", "warning");
        btn.disabled = false;
        btn.innerHTML = original;
        return;
      }
    }


    const phoneNumber = document.getElementById("contactNumber").value.trim();
    if (phoneNumber && !/^09\d{9}$/.test(phoneNumber)) {
      Toast.show("Please enter a valid 11-digit phone number (e.g., 09XXXXXXXXX).", "warning");
      btn.disabled = false;
      btn.innerHTML = original;
      return;
    }

    const res = await fetch("/api/settings/update-profile", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: document.getElementById("firstName").value.trim(),
        last_name: document.getElementById("lastName").value.trim(),
        date_of_birth: document.getElementById("dateOfBirth").value || null,
        sex: document.getElementById("sex").value,
        email: document.getElementById("email").value.trim(),
        phone_number: phoneNumber,
        address: document.getElementById("address").value.trim(),
      }),
    });

    const text = await res.text();
    const result = text ? JSON.parse(text) : {};

    if (result.ok) {
      Toast.show("Profile saved!", "success");
      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      updateSidebarName(firstName, lastName);
    } else {
      Toast.show(result.error ?? "Save failed.", "danger");
    }
  } catch (err) {
    Toast.show("An unexpected error occurred: " + err.message, "danger");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
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
        RequestVerificationToken: document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? "",
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
      updateAvatarUI(result.url);
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
  if (!circle) return;
  const sidebarAvatar = document.getElementById("sidebar-user-initials");

  if (url) {
    circle.innerHTML = `<img src="${url}" class="w-full h-full object-cover" alt="avatar"/>`;
    if (sidebarAvatar) {
        sidebarAvatar.innerHTML = `<img src="${url}" class="w-full h-full object-cover rounded-full" alt="avatar"/>`;
        sidebarAvatar.classList.remove('bg-primary');
        sidebarAvatar.style.backgroundColor = "transparent";
    }
  } else {
    // Rely on reload or set initials
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const initials = (firstNameInput?.value?.[0] || "") + (lastNameInput?.value?.[0] || "");
    circle.innerHTML = initials.toUpperCase() || "S";
  }
}

function updateSidebarName(firstName, lastName) {
    const sidebarName = document.getElementById("sidebar-user-name");
    const sidebarInitials = document.getElementById("sidebar-user-initials");
    
    if (sidebarName) {
        sidebarName.innerText = `${firstName} ${lastName}`.trim();
    }
    
    // Only update initials if we don't have an image
    if (sidebarInitials && !sidebarInitials.querySelector('img')) {
        const initials = ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase();
        sidebarInitials.innerText = initials;
    }
}

async function deactivateAccountHandler() {
  Modal.open({
    title: "Deactivate Account",
    message: "Are you sure you want to deactivate your account? You will be signed out and your account will be disabled until you contact support.",
    type: "error",
    onConfirm: async () => {
      try {
        const res = await fetch("/api/settings/deactivate", {
          method: "POST",
          credentials: "include",
        });

        const result = await res.json();
        if (result.ok) {
          window.location.href = "/sign-in";
        } else {
          Toast.show(result.error || "Deactivation failed.", "danger");
        }
      } catch (err) {
        Toast.show("An unexpected error occurred.", "danger");
      }
    },
  });
}
