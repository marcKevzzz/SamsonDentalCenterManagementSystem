using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using SamsonDentalCenterManagementSystem.Models;
using Supabase;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class ProfileService
    {
        private readonly Supabase.Client _supabase;
        private readonly string _supabaseUrl;
        private readonly ActivityLogService _logs;
        private readonly string _serviceRoleKey;
        private static readonly HttpClient _http = new HttpClient();

        public ProfileService(
            Supabase.Client supabase,
            string serviceRoleKey,
            string supabaseUrl,
            ActivityLogService logs
        )
        {
            _supabase = supabase;
            _serviceRoleKey = serviceRoleKey;
            _supabaseUrl = supabaseUrl;
            _logs = logs;
        }

        public async Task<Profile?> GetProfileById(string userId, string? email = null)
        {
            try
            {
                // Service role client needs to be initialized before use
                await _supabase.InitializeAsync();

                var response = await _supabase.From<Profile>().Where(x => x.Id == userId).Get();

                var profile = response.Models.FirstOrDefault();
                if (profile == null)
                {
                    Console.WriteLine("[ProfileService] No profile found.");
                    return null;
                }

                if (profile.DateOfBirth.HasValue)
                {
                    // DateOfBirth comes back as UTC midnight — convert to local date only
                    profile.DateOfBirth = profile.DateOfBirth.Value.Date;
                }

                profile.Email = email ?? "";
                return profile;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProfileService] Exception: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> CheckEmailExists(string email)
        {
            try
            {
                await _supabase.InitializeAsync();
                var response = await _supabase.From<Profile>().Where(x => x.Email == email).Get();

                return response.Models.Count > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CheckEmailExists] Error: {ex.Message}");
                return false;
            }
        }

        public async Task<(Profile? Profile, bool RequiresReview)> SmartMatchProfile(string firstName, string lastName, string email, string phone)
        {
            try
            {
                await _supabase.InitializeAsync();
                
                // Fetch all profiles that could potentially match
                var response = await _supabase.From<Profile>()
                    .Where(x => x.Role == "patient")
                    .Get();

                var profiles = response.Models;

                // 1. Strong Match: Exact Email
                var emailMatch = profiles.FirstOrDefault(p => !string.IsNullOrEmpty(p.Email) && p.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
                if (emailMatch != null) return (emailMatch, false);

                // 2. Strong Match: Exact Name AND Exact Phone
                var namePhoneMatch = profiles.FirstOrDefault(p => 
                    p.FirstName.Equals(firstName, StringComparison.OrdinalIgnoreCase) &&
                    p.LastName.Equals(lastName, StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrEmpty(p.PhoneNumber) && p.PhoneNumber == phone);
                if (namePhoneMatch != null) return (namePhoneMatch, false);

                // 3. Partial Match: Exact Name but different email/phone
                var nameMatch = profiles.FirstOrDefault(p => 
                    p.FirstName.Equals(firstName, StringComparison.OrdinalIgnoreCase) &&
                    p.LastName.Equals(lastName, StringComparison.OrdinalIgnoreCase));
                if (nameMatch != null) return (null, true);

                // 4. No match
                return (null, false);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SmartMatchProfile] Error: {ex.Message}");
                return (null, false);
            }
        }

        public async Task<string> CreateShadowProfile(string firstName, string lastName, string email, string phone, string? sex, DateTime? dob, bool requiresReview)
        {
            try
            {
                var newId = Guid.NewGuid().ToString();
                var p = new Profile
                {
                    Id = newId,
                    FirstName = firstName,
                    LastName = lastName,
                    Email = email,
                    PhoneNumber = phone,
                    Sex = sex,
                    DateOfBirth = dob,
                    Role = "patient",
                    IsActive = true,
                    RequiresMergeReview = requiresReview,
                    CreatedAt = DateTime.UtcNow
                };

                await _supabase.From<Profile>().Insert(p);
                return newId;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateShadowProfile] Error: {ex.Message}");
                throw;
            }
        }

        public async Task<List<Profile>> GetShadowProfilesForEmail(string email, string currentUserId)
        {
            await _supabase.InitializeAsync();
            var response = await _supabase.From<Profile>()
                .Where(p => p.Email == email && p.Id != currentUserId && p.Role == "patient")
                .Get();
            return response.Models ?? new List<Profile>();
        }

        public async Task MergeProfile(string sourceId, string targetId)
        {
            await _supabase.InitializeAsync();

            try
            {
                // Bulk update Appointments
                await _supabase.From<Appointment>()
                    .Where(a => a.PatientId == sourceId)
                    .Set(a => a.PatientId, targetId)
                    .Update();

                // Bulk update Invoices
                await _supabase.From<Invoice>()
                    .Where(i => i.PatientId == sourceId)
                    .Set(i => i.PatientId, targetId)
                    .Update();

                // Bulk update Inquiries
                await _supabase.From<Inquiry>()
                    .Where(i => i.PatientId == sourceId)
                    .Set(i => i.PatientId, targetId)
                    .Update();

                // Bulk update Activity Logs
                await _supabase.From<ActivityLog>()
                    .Where(a => a.ProfileId == sourceId)
                    .Set(a => a.ProfileId, targetId)
                    .Update();

                // Bulk update Notifications
                await _supabase.From<Notification>()
                    .Where(n => n.ProfileId == sourceId)
                    .Set(n => n.ProfileId, targetId)
                    .Update();

                // Finally, delete the shadow profile
                await _supabase.From<Profile>()
                    .Where(p => p.Id == sourceId)
                    .Delete();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MergeProfile] Error merging {sourceId} into {targetId}: {ex.Message}");
                throw;
            }
        }

        public async Task<string> UploadAvatar(
            string userId,
            byte[] bytes,
            string ext,
            string contentType
        )
        {
            var filePath = $"avatars/{userId}{ext}";

            Console.WriteLine($"[ProfileService] Uploading avatar to {filePath}");

            await _supabase
                .Storage.From("avatars")
                .Upload(
                    bytes,
                    filePath,
                    new Supabase.Storage.FileOptions { Upsert = true, ContentType = contentType }
                );

            var publicUrl = _supabase.Storage.From("avatars").GetPublicUrl(filePath);

            Console.WriteLine($"[ProfileService] Public URL: {publicUrl}");

            await _supabase
                .From<Profile>()
                .Where(x => x.Id == userId)
                .Set(x => x.AvatarUrl!, publicUrl)
                .Update();

            return publicUrl;
        }

        public async void RemoveAvatar(string userId)
        {
            var profile = await _supabase.From<Profile>().Where(x => x.Id == userId).Single();

            if (
                !string.IsNullOrEmpty(profile?.AvatarUrl)
                && Uri.TryCreate(profile.AvatarUrl, UriKind.Absolute, out var uri)
            )
            {
                var filePath = uri
                    .AbsolutePath.Replace("/storage/v1/object/public/", "")
                    .TrimStart('/');

                Console.WriteLine($"[RemoveAvatar] Deleting: {filePath}");

                await _supabase.Storage.From("avatars").Remove(new List<string> { filePath });
            }

            await _supabase
                .From<Profile>()
                .Where(x => x.Id == userId)
                .Set(x => x.AvatarUrl!, null)
                .Update();
        }

        public async Task<List<Profile>> GetAllProfiles()
        {
            try
            {
                var response = await _supabase
                    .From<Profile>()
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                return response.Models ?? new List<Profile>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProfileService.GetAllProfiles] Error: {ex.Message}");
                return new List<Profile>();
            }
        }

        public async Task<List<Profile>> GetAllProfilesExceptSelf(string currentUserId)
        {
            try
            {
                var response = await _supabase
                    .From<Profile>()
                    .Where(x => x.Id != currentUserId) // ← exclude self
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                return response.Models ?? new List<Profile>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProfileService.GetAllProfiles] Error: {ex.Message}");
                return new List<Profile>();
            }
        }

        public async Task<List<Profile>> GetMyPatients(string doctorId)
        {
            try
            {
                // To find my patients, we need to find all patients who have an appointment with this doctor
                var apptResponse = await _supabase
                    .From<Appointment>()
                    .Select("patient_id, is_guest, patient_name")
                    .Where(a => a.DoctorId == doctorId)
                    .Get();

                if (apptResponse.Models == null || !apptResponse.Models.Any()) return new List<Profile>();

                var validPatientIds = apptResponse.Models
                    .Where(a => !string.IsNullOrEmpty(a.PatientId))
                    .Select(a => a.PatientId!)
                    .Distinct()
                    .ToList();

                var profiles = new List<Profile>();

                if (validPatientIds.Any())
                {
                    // Fetch those profiles
                    var profResponse = await _supabase
                        .From<Profile>()
                        .Filter("id", Supabase.Postgrest.Constants.Operator.In, validPatientIds)
                        .Get();
                    
                    if (profResponse.Models != null)
                    {
                        profiles.AddRange(profResponse.Models);
                    }
                }

                // Add guests as dummy profiles
                var guests = apptResponse.Models
                    .Where(a => a.IsGuest || string.IsNullOrEmpty(a.PatientId))
                    .GroupBy(a => a.PatientName)
                    .Select(g => new Profile
                    {
                        Id = "guest_" + Guid.NewGuid().ToString().Substring(0, 8),
                        FirstName = g.Key ?? "Guest",
                        LastName = "",
                        Role = "patient",
                        IsActive = true
                    });
                
                profiles.AddRange(guests);

                return profiles;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProfileService.GetMyPatients] Error: {ex.Message}");
                return new List<Profile>();
            }
        }

        public async Task CreateProfile(UserPayload p)
        {
            var profile = new Profile
            {
                Id = p.Id!,
                FirstName = p.FirstName,
                LastName = p.LastName,
                Email = p.Email,
                DateOfBirth = p.DateOfBirth,
                Sex = p.Sex,
                PhoneNumber = p.PhoneNumber,
                Address = p.Address,
                Role = p.Role,
                AvatarUrl = p.AvatarUrl,
                CreatedAt = DateTime.UtcNow
            };
            await _supabase.From<Profile>().Insert(profile);
        }

        // UPDATE profile fields
        public async Task UpdateProfile(string userId, UserPayload p)
        {
            var profile = await _supabase.From<Profile>().Where(x => x.Id == userId).Single();

            if (profile == null)
                throw new Exception("Profile not found.");

            if (!string.IsNullOrWhiteSpace(p.FirstName))
                profile.FirstName = p.FirstName;
            if (!string.IsNullOrWhiteSpace(p.LastName))
                profile.LastName = p.LastName;
            if (!string.IsNullOrWhiteSpace(p.PhoneNumber))
                profile.PhoneNumber = p.PhoneNumber;
            if (!string.IsNullOrWhiteSpace(p.Address))
                profile.Address = p.Address;
            if (!string.IsNullOrWhiteSpace(p.Sex))
                profile.Sex = p.Sex;
            if (!string.IsNullOrWhiteSpace(p.Role))
                profile.Role = p.Role;
            if (!string.IsNullOrWhiteSpace(p.AvatarUrl))
                profile.AvatarUrl = p.AvatarUrl;
            if (!string.IsNullOrWhiteSpace(p.Email))
                profile.Email = p.Email;

            if (p.DateOfBirth.HasValue)
            {
                profile.DateOfBirth = p.DateOfBirth.Value;
            }

            await _supabase.From<Profile>().Upsert(profile);
            
            // Sync Bio if staff
            if (profile.Role == "doctor")
            {
                await _supabase.From<Doctor>()
                    .Where(x => x.ProfileId == userId)
                    .Set(x => x.Bio!, p.Bio)
                    .Update();
            }
            else if (profile.Role == "receptionist")
            {
                await _supabase.From<Receptionist>()
                    .Where(x => x.ProfileId == userId)
                    .Set(x => x.Bio!, p.Bio)
                    .Update();
            }

            // Sync to auth.users metadata
            try
            {
                await UpdateUserMetadata(
                    userId,
                    new { first_name = profile.FirstName, last_name = profile.LastName }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Metadata Sync Warning]: {ex.Message}");
            }
        }

        // DELETE profile (also deletes from auth.users via Supabase Admin API)
        public async Task DeleteProfile(string userId)
        {
            // Delete from profiles table first
            await _supabase.From<Profile>().Where(x => x.Id == userId).Delete();
        }

        public async Task UpdateUserEmail(string userId, string newEmail)
        {
            Console.WriteLine($"[UpdateUserEmail] supabaseUrl: '{_supabaseUrl}'");
            Console.WriteLine($"[UpdateUserEmail] userId: '{userId}', newEmail: '{newEmail}'");

            if (string.IsNullOrWhiteSpace(_supabaseUrl))
                throw new Exception("Supabase URL is not configured.");

            if (string.IsNullOrWhiteSpace(_serviceRoleKey))
                throw new Exception("Service role key is not configured.");

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

            var fullUrl = $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}";
            Console.WriteLine($"[UpdateUserEmail] Calling: {fullUrl}");

            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { email = newEmail }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.PutAsync(fullUrl, payload);

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                Console.WriteLine($"[UpdateUserEmail] Failed: {error}");
                throw new Exception($"Failed to update email: {error}");
            }

            Console.WriteLine($"[UpdateUserEmail] Success for {userId}");
        }

        public async Task UpdateUserPassword(string userId, string newPassword)
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { password = newPassword }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.PutAsync($"{_supabaseUrl}/auth/v1/admin/users/{userId}", payload);

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                throw new Exception($"Failed to update password: {error}");
            }
        }

        public async Task UploadFileToStorage(
            string bucket,
            string path,
            byte[] bytes,
            string contentType
        )
        {
            await _supabase
                .Storage.From(bucket)
                .Upload(
                    bytes,
                    path,
                    new Supabase.Storage.FileOptions { Upsert = true, ContentType = contentType }
                );
        }

        public async Task ResetPasswordForEmail(string email, string? baseUrl = null)
        {
            try
            {
                var options = new ResetPasswordForEmailOptions(email)
                {
                    // Use 'RedirectTo' property
                    RedirectTo = $"{baseUrl}/reset-password",
                };

                await _supabase.Auth.ResetPasswordForEmail(options);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Password reset failed: {ex.Message}");
                throw;
            }
        }

        public async Task DeactivateAccount(string userId)
        {
            await _supabase
                .From<Profile>()
                .Where(x => x.Id == userId)
                .Set(x => x.IsActive, false)
                .Update();

            await _logs.LogActionAsync(
                userId,
                "deactivated account",
                null,
                null,
                "User",
                $"/Admin/Patients?id={userId}"
            );
        }

        public async Task ToggleUserActive(string userId, bool isActive)
        {
            // Ensure IsActive and ReactivationRequested are marked with [Column] in Profile.cs
            await _supabase
                .From<Profile>()
                .Where(x => x.Id == userId)
                .Set(x => x.IsActive, isActive)
                .Set(x => x.ReactivationRequested, false)
                .Update();

            await _logs.LogActionAsync(
                userId,
                isActive ? "reactivated account" : "deactivated account",
                null,
                null,
                "User",
                $"/Admin/Patients?id={userId}"
            );

            Console.WriteLine($"[Service] Profile {userId} set to Active: {isActive}");
        }

        public async Task UpdateUserMetadata(string userId, object metadata)
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { user_metadata = metadata }),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.PutAsync(
                $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}",
                payload
            );

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                Console.WriteLine($"[UpdateUserMetadata] Failed: {error}");
            }
        }

        public string GetPublicUrl(string bucket, string path)
        {
            return _supabase.Storage.From(bucket).GetPublicUrl(path);
        }

        public async Task UpdateProfilePartial(string userId, Dictionary<string, object> payload)
        {
            await _supabase.InitializeAsync();
            
            var req = new HttpRequestMessage(HttpMethod.Patch, $"{_supabaseUrl}/rest/v1/profiles?id=eq.{userId}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
        }
    }
}
