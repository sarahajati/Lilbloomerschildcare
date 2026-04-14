/**
 * Admin page PIN (change this). For stronger protection, add Cloudflare Zero Trust
 * (Access) rules for /admin.html so only staff IPs or Google login can open it.
 */
window.LILBLOOMERS_ADMIN_PIN = "1234";

/**
 * Optional: same value as Cloudflare SAVE_TOKEN secret — skips the save-token prompt.
 * Leave "" for staff; they enter the token once per browser. Avoid real tokens in public Git.
 */
window.LILBLOOMERS_SAVE_TOKEN = "";

/**
 * Optional: tune embedded uploads (data URLs in JSON). Higher = sharper / larger files.
 * Whole site JSON must stay reasonable for KV (order of a few MB total is fine).
 *
 * Example (uncomment and adjust):
 * window.LILBLOOMERS_ADMIN_PHOTO_LIMITS = {
 *   staffMaxW: 1600,
 *   staffMaxBytes: 1200000,
 *   galleryMaxW: 3200,
 *   galleryMaxBytes: 2800000,
 *   quality: 0.94,
 * };
 */
