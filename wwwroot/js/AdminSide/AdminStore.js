/**
 * Admin Data Store
 * Granular caching with LocalStorage persistence.
 */
export const AdminStore = (() => {
  const CACHE_KEY_PREFIX = 'admin_v2_';
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
    const val = localStorage.getItem(CACHE_KEY_PREFIX + key);
    return val ? JSON.parse(val) : null;
  }

  function setLocal(key, data) {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  function clearCache(key) {
    if (key) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_KEY_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  }

  function getData(key) {
    const cached = getLocal(key);
    return cached ? cached.data : null;
  }

  return {
    loadData,
    getData,
    clearCache
  };
})();

window.AdminStore = AdminStore;
