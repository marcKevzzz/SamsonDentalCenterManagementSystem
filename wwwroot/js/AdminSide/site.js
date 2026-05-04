import { Modal, Toast } from "../ui.js";

document.addEventListener("DOMContentLoaded", () => {
  const signoutBtn = document.getElementById("signoutBtn");
  signoutBtn?.addEventListener("click", () =>
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

  const profileBtn = document.getElementById("user-profile-btn");
  const userPopup = document.getElementById("user-popup");
  const popupSignoutBtn = document.getElementById("popupSignoutBtn");

  profileBtn?.addEventListener("click", (e) => {
    if (document.documentElement.classList.contains("sb-collapsed")) {
      userPopup?.classList.toggle("hidden");
      e.stopPropagation();
    } else {
      window.location.href = "/StaffProfile";
    }
  });

  const settingsBtn = document.getElementById("settings-dropdown-btn");
  const settingsDropdown = document.getElementById("settings-dropdown");
  const settingsPopup = document.getElementById("settings-popup");
  const settingsArrow = document.getElementById("settings-arrow");

  settingsBtn?.addEventListener("click", (e) => {
    if (document.documentElement.classList.contains("sb-collapsed")) {
      settingsPopup?.classList.toggle("hidden");
      e.stopPropagation();
    } else {
      settingsDropdown?.classList.toggle("hidden");
      settingsArrow?.classList.toggle("rotate-180");
    }
  });

  const staffBtn = document.getElementById("staff-dropdown-btn");
  const staffDropdown = document.getElementById("staff-dropdown");
  const staffPopup = document.getElementById("staff-popup");
  const staffArrow = document.getElementById("staff-arrow");

  staffBtn?.addEventListener("click", (e) => {
    if (document.documentElement.classList.contains("sb-collapsed")) {
      staffPopup?.classList.toggle("hidden");
      e.stopPropagation();
    } else {
      staffDropdown?.classList.toggle("hidden");
      staffArrow?.classList.toggle("rotate-180");
    }
  });

  document.addEventListener("click", (e) => {
    const userPopup = document.getElementById("user-popup");
    const settingsPopup = document.getElementById("settings-popup");
    const staffPopup = document.getElementById("staff-popup");
    const settingsBtn = document.getElementById("settings-dropdown-btn");
    const staffBtn = document.getElementById("staff-dropdown-btn");

    if (userPopup && !userPopup.contains(e.target)) {
      userPopup.classList.add("hidden");
    }
    if (settingsPopup && !settingsPopup.contains(e.target) && !settingsBtn?.contains(e.target)) {
      settingsPopup.classList.add("hidden");
    }
    if (staffPopup && !staffPopup.contains(e.target) && !staffBtn?.contains(e.target)) {
      staffPopup.classList.add("hidden");
    }
  });

  popupSignoutBtn?.addEventListener("click", () => {
    Modal.open({
      title: "Confirm Sign Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign Out",
      type: "danger",
      cancelText: "Cancel",
      onConfirm: () => {
        signout();
      },
    });
  });

  // Close sidebar on outside click (mobile)
  document.getElementById("overlay")?.addEventListener("click", closeSidebar);

  const toggleBtn = document.getElementById("toggle-btn");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);

  const openSidebarBtn = document.getElementById("openSidebarBtn");
  if (openSidebarBtn) openSidebarBtn.addEventListener("click", openSidebar);

  // Sidebar Scroll Persistence
  const sidebarNav = document.getElementById("sidebar-nav");
  if (sidebarNav) {
    // 1. Restore scroll position with a slight delay to allow layout
    const savedScroll = localStorage.getItem("sidebarScrollTop");
    if (savedScroll) {
      requestAnimationFrame(() => {
        sidebarNav.scrollTop = parseInt(savedScroll, 10);
        // Double check after another frame for dynamic content
        requestAnimationFrame(() => {
            sidebarNav.scrollTop = parseInt(savedScroll, 10);
        });
      });
    }

    // 2. Save scroll position on scroll
    sidebarNav.addEventListener("scroll", () => {
      localStorage.setItem("sidebarScrollTop", sidebarNav.scrollTop);
    }, { passive: true });

    // 3. Save on click to ensure it's captured before navigation
    sidebarNav.addEventListener("click", () => {
      localStorage.setItem("sidebarScrollTop", sidebarNav.scrollTop);
    });
  }
});

