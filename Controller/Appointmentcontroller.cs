// Controllers/AppointmentController.cs
// ─────────────────────────────────────────────────────────
// Manages the multi-step booking flow.
// State flows as a ViewModel through TempData (JSON).
// Each POST advances or retreats a step; each GET renders the view.

using Microsoft.AspNetCore.Mvc;
using SamsonDental.ViewModels;
using System.Text.Json;

namespace SamsonDental.Controllers
{
    public class AppointmentController : Controller
    {
        // ── TempData key ──────────────────────────────────
        private const string STATE_KEY = "AppointmentState";

        // ─────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────

        private AppointmentViewModel GetState()
        {
            var json = TempData.Peek(STATE_KEY) as string;
            if (string.IsNullOrEmpty(json)) return new AppointmentViewModel();
            return JsonSerializer.Deserialize<AppointmentViewModel>(json) ?? new();
        }

        private void SaveState(AppointmentViewModel model)
        {
            TempData[STATE_KEY] = JsonSerializer.Serialize(model);
        }

        // ─────────────────────────────────────────────────
        // GET /Appointment  →  current step
        // ─────────────────────────────────────────────────
        [HttpGet]
        public IActionResult Index()
        {
            var model = GetState();
            SaveState(model); // keep alive
            return View(model);
        }

        // ─────────────────────────────────────────────────
        // STEP 1 — POST: service selected
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SelectService(string serviceSlug)
        {
            if (string.IsNullOrEmpty(serviceSlug))
            {
                ModelState.AddModelError("", "Please select a service.");
                var cur = GetState();
                cur.CurrentStep = 1;
                SaveState(cur);
                return RedirectToAction(nameof(Index));
            }

            var service = ServicesData.FindBySlug(serviceSlug);
            if (service == null) return BadRequest("Unknown service.");

            var model = GetState();
            model.CurrentStep              = 2;
            model.SelectedServiceSlug      = service.Slug;
            model.SelectedServiceName      = service.Name;
            model.SelectedServiceCategory  = service.Category;
            model.SelectedServiceTagline   = service.Tagline;
            model.SelectedServicePrice     = service.Price;
            model.SelectedServiceDuration  = service.Duration;
            model.SelectedServiceRecovery  = service.Recovery;
            model.SelectedServiceSummary   = service.Summary;
            model.SelectedServiceBenefits  = service.Benefits;
            // Reset downstream
            model.SelectedDate = null;
            model.SelectedTime = null;
            model.IsWaitlist   = false;

            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // STEP 2 — POST: date + time selected
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SelectSchedule(string selectedDate, string selectedTime)
        {
            var model = GetState();

            if (string.IsNullOrEmpty(selectedDate))
            {
                TempData["ScheduleError"] = "Please select a date.";
                model.CurrentStep = 2;
                SaveState(model);
                return RedirectToAction(nameof(Index));
            }

            model.SelectedDate = selectedDate;
            model.SelectedTime = selectedTime;

            // Check if fully booked → waitlist
            if (ServicesData.IsFullyBooked(selectedDate))
            {
                model.IsWaitlist   = true;
                model.CurrentStep  = 3; // step 2B maps to step 3 in flow; waitlist flag differentiates
                // Use a sub-step marker
                model.CurrentStep  = 25; // 25 = step "2B" (waitlist)
            }
            else if (string.IsNullOrEmpty(selectedTime))
            {
                TempData["ScheduleError"] = "Please select a time slot.";
                model.CurrentStep = 2;
                SaveState(model);
                return RedirectToAction(nameof(Index));
            }
            else
            {
                model.IsWaitlist  = false;
                model.CurrentStep = 3;
            }

            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // STEP 2B — POST: confirm waitlist → go to details
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ConfirmWaitlist()
        {
            var model = GetState();
            model.CurrentStep = 3;
            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // STEP 3 — POST: patient details submitted
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SubmitDetails(AppointmentViewModel form)
        {
            var model = GetState();

            // Copy form fields into state
            model.FirstName    = form.FirstName;
            model.LastName     = form.LastName;
            model.Email        = form.Email;
            model.Phone        = form.Phone;
            model.PatientType  = form.PatientType ?? "New Patient";
            model.Notes        = form.Notes;
            model.ConsentGiven = form.ConsentGiven;

            // Validate required fields
            if (string.IsNullOrWhiteSpace(model.FirstName) ||
                string.IsNullOrWhiteSpace(model.LastName)  ||
                string.IsNullOrWhiteSpace(model.Email)     ||
                string.IsNullOrWhiteSpace(model.Phone)     ||
                !model.ConsentGiven)
            {
                model.CurrentStep = 3;
                SaveState(model);
                TempData["DetailsError"] = "Please fill in all required fields and accept the privacy policy.";
                return RedirectToAction(nameof(Index));
            }

            model.CurrentStep = 4;
            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // STEP 4 — POST: final confirm → success
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ConfirmBooking()
        {
            var model = GetState();

            // Generate reference number
            model.ReferenceNumber = "SDC-" + Guid.NewGuid().ToString("N")[..6].ToUpper();
            model.CurrentStep     = 5; // 5 = success

            // TODO: persist to DB, send confirmation email/SMS here

            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // BACK navigation
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult GoBack()
        {
            var model = GetState();

            model.CurrentStep = model.CurrentStep switch
            {
                25 => 2,   // waitlist → back to schedule
                2  => 1,
                3  => model.IsWaitlist ? 25 : 2,
                4  => 3,
                _  => 1,
            };

            SaveState(model);
            return RedirectToAction(nameof(Index));
        }

        // ─────────────────────────────────────────────────
        // CANCEL — clear state
        // ─────────────────────────────────────────────────
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Cancel()
        {
            TempData.Remove(STATE_KEY);
            return Redirect("/");
        }
    }
}