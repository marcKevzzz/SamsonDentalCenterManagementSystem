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

* **Date**: 2026-04-28 (Refactor Phase)
- **Admin Portal Data Hydration Refactor**:
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
27: * **Date**: 2026-04-28 (Final Polish)
28: - **Admin Portal Rendering Stabilization**:
29:   - Resolved 'undefined' patient rendering: Corrected property mapping from `dateOfBirth` to `dob` and `phoneNumber` to `phone` in `adminPatient.js`.
30:   - Resolved 'unknown' patient names in invoices: Updated `doctorInvoice.js` and `AdminDataController.cs` to correctly project and display `patientName` fallback.
31:   - Fixed 'undefined' users in management table: Synchronized property access in `adminUsers.js` with flattened DTO structure.
32:   - Fixed Guest Inquiries: Improved name detection in `adminInquiries.js` to correctly display `guestFirstName`/`guestLastName` when a patient ID is absent.
33:   - Fixed Settings Tab hydration: Corrected property name mapping in `adminSettings.js` (e.g., `clinicalHours` vs `clinicalHoursJson`) to ensure clinical hours, FAQs, and photos render correctly.
34:   - Fixed Staff Management URL: Corrected endpoint path in `adminStaff.js` to `/api/admin/data/doctors` for consistent data retrieval.
35:   - Improved UI robusticity: Added fallbacks for initials extraction and null-checks across all projected frontend components.

* **Date**: 2026-04-28
- **Advanced Clinic Settings**:
  - Merged "Hours" and "Status" into a unified "Availability" management system.
  - Added new Identity fields: Facebook URL, Google Maps Embed, and Landline.
  - Implemented Staged Photo Gallery (URLs saved to JSON column only on form commit).
  - Redesigned Hours UI with a visual timeline layout.
  - Replaced static success alerts with centralized Toast system.
- **Admin Clinic Settings**:
  - Implemented centralized settings management for clinic details, hours, FAQs, and operation status.
  - Added `clinic_settings` table with support for social links and map embeds.
  - Created `ClinicService` with photo storage integration.
  - Enhanced Admin Inquiries: Added deactivation indicators and fixed profile name matching for registered users.
  - Fixed Patient Profile update bug by syncing property names between JS and backend attributes.
  - Fixed role-based redirection logic in `_Layout.cshtml` to handle Admin, Doctor, and Receptionist roles.
  - Refactored `Signin.cshtml.cs` to dynamically redirect based on user role instead of hardcoding Admin dashboard.
  - Implemented server-side redirection in `Index.cshtml.cs` for staff roles to prevent Home page access for logged-in staff.

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
* **Date**: 2026-04-28 (Stability & Bug Fixes)
- **JSON Parsing Robustness**:
  - Hardened frontend `fetch` operations in `AdminStore.js`, `adminInquiries.js`, and `auth.js` to handle non-JSON or empty responses gracefully, preventing "Unexpected end of JSON input" errors.
  - Added status and content-type checks before calling `.json()` on all administrative and authentication API responses.
- Resolved "null patientId" in Admin dashboards by adding fallbacks to navigation property IDs in `AdminDataController.cs` (Appointments and Inquiries).
  - Verified and ensured `InquiryService.cs` correctly projects patient identifiers even when primary IDs are missing in the base record.
- **Inquiry UI Improvements**:
  - Implemented dynamic date separators in Admin chat messages ("Today", "Yesterday", or full date like "March 30") with horizontal lines for improved readability.
  - Fixed mobile keyboard focus and scroll behavior in admin inquiry view.
* **Date**: 2026-04-30 (UI/UX Refinement & Stability)
- **Settings Modularization**:
  - Split the monolithic `Settings.cshtml` into four dedicated Razor Pages: `Identity`, `Availability`, `FAQs`, and `Photos` under `/Admin/Settings/`.
  - Updated `AdminSettingsModel` to support partial section updates, preventing data loss when saving individual pages.
  - Implemented a collapsible dropdown and popup menu for Settings in the sidebar, supporting both expanded and collapsed states.
  - Refactored `adminSettings.js` to handle page-specific initialization and removed legacy tab logic.
- **Cache Invalidation & Data Reactivity**:
  - Replaced manual `window.location.reload()` calls with `AdminStore.invalidate()` across all management modules (Users, Services, Staff, Appointments).
  - Ensured data changes are reflected instantly in grids by re-hydrating from `AdminStore` after mutations.
