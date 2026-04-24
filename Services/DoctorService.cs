// ── Services/DoctorService.cs ─────────────────────────────────────────────────
// Fetches doctors joined with profiles using a direct REST call to Supabase
// instead of the postgrest-csharp client, which loses nested objects when the
// nested "id" field conflicts with the parent model's "id" field.

using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

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
        [JsonPropertyName("profiles")]
        public ProfileDto? Profile { get; set; }

        // ── doctor_availability rows (array from the join) ────────────────────
        [JsonPropertyName("doctor_availability")]
        public List<AvailabilityDto>? Availability { get; set; }

        // ── Computed helpers for the view ─────────────────────────────────────
        public string FullName =>
            Profile != null
                ? $"{Title} {Profile.FirstName} {Profile.LastName}".Trim()
                : "Unknown Profile";

        public string Initials =>
            $"{Profile?.FirstName?.FirstOrDefault().ToString().ToUpper() ?? ""}" +
            $"{Profile?.LastName?.FirstOrDefault().ToString().ToUpper()  ?? "?"}";
    }

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

    public class AvailabilityDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("doctor_id")]
        public string DoctorId { get; set; } = string.Empty;

        [JsonPropertyName("day_of_week")]
        public int DayOfWeek { get; set; }

        [JsonPropertyName("start_time")]
        public string StartTime { get; set; } = string.Empty;

        [JsonPropertyName("end_time")]
        public string EndTime { get; set; } = string.Empty;

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; } = true;

        public string DayAbbr => DayOfWeek switch
        {
            0 => "Sun", 1 => "Mon", 2 => "Tue", 3 => "Wed",
            4 => "Thu", 5 => "Fri", 6 => "Sat", _ => "?"
        };
    }

    // ── Service ───────────────────────────────────────────────────────────────
    public class DoctorService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public DoctorService(HttpClient http, string supabaseUrl, string serviceRoleKey)
        {
            _http           = http;
            _supabaseUrl    = supabaseUrl.TrimEnd('/');
            _serviceRoleKey = serviceRoleKey;
        }

        // ── Build a pre-authorised request ────────────────────────────────────
        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey",        _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        // ── Fetch all doctors with profiles + availability ────────────────────
        // Uses Supabase's PostgREST embedded resource syntax:
        //   profiles(*)              → nested profile object
        //   doctor_availability(*)   → nested availability array
        public async Task<List<DoctorDto>> GetAllWithProfilesAsync()
        {
            // select=*,profiles(*),doctor_availability(*) tells PostgREST to
            // embed both related tables. Because these are separate FK relations
            // they come back as distinct nested keys, not flattened columns.
            var path = "/doctors?select=*,profiles(*),doctor_availability(*)&order=created_at.asc";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var json    = await res.Content.ReadAsStringAsync();
            var doctors = JsonSerializer.Deserialize<List<DoctorDto>>(json, _json)
                          ?? new List<DoctorDto>();

            return doctors;
        }

        // ── Fetch active doctors only ─────────────────────────────────────────
        public async Task<List<DoctorDto>> GetActiveWithProfilesAsync()
        {
            var path = "/doctors?select=*,profiles(*),doctor_availability(*)" +
                       "&is_active=eq.true&order=created_at.asc";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var json    = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<DoctorDto>>(json, _json) ?? new();
        }

        // ── Fetch a single doctor by their Profile ID ─────────────────────────
        public async Task<DoctorDto?> GetDoctorByProfileIdAsync(string profileId)
        {
            var path = $"/doctors?select=*,profiles(*),doctor_availability(*)&profile_id=eq.{profileId}";
            var req  = BuildRequest(HttpMethod.Get, path);
            var res  = await _http.SendAsync(req);

            res.EnsureSuccessStatusCode();

            var json    = await res.Content.ReadAsStringAsync();
            var doctors = JsonSerializer.Deserialize<List<DoctorDto>>(json, _json) ?? new();
            
            return doctors.FirstOrDefault();
        }

        // ── Fetch profiles not yet linked to a doctor (for the Add modal) ─────
        public async Task<List<ProfileDto>> GetAvailableProfilesAsync()
        {
            // All doctor-role profiles
            var profileReq = BuildRequest(HttpMethod.Get,
                "/profiles?select=*&role=eq.doctor&order=first_name.asc");
            var profileRes = await _http.SendAsync(profileReq);
            profileRes.EnsureSuccessStatusCode();

            var allProfiles = JsonSerializer.Deserialize<List<ProfileDto>>(
                await profileRes.Content.ReadAsStringAsync(), _json) ?? new();

            // Existing doctor profile_ids
            var docReq = BuildRequest(HttpMethod.Get, "/doctors?select=profile_id");
            var docRes = await _http.SendAsync(docReq);
            docRes.EnsureSuccessStatusCode();

            var linked = JsonSerializer
                .Deserialize<List<JsonElement>>(
                    await docRes.Content.ReadAsStringAsync(), _json)
                ?.Select(e => e.TryGetProperty("profile_id", out var v) ? v.GetString() : null)
                .Where(id => id != null)
                .ToHashSet() ?? new();

            return allProfiles.Where(p => !linked.Contains(p.Id)).ToList();
        }
    }
}