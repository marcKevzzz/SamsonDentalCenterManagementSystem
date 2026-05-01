import { Toast, Modal } from "../ui.js";

document.querySelectorAll(".fade-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("animate"), i * 100);
});

// document.addEventListener("DOMContentLoaded", async () => {
//   const {
//     data: { session },
//   } = await supabase.auth.getSession();

//   if (!session) {
//     window.location.href = "/auth/login";
//     return;
//   }

//   const res = await fetch("/api/profile/me", {
//     headers: {
//       Authorization: `Bearer ${session.access_token}`,
//     },
//   });

//   if (!res.ok) {
//     window.location.href = "/auth/login";
//     return;
//   }

//   const profile = await res.json();
//   console.log(profile);
// });

/* Animate progress bars + score ring after a short delay */
setTimeout(() => {
  document.querySelectorAll(".prog-fill[data-width]").forEach((el) => {
    el.style.width = el.dataset.width;
  });
  const ring = document.getElementById("scoreRing");
  if (ring) ring.style.strokeDashoffset = "33"; /* 220 * (1 - 0.85) = 33 */
}, 400);

document.getElementById("getDirections").addEventListener("click", () => {
  Toast.show("Action confirmed!", "success");
});
document.getElementById("viewAll").addEventListener("click", () => {
  Modal.open({
    title: "Delete Record",
    message: "This action cannot be undone.",
    type: "info",
    confirmText: "Delete",
    onConfirm: () => {
      Toast.show("Deleted successfully", "success");
    },
  });
});

/* Shadow Profile Logic */
document.addEventListener("DOMContentLoaded", async () => {
  const banner = document.getElementById("claim-records-banner");
  const btnClaim = document.getElementById("btn-claim-records");

  if (!banner || !btnClaim) return;

  try {
    // Check for shadow profiles
    const res = await fetch("/api/patient/data/check-shadow", {
      method: "GET"
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.hasShadowProfiles) {
        banner.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Error checking shadow profiles:", err);
  }

  // Handle claim button click
  btnClaim.addEventListener("click", async () => {
    btnClaim.disabled = true;
    btnClaim.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Claiming...';

    try {
      const res = await fetch("/api/patient/data/claim-records", {
        method: "POST"
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        Toast.show("Records successfully claimed!", "success");
        banner.classList.add("hidden");
        // Reload page to show the new appointments
        setTimeout(() => window.location.reload(), 1500);
      } else {
        Toast.show(data.error || "Failed to claim records.", "error");
        btnClaim.disabled = false;
        btnClaim.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Claim Records';
      }
    } catch (err) {
      console.error(err);
      Toast.show("A network error occurred.", "error");
      btnClaim.disabled = false;
      btnClaim.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Claim Records';
    }
  });
});

