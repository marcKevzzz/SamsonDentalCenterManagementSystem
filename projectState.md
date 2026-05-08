# Project State - Samson Dental Center Management System

## Current Status: Stabilizing Data Layer

### Recently Completed
- **Resolved PGRST204 Schema Cache Errors**: Fixed ambiguous joins in `InvoiceService`, `AppointmentService`, and `DoctorService` by using explicit `!foreign_key` notation.
- **Fixed Staff Creation Bug**: Resolved `PGRST204` when creating doctors/receptionists by adding `[JsonIgnore]` to relationship properties in `Doctor.cs` and `Receptionist.cs`. This prevents the Supabase client from including non-existent columns in `INSERT` payloads.
- **Explicit FK Joins**: Standardized all manual REST queries to use `profile:profiles!profile_id(*)` to ensure PostgREST identifies the correct relationship path.

### In Progress
- **Signup Refactor**: Moving UI/Auth fields (`ClaimId`, `Password`) out of the `Profile` model to prevent further schema cache conflicts.
- **Identity Claiming**: Ensuring existing patient records can be claimed by matching Name/DOB/Phone.

### Known Issues
- **ClaimId PGRST204**: Likely caused by the `Profile` model having a `ClaimId` property that the ORM tries to select or insert. (Fix in progress via refactor).

### Architecture Notes
- Using direct `HttpClient` REST calls for complex joins to avoid `Postgrest.Client` limitations with nested IDs.
- Aliasing joins as `profile:` or `patient:` to match C# DTO property names.
