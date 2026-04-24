import { Toast, Modal } from "../ui.js";

// ── Data ──────────────────────────────────────────────────────────────────────
let ALL_SVCS = JSON.parse(
  document.getElementById("services-data")?.textContent ?? "[]",
);
let filtered = [...ALL_SVCS];
let selectedHeroFile = null;

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
  renderGrid();

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
  const c = CAT[s.category] ?? {
    bg: "bg-slate-50",
    text: "text-brand-500",
    border: "border-slate-100",
    dot: "#64748b",
  };

  const benefitChips = (s.benefits ?? [])
    .slice(0, 2)
    .map(
      (b) =>
        `<span class="text-[11px]  text-brand-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[100px]">${b}</span>`,
    )
    .join("");

  const extra = s.benefits?.length > 2 ? `<span class="text-[11px] text-brand-300 ml-1">+${s.benefits.length - 2}</span>` : "";

  return `
  <div class="asvc-card group bg-white rounded-[28px] border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col overflow-hidden">
    
    <!-- Header with Category & Status -->
    <div class="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full" style="background-color: ${c.dot}"></div>
        <span class="text-[12px] font-medium ${c.text}">${s.category}</span>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}">
        <span class="w-1 h-1 rounded-full ${s.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}"></span>
        <span class="text-[11px] font-medium ">${s.isActive ? "Active" : "Inactive"}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 pb-6 flex-1 flex flex-col">
      <div class="flex items-start gap-4 mb-4">
        <div class="w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center shrink-0 border ${c.border}">
          <i class="fa-solid ${s.category === 'Cosmetic' ? 'fa-gem' : s.category === 'Specialized' ? 'fa-microscope' : 'fa-hand-holding-heart'} text-lg" style="color: ${c.dot}"></i>
        </div>
        <div class="min-w-0">
          <h4 class="font-display text-brand-900 text-[15px] leading-tight group-hover:text-primary transition-colors truncate font-bold">${s.name}</h4>
          <p class="text-[11.5px] text-brand-400 mt-1 line-clamp-2 leading-relaxed italic">"${s.tagline}"</p>
        </div>
      </div>

      <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
        <div>
           <span class="text-[10px]  text-brand-300  block mb-0.5">Price starts at</span>
           <span class="font-display font-extrabold text-[18px] text-brand-900">₱${Number(s.price).toLocaleString()}</span>
        </div>
        <div class="flex flex-col items-end gap-1">
          ${s.duration ? `
          <div class="flex items-center gap-1.5 text-[12px] text-brand-400">
            <i class="fa-regular fa-clock text-primary/60"></i>
            <span>${s.duration}</span>
          </div>` : ''}
          ${s.recovery ? `
          <div class="flex items-center gap-1.5 text-[12px]  text-brand-400">
            <i class="fa-solid fa-bolt-lightning text-primary/60"></i>
            <span>${s.recovery}</span>
          </div>` : ''}
        </div>
      </div>

      ${s.benefits?.length ? `
      <div class="mt-4 flex items-center gap-1 overflow-hidden">
        ${benefitChips}${extra}
      </div>` : ""}
    </div>

    <!-- Actions -->
    <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 mt-auto">
      <button data-edit="${s.id}" 
        class="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-[11px]  text-brand-600 hover:border-primary hover:text-primary hover:shadow-md hover:shadow-primary/5 transition-all flex items-center justify-center gap-2">
        <i class="fa-solid fa-pen-to-square"></i> Edit
      </button>
      <button data-delete="${s.id}" data-name="${s.name}"
        class="w-10 h-10 bg-white border border-slate-200 rounded-xl text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all flex items-center justify-center">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  </div>`;
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Service";
  document.getElementById("modalSvcId").value = "";
  selectedHeroFile = null;
  clearModalFields();
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

  document.getElementById("benefitsList").innerHTML = "";
  (s.benefits ?? []).forEach((b) => addBenefitRow(b));

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
      benefits: getBenefits(),
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
      window.location.reload();
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
        // Delay reload to let animation finish
        setTimeout(() => window.location.reload(), 300);
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

function getBenefits() {
  return [...document.querySelectorAll(".benefit-input")]
    .map((i) => i.value.trim())
    .filter(Boolean);
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
  ["mName", "mTagline", "mSummary", "mPrice", "mDuration", "mRecovery"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("mCategory").value = "General Dentistry";
  document.getElementById("mIsActive").checked = true;
  document.getElementById("benefitsList").innerHTML = "";
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