function closeAllDropdowns() {
  const staffDropdown = document.getElementById("staff-dropdown");
  const staffArrow = document.getElementById("staff-arrow");
  const settingsDropdown = document.getElementById("settings-dropdown");
  const settingsArrow = document.getElementById("settings-arrow");
  const userPopup = document.getElementById("user-popup");
  const staffPopup = document.getElementById("staff-popup");
  const settingsPopup = document.getElementById("settings-popup");

  staffDropdown?.classList.add("hidden");
  staffArrow?.classList.remove("rotate-180");
  settingsDropdown?.classList.add("hidden");
  settingsArrow?.classList.remove("rotate-180");
  userPopup?.classList.add("hidden");
  staffPopup?.classList.add("hidden");
  settingsPopup?.classList.add("hidden");
}

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
  receptionists: ["Receptionists", "People · Receptionists Directory"],
  users: ["Users", "People · User Management"],
  appointments: ["Appointments", "Operations · Schedule"],
  blockeddates: ["Blocked Dates", "Operations · Date Restrictions"],
  invoices: ["Treatments", "Operations · Treatments"],
  services: ["Services", "Operations · Catalog"],
  availability: ["Availability", "Operations · Leaves"],
  transactions: ["Billing", "Operations · Billing"],
  reports: ["Reports", "Analytics · Insights"],
  inquiries: ["Inquiries", "Analytics · Messages"],
  activitylogs: ["Activity Logs", "Analytics · Audit Trail"],
  reviews: ["Reviews", "Control · Feedback"],
  settings: ["Settings", "Control · Settings"],
};

