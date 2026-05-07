using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using SamsonDentalCenterManagementSystem.Data;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Services;
using Supabase;
using Microsoft.Extensions.Caching.Distributed;
using FluentEmail.Core;
using System.Net.Mail;

var builder = WebApplication.CreateBuilder(args);

// ── FluentEmail Registration ──────────────────────────────────────────────────
var emailSettings = builder.Configuration.GetSection("EmailSettings");
builder.Services
    .AddFluentEmail(emailSettings["DefaultFromEmail"], emailSettings["DefaultFromName"])
    .AddRazorRenderer()
    .AddSmtpSender(() => new SmtpClient(emailSettings["Smtp:Host"])
    {
        Port = int.Parse(emailSettings["Smtp:Port"] ?? "587"),
        Credentials = new System.Net.NetworkCredential(emailSettings["Smtp:User"], emailSettings["Smtp:Pass"]),
        EnableSsl = bool.Parse(emailSettings["Smtp:EnableSsl"] ?? "true")
    });

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHostedService<AppointmentReminderService>();

// ── Supabase client ───────────────────────────────────────────────────────────
var supabaseUrl =
    builder.Configuration["Supabase:Url"]
    ?? throw new Exception("Supabase:Url is missing from configuration.");
var supabaseKey =
    builder.Configuration["Supabase:Key"]
    ?? throw new Exception("Supabase:Key is missing from configuration.");
var supabaseProjectRef = new Uri(supabaseUrl).Host.Split('.')[0];

var jwtKid = builder.Configuration["Supabase:JwtKid"];
var appBaseUrl = builder.Configuration["App:BaseUrl"];
var outscraperKey = builder.Configuration["Outscraper:ApiKey"];

var ecKey = ECDsa.Create();
ecKey.ImportParameters(
    new ECParameters
    {
        Curve = ECCurve.NamedCurves.nistP256,
        Q = new ECPoint
        {
            X = Base64UrlEncoder.DecodeBytes("pLXuec5sdLlBZbcCGKS1zDO1A5r3ZfwupDBM4u8Q0C8"),
            Y = Base64UrlEncoder.DecodeBytes("VpK_fXGKWg1tnIQHcCa3-eUwECUP2LTPhU8igZf79Bg"),
        },
    }
);

var signingKey = new ECDsaSecurityKey(ecKey) { KeyId = jwtKid };

// ── Anon client — for auth/Authentication/Signin pages ──────────────────────────────────────
var anonClient = new Supabase.Client(
    supabaseUrl,
    supabaseKey,
    new SupabaseOptions { AutoRefreshToken = true }
);

await anonClient.InitializeAsync();
builder.Services.AddScoped(_ => anonClient); // ← this is what SigninModel needs

// ── Service role client — for DB queries, bypasses RLS ───────────────────────
var supabaseServiceKey =
    builder.Configuration["Supabase:ServiceKey"]
    ?? throw new Exception("Supabase:ServiceKey missing");

var serviceClient = new Supabase.Client(
    supabaseUrl,
    supabaseServiceKey,
    new SupabaseOptions { AutoRefreshToken = false }
);
await serviceClient.InitializeAsync();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<SessionHelper>();

// ── RBAC: Claims Transformer — injects app_role from profiles table ──────────
builder.Services.AddScoped<
    IClaimsTransformation,
    SamsonDentalCenterManagementSystem.Helpers.RoleClaimsTransformer
>();


builder.Services.AddSingleton<ProfileService>(provider => new ProfileService(
    serviceClient,
    supabaseServiceKey,
    supabaseUrl,
    provider.GetRequiredService<ActivityLogService>()
));

builder.Services.AddSingleton<DentalServiceService>(provider => new DentalServiceService(
    serviceClient,
    provider.GetRequiredService<ActivityLogService>()
));

// ── Setup IHttpClientFactory to prevent socket exhaustion ─────────────────────
builder.Services.AddHttpClient("SupabaseClient");

// ── Appointment Service Registration ──────────────────────────────────────────
// We use AddSingleton (or AddScoped) and manually pass the config values
// required by the constructor you defined in Services/AppointmentService.cs
builder.Services.AddScoped<AppointmentService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new AppointmentService(
        serviceClient,
        supabaseServiceKey,
        supabaseUrl,
        provider.GetRequiredService<IEmailService>(),
        appBaseUrl ?? "http://localhost:5081",
        httpFactory.CreateClient("SupabaseClient"),
        provider.GetRequiredService<ActivityLogService>(),
        provider.GetRequiredService<NotificationService>(),
        provider.GetRequiredService<IHubContext<AdminHub>>(),
        provider.GetRequiredService<ClinicService>(),
        provider.GetRequiredService<BlockedDateService>(),
        provider.GetRequiredService<ProfileService>(),
        provider.GetRequiredService<RecordService>(),
        provider.GetRequiredService<IDistributedCache>()
    );
});

builder.Services.AddSingleton<DoctorService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new DoctorService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey
    );
});

