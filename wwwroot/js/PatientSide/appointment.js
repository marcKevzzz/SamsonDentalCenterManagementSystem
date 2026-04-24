// ── appointment.js — main entry point ────────────────────────────────────────
// wwwroot/js/PatientSide/appointment.js

import { STATE  } from "./appointment-state.js";
import {
  goToStep,
  goBack,
  cancelBooking,
  resetBooking,
  updateChrome,
} from "./appointment-nav.js";
import { loadServices, renderStep1 } from "./steps/step1-service.js";

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

  await loadServices();

  // ── Handle Pre-selection ──
  const urlParams = new URLSearchParams(window.location.search);
  const serviceSlug = urlParams.get("service");

  if (serviceSlug) {
    window.selectService(serviceSlug);
    // Automatically jump to step 2 if a service was successfully selected
    if (STATE.service) {
      goToStep(2);
      return; // Stop here, goToStep handles the rest
    }
  }

  updateChrome();
  renderStep1();

  // Wire up back button
  // document.getElementById("backBtn")?.addEventListener("click", goBack);
});

// Re-export globals that Razor HTML uses via onclick=""
// (appointment-nav.js already sets window.goBack etc.)
