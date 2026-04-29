(function () {
  "use strict";

  const container = document.getElementById("logs-container");

  async function fetchLogs() {
    try {
      const res = await fetch("/api/admin/data/activity-logs");
      const json = await res.json();

      if (json.ok) {
        renderLogs(json.data);
      } else {
        container.innerHTML = `<div class="py-8 text-center text-red-500 text-[12px]">${json.error}</div>`;
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      container.innerHTML = `<div class="py-8 text-center text-red-500 text-[12px]">Failed to load logs.</div>`;
    }
  }

  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-brand-500 text-[12px]">No activity logs found.</div>`;
      return;
    }

    container.innerHTML = logs
      .map((log, index) => {
        const initials = log.userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);
        const time = new Date(log.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const date = new Date(log.createdAt).toLocaleDateString();

        const colors = [
          "bg-primary",
          "bg-emerald-600",
          "bg-orange-600",
          "bg-violet-600",
          "bg-amber-500",
        ];
        const colorClass = colors[index % colors.length];

        return `
      <div class="flex gap-3 group transition-colors hover:bg-slate-50/50 rounded-xl p-2 cursor-pointer ${index === 0 ? "pb-2" : index === logs.length - 1 ? "pt-2" : "py-2"}" 
           ${log.link ? `onclick="window.location.href='${log.link}'"` : ""}>
        <div class="flex flex-col items-center">
          <div class="w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white text-[10px] font-bold font-display flex-shrink-0">
            ${initials}
          </div>
          ${index !== logs.length - 1 ? '<div class="w-px flex-1 bg-slate-200 mt-1.5"></div>' : ""}
        </div>
        <div class="flex-1 pt-0.5">
          <div class="flex flex-wrap items-start justify-between gap-1">
            <div class="text-[12.5px]">
              ${log.category ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getCategoryColor(log.category)} text-white mr-1.5 mb-1">${log.category}</span>` : ""}
              <span class="font-semibold text-brand">${log.userName}</span>
              <span class="text-brand">${log.action}</span>
              ${log.details ? `<span class="font-medium text-brand">${log.details}</span>` : ""}
            </div>
            <div class="text-right">
              <div class="text-[10px] text-brand whitespace-nowrap">${time}</div>
              <div class="text-[8px] text-slate-400 whitespace-nowrap">${date}</div>
            </div>
          </div>
          <div class="text-[10.5px] text-brand mt-1 opacity-70 flex items-center gap-2">
            IP: ${log.ipAddress || "Internal"}
            ${log.link ? `<span class="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</span>` : ""}
          </div>
        </div>
      </div>`;
      })
      .join("");
  }

  function getCategoryColor(cat) {
    switch (cat?.toLowerCase()) {
      case "appointment": return "bg-primary";
      case "invoice": return "bg-emerald-600";
      case "inquiry": return "bg-orange-600";
      case "system": return "bg-slate-600";
      default: return "bg-brand";
    }
  }

  // SignalR real-time updates
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("/adminHub")
    .withAutomaticReconnect()
    .build();

  connection.on("ReceiveActivityLog", (log) => {
    // Re-fetch all logs to maintain sorting/caching
    fetchLogs();
  });

  async function startSignalR() {
    try {
      await connection.start();
      console.log("SignalR Connected (Logs)");
    } catch (err) {
      console.error("SignalR Connection Error:", err);
      setTimeout(startSignalR, 5000);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetchLogs();
    startSignalR();
  });
})();
