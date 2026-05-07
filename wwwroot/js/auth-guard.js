/**
 * auth-guard.js
 * Intercepts all fetch() calls. If server returns 401 { expired: true },
 * clears all localStorage and redirects to /Authentication/Signin.
 * Load this script in EVERY layout (admin + patient) before any module scripts.
 */

(function () {
  // Immediately clear storage if we arrived here because of an expiry redirect
  if (window.location.search.includes("expired=1")) {
    localStorage.clear();
  }

  const SIGNIN_URL = "/sign-in?expired=1";

  function clearAllStorage() {
    localStorage.clear();
  }

  function handleExpiry() {
    clearAllStorage();
    // Avoid redirect loop if already on signin page
    if (!window.location.pathname.startsWith("/Authentication/Signin")) {
      window.location.href = SIGNIN_URL;
    }
  }

  // ── Patch global fetch ────────────────────────────────────────────────────
  const _originalFetch = window.fetch;

  window.fetch = async function (...args) {
    let request = args[0];

    // Ensure all fetch calls include the X-Requested-With header so the
    // server-side OnChallenge handler knows it's an XHR and returns JSON.
    if (typeof request === "string" || request instanceof URL) {
      args[1] = args[1] || {};
      args[1].headers = args[1].headers || {};
      if (
        typeof args[1].headers === "object" &&
        !(args[1].headers instanceof Headers)
      ) {
        args[1].headers["X-Requested-With"] = "XMLHttpRequest";
      }
    } else if (request instanceof Request) {
      // Can't easily mutate a Request, but OnChallenge also checks Accept header
      // which fetch sets to application/json for API calls — good enough.
    }

    const response = await _originalFetch.apply(this, args);

    // Clone to allow body to be read twice
    if (response.status === 401) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json && json.expired === true) {
          handleExpiry();
          // Return a never-resolving promise so caller doesn't process the dead response
          return new Promise(() => {});
        }
      } catch {
        // Not JSON — not our concern, pass through
      }
    }

    return response;
  };

  // ── Show expired banner on signin page if ?expired=1 ─────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") {
      // Try to find a toast or show inline banner
      const showExpiredBanner = () => {
        if (window.Toast) {
          window.Toast.show(
            "Your session expired. Please sign in again.",
            "warning",
          );
          return;
        }
        // Fallback: inject banner above signin form
        const banner = document.createElement("div");
        banner.id = "session-expired-banner";
        banner.style.cssText = `
          position:fixed;top:0;left:0;right:0;z-index:9999;
          background:#f59e0b;color:#fff;text-align:center;
          padding:10px 16px;font-size:14px;font-weight:600;
          font-family:system-ui,sans-serif;
        `;
        banner.textContent =
          "⚠️ Your session has expired. Please sign in again.";
        document.body.prepend(banner);
        setTimeout(() => banner.remove(), 5000);
      };
      // Small delay to allow Toast to load
      setTimeout(showExpiredBanner, 300);
    }
  });
})();
