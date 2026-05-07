- **Date**: 2026-05-04 (Appointment Refactor: Split Patient Names)
- **Database & Model Refactoring**:
  - **Split Patient Name**: Successfully refactored the monolithic `patient_name` field into `patient_first_name` and `patient_last_name` across the entire stack.
  - **Migration**: Created `20260504_SplitAppointmentPatientName.sql` to safely migrate data and update the `appointments` table schema.
  - **Computed Property**: Added a `PatientName` computed property to the `Appointment.cs` model to maintain backward compatibility with existing server-side logic and JSON serialization.
- **API & Controller Updates**:
  - Updated `AppointmentService.cs` and `AppointmentPayload` to handle split name inputs during creation and matching.
  - Refactored `AppointmentsController`, `AdminDataController`, and `AdminBlockedDatesController` to project separate name fields in API responses.
- **Frontend & UI Standardization**:
  - **Admin/Staff Portals**: Updated `adminAppointment.js`, `Appointments.cshtml` (Admin, Doctor, Receptionist), and `doctorInvoice.js` to handle split names in search, modals, and tables.
  - **Patient Portal**: Refactored the multi-step booking process (`step4-review.js`, `step5-success.js`) to collect and display first/last names separately.
  - **Dashboard & Profile**: Updated `MyAppointments.cshtml`, `Confirmed.cshtml`, and `Dashboard.cshtml.cs` to ensure consistent name rendering across the patient portal.
- **Source of Truth**: Updated `Blueprint/schema.sql` to reflect the new table structure.

- **Date**: 2026-05-04
- **Patient Management Expansion**:
  - **Add Patient for Doctors**: Implemented a functional "Add Patient" workflow in the Doctor Portal, mirroring the Admin UI.
    - Added `POST /api/admin/data/patients` to `AdminDataController`.
    - Integrated `UserModal` and patient creation logic in `DoctorSide/Patients/Index.cshtml`.
    - Automatically pre-selects the "Patient" role and hides the role selector for a streamlined staff experience.
- **Stability & Parity Fixes**:
  - Resolved build errors in `AdminReceptionistsController.cs` and standardized `SetAvailabilityAsync` calls across staff services.
- **Date**: 2026-05-04
- **Portal Stability & Availability Refactor**:
  - **Restored Doctor Availability Editor**: Re-enabled functional schedule management for doctors in `DoctorSide/Availability/Availability.cshtml`. It now mirrors the Admin-side UX (adding/deleting slots) but is securely scoped to the logged-in doctor.
  - **New Endpoint**: Added `POST api/admin/data/my-availability` to `AdminDataController` to allow staff to update their own working hours without requiring Admin-level permissions.
  - **Service-Level Null Safety**: Robustified `DoctorDto` and `ReceptionistDto` by adding deep null checks to the `Initials` calculation, preventing potential `NullReferenceException` crashes.
  - **Build Fix**: Aligned `ReceptionistService` with `DoctorService` by implementing `SetAvailabilityAsync`, resolving a compiler error in `AdminDataController`.
  - **JS Resiliency**: Ensured all dashboard and availability components handle role-specific data correctly, resolving `TypeError` and `403 Forbidden` errors.
- **Date**: 2026-05-04 (Optimizing Administrative Billing & Portal)
* **Patient Data Hydration (Avatars & Names)**:
  - **Fixed Mapping**: Resolved a critical data gap where patient names were missing in billing and treatment views. Root cause: `Profile` properties were using camelCase `[JsonPropertyName]`, mismatching Supabase's snake_case output. Fixed in `Profile.cs`.
  - **Avatar Injection**: Updated `AdminDataController.cs` and `AppointmentService.cs` to explicitly project and join `patientAvatarUrl` in all relevant DTOs and PostgREST queries.
  - **Fallback Logic**: Standardized frontend rendering in `doctorInvoice.js` and `Billing.cshtml` to correctly display avatars or initials fallback.
* **Automated Billing Reference Numbers**:
  - Implemented 8-character alphanumeric auto-generation for billing reference numbers in `Billing.cshtml`.
  - Removed manual input fields in favor of a read-only "Generated Reference" display to ensure consistency and professional record-keeping.
* **Medical Portal: Treatment Granularity**:
  - **Recent Treatments Refactor**: Overhauled the 'Recent Treatments' table to display individual treatment records instead of invoices. Each row now corresponds to a single procedure (e.g., "Teeth Cleaning") with its own clinical status (Completed, Planned, etc.).
  - **Nested Data Joins**: Updated `Treatment` model and `RecordService` to support deep joins (`treatments -> invoices -> profiles`), ensuring patient and doctor info is available per treatment row.
  - **Dedicated API Endpoint**: Added `/api/admin/data/treatments` to handle the new granular data requirements.
  - **Enhanced View Modal**: Updated the treatment detail modal to focus on specific procedure details, diagnoses, and statuses.
* **Shadow Profile & Clinical Initialization**:
  - **Conflict Resolution**: Robustified `CreateShadowProfile` in `ProfileService.cs` by adding a pre-check for existing `auth.users` records. This resolves `email_exists` (422) errors and correctly links guests with existing accounts to their patient profiles.
  - **Automated Medical Records**: Implemented `InitializePatientRecords` in `RecordService.cs`, which is now called by `AppointmentService.cs` whenever a guest/shadow profile is promoted (marked as 'Arrived'). This ensures every patient has a base `PatientMedicalInfo` record for clinical documentation.
  - **Diagnostic Logging**: Added detailed response body logging to `InvoiceService.cs` and `AppointmentService.cs` to identify the root cause of 400 Bad Request errors from Supabase during billing and status updates.
  - **DI Synchronization**: Updated `Program.cs` to correctly wire up `RecordService` as a dependency for `AppointmentService`.
