// ── steps/step1-service.js ────────────────────────────────────────────────────
import {
  STATE,
  CATEGORIES,
  RESTRICTED_CATEGORIES,
  isLoggedIn,
} from "../appointment-state.js";
import { Toast } from "../../ui.js";


let SERVICES = [];
let _activeCat = CATEGORIES[0];
let _servicesLoaded = false;
let _isLoading = false;

// ── Load services from API ────────────────────────────────────────────────────
export async function loadServices() {
    if (_servicesLoaded) return;
    
    _isLoading = true;
    renderServiceList(); // Initial render to show skeletons

    try {
        const res = await fetch("/api/services");
        SERVICES = await res.json();
        _servicesLoaded = true;
    } catch (err) {
        console.error("[step1] Failed to load services:", err);
    } finally {
        _isLoading = false;
        renderServiceList(); // Final render to show data
    }
}

// ── Render step 1 ─────────────────────────────────────────────────────────────
export function renderStep1() {
  renderCatTabs();
  renderServiceList();
}

function renderCatTabs() {
  const tabs = document.getElementById("catTabs");
  if (!tabs) return;
  tabs.innerHTML = CATEGORIES.map((cat) => {
    const isRestricted = RESTRICTED_CATEGORIES.includes(cat) && !isLoggedIn();
    return `
        <button onclick="filterCat('${cat}')"
            class="cat-tab font-body text-[.75rem] font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer
                ${
                  cat === _activeCat
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-muted border-[#e5e7eb] hover:border-brand hover:text-brand"
                }
                ${isRestricted ? "opacity-60" : ""}">
            ${cat}
            ${
              isRestricted
                ? `<i class="fa-solid fa-lock text-[9px] ml-1 opacity-70"></i>`
                : ""
            }
        </button>`;
  }).join("");
}

function renderServiceList() {
  const el = document.getElementById("svcList");
  if (!el) return;

  if (_isLoading) {
        el.innerHTML = Array(3).fill(0).map(() => `
            <div class="animate-pulse bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4">
                <div class="w-5 h-5 rounded-full bg-gray-200 mt-1"></div>
                <div class="flex-1 space-y-3">
                    <div class="flex justify-between items-center">
                        <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div class="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                    <div class="flex gap-4 pt-1">
                        <div class="h-3 bg-gray-50 rounded w-12"></div>
                        <div class="h-3 bg-gray-50 rounded w-12"></div>
                    </div>
                </div>
            </div>
        `).join("");
        return;
    }

  const isRestricted =
    RESTRICTED_CATEGORIES.includes(_activeCat) && !isLoggedIn();
  const items = SERVICES.filter((s) => s.category === _activeCat);

  if (isRestricted) {
    el.innerHTML = `
        <div class="bg-brand/5 border border-brand/10 rounded-2xl p-8 text-center">
            <div class="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-lock text-brand text-xl"></i>
            </div>
            <h3 class="brand-font font-bold text-brand text-[1.1rem] mb-2">Members Only</h3>
            <p class="font-body text-[.85rem] text-muted mb-4 max-w-xs mx-auto">
                Specialized treatments require an account. Sign in or create a free account to book.
            </p>
            <div class="flex gap-3 justify-center">
                <a href="/sign-in?returnUrl=/Appointments"
                    class="brand-font font-bold text-[.8rem] tracking-wider uppercase bg-brand text-white px-5 py-2.5 rounded-xl hover:bg-primary transition-colors no-underline">
                    Sign In
                </a>
                <a href="/sign-up"
                    class="brand-font font-bold text-[.8rem] tracking-wider uppercase border-2 border-brand text-brand px-5 py-2.5 rounded-xl hover:bg-brand hover:text-white transition-colors no-underline">
                    Create Account
                </a>
            </div>
        </div>`;
    return;
  }

  if (items.length === 0) {
    el.innerHTML = `<p class="font-body text-muted text-center py-8">No services available in this category.</p>`;
    return;
  }

  el.innerHTML = items
    .map((s) => {
      const sel = STATE.service?.slug === s.slug;
      return `
        <div onclick="selectService('${s.slug}')"
            class="svc-card ${sel ? "selected" : ""}">
            <div class="flex items-start gap-4">
                <div class="svc-radio mt-0.5"><div class="svc-radio-dot"></div></div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <h3 class="brand-font font-bold text-[1rem] text-brand">${s.name}</h3>
                            <p class="font-body text-[.8rem] text-muted mt-0.5">${s.tagline}</p>
                        </div>
                        <span class="font-body text-[.78rem] font-semibold text-primary whitespace-nowrap">${s.price}</span>
                    </div>
                    <div class="flex items-center gap-4 mt-3">
                        ${
                          s.duration
                            ? `<span class="flex items-center gap-1 font-body text-[.72rem] text-muted">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>${s.duration}</span>`
                            : ""
                        }
                        ${
                          s.recovery
                            ? `<span class="flex items-center gap-1 font-body text-[.72rem] text-muted">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>${s.recovery}</span>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        </div>`;
    })
    .join("");

  // Detail panel
  const detailEl = document.getElementById("svcDetail");
  if (!detailEl) return;

  if (STATE.service) {
    detailEl.classList.remove("hidden");
    detailEl.innerHTML = `
        <div class="bg-brand rounded-2xl p-6 text-white">
            <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                    <div class="font-body text-[.62rem] font-semibold tracking-[.13em] uppercase text-white/40 mb-1">
                        ${STATE.service.category}
                    </div>
                    <h3 class="brand-font font-bold text-[1.1rem]">${STATE.service.name}</h3>
                </div>
                <span class="font-body text-[.78rem] font-semibold text-primary bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                    ${STATE.service.price}
                </span>
            </div>
            <p class="font-body text-[.85rem] text-white/60 leading-relaxed mb-5">
                ${STATE.service.summary || STATE.service.tagline}
            </p>
            <div class="grid grid-cols-2 gap-3">
                ${(STATE.service.benefits ?? [])
                  .slice(0, 4)
                  .map(
                    (b) => `
                <div class="flex items-start gap-2 font-body text-[.78rem] text-white/70">
                    <span class="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="3"
                            stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>${b}
                </div>`,
                  )
                  .join("")}
            </div>
        </div>`;
  } else {
    detailEl.classList.add("hidden");
  }
}

// ── Select service ────────────────────────────────────────────────────────────
function selectService(slug) {
  const svc = SERVICES.find((s) => s.slug === slug);
  STATE.service = svc ?? null;

  if (svc) {
    _activeCat = svc.category;
  }

  const btn = document.getElementById("step1Btn");
  if (btn) btn.disabled = !STATE.service;

  renderCatTabs();
  renderServiceList();
}

// ── Filter category ───────────────────────────────────────────────────────────
function filterCat(cat) {
  if (RESTRICTED_CATEGORIES.includes(cat) && !isLoggedIn()) {
    _activeCat = cat;
    renderCatTabs();
    renderServiceList();
    return;
  }
  _activeCat = cat;
  renderCatTabs();
  renderServiceList();
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.selectService = selectService;
window.filterCat = filterCat;
