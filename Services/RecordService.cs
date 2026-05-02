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

        }
    }
