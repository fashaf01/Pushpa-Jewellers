// Today's gold rate for the bar at the top of the page: 24K and 22K in Sri Lankan rupees,
// per gram and per pawn (8 g). Served at /api/gold as a Vercel function.
//
// By default the price is the international gold spot price (gold-api.com) converted to rupees
// with the day's USD/LKR rate (open.er-api.com). Vercel's CDN keeps each answer for an hour.
// To show the showroom's own counter rate instead, set GOLD_24K_PAWN_LKR and GOLD_22K_PAWN_LKR
// (whole rupees per pawn) in the Vercel project's environment variables and redeploy; remove them
// to go back to the market price.

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GRAMS_PER_PAWN = 8;

let lastGood = null; // the last good answer, kept while this function instance stays warm

function rate(perGram) {
  return { gram: Math.round(perGram), pawn: Math.round(perGram * GRAMS_PER_PAWN) };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

async function build() {
  const pawn24 = Number(process.env.GOLD_24K_PAWN_LKR);
  const pawn22 = Number(process.env.GOLD_22K_PAWN_LKR);
  if (pawn24 > 0 && pawn22 > 0) {
    return {
      source: 'showroom',
      currency: 'LKR',
      k24: rate(pawn24 / GRAMS_PER_PAWN),
      k22: rate(pawn22 / GRAMS_PER_PAWN),
      updated: process.env.GOLD_RATE_UPDATED || new Date().toISOString(),
    };
  }
  const [gold, fx] = await Promise.all([
    getJson('https://api.gold-api.com/price/XAU'),
    getJson('https://open.er-api.com/v6/latest/USD'),
  ]);
  const usdPerOunce = Number(gold && gold.price);
  const usdLkr = Number(fx && fx.rates && fx.rates.LKR);
  if (!(usdPerOunce > 0) || !(usdLkr > 0)) throw new Error('gold or exchange rate missing from upstream');
  const gram24 = (usdPerOunce / GRAMS_PER_TROY_OUNCE) * usdLkr;
  return {
    source: 'international',
    currency: 'LKR',
    k24: rate(gram24),
    k22: rate((gram24 * 22) / 24),
    updated: typeof gold.updatedAt === 'string' ? gold.updatedAt : new Date().toISOString(),
    usd_per_ounce: Math.round(usdPerOunce * 100) / 100,
    usd_lkr: Math.round(usdLkr * 100) / 100,
  };
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
  res.setHeader('cache-control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  res.end(lastGood);
};
