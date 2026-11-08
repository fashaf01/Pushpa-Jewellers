// Today's gold rate for the bar at the top of the page: 24K and 22K in Sri Lankan rupees,
// per gram and per pawn (8 g). Served at /api/gold as a Vercel function.
//
// Where the rate comes from, first match wins:
//   1. GOLD_24K_PAWN_LKR and GOLD_22K_PAWN_LKR in the Vercel project's environment variables
//      (whole rupees per pawn): a fixed override, for emergencies only.
//   2. The shop admin (pushpa-jewellers-admin): today's counter rate if staff have entered one,
//      otherwise the admin's automatic Sri Lankan market rate, worked out with the premium the
//      owner sets in the admin's Settings. Set ADMIN_URL to point somewhere else.
//   3. If the admin cannot be reached: the same market rate worked out here — the international
//      gold price (gold-api.com) in rupees (open.er-api.com) plus the Sri Lankan market premium
//      (GOLD_MARKET_PREMIUM_PERCENT, default 5.12), 22K at 92% of 24K, pawns rounded to Rs 100.
//      At those figures it matched the market on 8 Nov 2026: 24K Rs 366,000, 22K Rs 336,700.
//
// The international price alone is never shown: Sri Lankan counters sit about 5% above it.

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GRAMS_PER_PAWN = 8;
const ADMIN = (process.env.ADMIN_URL || 'https://pushpa-jewellers-admin.vercel.app').replace(/\/+$/, '');
const PREMIUM = Number.isFinite(Number(process.env.GOLD_MARKET_PREMIUM_PERCENT)) && process.env.GOLD_MARKET_PREMIUM_PERCENT !== undefined
  ? Number(process.env.GOLD_MARKET_PREMIUM_PERCENT) : 5.12;
const K22_OF_24 = Number(process.env.GOLD_22K_PERCENT_OF_24K) || 92;

let lastGood = null; // the last good answer, kept while this function instance stays warm

const round100 = (n) => Math.round(n / 100) * 100;
const fromPawn = (pawn) => ({ gram: Math.round(pawn / GRAMS_PER_PAWN), pawn: Math.round(pawn) });

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

function fromAdminShape(r) {
  if (!r || !r.k24 || !r.k22 || !(r.k24.pawn > 0) || !(r.k22.pawn > 0)) throw new Error('admin rate incomplete');
  return {
    source: r.source === 'showroom' ? 'showroom' : 'market',
    currency: 'LKR',
    k24: fromPawn(r.k24.pawn),
    k22: fromPawn(r.k22.pawn),
    updated: r.updated || new Date().toISOString(),
  };
}

async function fromAdmin() {
  // today's counter rate (or the admin's automatic market rate for today) …
  try {
    const r = await getJson(ADMIN + '/api/public/gold-rate');
    if (r && r.is_today) return fromAdminShape(r);
  } catch (e) { /* no database yet, or no rate today: ask for the market rate */ }
  // … else the admin's market rate, which works even before its database is connected
  return fromAdminShape(await getJson(ADMIN + '/api/public/market-rate'));
}

async function marketHere() {
  const [gold, fx] = await Promise.all([
    getJson('https://api.gold-api.com/price/XAU'),
    getJson('https://open.er-api.com/v6/latest/USD'),
  ]);
  const usdPerOunce = Number(gold && gold.price);
  const usdLkr = Number(fx && fx.rates && fx.rates.LKR);
  if (!(usdPerOunce > 0) || !(usdLkr > 0)) throw new Error('gold or exchange rate missing from upstream');
  const pawn24 = round100((usdPerOunce / GRAMS_PER_TROY_OUNCE) * usdLkr * GRAMS_PER_PAWN * (1 + PREMIUM / 100));
  return {
    source: 'market',
    currency: 'LKR',
    k24: fromPawn(pawn24),
    k22: fromPawn(round100((pawn24 * K22_OF_24) / 100)),
    updated: typeof gold.updatedAt === 'string' ? gold.updatedAt : new Date().toISOString(),
  };
}

async function build() {
  const pawn24 = Number(process.env.GOLD_24K_PAWN_LKR);
  const pawn22 = Number(process.env.GOLD_22K_PAWN_LKR);
  if (pawn24 > 0 && pawn22 > 0) {
    return {
      source: 'showroom',
      currency: 'LKR',
      k24: fromPawn(pawn24),
      k22: fromPawn(pawn22),
      updated: process.env.GOLD_RATE_UPDATED || new Date().toISOString(),
    };
  }
  try {
    return await fromAdmin();
  } catch (err) {
    console.error('admin gold rate unavailable, working it out here:', err.message);
    return marketHere();
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  try {
    lastGood = JSON.stringify(await build());
  } catch (err) {
    console.error('gold rate refresh failed:', err);
    // Keep serving the last good rate; only fail when there has never been one.
    if (!lastGood) {
      res.statusCode = 503;
      res.setHeader('cache-control', 'no-store');
      return res.end(JSON.stringify({ error: 'Gold rate unavailable' }));
    }
  }
  // Ten minutes at the edge, so a counter rate saved in the admin shows within ten minutes
  res.setHeader('cache-control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  res.end(lastGood);
};
