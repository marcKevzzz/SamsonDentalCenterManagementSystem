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
