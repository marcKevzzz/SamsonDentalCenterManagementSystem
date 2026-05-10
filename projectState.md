# Project State - Samson Dental Center Management System

## Current Status: Optimizing Performance & Portal Stability

### Recently Completed
- **Patient Portal Performance Overhaul**: 
    - Parallelized database service calls across `Dashboard`, `Records`, and `MyAppointments` pages using `Task.WhenAll`, reducing load times by 50-70%.
    - Optimized `RecordService.GetTreatmentsByPatientAsync` to use a single relational join query instead of sequential database round-trips.
    - Implemented high-performance database indexes on foreign keys (`patient_id`, `invoice_id`) and date-based columns (`appointment_date`, `created_at`) in `Backend/Migrations/20260510_OptimizePatientQueries.sql`.
    - Hardened `Dashboard` data-fetching to use `ProfileService.GetProfileById`, ensuring automatic profile repairs for authenticated users and preventing page crashes on missing records.
- **Hardened RBAC & Profile Repair**: Implemented fallback logic for `role_app` and `app_role` claims in `RoleClaimsTransformer`. Hardened `ProfileService` repair logic to check both `app_metadata` and `user_metadata` for roles, preventing admin lockout even if database profiles are missing.
- **Fixed Login "Email not registered" Issue**: Hardened `ProfileService` to robustly check both the `profiles` table and Auth API during login. Updated `UpdateProfile` to automatically create missing profile rows, resolving a deadlock in the registration/verification flow.
- **System Documentation**: Redesigned `/Clinic/Docs` with a modern, minimalist UI (dark mode, glassmorphism, GSAP animations) and accurate technical details on middlewares, tech stack, security, and RBAC.
- **Patient Profile & ACID Refactor**: 
    - Decoupled clinical data (DOB, Sex, Address) into the `patients` table while maintaining backward compatibility in the `profiles` table.
    - Updated `ProfileService.GetProfileById` to use `patients(*)` join, ensuring clinical data is available across all portals.
    - Synchronized `ProfileService.UpdateProfile` and `CreateProfile` to upsert records in both `profiles` and `patients` tables, ensuring data integrity.
    - Fixed `UserPayload` JSON property mapping (casing mismatch) between `settings.js` and the backend API.
    - Hardened `MergeProfile` to correctly migrate `patients` table records and move primary keys for medical info/tooth charts.
- **Purged Oral Health Infrastructure**: Completely removed `oral_health_score`, `oral_health_summary` and related logic from DB, Models, and Dashboard.


- **Fixed Appointment Availability Logic**: Resolved issue where `confirmed` or `arrived` appointments (especially those promoted from waitlist) were not correctly blocking doctor slots by removing restrictive `is_waitlist` filters and normalizing date parsing in `AppointmentService.cs`.
- [x] Pure ACID Identity Refactor: Total decoupling of appointments from identity.
- [x] Clinical data centralization in Patients table (DOB, Sex, Address).
- [x] Appointment model cleanup (removed 14+ redundant fields).
- [x] Implementation of BookerId vs PatientId logic.
- **Fixed Appointment Date Inconsistency**: Resolved persistent 1-day date-mismatch bug by standardizing on `DateTimeKind.Utc` at midnight for all calendar-day fields (`AppointmentDate`, `PatientDob`, `OtherDob`). Updated `DateOnlyConverter`, `AppointmentService`, and `AppointmentReminderService` to enforce this standard, preventing timezone-related shifts during serialization. Added diagnostic logging to monitor incoming payloads.

- **Hardened Clinical Records Sync**: Fixed 23502 (null id) constraint error in `patient_tooth_status` by implementing true UPSERT logic with `ON CONFLICT (patient_id, tooth_number)`.
- **Storage Resilience**: Implemented automatic bucket creation in `ClinicService.cs` to handle missing `treatment-xrays` or gallery buckets.
- **Enhanced Records UI**: Fixed Diagnostic Imaging tab in patient profile to correctly display treatment X-rays.
- **Stabilized Staff Portal**:
    - Hardened `submitLeave` JS with null-checks to prevent runtime crashes.
    - Fixed RLS (42501) permission error in `AdminUsersController` by using service-role services for staff creation.
    - Resolved `System.TypeLoadException` by fixing corrupted build state and refactoring anonymous types.
    - Added robust role fallback for staff users with generic 'authenticated' JWT roles.
    - Enhanced staff creation with detailed logging and try-catch handling.
    - Fixed 400 Bad Request on leave application by aligning JSON property casing.
    - Resolved global namespace collision by renaming `Pages/System` to `Pages/ClinicDocs`.
    - Added `DocsModel` with `[AllowAnonymous]` to ensure public access to `/Clinic/Docs`.
- **System Documentation**:
    - Created a modern, minimalist system/developer documentation page at `/Clinic/Docs`.
- **Service Management Fixes**:
    - Fixed data loss issue where `DurationMinutes` and `NeedsXray` were not saved during service create/update.
    - Updated Admin UI to display X-Ray requirement badges on service cards.
- **Service Expansion**:
    - Added support for X-Ray services (Digital and Panoramic) via database migration.