- **Enhanced UX Flows**:
  - Implemented "Discard Changes" confirmation modals across all major management forms using `Modal.open`.
  - Standardized deletion guards with confirmation modals for FAQs, Photos, Staff, and Services.
  - Fixed Inquiry timestamp discrepancies by standardizing UTC date parsing in `adminInquiries.js`, resolving the "now" display issue for older messages.
- **Staff Portal Navigation**:
  - Added "Profile" and "Sign Out" popup menu to the sidebar avatar for collapsed state.
  - Synchronized sidebar active states with the new modular Settings routes.

* **Date**: 2026-04-29
- **Real-Time Infrastructure & Identity Tracking**:
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
- **Analytics & Reporting (Chart.js)**:
  - Included Chart.js CDN globally via `_StaffLayout.cshtml`.
  - Refactored `/api/admin/data/stats` in `AdminDataController.cs` to aggregate dynamic chart data: Weekly Visits, Department Load, Monthly Revenue Trend, and Key Metrics.
  - Replaced hardcoded dashboard elements with dynamic `canvas` components for Patient Visits (Bar Chart) and Department Load (Doughnut Chart).
  - Built a new `/api/admin/data/reports-data` endpoint to calculate Big Three KPIs, Provider Utilization, Status Distribution, Demographics Heatmap, and Time Leak.
  - Completely redesigned `Reports.cshtml` and `adminReports.js` to feature a Date Range Picker, Status Pie Chart, Location Heatmap, Provider utilization table, and Appointment Pulse Grid.
- **Staff Profile Settings**:
  - Implemented `/StaffProfile` page mapping directly to the `_StaffLayout.cshtml` allowing all staff roles (Admin, Doctor, Receptionist) to update their personal details, address, password, and avatar.
  - Re-used existing API endpoints (`/api/settings/update-profile`, `/api/settings/update-password`, `/api/settings/upload-avatar`) providing uniform logic across Patient and Staff portals.
  - Adapted the frontend script (`staffProfile.js`) to dynamically update the Staff Layout sidebar elements instead of the patient top navigation bar.

* **Date**: 2026-04-30 (Bug Fixes)
- **Doctor Key Mismatch (Staff Grid "undefined")**:
  - Root cause 1: `AdminStore.invalidate` was undefined — callers silently failed, stale cache persisted. Fixed: added `invalidate: clearCache` alias to `AdminStore` exports.
  - Root cause 2: `adminAppointment.js` used `/api/admin/doctors` (raw Supabase models) with cache key `"doctors"`, poisoning the shared cache with wrong-shape data. Fixed: changed to `/api/admin/data/doctors` (projected DTOs).
  - Root cause 3: `adminStaff.js` `docJson` serialized `isActive: doc.is_active` (snake_case) but DTO uses camelCase `isActive` → always `undefined` in edit modal. Fixed: `doc.is_active` → `doc.isActive`.
  - Removed leftover `console.log(doc)` debug line from `renderDoctorCard`.

* **Date**: 2026-04-30 (Feature: Date Blocking)
- **Soft Date Blocking for Appointments**:
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

* **Date**: 2026-04-30 (Staff Restructuring & Analytics Attribution)
- **Staff Portal Modularization**:
  - Split the monolithic `Staff.cshtml` into two separate pages: `Doctors/Index.cshtml` and `Receptionists/Index.cshtml`.
  - Converted the "Staff" sidebar navigation item into a collapsible dropdown containing "Doctors" and "Receptionists".
  - Split `adminStaff.js` into `adminDoctors.js` and `adminReceptionists.js` for independent logic and data hydration.
- **Receptionist Schema Parity**:
  - Added `bio` and `receptionist_availability` support mirroring the Doctor implementation.
  - Updated `ReceptionistService.cs` and `/api/admin/receptionists` to handle full CRUD operations for both bio and availability.
  - Unified `StaffModal.cshtml` fields so Bio and Availability Schedule are shared sections between Doctors and Receptionists.
- **Appointment Source Tracking**:
  - Added `source` column to `appointments` table (e.g., online, admin, walk_in, guest).
  - Updated `AdminDataController` and frontend logic (`adminAppointment.js`, `Appointments.cshtml`) across Admin, Doctor, and Receptionist portals to display the source context badge within the scheduling table.

