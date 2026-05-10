using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class BlockedDateService
    {
        private readonly Supabase.Client _supabase;

        public BlockedDateService(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        public async Task<List<BlockedDate>> GetAllAsync()
        {
            var res = await _supabase
                .From<BlockedDate>()
                .Order(x => x.Date, Supabase.Postgrest.Constants.Ordering.Ascending)
                .Get();
            return res.Models;
        }

        public async Task<bool> IsDateBlockedAsync(DateTime date)
        {
            var dateStr = date.Date.ToString("yyyy-MM-dd");
            var res = await _supabase
                .From<BlockedDate>()
                .Filter("blocked_date", Supabase.Postgrest.Constants.Operator.Equals, dateStr)
                .Get();
            return res.Models.Count > 0;
        }

        public async Task<BlockedDate> BlockDateAsync(DateTime date, string? reason, string? blockedBy)
        {
            var entry = new BlockedDate
            {
                Id = Guid.NewGuid().ToString(),
                Date = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc),
                Reason = reason,
                BlockedBy = blockedBy,
                CreatedAt = DateTime.UtcNow,
            };
            var res = await _supabase.From<BlockedDate>().Insert(entry);
            return res.Models.First();
        }

        public async Task UnblockDateAsync(string id)
        {
            await _supabase.From<BlockedDate>().Where(x => x.Id == id).Delete();
        }

        // Returns blocked date strings (yyyy-MM-dd) for the client calendar
        public async Task<List<string>> GetBlockedDateStringsAsync()
        {
            var all = await GetAllAsync();
            return all.Select(b => b.Date.ToString("yyyy-MM-dd")).ToList();
        }
    }
}
