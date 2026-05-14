# Waitlist Promotion & Booking for Others Refactor

## 1. Overview
This design addresses two key areas of the appointment system:
1.  **Waitlist Promotion UX:** Improving the process of turning a waitlisted entry (which only has a Date) into a confirmed appointment (which requires a Time).
2.  **Booking for Others Identity Integrity:** Enhancing the "Book for Someone Else" flow to capture the patient's email for better identity matching (Identity Bridge) and removing redundant fields.

---

## 2. Waitlist Promotion: "Pick Your Time" Flow

### Current Problem
Waitlist appointments in the database have a `Date` but often a placeholder or null `Time`. When promoted to `pending`, the patient receives an email to "Confirm," but there is no mechanism for them to select which specific open slot they want to occupy.

### Proposed Solution: Selection Landing Page
1.  **Route:** `GET /Confirm-Promotion?id={appt_id}` (Public Page)
2.  **Workflow:**
    *   The patient clicks the link in their promotion email.
    *   The page fetches the appointment details (Date, Service, Doctor).
    *   The page fetches available time slots for that specific Date/Service/Doctor using the existing `api/appointments/availability` endpoint.
    *   The patient selects a slot from the grid.
    *   The patient clicks **"Confirm Appointment"**.
    *   The system updates the appointment: `status = 'confirmed'`, `appointment_time = selected_time`, `soft_lock_until = null`.

### Expiration Logic
*   If the `soft_lock_until` (set during promotion) passes, the `AppointmentLockWorker` will:
    1. Send a "Slot Offer Expired" email to the patient.
    2. Reset the appointment back to `waitlist` OR mark as `cancelled` (user choice: usually `cancelled` to keep the audit trail clean, patient must re-join if they missed the window).

---

## 3. Booking for Someone Else Refactor

### UI Changes (`step3-details.js`)
*   **Remove:** `Emergency Contact` field.
*   **Add:** `Patient Email (Optional)` field.
*   **Logic:**
    *   Remove `Other Phone` field.
    *   The Booker's phone (from the first part of the form) will be used as the primary contact for the appointment.
    *   **Mapping:** The booker's phone will be mapped to both the `PatientPhone` and `OtherPhone` in the payload to ensure the matching engine correctly identifies the person associated with that contact.
    *   If `Patient Email` is provided, it will be used for the Identity Bridge (linking future account creations to this record).

### Backend Changes (`AppointmentService.cs`)
*   Update `AppointmentPayload` to handle the new field mapping.
*   Update `Create` logic to ensure `targetEmail` uses `OtherEmail` if provided.

---

## 4. Proposed Changes

### [MODIFY] [AppointmentService.cs](file:///c:/Users/Admin/SamsonDentalCenterManagementSystem/Services/AppointmentService.cs)
*   Update `SendWaitlistPromotionEmail` to link to the new confirmation page.
*   Ensure `ConfirmPromotion` (or a new overload) can accept a `selectedTime`.

### [MODIFY] [PublicDataController.cs](file:///c:/Users/Admin/SamsonDentalCenterManagementSystem/Controller/PublicDataController.cs)
*   Add a POST endpoint for `confirm-promotion-with-time`.

### [NEW] [ConfirmPromotion.cshtml](file:///c:/Users/Admin/SamsonDentalCenterManagementSystem/Pages/PatientSide/Appointments/ConfirmPromotion.cshtml)
*   A new public-facing Razor Page for time selection.
*   Reuses the CSS and components from the main booking flow for a consistent "Samson Dental" aesthetic.

### [MODIFY] [step3-details.js](file:///c:/Users/Admin/SamsonDentalCenterManagementSystem/wwwroot/js/PatientSide/steps/step3-details.js)
*   Update the "Someone Else" form fields.

### [MODIFY] [step4-review.js](file:///c:/Users/Admin/SamsonDentalCenterManagementSystem/wwwroot/js/PatientSide/steps/step4-review.js)
*   Update the review summary layout.

---

## 5. Verification Plan

### Automated Verification
*   **Promotion Flow:** Manually promote a waitlisted item in the DB/Admin UI -> Receive email -> Use link -> Select time -> Verify appointment is now `confirmed` with the chosen time.
*   **Other Booking:** Create a "Someone Else" booking with an email -> Verify shadow profile created with that email -> Create new account with same email -> Verify records are claimed.

### Manual Verification
*   Check the "Lock Expired" email trigger by setting a short `soft_lock_until` and waiting for the background worker.
