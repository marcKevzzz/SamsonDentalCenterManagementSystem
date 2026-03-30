function filterTab(name) {
  currentFilter = name;
  ["all", "appointments", "system"].forEach((t) => {
    const btn = document.getElementById("ftab-" + t);
    if (t === name) {
      btn.classList.remove("text-muted", "border-transparent");
      btn.classList.add("text-primary", "border-primary");
    } else {
      btn.classList.remove("text-primary", "border-primary");
      btn.classList.add("text-muted", "border-transparent");
    }
  });
  applyFilter();
}

function applyFilter() {
  const items = document.querySelectorAll(".notif-item");
  let visible = 0;
  items.forEach((item) => {
    const type = item.getAttribute("data-type");
    const read = item.getAttribute("data-read");
    let show = false;
    if (currentFilter === "all") show = true;
    else if (currentFilter === "appointments") show = type === "appointments";
    else if (currentFilter === "system") show = type === "system";
    item.style.display = show ? "flex" : "none";
    if (show) visible++;
  });
  // Show/hide date group headers based on visible items
  document
    .querySelectorAll("#notifList > div:not(.notif-item)")
    .forEach((header) => {
      // Check if any sibling notif-items after this header are visible
      let next = header.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains("bg-offwhite")) {
        if (next.style.display !== "none") hasVisible = true;
        next = next.nextElementSibling;
      }
      header.style.display = hasVisible ? "" : "none";
    });
  document.getElementById("emptyState").classList.toggle("hidden", visible > 0);
  document
    .getElementById("notifList")
    .classList.toggle("hidden", visible === 0);
}

function markRead(el) {
  el.setAttribute("data-read", "true");
  el.classList.remove("bg-blue-50/40");
  const dot = el.querySelector(".unread-dot");
  if (dot) dot.remove();
  updateBadge();
}

function updateBadge() {
  const unread = document.querySelectorAll(
    '.notif-item[data-read="false"]',
  ).length;
  const badge = document.querySelector(
    "aside .bg-primary.text-white.text-\\[10px\\]",
  );
  if (badge) badge.textContent = unread > 0 ? unread : "";
}
