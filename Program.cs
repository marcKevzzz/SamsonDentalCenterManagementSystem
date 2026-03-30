using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using SamsonDentalCenterManagementSystem.Data;
using System.Text;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

// ── Supabase client ───────────────────────────────────────────────────────────
var supabaseUrl = builder.Configuration["Supabase:Url"]
    ?? throw new Exception("Supabase:Url is missing from configuration.");
var supabaseKey = builder.Configuration["Supabase:Key"]
    ?? throw new Exception("Supabase:Key is missing from configuration.");
var jwtSecret  = builder.Configuration["Supabase:JwtSecret"]
    ?? throw new Exception("Supabase:JwtSecret is missing from configuration.");

builder.Services.AddScoped(_ => new Supabase.Client(supabaseUrl, supabaseKey, new SupabaseOptions {
    AutoRefreshToken = true
}));

// ── EF Core ───────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT Authentication ────────────────────────────────────────────────────────
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = $"{supabaseUrl}/auth/v1",
            ValidateAudience         = false,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
        };
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
app.UseRouting();

app.UseAuthentication(); // ← was missing — JWT never ran without this
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