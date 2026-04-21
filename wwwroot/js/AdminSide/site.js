import { Modal, Toast } from "../ui.js";

document.addEventListener("DOMContentLoaded", () => {
  const signoutBtn = document.getElementById("signoutBtn");
  signoutBtn.addEventListener("click", () =>
    Modal.open({
      title: "Confirm Sign Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign Out",
      type: "danger",
      cancelText: "Cancel",
      onConfirm: () => {
        signout();
      },
    }),
  );

  // Close sidebar on outside click (mobile)
  document.getElementById("overlay").addEventListener("click", closeSidebar);

  const toggleBtn = document.getElementById("toggle-btn");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);

  const openSidebarBtn = document.getElementById("openSidebarBtn");
  if (openSidebarBtn) openSidebarBtn.addEventListener("click", openSidebar);
});

document.getElementById("cur-date").textContent = new Date().toLocaleDateString(
  "en-PH",
  { month: "short", day: "numeric", year: "numeric" },
);

let sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

const SIDEBAR_EXPANDED = "w-[256px]";
const SIDEBAR_COLLAPSED = "w-[68px]";

const pageTitles = {
  dashboard: ["Dashboard", "Overview · Today"],
  patients: ["Patients", "People · Registry"],
  doctors: ["Doctors", "People · Staff Directory"],
  users: ["Users", "People · User Management"],
  appointments: ["Appointments", "Operations · Schedule"],
  services: ["Services", "Operations · Catalog"],
  reports: ["Reports", "Analytics · Insights"],
  inquiries: ["Inquiries", "Analytics · Messages"],
  activitylogs: ["Activity Logs", "Analytics · Audit Trail"], // Match the URL slug
};

function UpdateSidebar() {
  applySidebarState();

  const currentPath = window.location.pathname.toLowerCase();

  function setActive(id) {
    document.getElementById(id)?.classList.add("active");
  }

  if (currentPath === "/admin" || currentPath === "/admin/dashboard") {
    setActive("admin-dashboard");
  } else if (currentPath.startsWith("/admin/patients")) {
    setActive("admin-patients");
  } else if (currentPath.startsWith("/admin/doctors")) {
    setActive("admin-doctors");
  } else if (currentPath.startsWith("/admin/users")) {
    setActive("admin-users");
  } else if (currentPath.startsWith("/admin/appointments")) {
    setActive("admin-appointments");
  } else if (currentPath.startsWith("/admin/services")) {
    setActive("admin-services");
  } else if (currentPath.startsWith("/admin/reports")) {
    setActive("admin-reports");
  } else if (currentPath.startsWith("/admin/inquiries")) {
    setActive("admin-inquiries");
  } else if (currentPath.startsWith("/admin/activitylogs")) {
    setActive("admin-activitylogs");
  }
  updateHeader(currentPath.split("/").pop() || "dashboard");
}

UpdateSidebar();

function updateHeader(pageId) {
  const t = pageTitles[pageId] || [
    pageId.charAt(0).toUpperCase() + pageId.slice(1),
    "",
  ];
  const titleEl = document.getElementById("page-title");
  const breadcrumbEl = document.getElementById("page-breadcrumb");

  if (titleEl) titleEl.textContent = t[0];
  if (breadcrumbEl) breadcrumbEl.textContent = t[1];
}
function applySidebarState() {
  const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  const root = document.documentElement;

  root.classList.toggle("sb-collapsed", isCollapsed);
}
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem("sidebarCollapsed", sidebarCollapsed);

  document.documentElement.classList.toggle("sb-collapsed", sidebarCollapsed);
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

    applySidebarState();

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

function signout() {
  localStorage.removeItem("sb_user");
  window.location.href = "/signout"; // Use an absolute path for reliability
}
