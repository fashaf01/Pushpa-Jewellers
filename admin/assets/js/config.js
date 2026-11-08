/* ==========================================================================
   Pushpa Jewellers — shop admin configuration

   API_BASE_URL decides where the shop's data lives.

   ''  (empty)  →  DEMO MODE. Sample products and orders are kept in this
                   browser's local storage. Nothing leaves the device.
                   Good for trying the panel out and showing the client.

   a URL        →  LIVE MODE. Every screen reads and writes through the REST
                   API described in docs/API.md, e.g. a PHP + MySQL backend
                   on the Hostinger plan:

                     API_BASE_URL: 'https://pushpa-jewellers.com/api'

                   Host this admin folder on the same domain (for example at
                   /admin) and the browser needs no CORS setup at all.
   ========================================================================== */
/* The live shop runs on these addresses, with the API at /api on the same
   site (api/main.js + server/ in this repo, deployed on Vercel). Anywhere
   else — a laptop, a preview link — the panel opens in demo mode, so a
   test can never write into the real shop. Add a custom domain here when
   the shop gets one. */
var PJ_LIVE_HOSTS = ['pushpa-jewellers-admin.vercel.app'];

window.PJ_CONFIG = {
  API_BASE_URL: PJ_LIVE_HOSTS.indexOf(window.location.hostname) !== -1 ? '/api' : '',

  /* Photos are shrunk in the browser before upload, so a 12 MB phone photo
     goes up as a few hundred KB. Longest edge in pixels, and JPEG quality. */
  IMAGE_MAX_PX: 1600,
  IMAGE_QUALITY: 0.85,

  /* Link back to the public website from the sidebar. */
  SITE_URL: '../index.html'
};
