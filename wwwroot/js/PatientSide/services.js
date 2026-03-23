const filterBar = document.getElementById("filterBar");
window.addEventListener("scroll", () => {
  filterBar.classList.toggle("stuck", window.scrollY > 100);
});

/* ── Category filter ── */
function filterServices(cat) {
  // Update tab active state
  document.querySelectorAll(".acat-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.cat === cat);
  });

  const items = document.querySelectorAll(".asvc-item");
  const sections = [
    "section-general",
    "section-cosmetic",
    "section-specialized",
  ];

  if (cat === "all") {
    items.forEach((el) => el.classList.remove("hidden-card"));
    sections.forEach((id) => (document.getElementById(id).style.display = ""));
    document.getElementById("noResults").classList.add("hidden");
    return;
  }

  const catMap = {
    "General Dentistry": "section-general",
    Cosmetic: "section-cosmetic",
    Specialized: "section-specialized",
  };

  sections.forEach((id) => {
    document.getElementById(id).style.display =
      catMap[cat] === id ? "" : "none";
  });

  // Scroll to section
  const targetId = catMap[cat];
  if (targetId) {
    setTimeout(() => {
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

/* ── Search ── */
function searchServices(val) {
  const q = val.toLowerCase().trim();
  const items = document.querySelectorAll(".asvc-item");
  const sections = {
    general: document.getElementById("section-general"),
    cosmetic: document.getElementById("section-cosmetic"),
    specialized: document.getElementById("section-specialized"),
  };

  // Reset category filter tabs to "all"
  if (q) {
    document
      .querySelectorAll(".acat-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll('.acat-tab[data-cat="all"]')
      .forEach((t) => t.classList.add("active"));
    Object.values(sections).forEach((s) => (s.style.display = ""));
  }

  let anyVisible = false;
  items.forEach((el) => {
    const name = el.dataset.name || "";
    const cat = el.dataset.cat || "";
    const matches = !q || name.includes(q) || cat.toLowerCase().includes(q);
    el.classList.toggle("hidden-card", !matches);
    if (matches) anyVisible = true;
  });

  // Hide empty sections
  if (q) {
    ["section-general", "section-cosmetic", "section-specialized"].forEach(
      (secId) => {
        const sec = document.getElementById(secId);
        const grid = sec.querySelector('[id^="grid-"]');
        const visibleInSection =
          grid &&
          [...grid.querySelectorAll(".asvc-item")].some(
            (el) => !el.classList.contains("hidden-card"),
          );
        sec.style.display = visibleInSection ? "" : "none";
      },
    );
  }

  document
    .getElementById("noResults")
    .classList.toggle("hidden", anyVisible || !q);
}

function clearSearch() {
  document.getElementById("svcSearch").value = "";
  searchServices("");
  filterServices("all");
}
