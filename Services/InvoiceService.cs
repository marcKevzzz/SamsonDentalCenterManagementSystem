using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class InvoiceService
    {
        public readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly ActivityLogService _logs;
        private readonly NotificationService _notifs;
        private readonly IHubContext<AdminHub> _hubContext;
        private readonly IEmailService _emailService;
        private readonly string _appBaseUrl;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public InvoiceService(Supabase.Client supabase, HttpClient http, string supabaseUrl, string serviceRoleKey, ActivityLogService logs, NotificationService notifs, IHubContext<AdminHub> hubContext, IEmailService emailService, string appBaseUrl)
        {
            _supabase = supabase;
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
            _logs = logs;
            _notifs = notifs;
            _hubContext = hubContext;
            _emailService = emailService;
            _appBaseUrl = appBaseUrl.TrimEnd('/');
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
                JsonSerializer.Serialize(
                    new
                    {
                        appointment_id = invoice.AppointmentId,
                        patient_id = invoice.PatientId,
                        doctor_id = invoice.DoctorId,
                        total_amount = invoice.TotalAmount,
                        discount_amount = invoice.DiscountAmount,
                        final_amount = invoice.FinalAmount,
                        status = invoice.Status,
                        notes = invoice.Notes,
                        // omit id — let Supabase generate it
                    }
                ),
                Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                var errBody = await res.Content.ReadAsStringAsync();
                throw new Exception($"Invoice creation failed: {res.StatusCode} - {errBody}");
            }

            var json = await res.Content.ReadAsStringAsync();
            var created =
                JsonSerializer.Deserialize<List<Invoice>>(json, _json)?.FirstOrDefault()
                ?? throw new Exception("Invoice creation returned empty.");

            // Now created.Id is the real server-generated UUID
            foreach (var item in items)
                item.InvoiceId = created.Id;

            var itemsReq = BuildRequest(HttpMethod.Post, "/invoice_items");
            itemsReq.Content = new StringContent(
                JsonSerializer.Serialize(
                    items.Select(i => new
                    {
                        invoice_id = i.InvoiceId,
                        service_id = i.ServiceId,
                        description = i.Description,
                        unit_price = i.UnitPrice,
                        quantity = i.Quantity,
                        total_price = i.TotalPrice,
                    })
                ),
                Encoding.UTF8,
                "application/json"
            );

            var itemsRes = await _http.SendAsync(itemsReq);
            itemsRes.EnsureSuccessStatusCode();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("ReceiveInvoiceUpdate", new { action = "create", id = created.Id });

            await _logs.LogActionAsync(invoice.PatientId, "generated invoice", $"Total: {created.FinalAmount}", null, "Invoice", $"/Admin/Invoices?id={created.Id}");

            return created;
        }

        public async Task CreateTreatmentsAsync(List<Treatment> treatments)
        {
            if (treatments.Count == 0)
                return;

            // Bypass ORM — schema cache may not include newly-added columns (tooth_data, xray_data).
            // Explicit raw HTTP POST with snake_case payload avoids PGRST204 entirely.
            var req = BuildRequest(HttpMethod.Post, "/treatments");
            req.Content = new StringContent(
                JsonSerializer.Serialize(
                    treatments.Select(t => new
                    {
                        invoice_id = t.InvoiceId,
                        service_id = string.IsNullOrEmpty(t.ServiceId) ? (object?)null : t.ServiceId,
                        service_name = t.ServiceName,
                        tooth_numbers = t.ToothNumbers,
                        procedure_details = t.ProcedureDetails,
                        diagnosis = t.Diagnosis,
                        status = t.Status,
                        notes = t.Notes
                    })
                ),
                Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync();
                throw new Exception($"[CreateTreatments] Supabase error: {err}");
            }
        }

        public async Task<Invoice?> GetInvoiceByIdAsync(string id)
        {
            var res = await _supabase.From<Invoice>().Where(i => i.Id == id).Get();
            return res.Models.FirstOrDefault();
        }

        public async Task<Invoice?> GetInvoiceByAppointmentIdAsync(string appointmentId)
        {
            var res = await _supabase
                .From<Invoice>()
                .Where(x => x.AppointmentId == appointmentId)
                .Get();

            var invoice = res.Models.FirstOrDefault();
            if (invoice != null)
            {
                // Fetch items separately or use JOIN if configured
                var itemsRes = await _supabase
                    .From<InvoiceItem>()
                    .Where(x => x.InvoiceId == invoice.Id)
                    .Get();
                invoice.Items = itemsRes.Models;
            }

            return invoice;
        }

        public async Task<List<Invoice>> GetAllPendingInvoicesAsync()
        {
            // For the front desk checkout view
            var path =
                "/invoices?select=*,invoice_items(*)&status=eq.pending&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task<List<Invoice>> GetAllInvoicesAsync()
        {
            var path =
                "/invoices?select=*,patient:profiles(*),doctor:doctors(*,profiles(*)),invoice_items(*)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task<List<Invoice>> GetInvoicesByDoctorIdAsync(string doctorId)
        {
            var path =
                $"/invoices?select=*,patient:profiles(*),doctor:doctors(*,profiles(*)),invoice_items(*)&doctor_id=eq.{doctorId}&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task<List<Invoice>> GetInvoicesByPatientIdAsync(string patientId)
        {
            var path =
                $"/invoices?select=*,patient:profiles(*),doctor:doctors(*,profiles(*)),invoice_items(*)&patient_id=eq.{patientId}&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Invoice>>(json, _json) ?? new();
        }

        public async Task UpdateInvoiceStatusAsync(string invoiceId, string status)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/invoices?id=eq.{invoiceId}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { status }),
                Encoding.UTF8,
                "application/json"
            );
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("ReceiveInvoiceUpdate", new { action = "status_update", id = invoiceId, status = status });

            await _logs.LogActionAsync(null, "updated invoice status", $"ID: {invoiceId}, New Status: {status}", null, "Invoice", $"/Admin/Invoices?id={invoiceId}");
        }

        public async Task RecordPaymentAsync(Payment payment)
        {
            // Insert payment record (once only)
            await _supabase.From<Payment>().Insert(payment);

            // Calculate total paid so far for this invoice
            var res = await _supabase
                .From<Payment>()
                .Where(x => x.InvoiceId == payment.InvoiceId)
                .Get();

            var totalPaid = res.Models.Sum(p => p.Amount);

            // Log payment
            await _logs.LogActionAsync(payment.InvoiceId, "payment recorded", $"Amount: {payment.Amount}", null, "Invoice", $"/Admin/Invoices?id={payment.InvoiceId}");
            
            // Update invoice status based on total paid
            var invRes = await _supabase.From<Invoice>().Where(i => i.Id == payment.InvoiceId).Get();
            var invoice = invRes.Models.FirstOrDefault();
            if (invoice != null)
            {
                // Notify patient
                await _notifs.CreateNotificationAsync(invoice.PatientId, "Payment Received", $"A payment of {payment.Amount:C} has been recorded for your invoice.");

                string newStatus =
                    totalPaid >= invoice.FinalAmount
                        ? "paid"
                        : (totalPaid > 0 ? "partial" : "pending");
                await UpdateInvoiceStatusAsync(invoice.Id, newStatus);

                // Send Email Receipt
                try
                {
                    var patientRes = await _supabase.From<Profile>().Where(x => x.Id == invoice.PatientId).Get();
                    var patient = patientRes.Models.FirstOrDefault();
                    if (patient != null && !string.IsNullOrEmpty(patient.Email))
                    {
                        await _emailService.SendEmailAsync(
                            patient.Email,
                            $"{patient.FirstName} {patient.LastName}",
                            $"Payment Receipt - Invoice #{invoice.Id[..8].ToUpper()}",
                            "InvoiceReceipt",
                            new {
                                Name = $"{patient.FirstName} {patient.LastName}",
                                InvoiceNumber = invoice.Id[..8].ToUpper(),
                                AmountPaid = payment.Amount.ToString("C"),
                                Method = payment.PaymentMethod,
                                Balance = (invoice.FinalAmount - totalPaid).ToString("C"),
                                Status = newStatus
                            }
                        );
                    }
                }
                catch(Exception ex)
                {
                    Console.WriteLine($"[InvoiceReceiptEmail] Failed to send: {ex.Message}");
                }
            }
        }
    }
}