- **Date**: 2026-05-03

* **Schema Cache PGRST204 Fixes**:
  - `CreateTreatmentsAsync` (InvoiceService): Replaced ORM `.Insert()` with raw HTTP POST. Explicit snake_case payload bypasses Supabase schema cache. Furthermore, `tooth_data` and `xray_data` were removed from `Treatments` table insertion entirely, as they are no longer mapped there.
  - `InvoiceController` now catches `ToothData` JSON and directly syncs odontogram updates to the `patient_tooth_status` table via `RecordService`.
  - `CreateShadowProfile` (ProfileService): Now utilizes `auth/v1/admin/users` to generate an `auth.users` row first, resolving the `profiles_id_fkey` violation for guest bookings. It also implements an automatic fallback to a `shadow_UUID@shadow.local` email if the guest's provided email already exists in `auth.users` but wasn't matched in `profiles`.
* **InvoiceController error handling**: Treatments now wrapped in separate try/catch — invoice saves even if treatment insert fails. Returns `{ ok:true, warning: "..." }` on partial success. PGRST errors decoded to human-readable message.
* **doctorInvoice.js UX**:
  - `addServiceItemManual` gets `silent` param — auto-add on modal open suppresses toast.
  - Submit result: shows warning toast if `result.warning` present, success toast otherwise.
* **Auth & Token Expiry Handling**:
  - Implemented global `auth-guard.js` to intercept 401/expired token responses and force redirect to Signin.
  - Updated `Program.cs` JWT events to return JSON for API calls and redirect for page loads on 401.
  - Standardized all `RedirectToPage("/Sign-in")` and `/Sign-n` typos to `/Authentication/Signin` across the codebase.
  - Updated `signout()` logic to perform `localStorage.clear()` for complete state reset.

* Removed magnetic effect from hero buttons. Added to floating info badge. Added professional hover scale/shadow to buttons.
* Enhanced Services module:
  - Updated `DentalService` model to use simple strings for `Steps` and `Question`/`Answer` for `FAQs`.
  - Added Icon, Process Steps, and FAQ editing to Admin Services modal.
  - Fixed rendering of Steps and FAQs on patient-side service detail page.
  - Added service icons to patient-side service cards.
* Enhanced Admin UI (Uncodixfy compliant):
  - Redesigned Admin Service cards with hero images, category badges, and active status.
  - Implemented client-side pagination (20 items/page) for Appointments.
  - Updated User management pagination to 20 items per page.
  - Standardized border-radius (12px max) across Admin Appointments, Users, and Services.

- **Date**: 2026-04-28 (Refactor Phase)

* **Admin Portal Data Hydration Refactor**:
  - Deprecated legacy monolithic `/api/admin/data/all` endpoint in favor of granular, module-specific fetching.
  - Resolved persistent `System.NotSupportedException` (triggered by `PrimaryKeyAttribute` during serialization) by implementing manual DTO projection in `AdminDataController.cs`.
  - Refactored `AdminStore.js` to support independent cache keys and LocalStorage persistence for individual modules (appointments, patients, invoices, inquiries, users, settings, stats, doctors, receptionists).
  - Fixed Users Management hydration: Correctly projected `dob`, `sex`, `address`, and `isActive` to fix 'Cannot read properties of undefined' errors in the users table.
  - Fixed Inquiries Sidebar hydration: Added nested `patient` object (name, avatar, status) to projected inquiry data to fix guest user detection and profile rendering.
  - Fixed Clinic Settings hydration: Standardized field names (e.g., `clinicalHoursJson`) to match JavaScript expectations in `adminSettings.js`.
  - Fixed Staff Management hydration:
    - Added dedicated `doctors` and `receptionists` projected endpoints.
    - Included nested profile and availability data to resolve 'inactive' status and missing profile info on staff cards.
  - Resolved `CS1061` compilation error in `AdminDataController` by correctly accessing `Doctor.Profile.FullName` instead of the non-existent `Doctor.FullName`.
  - Verified stability: All admin dashboard modules now hydrate independently and display clean data without framework metadata leaks.
    26:
    27: \* **Date**: 2026-04-28 (Final Polish)
    28: - **Admin Portal Rendering Stabilization**:
    29: - Resolved 'undefined' patient rendering: Corrected property mapping from `dateOfBirth` to `dob` and `phoneNumber` to `phone` in `adminPatient.js`.
    30: - Resolved 'unknown' patient names in invoices: Updated `doctorInvoice.js` and `AdminDataController.cs` to correctly project and display `patientName` fallback.
    31: - Fixed 'undefined' users in management table: Synchronized property access in `adminUsers.js` with flattened DTO structure.
    32: - Fixed Guest Inquiries: Improved name detection in `adminInquiries.js` to correctly display `guestFirstName`/`guestLastName` when a patient ID is absent.
    33: - Fixed Settings Tab hydration: Corrected property name mapping in `adminSettings.js` (e.g., `clinicalHours` vs `clinicalHoursJson`) to ensure clinical hours, FAQs, and photos render correctly.
    34: - Fixed Staff Management URL: Corrected endpoint path in `adminStaff.js` to `/api/admin/data/doctors` for consistent data retrieval.
    35: - Improved UI robusticity: Added fallbacks for initials extraction and null-checks across all projected frontend components.

- **Date**: 2026-04-28

* **Advanced Clinic Settings**:
  - Merged "Hours" and "Status" into a unified "Availability" management system.
  - Added new Identity fields: Facebook URL, Google Maps Embed, and Landline.
  - Implemented Staged Photo Gallery (URLs saved to JSON column only on form commit).
  - Redesigned Hours UI with a visual timeline layout.
  - Replaced static success alerts with centralized Toast system.
