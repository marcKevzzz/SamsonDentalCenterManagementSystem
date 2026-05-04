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

        [JsonPropertyName("bio")]
        public string? Bio { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [JsonPropertyName("profiles")]
        public ProfileDto? Profile { get; set; }

        [JsonPropertyName("staff_availability")]
        public List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>? Availability { get; set; }

        public string FullName =>
            Profile != null
                ? $"{Profile.FirstName} {Profile.LastName}".Trim()
                : "Unknown Profile";

        public string Initials =>
            $"{( (Profile?.FirstName?.Length ?? 0) > 0 ? Profile.FirstName[0] : ' ')}{( (Profile?.LastName?.Length ?? 0) > 0 ? Profile.LastName[0] : ' ')}".Trim();
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

        // ── Fetch availability from staff_availability (no FK embed needed) ──
        private async Task<Dictionary<string, List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>>> FetchReceptionistAvailabilityAsync()
        {
            try
            {
                var req = BuildRequest(HttpMethod.Get, "/staff_availability?staff_type=eq.receptionist");
                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode) return new();
                var json  = await res.Content.ReadAsStringAsync();
                var slots = JsonSerializer.Deserialize<List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>>(json, _json) ?? new();
                return slots.GroupBy(s => s.StaffId)
                            .ToDictionary(g => g.Key, g => g.ToList());
            }
            catch { return new(); }
        }

        public async Task<List<ReceptionistDto>> GetAllWithProfilesAsync()
        {
            var path = "/receptionists?select=*,profiles(*)&order=created_at.asc";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var receptionists = JsonSerializer.Deserialize<List<ReceptionistDto>>(
                await res.Content.ReadAsStringAsync(), _json) ?? new();

            var avail = await FetchReceptionistAvailabilityAsync();
            foreach (var r in receptionists)
                r.Availability = avail.TryGetValue(r.Id, out var s) ? s : new();

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
            var rec = receptionists.FirstOrDefault();

            if (rec != null)
            {
                var avail = await FetchReceptionistAvailabilityAsync();
                rec.Availability = avail.TryGetValue(rec.Id, out var s) ? s : new();
            }

            return rec;
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
        public async Task<ReceptionistDto?> UpdateAsync(string id, string? deskLocation, string? bio, bool isActive)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/receptionists?id=eq.{id}");
            req.Headers.Add("Prefer", "return=representation");
            var body = JsonSerializer.Serialize(new
            {
                desk_location = deskLocation,
                bio           = bio,
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

        // ── Availability ─────────────────────────────────────────────────────
        public async Task SetAvailabilityAsync(string receptionistId, List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto> slots)
        {
            // 1. Delete existing for receptionist
            var delReq = BuildRequest(HttpMethod.Delete, $"/staff_availability?staff_id=eq.{receptionistId}&staff_type=eq.receptionist");
            await _http.SendAsync(delReq);

            if (slots == null || !slots.Any()) return;

            // 2. Insert new slots
            var insReq = BuildRequest(HttpMethod.Post, "/staff_availability");
            
            var payload = slots.Select(s => new
            {
                staff_id    = receptionistId,
                staff_type  = "receptionist",
                day_of_week = s.DayOfWeek,
                start_time  = s.StartTime,
                end_time    = s.EndTime,
                is_active   = true
            }).ToList();

            insReq.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(insReq);
            res.EnsureSuccessStatusCode();
        }
    }
}
