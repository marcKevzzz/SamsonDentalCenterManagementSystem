import { Toast, Modal } from "../ui.js";

// ── Data ──────────────────────────────────────────────────────────────────────
const ALL_USERS = JSON.parse(document.getElementById("users-data").textContent);

// ── State ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
let currentPage = 1;
let filtered = [...ALL_USERS];

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderTable();
  document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);
  document
    .getElementById("roleFilter")
    .addEventListener("change", applyFilters);
  document.getElementById("addUserBtn").addEventListener("click", openAddModal);

  // Close modals on backdrop click
  document.getElementById("userModal").addEventListener("click", (e) => {
    if (e.target.id === "userModal") closeModal();
  });
});

// ── Filter ────────────────────────────────────────────────────────────────────
function applyFilters() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  const role = document.getElementById("roleFilter").value.toLowerCase();

  filtered = ALL_USERS.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchQ = !q || name.includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !role || u.role === role;
    return matchQ && matchRole;
  });

  currentPage = 1;
  renderTable();
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("usersTableBody");
  const emptyState = document.getElementById("emptyState");
  const pagBar = document.getElementById("paginationBar");

  document.getElementById("userCount").textContent =
    `${filtered.length} user${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    pagBar.classList.add("hidden");
    pagBar.classList.remove("flex");
    return;
  }

  emptyState.classList.add("hidden");

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageUsers.map((u) => rowHTML(u)).join("");

  // Pagination — only show if > PAGE_SIZE users
  if (filtered.length > PAGE_SIZE) {
    pagBar.classList.remove("hidden");
    pagBar.classList.add("flex");
    document.getElementById("paginationInfo").textContent =
      `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} users`;
    renderPaginationBtns(totalPages);
  } else {
    pagBar.classList.add("hidden");
    pagBar.classList.remove("flex");
  }
}

function rowHTML(u) {
  const initials = (u.firstName[0] || "") + (u.lastName[0] || "");
  const age = u.dob ? calcAge(u.dob) : "—";
  const sexShort = u.sex === "Male" ? "M" : u.sex === "Female" ? "F" : "—";
  const avatar = u.avatarUrl
    ? `<img src="${u.avatarUrl}" class="w-full h-full object-cover" />`
    : initials.toUpperCase();

  return `
    <tr class="hover:bg-slate-50/60 transition-colors">
        <td class="px-4 py-3">
            <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-primary text-[10px] font-bold font-display flex-shrink-0 overflow-hidden">
                    ${avatar}
                </div>
                <div class="min-w-0">
                    <div class="text-[14px] font-medium truncate">${u.firstName} ${u.lastName}</div>
                    <div class="text-[10px] text-brand-400 truncate">${u.id.slice(0, 13)}…</div>
                </div>
            </div>
        </td>
        <td class="px-4 py-3 text-[12.5px] text-brand-500 whitespace-nowrap">${age} / ${sexShort}</td>
        <td class="px-4 py-3 text-[12.5px] text-brand-500 truncate max-w-0">
            <span class="truncate block" title="${u.email}">${u.email || "—"}</span>
        </td>
        <td class="px-4 py-3 text-[12.5px] truncate max-w-0">
            <span class="truncate block" title="${u.phone}">${u.phone || "—"}</span>
        </td>
        <td class="px-4 py-3 text-[12.5px] truncate max-w-0">
            <span class="truncate block" title="${u.address}">${u.address || "—"}</span>
        </td>
        <td class="px-4 py-3 text-[12.5px] truncate max-w-0 capitalize">${u.role}</td>
    <td class="px-4 py-3">
        <div class="flex items-center">
            ${
              u.isActive
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600">Active</span>`
                : `<div class="flex flex-col gap-0.5">
                   <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Inactive</span>
                   ${u.reactivationRequested ? `<span class="text-[8px] text-primary font-bold animate-pulse">Requesting...</span>` : ""}
                 </div>`
            }
        </div>
    </td>
    <td class="px-4 py-3 text-right">
        <div class="inline-block text-left action-dropdown relative">
            <button onclick="toggleDropdown(event, this)" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand-400 transition-colors">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="dropdown-menu hidden absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-lg shadow-brand-900/5 z-[60] overflow-hidden">
                <div class="py-1">
                    <button data-edit="${u.id}" class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-brand-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                        <i class="fa-solid fa-pen-to-square w-4"></i> Edit Profile
                    </button>
                    <button data-toggle="${u.id}" data-active="${u.isActive}" class="w-full text-left px-4 py-2.5 text-[12px] font-medium ${u.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"} flex items-center gap-3 transition-colors">
                        <i class="fa-solid ${u.isActive ? "fa-user-slash" : "fa-user-check"} w-4"></i> ${u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <div class="h-px bg-slate-100 my-1"></div>
                    <button data-delete="${u.id}" data-name="${u.firstName} ${u.lastName}" class="w-full text-left px-4 py-2.5 text-[12px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <i class="fa-solid fa-trash-can w-4"></i> Delete Account
                    </button>
                </div>
            </div>
        </div>
    </td>
</tr>`;
}

async function toggleActive(id, currentActive) {
  const newActive = !currentActive;
  const msg = newActive
    ? "Are you sure you want to activate this account?"
    : "Are you sure you want to deactivate this account? The user will be blocked from signing in.";

  Modal.open({
    title: newActive ? "Activate Account" : "Deactivate Account",
    message: msg,
    type: newActive ? "info" : "warning",
    confirmText: newActive ? "Activate" : "Deactivate",
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}/toggle-active`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newActive),
        });
        const result = await res.json();
        if (result.ok) {
          Toast.show(
            `Account ${newActive ? "activated" : "deactivated"}.`,
            "success",
          );
          window.location.reload();
        } else {
          Toast.show(result.error || "Operation failed.", "danger");
        }
      } catch (err) {
        Toast.show("An error occurred.", "danger");
      }
    },
  });
}

