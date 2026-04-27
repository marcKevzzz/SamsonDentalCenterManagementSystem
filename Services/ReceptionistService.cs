using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class ReceptionistDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("desk_location")]
        public string? DeskLocation { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [JsonPropertyName("profiles")]
        public ProfileDto? Profile { get; set; }

        public string FullName =>
            Profile != null
                ? $"{Profile.FirstName} {Profile.LastName}".Trim()
                : "Unknown Profile";

        public string Initials =>
            $"{Profile?.FirstName?.FirstOrDefault().ToString().ToUpper() ?? ""}" +
            $"{Profile?.LastName?.FirstOrDefault().ToString().ToUpper()  ?? "?"}";
    }

    public class ReceptionistService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        


        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public ReceptionistService(HttpClient http, string supabaseUrl, string serviceRoleKey)
        {
            _http           = http;
            _supabaseUrl    = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey",        _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        public async Task<List<ReceptionistDto>> GetAllWithProfilesAsync()
        {
            var path = "/receptionists?select=*,profiles(*)&order=created_at.asc";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var json          = await res.Content.ReadAsStringAsync();
            var receptionists = JsonSerializer.Deserialize<List<ReceptionistDto>>(json, _json)
                                ?? new List<ReceptionistDto>();

            return receptionists;
        }
        
        public async Task<ReceptionistDto?> GetReceptionistByProfileIdAsync(string profileId)
        {
            var path = $"/receptionists?select=*,profiles(*)&profile_id=eq.{profileId}";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var json    = await res.Content.ReadAsStringAsync();
            var receptionists = JsonSerializer.Deserialize<List<ReceptionistDto>>(json, _json) ?? new();
            
            return receptionists.FirstOrDefault();
        }

        // ── Fetch receptionist-role profiles not yet linked ───────────────────
        public async Task<List<ProfileDto>> GetAvailableProfilesAsync()
        {
            var profileReq = BuildRequest(HttpMethod.Get,
                "/profiles?select=*&role=eq.receptionist&order=first_name.asc");
            var profileRes = await _http.SendAsync(profileReq);
            profileRes.EnsureSuccessStatusCode();

            var allProfiles = JsonSerializer.Deserialize<List<ProfileDto>>(
                await profileRes.Content.ReadAsStringAsync(), _json) ?? new();

            var recReq = BuildRequest(HttpMethod.Get, "/receptionists?select=profile_id");
            var recRes = await _http.SendAsync(recReq);
            recRes.EnsureSuccessStatusCode();

            var linked = JsonSerializer
                .Deserialize<List<JsonElement>>(
                    await recRes.Content.ReadAsStringAsync(), _json)
                ?.Select(e => e.TryGetProperty("profile_id", out var v) ? v.GetString() : null)
                .Where(id => id != null)
                .ToHashSet() ?? new();

            return allProfiles.Where(p => !linked.Contains(p.Id)).ToList();
        }

        // ── Create — uses service role key, bypasses RLS ─────────────────────
        public async Task<ReceptionistDto?> CreateAsync(string profileId, string? deskLocation, bool isActive)
        {
            var req = BuildRequest(HttpMethod.Post, "/receptionists");
            req.Headers.Add("Prefer", "return=representation");
            var body = JsonSerializer.Serialize(new
            {
                profile_id    = profileId,
                desk_location = deskLocation,
                is_active     = isActive
            });
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var list = JsonSerializer.Deserialize<List<ReceptionistDto>>(json, _json) ?? new();
            return list.FirstOrDefault();
        }

        // ── Update ───────────────────────────────────────────────────────────
        public async Task<ReceptionistDto?> UpdateAsync(string id, string? deskLocation, bool isActive)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/receptionists?id=eq.{id}");
            req.Headers.Add("Prefer", "return=representation");
            var body = JsonSerializer.Serialize(new
            {
                desk_location = deskLocation,
                is_active     = isActive
            });
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var list = JsonSerializer.Deserialize<List<ReceptionistDto>>(json, _json) ?? new();
            return list.FirstOrDefault();
        }

        // ── Soft delete ──────────────────────────────────────────────────────
        public async Task SoftDeleteAsync(string id)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/receptionists?id=eq.{id}");
            var body = JsonSerializer.Serialize(new { is_active = false });
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
        }
    }
}
