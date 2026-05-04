using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/invoice")]
[IgnoreAntiforgeryToken]
public class InvoiceController : ControllerBase
{
    private readonly InvoiceService _invoiceService;
    private readonly RecordService _recordService;
    private readonly AppointmentService _appointmentService;
    private readonly ActivityLogService _logs;

    public InvoiceController(
        InvoiceService invoiceService,
        RecordService recordService,
        AppointmentService appointmentService,
        ActivityLogService logs
    )
    {
        _invoiceService = invoiceService;
        _recordService = recordService;
        _appointmentService = appointmentService;
        _logs = logs;
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

        [JsonPropertyName("toothData")]
        public string? ToothData { get; set; }

        [JsonPropertyName("xrayData")]
        public string? XrayData { get; set; }

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

                invoiceItems.Add(
                    new InvoiceItem
                    {
                        Id = Guid.NewGuid().ToString(),
                        ServiceId = item.ServiceId,
                        Description = item.Description,
                        UnitPrice = item.UnitPrice,
                        Quantity = item.Quantity,
                        TotalPrice = lineTotal,
                    }
                );
            }

            var finalAmount = totalAmount - req.DiscountAmount;
            if (finalAmount < 0)
                finalAmount = 0;

            if (string.IsNullOrEmpty(req.AppointmentId))
                return BadRequest(new { ok = false, error = "Appointment selection is required." });
            if (string.IsNullOrEmpty(req.PatientId))
                return BadRequest(
                    new { ok = false, error = "Patient identification is required." }
                );
            if (string.IsNullOrEmpty(req.DoctorId))
                return BadRequest(
                    new
                    {
                        ok = false,
                        error = "A assigned doctor is required to generate an invoice. Please ensure the appointment has a doctor assigned.",
                    }
                );

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
                CreatedAt = DateTime.UtcNow,
            };

            var created = await _invoiceService.CreateInvoiceAsync(invoice, invoiceItems);

            // Save treatments — wrapped separately so invoice is NOT rolled back on treatment failure
            string? treatmentWarning = null;
            if (req.Treatments?.Count > 0)
            {
                var treatments = req
                    .Treatments.Select(t => new Treatment
                    {
                        Id = Guid.NewGuid().ToString(),
                        InvoiceId = created.Id,
                        ServiceId = t.ServiceId,
                        ServiceName = t.ServiceName,
                        ToothNumbers = t.ToothNumbers,
                        ProcedureDetails = t.Procedure,
                        Diagnosis = t.Diagnosis,
                        Status = t.Status,
                        CreatedAt = DateTime.UtcNow,
                    })
                    .ToList();

                try
                {
                    await _invoiceService.CreateTreatmentsAsync(treatments);
                    
                    // Also sync tooth data to patient_tooth_status table if provided
                    if (!string.IsNullOrEmpty(req.PatientId))
                    {
                        var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? "system";
                        foreach (var t in req.Treatments)
                        {
                            if (!string.IsNullOrEmpty(t.ToothNumbers) && !string.IsNullOrEmpty(req.PatientId))
                            {
                                try
                                {
                                    var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(t.ToothNumbers);
                                    if (dict != null)
                                    {
                                        var toothUpdates = new List<PatientToothStatus>();
                                        foreach (var kvp in dict)
                                        {
                                            if (int.TryParse(kvp.Key, out int toothNum))
                                            {
                                                toothUpdates.Add(new PatientToothStatus
                                                {
                                                    PatientId = req.PatientId,
                                                    ToothNumber = toothNum,
                                                    Status = kvp.Value,
                                                    Notes = t.Procedure ?? "Updated from treatment",
                                                });
                                            }
                                        }

                                        if (toothUpdates.Any())
                                        {
                                            await _recordService.UpdateMultipleToothStatusAsync(toothUpdates, adminId);
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"[InvoiceController] Failed to parse/sync tooth data: {ex.Message}");
                                }
                            }
                        }
                    }
                }
                catch (Exception tex)
                {
                    // Invoice is saved. Log treatment failure but don't fail the whole request.
                    Console.WriteLine(
                        $"[InvoiceController] Treatment insert warning: {tex.Message}"
                    );
                    treatmentWarning =
                        "Invoice saved but treatment notes could not be recorded. Please contact support.";
                }
            }

            // 4. Update Appointment status to 'completed'
            await _appointmentService.UpdateStatus(req.AppointmentId, "completed");

            return Ok(
                new
                {
                    ok = true,
                    invoiceId = created.Id,
                    finalAmount,
                    warning = treatmentWarning,
                }
            );
        }
        catch (Exception ex)
        {
            // Parse Supabase PGRST error for friendlier message
            var msg = ex.Message;
            if (msg.Contains("PGRST204"))
                msg =
                    "Database schema error — a required column was not found. Run: NOTIFY pgrst, 'reload schema'; in Supabase SQL Editor.";
            else if (msg.Contains("PGRST"))
                msg = $"Database error: {msg}";

            Console.WriteLine($"[InvoiceController] Create error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = msg });
        }
    }

    // ── POST /api/invoice/pay ─────────────────────────────────────────────
    [HttpPost("pay")]
    public async Task<IActionResult> Pay([FromBody] PaymentRequest req)
    {
        if (string.IsNullOrEmpty(req.InvoiceId))
            return BadRequest(new { ok = false, error = "Invoice ID is required." });
        if (req.Amount <= 0)
            return BadRequest(
                new { ok = false, error = "Payment amount must be greater than zero." }
            );

        try
        {
            // 1. Fetch Invoice to check balance and total
            var invoice = await _invoiceService.GetInvoiceByIdAsync(req.InvoiceId);
            if (invoice == null) return NotFound(new { ok = false, error = "Invoice not found." });

            // 2. Enforce Full Payment for specific methods
            var fullPaymentMethods = new[] { "Cash", "GCash", "Maya", "Bank Transfer" };
            if (fullPaymentMethods.Contains(req.PaymentMethod, StringComparer.OrdinalIgnoreCase) && req.Amount < invoice.FinalAmount)
            {
                return BadRequest(new { ok = false, error = $"{req.PaymentMethod} does not allow partial payments. Please pay the full amount of {invoice.FinalAmount:C}." });
            }

            if (req.Amount > invoice.FinalAmount)
            {
                return BadRequest(new { ok = false, error = $"Payment amount {req.Amount:C} exceeds the final amount {invoice.FinalAmount:C}." });
            }

            var payment = new Payment
            {
                Id = Guid.NewGuid().ToString(),
                InvoiceId = req.InvoiceId,
                Amount = req.Amount,
                PaymentMethod = req.PaymentMethod ?? "Cash",
                ReferenceNumber = req.ReferenceNumber,
                Notes = req.Notes,
                CreatedAt = DateTime.UtcNow,
            };

            await _invoiceService.RecordPaymentAsync(payment);
            return Ok(new { ok = true, message = "Payment recorded successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    public class PaymentRequest
    {
        [JsonPropertyName("invoiceId")]
        public string? InvoiceId { get; set; }

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("paymentMethod")]
        public string? PaymentMethod { get; set; }

        [JsonPropertyName("referenceNumber")]
        public string? ReferenceNumber { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }
}
