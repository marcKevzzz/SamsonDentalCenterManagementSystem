using Supabase;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace SamsonDentalCenterManagementSystem.Helpers
{
    public class SessionHelper
    {
        private readonly Supabase.Client _supabase;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SessionHelper(Supabase.Client supabase, IHttpContextAccessor httpContextAccessor)
        {
            _supabase = supabase;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<string?> GetValidTokenAsync()
        {
            var context = _httpContextAccessor.HttpContext;
            if (context == null) return null;

            var accessToken = context.Request.Cookies["sb-access-token"];
            var refreshToken = context.Request.Cookies["sb-refresh-token"];

            if (string.IsNullOrEmpty(accessToken)) return null;

            try
            {
                // Sync the local Supabase client with the cookies
                await _supabase.Auth.SetSession(accessToken, refreshToken);

                var session = _supabase.Auth.CurrentSession;
                
                // FIX: Check ExpiresAt instead of IsExpired()
                // session.ExpiresAt is a long (unix timestamp) or DateTime depending on version
                if (session == null || session.CreatedAt.AddSeconds(session.ExpiresIn) < DateTime.UtcNow)
                {
                    if (string.IsNullOrEmpty(refreshToken)) return null;

                    // FIX: Most versions of the client handle the refresh internally once SetSession is called
                    // Or require calling RefreshSession() without parameters if the client is already synced
                    var refreshedSession = await _supabase.Auth.RefreshSession();
                    
                    if (refreshedSession != null)
                    {
                        var opt = new CookieOptions { 
                            HttpOnly = true, 
                            Secure = true, 
                            Path = "/", 
                            Expires = DateTime.UtcNow.AddDays(30),
                            SameSite = SameSiteMode.Lax 
                        };

                        context.Response.Cookies.Append("sb-access-token", refreshedSession.AccessToken, opt);
                        context.Response.Cookies.Append("sb-refresh-token", refreshedSession.RefreshToken, opt);
                        
                        return refreshedSession.AccessToken;
                    }
                    return null;
                }

                return accessToken;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SessionHelper Error]: {ex.Message}");
                return null;
            }
        }
    }
}