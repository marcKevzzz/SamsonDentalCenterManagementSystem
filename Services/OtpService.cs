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

        public async Task<bool> VerifyOtp(string email, string code, string type)
        {
            var now = DateTime.UtcNow;
            var res = await _supabase.From<Otp>()
                .Where(x => x.Email == email)
                .Where(x => x.Code == code)
                .Where(x => x.Type == type)
                .Where(x => x.IsUsed == false)
                .Get();

            var otp = res.Models.FirstOrDefault();
            
            if (otp == null)
            {
                Console.WriteLine($"[OtpService] No valid OTP found for {email} / {type}");
                return false;
            }

            if (otp.ExpiresAt.ToUniversalTime() < now)
            {
                Console.WriteLine($"[OtpService] OTP expired for {email}. ExpiresAt: {otp.ExpiresAt.ToUniversalTime()} UTC, Now: {now} UTC");
                return false;
            }

            // Mark as used
            await _supabase.From<Otp>()
                .Where(x => x.Id == otp.Id)
                .Set(x => x.IsUsed, true)
                .Update();

            Console.WriteLine($"[OtpService] OTP verified for {email}");
            return true;
        }
    }
}
