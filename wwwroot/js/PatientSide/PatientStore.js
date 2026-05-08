/**
 * PatientStore.js
 * Centralized client-side caching for the Patient Portal.
 * Uses localStorage with TTL (Time To Live).
 */

const CACHE_PREFIX = "ps_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const PatientStore = {
  /**
   * Get data from cache
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    try {
      const { data, expiry } = JSON.parse(cached);
      if (Date.now() > expiry) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch (e) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
  },

  /**
   * Set data to cache
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttl milliseconds
   */
  set(key, data, ttl = DEFAULT_TTL) {
    const payload = {
      data,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  },

  /**
   * Invalidate specific cache key
   * @param {string} key 
   */
  invalidate(key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all patient side cache
   */
  clear() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Fetch with cache (Stale-While-Revalidate pattern)
   * @param {string} key 
   * @param {string} url 
   * @param {object} options 
   * @returns {Promise<any>}
   */
  async fetch(key, url, options = {}) {
    const cached = this.get(key);
    
    // If we have cached data, return it immediately but still fetch in background
    // if you want true SWR. For now, let's just return cached if available.
    if (cached) return cached;

    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    
    const json = await res.json();
    const data = json.data || json; // Handle both {data: ...} and direct array/object
    
    this.set(key, data);
    return data;
  }
};

// Also expose as global for non-module scripts if needed
window.PatientStore = PatientStore;