builder.Services.AddSingleton<ReceptionistService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new ReceptionistService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey
    );
});

builder.Services.AddScoped<StaffLeaveService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new StaffLeaveService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        provider.GetRequiredService<ActivityLogService>()
    );
});

builder.Services.AddScoped<InvoiceService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new InvoiceService(
        serviceClient,
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        provider.GetRequiredService<ActivityLogService>(),
        provider.GetRequiredService<NotificationService>(),
        provider.GetRequiredService<IHubContext<AdminHub>>(),
        provider.GetRequiredService<IEmailService>(),
        appBaseUrl ?? "http://localhost:5081"
    );
});

builder.Services.AddScoped<InquiryService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new InquiryService(
        serviceClient,
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        provider.GetRequiredService<ActivityLogService>(),
        provider.GetRequiredService<NotificationService>(),
        provider.GetRequiredService<IHubContext<AdminHub>>(),
        provider.GetRequiredService<IEmailService>(),
        appBaseUrl ?? "http://localhost:5081"
    );
});

var apifyKey = builder.Configuration["Apify:Token"];

// ... (other registrations)

builder.Services.AddScoped<ReviewService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    return new ReviewService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        apifyKey,
        provider.GetRequiredService<ActivityLogService>()
    );
});

builder.Services.AddScoped<ClinicService>(provider =>
{
    return new ClinicService(serviceClient, provider.GetRequiredService<ActivityLogService>());
});

builder.Services.AddScoped<BlockedDateService>(_ => new BlockedDateService(serviceClient));
builder.Services.AddScoped<RecordService>(provider => new RecordService(
    serviceClient,
    provider.GetRequiredService<ActivityLogService>(),
    provider.GetRequiredService<IHubContext<AdminHub>>()
));

builder.Services.AddSingleton<ActivityLogService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    var hubContext = provider.GetRequiredService<IHubContext<AdminHub>>();
    return new ActivityLogService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        hubContext,
        provider.GetRequiredService<IHttpContextAccessor>()
    );
});

builder.Services.AddSingleton<NotificationService>(provider =>
{
    var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
    var hubContext = provider.GetRequiredService<IHubContext<AdminHub>>();
    return new NotificationService(
        httpFactory.CreateClient("SupabaseClient"),
        supabaseUrl,
        supabaseServiceKey,
        hubContext
    );
});

// ── EF Core ───────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://iglnkxzttnkjnvdzccji.supabase.co/auth/v1",
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            NameClaimType = "sub",
            RoleClaimType = "role",
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
            },
            OnChallenge = async context =>
            {
                // Suppress default 401 behavior — we handle it ourselves
                context.HandleResponse();

                var req = context.Request;
                var res = context.Response;

                bool isExpired = context.AuthenticateFailure is SecurityTokenExpiredException;
                bool isXhr =
                    req.Headers["X-Requested-With"] == "XMLHttpRequest"
                    || (
                        req.Headers["Accept"].ToString().Contains("application/json")
                        && !req.Headers["Accept"].ToString().Contains("text/html")
                    );

                if (isXhr)
                {
                    // API call: return JSON so JS can intercept and redirect
                    res.StatusCode = 401;
                    res.ContentType = "application/json";
                    await res.WriteAsync(
                        System.Text.Json.JsonSerializer.Serialize(
                            new
                            {
                                ok = false,
                                expired = true,
                                error = isExpired
                                    ? "Session expired. Please sign in again."
                                    : "Unauthorized.",
                            }
                        )
                    );
                }
                else
                {
                    // Page navigation: expire auth cookie and redirect
                    res.Cookies.Delete("sb-access-token");
                    res.Cookies.Delete("sb-refresh-token");
                    var returnUrl = Uri.EscapeDataString(req.Path + req.QueryString);
                    res.Redirect($"/Sign-in?expired=1&returnUrl={returnUrl}");
                }
            },
        };
    });

builder.Services.AddDistributedMemoryCache(); // required
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
    options.AddPolicy("DoctorOrAdmin", p => p.RequireRole("doctor", "admin"));
    options.AddPolicy("ReceptionistOrAdmin", p => p.RequireRole("receptionist", "admin"));
    options.AddPolicy("StaffOnly", p => p.RequireRole("admin", "doctor", "receptionist"));
});
builder.Services.AddSignalR();
builder.Services.AddRazorPages();
builder
    .Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Remove IgnoreReadOnlyProperties to allow serialization of anonymous types in API responses
        options.JsonSerializerOptions.ReferenceHandler = System
            .Text
            .Json
            .Serialization
            .ReferenceHandler
            .IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowVanilla",
        policy =>
        {
            policy
                .WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "https://gnomic-larraine-unbombastic.ngrok-free.dev")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // SignalR MUST have this
        }
    );
});

var app = builder.Build();

app.UseCors("AllowVanilla");

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

app.MapHub<AdminHub>("/adminHub");
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
