// using Microsoft.AspNetCore.Mvc;
// using SamsonDentalCenterManagementSystem.Data;
// using SamsonDentalCenterManagementSystem.Models;

// [ApiController]
// [Route("api/[controller]")]
// public class AuthController : ControllerBase
// {
//     private readonly AppDbContext _context;

//     public AuthController(AppDbContext context)
//     {
//         _context = context;
//     }

//     [HttpPost("sign-up")]
//     public async Task<IActionResult> Register([FromBody] RegisterDto dto)
//     {
//         var patient = new Patient
//         {
//             Name = dto.FirstName + " " + dto.LastName
//         };

//         _context.Patients.Add(patient);
//         await _context.SaveChangesAsync();

//         return Ok(new { message = "User registered" });
//     }
// }