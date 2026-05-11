# Project State - Samson Dental Center Management System

## Current Status: Optimizing Performance & Portal Stability

### Recently Completed
- **Hardened Identity & Profile Resilience**: 
    - Resolved project-wide "Ambiguous Relationship" errors (PGRST201) by explicitly specifying foreign key relationships and selections in PostgREST queries across `ProfileService`, `AppointmentService`, `InvoiceService`, `AuthController`, and `AdminUsersController`.
    - Fixed role-based redirection failures where admins were incorrectly identified as patients due to failed profile lookups.
    - Optimized `ProfileService` with robust "on-the-fly" repair logic that synchronizes roles from Supabase Auth metadata (app_metadata) to the database.
    - Synchronized `Profile` and `Patient` records to ensure clinical metadata (DOB, Sex, Address) is always available in the patient portal.
- **Schema Stabilization & Fixes**:
    - Created `20260512_FixSchemaAndRoleType.sql` to ensure the `app_role` enum type exists and the `profiles` table is correctly structured.
    - Hardened RLS policies for clinical tables (`patients`, `medical_info`, `tooth_status`) to allow both staff and patient owners to access data.
    - Fixed issues where the `PureACID` migration would fail due to missing type casts.
- **Improved Page Stability**:
    - Added comprehensive try-catch blocks and logging to `Records.cshtml.cs` and `Settings.cshtml.cs`.
    - Prevented silent redirections to the home page by logging detailed error context (missing profiles, role mismatches, or data fetch failures).
- **Fixed JSON Deserialization Crashes**: Resolved `System.Text.Json.JsonException` in `DoctorService` and `ReceptionistService` by aligning DTOs with Supabase's singular-object response for 1-to-1 joins. Standardized queries to use explicit `profile:profiles!profile_id(*)` aliases.


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
- **Admin & Appointment Stability**: Fixing booking status logic, enhancing calendar availability for staff leaves, and repairing admin staff data rendering.

- **HttpClient Timeouts**: Largely mitigated by optimizing heavy queries and using `IHttpClientFactory`.

### Architecture Notes
- Using direct `HttpClient` REST calls for complex joins and batch operations.
- `ProfileService` now uses `SupabaseClient` named client from `IHttpClientFactory`.
