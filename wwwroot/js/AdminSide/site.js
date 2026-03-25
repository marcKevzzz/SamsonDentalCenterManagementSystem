document.getElementById("cur-date").textContent = new Date().toLocaleDateString(
  "en-PH",
  { month: "short", day: "numeric", year: "numeric" },
);

const pageTitles = {
  dashboard: ["Dashboard", "Overview · Today"],
  patients: ["Patients", "People · Registry"],
  doctors: ["Doctors", "People · Staff Directory"],
  appointments: ["Appointments", "Operations · Schedule"],
  services: ["Services", "Operations · Catalog"],
  reports: ["Reports", "Analytics · Insights"],
  inquiries: ["Inquiries", "Analytics · Messages"],
  activity: ["Activity Logs", "Analytics · Audit Trail"],
};

function navigate(pageId, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.remove(
      "active",
      "bg-primary",
      "shadow-[0_4px_14px_rgba(30,64,175,.35)]",
    );
  });
  if (el) {
    el.classList.add("active", "bg-primary");
  }
  const t = pageTitles[pageId] || [pageId, ""];
  document.getElementById("page-title").textContent = t[0];
  document.getElementById("page-breadcrumb").textContent = t[1];
  window.scrollTo(0, 0);
  // close on mobile
  if (window.innerWidth < 1024) closeSidebar();
}
let sidebarCollapsed = false;

const SIDEBAR_EXPANDED = "w-[256px]";
const SIDEBAR_COLLAPSED = "w-[68px]";

function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  const main = document.getElementById("main");
  const icon = document.getElementById("toggle-icon");

  if (window.innerWidth >= 1024) {
    sidebarCollapsed = !sidebarCollapsed;

    if (sidebarCollapsed) {
      sb.classList.remove(SIDEBAR_EXPANDED);
      sb.classList.add(SIDEBAR_COLLAPSED);
      sb.classList.add("collapsed");
      icon.classList.add("rotate-180");
      if (main) main.style.marginLeft = "68px";
    } else {
      sb.classList.remove(SIDEBAR_COLLAPSED);
      sb.classList.add(SIDEBAR_EXPANDED);
      sb.classList.remove("collapsed");
      icon.classList.remove("rotate-180");
      if (main) main.style.marginLeft = "256px";
    }
  } else {
    sb.classList.contains("-translate-x-full") ? openSidebar() : closeSidebar();
  }
}

function openSidebar() {
  const sb = document.getElementById("sidebar");

  sb.classList.remove("-translate-x-full");
  sb.classList.add("translate-x-0");

  document.getElementById("overlay")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  const sb = document.getElementById("sidebar");

  sb.classList.add("-translate-x-full");
  sb.classList.remove("translate-x-0");

  document.getElementById("overlay")?.classList.add("hidden");
  document.body.style.overflow = "";
}

// 🔥 FIX: Consistent resize handling
window.addEventListener("resize", () => {
  const sb = document.getElementById("sidebar");
  const main = document.getElementById("main");

  if (window.innerWidth >= 1024) {
    // Desktop mode
    sb.classList.remove("-translate-x-full");
    sb.classList.add("translate-x-0");

    if (sidebarCollapsed) {
      sb.classList.remove(SIDEBAR_EXPANDED);
      sb.classList.add(SIDEBAR_COLLAPSED);
      if (main) main.style.marginLeft = "68px";
    } else {
      sb.classList.remove(SIDEBAR_COLLAPSED);
      sb.classList.add(SIDEBAR_EXPANDED);
      if (main) main.style.marginLeft = "256px";
    }

    document.getElementById("overlay")?.classList.add("hidden");
    document.body.style.overflow = "";
  } else {
    // Mobile mode
    sb.classList.remove(SIDEBAR_COLLAPSED);
    sb.classList.add(SIDEBAR_EXPANDED);

    if (main) main.style.marginLeft = "0";

    closeSidebar();
  }
});
