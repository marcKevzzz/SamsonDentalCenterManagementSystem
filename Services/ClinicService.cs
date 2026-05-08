using Microsoft.Extensions.Caching.Memory;
using SamsonDentalCenterManagementSystem.Models;
using Supabase;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class ClinicService
    {
        private readonly Supabase.Client _supabase;
        private readonly ActivityLogService _logs;
        private readonly IMemoryCache _cache;
        private const string DefaultSettingsId = "00000000-0000-0000-0000-000000000001";
        private const string CacheKey = "clinic_settings";

        public ClinicService(Supabase.Client supabase, ActivityLogService logs, IMemoryCache cache)
        {
            _supabase = supabase;
            _logs = logs;
            _cache = cache;
        }

        public async Task<ClinicSettings> GetSettingsAsync()
        {
            if (_cache.TryGetValue(CacheKey, out ClinicSettings? cachedSettings) && cachedSettings != null)
            {
                return cachedSettings;
            }

            try
            {
                var response = await _supabase.From<ClinicSettings>()
                    .Where(x => x.Id == DefaultSettingsId)
                    .Get();

                var settings = response.Models.FirstOrDefault();
                if (settings == null)
                {
                    settings = new ClinicSettings { Id = DefaultSettingsId };
                }

                _cache.Set(CacheKey, settings, TimeSpan.FromMinutes(10));
                return settings;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ClinicService] Error fetching settings: {ex.Message}");
                return new ClinicSettings { Id = DefaultSettingsId };
            }
        }

        public async Task UpdateSettingsAsync(ClinicSettings settings)
        {
            try
            {
                settings.Id = DefaultSettingsId;
                settings.UpdatedAt = DateTime.UtcNow;
                await _supabase.From<ClinicSettings>().Upsert(settings);

                _cache.Remove(CacheKey);
                await _logs.LogActionAsync(null, "updated clinic settings", null, null, "Settings", "/Admin/Settings");
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to save settings: {ex.Message}");
            }
        }

        public async Task<string> UploadPhotoAsync(string fileName, byte[] data, string contentType)
        {
            try
            {
                var uniqueName = $"{Guid.NewGuid()}_{fileName}";
                var path = await _supabase.Storage.From("clinic-photos").Upload(data, uniqueName, new Supabase.Storage.FileOptions { ContentType = contentType });
                return _supabase.Storage.From("clinic-photos").GetPublicUrl(uniqueName);
            }
            catch (Exception ex)
            {
                throw new Exception($"Photo upload failed: {ex.Message}");
            }
        }

        public async Task DeletePhotoAsync(string url)
        {
            try
            {
                var fileName = Path.GetFileName(new Uri(url).LocalPath);
                await _supabase.Storage.From("clinic-photos").Remove(new List<string> { fileName });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ClinicService] Error deleting photo: {ex.Message}");
            }
        }
    }
}
