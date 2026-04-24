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
    }
}