* **Date**: 2026-04-30 (Bug Fixes & staff_availability Merge)
- **BlockedDate PGRST204 Fix**: Added `[JsonIgnore]` to `BlockedByProfile` nav property in `BlockedDate.cs`.
- **Activity Log IP Fix**: `ActivityLogService.cs` maps `::1` → `127.0.0.1`, strips `::ffff:` prefix.
- **Inquiry Timestamp Fix**: `InquiryService.cs` uses ISO 8601 for `updated_at`; `adminInquiries.js` `timeAgo()` handles clock skew.
- **Invoice 0 Amount Fix**: Force-bust services cache on load; re-lookup price from live `SERVICES[]` array in `doctorInvoice.js` instead of stale `data-price` attribute.
- **Receptionist Availability Day Fix**: `adminReceptionists.js` `getAvailabilitySlots()` now uses snake_case keys matching backend DTO `[JsonPropertyName]`.
- **staff_availability Schema Merge**:
  - Migration: `20260430_MergeStaffAvailability.sql` — creates `staff_availability(staff_id, staff_type, ...)`, migrates rows, drops old tables.
  - `Models/Doctor.cs`: `DoctorAvailability` → `StaffAvailability` (unified model).
  - `Models/Receptionist.cs`: `ReceptionistAvailability` removed; uses shared `StaffAvailability`.
  - `Services/DoctorService.cs`: Two-step fetch (no PostgREST embed). `FetchDoctorAvailabilityAsync()` queries `staff_availability?staff_type=eq.doctor`, merges by `staff_id`. Graceful fallback if table absent.
  - `Services/ReceptionistService.cs`: Same pattern with `FetchReceptionistAvailabilityAsync()`.
  - `Controller/AdminDoctorsController.cs`: `SetAvailability` takes `List<StaffAvailability>`.
  - **ACTION REQUIRED**: Run `Backend/Migrations/20260430_MergeStaffAvailability.sql` in Supabase SQL Editor.
- **Activity Logs UI Enhancements**:
  - Moved `category` badge to the top of each log entry for better visibility.
  - Implemented action-based color coding (Green: Add/Create, Red: Delete/Cancel, Amber: Update/Modify, Violet: Auth/Login).
  - Added real-time filtering by search term and category.
  - Improved layout with 2xl rounded corners and better typography.

* **Date**: 2026-05-01 (Staff Portal Finalization)
- **Portal Feature Parity & Segmentation**:
  - Successfully finalized functionality for **Doctor** and **Receptionist** portals, ensuring visual and feature parity with the Administrative dashboard while maintaining strict role-based data isolation.
  - **Inquiry Chats**: Enabled the full Chat-UI in both staff portals, allowing doctors and receptionists to handle patient inquiries directly with real-time updates via SignalR.
  - **Activity Logs**: Integrated the Administrative activity log view into staff portals, providing staff with a history of system events filtered by their permissions.
  - **Receptionist Dashboard**: Enhanced with interactive "Weekly Visits" and "Department Load" charts powered by Chart.js, providing front-desk analytics at a glance.
- **Reporting & Data Scoping**:
  - **Doctor-Specific Analytics**: Refactored the /api/admin/data/reports-data endpoint in AdminDataController.cs to automatically scope all KPIs (Completion Rate, Bookings, Utilization) to the logged-in doctor's profile.
  - **Invoice Scoping**: Standardized the Invoices view for Doctors to only display their assigned arrived patients and historical invoices, while Receptionists retain the global clinic billing overview.
  - **Dynamic Invoicing**: Overhauled the Doctor Invoices page to match the Admin's pre-selection and dynamic loading logic, including the ability to start treatments directly from the dashboard "Treatment Center".
- **Infrastructure & Stability**:
  - **JS Resiliency**: Implemented defensive null-check guards in dminAppointment.js and dminDashboard.js to prevent runtime TypeErrors on pages that omit specific dashboard elements (like stat cards or charts).
  - **API Optimization**: Fixed a "300 Multiple Choices" ambiguity error in StaffLeaveService.cs by explicitly specifying foreign key hints in the Supabase query.
  - **Modular Page Models**: Successfully separated and namespaced Razor Page models for all staff portals (SamsonDentalCenterManagementSystem.Pages.DoctorSide.* and SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.*) to prevent naming conflicts and improve maintainability.
- **Availability & Leave Management**:
  - Implemented a unified **My Schedule** page for all staff, featuring a dynamic calendar view and leave application workflow.
  - Created staffAvailability.js to manage the lifecycle of leave requests and schedule visualization across all staff roles.
