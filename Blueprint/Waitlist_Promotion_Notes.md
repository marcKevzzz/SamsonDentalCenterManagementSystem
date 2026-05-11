# Waitlist Promotion & Booking FAQ / Implementation Notes

This document captures the logic and design decisions made regarding the Automated Waitlist Promotion system and the "Booking for Others" workflow.

## 1. Waitlist Promotion Workflow

### How does a patient know a slot opened?
The system uses a multi-channel approach:
- **Email Notification**: When a slot becomes available (e.g., via cancellation), the system promotes the first person in the waitlist. They receive an email with a unique "Confirm Slot" link.
- **Patient Dashboard**: If logged in, the patient will see an orange alert on their dashboard and a "Confirm My Slot" button in their appointment details.

### How is the slot secured?
- **Soft-Lock**: The system "locks" the slot for the patient for a limited window (4 hours for standard, 30 mins for same-day).
- **Confirmation**: The patient must click "Confirm" (via email or dashboard) before the lock expires. If they don't, the system automatically recycles the slot and moves to the next person in the waitlist.

---

## 2. Booking for Someone Else

### Should I collect the patient's email?
**Yes, ideally.** 
- **Reason**: Our "Claim Records" feature relies on email matching. If you book for a friend using *your* email, those records stay linked to *your* account. If they eventually create their own account with *their* email, they won't be able to find those records easily.
- **Recommendation**: Add an optional "Patient Email" field to the "Someone Else" form.

### What if the patient is a child with no email?
- **Handling**: Leave the email blank or use the booker's (parent's) email.
- **Record Keeping**: The clinical history is still tied to the child's Name and Birthday. 
- **Future Growth**: When the child grows up and gets an email, the clinic can update their profile, allowing them to "claim" their childhood history into a new independent account.

---

## 3. Pending UI Improvements (Next Steps)
- [ ] Add optional `Patient Email` field to `step3-details.js` under the "Someone Else" section.
- [ ] Update `Appointment` model and `Create` logic to handle the separate patient email if provided.
- [ ] Ensure `SendWaitlistPromotionEmail` and `SendBookingConfirmationEmail` use the patient's email if available, otherwise fallback to the booker's email.
