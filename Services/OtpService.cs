using SamsonDentalCenterManagementSystem.Models;
using System.Security.Cryptography;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class OtpService
    {
        private readonly Supabase.Client _supabase;

        public OtpService(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        public async Task<string> GenerateOtp(string email, string type, int expiryMinutes = 30)
        {
            email = email.Trim().ToLower();
            // Invalidate old OTPs of same type for this email
            await _supabase.From<Otp>()
                .Where(x => x.Email == email)
                .Where(x => x.Type == type)
                .Where(x => x.IsUsed == false)
                .Set(x => x.IsUsed, true)
                .Update();

            var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            
            var otp = new Otp
            {
                Email = email,
                Code = code,
                Type = type,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
                IsUsed = false
            };

            await _supabase.From<Otp>().Insert(otp);
            Console.WriteLine($"[OtpService] Generated {type} OTP for {email}. Expires at: {otp.ExpiresAt} UTC");
            return code;
        }

        public async Task<bool> VerifyOtp(string email, string code, string type, bool markAsUsed = true)
        {
            email = email.Trim().ToLower();
            Console.WriteLine($"[OtpService] Verifying OTP: {code} for {email} ({type})");

            // First, find ANY record matching email, code, type to see if it exists but is used/expired
            var resAll = await _supabase.From<Otp>()
                .Where(x => x.Email == email)
                .Where(x => x.Code == code)
                .Where(x => x.Type == type)
                .Get();

            if (!resAll.Models.Any())
            {
                Console.WriteLine($"[OtpService] No OTP record found at all for {email} / {code} / {type}");
                return false;
            }

            var otp = resAll.Models.OrderByDescending(x => x.CreatedAt).First();

            if (otp.IsUsed)
            {
                Console.WriteLine($"[OtpService] OTP {code} for {email} was already marked as USED (ID: {otp.Id})");
                return false;
            }

            if (otp.ExpiresAt.ToUniversalTime() < DateTime.UtcNow)
            {
                Console.WriteLine($"[OtpService] OTP {code} for {email} expired. ExpiresAt: {otp.ExpiresAt.ToUniversalTime()} UTC, Now: {DateTime.UtcNow} UTC (ID: {otp.Id})");
                return false;
            }

            if (markAsUsed)
            {
                // Mark as used
                await _supabase.From<Otp>()
                    .Where(x => x.Id == otp.Id)
                    .Set(x => x.IsUsed, true)
                    .Update();
            }

            Console.WriteLine($"[OtpService] OTP verified for {email}");
            return true;
        }

        public async Task MarkOtpAsUsed(string email, string code, string type)
        {
            email = email.Trim().ToLower();
            await _supabase.From<Otp>()
                .Where(x => x.Email == email)
                .Where(x => x.Code == code)
                .Where(x => x.Type == type)
                .Set(x => x.IsUsed, true)
                .Update();
        }
    }
}
