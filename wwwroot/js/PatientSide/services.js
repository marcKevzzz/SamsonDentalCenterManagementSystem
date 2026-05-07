/* ── DOM Elements ── */
const svcSearch = document.getElementById("svcSearch");
const categoryTabs = document.querySelectorAll(".acat-tab");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const sectionIds = {
  "General Dentistry": "section-general",
  Cosmetic: "section-cosmetic",
  Specialized: "section-specialized",
};

/* ── Initialization ── */
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  initAnimations();
});

function initAnimations() {
  // Hero section reveal
  gsap.fromTo(
    ".service-reveal h1, .service-reveal p",
    { autoAlpha: 0, y: 30 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 1.5,
      delay: 1,
      stagger: 0.25,
      ease: "expo.out",
      onComplete: function () {
        this.targets().forEach((el) => el.classList.add("revealed"));
        gsap.set(this.targets(), { clearProps: "all" });
      },
    },
  );

  // Reveal Category Sections
  ["#section-general", "#section-cosmetic", "#section-specialized"].forEach(
    (id) => {
      const section = document.querySelector(id);
      if (!section) return;

      // Header reveal
      gsap.fromTo(
        section.querySelector(".reveal-up"),
        { autoAlpha: 0, x: -30 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 1,
          delay: 0.25,
          ease: "expo.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            once: true,
          },
          onComplete: function () {
            const el = section.querySelector(".reveal-up");
            if (el) {
              el.classList.add("revealed");
              gsap.set(el, { clearProps: "all" });
            }
          },
        },
      );

      // Cards reveal (staggered)
      gsap.fromTo(
        section.querySelectorAll(".service-card-item"),
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          delay: 0.25,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            once: true,
          },
          onComplete: function () {
            this.targets().forEach((el) => el.classList.add("revealed"));
            gsap.set(this.targets(), { clearProps: "all" });
          },
        },
      );
    },
  );
}

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
  const sectionKeys = Object.keys(sectionIds);

  if (cat === "all") {
    sectionKeys.forEach((key) => {
      const el = document.getElementById(sectionIds[key]);
      if (el) el.style.display = "";
    });
    // Reset hidden cards
    document
      .querySelectorAll(".service-card-item")
      .forEach((el) => el.classList.remove("hidden-card"));
  } else {
    sectionKeys.forEach((key) => {
      const el = document.getElementById(sectionIds[key]);
      if (el) el.style.display = key === cat ? "" : "none";
    });
  }

  // Refresh ScrollTrigger to recalculate positions after layout change
  if (typeof ScrollTrigger !== "undefined") {
    setTimeout(() => ScrollTrigger.refresh(), 50);
  }

  // 3. UI: Scroll to target
  if (cat !== "all" && sectionIds[cat]) {
    const targetEl = document.getElementById(sectionIds[cat]);
    if (targetEl) {
      setTimeout(() => {
        window.scrollTo({
          top: targetEl.offsetTop - 140, // Offset for sticky header
          behavior: "smooth",
        });
      }, 100);
    }
  }

  // Clear search input when switching categories for better UX
  if (svcSearch) svcSearch.value = "";
  document.getElementById("noResults")?.classList.add("hidden");
}

/* ── Search Logic ── */
function searchServices(val) {
  const query = val.toLowerCase().trim();
  const allItems = document.querySelectorAll(".service-card-item");
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
      ...section.querySelectorAll(".service-card-item"),
    ].some((card) => !card.classList.contains("hidden"));

    section.style.display = visibleInThisSection || query === "" ? "" : "none";
  });

  // Refresh ScrollTrigger to recalculate positions after layout change
  if (typeof ScrollTrigger !== "undefined") {
    setTimeout(() => ScrollTrigger.refresh(), 50);
  }

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