// ── Event delegation for dynamically rendered rows ────────────────────────────
document.addEventListener("click", (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const deleteBtn = e.target.closest("[data-delete]");
  const toggleBtn = e.target.closest("[data-toggle]");
  if (editBtn) openEditModal(editBtn.dataset.edit);
  if (deleteBtn)
    confirmDelete(deleteBtn.dataset.delete, deleteBtn.dataset.name);
  if (toggleBtn)
    toggleActive(toggleBtn.dataset.toggle, toggleBtn.dataset.active === "true");
});

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPaginationBtns(totalPages) {
  const container = document.getElementById("paginationBtns");
  let html = `
        <button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}
            class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            ← Prev
        </button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `
        <button data-page="${i}"
            class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg ${
              i === currentPage
                ? "bg-primary text-white"
                : "border border-slate-200 text-brand-500 hover:bg-slate-50"
            }">
            ${i}
        </button>`;
  }

  html += `
        <button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}
            class="page-btn px-2.5 py-1 text-[10.5px] font-semibold rounded-lg border border-slate-200 text-brand-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            Next →
        </button>`;

  container.innerHTML = html;
}

document.addEventListener("click", (e) => {
  const pageBtn = e.target.closest(".page-btn");
  if (!pageBtn || pageBtn.disabled) return;
  const n = parseInt(pageBtn.dataset.page);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (n < 1 || n > totalPages) return;
  currentPage = n;
  renderTable();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcAge(dob) {
  const b = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  if (
    today.getMonth() < b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())
  )
    age--;
  return age;
}

function getToken() {
  return (
    document.querySelector('input[name="__RequestVerificationToken"]')?.value ??
    ""
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add User";
  document.getElementById("modalUserId").value = "";
  clearModalFields();
  showModal();
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function openEditModal(id) {
  const u = ALL_USERS.find((x) => x.id === id);
  if (!u) return;

  document.getElementById("modalTitle").textContent = "Edit User";
  document.getElementById("modalUserId").value = u.id;
  document.getElementById("mFirstName").value = u.firstName;
  document.getElementById("mLastName").value = u.lastName;
  document.getElementById("mEmail").value = u.email;
  document.getElementById("mDob").value = u.dob;
  document.getElementById("mSex").value = u.sex;
  document.getElementById("mPhone").value = u.phone;
  document.getElementById("mAddress").value = u.address;
  document.getElementById("mRole").value = u.role;
  showModal();
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveUser() {
  const id = document.getElementById("modalUserId").value;
  const isEdit = !!id;
  const saveBtn = document.getElementById("modalSaveBtn");

  const payload = {
    id,
    firstName: document.getElementById("mFirstName").value.trim(),
    lastName: document.getElementById("mLastName").value.trim(),
    email: document.getElementById("mEmail").value.trim(),
    dateOfBirth: document.getElementById("mDob").value,
    sex: document.getElementById("mSex").value,
    phoneNumber: document.getElementById("mPhone").value.trim(),
    address: document.getElementById("mAddress").value.trim(),
    role: document.getElementById("mRole").value,
  };

  if (!payload.firstName || !payload.lastName || !payload.email) {
    Toast.show("First name, last name, and email are required.", "danger");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    const res = await fetch(`/api/admin/users${isEdit ? `/${id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: getToken(),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.ok) {
      closeModal();
      window.location.reload();
      Toast.show(`User ${isEdit ? "updated" : "created"}.`, "success");
    } else {
      Toast.show(result.error ?? "Save failed.", "danger");
    }
  } catch {
    Toast.show("An unexpected error occurred.", "danger");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(id, name) {
  //   document.getElementById("deleteUserName").textContent = name;
  //   document.getElementById("deleteModal").classList.remove("hidden");
  //   document.getElementById("deleteModal").classList.add("flex");
  Modal.open({
    title: "Confirm Delete",
    message: `Are you sure you want to delete user "${name}"? This action cannot be undone.`,
    type: "danger",
    confirmText: "Delete",
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "DELETE",
          headers: { RequestVerificationToken: getToken() },
          credentials: "include",
        });
        const result = await res.json();
        if (result.ok) {
          closeDeleteModal();
          window.location.reload();
          Toast.show("User deleted.", "success");
        } else {
          Toast.show(result.error ?? "Delete failed.", "danger");
        }
      } catch {
        Toast.show("An unexpected error occurred.", "danger");
      }
    },
  });
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function showModal() {
  document.getElementById("userModal").classList.remove("hidden");
  document.getElementById("userModal").classList.add("flex");
}

function closeModal() {
  document.getElementById("userModal").classList.add("hidden");
  document.getElementById("userModal").classList.remove("flex");
}

function clearModalFields() {
  ["mFirstName", "mLastName", "mEmail", "mDob", "mPhone", "mAddress"].forEach(
    (id) => {
      document.getElementById(id).value = "";
    },
  );
  document.getElementById("mSex").value = "";
  document.getElementById("mRole").value = "patient";
}

window.toggleDropdown = (event, btn) => {
  event.stopPropagation();
  const menu = btn.nextElementSibling;
  const isHidden = menu.classList.contains("hidden");

  // Close all other menus
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.add("hidden"));

  if (isHidden) {
    menu.classList.remove("hidden");

    // --- Smart Positioning ---
    const rect = menu.getBoundingClientRect();
    const winH = window.innerHeight;

    if (rect.bottom > winH - 20) {
      menu.style.bottom = "100%";
      menu.style.top = "auto";
      menu.classList.add("mb-2");
      menu.classList.remove("mt-2");
    } else {
      menu.style.bottom = "auto";
      menu.style.top = "100%";
      menu.classList.add("mt-2");
      menu.classList.remove("mb-2");
    }
  }
};

window.addEventListener("click", function (e) {
  if (!e.target.closest(".action-dropdown")) {
    document
      .querySelectorAll(".dropdown-menu")
      .forEach((menu) => menu.classList.add("hidden"));
  }
});

// ── Expose save/close for inline HTML buttons ─────────────────────────────────
window.saveUser = saveUser;
window.closeModal = closeModal;
