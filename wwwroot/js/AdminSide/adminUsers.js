import { Toast, Modal } from "../ui.js";

// ── Data ──────────────────────────────────────────────────────────────────────
const ALL_USERS = JSON.parse(document.getElementById("users-data").textContent);

// ── State ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
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

  initSecurity();
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
                    <div class="text-[13px] font-medium truncate">${u.firstName} ${u.lastName}</div>
                    <div class="text-[10px] text-brand-400 truncate">${u.id.slice(0, 8)}…</div>
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
        </td>
        <td class="px-4 py-3 text-[12.5px] capitalize">${u.role}</td>
        <td class="px-4 py-3">
            <div class="flex items-center gap-1">
                <button data-edit="${u.id}"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50 transition-colors" title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button data-delete="${u.id}" data-name="${u.firstName} ${u.lastName}"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                    </svg>
                </button>
            </div>
        </td>
    </tr>`;
}

// ── Event delegation for dynamically rendered rows ────────────────────────────
document.addEventListener("click", (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const deleteBtn = e.target.closest("[data-delete]");
  if (editBtn) openEditModal(editBtn.dataset.edit);
  if (deleteBtn)
    confirmDelete(deleteBtn.dataset.delete, deleteBtn.dataset.name);
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
  document.getElementById("mPasswordGroup").style.display = "";
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
  document.getElementById("mPasswordGroup").style.display = "none";
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
    password: document.getElementById("mPassword").value,
    dob: document.getElementById("mDob").value,
    sex: document.getElementById("mSex").value,
    phone: document.getElementById("mPhone").value.trim(),
    address: document.getElementById("mAddress").value.trim(),
    role: document.getElementById("mRole").value,
  };

  if (!payload.firstName || !payload.lastName || !payload.email) {
    Toast.show("First name, last name, and email are required.", "danger");
    return;
  }
  if (!isEdit && payload.password.length < 8) {
    Toast.show("Password must be at least 8 characters.", "danger");
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
  [
    "mFirstName",
    "mLastName",
    "mEmail",
    "mPassword",
    "mDob",
    "mPhone",
    "mAddress",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("mSex").value = "";
  document.getElementById("mRole").value = "patient";
}

function initSecurity() {
  // Re-implement your togglePw logic using addEventListener
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      const isPw = input.type === "password";
      input.type = isPw ? "text" : "password";
      btn.innerHTML = isPw
        ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke-width="2" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`;
    });
  });
}

// ── Expose save/close for inline HTML buttons ─────────────────────────────────
window.saveUser = saveUser;
window.closeModal = closeModal;
