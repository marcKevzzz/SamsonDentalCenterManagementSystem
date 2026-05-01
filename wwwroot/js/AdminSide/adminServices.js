import { Toast, Modal } from "../ui.js";

import { AdminStore } from './AdminStore.js';

let ALL_SVCS = [];
let filtered = [];
let selectedHeroFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    const data = await AdminStore.loadData('services', '/api/services/all');
    if (data) initializeWithData({ services: data });
});

function initializeWithData(data) {
    ALL_SVCS = data.services || [];
    filtered = [...ALL_SVCS];
    
    const loading = document.getElementById('services-loading');
    if (loading) loading.remove();
    
    renderGrid();
}

// ── Category config ───────────────────────────────────────────────────────────
const CAT = {
  "General Dentistry": {
    bg: "bg-blue-50/50",
    text: "text-blue-600",
    border: "border-blue-100/50",
    dot: "#2563eb",
  },
  Cosmetic: {
    bg: "bg-rose-50/50",
    text: "text-rose-600",
    border: "border-rose-100/50",
    dot: "#e11d48",
  },
  Specialized: {
    bg: "bg-purple-50/50",
    text: "text-purple-600",
    border: "border-purple-100/50",
    dot: "#9d56f4ff",
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // renderGrid() is now called from initializeWithData


  document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);
  document
    .getElementById("categoryFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("statusFilter")?.addEventListener("change", applyFilters);

  document
    .getElementById("addServiceBtn")?.addEventListener("click", openAddModal);
  document
    .getElementById("closeModalBtn")?.addEventListener("click", closeModal);
  document
    .getElementById("cancelModalBtn")?.addEventListener("click", closeModal);
  document
    .getElementById("modalSaveBtn")?.addEventListener("click", saveService);
  document
    .getElementById("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);
  document
    .getElementById("addBenefitBtn")?.addEventListener("click", () => addBenefitRow(""));
  document
    .getElementById("addStepBtn")?.addEventListener("click", () => addStepRow(""));
  document
    .getElementById("addFaqBtn")?.addEventListener("click", () => addFaqRow("", ""));

  document.getElementById("svcModal")?.addEventListener("click", (e) => {
    if (e.target.id === "svcModal") closeModal();
  });
  document.getElementById("deleteModal")?.addEventListener("click", (e) => {
    if (e.target.id === "deleteModal") closeDeleteModal();
  });

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");
    if (editBtn) openEditModal(editBtn.dataset.edit);
    if (delBtn) confirmDelete(delBtn.dataset.delete, delBtn.dataset.name);
  });

  document.getElementById("heroUploadBtn").addEventListener("click", () => {
    document.getElementById("heroFileInput").click();
  });

  document.getElementById("heroFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedHeroFile = file; // Store it for later

    // Show a local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("heroPreview").innerHTML =
        `<img src="${e.target.result}" class="w-full h-full object-cover opacity-50" />`;
      document.getElementById("heroUploadStatus").textContent =
        "✓ Photo selected (Save to upload)";
      document.getElementById("heroUploadStatus").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
});

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  const cat = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;

  filtered = ALL_SVCS.filter((s) => {
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.tagline.toLowerCase().includes(q);
    const matchCat = !cat || s.category === cat;
    const matchSt = status === "" || String(s.isActive) === status;
    return matchQ && matchCat && matchSt;
  });

  renderGrid();
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById("servicesGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("svcCount");

  count.textContent = `${filtered.length} service${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = filtered.map(cardHTML).join("");

  // Entrance animation for cards
  // gsap.from("#servicesGrid > .asvc-card", {
  //   y: 20,
  //   opacity: 0,
  //   duration: 0.4,
  //   stagger: 0.05,
  //   ease: "back.out(1.7)"
  // });
}

function cardHTML(s) {
  const statusBadge = s.isActive
    ? `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">Active</span>`
    : `<span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100 text-[10px] font-bold uppercase tracking-wider">Inactive</span>`;

  return `
  <div class="asvc-card group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col transition-colors hover:border-primary">
    
    <!-- Hero Image (Matching Patient Side) -->
    <div class="h-40 bg-slate-50 overflow-hidden relative">
      <img src="${s.hero || '/img/placeholder-service.jpg'}" alt="${s.name}" class="w-full h-full object-cover" />
      <div class="absolute top-3 right-3">
        ${statusBadge}
      </div>
    </div>

    <div class="p-4 flex-1 flex flex-col">
      <!-- Category & Price -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          ${s.icon ? `<i class="fa-solid ${s.icon} text-primary text-[10px]"></i>` : ''}
          <span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100">${s.category}</span>
        </div>
        <span class="text-[12px] font-bold text-brand-900">₱${Number(s.price).toLocaleString()}</span>
      </div>

      <h4 class="text-[14px] font-bold text-brand-900 mb-1 truncate">${s.name}</h4>
      <p class="text-[11.5px] text-brand-400 line-clamp-2 leading-relaxed mb-4 flex-1">${s.tagline}</p>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <span class="text-[11px] text-slate-400 flex items-center gap-1.5">
          <i class="fa-regular fa-clock"></i> ${s.duration || '—'}
        </span>
        <div class="flex items-center gap-2">
          <button data-edit="${s.id}" 
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-colors" title="Edit">
            <i class="fa-solid fa-pen-to-square text-xs"></i>
          </button>
          <button data-delete="${s.id}" data-name="${s.name}"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors" title="Delete">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

let initialSvcFormState = "";

function getSvcFormState() {
  return JSON.stringify({
    n: document.getElementById("mName").value,
    c: document.getElementById("mCategory").value,
    t: document.getElementById("mTagline").value,
    s: document.getElementById("mSummary").value,
    p: document.getElementById("mPrice").value,
    d: document.getElementById("mDuration").value,
    r: document.getElementById("mRecovery").value,
    a: document.getElementById("mIsActive").checked,
    i: document.getElementById("mIcon").value,
    bLen: getBenefits().length,
    sLen: getSteps().length,
    fLen: getFaqs().length,
    heroFile: selectedHeroFile ? selectedHeroFile.name : null
  });
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Service";
  document.getElementById("modalSvcId").value = "";
  selectedHeroFile = null;
  clearModalFields();
  initialSvcFormState = getSvcFormState();
  showModal();
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function openEditModal(id) {
  selectedHeroFile = null;
  const s = ALL_SVCS.find((x) => x.id === id);
  if (!s) return;

  document.getElementById("modalTitle").textContent = "Edit Service";
  document.getElementById("modalSvcId").value = s.id;
  document.getElementById("mName").value = s.name;
  document.getElementById("mCategory").value = s.category;
  document.getElementById("mTagline").value = s.tagline;
  document.getElementById("mSummary").value = s.summary ?? "";
  document.getElementById("mPrice").value = s.price;
  document.getElementById("mDuration").value = s.duration ?? "";
  document.getElementById("mRecovery").value = s.recovery ?? "";
  document.getElementById("mIsActive").checked = s.isActive;
  document.getElementById("mHero").value = s.hero ?? "";
  document.getElementById("mIcon").value = s.icon ?? "";

  document.getElementById("benefitsList").innerHTML = "";
  (s.benefits ?? []).forEach((b) => addBenefitRow(b));

  document.getElementById("stepsList").innerHTML = "";
  (s.steps ?? []).forEach((st) => addStepRow(st));

  document.getElementById("faqsList").innerHTML = "";
  (s.faqs ?? []).forEach((f) => addFaqRow(f.question, f.answer));

  // Add after setting other fields in openEditModal:
  if (s.hero) {
    document.getElementById("heroPreview").innerHTML =
      `<img src="${s.hero}" class="w-full h-full object-cover" />`;
    document.getElementById("heroUploadStatus").classList.remove("hidden");
  } else {
    document.getElementById("heroPreview").innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
        </svg>`;
    document.getElementById("heroUploadStatus").classList.add("hidden");
  }

  initialSvcFormState = getSvcFormState();
  showModal();
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveService() {
  const id = document.getElementById("modalSvcId").value;
  const isEdit = !!id;
  const saveBtn = document.getElementById("modalSaveBtn");
  const originalText = saveBtn.textContent;

  saveBtn.disabled = true;
  saveBtn.textContent = "Processing...";

  try {
    let heroUrl = document.getElementById("mHero").value;

    // STEP 1: Upload the image ONLY if a new one was selected
    if (selectedHeroFile) {
      const uploadId = id || crypto.randomUUID();
      const formData = new FormData();
      formData.append("file", selectedHeroFile);

      const uploadRes = await fetch(
        `/api/services/upload-service-hero?serviceId=${uploadId}`,
        {
          method: "POST",
          body: formData,
          headers: { RequestVerificationToken: getToken() },
        },
      );

      const uploadResult = await uploadRes.json();
      if (!uploadResult.ok)
        throw new Error(uploadResult.error || "Image upload failed");

      heroUrl = uploadResult.url; // Use the new URL
    }

    // STEP 2: Save the Service Data
    const payload = {
      name: document.getElementById("mName").value.trim(),
      category: document.getElementById("mCategory").value,
      tagline: document.getElementById("mTagline").value.trim(),
      summary: document.getElementById("mSummary").value.trim(),
      hero: heroUrl, // Final URL (either old one or the one we just uploaded)
      price: document.getElementById("mPrice").value.trim(),
      duration: document.getElementById("mDuration").value.trim(),
      recovery: document.getElementById("mRecovery").value.trim(),
      isActive: document.getElementById("mIsActive").checked,
      icon: document.getElementById("mIcon").value.trim(),
      benefits: getBenefits(),
      steps: getSteps(),
      faqs: getFaqs(),
    };

    const res = await fetch(`/api/services${isEdit ? `/${id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: getToken(),
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.ok) {
      initialSvcFormState = getSvcFormState(); // bypass discard check
      closeModal();
      Toast.show(`Service ${isEdit ? "updated" : "created"}.`, "success");
      await AdminStore.invalidate('services');
      const data = await AdminStore.loadData('services', '/api/services/all');
      if (data) initializeWithData({ services: data });
    } else {
      Toast.show(result.error, "danger");
    }
  } catch (err) {
    Toast.show(err.message, "danger");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function closeDeleteModal() {
  gsap.to("#deleteModal-box", {
    scale: 0.95,
    opacity: 0,
    y: 20,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => {
      const modal = document.getElementById("deleteModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });
}

function confirmDelete(id, name) {
  document.getElementById("deleteSvcName").textContent = name;
  const modal = document.getElementById("deleteModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  gsap.fromTo("#deleteModal-box", 
    { scale: 0.95, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
  );

  // Clone to remove stale listeners
  const btn = document.getElementById("confirmDeleteBtn");
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.addEventListener("click", async () => {
    fresh.disabled = true;
    fresh.textContent = "Deleting…";
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: { RequestVerificationToken: getToken() },
        credentials: "include",
      });
      const result = await res.json();
      if (result.ok) {
        closeDeleteModal();
        Toast.show("Service deleted.", "success");
        await AdminStore.invalidate('services');
        const data = await AdminStore.loadData('services', '/api/services/all');
        if (data) initializeWithData({ services: data });
      } else {
        Toast.show(result.error ?? "Delete failed.", "danger");
        fresh.disabled = false;
        fresh.textContent = "Delete";
      }
    } catch {
      Toast.show("An unexpected error occurred.", "danger");
      fresh.disabled = false;
      fresh.textContent = "Delete";
    }
  });
}

// ── Benefits ──────────────────────────────────────────────────────────────────
function addBenefitRow(value = "") {
  const list = document.getElementById("benefitsList");
  const row = document.createElement("div");
  row.className = "flex items-center gap-2 group/benefit";
  row.innerHTML = `
    <div class="relative flex-1">
      <i class="fa-solid fa-check absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-[12px]"></i>
      <input type="text" value="${value.replace(/"/g, "&quot;")}"
        placeholder="e.g. No downtime"
        class="benefit-input w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] outline-none
               focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" />
    </div>
    <button type="button"
      class="remove-benefit w-10 h-10 flex items-center justify-center rounded-xl text-slate-300
             hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
      <i class="fa-solid fa-trash-can text-xs"></i>
    </button>`;
  row
    .querySelector(".remove-benefit")
    .addEventListener("click", () => row.remove());
  list.appendChild(row);
  row.querySelector(".benefit-input").focus();
}

function addStepRow(value = "") {
  const list = document.getElementById("stepsList");
  const row = document.createElement("div");
  row.className = "flex items-center gap-2 group/step";
  row.innerHTML = `
    <div class="relative flex-1">
      <i class="fa-solid fa-arrow-right absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-[12px]"></i>
      <input type="text" value="${value.replace(/"/g, "&quot;")}"
        placeholder="e.g. Initial Consultation"
        class="step-input w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] outline-none
               focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" />
    </div>
    <button type="button"
      class="remove-step w-10 h-10 flex items-center justify-center rounded-xl text-slate-300
             hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
      <i class="fa-solid fa-trash-can text-xs"></i>
    </button>`;
  row
    .querySelector(".remove-step")
    .addEventListener("click", () => row.remove());
  list.appendChild(row);
  row.querySelector(".step-input").focus();
}

function addFaqRow(q = "", a = "") {
  const list = document.getElementById("faqsList");
  const row = document.createElement("div");
  row.className = "faq-item space-y-2 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative group/faq";
  row.innerHTML = `
    <button type="button" class="remove-faq absolute -right-2 -top-2 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 hover:shadow-sm transition-all opacity-0 group-hover/faq:opacity-100 z-10">
       <i class="fa-solid fa-xmark text-[10px]"></i>
    </button>
    <div class="space-y-2">
      <div class="relative">
        <span class="absolute left-3 top-2.5 text-[10px] font-bold text-primary/40">Q</span>
        <input type="text" value="${q.replace(/"/g, "&quot;")}"
          placeholder="Question"
          class="faq-q-input w-full pl-7 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-[12px] font-bold outline-none
                 focus:border-primary transition-all" />
      </div>
      <div class="relative">
        <span class="absolute left-3 top-2.5 text-[10px] font-bold text-emerald-400/40">A</span>
        <textarea placeholder="Answer" rows="2"
          class="faq-a-input w-full pl-7 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-[12px] outline-none
                 focus:border-emerald-400 transition-all resize-none">${a}</textarea>
      </div>
    </div>`;
  row
    .querySelector(".remove-faq")
    .addEventListener("click", () => row.remove());
  list.appendChild(row);
}

function getBenefits() {
  return [...document.querySelectorAll(".benefit-input")]
    .map((i) => i.value.trim())
    .filter(Boolean);
}

function getSteps() {
  return [...document.querySelectorAll(".step-input")]
    .map((i) => i.value.trim())
    .filter(Boolean);
}

function getFaqs() {
  return [...document.querySelectorAll(".faq-item")].map((row) => ({
    question: row.querySelector(".faq-q-input").value.trim(),
    answer: row.querySelector(".faq-a-input").value.trim(),
  })).filter(f => f.question && f.answer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showModal() {
  const modal = document.getElementById("svcModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("modalError").classList.add("hidden");

  gsap.fromTo("#svcModal-box", 
    { scale: 0.95, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
  );
}

function closeModal() {
  if (initialSvcFormState && getSvcFormState() !== initialSvcFormState) {
    Modal.open({
      title: "Discard Changes?",
      message: "You have unsaved changes. Are you sure you want to discard them?",
      type: "warning",
      confirmText: "Discard",
      cancelText: "Keep Editing",
      onConfirm: () => {
        initialSvcFormState = getSvcFormState();
        closeModal();
      }
    });
    return;
  }
  
  gsap.to("#svcModal-box", {
    scale: 0.95,
    opacity: 0,
    y: 20,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => {
      const modal = document.getElementById("svcModal");
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });
}
function clearModalFields() {
  ["mName", "mTagline", "mSummary", "mPrice", "mDuration", "mRecovery", "mIcon"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("mCategory").value = "General Dentistry";
  document.getElementById("mIsActive").checked = true;
  document.getElementById("benefitsList").innerHTML = "";
  document.getElementById("stepsList").innerHTML = "";
  document.getElementById("faqsList").innerHTML = "";
  resetHeroPreview();
}

function showModalError(msg) {
  const el = document.getElementById("modalError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function getToken() {
  return (
    document.querySelector('input[name="__RequestVerificationToken"]')?.value ??
    ""
  );
}

function resetHeroPreview() {
  document.getElementById("heroPreview").innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>`;
  document.getElementById("heroUploadStatus").classList.add("hidden");
}

// Add this function:
async function uploadHeroImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  const existingId = document.getElementById("modalSvcId").value;
  const uploadId = existingId || `temp-${Date.now()}`;

  const formData = new FormData();
  formData.append("file", file);

  const btn = document.getElementById("heroUploadBtn");
  btn.textContent = "Uploading…";
  btn.disabled = true;

  try {
    const res = await fetch(
      `/api/services/upload-service-hero?serviceId=${uploadId}`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { RequestVerificationToken: getToken() },
      },
    );
    const result = await res.json();

    if (result.ok) {
      document.getElementById("mHero").value = result.url;
      document.getElementById("heroPreview").innerHTML =
        `<img src="${result.url}" class="w-full h-full object-cover" />`;
      document.getElementById("heroUploadStatus").classList.remove("hidden");
    } else {
      Toast.show(result.error ?? "Upload failed.", "danger");
    }
  } catch {
    Toast.show("An unexpected error occurred.", "danger");
  } finally {
    btn.textContent = "Upload Hero Image";
    btn.disabled = false;
  }
}
