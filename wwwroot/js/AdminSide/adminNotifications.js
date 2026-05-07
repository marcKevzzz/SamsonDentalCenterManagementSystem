(function () {
  "use strict";

  const bell = document.getElementById("notif-bell");
  const dot = document.getElementById("notif-dot");
  const list = document.getElementById("notif-list");
  const markReadBtn = document.getElementById("mark-all-read");

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/data/notifications");
      const json = await res.json();

      if (json.ok) {
        renderNotifications(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  // SignalR real-time updates
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("/adminHub")
    .withAutomaticReconnect()
    .build();

  connection.on("ReceiveNotification", (n) => {
    // Flash dot and re-fetch or prepend
    dot.classList.remove("hidden");
    fetchNotifications();
    fetchCounts();
  });

  async function startSignalR() {
    try {
      await connection.start();
      console.log("SignalR Connected (Notifications)");
    } catch (err) {
      console.error("SignalR Connection Error:", err);
      setTimeout(startSignalR, 5000);
    }
  }

  async function fetchCounts() {
      try {
          const res = await fetch("/api/admin/data/counts");
          const json = await res.json();
          if (json.ok) {
              updateBadges(json.data);
          }
      } catch (err) {
          console.error("Failed to fetch counts:", err);
      }
  }

  function updateBadges(data) {
      const updateBadge = (id, count, containerId = null) => {
          const el = document.getElementById(id);
          if (!el) return;
          
          if (count > 0) {
              el.textContent = count > 99 ? '99+' : count;
              el.classList.remove('hidden');
              if(containerId) {
                 const container = document.getElementById(containerId);
                 if (container) container.classList.add('has-badge');
              }
          } else {
              el.classList.add('hidden');
              if(containerId) {
                 const container = document.getElementById(containerId);
                 if (container) container.classList.remove('has-badge');
              }
          }
      };

      updateBadge('notif-appointments-count', data.pendingAppointments);
      updateBadge('notif-inquiries-count', data.unreadInquiries);
      updateBadge('notif-leaves-count', data.pendingLeaves);
      updateBadge('notif-reviews-count', data.pendingReviews);
      
      updateBadge('notif-doctor-count', data.totalDoctors);
      updateBadge('notif-receptionist-count', data.totalReceptionists);
      updateBadge('notif-users-count', data.totalUsers);
      updateBadge('popup-notif-doctor-count', data.totalDoctors);
      updateBadge('popup-notif-receptionist-count', data.totalReceptionists);
      updateBadge('notif-activitylogs-count', data.totalActivityLogs);
  }


  function renderNotifications(notifs) {
    if (!notifs || notifs.length === 0) {
      list.innerHTML = `<div class="py-8 text-center text-slate-400 text-[11px]">No notifications</div>`;
      dot.classList.add("hidden");
      return;
    }

    const unread = notifs.filter((n) => !n.isRead);
    if (unread.length > 0) {
      dot.classList.remove("hidden");
    } else {
      dot.classList.add("hidden");
    }

    list.innerHTML = notifs
      .map((n) => {
        const time = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
      <div class="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${n.isRead ? 'opacity-60' : 'bg-primary/5'}" onclick="markAsRead('${n.id}', '${n.link}')">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 mt-1.5 rounded-full ${getNotifColor(n.type)} flex-shrink-0"></div>
          <div class="flex-1">
            <div class="flex justify-between items-start gap-2">
              <h4 class="text-[12px] font-bold text-brand leading-tight">${n.title}</h4>
              <span class="text-[9px] text-slate-400 whitespace-nowrap">${time}</span>
            </div>
            <p class="text-[11px] text-brand-500 mt-0.5">${n.message}</p>
          </div>
        </div>
      </div>`;
      })
      .join("");
  }

  function getNotifColor(type) {
    switch (type?.toLowerCase()) {
      case "success": return "bg-emerald-500";
      case "warning": return "bg-amber-500";
      case "danger": return "bg-red-500";
      default: return "bg-primary";
    }
  }

  window.markAsRead = async (id, link) => {
    try {
      await fetch(`/api/admin/data/notifications/read/${id}`, { method: "POST" });
      if (link && link !== "null" && link !== "undefined") {
        window.location.href = link;
      } else {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  markReadBtn.addEventListener("click", async () => {
    Toast.show("Bulk action not available", "info");
  });

  document.addEventListener("DOMContentLoaded", () => {
    fetchNotifications();
    fetchCounts();
    startSignalR();
  });

  // Listen for custom events to refresh counts
  window.addEventListener('admin:leaves:updated', fetchCounts);
  window.addEventListener('admin:inquiries:updated', fetchCounts);
})();