* **Admin Clinic Settings**:
  - Implemented centralized settings management for clinic details, hours, FAQs, and operation status.
  - Added `clinic_settings` table with support for social links and map embeds.
  - Created `ClinicService` with photo storage integration.
  - Enhanced Admin Inquiries: Added deactivation indicators and fixed profile name matching for registered users.
  - Fixed Patient Profile update bug by syncing property names between JS and backend attributes.
  - Fixed role-based redirection logic in `_Layout.cshtml` to handle Admin, Doctor, and Receptionist roles.
  - Refactored `Signin.cshtml.cs` to dynamically redirect based on user role instead of hardcoding Admin dashboard.
  - Implemented server-side redirection in `Index.cshtml.cs` for staff roles to prevent Home page access for logged-in staff.

- **Date**: 2026-04-27
- **Recent Changes**:
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
  - Added client-side filtering (search and status) to Admin Invoices and Transactions pages.
  - Implemented "Confirm Payment" modal in Transactions page to record payments to the `payments` table.
  - Fixed horizontal overflow on invoice tables to ensure "Amount" column is visible.
  - Connected "Confirm Payment" button to `/api/invoice/pay` endpoint.
  - Implemented Inquiries feature with support for both registered patients and guests.
  - Implemented chat-like UI for inquiries in Admin and Patient (Contacts) portals.
  - Enhanced Admin Inquiries UI: added active conversation highlighting, initial selection on load, unread indicators, mobile-responsive layout (sidebar toggle), and multi-line auto-resizing input.
  - Improved Patient Contacts UI: added multi-line auto-resizing chat input, whitespace preservation in messages, and mobile keyboard focus scrolling fixes.
  - Fixed bug where Admin sender_id was not being saved in inquiry messages.
  - Fixed chat persistence on Patient side by fetching existing inquiries on page load.
  - Resolved profile join issues on Admin side by adding explicit JsonPropertyName mapping for Patient and Sender references.
  - Implemented patient avatars and full name display in Admin inquiries list.
  - Implemented predefined answers for staff to quickly reply to common inquiries.
  - Added polling mechanism to simulate real-time message updates.
  - Updated database schema with `inquiries` and `inquiry_messages` tables including guest contact fields.
  - Fixed 500 Internal Server Error in InquiryController by projecting messages to DTOs, avoiding serialization issues with Supabase BaseModel metadata.
  - Implemented Review Management System:
    - Created `Review` model and `ReviewService` for managing patient testimonials.
    - Added Admin Reviews management page with visibility toggles and manual review entry.
    - Integrated dynamic reviews into Home page with horizontal scrolling and platform icons (Google/Facebook).
    - Added dynamic rating/count stats to Home and Patient Signin pages.
    - Implemented real Apify Yelp Scraper integration with manual trigger and caching in Supabase.
  - Refactored Profile and Security management:
    - Fixed 500 error on profile save by adding `Newtonsoft.Json.JsonIgnore` to UI-only fields in `Profile` model.
    - Separated basic profile details (Name, DOB, Phone, Address) from account security (Email, Password).
    - Moved Email field to Security tab in Settings page.
    - Updated `SettingsController` and `settings.js` to handle separated update flows.
    - Implemented "Forgot Password" functionality with a new request page and Supabase integration.
    - Added `ResetPasswordForEmail` to `ProfileService`.
  - Enhanced Email Confirmation and Password Recovery:
    - Refactored `AuthController.ConfirmEmail` to fetch real user roles and profiles from Supabase.
    - Updated `EmailConfirmed.cshtml` to handle `signup`, `email_change`, and `recovery` types.
    - Implemented `ResetPassword` page to handle password recovery via email links.
    - Added robust error handling for expired or invalid confirmation tokens.
    - Fixed authentication redirection by explicitly setting `EmailRedirectTo` in Signup and Forgot Password flows.
    - Improved `EmailConfirmed.cshtml` to detect tokens from both URL hash and query parameters.
    - [x] Unified Odontogram: Standardized on Universal (1-32) numbering and shared chart in treatment modal.
    - [x] Clinical Data Sync: Implemented history fetching and global sync for tooth status in invoices.
    - Expanded support for `invite` and `email_change` confirmation types.
  - Profile Settings Refactor (Part 2):
    - Moved Email field back to Contact tab for easier access.
    - Re-integrated email update into `SavePersonal` flow.
    - Replaced "Delete Account" with "Deactivate Account" flow.
    - Implemented `is_active` status in `profiles` table with migration.
    - Added `DeactivateAccount` logic to `ProfileService` and `SettingsController`.
    - Updated Sign-in logic to block deactivated accounts and provide `error_type: account_deactivated`.
    - Implemented Reactivation Request flow:
      - Added `reactivation_requested` column to `profiles` with migration.
      - Added `RequestReactivation` endpoint to `AuthController`.
      - Integrated "Request Activation" Modal in sign-in page for deactivated users.
    - Enhanced Admin Users Management:
      - Added "Status" column to Admin Users table.
      - Implemented deactivation/activation toggle in Admin UI.
      - Added `ToggleActive` endpoint to `AdminUsersController`.
      - Visual indicators for reactivation requests in the Admin table.
- **Date**: 2026-04-28 (Stability & Bug Fixes)

* **JSON Parsing Robustness**:
  - Hardened frontend `fetch` operations in `AdminStore.js`, `adminInquiries.js`, and `auth.js` to handle non-JSON or empty responses gracefully, preventing "Unexpected end of JSON input" errors.
  - Added status and content-type checks before calling `.json()` on all administrative and authentication API responses.
* Resolved "null patientId" in Admin dashboards by adding fallbacks to navigation property IDs in `AdminDataController.cs` (Appointments and Inquiries).
  - Verified and ensured `InquiryService.cs` correctly projects patient identifiers even when primary IDs are missing in the base record.
