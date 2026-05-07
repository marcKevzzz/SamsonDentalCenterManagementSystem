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

        public async Task<string> GenerateOtp(string email, string type, int expiryMinutes = 15)
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
            return code;
        }

        public async Task<bool> VerifyOtp(string email, string code, string type)
        {
            var res = await _supabase.From<Otp>()
                .Where(x => x.Email == email)
                .Where(x => x.Code == code)
                .Where(x => x.Type == type)
                .Where(x => x.IsUsed == false)
                .Get();

            var otp = res.Models.FirstOrDefault();
            
            if (otp == null || otp.ExpiresAt < DateTime.UtcNow)
                return false;

            // Mark as used
            await _supabase.From<Otp>()
                .Where(x => x.Id == otp.Id)
                .Set(x => x.IsUsed, true)
                .Update();

            return true;
        }
    }
}
