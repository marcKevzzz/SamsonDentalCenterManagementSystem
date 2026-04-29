using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class NotificationService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IHubContext<AdminHub> _hubContext;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public NotificationService(
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

        public async Task CreateNotificationAsync(
            string profileId,
            string title,
            string message,
            string type = "info",
            string? link = null
        )
        {
            var notification = new
            {
                profile_id = profileId,
                title = title,
                message = message,
                type = type,
                link = link,
            };

            var req = BuildRequest(HttpMethod.Post, "/notifications");
            req.Content = new StringContent(
                JsonSerializer.Serialize(notification),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            req.Headers.Add("Prefer", "return=representation");
            var res = await _http.SendAsync(req);

            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                var created = JsonSerializer
                    .Deserialize<List<NotificationDto>>(json, _json)
                    ?.FirstOrDefault();
                if (created != null)
                {
                    // Broadcast to SignalR
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", created);
                }
            }
        }

        public async Task<List<NotificationDto>> GetUserNotificationsAsync(string profileId)
        {
            var path = $"/notifications?profile_id=eq.{profileId}&order=created_at.desc&limit=20";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<NotificationDto>>(json, _json) ?? new();
        }

        public async Task MarkAsReadAsync(string notificationId)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/notifications?id=eq.{notificationId}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { is_read = true }),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            await _http.SendAsync(req);
        }

        public async Task<int> GetUnreadCountAsync(string profileId)
        {
            var path = $"/notifications?profile_id=eq.{profileId}&is_read=eq.false&select=count";
            var req = BuildRequest(HttpMethod.Get, path);
            req.Headers.Add("Prefer", "count=exact");
            var res = await _http.SendAsync(req);

            if (res.Headers.TryGetValues("Content-Range", out var values))
            {
                var range = values.First();
                var countStr = range.Split('/').Last();
                if (int.TryParse(countStr, out var count))
                    return count;
            }
            return 0;
        }
    }

    public class NotificationDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("is_read")]
        public bool IsRead { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = "info";

        [JsonPropertyName("link")]
        public string? Link { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