* **Inquiry UI Improvements**:
  - Implemented dynamic date separators in Admin chat messages ("Today", "Yesterday", or full date like "March 30") with horizontal lines for improved readability.
  - Fixed mobile keyboard focus and scroll behavior in admin inquiry view.

- **Date**: 2026-04-30 (UI/UX Refinement & Stability)

* **Settings Modularization**:
  - Split the monolithic `Settings.cshtml` into four dedicated Razor Pages: `Identity`, `Availability`, `FAQs`, and `Photos` under `/Admin/Settings/`.
  - Updated `AdminSettingsModel` to support partial section updates, preventing data loss when saving individual pages.
  - Implemented a collapsible dropdown and popup menu for Settings in the sidebar, supporting both expanded and collapsed states.
  - Refactored `adminSettings.js` to handle page-specific initialization and removed legacy tab logic.
* **Cache Invalidation & Data Reactivity**:
  - Replaced manual `window.location.reload()` calls with `AdminStore.invalidate()` across all management modules (Users, Services, Staff, Appointments).
  - Ensured data changes are reflected instantly in grids by re-hydrating from `AdminStore` after mutations.
* **Enhanced UX Flows**:
  - Implemented "Discard Changes" confirmation modals across all major management forms using `Modal.open`.
  - Standardized deletion guards with confirmation modals for FAQs, Photos, Staff, and Services.
  - Fixed Inquiry timestamp discrepancies by standardizing UTC date parsing in `adminInquiries.js`, resolving the "now" display issue for older messages.
* **Staff Portal Navigation**:
  - Added "Profile" and "Sign Out" popup menu to the sidebar avatar for collapsed state.
  - Synchronized sidebar active states with the new modular Settings routes.

- **Date**: 2026-04-29

* **Real-Time Infrastructure & Identity Tracking**:
  - **SignalR Integration**:
    - Implemented `AdminHub` for real-time broadcasts.
    - Integrated SignalR into `AppointmentService`, `InvoiceService`, and `InquiryService` to broadcast state changes instantly.
    - Updated `AdminStore.js` to act as a centralized SignalR client, managing cache invalidation and event dispatching (`admin:*:updated`).
  - **Automated Identity Logging**:
    - Refactored `ActivityLogService` to use `IHttpContextAccessor` for automatic performer identification.
    - Enhanced audit logs to consistently display the name of the performing user (Staff/Doctor) instead of "System".
  - **Reactive Admin UI**:
    - Migrated `adminAppointment.js`, `doctorInvoice.js`, and `adminInquiries.js` to event-driven updates, removing legacy `location.reload()` calls.
    - Replaced message polling in Inquiries with instant SignalR delivery.
    - Implemented role-based invoice filtering: Doctors now only see their assigned patients, while Admins retain a master overview on the Transactions page.
* **Analytics & Reporting (Chart.js)**:
  - Included Chart.js CDN globally via `_StaffLayout.cshtml`.
  - Refactored `/api/admin/data/stats` in `AdminDataController.cs` to aggregate dynamic chart data: Weekly Visits, Department Load, Monthly Revenue Trend, and Key Metrics.
  - Replaced hardcoded dashboard elements with dynamic `canvas` components for Patient Visits (Bar Chart) and Department Load (Doughnut Chart).
  - Built a new `/api/admin/data/reports-data` endpoint to calculate Big Three KPIs, Provider Utilization, Status Distribution, Demographics Heatmap, and Time Leak.
  - Completely redesigned `Reports.cshtml` and `adminReports.js` to feature a Date Range Picker, Status Pie Chart, Location Heatmap, Provider utilization table, and Appointment Pulse Grid.
* **Staff Profile Settings**:
  - Implemented `/StaffProfile` page mapping directly to the `_StaffLayout.cshtml` allowing all staff roles (Admin, Doctor, Receptionist) to update their personal details, address, password, and avatar.
  - Re-used existing API endpoints (`/api/settings/update-profile`, `/api/settings/update-password`, `/api/settings/upload-avatar`) providing uniform logic across Patient and Staff portals.
  - Adapted the frontend script (`staffProfile.js`) to dynamically update the Staff Layout sidebar elements instead of the patient top navigation bar.

- **Date**: 2026-04-30 (Bug Fixes)

* **Doctor Key Mismatch (Staff Grid "undefined")**:
  - Root cause 1: `AdminStore.invalidate` was undefined — callers silently failed, stale cache persisted. Fixed: added `invalidate: clearCache` alias to `AdminStore` exports.
  - Root cause 2: `adminAppointment.js` used `/api/admin/doctors` (raw Supabase models) with cache key `"doctors"`, poisoning the shared cache with wrong-shape data. Fixed: changed to `/api/admin/data/doctors` (projected DTOs).
  - Root cause 3: `adminStaff.js` `docJson` serialized `isActive: doc.is_active` (snake_case) but DTO uses camelCase `isActive` → always `undefined` in edit modal. Fixed: `doc.is_active` → `doc.isActive`.
  - Removed leftover `console.log(doc)` debug line from `renderDoctorCard`.

- **Date**: 2026-04-30 (Feature: Date Blocking)

