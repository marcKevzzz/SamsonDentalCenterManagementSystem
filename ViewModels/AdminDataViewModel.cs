using System.Text.Json.Serialization;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.ViewModels;

public class AdminDataViewModel
{
    [JsonPropertyName("appointments")]
    public List<Appointment> Appointments { get; set; } = new();

    [JsonPropertyName("doctors")]
    public List<Doctor> Doctors { get; set; } = new();

    [JsonPropertyName("receptionists")]
    public List<Receptionist> Receptionists { get; set; } = new();

    [JsonPropertyName("services")]
    public List<DentalService> Services { get; set; } = new();

    [JsonPropertyName("patients")]
    public List<Profile> Patients { get; set; } = new();

    [JsonPropertyName("invoices")]
    public List<Invoice> Invoices { get; set; } = new();

    [JsonPropertyName("inquiries")]
    public List<Inquiry> Inquiries { get; set; } = new();

    [JsonPropertyName("users")]
    public List<Profile> Users { get; set; } = new();

    [JsonPropertyName("stats")]
    public AdminStats Stats { get; set; } = new();

    [JsonPropertyName("settings")]
    public ClinicSettings? Settings { get; set; }
}

public class AdminStats
{
    [JsonPropertyName("totalPatients")]
    public int TotalPatients { get; set; }

    [JsonPropertyName("activeDoctors")]
    public int ActiveDoctors { get; set; }

    [JsonPropertyName("todayAppointments")]
    public int TodayAppointments { get; set; }

    [JsonPropertyName("monthlyRevenue")]
    public decimal MonthlyRevenue { get; set; }
}
