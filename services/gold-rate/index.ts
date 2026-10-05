// Gold rate for the Pushpa Jewellers site: 24K and 22K in Sri Lankan rupees, per gram and per pawn (8 g).
//
// By default the price is the international gold spot price (gold-api.com) converted to rupees
// with the day's USD/LKR rate (open.er-api.com), refreshed at most once an hour.
// To show the showroom's own counter rate instead, set GOLD_24K_PAWN_LKR and GOLD_22K_PAWN_LKR
// on this service in Railway (whole rupees per pawn); remove them to go back to the market price.

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GRAMS_PER_PAWN = 8;
const REFRESH_MS = 60 * 60 * 1000;

type Rate = { gram: number; pawn: number };
type Payload = {
  source: "showroom" | "international";
  currency: "LKR";
  k24: Rate;
  k22: Rate;
  updated: string;
  usd_per_ounce?: number;
  usd_lkr?: number;
};

let cached: { body: string; at: number } | null = null;

function rate(perGram: number): Rate {
  return { gram: Math.round(perGram), pawn: Math.round(perGram * GRAMS_PER_PAWN) };
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

async function build(): Promise<Payload> {
  const pawn24 = Number(Bun.env.GOLD_24K_PAWN_LKR);
  const pawn22 = Number(Bun.env.GOLD_22K_PAWN_LKR);
  if (pawn24 > 0 && pawn22 > 0) {
    return {
      source: "showroom",
      currency: "LKR",
      k24: rate(pawn24 / GRAMS_PER_PAWN),
      k22: rate(pawn22 / GRAMS_PER_PAWN),
      updated: Bun.env.GOLD_RATE_UPDATED || new Date().toISOString(),
    };
  }
  const [gold, fx] = await Promise.all([
    getJson("https://api.gold-api.com/price/XAU"),
    getJson("https://open.er-api.com/v6/latest/USD"),
  ]);
  const usdPerOunce = Number(gold?.price);
  const usdLkr = Number(fx?.rates?.LKR);
  if (!(usdPerOunce > 0) || !(usdLkr > 0)) throw new Error("gold or exchange rate missing from upstream");
  const gram24 = (usdPerOunce / GRAMS_PER_TROY_OUNCE) * usdLkr;
  return {
    source: "international",
    currency: "LKR",
    k24: rate(gram24),
    k22: rate((gram24 * 22) / 24),
    updated: typeof gold?.updatedAt === "string" ? gold.updatedAt : new Date().toISOString(),
    usd_per_ounce: Math.round(usdPerOunce * 100) / 100,
    usd_lkr: Math.round(usdLkr * 100) / 100,
  };
}

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=600",
};

Bun.serve({
  port: Number(Bun.env.PORT) || 8080,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/health") return new Response("ok");
    if (!cached || Date.now() - cached.at > REFRESH_MS) {
      try {
        cached = { body: JSON.stringify(await build()), at: Date.now() };
      } catch (err) {
        console.error("gold rate refresh failed:", err);
        // Keep serving the last good rate; only fail when there has never been one.
        if (!cached) return new Response(JSON.stringify({ error: "Gold rate unavailable" }), { status: 503, headers });
      }
    }
    return new Response(cached.body, { headers });
  },
});

console.log("gold-rate listening");
