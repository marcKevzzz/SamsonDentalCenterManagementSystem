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
                    var anyResponse = await _supabase.From<ClinicSettings>().Limit(1).Get();
                    settings = anyResponse.Models.FirstOrDefault();
                }
 
                if (settings == null)
                {
                    settings = new ClinicSettings { Id = DefaultSettingsId };
                }
                else if (string.IsNullOrEmpty(settings.Id))
                {
                    settings.Id = DefaultSettingsId;
                }
 
                settings.ClinicPhotos ??= new();
                settings.ClinicalHours ??= new();
                settings.Faqs ??= new();
 
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
                if (string.IsNullOrEmpty(settings.Id)) 
                    settings.Id = DefaultSettingsId;
                    
                settings.UpdatedAt = DateTime.UtcNow;
                await _supabase.From<ClinicSettings>().Upsert(settings);
 
                _cache.Remove(CacheKey);
                await _logs.LogActionAsync(null, "updated clinic settings", null, null, "Settings", "/Admin/Settings");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ClinicService] Error updating settings: {ex.Message}");
                throw new Exception($"Failed to save settings: {ex.Message}");
            }
        }

        public async Task<List<ChatbotConversation>> GetChatbotHistoryAsync(string sessionId, string? userId = null)
        {
            try
            {
                var query = _supabase.From<ChatbotConversation>()
                    .Filter("session_id", Supabase.Postgrest.Constants.Operator.Equals, sessionId);

                if (!string.IsNullOrEmpty(userId))
                {
                    query = query.Filter("user_id", Supabase.Postgrest.Constants.Operator.Equals, userId);
                }

                var response = await query.Order("created_at", Supabase.Postgrest.Constants.Ordering.Ascending).Get();
                return response.Models;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ClinicService] Error fetching chatbot history: {ex.Message}");
                return new List<ChatbotConversation>();
            }
        }

        public async Task<string> UploadPhotoAsync(string fileName, byte[] data, string contentType, string bucket = "clinic-photos")
        {
            try
            {
                var uniqueName = $"{Guid.NewGuid()}_{fileName}";
                var path = await _supabase.Storage.From(bucket).Upload(data, uniqueName, new Supabase.Storage.FileOptions { ContentType = contentType });
                return _supabase.Storage.From(bucket).GetPublicUrl(uniqueName);
            }
            catch (Exception ex) when (ex.Message.Contains("Bucket not found", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    // Attempt to create bucket if it doesn't exist (e.g. treatment-xrays)
                    await _supabase.Storage.CreateBucket(bucket, new Supabase.Storage.BucketUpsertOptions { Public = true });
                    
                    var uniqueName = $"{Guid.NewGuid()}_{fileName}";
                    await _supabase.Storage.From(bucket).Upload(data, uniqueName, new Supabase.Storage.FileOptions { ContentType = contentType });
                    return _supabase.Storage.From(bucket).GetPublicUrl(uniqueName);
                }
                catch (Exception innerEx)
                {
                    throw new Exception($"File upload to {bucket} failed and could not create bucket: {innerEx.Message}");
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"File upload to {bucket} failed: {ex.Message}");
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

        public async Task SaveChatbotConversationAsync(ChatbotConversation conv)
        {
            try
            {
                await _supabase.From<ChatbotConversation>().Insert(conv);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ClinicService] Error saving chatbot conversation: {ex.Message}");
                throw;
            }
        }
    }
}
