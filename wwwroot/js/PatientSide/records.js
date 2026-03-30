document.querySelectorAll(".fade-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("animate"), i * 90);
});

/* ── Section accordion ── */
function toggleSection(btn) {
  const body = btn.nextElementSibling;
  const chevron = btn.querySelector(".rec-chevron");
  body.classList.toggle("open");
  chevron.classList.toggle("open");
}

/* ── Tab filter ── */
function switchTab(tab) {
  document
    .querySelectorAll(".rec-tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll(".rec-section").forEach((sec) => {
    const match = tab === "all" || sec.dataset.section === tab;
    sec.style.display = match ? "" : "none";
  });
}
