# Project State - Samson Dental Center Management System

## Current Status: Stabilizing Data Layer & Performance

### Recently Completed
- **Resolved PGRST204 Schema Cache Errors**: Fixed ambiguous joins in `InvoiceService`, `AppointmentService`, and `DoctorService`.
- **Fixed Staff Creation Bug**: Added `[JsonIgnore]` to relationship properties in `Doctor.cs` and `Receptionist.cs`.
- **Optimized ProfileService**:
    - Switched to `IHttpClientFactory` to prevent socket exhaustion and handle timeouts better.
    - Optimized `FindExistingPatientRecord` (Smart Match) with server-side filtering (reduced 100s timeout risk).
    - Optimized `GetUserIdByEmail` to prioritize the indexed `profiles` table before falling back to the Auth API.
    - Consolidated account existence checks in `Signup.cshtml.cs`.

### In Progress
- **Signup Refactor**: Moving UI/Auth fields (`ClaimId`, `Password`) out of the `Profile` model to prevent further schema cache conflicts.
- **Identity Claiming**: Ensuring existing patient records can be claimed by matching Name/DOB/Phone.

### Known Issues
- **ClaimId PGRST204**: Addressed via model refactor (in progress).
- **HttpClient Timeouts**: Mitigated by optimizing heavy queries and using `IHttpClientFactory`.

### Architecture Notes
- Using direct `HttpClient` REST calls for complex joins.
- `ProfileService` now uses `SupabaseClient` named client from `IHttpClientFactory`.
