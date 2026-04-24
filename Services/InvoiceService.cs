using SamsonDentalCenterManagementSystem.Models;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class InvoiceService
    {
        private readonly Supabase.Client _supabase;
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
            // 1. Insert Invoice
            var res = await _supabase.From<Invoice>().Insert(invoice);
            var createdInvoice = res.Models.First();

            // 2. Set InvoiceId for all items and insert
            foreach (var item in items)
            {
                item.InvoiceId = createdInvoice.Id;
            }
            await _supabase.From<InvoiceItem>().Insert(items);

            return createdInvoice;
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
            var path = "/invoices?select=*,profiles(*),invoice_items(*)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task<List<Invoice>> GetInvoicesByDoctorIdAsync(string doctorId)
        {
            var path = $"/invoices?select=*,profiles(*),invoice_items(*)&doctor_id=eq.{doctorId}&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }
    }
}
