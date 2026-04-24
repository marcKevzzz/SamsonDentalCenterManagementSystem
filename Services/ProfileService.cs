using Supabase;
using SamsonDentalCenterManagementSystem.Models;
using Newtonsoft.Json;
using Microsoft.AspNetCore.Mvc;

public class ProfileService
{
    private readonly Supabase.Client _supabase;
    private readonly string _serviceRoleKey;
    private readonly string _supabaseUrl;

    public ProfileService(Supabase.Client supabase, string serviceRoleKey, string supabaseUrl)
    {
        _supabase = supabase;
        _serviceRoleKey = serviceRoleKey;
        _supabaseUrl = supabaseUrl;
    }

    public async Task<Profile?> GetProfileById(string userId, string? email = null)
    {
        try
        {

            // Service role client needs to be initialized before use
            await _supabase.InitializeAsync();

            var response = await _supabase
                .From<Profile>()
                .Where(x => x.Id == userId)
                .Get();


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
            var response = await _supabase
                .From<Profile>()
                .Where(x => x.Email == email)
                .Get();
            
            return response.Models.Count > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CheckEmailExists] Error: {ex.Message}");
            return false;
        }
    }

    public async Task<string> UploadAvatar(string userId, byte[] bytes, string ext, string contentType)
    {
        var filePath = $"avatars/{userId}{ext}";

        Console.WriteLine($"[ProfileService] Uploading avatar to {filePath}");

        await _supabase.Storage
            .From("avatars")
            .Upload(bytes, filePath, new Supabase.Storage.FileOptions
            {
                Upsert = true,
                ContentType = contentType
            });

        var publicUrl = _supabase.Storage
            .From("avatars")
            .GetPublicUrl(filePath);

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
        var profile = await _supabase
            .From<Profile>()
            .Where(x => x.Id == userId)
            .Single();

        if (!string.IsNullOrEmpty(profile?.AvatarUrl) &&
            Uri.TryCreate(profile.AvatarUrl, UriKind.Absolute, out var uri))
        {
            var filePath = uri.AbsolutePath
                .Replace("/storage/v1/object/public/", "")
                .TrimStart('/');

            Console.WriteLine($"[RemoveAvatar] Deleting: {filePath}");

            await _supabase.Storage
                .From("avatars")
                .Remove(new List<string> { filePath });
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

    // UPDATE profile fields
    public async Task UpdateProfile(string userId, Profile p)
    {
        var profile = await _supabase
            .From<Profile>()
            .Where(x => x.Id == userId)
            .Single();

        if (profile == null) throw new Exception("Profile not found.");

        if (!string.IsNullOrWhiteSpace(p.FirstName)) profile.FirstName = p.FirstName;
        if (!string.IsNullOrWhiteSpace(p.LastName)) profile.LastName = p.LastName;
        if (!string.IsNullOrWhiteSpace(p.PhoneNumber)) profile.PhoneNumber = p.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(p.Address)) profile.Address = p.Address;
        if (!string.IsNullOrWhiteSpace(p.Sex)) profile.Sex = p.Sex;
        if (!string.IsNullOrWhiteSpace(p.Role)) profile.Role = p.Role;
        if (!string.IsNullOrWhiteSpace(p.AvatarUrl)) profile.AvatarUrl = p.AvatarUrl;
        if (!string.IsNullOrWhiteSpace(p.Email)) profile.Email = p.Email;

        if (!string.IsNullOrWhiteSpace(p.DateOfBirth?.ToString()    ))
        {
            profile.DateOfBirth = p.DateOfBirth.Value;
        }

        await _supabase.From<Profile>().Upsert(profile);
    }

    // DELETE profile (also deletes from auth.users via Supabase Admin API)
    public async Task DeleteProfile(string userId)
    {
        // Delete from profiles table first
        await _supabase
            .From<Profile>()
            .Where(x => x.Id == userId)
            .Delete();

    }

    public async Task UpdateUserEmail(string userId, string newEmail)
    {
        Console.WriteLine($"[UpdateUserEmail] supabaseUrl: '{_supabaseUrl}'");
        Console.WriteLine($"[UpdateUserEmail] userId: '{userId}', newEmail: '{newEmail}'");

        if (string.IsNullOrWhiteSpace(_supabaseUrl))
            throw new Exception("Supabase URL is not configured.");

        if (string.IsNullOrWhiteSpace(_serviceRoleKey))
            throw new Exception("Service role key is not configured.");

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
        http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

        var fullUrl = $"{_supabaseUrl.TrimEnd('/')}/auth/v1/admin/users/{userId}";
        Console.WriteLine($"[UpdateUserEmail] Calling: {fullUrl}");

        var payload = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(new { email = newEmail }),
            System.Text.Encoding.UTF8,
            "application/json"
        );

        var res = await http.PutAsync(fullUrl, payload);

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
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
        http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

        var payload = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(new { password = newPassword }),
            System.Text.Encoding.UTF8,
            "application/json"
        );

        var res = await http.PutAsync(
            $"{_supabaseUrl}/auth/v1/admin/users/{userId}",
            payload
        );

        if (!res.IsSuccessStatusCode)
        {
            var error = await res.Content.ReadAsStringAsync();
            throw new Exception($"Failed to update password: {error}");
        }
    }

    public async Task UploadFileToStorage(string bucket, string path, byte[] bytes, string contentType)
{
    await _supabase.Storage
        .From(bucket)
        .Upload(bytes, path, new Supabase.Storage.FileOptions
        {
            Upsert      = true,
            ContentType = contentType
        });
}

public string GetPublicUrl(string bucket, string path)
{
    return _supabase.Storage.From(bucket).GetPublicUrl(path);
}
}