using Microsoft.Extensions.Caching.Memory;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class ReviewService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly string _apifyKey;
        private readonly ActivityLogService _logs;
        private readonly IMemoryCache _cache;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        private const string CacheKeyVisible = "visible_reviews";
        private const string CacheKeyStats = "review_stats";

        public ReviewService(
            HttpClient http,
            string supabaseUrl,
            string serviceRoleKey,
            string apifyKey,
            ActivityLogService logs,
            IMemoryCache cache
        )
        {
            _http = http;
            _supabaseUrl = supabaseUrl?.TrimEnd('/') ?? "";
            _serviceRoleKey = serviceRoleKey;
            _apifyKey = apifyKey;
            _logs = logs;
            _cache = cache;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        public async Task<List<Review>> GetAllReviewsAsync()
        {
            var req = BuildRequest(HttpMethod.Get, "/reviews?order=created_at.desc");
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadAsStringAsync();
            var reviews = JsonSerializer.Deserialize<List<Review>>(json, _json) ?? new();

            return reviews;
        }

        public async Task<List<Review>> GetVisibleReviewsAsync()
        {
            if (_cache.TryGetValue(CacheKeyVisible, out List<Review>? cachedReviews) && cachedReviews != null)
            {
                return cachedReviews;
            }

            var req = BuildRequest(
                HttpMethod.Get,
                "/reviews?is_visible=eq.true&order=created_at.desc"
            );
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadAsStringAsync();
            var reviews = JsonSerializer.Deserialize<List<Review>>(json, _json) ?? new();

            _cache.Set(CacheKeyVisible, reviews, TimeSpan.FromMinutes(10));
            return reviews;
        }

        public async Task ToggleVisibilityAsync(string id, bool visible)
        {
            var req = BuildRequest(HttpMethod.Patch, $"/reviews?id=eq.{id}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(new { is_visible = visible }),
                Encoding.UTF8,
                "application/json"
            );
            await _http.SendAsync(req);

            InvalidateCache();

            await _logs.LogActionAsync(
                null,
                visible ? "made review visible" : "hid review",
                $"Review ID: {id}",
                null,
                "Review",
                "/Admin/Reviews"
            );
        }

        public async Task AddReviewAsync(Review review)
        {
            var req = BuildRequest(HttpMethod.Post, "/reviews");
            req.Content = new StringContent(
                JsonSerializer.Serialize(
                    new
                    {
                        author_name = review.AuthorName,
                        author_avatar = review.AuthorAvatar,
                        rating = review.Rating,
                        review_text = review.ReviewText,
                        platform = review.Platform,
                        is_visible = review.IsVisible,
                    }
                ),
                Encoding.UTF8,
                "application/json"
            );
            await _http.SendAsync(req);
            InvalidateCache();

            await _logs.LogActionAsync(
                null,
                "added review manually",
                $"Author: {review.AuthorName}",
                null,
                "Review",
                "/Admin/Reviews"
            );
        }

        public async Task AddReviewsBulkAsync(List<Review> reviews)
        {
            if (reviews == null || !reviews.Any())
                return;
            var req = BuildRequest(HttpMethod.Post, "/reviews");

            // Enable Upsert logic
            req.Headers.Add("Prefer", "resolution=merge-duplicates");

            var body = reviews.Select(r => new
            {
                author_name = r.AuthorName,
                author_avatar = r.AuthorAvatar,
                rating = r.Rating,
                review_text = r.ReviewText,
                platform = r.Platform,
                platform_review_id = r.PlatformReviewId,
                external_link = r.ExternalLink,
                review_date = r.ReviewDate,
                is_visible = r.IsVisible,
            });
            req.Content = new StringContent(
                JsonSerializer.Serialize(body),
                Encoding.UTF8,
                "application/json"
            );
            await _http.SendAsync(req);
            InvalidateCache();
        }

        public async Task SyncApifyReviewsAsync(string query, string location)
        {
            var list = new List<Review>();

            // Using Task.WhenAll or separate awaits with try-catches to prevent one failure from stopping both
            try
            {
                list.AddRange(await FetchGoogleReviewsAsync(query, location));
            }
            catch
            { /* Log Error */
            }
            try
            {
                list.AddRange(await FetchFacebookReviewsAsync());
            }
            catch
            { /* Log Error */
            }

            if (list.Any())
            {
                await AddReviewsBulkAsync(list);
                await _logs.LogActionAsync(
                    null,
                    "synced external reviews",
                    $"Count: {list.Count}",
                    null,
                    "Review",
                    "/Admin/Reviews"
                );
            }
        }

        private async Task<List<Review>> FetchGoogleReviewsAsync(string query, string location)
        {
            var reviews = new List<Review>();
            if (string.IsNullOrEmpty(_apifyKey))
                return reviews;

            var url =
                $"https://api.apify.com/v2/acts/apify~google-maps-reviews-scraper/run-sync-get-dataset-items?token={_apifyKey}";

            var body = new
            {
                startUrls = new[]
                {
                    new { url = "https://www.google.com/maps?cid=10519356483945760415" },
                },
                maxReviews = 100,
                reviewsSort = "highestRanking",
                language = "en",
                personalData = true,
                reviewsOrigin = "all",
            };

            var res = await _http.PostAsJsonAsync(url, body);
            if (!res.IsSuccessStatusCode)
                return reviews;

            var items = await res.Content.ReadFromJsonAsync<List<JsonElement>>();

            foreach (var item in items ?? new())
            {
                // Fallback for text fields
                var text = "";
                if (item.TryGetProperty("text", out var t) && t.ValueKind != JsonValueKind.Null)
                    text = t.GetString();
                else if (
                    item.TryGetProperty("reviewText", out var rt)
                    && rt.ValueKind != JsonValueKind.Null
                )
                    text = rt.GetString();
                else if (
                    item.TryGetProperty("comment", out var c)
                    && c.ValueKind != JsonValueKind.Null
                )
                    text = c.GetString();

                if (string.IsNullOrWhiteSpace(text))
                    continue;

                // Fallback for author name
                var name = "Google User";
                if (item.TryGetProperty("name", out var n))
                    name = n.GetString();
                else if (item.TryGetProperty("authorName", out var an))
                    name = an.GetString();

                reviews.Add(
                    new Review
                    {
                        AuthorName = name ?? "Google User",
                        AuthorAvatar = item.TryGetProperty("reviewerPhotoUrl", out var rpu)
                            ? rpu.GetString()
                            : null,
                        PlatformReviewId = item.TryGetProperty("reviewId", out var rid)
                            ? rid.GetString()
                            : null,
                        ExternalLink = item.TryGetProperty("reviewUrl", out var rurl)
                            ? rurl.GetString()
                            : null,
                        ReviewText = text,
                        Rating = item.TryGetProperty("stars", out var s) ? s.GetInt32() : 5,
                        Platform = "Google",
                        ReviewDate = item.TryGetProperty("publishedAtDate", out var d)
                            ? DateTime.Parse(d.GetString())
                            : DateTime.UtcNow,
                        IsVisible = true,
                        CreatedAt = DateTime.UtcNow,
                    }
                );
            }
            return reviews;
        }

        private async Task<List<Review>> FetchFacebookReviewsAsync()
        {
            var reviews = new List<Review>();
            if (string.IsNullOrEmpty(_apifyKey))
                return reviews;

            var url =
                $"https://api.apify.com/v2/acts/apify~facebook-reviews-scraper/run-sync-get-dataset-items?token={_apifyKey}";

            var body = new
            {
                startUrls = new[]
                {
                    new { url = "https://www.facebook.com/samsondentalcenter/reviews" },
                },
                resultsLimit = 10,
            };

            var res = await _http.PostAsJsonAsync(url, body);
            if (!res.IsSuccessStatusCode)
                return reviews;

            var items = await res.Content.ReadFromJsonAsync<List<JsonElement>>();

            foreach (var item in items ?? new())
            {
                var text = item.TryGetProperty("text", out var t)
                    ? t.GetString()
                    : (item.TryGetProperty("reviewText", out var rt) ? rt.GetString() : "");

                if (string.IsNullOrWhiteSpace(text))
                    continue;

                int rating = 5;
                if (item.TryGetProperty("score", out var s) && s.ValueKind == JsonValueKind.Number)
                    rating = s.GetInt32();
                else if (
                    item.TryGetProperty("rating", out var r)
                    && r.ValueKind == JsonValueKind.Number
                )
                    rating = r.GetInt32();

                reviews.Add(
                    new Review
                    {
                        AuthorName = item.TryGetProperty("authorName", out var n)
                            ? n.GetString()
                            : "Facebook User",
                        AuthorAvatar =
                            item.TryGetProperty("user", out var u)
                            && u.TryGetProperty("profilePic", out var pp)
                                ? pp.GetString()
                                : null,
                        PlatformReviewId = item.TryGetProperty("id", out var fid)
                            ? fid.GetString()
                            : null,
                        ExternalLink = item.TryGetProperty("url", out var furl)
                            ? furl.GetString()
                            : null,
                        ReviewText = text,
                        Rating = rating,
                        Platform = "Facebook",
                        ReviewDate = item.TryGetProperty("date", out var d)
                            ? DateTime.Parse(d.GetString())
                            : DateTime.UtcNow,
                        IsVisible = rating >= 4,
                        CreatedAt = DateTime.UtcNow,
                    }
                );
            }
            return reviews;
        }

        public async Task<(double average, int count)> GetReviewStatsAsync()
        {
            if (_cache.TryGetValue(CacheKeyStats, out (double average, int count) cachedStats))
            {
                return cachedStats;
            }

            var reviews = await GetVisibleReviewsAsync();
            if (!reviews.Any())
            {
                var fallback = (4.8, 24);
                _cache.Set(CacheKeyStats, fallback, TimeSpan.FromMinutes(10));
                return fallback;
            }

            double avg = reviews.Average(r => r.Rating);
            int count = reviews.Count;
            var stats = (Math.Round(avg, 1), count);

            _cache.Set(CacheKeyStats, stats, TimeSpan.FromMinutes(10));
            return stats;
        }

        private void InvalidateCache()
        {
            _cache.Remove(CacheKeyVisible);
            _cache.Remove(CacheKeyStats);
        }

        public async Task ImportLocalReviewsAsync()
        {
            var list = new List<Review>();
            var paths = new[]
            {
                "Data/Reviews/GoogleMapReviews.json",
                "Data/Reviews/FacebookReviews.json",
            };

            foreach (var path in paths)
            {
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), path);
                if (!File.Exists(fullPath))
                    continue;

                var json = await File.ReadAllTextAsync(fullPath);
                if (string.IsNullOrWhiteSpace(json))
                    continue;

                try
                {
                    var items = JsonSerializer.Deserialize<List<JsonElement>>(json);
                    foreach (var item in items ?? new())
                    {
                        var text = item.TryGetProperty("text", out var t) ? t.GetString() : "";
                        if (string.IsNullOrWhiteSpace(text))
                            continue;

                        list.Add(
                            new Review
                            {
                                AuthorName = item.TryGetProperty("name", out var n)
                                    ? n.GetString()
                                    : "External User",
                                AuthorAvatar = item.TryGetProperty("avatar", out var a)
                                    ? a.GetString()
                                    : null,
                                Rating = item.TryGetProperty("stars", out var s) ? s.GetInt32() : 5,
                                ReviewText = text,
                                PlatformReviewId = item.TryGetProperty("review_id", out var rid)
                                    ? rid.GetString()
                                    : null,
                                ExternalLink = item.TryGetProperty("url", out var u)
                                    ? u.GetString()
                                    : null,
                                Platform = item.TryGetProperty("platform", out var p)
                                    ? p.GetString()
                                    : "External",
                                ReviewDate = item.TryGetProperty("date", out var d)
                                    ? DateTime.Parse(d.GetString())
                                    : DateTime.UtcNow,
                                IsVisible = true,
                                CreatedAt = DateTime.UtcNow,
                            }
                        );
                    }
                }
                catch
                { /* Log or Skip */
                }
            }

            if (list.Any())
            {
                await AddReviewsBulkAsync(list);
                await _logs.LogActionAsync(
                    null,
                    "imported local reviews",
                    $"Count: {list.Count}",
                    null,
                    "Review",
                    "/Admin/Reviews"
                );
            }
        }
    }
}
