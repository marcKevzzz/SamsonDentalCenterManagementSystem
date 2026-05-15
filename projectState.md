## Current Status: Clinical Access Audit & System Hardening

### Recently Completed
- [x] **RBAC Claim Hardening**: Centralized role resolution in `AdminDataController` using `GetAppRole()` to prioritize `app_role` over default Supabase claims.
- [x] **Clinical Data Isolation**: Implemented server-side filtering for doctors in `GetAppointments`, `GetPatients`, `GetInvoices`, and `GetTreatments`.
- [x] **Doctor Treatment Portal UI**: Restricted "Arrived Patients" (Create Invoice card) to the assigned doctor only, even for Admins, per user request.
- [x] **Build & Compilation Stability**: Resolved critical `MSB3027` / `MSB3021` file lock errors by terminating zombie app processes. Verified with clean `dotnet build`.
- [x] **Hardened Clinical Records Sync**: Fixed 23502 (null id) constraint error in `patient_tooth_status` by implementing true UPSERT logic.
- [x] **Receptionist "Live" Calendar**: Implemented full monthly calendar view with density indicators and filtering.

### Current Blockers
- **None**: Structural refactor of clinical access is complete.

### Next Steps
- [ ] **Data Sync**: Resolve "ghost availability" mismatch between monthly calendar and day-view time selector.
- [ ] **Audit Remaining Endpoints**: Check `GetInquiries`, `GetActivityLogs`, etc., for appropriate role-based filtering.
- [ ] **Manual Verification**: Test the doctor portal with a real doctor account to ensure they only see their assigned patients.

### Architecture Notes
- **Authorization**: Prioritizing `app_role` claim derived from the database for all clinical data access.
- **Data Isolation**: Transitioned from client-side UI filtering to mandatory server-side enforcement for sensitive records.
- **Database**: Using `ON CONFLICT` clauses for patient record synchronization to prevent 23505/23502 errors.
- **Infrastructure**: Using `IHttpClientFactory` for Supabase REST calls to ensure connection pooling and stability.
