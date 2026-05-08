(function () {
  "use strict";

  const container = document.getElementById("logs-container");
  const searchInput = document.getElementById("log-search");
  const categoryFilter = document.getElementById("log-filter-category");
  let _allLogs = [];

  async function fetchLogs() {
    try {
      const res = await fetch("/api/admin/data/activity-logs");
      const json = await res.json();

      if (json.ok) {
        _allLogs = json.data;
        applyFilters();
      } else {
        container.innerHTML = `<div class="py-8 text-center text-red-500 text-[12px]">${json.error}</div>`;
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      container.innerHTML = `<div class="py-8 text-center text-red-500 text-[12px]">Failed to load logs.</div>`;
    }
  }

  function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = categoryFilter?.value.toLowerCase() || "";

    const filtered = _allLogs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.userName.toLowerCase().includes(searchTerm) || 
        log.action.toLowerCase().includes(searchTerm) || 
        (log.details && log.details.toLowerCase().includes(searchTerm));
      
      const matchesCategory = !category || log.category?.toLowerCase() === category;
      
      return matchesSearch && matchesCategory;
    });

    renderLogs(filtered);
  }

  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-brand/50 text-[12px]">No activity logs found.</div>`;
      return;
    }

    container.innerHTML = logs
      .map((log, index) => {
        const initials = log.userName
          ? log.userName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
          : "??";
        const time = new Date(log.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const date = new Date(log.createdAt).toLocaleDateString();

        const actionColor = getActionColor(log.action);

        return `
      <div class="flex gap-4 group transition-all hover:bg-slate-50/80 rounded-2xl p-3 cursor-pointer" 
           ${log.link ? `onclick="window.location.href='${log.link}'"` : ""}>
        <div class="flex flex-col items-center">
          <div class="w-10 h-10 rounded-2xl ${actionColor.bg} ${actionColor.text} flex items-center justify-center text-[11px] font-bold shadow-sm flex-shrink-0 transition-transform group-hover:scale-110 overflow-hidden">
            ${log.avatarUrl 
                ? `<img src="${log.avatarUrl}" class="w-full h-full object-cover" onerror="this.outerHTML='${initials}'" />`
                : initials
            }
          </div>
          ${index !== logs.length - 1 ? '<div class="w-px flex-1 bg-slate-100 mt-2"></div>' : ""}
        </div>
        <div class="flex-1 pt-0.5">
          <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
             <div class="flex flex-col">
                ${log.category ? `<span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${getCategoryColor(log.category)} text-white w-fit mb-1.5 shadow-sm shadow-brand/5">${log.category}</span>` : ""}
                <div class="text-[13px] leading-relaxed">
                  <span class="font-bold text-brand/90 text-sm">${log.userName || "Unknown"}</span>
                  <span class="font-medium text-brand/50 mx-0.5">${log.action}</span>
                  ${log.details ? `<span class="font-bold text-brand/70">${log.details}</span>` : ""}
                </div>
             </div>
            <div class="text-right">
              <div class="text-[11px] font-bold text-brand">${time}</div>
              <div class="text-[9px] font-medium text-slate-400">${date}</div>
            </div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <div class="text-[10px] font-medium text-brand/40 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <i class="fa-solid fa-network-wired mr-1 opacity-50"></i>${log.ipAddress || "Internal"}
            </div>
            ${log.link ? `<span class="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">View details <i class="fa-solid fa-arrow-right ml-1"></i></span>` : ""}
          </div>
        </div>
      </div>`;
      })
      .join("");
  }

  function getCategoryColor(cat) {
    switch (cat?.toLowerCase()) {
      case "appointment": return "bg-primary";
      case "invoice": return "bg-emerald-500";
      case "inquiry": return "bg-orange-500";
      case "system": return "bg-slate-500";
      case "auth": return "bg-violet-500";
      default: return "bg-brand/50";
    }
  }

  function getActionColor(action) {
    const act = action?.toLowerCase() || "";
    if (act.includes("delete") || act.includes("remove") || act.includes("cancel") || act.includes("reject")) {
      return { bg: "bg-rose-50", text: "text-rose-600 border border-rose-100" };
    }
    if (act.includes("add") || act.includes("create") || act.includes("schedule") || act.includes("book") || act.includes("paid")) {
      return { bg: "bg-emerald-50", text: "text-emerald-600 border border-emerald-100" };
    }
    if (act.includes("update") || act.includes("modify") || act.includes("edit") || act.includes("change")) {
      return { bg: "bg-amber-50", text: "text-amber-600 border border-amber-100" };
    }
    if (act.includes("login") || act.includes("auth")) {
      return { bg: "bg-violet-50", text: "text-violet-600 border border-violet-100" };
    }
    return { bg: "bg-primary/10", text: "text-slate-600 border border-slate-100" };
  }

  searchInput?.addEventListener("input", applyFilters);
  categoryFilter?.addEventListener("change", applyFilters);

  // SignalR real-time updates
  if (window.signalR) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("/adminHub")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveActivityLog", (log) => {
      fetchLogs();
    });

    async function startSignalR() {
      try {
        await connection.start();
      } catch (err) {
        setTimeout(startSignalR, 5000);
      }
    }
    startSignalR();
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetchLogs();
  });
})();
