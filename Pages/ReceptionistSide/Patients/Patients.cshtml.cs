using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.Patients;

public class PatientsModel : AdminPageModel
{
    public PatientsModel(ProfileService profileService) : base(profileService)
    {
    }

    public void OnGet()
    {
    }
}
