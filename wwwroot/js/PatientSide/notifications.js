let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    fetchNotifications();
});

async function fetchNotifications() {
    try {
        const res = await fetch('/api/patient/data/notifications');
        const json = await res.json();
        if (json.ok) {
            renderNotifications(json.data);
        }
    } catch (err) {
        console.error("Failed to load notifications", err);
    }
}

function renderNotifications(notifs) {
    const list = document.getElementById('notifList');
    if (!notifs || notifs.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('emptyState').style.display = 'flex';
        list.classList.add('hidden');
        return;
    }

    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('emptyState').style.display = 'none';
    list.classList.remove('hidden');

    let html = '';
    notifs.forEach(n => {
        const type = n.type || 'system';
        const isRead = n.isRead;
        const bgClass = isRead ? '' : 'bg-blue-50/40';
        const iconBg = type === 'appointments' ? 'bg-blue-100 text-primary' : 'bg-emerald-100 text-emerald-600';
        const icon = type === 'appointments' 
            ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" /></svg>`
            : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2" /><polyline points="14 2 14 8 20 8" stroke-width="2" /><line x1="16" y1="13" x2="8" y2="13" stroke-width="2" stroke-linecap="round" /><line x1="16" y1="17" x2="8" y2="17" stroke-width="2" stroke-linecap="round" /></svg>`;
        
        const time = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
        <div class="notif-item flex items-start gap-4 px-6 py-4 border-b border-gray-100 cursor-pointer ${bgClass}"
          data-type="${type}" data-read="${isRead}" onclick="markRead(this, '${n.id}')">
          <div class="flex-shrink-0 mt-0.5">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}">
              ${icon}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-brand">${n.title}</p>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-xs text-muted">${time}</span>
                ${!isRead ? `<div class="w-2 h-2 rounded-full bg-primary unread-dot"></div>` : ''}
              </div>
            </div>
            <p class="text-sm text-muted mt-0.5">${n.message}</p>
          </div>
        </div>
        `;
    });

    list.innerHTML = html;
    applyFilter();
    updateBadge();
}

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
    let show = false;
    if (currentFilter === "all") show = true;
    else if (currentFilter === "appointments") show = type === "appointments";
    else if (currentFilter === "system") show = type === "system";
    item.style.display = show ? "flex" : "none";
    if (show) visible++;
  });
  
  document.getElementById("emptyState").classList.toggle("hidden", visible > 0);
  document.getElementById("emptyState").style.display = visible > 0 ? "none" : "flex";
  document.getElementById("notifList").classList.toggle("hidden", visible === 0);
}

window.markRead = async function(el, id) {
  if (el.getAttribute("data-read") === "true") return;

  try {
      await fetch(`/api/patient/data/notifications/read/${id}`, { method: 'POST' });
  } catch (err) {
      console.error(err);
  }

  // Animate out then remove
  el.style.transition = "opacity 0.25s, transform 0.25s";
  el.style.opacity = "0";
  el.style.transform = "translateX(12px)";
  setTimeout(() => {
    el.remove();
    applyFilter();
    updateBadge();
  }, 260);
}

function updateBadge() {
  const unread = document.querySelectorAll('.notif-item[data-read="false"]').length;
  // Let the global profile.js handle the badge counts via SignalR or periodic updates
  if (window.updatePatientCounts) {
      window.updatePatientCounts();
  }
}

