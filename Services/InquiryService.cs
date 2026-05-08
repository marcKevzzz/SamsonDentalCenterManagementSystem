using SamsonDentalCenterManagementSystem.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using SamsonDentalCenterManagementSystem.Hubs;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class InquiryService
    {
        private readonly Supabase.Client _supabase;
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
            PropertyNameCaseInsensitive = true
        };

        public InquiryService(Supabase.Client supabase, HttpClient http, string supabaseUrl, string serviceRoleKey, ActivityLogService logs, NotificationService notifs, IHubContext<AdminHub> hubContext, IEmailService emailService, string appBaseUrl)
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

        public async Task<List<Inquiry>> GetAllInquiriesAsync()
        {
            var path = "/inquiries?select=*,patient:profiles!patient_id(*),sender:profiles!sender_id(*)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            
            var result = JsonSerializer.Deserialize<List<Inquiry>>(json, _json) ?? new();
            
            return result;
        }

        public async Task<List<Inquiry>> GetInquiriesByPatientIdAsync(string patientId)
        {
            var path = $"/inquiries?select=*,patient:profiles!patient_id(*),sender:profiles!sender_id(*)&patient_id=eq.{patientId}&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Inquiry>>(json, _json) ?? new();
        }

        public async Task<List<InquiryMessage>> GetInquiryMessagesAsync(string inquiryId)
        {
            var path = $"/inquiry_messages?select=*,sender:profiles!sender_id(*)&inquiry_id=eq.{inquiryId}&order=created_at.asc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<InquiryMessage>>(json, _json) ?? new();
        }

        public async Task<Inquiry> CreateInquiryAsync(Inquiry inquiry, string initialMessage, string? senderId = null, bool isFromStaff = false)
        {
            // 1. Create Inquiry
            var req = BuildRequest(HttpMethod.Post, "/inquiries");
            req.Headers.Add("Prefer", "return=representation");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    patient_id = inquiry.PatientId,
                    subject = inquiry.Subject,
                    status = isFromStaff ? "replied" : "pending", // If staff starts it, status is 'replied'
                    guest_email = inquiry.GuestEmail,
                    guest_first_name = inquiry.GuestFirstName,
                    guest_last_name = inquiry.GuestLastName,
                    guest_phone = inquiry.GuestPhone,
                    is_from_staff = isFromStaff,
                    sender_id = senderId ?? inquiry.PatientId
                }),
                Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var created = JsonSerializer.Deserialize<List<Inquiry>>(json, _json)?.FirstOrDefault()
                        ?? throw new Exception("Inquiry creation failed.");

            // 2. Create Initial Message
            await AddMessageAsync(created.Id, senderId ?? inquiry.PatientId, initialMessage, isFromStaff);

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("ReceiveInquiryUpdate", new { action = "create", id = created.Id });

            // Log action
            await _logs.LogActionAsync(senderId ?? inquiry.PatientId, "sent inquiry", $"Subject: {inquiry.Subject}", null, "Inquiry", $"/Admin/Inquiries?id={created.Id}");

            return created;
        }

        public async Task AddMessageAsync(string inquiryId, string? senderId, string message, bool isFromStaff, bool isInternal = false)
        {
            var req = BuildRequest(HttpMethod.Post, "/inquiry_messages");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    inquiry_id = inquiryId,
                    sender_id = senderId,
                    message = message,
                    is_from_staff = isFromStaff,
                    is_internal = isInternal
                }),
                Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            if (!res.IsSuccessStatusCode) {
                var errBody = await res.Content.ReadAsStringAsync();
                throw new Exception($"Supabase error: {res.StatusCode} - {errBody}");
            }

            // Update inquiry status/updated_at (only if not an internal note)
            var updateReq = BuildRequest(HttpMethod.Patch, $"/inquiries?id=eq.{inquiryId}");
            var status = isFromStaff ? (isInternal ? null : "replied") : "pending";
            
            var updateBody = new Dictionary<string, object> {
                { "updated_at", DateTime.UtcNow.ToString("o") }
            };
            if (status != null) updateBody.Add("status", status);

            updateReq.Content = new StringContent(
                JsonSerializer.Serialize(updateBody),
                Encoding.UTF8, "application/json");
            
            await _http.SendAsync(updateReq);

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("ReceiveInquiryUpdate", new { action = "message", id = inquiryId });

            if (isFromStaff && senderId != null)
            {
                // If staff replies, notify patient via email
                try
                {
                    var inqRes = await _supabase.From<Inquiry>()
                        .Select("*, patient:profiles!patient_id(*)")
                        .Where(x => x.Id == inquiryId)
                        .Get();
                    var inquiry = inqRes.Models.FirstOrDefault();
                    
                    if (inquiry != null)
                    {
                        string targetEmail = inquiry.Patient?.Email ?? inquiry.GuestEmail ?? "";
                        string targetName = inquiry.Patient != null ? $"{inquiry.Patient.FirstName} {inquiry.Patient.LastName}" : $"{inquiry.GuestFirstName} {inquiry.GuestLastName}";
                        
                        if (!string.IsNullOrEmpty(targetEmail))
                        {
                            await _emailService.SendEmailAsync(
                                targetEmail,
                                targetName,
                                $"Reply to your inquiry: {inquiry.Subject}",
                                "InquiryReply",
                                new {
                                    Name = targetName,
                                    Subject = inquiry.Subject,
                                    Message = message,
                                    Link = inquiry.PatientId != null ? $"{_appBaseUrl}/Portal/Inquiries" : $"{_appBaseUrl}/Contact"
                                }
                            );
                        }
                    }
                }
                catch(Exception ex)
                {
                    Console.WriteLine($"[InquiryEmail] Failed to send reply notification: {ex.Message}");
                }

                await _logs.LogActionAsync(senderId, "replied to inquiry", $"Inquiry ID: {inquiryId}", null, "Inquiry", $"/Admin/Inquiries?id={inquiryId}");
            }
        }
        public async Task MarkAsReadAsync(string inquiryId)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/inquiries?id=eq.{inquiryId}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { is_read = true }),
                Encoding.UTF8, "application/json");
            await _http.SendAsync(req);
        }

        public async Task UpdateStatusAsync(string inquiryId, string status)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/inquiries?id=eq.{inquiryId}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { status = status, updated_at = DateTime.UtcNow.ToString("o") }),
                Encoding.UTF8, "application/json");
            await _http.SendAsync(req);

            await _hubContext.Clients.All.SendAsync("ReceiveInquiryUpdate", new { action = "status", id = inquiryId, status = status });
        }

        public async Task UpdateAssignedDoctorAsync(string inquiryId, string? doctorId)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/inquiries?id=eq.{inquiryId}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { assigned_doctor_id = doctorId, updated_at = DateTime.UtcNow.ToString("o") }),
                Encoding.UTF8, "application/json");
            await _http.SendAsync(req);

            await _hubContext.Clients.All.SendAsync("ReceiveInquiryUpdate", new { action = "assign", id = inquiryId, assignedDoctorId = doctorId });
        }
    }
}
