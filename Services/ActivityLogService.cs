using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using System.Net.Http.Headers;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class ActivityLogService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IHubContext<AdminHub> _hubContext;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public ActivityLogService(
            HttpClient http,
            string supabaseUrl,
            string serviceRoleKey,
            IHubContext<AdminHub> hubContext
        )
        {
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
            _hubContext = hubContext;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        public async Task LogActionAsync(
            string? profileId,
            string action,
            string? details = null,
            string? ipAddress = null,
            string? category = null,
            string? link = null
        )
        {
            var log = new
            {
                profile_id = profileId,
                action = action,
                details = details,
                ip_address = ipAddress,
                category = category,
                link = link,
            };

            var req = BuildRequest(HttpMethod.Post, "/activity_logs");
            req.Content = new StringContent(
                JsonSerializer.Serialize(log),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            req.Headers.Add("Prefer", "return=representation");
            var res = await _http.SendAsync(req);

            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                var created = JsonSerializer
                    .Deserialize<List<ActivityLogDto>>(json, _json)
                    ?.FirstOrDefault();
                if (created != null)
                {
                    // Broadcast to SignalR
                    await _hubContext.Clients.All.SendAsync(
                        "ReceiveActivityLog",
                        new
                        {
                            id = created.Id,
                            profileId = created.ProfileId,
                            userName = "System", // Default for now, ideally fetch profile
                            action = created.Action,
                            details = created.Details,
                            category = created.Category,
                            link = created.Link,
                            ipAddress = created.IpAddress,
                            createdAt = created.CreatedAt,
                        }
                    );
                }
            }
        }

        public async Task<List<ActivityLogDto>> GetAllLogsAsync()
        {
            var path = "/activity_logs?select=*,profiles(*)&order=created_at.desc&limit=100";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<ActivityLogDto>>(json, _json) ?? new();
        }
    }

    public class ActivityLogDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("profile_id")]
        public string? ProfileId { get; set; }

        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;

        [JsonPropertyName("details")]
        public string? Details { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("link")]
        public string? Link { get; set; }

        [JsonPropertyName("ip_address")]
        public string? IpAddress { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("profiles")]
        public ProfileDto? Profile { get; set; }
    }
}
