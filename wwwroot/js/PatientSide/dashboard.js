window.disableNavScroll = true;
toggleNavbar(true);

document.querySelectorAll(".fade-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("animate"), i * 100);
});

/* Animate progress bars + score ring after a short delay */
setTimeout(() => {
  document.querySelectorAll(".prog-fill[data-width]").forEach((el) => {
    el.style.width = el.dataset.width;
  });
  const ring = document.getElementById("scoreRing");
  if (ring) ring.style.strokeDashoffset = "33"; /* 220 * (1 - 0.85) = 33 */
}, 400);
