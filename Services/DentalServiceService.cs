using System.Text.Json;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services;

public class DentalServiceService
{
    private readonly Supabase.Client _supabase;
    private readonly ActivityLogService _logs;

    public DentalServiceService(Supabase.Client supabase, ActivityLogService logs)
    {
        _supabase = supabase;
        _logs = logs;
    }

    public async Task<List<DentalService>> GetAll(bool activeOnly = false)
    {
        try
        {
            var query = _supabase.From<DentalService>();

            var response = await query
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Ascending)
                .Get();

            var services = response.Models ?? new List<DentalService>();
            return activeOnly ? services.Where(s => s.IsActive).ToList() : services;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DentalServiceService.GetAll] Error: {ex.Message}");
            return new List<DentalService>();
        }
    }

    public async Task<DentalService?> GetBySlug(string slug)
    {
        try
        {
            var response = await _supabase.From<DentalService>().Where(x => x.Slug == slug).Get();

            return response.Models.FirstOrDefault();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DentalServiceService.GetBySlug] Error: {ex.Message}");
            return null;
        }
    }

    public async Task<DentalService> Create(ServicePayload p)
    {
        var service = MapPayload(
            p,
            new DentalService { Id = Guid.NewGuid().ToString(), CreatedAt = DateTime.UtcNow }
        );

        var response = await _supabase.From<DentalService>().Insert(service);
        var created = response.Models.First();

        await _logs.LogActionAsync(
            null,
            "created dental service",
            $"Name: {created.Name}",
            null,
            "Service",
            $"/Admin/Services?id={created.Id}"
        );

        return created;
    }

    public async Task Update(string id, ServicePayload p)
    {
        var response = await _supabase.From<DentalService>().Where(x => x.Id == id).Get();

        var service = response.Models.FirstOrDefault() ?? throw new Exception("Service not found.");

        service = MapPayload(p, service);
        await _supabase.From<DentalService>().Upsert(service);

        await _logs.LogActionAsync(
            null,
            "updated dental service",
            $"Name: {service.Name}",
            null,
            "Service",
            $"/Admin/Services?id={id}"
        );
    }

    public async Task Delete(string id)
    {
        await _supabase.From<DentalService>().Where(x => x.Id == id).Delete();

        await _logs.LogActionAsync(
            null,
            "deleted dental service",
            $"ID: {id}",
            null,
            "Service",
            "/Admin/Services"
        );
    }

    private static DentalService MapPayload(ServicePayload p, DentalService s)
    {
        if (!string.IsNullOrWhiteSpace(p.Slug))
            s.Slug = p.Slug;
        if (!string.IsNullOrWhiteSpace(p.Category))
            s.Category = p.Category;
        if (!string.IsNullOrWhiteSpace(p.Name))
            s.Name = p.Name;
        if (!string.IsNullOrWhiteSpace(p.Tagline))
            s.Tagline = p.Tagline;
        if (!string.IsNullOrWhiteSpace(p.Hero))
            s.Hero = p.Hero;
        if (!string.IsNullOrWhiteSpace(p.Price))
        {
            var cleanPrice = p.Price.Replace("₱", "").Replace(",", "").Trim();
            s.Price = decimal.TryParse(cleanPrice, out var pr) ? pr : 0;
        }
        if (p.Icon != null)
            s.Icon = p.Icon;
        if (p.Summary != null)
            s.Summary = p.Summary;
        if (p.Duration != null)
            s.Duration = p.Duration;
        if (p.Recovery != null)
            s.Recovery = p.Recovery;
        if (p.IsActive.HasValue)
            s.IsActive = p.IsActive.Value;

        // Serialize to JSON string for storage
        s.BenefitsRaw = JsonSerializer.Serialize(p.Benefits ?? new());
        s.StepsRaw = JsonSerializer.Serialize(p.Steps ?? new());
        s.FaqsRaw = JsonSerializer.Serialize(p.Faqs ?? new());

        return s;
    }
}

// ── DTO ───────────────────────────────────────────────────────────────────────
public class ServicePayload
{
    public string? Slug { get; set; }
    public string? Category { get; set; }
    public string? Name { get; set; }
    public string? Tagline { get; set; }
    public string? Hero { get; set; }
    public string? Icon { get; set; }
    public string? Summary { get; set; }
    public string? Duration { get; set; }
    public string? Recovery { get; set; }
    public string? Price { get; set; }
    public bool? IsActive { get; set; }

    public List<string> Benefits { get; set; } = new();
    public List<string> Steps { get; set; } = new();
    public List<ServiceFaqDto> Faqs { get; set; } = new();
}

public class ServiceFaqDto
{
    public string? Question { get; set; }
    public string? Answer { get; set; }
}
