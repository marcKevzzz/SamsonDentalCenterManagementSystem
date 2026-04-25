using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/invoice")]
[IgnoreAntiforgeryToken]
public class InvoiceController : ControllerBase
{
    private readonly InvoiceService _invoiceService;

    public InvoiceController(InvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    // ── DTO ────────────────────────────────────────────────────────────────
    public class CreateInvoiceRequest
    {
        [JsonPropertyName("appointmentId")]
        public string? AppointmentId { get; set; }

        [JsonPropertyName("patientId")]
        public string? PatientId { get; set; }

        [JsonPropertyName("doctorId")]
        public string? DoctorId { get; set; }

        [JsonPropertyName("discountAmount")]
        public decimal DiscountAmount { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("items")]
        public List<InvoiceItemDto> Items { get; set; } = new();

        [JsonPropertyName("treatments")]
        public List<TreatmentDto> Treatments { get; set; } = new();
    }

    public class InvoiceItemDto
    {
        [JsonPropertyName("serviceId")]
        public string? ServiceId { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("unitPrice")]
        public decimal UnitPrice { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; } = 1;
    }

    public class TreatmentDto
    {
        [JsonPropertyName("serviceId")]
        public string? ServiceId { get; set; }

        [JsonPropertyName("serviceName")]
        public string ServiceName { get; set; } = string.Empty;

        [JsonPropertyName("toothNumbers")]
        public string? ToothNumbers { get; set; }

        [JsonPropertyName("procedure")]
        public string? Procedure { get; set; }

        [JsonPropertyName("diagnosis")]
        public string? Diagnosis { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "completed";
    }

    // ── POST /api/invoice/create ───────────────────────────────────────────
    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
            return BadRequest(new { ok = false, error = "At least one service item is required." });

        try
        {
            // Calculate totals
            decimal totalAmount = 0;
            var invoiceItems = new List<InvoiceItem>();

            foreach (var item in req.Items)
            {
                var lineTotal = item.UnitPrice * item.Quantity;
                totalAmount += lineTotal;

                invoiceItems.Add(new InvoiceItem
                {
                    Id = Guid.NewGuid().ToString(),
                    ServiceId = item.ServiceId,
                    Description = item.Description,
                    UnitPrice = item.UnitPrice,
                    Quantity = item.Quantity,
                    TotalPrice = lineTotal
                });
            }

            var finalAmount = totalAmount - req.DiscountAmount;
            if (finalAmount < 0) finalAmount = 0;

            var invoice = new Invoice
            {
                Id = Guid.NewGuid().ToString(),
                AppointmentId = req.AppointmentId,
                PatientId = req.PatientId,
                DoctorId = req.DoctorId,
                TotalAmount = totalAmount,
                DiscountAmount = req.DiscountAmount,
                FinalAmount = finalAmount,
                Status = "pending",
                Notes = req.Notes,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _invoiceService.CreateInvoiceAsync(invoice, invoiceItems);

            // Save treatments
            if (req.Treatments?.Count > 0)
            {
                var treatments = req.Treatments.Select(t => new Treatment
                {
                    Id = Guid.NewGuid().ToString(),
                    InvoiceId = created.Id,
                    ServiceId = t.ServiceId,
                    ServiceName = t.ServiceName,
                    ToothNumbers = t.ToothNumbers,
                    ProcedureDetails = t.Procedure,
                    Diagnosis = t.Diagnosis,
                    Status = t.Status,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                await _invoiceService.CreateTreatmentsAsync(treatments);
            }

            return Ok(new
            {
                ok = true,
                invoiceId = created.Id,
                finalAmount
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[InvoiceController] Create error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}
