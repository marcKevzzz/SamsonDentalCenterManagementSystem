using Microsoft.AspNetCore.SignalR;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;
using System.Text.Json;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class RecordService
    {
        private readonly Supabase.Client _supabase;
        private readonly ActivityLogService _logs;
        private readonly IHubContext<AdminHub> _hubContext;

        public RecordService(
            Supabase.Client supabase,
            ActivityLogService logs,
            IHubContext<AdminHub> hubContext)
        {
            _supabase = supabase;
            _logs = logs;
            _hubContext = hubContext;
        }

        public async Task<PatientMedicalInfo?> GetMedicalInfoAsync(string patientId)
        {
            var res = await _supabase
                .From<PatientMedicalInfo>()
                .Where(x => x.PatientId == patientId)
                .Get();

            return res.Models.FirstOrDefault();
        }

        public async Task UpsertMedicalInfoAsync(PatientMedicalInfo info, string actorId)
        {
            await _supabase.From<PatientMedicalInfo>().Upsert(info);
            await _logs.LogActionAsync(actorId, "updated medical info", $"Patient: {info.PatientId}", "Clinical", "/Admin/Patients/Profile?id=" + info.PatientId);
        }

        public async Task<List<PatientToothStatus>> GetToothChartAsync(string patientId)
        {
            var res = await _supabase
                .From<PatientToothStatus>()
                .Where(x => x.PatientId == patientId)
                .Get();

            return res.Models;
        }

        public async Task UpdateToothStatusAsync(PatientToothStatus status, string actorId)
        {
            await _supabase.From<PatientToothStatus>().Upsert(status);
            await _logs.LogActionAsync(actorId, "updated tooth status", $"Patient: {status.PatientId}, Tooth: {status.ToothNumber}, Status: {status.Status}", "Clinical", "/Admin/Patients/Profile?id=" + status.PatientId);
        }

        public async Task UpdateMultipleToothStatusAsync(List<PatientToothStatus> updates, string actorId)
        {
            if (updates == null || !updates.Any()) return;

            // Use the unique constraint (patient_id, tooth_number) to handle the UPSERT
            await _supabase.From<PatientToothStatus>().Upsert(updates, new Supabase.Postgrest.QueryOptions { OnConflict = "patient_id,tooth_number" });

            var patientId = updates.First().PatientId;
            await _logs.LogActionAsync(actorId, "updated tooth chart", $"Patient: {patientId}, {updates.Count} teeth updated", "Clinical", "/Admin/Patients/Profile?id=" + patientId);
        }

        public async Task<List<Treatment>> GetAllTreatmentsWithDetailsAsync()
        {
            // We join invoice and patient via PostgREST selection
            // select=*,invoice:invoices(*,patient:profiles(*))
            var res = await _supabase.From<Treatment>()
                .Select("*,invoice:invoices(*,patient:profiles(*))")
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            return res.Models;
        }

        public async Task<List<Treatment>> GetTreatmentsByPatientAsync(string patientId)
        {
            // First get the invoices for this patient to get the invoice IDs
            // This is more reliable than complex join filters in Supabase-csharp
            // and avoids !inner join issues if some records have null references.
            var invoicesRes = await _supabase.From<Invoice>()
                .Where(x => x.PatientId == patientId)
                .Select("id")
                .Get();
            
            var invoiceIds = invoicesRes.Models.Select(i => i.Id).ToList();
            if (!invoiceIds.Any()) return new List<Treatment>();

            // Now fetch treatments for these invoices
            var res = await _supabase.From<Treatment>()
                .Filter("invoice_id", Supabase.Postgrest.Constants.Operator.In, invoiceIds)
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();

            return res.Models;
        }

        public async Task<int> GetTreatmentCountByPatientAsync(string patientId)
        {
            // Similar logic but optimized for count
            var invoicesRes = await _supabase.From<Invoice>()
                .Where(x => x.PatientId == patientId)
                .Select("id")
                .Get();
            
            var invoiceIds = invoicesRes.Models.Select(i => i.Id).ToList();
            if (!invoiceIds.Any()) return 0;

            var res = await _supabase.From<Treatment>()
                .Filter("invoice_id", Supabase.Postgrest.Constants.Operator.In, invoiceIds)
                .Count(Supabase.Postgrest.Constants.CountType.Exact);

            return res;
        }
        public async Task InitializePatientRecords(string patientId, string actorId)
        {
            var existing = await GetMedicalInfoAsync(patientId);
            if (existing == null)
            {
                var defaultInfo = new PatientMedicalInfo
                {
                    PatientId = patientId,
                    AllergiesJson = "[]",
                    HistoryJson = "[\"New Patient — Initializing records.\"]",
                    MedicationsJson = "[]",
                };
                await UpsertMedicalInfoAsync(defaultInfo, actorId);
            }
        }
    }
}
