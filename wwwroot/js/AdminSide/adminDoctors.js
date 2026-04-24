import { Toast } from "../ui.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value ?? "";
}

// ── Modal open/close ──────────────────────────────────────────────────────────
window.openDoctorModal = async function (doc = null) {
    const errorEl = document.getElementById("doctorModalError");
    errorEl.classList.add("hidden");

    // Reset form
    document.getElementById("doctorId").value = "";
    document.getElementById("doctorProfileId").value = "";
    document.getElementById("doctorTitle").value = "Dr.";
    document.getElementById("doctorSpecialties").value = "";
    document.getElementById("doctorBio").value = "";
    document.getElementById("doctorIsActive").checked = true;

    const profileSelectGroup = document.getElementById("userSelectGroup");

    if (doc) {
        document.getElementById("doctorModalTitle").innerText = "Edit Doctor";
        document.getElementById("doctorId").value = doc.id ?? "";
        document.getElementById("doctorTitle").value = doc.title ?? "Dr.";
        document.getElementById("doctorSpecialties").value = doc.specialties ?? "";
        document.getElementById("doctorBio").value = doc.bio ?? "";
        document.getElementById("doctorIsActive").checked = doc.isActive ?? true;
        profileSelectGroup.classList.add("hidden"); // Cannot change user once created
    } else {
        document.getElementById("doctorModalTitle").innerText = "Add Doctor";
        profileSelectGroup.classList.remove("hidden");
        await loadAvailableUsers();
    }

    document.getElementById("doctorModal").classList.remove("hidden");
    document.getElementById("doctorModal").classList.add("flex");
};

window.closeDoctorModal = function () {
    document.getElementById("doctorModal").classList.add("hidden");
    document.getElementById("doctorModal").classList.remove("flex");
};

// ── Load available users ──────────────────────────────────────────────────────
async function loadAvailableUsers() {
    try {
        const res = await fetch("/api/admin/doctors/available-users", {
            credentials: "include",
        });

        if (res.ok) {
            const data = await res.json();
            if (data.ok) {
                const select = document.getElementById("doctorProfileId");
                select.innerHTML = '<option value="">Select an available user...</option>';
                (data.data ?? []).forEach((u) => {
                    const opt = document.createElement("option");
                    opt.value = u.id;
                    opt.text = `${u.firstName ?? ""} ${u.lastName ?? ""} (${u.email ?? ""})`.trim();
                    select.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load available users", e);
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
window.saveDoctor = async function () {
    const errorEl = document.getElementById("doctorModalError");
    errorEl.classList.add("hidden");

    const id = document.getElementById("doctorId").value;
    const profileId = document.getElementById("doctorProfileId").value;
    const title = document.getElementById("doctorTitle").value.trim();
    const specialtiesStr = document.getElementById("doctorSpecialties").value.trim();
    const bio = document.getElementById("doctorBio").value.trim();
    const isActive = document.getElementById("doctorIsActive").checked;

    if (!id && !profileId) {
        errorEl.innerText = "Please select a user profile.";
        errorEl.classList.remove("hidden");
        return;
    }
    if (!title) {
        errorEl.innerText = "Title is required.";
        errorEl.classList.remove("hidden");
        return;
    }

    const payload = {
        title,
        specialties: specialtiesStr
            ? specialtiesStr.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        bio,
        isActive,
    };
    if (!id) payload.profileId = profileId;

    try {
        const url = id ? `/api/admin/doctors/${id}` : "/api/admin/doctors";
        const method = id ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                RequestVerificationToken: getToken(),
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
            errorEl.innerText = data.error || "Failed to save doctor.";
            errorEl.classList.remove("hidden");
        } else {
            Toast.show("Doctor saved successfully.", "success");
            window.location.reload();
        }
    } catch (e) {
        errorEl.innerText = "Network error. Please try again.";
        errorEl.classList.remove("hidden");
    }
};

// ── Close on backdrop click ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("doctorModal")?.addEventListener("click", (e) => {
        if (e.target.id === "doctorModal") closeDoctorModal();
    });
});
