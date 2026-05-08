// ── Services/DoctorService.cs ─────────────────────────────────────────────────
// Fetches doctors joined with profiles using a direct REST call to Supabase
// instead of the postgrest-csharp client, which loses nested objects when the
// nested "id" field conflicts with the parent model's "id" field.

using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.Json.Serialization;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    // ── Flat DTO — mirrors the JOIN result from Supabase ─────────────────────
    // All columns come back at the same level when using the embedded resource
    // syntax, so we use a dedicated flat class instead of nested models.
    public class DoctorDto
    {
        // ── doctors columns ───────────────────────────────────────────────────
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("profile_id")]
        public string? ProfileId { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = "Dr.";

        [JsonPropertyName("specialties")]
        public string[] Specialties { get; set; } = Array.Empty<string>();

        [JsonPropertyName("bio")]
        public string? Bio { get; set; }

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        // ── profiles columns (nested object from the join) ────────────────────
        [JsonPropertyName("profile")]
        public ProfileDto? Profile { get; set; }

        // ── staff_availability rows (array from the join) ──────────────────
        [JsonPropertyName("staff_availability")]
        public List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>? Availability { get; set; }

        // ── Computed helpers for the view ─────────────────────────────────────
        public string FullName =>
            Profile != null
                ? $"{Title} {Profile.FirstName} {Profile.LastName}".Trim()
                : "Unknown Profile";

        public string Initials =>
            $"{( (Profile?.FirstName?.Length ?? 0) > 0 ? Profile.FirstName[0] : ' ')}{( (Profile?.LastName?.Length ?? 0) > 0 ? Profile.LastName[0] : ' ')}".Trim();
    }

    // ── ProfileDto (used for projections) ─────────────────────
    public class ProfileDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("avatar_url")]
        public string? AvatarUrl { get; set; }

        [JsonPropertyName("phone_number")]
        public string? PhoneNumber { get; set; }

        [JsonPropertyName("role")]
        public string? Role { get; set; }
    }

    // ── Service ───────────────────────────────────────────────────────────────
    public class DoctorService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IMemoryCache _cache;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        private const string CacheKeyActive = "active_doctors";

        public DoctorService(HttpClient http, string supabaseUrl, string serviceRoleKey, IMemoryCache cache)
        {
            _http = http;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
            _cache = cache;
        }

        // ── Build a pre-authorised request ────────────────────────────────────
        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        // ── Fetch availability from staff_availability (no FK embed needed) ─────
        private async Task<Dictionary<string, List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>>> FetchDoctorAvailabilityAsync(string? staffId = null)
        {
            try
            {
                var path = "/staff_availability?select=*";
                if (!string.IsNullOrEmpty(staffId)) path += $"&staff_id=eq.{staffId}";
                
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode) return new(StringComparer.OrdinalIgnoreCase);
                var json  = await res.Content.ReadAsStringAsync();
                var slots = JsonSerializer.Deserialize<List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto>>(json, _json) ?? new();
                return slots.GroupBy(s => s.StaffId)
                            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);
            }
            catch { return new(StringComparer.OrdinalIgnoreCase); }
        }

        // ── Fetch all doctors with profiles + availability ─────────────────────
        public async Task<List<DoctorDto>> GetAllWithProfilesAsync()
        {
            var req = BuildRequest(HttpMethod.Get, "/doctors?select=*,profile:profiles!profile_id(*)&order=created_at.asc");
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var doctors = JsonSerializer.Deserialize<List<DoctorDto>>(
                await res.Content.ReadAsStringAsync(), _json) ?? new();

            var avail = await FetchDoctorAvailabilityAsync();
            foreach (var d in doctors)
                d.Availability = (avail.TryGetValue(d.Id, out var s) || avail.TryGetValue(d.Id.ToLower(), out s)) ? s : new();

            return doctors;
        }

        // ── Fetch active doctors only ─────────────────────────────────────────
        public async Task<List<DoctorDto>> GetActiveWithProfilesAsync()
        {
            if (_cache.TryGetValue(CacheKeyActive, out List<DoctorDto>? cachedDoctors) && cachedDoctors != null)
            {
                return cachedDoctors;
            }

            var req = BuildRequest(HttpMethod.Get,
                "/doctors?select=*,profile:profiles!profile_id(*)&is_active=eq.true&order=created_at.asc");
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var doctors = JsonSerializer.Deserialize<List<DoctorDto>>(
                await res.Content.ReadAsStringAsync(), _json) ?? new();

            var avail = await FetchDoctorAvailabilityAsync();
            foreach (var d in doctors)
                d.Availability = (avail.TryGetValue(d.Id, out var s) || avail.TryGetValue(d.Id.ToLower(), out s)) ? s : new();

            _cache.Set(CacheKeyActive, doctors, TimeSpan.FromMinutes(10));
            return doctors;
        }

        // ── Fetch a single doctor by their Profile ID ─────────────────────────
        public async Task<DoctorDto?> GetDoctorByProfileIdAsync(string profileId)
        {
            if (string.IsNullOrEmpty(profileId)) return null;
            var req = BuildRequest(HttpMethod.Get,
                $"/doctors?select=*,profile:profiles!profile_id(*)&profile_id=eq.{profileId}");
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var doctors = JsonSerializer.Deserialize<List<DoctorDto>>(
                await res.Content.ReadAsStringAsync(), _json) ?? new();
            var doc = doctors.FirstOrDefault();

            if (doc != null)
            {
                var avail = await FetchDoctorAvailabilityAsync(doc.Id);
                doc.Availability = (avail.TryGetValue(doc.Id, out var s) || avail.TryGetValue(doc.Id.ToLower(), out s)) ? s : new();
            }

            return doc;
        }

        // ── Fetch profiles not yet linked to a doctor (for the Add modal) ─────
        public async Task<List<ProfileDto>> GetAvailableProfilesAsync()
        {
            // Only doctor-role profiles (admins no longer double as doctors)
            var profileReq = BuildRequest(
                HttpMethod.Get,
                "/profiles?select=*&role=eq.doctor&order=first_name.asc"
            );
            var profileRes = await _http.SendAsync(profileReq);
            profileRes.EnsureSuccessStatusCode();

            var allProfiles =
                JsonSerializer.Deserialize<List<ProfileDto>>(
                    await profileRes.Content.ReadAsStringAsync(),
                    _json
                ) ?? new();

            // Existing doctor profile_ids
            var docReq = BuildRequest(HttpMethod.Get, "/doctors?select=profile_id");
            var docRes = await _http.SendAsync(docReq);
            docRes.EnsureSuccessStatusCode();

            var linked =
                JsonSerializer
                    .Deserialize<List<JsonElement>>(await docRes.Content.ReadAsStringAsync(), _json)
                    ?.Select(e => e.TryGetProperty("profile_id", out var v) ? v.GetString() : null)
                    .Where(id => id != null)
                    .ToHashSet()
                ?? new();

            return allProfiles.Where(p => !linked.Contains(p.Id)).ToList();
        }

        // ── Create — direct REST, bypasses ORM nav-property serialization ────
        public async Task<DoctorDto?> CreateAsync(
            string profileId,
            string title,
            string[]? specialties,
            string? bio,
            bool isActive
        )
        {
            var req = BuildRequest(HttpMethod.Post, "/doctors");
            req.Headers.Add("Prefer", "return=representation");
            var body = JsonSerializer.Serialize(
                new
                {
                    profile_id = profileId,
                    title = title,
                    specialties = specialties ?? Array.Empty<string>(),
                    bio = bio,
                    is_active = isActive,
                }
            );
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var list = JsonSerializer.Deserialize<List<DoctorDto>>(json, _json) ?? new();
            return list.FirstOrDefault();
        }

        // ── Update — direct REST ─────────────────────────────────────────────
        public async Task<DoctorDto?> UpdateAsync(
            string id,
            string title,
            string[]? specialties,
            string? bio,
            bool isActive
        )
        {
            var req = BuildRequest(HttpMethod.Patch, $"/doctors?id=eq.{id}");
            req.Headers.Add("Prefer", "return=representation");
            var body = JsonSerializer.Serialize(
                new
                {
                    title = title,
                    specialties = specialties ?? Array.Empty<string>(),
                    bio = bio,
                    is_active = isActive,
                }
            );
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var list = JsonSerializer.Deserialize<List<DoctorDto>>(json, _json) ?? new();
            return list.FirstOrDefault();
        }

        // ── Soft delete ──────────────────────────────────────────────────────
        public async Task SoftDeleteAsync(string id)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/doctors?id=eq.{id}");
            var body = JsonSerializer.Serialize(new { is_active = false });
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            _cache.Remove(CacheKeyActive);
        }

        // ── Set availability — bypasses RLS ──────────────────────────────────
        public async Task SetAvailabilityAsync(string doctorId, List<SamsonDentalCenterManagementSystem.Models.AvailabilityDto> slots)
        {
            // 1. Delete old slots for this doctor
            var delReq = BuildRequest(
                HttpMethod.Delete,
                $"/staff_availability?staff_id=eq.{doctorId}&staff_type=eq.doctor"
            );
            var delRes = await _http.SendAsync(delReq);
            delRes.EnsureSuccessStatusCode();

            if (slots == null || !slots.Any())
                return;

            // 2. Insert new slots
            var insReq = BuildRequest(HttpMethod.Post, "/staff_availability");
            var payload = slots.Select(s => new
            {
                staff_id = doctorId,
                staff_type = "doctor",
                day_of_week = s.DayOfWeek,
                start_time = s.StartTime,
                end_time = s.EndTime,
                is_active = true,
            });
            var body = JsonSerializer.Serialize(payload);
            insReq.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            var insRes = await _http.SendAsync(insReq);
            insRes.EnsureSuccessStatusCode();
        }
    }
}
