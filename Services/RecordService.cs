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

            // Clear IDs to let the database unique constraint (patient_id, tooth_number) handle the UPSERT
            foreach(var u in updates) u.Id = null; 

            await _supabase.From<PatientToothStatus>().Upsert(updates);

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
            // First get all invoices for this patient
            var invoiceRes = await _supabase.From<Invoice>().Where(i => i.PatientId == patientId).Get();
            var invoiceIds = invoiceRes.Models.Select(i => i.Id).ToList();

            if (!invoiceIds.Any()) return new List<Treatment>();

            // Then get treatments linked to these invoices
            var treatmentRes = await _supabase.From<Treatment>()
                .Filter("invoice_id", Supabase.Postgrest.Constants.Operator.In, invoiceIds)
                .Get();

            return treatmentRes.Models.OrderByDescending(t => t.CreatedAt).ToList();
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