function UpdateSidebar() {
  applySidebarState();

  const currentPath = window.location.pathname.toLowerCase();

  function setActive(id) {
    document.getElementById(id)?.classList.add("active");
  }

  if (currentPath === "/admin" || currentPath === "/admin/dashboard" || currentPath === "/doctor/dashboard" || currentPath === "/receptionist/dashboard") {
    setActive("admin-dashboard");
  } else if (currentPath.startsWith("/admin/patients") || currentPath.startsWith("/doctor/patients") || currentPath.startsWith("/receptionist/patients")) {
    setActive("admin-patients");
  } else if (currentPath.startsWith("/admin/doctors")) {
    setActive("admin-doctors");
  } else if (currentPath.startsWith("/admin/users")) {
    setActive("admin-users");
  } else if (currentPath.startsWith("/admin/appointments") || currentPath.startsWith("/doctor/appointments") || currentPath.startsWith("/receptionist/appointments")) {
    setActive("admin-appointments");
  } else if (currentPath.startsWith("/admin/blockeddates")) {
    setActive("admin-blocked-dates");
  } else if (currentPath.startsWith("/admin/treatments") || currentPath.startsWith("/doctor/treatments") || currentPath.startsWith("/receptionist/treatments")) {
    setActive("admin-invoices");
  } else if (currentPath.startsWith("/admin/services")) {
    setActive("admin-services-link");
  } else if (currentPath.startsWith("/admin/availability") || currentPath.startsWith("/doctor/availability") || currentPath.startsWith("/receptionist/availability")) {
    setActive("staff-availability");
  } else if (currentPath.startsWith("/admin/billing") || currentPath.startsWith("/receptionist/billing")) {
    setActive("admin-transactions");
  } else if (currentPath.startsWith("/admin/reviews")) {
    setActive("admin-reviews");
  } else if (currentPath.startsWith("/admin/reports") || currentPath.startsWith("/doctor/reports") || currentPath.startsWith("/receptionist/reports")) {
    setActive("admin-reports");
  } else if (currentPath.startsWith("/admin/inquiries") || currentPath === "/receptionist/inquiries") {
    setActive("admin-inquiries");
  } else if (currentPath.startsWith("/admin/activitylogs") || currentPath.startsWith("/receptionist/activitylogs") || currentPath === "/doctor/activitylogs") {
    setActive("admin-activitylogs");
  } else if (currentPath.startsWith("/admin/staff")) {
    setActive("staff-dropdown-btn");
  }

  // Notification Badges Logic
  async function updateNotificationBadges() {
    try {
      const res = await fetch('/api/admin/data/counts');
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        
        updateBadge('notif-appointments-count', d.pendingAppointments);
        updateBadge('notif-inquiries-count', d.unreadInquiries);
        updateBadge('notif-leaves-count', d.pendingLeaves);
        updateBadge('notif-reviews-count', d.pendingReviews);
        updateBadge('notif-patients-count', d.totalPatients);
        updateBadge('notif-staff-count', d.totalStaff);
        updateBadge('notif-services-count', d.totalServices);
      }
    } catch (e) {
      console.error("Failed to update badges:", e);
    }
  }

  function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) {
      badge.innerText = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  updateNotificationBadges();
  setInterval(updateNotificationBadges, 30000); // 30s refresh

  window.addEventListener('admin:appointments:updated', updateNotificationBadges);
  window.addEventListener('admin:inquiries:updated', updateNotificationBadges);

  if (currentPath.startsWith("/admin/staff")) {
    // Keep dropdown open if not collapsed
    if (!document.documentElement.classList.contains("sb-collapsed")) {
       document.getElementById("staff-dropdown")?.classList.remove("hidden");
       document.getElementById("staff-arrow")?.classList.add("rotate-180");
    }
    // Highlight the active sub-link
    const staffLinks = document.querySelectorAll("#staff-dropdown a, #staff-popup a");
    staffLinks.forEach(link => {
      if (link.getAttribute("href").toLowerCase() === currentPath) {
        link.classList.add("text-white", "bg-white/10");
        link.classList.remove("text-white/60");
      }
    });
  } else if (currentPath.startsWith("/admin/settings")) {
    setActive("settings-dropdown-btn");
    // Also keep dropdown open if not collapsed
    if (!document.documentElement.classList.contains("sb-collapsed")) {
       document.getElementById("settings-dropdown")?.classList.remove("hidden");
       document.getElementById("settings-arrow")?.classList.add("rotate-180");
    }
    
    // Highlight sub-link
    const settingsLinks = document.querySelectorAll("#settings-dropdown a, #settings-popup a");
    settingsLinks.forEach(link => {
      if (link.getAttribute("href").toLowerCase() === currentPath) {
        link.classList.add("text-white", "bg-white/10");
        link.classList.remove("text-white/60");
      }
    });
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
  closeAllDropdowns();
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

  sb?.classList.add("-translate-x-full");
  sb?.classList.remove("translate-x-0");

  document.getElementById("overlay")?.classList.add("hidden");
  document.body.style.overflow = "";

  // Close any open dropdowns when sidebar is hidden
  closeAllDropdowns();
}

// 🔥 FIX: Consistent resize handling
window.addEventListener("resize", () => {
  const sb = document.getElementById("sidebar");
  const main = document.getElementById("main");
  const header = document.querySelector("header");

  if (window.innerWidth >= 1024) {
    // Desktop mode
    sb?.classList.remove("-translate-x-full");
    sb?.classList.add("translate-x-0");

    // Restore sidebar state (collapsed/expanded)
    applySidebarState();

    document.getElementById("overlay")?.classList.add("hidden");
    document.body.style.overflow = "";
    
    // Clear any manual mobile styles
    if (main) main.style.marginLeft = "";
    if (header) {
        header.style.left = "";
        header.style.width = "";
    }
  } else {
    // Mobile mode
    // Always remove sb-collapsed on mobile to prevent width issues
    document.documentElement.classList.remove("sb-collapsed");
    
    if (sb) {
        sb.classList.remove(SIDEBAR_COLLAPSED);
        sb.classList.add(SIDEBAR_EXPANDED);
    }

    if (main) main.style.marginLeft = "0";
    if (header) {
        header.style.left = "0";
        header.style.width = "100%";
    }

    closeSidebar();
  }
});

function signout() {
  localStorage.clear(); // wipe sb_user + all admin_v2_* cache
  window.location.href = "/signout";
}
