using SamsonDentalCenterManagementSystem.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class InvoiceService
    {
        public readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public InvoiceService(Supabase.Client supabase, HttpClient http, string supabaseUrl, string serviceRoleKey)
        {
            _supabase = supabase;
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        public async Task<Invoice> CreateInvoiceAsync(Invoice invoice, List<InvoiceItem> items)
        {
            // Add Prefer: return=representation so Supabase returns the server-created row
            var req = BuildRequest(HttpMethod.Post, "/invoices");
            req.Headers.Add("Prefer", "return=representation");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    appointment_id  = invoice.AppointmentId,
                    patient_id      = invoice.PatientId,
                    doctor_id       = invoice.DoctorId,
                    total_amount    = invoice.TotalAmount,
                    discount_amount = invoice.DiscountAmount,
                    final_amount    = invoice.FinalAmount,
                    status          = invoice.Status,
                    notes           = invoice.Notes
                    // omit id — let Supabase generate it
                }),
                Encoding.UTF8, "application/json");

            var res  = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json        = await res.Content.ReadAsStringAsync();
            var created     = JsonSerializer.Deserialize<List<Invoice>>(json, _json)?.FirstOrDefault()
                            ?? throw new Exception("Invoice creation returned empty.");

            // Now created.Id is the real server-generated UUID
            foreach (var item in items)
                item.InvoiceId = created.Id;

            var itemsReq = BuildRequest(HttpMethod.Post, "/invoice_items");
            itemsReq.Content = new StringContent(
                JsonSerializer.Serialize(items.Select(i => new {
                    invoice_id  = i.InvoiceId,
                    service_id  = i.ServiceId,
                    description = i.Description,
                    unit_price  = i.UnitPrice,
                    quantity    = i.Quantity,
                    total_price = i.TotalPrice
                })),
                Encoding.UTF8, "application/json");

            var itemsRes = await _http.SendAsync(itemsReq);
            itemsRes.EnsureSuccessStatusCode();

            return created;
        }

        public async Task CreateTreatmentsAsync(List<Treatment> treatments)
        {
            if (treatments.Count == 0) return;
            await _supabase.From<Treatment>().Insert(treatments);
        }

        public async Task<Invoice?> GetInvoiceByAppointmentIdAsync(string appointmentId)
        {
            var res = await _supabase.From<Invoice>()
                .Where(x => x.AppointmentId == appointmentId)
                .Get();
            
            var invoice = res.Models.FirstOrDefault();
            if (invoice != null)
            {
                // Fetch items separately or use JOIN if configured
                var itemsRes = await _supabase.From<InvoiceItem>()
                    .Where(x => x.InvoiceId == invoice.Id)
                    .Get();
                invoice.Items = itemsRes.Models;
            }
            
            return invoice;
        }

        public async Task<List<Invoice>> GetAllPendingInvoicesAsync()
        {
            // For the front desk checkout view
            var path = "/invoices?select=*,invoice_items(*)&status=eq.pending&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task UpdateInvoiceStatusAsync(string invoiceId, string status)
        {
            var res = await _supabase.From<Invoice>().Where(x => x.Id == invoiceId).Get();
            var invoice = res.Models.FirstOrDefault();
            if (invoice != null)
            {
                invoice.Status = status;
                await _supabase.From<Invoice>().Upsert(invoice);
            }
        }

        public async Task<List<Invoice>> GetAllInvoicesAsync()
        {
            var path = "/invoices?select=*,patient:profiles!patient_id(*),doctor:doctors!doctor_id(*),invoice_items(*)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task<List<Invoice>> GetInvoicesByDoctorIdAsync(string doctorId)
        {
            var path = $"/invoices?select=*,patient:profiles!patient_id(*),doctor:doctors!doctor_id(*),invoice_items(*)&doctor_id=eq.{doctorId}&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }
    }
}
