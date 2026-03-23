window.disableNavScroll = true;
toggleNavbar(true);

document.querySelectorAll(".fade-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("animate"), i * 80);
});

/* ── Feedback accordion ── */
function toggleFeedback(btn) {
  const body = btn.nextElementSibling;
  const chevron = btn.querySelector(".feedback-chevron");
  const isOpen = body.classList.contains("open");

  // Close all first
  document
    .querySelectorAll(".feedback-body")
    .forEach((b) => b.classList.remove("open"));
  document
    .querySelectorAll(".feedback-chevron")
    .forEach((c) => c.classList.remove("open"));

  if (!isOpen) {
    body.classList.add("open");
    chevron.classList.add("open");
  }
}

/* ── Filter tabs ── */
function filterAppts(filter) {
  // Update active tab
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === filter);
  });

  const cards = document.querySelectorAll(".appt-card");
  let any = false;
  cards.forEach((card) => {
    const match = filter === "all" || card.dataset.status === filter;
    card.style.display = match ? "" : "none";
    if (match) any = true;
  });
  document.getElementById("noResults").classList.toggle("hidden", any);
}

/* ── Search ── */
function searchAppts(val) {
  const q = val.toLowerCase().trim();
  const cards = document.querySelectorAll(".appt-card");
  let any = false;
  cards.forEach((card) => {
    const name = card.dataset.name || "";
    const match = !q || name.includes(q);
    card.style.display = match ? "" : "none";
    if (match) any = true;
  });
  document.getElementById("noResults").classList.toggle("hidden", any || !q);
}

function clearFilters() {
  filterAppts("all");
  document.querySelector('input[type="text"]').value = "";
}
