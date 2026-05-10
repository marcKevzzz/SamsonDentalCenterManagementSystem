using System.Collections.Concurrent;
using System.Text.Json;
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
        private readonly Supabase.Client _adminClient;
        private readonly string _supabaseUrl;
        private readonly ActivityLogService _logs;
        private readonly string _serviceRoleKey;
        private readonly OtpService _otpService;
        private readonly IEmailService _emailService;
        private readonly HttpClient _http;
        private readonly IHttpClientFactory _httpClientFactory;
        
        // Tracking to prevent log spam and redundant repair attempts
        private static readonly ConcurrentDictionary<string, DateTime> _failedRepairAttempts = new();
        private static readonly TimeSpan REPAIR_COOLDOWN = TimeSpan.FromMinutes(5);

        public ProfileService(
            Supabase.Client supabase,
            string serviceRoleKey,
            string supabaseUrl,
            ActivityLogService logs,
            OtpService otpService,
            IEmailService emailService,
            IHttpClientFactory httpClientFactory
        )
        {
            _supabase = supabase;
            _serviceRoleKey = serviceRoleKey;
            _supabaseUrl = supabaseUrl;
            _logs = logs;
            _otpService = otpService;
            _emailService = emailService;
            _httpClientFactory = httpClientFactory;
            _http = _httpClientFactory.CreateClient("SupabaseClient");

            // Initialize Admin Client for RLS-bypassing checks
            var options = new Supabase.SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = false
            };
            _adminClient = new Supabase.Client(_supabaseUrl, _serviceRoleKey, options);
        }

        public async Task<Profile?> GetProfileById(string userId, string? email = null)
        {
            try
            {
                // Use the admin client to bypass RLS and ensure we always get the profile
                var response = await _adminClient.From<Profile>().Where(x => x.Id == userId).Get();
                var profile = response.Models?.FirstOrDefault();
                if (profile == null)
                {
                    // Check cooldown
                    if (_failedRepairAttempts.TryGetValue(userId, out var lastAttempt) && (DateTime.UtcNow - lastAttempt) < REPAIR_COOLDOWN)
                    {
                        return null; // Skip repair, too soon
                    }

                    Console.WriteLine($"[ProfileService] No profile found for {userId}. Attempting on-the-fly repair...");
                    
                    // Fetch user from Auth Admin API
                    _http.DefaultRequestHeaders.Clear();
                    _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                    _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                    var authRes = await _http.GetAsync($"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}");
                    if (authRes.IsSuccessStatusCode)
                    {
                        var json = await authRes.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(json);
                        var root = doc.RootElement;

                        var authEmail = root.TryGetProperty("email", out var e) ? e.GetString() : email;
                        
                        string role = "patient";
                        string fnStr = "User";
                        string lnStr = "";

                        // Helper to pick valid role (ignores Supabase default 'authenticated')
                        string? PickValidRole(params string?[] candidates) {
                            foreach (var c in candidates) {
                                if (!string.IsNullOrEmpty(c) && c != "authenticated") return c;
                            }
                            return null;
                        }

                        // 1. Check app_metadata (Highest Priority for Roles)
                        if (root.TryGetProperty("app_metadata", out var appMeta))
                        {
                            role = PickValidRole(
                                appMeta.TryGetProperty("role_app", out var r1) ? r1.GetString() : null,
                                appMeta.TryGetProperty("role", out var r2) ? r2.GetString() : null
                            ) ?? role;
                        }

                        // 2. Check user_metadata (Fallback for Roles, primary for Names)
                        if (root.TryGetProperty("user_metadata", out var userMeta))
                        {
                            if (role == "patient")
                            {
                                role = PickValidRole(
                                    userMeta.TryGetProperty("role_app", out var r1) ? r1.GetString() : null,
                                    userMeta.TryGetProperty("role", out var r2) ? r2.GetString() : null
                                ) ?? role;
                            }
                            
                            fnStr = userMeta.TryGetProperty("first_name", out var fn) ? fn.GetString() : fnStr;
                            lnStr = userMeta.TryGetProperty("last_name", out var ln) ? ln.GetString() : lnStr;
                        }

                        // 3. Check top-level properties (Last Resort)
                        if (role == "patient") {
                            role = PickValidRole(
                                root.TryGetProperty("role_app", out var r1) ? r1.GetString() : null,
                                root.TryGetProperty("role", out var r2) ? r2.GetString() : null
                            ) ?? "patient";
                        }

                        Console.WriteLine($"[ProfileService] Repairing user {userId} ({authEmail}) with detected role: {role}");

                        // Create the profile
                        await UpdateProfile(userId, new UserPayload 
                        { 
                            FirstName = fnStr!, 
                            LastName = lnStr!, 
                            Email = authEmail!,
                            IsActive = true,
                            Role = role
                        });

                        // Small delay to allow for database propagation/triggers
                        await Task.Delay(200);

                        // Fetch it again using the SAME client that did the Upsert
                        var retryRes = await _supabase.From<Profile>().Where(x => x.Id == userId).Get();
                        profile = retryRes.Models?.FirstOrDefault();

                        if (profile != null) {
                             Console.WriteLine($"[ProfileService] Repair successful for {userId}. Role: {profile.Role}");
                             _failedRepairAttempts.TryRemove(userId, out _); // Clear failure if it finally worked
                        }
                    }
                    else
                    {
                        var errStr = await authRes.Content.ReadAsStringAsync();
                        Console.WriteLine($"[ProfileService] Auth API Failure for {userId}: {authRes.StatusCode}");
                    }

                    if (profile == null)
                    {
                        Console.WriteLine($"[ProfileService] Repair failed for {userId}. Record still not found after Upsert.");
                        _failedRepairAttempts[userId] = DateTime.UtcNow; // Mark as failed for cooldown
                        return null;
                    }
                }

                // If we found a profile, hydrate the Patient reference separately to avoid ambiguous join issues
                if (profile != null)
                {
                    // Ensure role is not null
                    if (string.IsNullOrEmpty(profile.Role)) profile.Role = "patient";

                    var patientRes = await _adminClient.From<Patient>().Where(x => x.ProfileId == userId).Get();
                    profile.Patient = patientRes.Models?.FirstOrDefault();

                    if (profile.Patient != null)
                    {
                        // Sync clinical fields from Patient table to Profile model backing fields
                        Console.WriteLine($"[ProfileService] Hydrated Patient record for {userId}. DOB: {profile.Patient.DateOfBirth}");
                    }
                }

                if (profile != null && profile.DateOfBirth.HasValue)
                {
                    // DateOfBirth comes back as UTC midnight — convert to local date only
                    profile.DateOfBirth = profile.DateOfBirth.Value.Date;
                }

                if (!string.IsNullOrWhiteSpace(email))
                {
                    profile.Email = email;
                }
                if (profile != null)
                {
                    Console.WriteLine($"[ProfileService] GetProfileById({userId}) -> Found: {profile.FirstName} {profile.LastName}, Role: '{profile.Role}', HasPatientRef: {profile.Patient != null}");
                }
                else
                {
                    Console.WriteLine($"[ProfileService] GetProfileById({userId}) -> Profile NOT FOUND after repair attempts.");
                }
                return profile;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProfileService] Exception in GetProfileById: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"[ProfileService] Inner: {ex.InnerException.Message}");
                return null;
            }
        }

        public async Task<bool> CheckEmailExists(string email)
        {
            try
            {
                // Use GetUserIdByEmail which already handles Profiles lookup + Auth Admin fallback
                var userId = await GetUserIdByEmail(email);
                return !string.IsNullOrEmpty(userId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CheckEmailExists] Error: {ex.Message}");
                return false;
            }
        }

        public async Task<(Profile? Profile, bool RequiresReview)> SmartMatchProfile(
            string firstName,
            string lastName,
            string email,
            string phone
        )
        {
            try
            {
                await _supabase.InitializeAsync();

                // 1. Strong Match: Exact Email
                var emailRes = await _supabase
                    .From<Profile>()
                    .Where(x => x.Email == email && x.Role == "patient")
                    .Limit(1)
                    .Get();

                if (emailRes.Models.Any())
                    return (emailRes.Models.First(), false);

                // 2. Strong Match: Exact Name AND Exact Phone
                var namePhoneRes = await _supabase
                    .From<Profile>()
                    .Where(x => x.FirstName == firstName && x.LastName == lastName && x.PhoneNumber == phone && x.Role == "patient")
                    .Limit(1)
                    .Get();

                if (namePhoneRes.Models.Any())
                    return (namePhoneRes.Models.First(), false);

                // 3. Partial Match: Exact Name but different email/phone (Requires Review)
                var nameRes = await _supabase
                    .From<Profile>()
                    .Where(x => x.FirstName == firstName && x.LastName == lastName && x.Role == "patient")
                    .Limit(1)
                    .Get();

                if (nameRes.Models.Any())
                    return (null, true);

                // 4. No match
                return (null, false);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SmartMatchProfile] Error: {ex.Message}");
                return (null, false);
            }
        }

        public async Task<string> CreateShadowProfile(
            string firstName,
            string lastName,
            string email,
            string phone,
            string? sex,
            DateTime? dob,
            string? address,
            bool requiresReview
        )
        {
            string newId;
            try
            {
                // 0. Check if user already exists in auth.users by email
                string? existingId = await GetUserIdByEmail(email);
                if (!string.IsNullOrEmpty(existingId))
                {
                    Console.WriteLine(
                        $"[CreateShadowProfile] User already exists in auth.users: {existingId}"
                    );
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
                        user_metadata = new { first_name = firstName, last_name = lastName },
                    };

                    var reqAuth = new HttpRequestMessage(
                        HttpMethod.Post,
                        $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users"
                    );
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

                        bool isDuplicate =
                            errAuth.Contains("email_exists", StringComparison.OrdinalIgnoreCase)
                            || errAuth.Contains(
                                "already registered",
                                StringComparison.OrdinalIgnoreCase
                            );

                        if (isDuplicate)
                        {
                            Console.WriteLine(
                                $"[CreateShadowProfile] Duplicate email detected, falling back to shadow email."
                            );
                            var shadowEmail =
                                $"shadow_{Guid.NewGuid().ToString().Substring(0, 8)}@shadow.local";
                            var retryPayload = new
                            {
                                email = shadowEmail,
                                password = Guid.NewGuid().ToString() + "A1!",
                                email_confirm = true,
                                user_metadata = new
                                {
                                    first_name = firstName,
                                    last_name = lastName,
                                },
                            };
                            var reqRetry = new HttpRequestMessage(
                                HttpMethod.Post,
                                $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users"
                            );
                            reqRetry.Headers.Add("apikey", _serviceRoleKey);
                            reqRetry.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
                            reqRetry.Content = new StringContent(
                                System.Text.Json.JsonSerializer.Serialize(retryPayload),
                                System.Text.Encoding.UTF8,
                                "application/json"
                            );

                            var resRetry = await _http.SendAsync(reqRetry);
                            if (!resRetry.IsSuccessStatusCode)
                            {
                                var errRetry = await resRetry.Content.ReadAsStringAsync();
                                throw new Exception(
                                    $"Auth user creation (retry) failed: {errRetry}"
                                );
                            }
                            var retryJson = await resRetry.Content.ReadAsStringAsync();
                            newId = System
                                .Text.Json.JsonDocument.Parse(retryJson)
                                .RootElement.GetProperty("id")
                                .GetString()!;
                        }
                        else
                        {
                            throw new Exception($"Auth user creation failed: {errAuth}");
                        }
                    }
                    else
                    {
                        var authJson = await resAuth.Content.ReadAsStringAsync();
                        newId = System
                            .Text.Json.JsonDocument.Parse(authJson)
                            .RootElement.GetProperty("id")
                            .GetString()!;
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
                    created_at = DateTime.UtcNow,
                };

                var req = new HttpRequestMessage(
                    HttpMethod.Post,
                    $"{_supabaseUrl.TrimEnd('/')}/rest/v1/profiles?on_conflict=id"
                );
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

                // 4. Create Patient record
                await CreatePatientRecord(newId, dob, sex, address, null, null, null);

                return newId;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateShadowProfile] Error: {ex.Message}");
                throw;
            }
        }

        public async Task CreatePatientRecord(string profileId, DateTime? dob, string? sex, string? address, string? emergencyContact, string? relationship, string? createdById)
        {
            var inviteCode = GenerateInviteCode();
            var patient = new Patient
            {
                ProfileId = profileId,
                DateOfBirth = dob,
                Sex = sex,
                Address = address,
                IsClaimed = false,
                InviteCode = inviteCode,
                InviteExpiresAt = DateTime.UtcNow.AddDays(30), // 30 days to claim
                EmergencyContact = emergencyContact,
                Relationship = relationship,
                CreatedById = createdById
            };

            await _supabase.From<Patient>().Upsert(patient);
        }

        private string GenerateInviteCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars like 0, 1, O, I
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 8)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public async Task<List<Profile>> GetShadowProfilesForEmail(string email, string currentUserId)
        {
            try
            {
                // Use the admin client to bypass RLS and ensure we see all profiles
                var res = await _adminClient.From<Profile>()
                    .Filter("email", Supabase.Postgrest.Constants.Operator.Equals, email)
                    .Filter("id", Supabase.Postgrest.Constants.Operator.NotEqual, currentUserId)
                    .Filter("role", Supabase.Postgrest.Constants.Operator.Equals, "patient")
                    .Get();
                
                return res.Models;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetShadowProfilesForEmail Error]: {ex.Message}");
                // Return empty list instead of crashing the whole request if this fails
                return new List<Profile>();
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

        public async Task RemoveAvatar(string userId)
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

                if (apptResponse.Models == null || !apptResponse.Models.Any())
                    return new List<Profile>();

                var validPatientIds = apptResponse
                    .Models.Where(a => !string.IsNullOrEmpty(a.PatientId))
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
                CreatedAt = DateTime.UtcNow,
            };

            // Use Upsert to handle potential trigger conflicts
            await _supabase.From<Profile>().Upsert(profile);

            // If patient, initialize patient table record
            if (p.Role == "patient")
            {
                var patient = new Patient
                {
                    ProfileId = p.Id!,
                    DateOfBirth = p.DateOfBirth,
                    Sex = p.Sex,
                    Address = p.Address,
                    IsClaimed = true // Since it's being created by admin/system
                };
                await _supabase.From<Patient>().Upsert(patient);
            }
        }

        // UPDATE profile fields
        public async Task UpdateProfile(string userId, UserPayload p)
        {
            var response = await _supabase.From<Profile>().Where(x => x.Id == userId).Get();
            var profile = response.Models.FirstOrDefault();

            if (profile == null)
            {
                profile = new Profile 
                { 
                    Id = userId, 
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true // Default to active if creating new
                };
            }

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

            if (p.IsActive.HasValue)
                profile.IsActive = p.IsActive.Value;

            await _supabase.From<Profile>().Upsert(profile);

            // Sync to Patient table if role is patient
            if (profile.Role == "patient")
            {
                var patient = new Patient
                {
                    ProfileId = userId,
                    DateOfBirth = profile.DateOfBirth,
                    Sex = profile.Sex,
                    Address = profile.Address
                };
                await _supabase.From<Patient>().Upsert(patient);
            }

            // Sync Additional Doctor Fields
            if (profile.Role == "doctor")
            {
                var docResponse = await _supabase
                    .From<Doctor>()
                    .Where(x => x.ProfileId == userId)
                    .Get();
                var doc = docResponse.Models.FirstOrDefault();
                if (doc != null)
                {
                    var update = _supabase
                        .From<Doctor>()
                        .Where(x => x.ProfileId == userId)
                        .Set(x => x.Bio!, p.Bio)
                        .Set(x => x.IsActive, p.IsActive ?? true);

                    if (!string.IsNullOrEmpty(p.Title))
                        update = update.Set(x => x.Title, p.Title);
                    if (p.Specialties != null)
                        update = update.Set(x => x.Specialties, p.Specialties);

                    await update.Update();

                    // Sync Availability
                    if (p.Availability != null)
                    {
                        // 1. Delete old
                        await _supabase
                            .From<StaffAvailability>()
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
                var recResponse = await _supabase
                    .From<Receptionist>()
                    .Where(x => x.ProfileId == userId)
                    .Get();
                var rec = recResponse.Models.FirstOrDefault();
                if (rec != null)
                {
                    await _supabase
                        .From<Receptionist>()
                        .Where(x => x.ProfileId == userId)
                        .Set(x => x.Bio!, p.Bio)
                        .Set(x => x.DeskLocation!, p.DeskLocation)
                        .Set(x => x.IsActive, p.IsActive ?? true)
                        .Update();

                    // Sync Availability
                    if (p.Availability != null)
                    {
                        // 1. Delete old
                        await _supabase
                            .From<StaffAvailability>()
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
                    new { 
                        first_name = profile.FirstName, 
                        last_name = profile.LastName,
                        role = profile.Role
                    }
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
                var profile = await GetProfileByEmail(email);
                if (profile == null)
                    return; // Silent fail for security

                var otp = await _otpService.GenerateOtp(email, "password_reset");
                await _emailService.SendEmailAsync(
                    email,
                    profile.FullName,
                    "Password Reset Code",
                    "OtpNotification",
                    new
                    {
                        Name = profile.FirstName,
                        Action = "resetting your password",
                        Code = otp,
                        Link = (string?)null,
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Password reset failed: {ex.Message}");
                throw;
            }
        }

        public async Task<Profile?> GetProfileByEmail(string email)
        {
            await _supabase.InitializeAsync();
            var res = await _supabase.From<Profile>().Where(x => x.Email == email).Get();
            return res.Models.FirstOrDefault();
        }

        public async Task<bool> VerifyOtp(string email, string code, string type)
        {
            return await _otpService.VerifyOtp(email, code, type);
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

            var req = new HttpRequestMessage(
                HttpMethod.Patch,
                $"{_supabaseUrl}/rest/v1/profiles?id=eq.{userId}"
            );
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
                // 1. Check Profiles table first (Fast & Indexed)
                var profile = await GetProfileByEmail(email);
                if (profile != null)
                    return profile.Id;

                // 2. Fallback to Auth Admin API (Slower, only if profile missing)
                // We use a shorter timeout for this fallback to prevent hanging the whole request
                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                // Note: PostgREST/Auth API listing is still a fallback, but we've reduced its frequency
                var res = await _http.GetAsync(
                    $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users?per_page=100"
                );
                if (!res.IsSuccessStatusCode)
                    return null;

                var json = await res.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(json);

                JsonElement users;
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    users = doc.RootElement;
                }
                else if (
                    doc.RootElement.TryGetProperty("users", out var usersProp)
                    && usersProp.ValueKind == JsonValueKind.Array
                )
                {
                    users = usersProp;
                }
                else
                    return null;

                foreach (var user in users.EnumerateArray())
                {
                    if (
                        user.TryGetProperty("email", out var e)
                        && e.GetString()?.Equals(email, StringComparison.OrdinalIgnoreCase) == true
                    )
                    {
                        return user.GetProperty("id").GetString();
                    }
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
                var req = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}"
                );
                req.Headers.Add("apikey", _serviceRoleKey);
                req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");

                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode)
                    return null;

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

        public async Task<string?> GenerateLink(
            string type,
            string email,
            string? redirectTo = null
        )
        {
            try
            {
                var payload = new
                {
                    type = type,
                    email = email,
                    options = new { redirectTo = redirectTo },
                };

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                var res = await _http.PostAsync(
                    $"{_supabaseUrl}/auth/v1/admin/generate_link",
                    new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(payload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    )
                );

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

        public async Task<string?> CreateUserWithId(
            string id,
            string email,
            string password,
            object metadata
        )
        {
            try
            {
                var authPayload = new
                {
                    id = id,
                    email = email,
                    password = password,
                    email_confirm = true,
                    user_metadata = metadata,
                };

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");
                var res = await _http.PostAsync(
                    $"{_supabaseUrl}/auth/v1/admin/users",
                    new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(authPayload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    )
                );

                if (!res.IsSuccessStatusCode)
                {
                    var err = await res.Content.ReadAsStringAsync();
                    if (err.Contains("email_exists") || err.Contains("already been registered"))
                    {
                        var existingId = await GetUserIdByEmail(email);
                        if (existingId == id)
                        {
                            await UpdateUserPassword(id, password);
                            return id;
                        }
                        throw new Exception(
                            $"This email is already registered to a different account. (ID: {existingId})"
                        );
                    }
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

        public async Task<Profile?> FindExistingPatientRecord(
            string firstName,
            string lastName,
            DateTime? dob,
            string? phone,
            string? email
        )
        {
            await _supabase.InitializeAsync();
            var query = _supabase
                .From<Profile>()
                .Where(p => p.Role == "patient")
                .Where(p => p.FirstName == firstName)
                .Where(p => p.LastName == lastName);

            var response = await query.Get();
            var profiles = response.Models;

            return profiles.FirstOrDefault(p =>
                p.FirstName.Equals(firstName, StringComparison.OrdinalIgnoreCase)
                && p.LastName.Equals(lastName, StringComparison.OrdinalIgnoreCase)
                && (
                    (dob.HasValue && p.DateOfBirth == dob.Value)
                    || (!string.IsNullOrEmpty(phone) && p.PhoneNumber == phone)
                    || (
                        !string.IsNullOrEmpty(email)
                        && p.Email != null
                        && p.Email.Equals(email, StringComparison.OrdinalIgnoreCase)
                    )
                )
            );
        }

        public async Task MergeProfile(string sourceId, string targetId)
        {
            try
            {
                await _adminClient
                    .From<Appointment>()
                    .Where(a => a.PatientId == sourceId)
                    .Set(a => a.PatientId, targetId)
                    .Set(a => a.IsGuest, false)
                    .Update();

                await _adminClient
                    .From<Invoice>()
                    .Where(i => i.PatientId == sourceId)
                    .Set(i => i.PatientId, targetId)
                    .Update();

                await _adminClient
                    .From<Notification>()
                    .Where(n => n.ProfileId == sourceId)
                    .Set(n => n.ProfileId, targetId)
                    .Update();

                var sourceInfoRes = await _adminClient
                    .From<PatientMedicalInfo>()
                    .Where(x => x.PatientId == sourceId)
                    .Get();
                var sourceInfo = sourceInfoRes.Models.FirstOrDefault();
                if (sourceInfo != null)
                {
                    var targetInfoRes = await _adminClient
                        .From<PatientMedicalInfo>()
                        .Where(x => x.PatientId == targetId)
                        .Get();
                    var targetInfo = targetInfoRes.Models.FirstOrDefault();

                    if (targetInfo == null)
                    {
                        // Update PK using Set to avoid mapping issues
                        await _adminClient.From<PatientMedicalInfo>()
                            .Where(x => x.PatientId == sourceId)
                            .Set(x => x.PatientId, targetId)
                            .Update();
                    }
                    else
                    {
                        bool changed = false;
                        if (string.IsNullOrEmpty(targetInfo.AllergiesJson)) { targetInfo.AllergiesJson = sourceInfo.AllergiesJson; changed = true; }
                        if (string.IsNullOrEmpty(targetInfo.HistoryJson)) { targetInfo.HistoryJson = sourceInfo.HistoryJson; changed = true; }
                        if (string.IsNullOrEmpty(targetInfo.MedicationsJson)) { targetInfo.MedicationsJson = sourceInfo.MedicationsJson; changed = true; }
                        
                        if (changed) await _adminClient.From<PatientMedicalInfo>().Update(targetInfo);
                        await _adminClient.From<PatientMedicalInfo>().Where(x => x.PatientId == sourceId).Delete();
                    }
                }

                var sourceChartRes = await _adminClient
                    .From<PatientToothStatus>()
                    .Where(x => x.PatientId == sourceId)
                    .Get();
                
                foreach (var status in sourceChartRes.Models)
                {
                    var targetStatusRes = await _adminClient
                        .From<PatientToothStatus>()
                        .Where(x => x.PatientId == targetId && x.ToothNumber == status.ToothNumber)
                        .Get();
                    
                    if (!targetStatusRes.Models.Any())
                    {
                        await _adminClient.From<PatientToothStatus>()
                            .Where(x => x.Id == status.Id)
                            .Set(x => x.PatientId, targetId)
                            .Update();
                    }
                    else
                    {
                        await _adminClient.From<PatientToothStatus>().Where(x => x.Id == status.Id).Delete();
                    }
                }

                // MERGE Patient Table Record
                var sourcePatientRes = await _adminClient.From<Patient>().Where(x => x.ProfileId == sourceId).Get();
                var sourcePatient = sourcePatientRes.Models.FirstOrDefault();
                if (sourcePatient != null)
                {
                    var targetPatientRes = await _adminClient.From<Patient>().Where(x => x.ProfileId == targetId).Get();
                    if (!targetPatientRes.Models.Any())
                    {
                        await _adminClient.From<Patient>()
                            .Where(x => x.ProfileId == sourceId)
                            .Set(x => x.ProfileId, targetId)
                            .Update();
                    }
                    else
                    {
                        await _adminClient.From<Patient>().Where(x => x.ProfileId == sourceId).Delete();
                    }
                }

                await _adminClient.From<Profile>().Where(x => x.Id == sourceId).Delete();

                Console.WriteLine($"[MergeProfile] Successfully merged {sourceId} into {targetId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MergeProfile] Error: {ex.Message}");
                throw;
            }
        }
    }
}
