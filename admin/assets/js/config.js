/* ==========================================================================
   Pushpa Jewellers — shop admin configuration

   API_BASE_URL decides where the shop's data lives.

   ''  (empty)  →  DEMO MODE. Sample products and orders are kept in this
                   browser's local storage. Nothing leaves the device.
                   Good for trying the panel out and showing the client.

   '/api'       →  LIVE MODE. Every screen reads and writes through the
                   PHP + MySQL API in api/ (docs/API.md), served from the
                   same Hostinger site, so no CORS set-up is needed.
   ========================================================================== */

/* On a laptop or a Vercel preview there is no PHP API, so the panel opens in
   demo mode there and a test can never write into the real shop. Everywhere
   else (pushpa-jewellers.com, Hostinger's preview address) it is live. */
var PJ_DEMO_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|)$|\.vercel\.app$|^testlk\.store$/i.test(window.location.hostname);

window.PJ_CONFIG = {
  API_BASE_URL: PJ_DEMO_HOST ? '' : '/api',

  /* Photos are shrunk in the browser before upload, so a 12 MB phone photo
     goes up as a few hundred KB. Longest edge in pixels, and JPEG quality. */
  IMAGE_MAX_PX: 1600,
  IMAGE_QUALITY: 0.85,

  /* Link back to the public website from the sidebar. */
  SITE_URL: '../index.html'
};
