using SamsonDentalCenterManagementSystem.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class InquiryService
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public InquiryService(Supabase.Client supabase, HttpClient http, string supabaseUrl, string serviceRoleKey)
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

        public async Task<List<Inquiry>> GetAllInquiriesAsync()
        {
           var path = "/inquiries?select=*,patient:profiles!patient_id(*)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<Inquiry>>(json, _json) ?? new();
        }

        public async Task<List<Inquiry>> GetInquiriesByPatientIdAsync(string patientId)
        {
            var path = $"/inquiries?select=*,patient:profiles!patient_id(*)&patient_id=eq.{patientId}&order=created_at.desc";
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

        public async Task<Inquiry> CreateInquiryAsync(Inquiry inquiry, string initialMessage)
        {
            // 1. Create Inquiry
            var req = BuildRequest(HttpMethod.Post, "/inquiries");
            req.Headers.Add("Prefer", "return=representation");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    patient_id = inquiry.PatientId,
                    subject = inquiry.Subject,
                    status = "pending",
                    guest_email = inquiry.GuestEmail,
                    guest_first_name = inquiry.GuestFirstName,
                    guest_last_name = inquiry.GuestLastName,
                    guest_phone = inquiry.GuestPhone
                }),
                Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var created = JsonSerializer.Deserialize<List<Inquiry>>(json, _json)?.FirstOrDefault()
                        ?? throw new Exception("Inquiry creation failed.");

            // 2. Create Initial Message
            await AddMessageAsync(created.Id, inquiry.PatientId, initialMessage, false);

            return created;
        }

        public async Task AddMessageAsync(string inquiryId, string? senderId, string message, bool isFromStaff)
        {
            var req = BuildRequest(HttpMethod.Post, "/inquiry_messages");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    inquiry_id = inquiryId,
                    sender_id = senderId,
                    message = message,
                    is_from_staff = isFromStaff
                }),
                Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            // Update inquiry status/updated_at
            var updateReq = BuildRequest(HttpMethod.Patch, $"/inquiries?id=eq.{inquiryId}");
            var status = isFromStaff ? "replied" : "pending";
            updateReq.Content = new StringContent(
                JsonSerializer.Serialize(new {
                    status = status,
                    updated_at = DateTime.UtcNow
                }),
                Encoding.UTF8, "application/json");
            
            await _http.SendAsync(updateReq);
        }

    }
}