* **Soft Date Blocking for Appointments**:
  - Added `blocked_dates` table (migration: `20260430_CreateBlockedDates.sql`). Fields: `id`, `blocked_date` (unique), `reason`, `blocked_by` (FK → profiles), `created_at`.
  - Created `BlockedDate.cs` model with `[Table]`, `[Column]`, `[PrimaryKey]` attributes.
  - Created `BlockedDateService.cs`: `GetAllAsync`, `IsDateBlockedAsync`, `BlockDateAsync`, `UnblockDateAsync`, `GetBlockedDateStringsAsync`.
  - Registered `BlockedDateService` as `AddScoped` in `Program.cs`.
  - Created `AdminBlockedDatesController.cs` (`/api/admin/blocked-dates`):
    - `GET` — list all blocked dates (admin only)
    - `GET /strings` — list date strings for calendar (anonymous — patient side)
    - `POST` — block a date; returns `conflicts[]` + `conflictCount` of active appointments on that day
    - `DELETE /{id}` — unblock a date
  - Injected `BlockedDateService` into patient `AppointmentsController`: guards booking with 409 if date is blocked. Also exposed `GET /api/appointments/check-date?date=` for frontend calendar.
  - Admin UI (`Appointments.cshtml`): added "Block Date" button to header; Block Date modal (date picker + reason + currently-blocked list with remove); Conflict modal (amber warning, lists affected patients with contact info).
  - `adminAppointment.js`: `openBlockDateModal`, `closeBlockDateModal`, `submitBlockDate`, `showConflictModal`, `closeConflictModal`, `unblockDate`, `renderBlockedList`, `loadBlockedDates`. Conflict flow auto-triggers after successful block if `conflictCount > 0`.
  - `schema.sql` updated with `blocked_dates` table + index.
  - **Soft block behavior**: existing appointments are NOT cancelled. Admin sees the conflict list and handles them manually (notify/reschedule).

- **Date**: 2026-04-30 (Staff Restructuring & Analytics Attribution)

* **Staff Portal Modularization**:
  - Split the monolithic `Staff.cshtml` into two separate pages: `Doctors/Index.cshtml` and `Receptionists/Index.cshtml`.
  - Converted the "Staff" sidebar navigation item into a collapsible dropdown containing "Doctors" and "Receptionists".
  - Split `adminStaff.js` into `adminDoctors.js` and `adminReceptionists.js` for independent logic and data hydration.
* **Receptionist Schema Parity**:
  - Added `bio` and `receptionist_availability` support mirroring the Doctor implementation.
  - Updated `ReceptionistService.cs` and `/api/admin/receptionists` to handle full CRUD operations for both bio and availability.
  - Unified `StaffModal.cshtml` fields so Bio and Availability Schedule are shared sections between Doctors and Receptionists.
* **Appointment Source Tracking**:
  - Added `source` column to `appointments` table (e.g., online, admin, walk_in, guest).
  - Updated `AdminDataController` and frontend logic (`adminAppointment.js`, `Appointments.cshtml`) across Admin, Doctor, and Receptionist portals to display the source context badge within the scheduling table.

- **Date**: 2026-04-30 (Bug Fixes & staff_availability Merge)

* **BlockedDate PGRST204 Fix**: Added `[JsonIgnore]` to `BlockedByProfile` nav property in `BlockedDate.cs`.
* **Activity Log IP Fix**: `ActivityLogService.cs` maps `::1` → `127.0.0.1`, strips `::ffff:` prefix.
* **Inquiry Timestamp Fix**: `InquiryService.cs` uses ISO 8601 for `updated_at`; `adminInquiries.js` `timeAgo()` handles clock skew.
* **Invoice 0 Amount Fix**: Force-bust services cache on load; re-lookup price from live `SERVICES[]` array in `doctorInvoice.js` instead of stale `data-price` attribute.
* **Receptionist Availability Day Fix**: `adminReceptionists.js` `getAvailabilitySlots()` now uses snake_case keys matching backend DTO `[JsonPropertyName]`.
* **staff_availability Schema Merge**:
  - Migration: `20260430_MergeStaffAvailability.sql` — creates `staff_availability(staff_id, staff_type, ...)`, migrates rows, drops old tables.
  - `Models/Doctor.cs`: `DoctorAvailability` → `StaffAvailability` (unified model).
  - `Models/Receptionist.cs`: `ReceptionistAvailability` removed; uses shared `StaffAvailability`.
  - `Services/DoctorService.cs`: Two-step fetch (no PostgREST embed). `FetchDoctorAvailabilityAsync()` queries `staff_availability?staff_type=eq.doctor`, merges by `staff_id`. Graceful fallback if table absent.
  - `Services/ReceptionistService.cs`: Same pattern with `FetchReceptionistAvailabilityAsync()`.
  - `Controller/AdminDoctorsController.cs`: `SetAvailability` takes `List<StaffAvailability>`.
  - **ACTION REQUIRED**: Run `Backend/Migrations/20260430_MergeStaffAvailability.sql` in Supabase SQL Editor.
* **Activity Logs UI Enhancements**:
  - Moved `category` badge to the top of each log entry for better visibility.
  - Implemented action-based color coding (Green: Add/Create, Red: Delete/Cancel, Amber: Update/Modify, Violet: Auth/Login).
  - Added real-time filtering by search term and category.
  - Improved layout with 2xl rounded corners and better typography.

- **Date**: 2026-05-01 (Staff Portal Finalization)

* **Portal Feature Parity & Segmentation**:
  - Successfully finalized functionality for **Doctor** and **Receptionist** portals, ensuring visual and feature parity with the Administrative dashboard while maintaining strict role-based data isolation.
  - **Inquiry Chats**: Enabled the full Chat-UI in both staff portals, allowing doctors and receptionists to handle patient inquiries directly with real-time updates via SignalR.
  - **Activity Logs**: Integrated the Administrative activity log view into staff portals, providing staff with a history of system events filtered by their permissions.
  - **Receptionist Dashboard**: Enhanced with interactive "Weekly Visits" and "Department Load" charts powered by Chart.js, providing front-desk analytics at a glance.
