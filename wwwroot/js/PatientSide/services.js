/* ── DOM Elements ── */
const svcSearch = document.getElementById("svcSearch");
const categoryTabs = document.querySelectorAll(".acat-tab");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const sections = {
  all: null,
  "General Dentistry": document.getElementById("section-general"),
  Cosmetic: document.getElementById("section-cosmetic"),
  Specialized: document.getElementById("section-specialized"),
};

/* ── Initialization ── */
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
});

function initEvents() {
  // Tab clicks
  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => filterServices(tab.dataset.cat));
  });

  // Search input
  svcSearch?.addEventListener("input", (e) => searchServices(e.target.value));

  // Clear search button
  clearSearchBtn?.addEventListener("click", clearSearch);

  // Scroll effect for filter bar
  const filterBar = document.getElementById("filterBar");
  window.addEventListener("scroll", () => {
    if (filterBar) filterBar.classList.toggle("stuck", window.scrollY > 100);
  });
}

/* ── Category Filter ── */
function filterServices(cat) {
  // 1. UI: Update Tabs
  categoryTabs.forEach((t) =>
    t.classList.toggle("active", t.dataset.cat === cat),
  );

  // 2. Logic: Show/Hide Sections
  const sectionList = Object.keys(sections).filter((k) => k !== "all");

  if (cat === "all") {
    sectionList.forEach((key) => (sections[key].style.display = ""));
    // Reset hidden cards
    document
      .querySelectorAll(".asvc-item")
      .forEach((el) => el.classList.remove("hidden-card"));
  } else {
    sectionList.forEach((key) => {
      sections[key].style.display = key === cat ? "" : "none";
    });
  }

  // 3. UI: Scroll to target
  if (cat !== "all" && sections[cat]) {
    setTimeout(() => {
      window.scrollTo({
        top: sections[cat].offsetTop - 140, // Offset for sticky header
        behavior: "smooth",
      });
    }, 50);
  }

  // Clear search input when switching categories for better UX
  if (svcSearch) svcSearch.value = "";
  document.getElementById("noResults")?.classList.add("hidden");
}

/* ── Search Logic ── */
function searchServices(val) {
  const query = val.toLowerCase().trim();
  const allItems = document.querySelectorAll(".asvc-item");
  const allSections = document.querySelectorAll(".service-section");
  const noResults = document.getElementById("noResults");

  // 1. If searching, reset the category tabs to "All"
  if (query !== "") {
    document.querySelectorAll(".acat-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.cat === "all");
    });
  }

  let totalVisible = 0;

  // 2. Filter individual cards
  allItems.forEach((card) => {
    // We look for the name in a data-attribute or the h3 text
    const name = (
      card.dataset.name ||
      card.querySelector("h3")?.innerText ||
      ""
    ).toLowerCase();
    const matches = name.includes(query);

    card.classList.toggle("hidden", !matches); // Use 'hidden' or your 'hidden-card' class
    if (matches) totalVisible++;
  });

  // 3. Hide/Show entire sections based on if they have visible children
  allSections.forEach((section) => {
    const visibleInThisSection = [
      ...section.querySelectorAll(".asvc-item"),
    ].some((card) => !card.classList.contains("hidden"));

    section.style.display = visibleInThisSection || query === "" ? "" : "none";
  });

  // 4. Toggle Empty State
  if (noResults) {
    noResults.classList.toggle("hidden", totalVisible > 0 || query === "");
  }
}

function clearSearch() {
  if (svcSearch) svcSearch.value = "";
  searchServices("");
  filterServices("all");
}
