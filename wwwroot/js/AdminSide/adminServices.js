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
    bg: "bg-blue-50",
    text: "text-primary",
    border: "border-blue-100",
    dot: "#1E40AF",
  },
  Cosmetic: {
    bg: "bg-pink-50",
    text: "text-pink-600",
    border: "border-pink-100",
    dot: "#db2777",
  },
  Specialized: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-100",
    dot: "#7c3aed",
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
    .getElementById("statusFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("addServiceBtn")
    .addEventListener("click", openAddModal);
  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeModal);
  document
    .getElementById("cancelModalBtn")
    .addEventListener("click", closeModal);
  document
    .getElementById("modalSaveBtn")
    .addEventListener("click", saveService);
  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("addBenefitBtn")
    .addEventListener("click", () => addBenefitRow(""));

  document.getElementById("svcModal").addEventListener("click", (e) => {
    if (e.target.id === "svcModal") closeModal();
  });
  document.getElementById("deleteModal").addEventListener("click", (e) => {
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
}

function cardHTML(s) {
  const c = CAT[s.category] ?? {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-100",
    dot: "#64748b",
  };

  const benefitChips = (s.benefits ?? [])
    .slice(0, 3)
    .map(
      (b) =>
        `<span class="text-[10px] bg-slate-50 border border-slate-100 text-muted px-2 py-0.5 rounded-full truncate">${b}</span>`,
    )
    .join("");

  const extra =
    s.benefits?.length > 3
      ? `<span class="text-[10px] text-muted px-1">+${s.benefits.length - 3} more</span>`
      : "";

  return `
  <div class="bg-white rounded-2xl border ${c.border} hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden">

    <div class="absolute top-0 left-0 right-0 h-0.5 ${s.isActive ? "bg-primary/40" : "bg-slate-200"}"></div>

    <div class="p-5 flex-1">

      <div class="flex items-center justify-between mb-3">
        <span class="text-[9px] font-bold uppercase tracking-widest ${c.text} ${c.bg} px-2 py-1 rounded-full">
          ${s.category}
        </span>
        <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
          ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}">
          ${s.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div class="flex items-start gap-3 mb-3">
        <div class="w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c.dot}"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5c0 5-5 11-5 11S7 12 7 7a5 5 0 0 1 5-5z"/>
            <circle cx="12" cy="7" r="2"/>
          </svg>
        </div>
        <div class="min-w-0">
          <h4 class="font-display font-bold text-brand text-[13.5px] leading-tight truncate">${s.name}</h4>
          <p class="text-[11px] text-muted mt-0.5 line-clamp-2 leading-relaxed">${s.tagline}</p>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="font-display font-extrabold text-[18px] ${c.text}">${s.price}</span>
        <div class="flex items-center gap-3 text-[10.5px] text-muted">
          ${
            s.duration
              ? `
          <span class="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${s.duration}
          </span>`
              : ""
          }
          ${
            s.recovery
              ? `
          <span class="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            ${s.recovery}
          </span>`
              : ""
          }
        </div>
      </div>

      ${
        s.benefits?.length
          ? `
      <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
        ${benefitChips}${extra}
      </div>`
          : ""
      }
    </div>

    <div class="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60">
      <button data-edit="${s.id}"
        class="flex-1 py-1.5 text-[11.5px] font-semibold text-primary border border-primary/20 rounded-lg
               hover:bg-primary hover:text-white transition-all duration-150 flex items-center justify-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit
      </button>
      <button data-delete="${s.id}" data-name="${s.name}"
        class="py-1.5 px-3 text-[11.5px] font-semibold text-red-400 border border-red-100 rounded-lg
               hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-150
               flex items-center justify-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Delete
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
function confirmDelete(id, name) {
  document.getElementById("deleteSvcName").textContent = name;
  document.getElementById("deleteModal").classList.remove("hidden");
  document.getElementById("deleteModal").classList.add("flex");

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
        window.location.reload();
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
  row.className = "flex items-center gap-2";
  row.innerHTML = `
    <input type="text" value="${value.replace(/"/g, "&quot;")}"
      placeholder="e.g. No downtime"
      class="benefit-input flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[12px] outline-none
             focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
    <button type="button"
      class="remove-benefit w-7 h-7 flex items-center justify-center rounded-lg text-slate-400
             hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
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
  document.getElementById("svcModal").classList.remove("hidden");
  document.getElementById("svcModal").classList.add("flex");
  document.getElementById("modalError").classList.add("hidden");
}

function closeModal() {
  document.getElementById("svcModal").classList.add("hidden");
  document.getElementById("svcModal").classList.remove("flex");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
  document.getElementById("deleteModal").classList.remove("flex");
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