* **Reporting & Data Scoping**:
  - **Doctor-Specific Analytics**: Refactored the /api/admin/data/reports-data endpoint in AdminDataController.cs to automatically scope all KPIs (Completion Rate, Bookings, Utilization) to the logged-in doctor's profile.
  - **Invoice Scoping**: Standardized the Invoices view for Doctors to only display their assigned arrived patients and historical invoices, while Receptionists retain the global clinic billing overview.
  - **Dynamic Invoicing**: Overhauled the Doctor Invoices page to match the Admin's pre-selection and dynamic loading logic, including the ability to start treatments directly from the dashboard "Treatment Center".
* **Infrastructure & Stability**:
  - **JS Resiliency**: Implemented defensive null-check guards in dminAppointment.js and dminDashboard.js to prevent runtime TypeErrors on pages that omit specific dashboard elements (like stat cards or charts).
  - **API Optimization**: Fixed a "300 Multiple Choices" ambiguity error in StaffLeaveService.cs by explicitly specifying foreign key hints in the Supabase query.
  - **Modular Page Models**: Successfully separated and namespaced Razor Page models for all staff portals (SamsonDentalCenterManagementSystem.Pages.DoctorSide._ and SamsonDentalCenterManagementSystem.Pages.ReceptionistSide._) to prevent naming conflicts and improve maintainability.
* **Availability & Leave Management**:
  - Implemented a unified **My Schedule** page for all staff, featuring a dynamic calendar view and leave application workflow.
  - Created staffAvailability.js to manage the lifecycle of leave requests and schedule visualization across all staff roles.

- **Date**: 2026-05-02 (Appointment Scheduling Fixes)

* **Date/Time Mismatch Fix**:
  - Root cause: `new Date(STATE.date + "T00:00:00").toISOString()` in PH timezone (UTC+8) converted local midnight to UTC, rolling the date back one day before sending to backend.
  - Fix: Changed all date constructions in `step4-review.js` to use `T12:00:00` (noon anchor) so UTC conversion stays on the same calendar day.
* **12PM Slot Removed (Clinic Lunch Policy)**:
  - Removed `"12:00 PM"` from `ALL_SLOTS` in both `appointment-state.js` (client) and `AppointmentService.cs` (server).
  - Clinic hours now: 9AM, 10AM, 11AM, 1PM, 2PM, 3PM, 4PM, 5PM.
* **Service Duration → Numerical**:
  - Migration: `20260502_AddDurationMinutesToServices.sql` — adds `duration_minutes INTEGER` to `dental_services`, populates from policy.
  - Policy durations: General Dentistry=45min, Teeth Cleaning=60min, Tooth Extraction=60min, Dental Fillings=45min, Teeth Whitening=90min, Orthodontic Braces=60min, Root Canal=90min, Dental Veneers=60min.
  - Added `DurationMinutes` int property to `DentalService` model and `DentalServiceDto`.
  - Updated `step1-service.js` and `step4-review.js` to display `X min` format.
  - Updated `MyAppointments.cshtml` to show duration in appointment date/time card.
* **Notifications Auto-Remove on Read**:
  - `notifications.js` `markRead()` now animates out (opacity+translateX) and removes the DOM element after marking read.
  - Empty state shown automatically when all notifications are read.
  - **ACTION REQUIRED**: Run `Backend/Migrations/20260502_AddDurationMinutesToServices.sql` in Supabase SQL Editor.

- **Date**: 2026-05-02 (Dynamic Appointment Scheduling)

* **Dynamic Slot Generation**:
  - Replaced hardcoded `ALL_SLOTS` with a dynamic generation algorithm in `AppointmentService.cs`.
  - Slots are now calculated based on `ClinicHour` (Open, Close, Noon break), `DentalService.DurationMinutes`, and `ClinicSettings.BufferMinutes`.
  - Implemented overlap validation that considers the full duration of existing appointments plus the required buffer time.
* **Clinic Settings Enhancement**:
  - Migration: `20260502_AddBufferMinutesToSettings.sql` — adds `buffer_minutes` to `clinic_settings`.
  - Added `BufferMinutes` to `ClinicSettings` model.
* **API & Frontend Synchronization**:
  - Updated `AppointmentsController.GetAvailability` to accept `serviceId` for accurate duration-based slotting.
  - Refactored `step2-schedule.js` to fetch and render dynamic slots from the API.
  - Added empty state handling for dates with no available slots (e.g., clinic closed or fully booked).
  - **ACTION REQUIRED**: Run `Backend/Migrations/20260502_AddBufferMinutesToSettings.sql` in Supabase SQL Editor.

- **Date**: 2026-05-02 (Animation Consistency Fixes)

* **Animation Trigger Stability**:
  - Resolved "instantly triggering" on small screens and "not triggering" on big screens by migrating GSAP initialization from `DOMContentLoaded` to `window.load`.
  - Added `ScrollTrigger.refresh()` to `_Layout.cshtml` and `home.js` to handle layout shifts caused by Tailwind CDN and dynamic content (Hours/Services).
  - Softened `ScrollTrigger` start points (from `90%` to `95%`) to ensure better reachability on high-resolution monitors where sections might be near the scroll limit.
  - Verified that `overflow-hidden` on `body` is cleared before GSAP calculates scroll positions.

- **Date**: 2026-05-02 (Patient Portal UI Refinement)

* **Split-View Appointments**:
  - Refactored `MyAppointments.cshtml` to a premium Master-Detail layout, replacing modal interactions with a persistent detail pane.
  - Updated `myAppointments.js` with dynamic detail injection and active item highlighting.
* **Design Standardization**:
  - Unified **Settings** and **Notifications** with high-end typography (Syne), premium cards, and standardized `premium-input` styles in `site.css`.
  - Implemented `isNavScrollDisabled` logic in `site.js` to force a white navbar background on all `/Profile/*` pages for consistent contrast.