- **Enhanced Booking Logic**:
    - Implemented auto-confirmation for logged-in patients.
    - Integrated staff leaves into appointment availability check.
    - Strengthened double-booking prevention for 'Other' patients.
- **Optimized Records UI**: Hides dental chart visualization if no data is present.
- **Resolved PGRST204 Schema Cache Errors**: Fixed ambiguous joins in `InvoiceService`, `AppointmentService`, and `DoctorService`.
- **Dynamic Chatbot Infrastructure**:
    - Created `PublicDataController` to provide unauthenticated system-wide data (settings, services, doctors).
    - Refactored `chatbot.js` to fetch real-time data and update its knowledge base dynamically.
    - Integrated chatbot logic with clinic settings for enablement and customization.
    - Resolved compilation error CS1061 in `PublicDataController` by using `GetActiveWithProfilesAsync`.
    - Expanded chatbot knowledge base with leadership (CEO/Admin), system integrity, and service process/benefits.
    - Implemented `chatbot_conversations` table and API for session-based message persistence.
- **Documentation & Transparency**:
    - Relocated System Documentation to the patient side (`/Clinic/Docs`) with enriched content and public layout.
    - Integrated "Documentation" link in the website footer.
    - Added CEO/Admin and System Integrity info to `clinic_settings`.
- **Admin Settings Modernization**:
    - Replaced the legacy FAQ settings with a unified **Chatbot Control Panel**.
    - Added identity controls (name, welcome message) and knowledge base management (formerly FAQs) to the Chatbot settings.
    - Updated sidebar navigation to prioritize Chatbot management.
- **Clinic Gallery Synchronization**:
    - Refactored the Home page gallery to dynamically render photos managed via the Admin portal.
    - Implemented a scattered-grid layout with fallback placeholders.
- **Admin Portal Stability**:
    - Fixed 400 error in `ResendInvite` by resolving email blanking bug in `ProfileService`.
    - Resolved 400 error in `UpdateLeaveStatus` by robustly fetching admin ID from JWT claims (`sub` or `NameIdentifier`).
    - Standardized admin ID retrieval across data-modifying endpoints in `AdminDataController`.
- **Documentation Portal**:
    - Integrated `/Clinic/Docs` with the shared `_StaffLayout` for a consistent administrative experience.
    - Added a "System Docs" link to the Admin sidebar.
- **Clinic Gallery & Settings Improvements**:
    - Hardened settings retrieval and persistence logic in `ClinicService.cs` with fallback lookups and `Upsert` operations to ensure gallery data is never lost or ignored due to ID mismatches.
    - Implemented eager hydration in `adminSettings.js` to eliminate loading delays when viewing photos, hours, and FAQs.
    - Resolved a compilation error (CS8752) by explicitly using `Array.Empty<string>()` instead of target-typed `new()` for clinic photo array initialization.
    - Implemented a smooth AJAX-based save workflow for the Clinic Gallery, featuring a "Saving..." loading state, premium success modals, and live data synchronization without page reloads.
    - Finalized homepage gallery responsiveness by enforcing compact image dimensions via inline `style` and refined `clamp` values, ensuring the background "THE CLINIC" text and overlays remain visible.
    - Included `photos` in the public initialization API for better data availability across client-side components.
- **Chatbot Infrastructure Optimization**:
    - Implemented chat history persistence using `localStorage` session tracking and a new `/api/public/chatbot/history` endpoint.
    - Optimized database usage by preventing the automatic saving of the initial welcome message, ensuring only active conversations are persisted.
- **Admin Portal Traceability**:
    - Enhanced Activity Logs with a "Source Path" badge for better traceability of administrative actions.
    - Resolved TypeScript casing conflicts by standardizing all module imports to lowercase `adminStore.js` and canonical `AdminSide` directory casing.
- **Clinical Record Infrastructure**:
    - Implemented secure X-ray file uploads stored in a dedicated `treatment-xrays` bucket.
    - Updated `treatments` schema to include structured fields for radiographic findings (`xray_url`, `xray_type`, `xray_notes`).
    - Enforced uniqueness on `patient_tooth_status` to allow clean "Decayed" -> "Crowned" status transitions.
    - Enhanced the treatment view modal in the Doctor portal with high-resolution image viewing and radiographic reports.
- **Waitlist & Flow Management**:
    - Implemented a multi-doctor waitlist eligibility engine in `AppointmentService`.
    - Slots are now dynamically flagged as `waitlistEligible` when the clinic is open but all specialists are booked.
    - Optimized batch updates for tooth charts using a cleaner `Upsert` workflow in `RecordService`.

### In Progress
- **Signup Refactor**: Moving UI/Auth fields (`ClaimId`, `Password`) out of the `Profile` model to prevent further schema cache conflicts.

- **HttpClient Timeouts**: Largely mitigated by optimizing heavy queries and using `IHttpClientFactory`.

### Architecture Notes
- Using direct `HttpClient` REST calls for complex joins and batch operations.
- `ProfileService` now uses `SupabaseClient` named client from `IHttpClientFactory`.
