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
            string newId;
            try
            {
                // 0. Check if user already exists in auth.users by email
                string? existingId = await GetUserIdByEmail(email);
                if (!string.IsNullOrEmpty(existingId))
                {
                    Console.WriteLine($"[CreateShadowProfile] User already exists in auth.users: {existingId}");
                    newId = existingId;
                }
                else
                {
                    // 1. Create the shadow user in auth.users via GoTrue Admin API
                    var authPayload = new
                    {
                        email = email,
                        password = Guid.NewGuid().ToString() + "A1!",
                        email_confirm = true,
                        user_metadata = new { first_name = firstName, last_name = lastName }
                    };

                    var reqAuth = new HttpRequestMessage(HttpMethod.Post, $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users");
                    reqAuth.Headers.Add("apikey", _serviceRoleKey);
                    reqAuth.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                    reqAuth.Content = new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(authPayload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );

                    var resAuth = await _http.SendAsync(reqAuth);

                    if (!resAuth.IsSuccessStatusCode)
                    {
                        var errAuth = await resAuth.Content.ReadAsStringAsync();
                        Console.WriteLine($"[CreateShadowProfile] Auth creation failed: {errAuth}");
                        
                        bool isDuplicate = errAuth.Contains("email_exists", StringComparison.OrdinalIgnoreCase) || 
                                          errAuth.Contains("already registered", StringComparison.OrdinalIgnoreCase);

                        if (isDuplicate)
                        {
                            Console.WriteLine($"[CreateShadowProfile] Duplicate email detected, falling back to shadow email.");
                            var shadowEmail = $"shadow_{Guid.NewGuid().ToString().Substring(0, 8)}@shadow.local";
                            var retryPayload = new
                            {
                                email = shadowEmail,
                                password = Guid.NewGuid().ToString() + "A1!",
                                email_confirm = true,
                                user_metadata = new { first_name = firstName, last_name = lastName }
                            };
                            var reqRetry = new HttpRequestMessage(HttpMethod.Post, $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users");
                            reqRetry.Headers.Add("apikey", _serviceRoleKey);
                            reqRetry.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                            reqRetry.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(retryPayload), System.Text.Encoding.UTF8, "application/json");
                            
                            var resRetry = await _http.SendAsync(reqRetry);
                            if (!resRetry.IsSuccessStatusCode)
                            {
                                var errRetry = await resRetry.Content.ReadAsStringAsync();
                                throw new Exception($"Auth user creation (retry) failed: {errRetry}");
                            }
                            var retryJson = await resRetry.Content.ReadAsStringAsync();
                            newId = System.Text.Json.JsonDocument.Parse(retryJson).RootElement.GetProperty("id").GetString()!;
                        }
                        else
                        {
                            throw new Exception($"Auth user creation failed: {errAuth}");
                        }
                    }
                    else
                    {
                        var authJson = await resAuth.Content.ReadAsStringAsync();
                        newId = System.Text.Json.JsonDocument.Parse(authJson).RootElement.GetProperty("id").GetString()!;
                    }
                }

                // 2. Delay briefly to ensure the committed auth.users row is visible 
                // to PostgREST's connection pool across potential read replica/schema cache bounds.
                await Task.Delay(500);

                // 3. Bypass ORM — Use UPSERT to avoid conflicts with triggers
                var payload = new
                {
                    id = newId,
                    first_name = firstName,
                    last_name = lastName,
                    email,
                    phone_number = phone,
                    sex,
                    date_of_birth = dob.HasValue ? dob.Value.ToString("yyyy-MM-dd") : null,
                    role = "patient",
                    is_active = false, // Guest/Shadow profiles start inactive until claimed
                    requires_merge_review = requiresReview,
                    created_at = DateTime.UtcNow
                };

                var req = new HttpRequestMessage(HttpMethod.Post, $"{_supabaseUrl.TrimEnd('/')}/rest/v1/profiles?on_conflict=id");
                req.Headers.Add("apikey", _serviceRoleKey);
                req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                req.Headers.Add("Prefer", "resolution=merge-duplicates");
                req.Content = new System.Net.Http.StringContent(
                    System.Text.Json.JsonSerializer.Serialize(payload),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode)
                {
                    var err = await res.Content.ReadAsStringAsync();
                    throw new Exception($"Profile insert failed: {err}");
                }

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
                    .Select("patient_id, is_guest, patient_first_name, patient_last_name")
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
                IsActive = false, // Start inactive until invitation is accepted
                CreatedAt = DateTime.UtcNow
            };
            
            // Use Upsert to handle potential trigger conflicts
            await _supabase.From<Profile>().Upsert(profile);
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
            
            // Sync Additional Doctor Fields
            if (profile.Role == "doctor")
            {
                var docResponse = await _supabase.From<Doctor>().Where(x => x.ProfileId == userId).Get();
                var doc = docResponse.Models.FirstOrDefault();
                if (doc != null)
                {
                    var update = _supabase.From<Doctor>()
                        .Where(x => x.ProfileId == userId)
                        .Set(x => x.Bio!, p.Bio)
                        .Set(x => x.IsActive, p.IsActive ?? true);
                    
                    if (!string.IsNullOrEmpty(p.Title)) update = update.Set(x => x.Title, p.Title);
                    if (p.Specialties != null) update = update.Set(x => x.Specialties, p.Specialties);
                    
                    await update.Update();

                    // Sync Availability
                    if (p.Availability != null)
                    {
                        // 1. Delete old
                        await _supabase.From<StaffAvailability>()
                            .Where(x => x.StaffId == doc.Id && x.StaffType == "doctor")
                            .Delete();

                        // 2. Insert new
                        if (p.Availability.Any())
                        {
                            foreach (var av in p.Availability)
                            {
                                av.Id = Guid.NewGuid().ToString();
                                av.StaffId = doc.Id;
                                av.StaffType = "doctor";
                                av.IsActive = true;
                            }
                            await _supabase.From<StaffAvailability>().Insert(p.Availability);
                        }
                    }
                }
            }
            else if (profile.Role == "receptionist")
            {
                var recResponse = await _supabase.From<Receptionist>().Where(x => x.ProfileId == userId).Get();
                var rec = recResponse.Models.FirstOrDefault();
                if (rec != null)
                {
                    await _supabase.From<Receptionist>()
                        .Where(x => x.ProfileId == userId)
                        .Set(x => x.Bio!, p.Bio)
                        .Set(x => x.DeskLocation!, p.DeskLocation)
                        .Set(x => x.IsActive, p.IsActive ?? true)
                        .Update();

                    // Sync Availability
                    if (p.Availability != null)
                    {
                        // 1. Delete old
                        await _supabase.From<StaffAvailability>()
                            .Where(x => x.StaffId == rec.Id && x.StaffType == "receptionist")
                            .Delete();

                        // 2. Insert new
                        if (p.Availability.Any())
                        {
                            foreach (var av in p.Availability)
                            {
                                av.Id = Guid.NewGuid().ToString();
                                av.StaffId = rec.Id;
                                av.StaffType = "receptionist";
                                av.IsActive = true;
                            }
                            await _supabase.From<StaffAvailability>().Insert(p.Availability);
                        }
                    }
                }
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
        public async Task<string?> GetUserIdByEmail(string email)
        {
            try
            {
                int page = 1;
                while (page <= 5) // Limit to 5 pages (250 users) for performance
                {
                    var req = new HttpRequestMessage(HttpMethod.Get, $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users?page={page}&per_page=50");
                    req.Headers.Add("apikey", _serviceRoleKey);
                    req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                    
                    var res = await _http.SendAsync(req);
                    if (!res.IsSuccessStatusCode) break;

                    var json = await res.Content.ReadAsStringAsync();
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    
                    System.Text.Json.JsonElement users;
                    if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        users = doc.RootElement;
                    }
                    else if (doc.RootElement.TryGetProperty("users", out var usersProp) && usersProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        users = usersProp;
                    }
                    else
                    {
                        Console.WriteLine($"[GetUserIdByEmail] Unexpected response format: {json.Substring(0, Math.Min(100, json.Length))}");
                        break;
                    }
                    
                    bool foundAny = false;
                    foreach (var user in users.EnumerateArray())
                    {
                        foundAny = true;
                        if (user.GetProperty("email").GetString()?.Equals(email, StringComparison.OrdinalIgnoreCase) == true)
                        {
                            return user.GetProperty("id").GetString();
                        }
                    }
                    
                    if (!foundAny) break;
                    page++;
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetUserIdByEmail] Error: {ex.Message}");
                return null;
            }
        }
        public async Task<string?> GetAuthUserEmail(string userId)
        {
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Get, $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}");
                req.Headers.Add("apikey", _serviceRoleKey);
                req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                
                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode) return null;

                var json = await res.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                
                return doc.RootElement.GetProperty("email").GetString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetAuthUserEmail] Error: {ex.Message}");
                return null;
            }
        }
        public async Task<string?> GenerateLink(string type, string email, string? redirectTo = null)
        {
            try
            {
                var payload = new
                {
                    type = type,
                    email = email,
                    options = new { redirectTo = redirectTo }
                };

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                var res = await _http.PostAsync($"{_supabaseUrl}/auth/v1/admin/generate_link",
                    new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json"));

                if (!res.IsSuccessStatusCode)
                {
                    var err = await res.Content.ReadAsStringAsync();
                    Console.WriteLine($"[GenerateLink] Failed: {err}");
                    return null;
                }

                var json = await res.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("action_link").GetString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GenerateLink] Error: {ex.Message}");
                return null;
            }
        }

        public async Task<string?> CreateUserWithId(string id, string email, string password, object metadata)
        {
            try
            {
                var authPayload = new
                {
                    id = id,
                    email = email,
                    password = password,
                    email_confirm = true,
                    user_metadata = metadata
                };

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                var res = await _http.PostAsync($"{_supabaseUrl}/auth/v1/admin/users",
                    new StringContent(System.Text.Json.JsonSerializer.Serialize(authPayload), System.Text.Encoding.UTF8, "application/json"));

                if (!res.IsSuccessStatusCode)
                {
                    var err = await res.Content.ReadAsStringAsync();
                    Console.WriteLine($"[CreateUserWithId] Failed: {err}");
                    throw new Exception($"Auth creation failed: {err}");
                }

                var resStr = await res.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(resStr);
                return doc.RootElement.GetProperty("id").GetString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateUserWithId] Error: {ex.Message}");
                throw;
            }
        }

        public async Task<Profile?> FindExistingPatientRecord(string firstName, string lastName, DateTime? dob, string? phone)
        {
            await _supabase.InitializeAsync();
            var response = await _supabase.From<Profile>()
                .Where(p => p.Role == "patient")
                .Get();

            var profiles = response.Models;

            // Match by Name + DOB OR Name + Phone
            return profiles.FirstOrDefault(p => 
                p.FirstName.Equals(firstName, StringComparison.OrdinalIgnoreCase) && 
                p.LastName.Equals(lastName, StringComparison.OrdinalIgnoreCase) && 
                ((dob.HasValue && p.DateOfBirth == dob.Value) || (!string.IsNullOrEmpty(phone) && p.PhoneNumber == phone))
            );
        }
        public async Task MergeProfile(string sourceId, string targetId)
        {
            try
            {
                await _supabase.InitializeAsync();

                // 1. Update Appointments
                await _supabase.From<Appointment>()
                    .Where(a => a.PatientId == sourceId)
                    .Set(a => a.PatientId, targetId)
                    .Set(a => a.IsGuest, false)
                    .Update();

                // 2. Invoices (Treatments are linked to Invoices, which link to PatientId)
                await _supabase.From<Invoice>()
                    .Where(i => i.PatientId == sourceId)
                    .Set(i => i.PatientId, targetId)
                    .Update();

                // 3. Update Notifications
                await _supabase.From<Notification>()
                    .Where(n => n.ProfileId == sourceId)
                    .Set(n => n.ProfileId, targetId)
                    .Update();

                // 4. Transfer Medical Info
                var sourceInfoRes = await _supabase.From<PatientMedicalInfo>().Where(x => x.PatientId == sourceId).Get();
                var sourceInfo = sourceInfoRes.Models.FirstOrDefault();
                if (sourceInfo != null)
                {
                    var targetInfoRes = await _supabase.From<PatientMedicalInfo>().Where(x => x.PatientId == targetId).Get();
                    if (targetInfoRes.Models.Count == 0)
                    {
                        sourceInfo.PatientId = targetId;
                        await _supabase.From<PatientMedicalInfo>().Insert(sourceInfo);
                    }
                }

                // 5. Transfer Tooth Status
                var sourceToothRes = await _supabase.From<PatientToothStatus>().Where(x => x.PatientId == sourceId).Get();
                if (sourceToothRes.Models.Any())
                {
                    var targetToothRes = await _supabase.From<PatientToothStatus>().Where(x => x.PatientId == targetId).Get();
                    if (!targetToothRes.Models.Any())
                    {
                        foreach (var t in sourceToothRes.Models)
                        {
                            t.Id = Guid.NewGuid().ToString();
                            t.PatientId = targetId;
                        }
                        await _supabase.From<PatientToothStatus>().Insert(sourceToothRes.Models);
                    }
                }

                // 6. Delete old profile
                await _supabase.From<Profile>().Where(x => x.Id == sourceId).Delete();

                await _logs.LogActionAsync(targetId, "merged profile", $"Merged data from {sourceId} to {targetId}", targetId, "User", "/Admin/Patients");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MergeProfile] Error: {ex.Message}");
                throw;
            }
        }
    }
}
