using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using SamsonDentalCenterManagementSystem.Data;
using System.Text;
using Supabase;
using System.Text.Json;
using System.Net;
 using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using System.Security.Cryptography;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;
using Resend;


var builder = WebApplication.CreateBuilder(args);

// ── Supabase client ───────────────────────────────────────────────────────────
var supabaseUrl = builder.Configuration["Supabase:Url"]
    ?? throw new Exception("Supabase:Url is missing from configuration.");
var supabaseKey = builder.Configuration["Supabase:Key"]
    ?? throw new Exception("Supabase:Key is missing from configuration.");
var supabaseProjectRef = new Uri(supabaseUrl).Host.Split('.')[0];

var jwtKid = builder.Configuration["Supabase:JwtKid"];
var resendAPIToken = builder.Configuration["Resend:ApiToken"];
var appBaseUrl = builder.Configuration["App:BaseUrl"];


var ecKey = ECDsa.Create();
ecKey.ImportParameters(new ECParameters
{
    Curve = ECCurve.NamedCurves.nistP256,
    Q = new ECPoint
    {
        X = Base64UrlEncoder.DecodeBytes("pLXuec5sdLlBZbcCGKS1zDO1A5r3ZfwupDBM4u8Q0C8"),
        Y = Base64UrlEncoder.DecodeBytes("VpK_fXGKWg1tnIQHcCa3-eUwECUP2LTPhU8igZf79Bg")
    }
});

var signingKey = new ECDsaSecurityKey(ecKey)
{
    KeyId = jwtKid
};

// ── Anon client — for auth/signin pages ──────────────────────────────────────
var anonClient = new Supabase.Client(supabaseUrl, supabaseKey, new SupabaseOptions
{
    AutoRefreshToken = true
});

await anonClient.InitializeAsync();
builder.Services.AddScoped(_ => anonClient);  // ← this is what SigninModel needs

// ── Service role client — for DB queries, bypasses RLS ───────────────────────
var supabaseServiceKey = builder.Configuration["Supabase:ServiceKey"]
    ?? throw new Exception("Supabase:ServiceKey missing");

var serviceClient = new Supabase.Client(supabaseUrl, supabaseServiceKey, new SupabaseOptions
{
    AutoRefreshToken = false
});
await serviceClient.InitializeAsync();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<SessionHelper>();

builder.Services.AddSingleton<ProfileService>(_ =>
    new ProfileService(serviceClient, supabaseServiceKey, supabaseUrl)
);

builder.Services.AddSingleton<DentalServiceService>(_ =>
    new DentalServiceService(serviceClient)
);

builder.Services.AddOptions();
builder.Services.AddHttpClient<ResendClient>();
builder.Services.Configure<ResendClientOptions>( options =>
{
    options.ApiToken = resendAPIToken ?? throw new Exception("Resend API Token is missing");
} );
builder.Services.AddTransient<IResend, ResendClient>();

// ── Appointment Service Registration ──────────────────────────────────────────
// We use AddSingleton (or AddScoped) and manually pass the config values 
// required by the constructor you defined in Services/AppointmentService.cs
builder.Services.AddScoped<AppointmentService>(provider =>
{
    return new AppointmentService(
        serviceClient, 
        supabaseServiceKey, 
        supabaseUrl, 
        provider.GetRequiredService<IResend>(), 
        appBaseUrl
    );
});

// ── EF Core ───────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
         {
            ValidateIssuer           = true,
            ValidIssuer              = "https://iglnkxzttnkjnvdzccji.supabase.co/auth/v1",
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = signingKey,
            NameClaimType            = "sub",
            RoleClaimType            = "role"
        };

         options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT Auth failed: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["sb-access-token"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddDistributedMemoryCache(); // required
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});


builder.Services.AddAuthorization();
builder.Services.AddRazorPages();
builder.Services.AddControllers();



var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication(); // ← was missing — JWT never ran without this
app.UseSession();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();
app.MapControllers();

// ── DB connection smoke test ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.CanConnectAsync();
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("✅ Database connection successful!");
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"❌ Database connection failed: {ex.Message}");
    }
    finally
    {
        Console.ResetColor();
    }
}

app.Run();