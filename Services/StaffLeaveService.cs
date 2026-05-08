using System.Net.Http.Headers;
using System.Text.Json;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class StaffLeaveService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly ActivityLogService _logs;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public StaffLeaveService(HttpClient http, string supabaseUrl, string serviceRoleKey, ActivityLogService logs)
        {
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
            _logs = logs;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        public async Task<List<StaffLeave>> GetAllLeavesAsync()
        {
            var path = "/staff_leaves?select=*,profile:profiles!staff_leaves_profile_id_fkey(first_name,last_name)&order=created_at.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var leaves = new List<StaffLeave>();

            foreach (var element in doc.RootElement.EnumerateArray())
            {
                var leave = JsonSerializer.Deserialize<StaffLeave>(element.GetRawText(), _jsonOptions);
                if (leave != null && element.TryGetProperty("profile", out var profile))
                {
                    var first = profile.TryGetProperty("first_name", out var f) ? f.GetString() : "";
                    var last = profile.TryGetProperty("last_name", out var l) ? l.GetString() : "";
                    leave.StaffName = $"{first} {last}".Trim();
                }
                if (leave != null) leaves.Add(leave);
            }

            return leaves;
        }

        public async Task<List<StaffLeave>> GetLeavesByProfileIdAsync(string profileId)
        {
            var path = $"/staff_leaves?profile_id=eq.{profileId}&order=start_date.desc";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<StaffLeave>>(json, _jsonOptions) ?? new();
        }

        public async Task<StaffLeave> CreateLeaveAsync(StaffLeave leave)
        {
            var req = BuildRequest(HttpMethod.Post, "/staff_leaves");
            req.Headers.Add("Prefer", "return=representation");
            var dbPayload = new
            {
                profile_id = leave.ProfileId,
                leave_type = leave.LeaveType,
                start_date = leave.StartDate.ToString("yyyy-MM-dd"),
                end_date = leave.EndDate.ToString("yyyy-MM-dd"),
                reason = leave.Reason,
                status = leave.Status,
                created_at = leave.CreatedAt
            };

            req.Content = new StringContent(JsonSerializer.Serialize(dbPayload, _jsonOptions), System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var created = JsonSerializer.Deserialize<List<StaffLeave>>(json, _jsonOptions)?.FirstOrDefault();

            if (created != null)
            {
                await _logs.LogActionAsync(leave.ProfileId, "Applied for leave", $"{leave.LeaveType} from {leave.StartDate:yyyy-MM-dd} to {leave.EndDate:yyyy-MM-dd}", "Staff", "/Staff/Profile");
            }

            return created ?? throw new Exception("Failed to create leave request.");
        }

        public async Task UpdateStatusAsync(string id, string status, string adminProfileId)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/staff_leaves?id=eq.{id}");
            var payload = new { status = status, approved_by = adminProfileId, updated_at = DateTime.UtcNow };
            req.Content = new StringContent(JsonSerializer.Serialize(payload, _jsonOptions), System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            await _logs.LogActionAsync(adminProfileId, "Updated leave status", $"Leave ID: {id} set to {status}", "Admin", "/Admin/Staff");
        }
    }
}