* **Animations**:
  - Added GSAP staggered entrance animations for appointments and notifications to enhance the premium feel.
* **Bug Fixes (Notifications)**:
  - Resolved "Invalid Date" display by adding defensive parsing for `createdAt`.
  - Fixed notification logic to keep items in the list after being read (previously they were removed).
  - Synchronized the profile "red dot" to only indicate unread notifications, ensuring it disappears when all items are read.

- **Date**: 2026-05-02 (Patient Portal Dental Records & UI Finalization)

* **Dental Records Split-Pane Overhaul**:
  - Refactored `Records.cshtml` into a modern **Master-Detail** split-pane layout with category navigation (Profile, Medical, Treatments, Imaging, Chart).
  - Implemented a digital **Odontogram (Tooth Chart)** with high-end visual mapping, hover states, and premium color tokens for clinical statuses.
  - Standardized all profile pages (Records, Dashboard, Appointments, Settings, Notifications) to use consistent `Syne` typography and premium card styling.
* **Unread Treatment Tracking**:
  - Added `is_read` logic to the `treatments` table to track patient interaction with clinical records.
  - Implemented `MarkRecordsRead` API in `PatientDataController` and `RecordService` to handle bulk read-state updates.
  - Integrated real-time unread indicators (pulsing red dots) in the sidebar and treatment log, synchronized with the global notification system.
* **Premium Layout Refinements**:
  - Overhauled the global **Navbar** with a glassy, transparent-to-blur transition and high-end micro-interactions.
  - Refined the **Profile Sidebar** with premium active states, badge placeholders, and improved typography.
  - Decoupled notification badges to focus purely on unread system alerts, removing clutter from the appointments view.
  - Standardized **MyAppointments** with a persistent detail pane and enhanced card styles.

- **Date**: 2026-05-03 (Patient Portal UX & Visual Polishing)

* **Home Page Interactivity**:
  - Implemented **Hero Animation Scroll Lock**: Scrolling is now programmatically disabled until the hero GSAP timeline completes (Radiant Smiles reveal), preventing disrupted animations.
  - Enhanced **Gallery Scaling**: Migrated gallery items to `clamp()` based responsive sizing, ensuring images scale elegantly on 1440p and 4K displays.
* **Dashboard Enhancements**:
  - Replaced the "Oral Health Score" card with a new **Interactive Rating & Feedback** card, preparing the groundwork for patient experience collection.
* **Appointment Layout Optimization**:
  - Refined **MyAppointments** typography and padding to reduce visual bulk. The split-pane layout is now more compact and premium, improving usability on smaller laptops.
* **Dental Records Visual Overhaul**:
  - Standardized **Tabination Design**: Records navigation now matches the border-bottom design of Notifications and Settings.
  - Implemented **Digital Odontogram v2**: Replaced the legacy tooth chart with a high-fidelity interactive map featuring enhanced hover states and clinical status indicators.
  - **Dynamic X-Ray Empty State**: Implemented server-side checks for `xray_data` within treatments, displaying a polished empty state card when no diagnostic images are found.
* **Notification Tracking Improvements**:
  - Upgraded **Global Badge Logic**: The sidebar notification badge now displays the actual unread count (e.g., "3") instead of just a dot.
  - Enhanced real-time synchronization between read actions and the global unread counter.

- **Date**: 2026-05-03 (Admin & Staff Portal Refinements)

* **Clinical Data & Treatment Fixes**:
  - Corrected: `Height` and `Weight` collected during treatment recording now update the `patient_medical_info` table instead of `treatments`.
  - Migration: `20260503_AddTreatmentJSONFields.sql` — Added `tooth_data` and `xray_data` JSONB columns to the `treatments` table.
  - Updated `InvoiceController.cs` to inject `RecordService` and handle medical info updates during invoice/treatment creation.
  - Implemented strict filtering for "Arrived Patients" in `doctorInvoice.js`: Card visibility is now scoped to the assigned doctor, preventing cross-doctor treatment recording.
* **Admin Patient Profile Overhaul**:
  - Redesigned `Details.cshtml` with a premium, multi-tabbed interface (History, Chart, Medical, Visits).
  - Implemented **Digital Odontogram (Tooth Chart)** in the Admin view to provide clinicians with a visual summary of patient dental status.
  - Added **Medical History** section displaying blood type, allergies (JSON array), and smoker status. Latest height and weight are pulled from `patient_medical_info`.
  - Removed the redundant "Create Invoice" button in favor of the treatment-driven billing workflow.
  - Standardized UI scaling and typography (Syne) across all patient detail tabs.
* **Staff Availability View**:
  - Implemented a new `my-availability` API in `AdminDataController.cs` for role-based schedule retrieval.
  - Replaced the "Upcoming Schedule" view on the `Availability` page with a read-only **Weekly Availability** grid for Doctors and Receptionists.
  - Updated `staffAvailability.js` to dynamically render availability slots based on the logged-in user's role.
- **Date**: 2026-05-05 (User Management Unification)
- **Unified User Management**:
  - **Decommissioned Users Page**: Removed the standalone `/Admin/Users` module and its associated files (`Users.cshtml`, `adminUsers.js`).
  - **Role-Specific Integration**: Migrated account management actions (Resend Invite, Deactivate/Activate) directly into the **Patients**, **Doctors**, and **Receptionists** dashboards.
  - **Patient Management**: Added an action dropdown to the patient table in `Patients.cshtml` for quick access to account invitations and status toggles.
  - **Staff Management**: Integrated account action dropdowns into doctor and receptionist cards in `adminDoctors.js` and `adminReceptionists.js`.
  - **Creation Workflow**: Added "Create User" buttons to staff pages that allow creating a new auth user profile with the correct role (Doctor/Receptionist) before linking it as a staff record.
