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
- **Data Integrity Fixes**:
  - Resolved "null patientId" in Admin dashboards by adding fallbacks to navigation property IDs in `AdminDataController.cs` (Appointments and Inquiries).
  - Verified and ensured `InquiryService.cs` correctly projects patient identifiers even when primary IDs are missing in the base record.
- **Inquiry UI Improvements**:
  - Implemented dynamic date separators in Admin chat messages ("Today", "Yesterday", or full date like "March 30") with horizontal lines for improved readability.
  - Fixed mobile keyboard focus and scroll behavior in admin inquiry view.
