- Removed magnetic effect from hero buttons. Added to floating info badge. Added professional hover scale/shadow to buttons.
- Enhanced Services module:
  - Updated `DentalService` model to use simple strings for `Steps` and `Question`/`Answer` for `FAQs`.
  - Added Icon, Process Steps, and FAQ editing to Admin Services modal.
  - Fixed rendering of Steps and FAQs on patient-side service detail page.
  - Added service icons to patient-side service cards.
- Enhanced Admin UI (Uncodixfy compliant):
  - Redesigned Admin Service cards with hero images, category badges, and active status.
  - Implemented client-side pagination (20 items/page) for Appointments.
  - Updated User management pagination to 20 items per page.
  - Standardized border-radius (12px max) across Admin Appointments, Users, and Services.

* **Date**: 2026-04-27
* **Recent Changes**:
  - Replaced `service_name` in appointments with a relational fetch using `dental_services`.
  - Fixed `InvoiceService` by adding missing `System.Text` for `Encoding`.
  - Added auto-no-show logic for appointments 24 hours past the scheduled date.
  - Refactored `Dashboard` filtering for confirmed appointments.
  - Renamed "Transactions" to "Billing & Invoices" and migrated Invoice list.
  - Changed "Invoices" page to explicitly display "Arrived Patients" grid for both Admin and Doctor.
  - Implemented `payments` table and `RecordPaymentAsync` in `InvoiceService`.
  - Added `/api/invoice/pay` endpoint to `InvoiceController` for billing actions.
  - Refactored Patient Settings to hide "Save Changes" on the first tab, moving update logic to the "Contact & Address" tab.
  - Fixed blurry avatar images using CSS `image-rendering` optimizations.
  - Added UUID validation to `InvoiceController` to prevent 400 Bad Request errors.
* **Current Blockers**: None.

- Fixed fetching issues: Added missing System.Text using directive in InvoiceService for Encoding.
- Refactored Appointments: Removed obsolete `service_name` column, migrating to join with `dental_services` via a new SQL migration and updated AppointmentService DTOs.