- **UI/UX Cleanup**:
  - Removed the "Users" link from the admin sidebar navigation in `_StaffLayout.cshtml`.
  - Added `UserModal` partial to all management pages to support the unified account creation/status logic.
  - Updated activity log links in `AdminUsersController.cs` to dynamically point to role-specific pages instead of the deleted Users page.
- **Safety**:
  - Strictly omitted "Delete Account" functionality per user requirements; only "Deactivate/Activate" is permitted.
  - Omitted "Edit Profile" from the account actions to focus on status and invitation management.

- **Date**: 2026-05-07 (Authentication Token Fixes)

* **Sign Out Token Leaks**:
  - Identified an issue where logging out of staff portals left the \sb-[PROJECT]-auth-token\ in \localStorage\, causing the Patient Portal (guest booking) to automatically authenticate the staff member.
  - Updated \Signout.cshtml\, \AdminSide/site.js\, and \PatientSide/profile.js\ to execute a complete \localStorage.clear()\ and \sessionStorage.clear()\ rather than piecemeal item removal.
  - This ensures users are fully unauthenticated and can freely test guest features or switch accounts without cookie/token conflicts.
- **Date**: 2026-05-07 (Billing Receipt Export System)
- **New Feature: Digital Receipts**:
  - Implemented a premium, branded receipt viewing and export system for Admin, Doctor, and Receptionist portals.
  - **Export Capabilities**: Integrated `html2pdf.js` and `html2canvas` for high-quality PDF and image (PNG) receipt downloads.
  - **Data Hydration**: Created a new detailed invoice retrieval endpoint `GET /api/admin/data/invoices/{id}` in `AdminDataController.cs`.
  - **Branding**: Integrated `ClinicService` to dynamically pull clinic logo, address, and contact info into generated receipts.
- **Portal-Specific Implementations**:
  - **Admin**: Integrated receipt view into the main Billing management table.
  - **Doctor**: Added "View Receipt" action to the Recent Treatments table in `doctorInvoice.js`.
  - **Receptionist**: Restored the Billing page by implementing `transactions.js` and adding the receipt modal.
- **Stability & Build Fixes**:
  - Resolved `CS0246` build errors by correcting `ClinicSettingsService` to `ClinicService` and adding missing `using SamsonDentalCenterManagementSystem.Models;` directives.
  - Verified successful compilation with `dotnet build`.
- **Date**: 2026-05-07 (Availability & Inquiry Messaging Fixes)
- **Identity & Auth Tracking**:
  - **Robust UUID Capture**: Updated `AdminPageModel.cs` to check multiple claim types (`sub`, `nameid`) for the Supabase UUID. This ensures `isMe` logic in chat correctly aligns messages (sender on right, receiver on left).
- **Inquiry Messaging Overhaul**:
  - **Staff Discussion Mode**: Synchronized Doctor and Receptionist inquiry pages with the Admin's "Staff Discussion" feature set.
  - **New Message Modal**: Added the ability for all staff roles to initiate new internal threads via a "New Staff Message" floating button and modal.
  - **Internal Notes**: Implemented the internal note toggle across all staff portals, allowing private staff-only discussions within patient threads.
  - **Doctor Assignment**: Enabled "Assign Doctor" functionality for the Doctor role, allowing doctors to manage inquiry assignments directly.
  - **UI Search**: Added conversation search bars to all staff inquiry sidebars.
- **Availability Optimization**:
  - **Filtered Fetching**: Optimized `DoctorService` and `ReceptionistService` to fetch availability data using direct `staff_id` filters. This improves performance on "My Schedule" pages and avoids over-fetching the entire `staff_availability` table.
- **Project Stability**:
  - Verified message alignment across Admin, Doctor, and Receptionist roles.
  - Ensured "Internal Note" toggle state is correctly handled in the `sendMessage` API payload.

- **Date**: 2026-05-07 (OTP Verification Migration)
- **Security & Reliability Overhaul**:
  - **OTP Infrastructure**: Replaced fragile URL-based confirmation links with a robust, database-managed 6-digit One-Time Password (OTP) system.
  - **New Database Table**: Created `otps` table to track verification codes, types (signup, invitation, appointment, password_reset), and 15-minute expiration windows.
  - **Service Layer**: Implemented `OtpService.cs` for centralized code generation, storage, and validation.
- **Workflow Transformations**:
  - **Account Signup**: New patients now receive an OTP via email and are redirected to a dedicated [Verify-Otp](file:///e:/SamsonDentalCenterManagementSystem/Pages/Authentication/Verify-Otp.cshtml) page to activate their account.
  - **Password Reset**: Migrated `ForgotPassword` and `ResetPassword` flows to OTP. Password updates are now performed securely via the Supabase Admin API after successful OTP verification.
  - **Guest Appointments**: Guest bookings now require OTP confirmation. Created [Confirm-Guest](file:///e:/SamsonDentalCenterManagementSystem/Pages/PatientSide/Appointments/ConfirmGuest.cshtml) page to handle this flow.
  - **Staff Invitations**: Admin-created staff accounts now receive an invitation OTP, allowing them to set their initial password securely via the verification page.
- **Email System**:
  - Created a premium [OtpNotification.cshtml](file:///e:/SamsonDentalCenterManagementSystem/Views/Emails/OtpNotification.cshtml) template.
  - Updated all relevant services (`AppointmentService`, `ProfileService`, `AdminUsersController`) to distribute OTPs instead of recovery links.
- **UI/UX Enhancements**:
  - Implemented a sleek, multi-input 6-digit OTP field with auto-focus shifting for a premium mobile-first experience.
  - Added optional "Verify Automatically" links in emails as a fallback for the OTP entry.
