using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
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
        private readonly IHttpContextAccessor _httpContextAccessor;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public ActivityLogService(
            HttpClient http,
            string supabaseUrl,
            string serviceRoleKey,
            IHubContext<AdminHub> hubContext,
            IHttpContextAccessor httpContextAccessor
        )
        {
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
            _hubContext = hubContext;
            _httpContextAccessor = httpContextAccessor;
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
            string? targetProfileId,
            string action,
            string? details = null,
            string? ipAddress = null,
            string? category = null,
            string? link = null
        )
        {
            // 1. Resolve performing user (the one who did the action)
            string? performerId = _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value;
            
            // 2. Resolve IP if not provided
            if (string.IsNullOrEmpty(ipAddress))
            {
                var remoteIp = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress;
                if (remoteIp != null)
                {
                    // Map IPv6 loopback to readable form
                    if (System.Net.IPAddress.IsLoopback(remoteIp))
                        ipAddress = "127.0.0.1";
                    // Unwrap IPv4-mapped IPv6 (::ffff:x.x.x.x)
                    else if (remoteIp.IsIPv4MappedToIPv6)
                        ipAddress = remoteIp.MapToIPv4().ToString();
                    else
                        ipAddress = remoteIp.ToString();
                }
            }

            string userName = "System";
            // Use performerId if available (for logs), otherwise fallback to targetProfileId
            string? logProfileId = performerId ?? targetProfileId;

            if (!string.IsNullOrEmpty(logProfileId))
            {
                try
                {
                    // Fetch profile name via direct REST to avoid circular dependency with ProfileService
                    var path = $"/profiles?select=first_name,last_name&id=eq.{logProfileId}&limit=1";
                    var profileReq = BuildRequest(HttpMethod.Get, path);
                    var profileRes = await _http.SendAsync(profileReq);
                    if (profileRes.IsSuccessStatusCode)
                    {
                        var profileJson = await profileRes.Content.ReadAsStringAsync();
                        var profiles = JsonSerializer.Deserialize<List<JsonElement>>(profileJson, _json);
                        if (profiles != null && profiles.Count > 0)
                        {
                            var p = profiles[0];
                            string first = p.TryGetProperty("first_name", out var f) ? f.GetString() ?? "" : "";
                            string last = p.TryGetProperty("last_name", out var l) ? l.GetString() ?? "" : "";
                            userName = $"{first} {last}".Trim();
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ActivityLogService] Failed to fetch profile name: {ex.Message}");
                }
            }

            var log = new
            {
                profile_id = logProfileId,
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
                            userName = userName,
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
