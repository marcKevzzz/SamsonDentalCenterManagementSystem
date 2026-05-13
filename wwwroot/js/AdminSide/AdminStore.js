/**
 * Admin Data Store
 * Granular caching with LocalStorage persistence.
 */
export const AdminStore = (() => {
  const getCachePrefix = () => {
    const userId = document.getElementById('admin-id')?.value || 'anon';
    return `admin_v2_${userId}_`;
  };
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Loads data for a specific key.
   * Checks localStorage first, then fetches if expired or missing.
   */
  async function loadData(key, fetchUrl, options = {}) {
    const ttl = options.ttl || DEFAULT_TTL;
    const forceRefresh = options.force || false;

    if (!forceRefresh) {
      const cached = getLocal(key);
      if (cached && (Date.now() - cached.timestamp < ttl)) {
        return cached.data;
      }
    }

    try {
      const res = await fetch(fetchUrl);
      
      // Ensure we have a valid JSON response
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(`Store Fetch Error [${key}]: HTTP ${res.status}`, text);
        throw new Error(`Fetch failed: ${res.statusText}`);
      }

      const json = await res.json();
      
      // Do not cache explicit error responses
      if (json && json.ok === false) {
        throw new Error(`API returned error: ${json.error || 'Unknown error'}`);
      }

      const data = json.data || json;
      
      setLocal(key, data);
      window.dispatchEvent(new CustomEvent(`admin:${key}:loaded`, { detail: data }));
      return data;
    } catch (err) {
      console.error(`Store Load Exception [${key}]:`, err);
      // Fallback to expired cache if fetch fails
      const expired = getLocal(key);
      return expired ? expired.data : null;
    }
  }

  function getLocal(key) {
    const val = localStorage.getItem(getCachePrefix() + key);
    return val ? JSON.parse(val) : null;
  }

  function setLocal(key, data) {
    localStorage.setItem(getCachePrefix() + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  function clearCache(key) {
    const prefix = getCachePrefix();
    if (key) {
      localStorage.removeItem(prefix + key);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    }
  }

  function getData(key) {
    const cached = getLocal(key);
    return cached ? cached.data : null;
  }

  // ── SignalR Integration ──────────────────────────────────────────────
  let connection = null;

  function initSignalR() {
    if (typeof signalR === "undefined") {
      console.warn("SignalR library not found. Real-time updates disabled.");
      return;
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl("/adminHub")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveAppointmentUpdate", (data) => {
      console.log("Real-time: Appointment updated", data);
      clearCache("appointments");
      window.dispatchEvent(new CustomEvent("admin:appointments:updated", { detail: data }));
    });

    connection.on("ReceiveInvoiceUpdate", (data) => {
      console.log("Real-time: Invoice/Treatment updated", data);
      clearCache("invoices");
      clearCache("treatments");
      clearCache("pending_invoices");
      window.dispatchEvent(new CustomEvent("admin:invoices:updated", { detail: data }));
      window.dispatchEvent(new CustomEvent("admin:treatments:updated", { detail: data }));
    });

    connection.on("ReceiveInquiryUpdate", (data) => {
      console.log("Real-time: Inquiry updated", data);
      clearCache("inquiries");
      window.dispatchEvent(new CustomEvent("admin:inquiries:updated", { detail: data }));
    });

    connection.on("ReceiveActivityLog", (log) => {
      window.dispatchEvent(new CustomEvent("admin:activity_log:received", { detail: log }));
    });

    connection.start()
      .then(() => console.log("SignalR: Connected to AdminHub"))
      .catch(err => console.error("SignalR: Connection failed", err));
  }

  // Initialize if in browser
  if (typeof window !== "undefined") {
    // Wait for DOM or just run if SignalR might be loaded via script tag
    setTimeout(initSignalR, 1000);
  }

  return {
    loadData,
    getData,
    clearCache,
    invalidate: clearCache  // alias used by all modules
  };
})();

window.AdminStore = AdminStore;
