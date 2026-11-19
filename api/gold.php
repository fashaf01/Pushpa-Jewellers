<?php
// Today's gold rate for the bar at the top of the page: 24K and 22K in Sri Lankan rupees,
// per gram and per pawn (8 g). The Hostinger (PHP) twin of api/gold.js; .htaccess serves it
// at /api/gold so the page's fetch('/api/gold') works unchanged.
//
// Where the rate comes from, first match wins:
//   1. FIXED_24K_PAWN and FIXED_22K_PAWN below (whole rupees per pawn): a fixed override,
//      for emergencies only. Leave them at 0 normally.
//   2. The shop admin (pushpa-jewellers-admin): today's counter rate if staff have entered one,
//      otherwise the admin's automatic Sri Lankan market rate.
//   3. If the admin cannot be reached: the same market rate worked out here — the international
//      gold price (gold-api.com) in rupees (open.er-api.com) plus the Sri Lankan market premium,
//      22K at 92% of 24K, pawns rounded to Rs 100.
//
// Answers are kept in a cache file for ten minutes, and the last good answer is served if every
// source fails, so the bar never goes blank because an upstream had a bad minute.

// ---- settings you may change ----------------------------------------------------------------
const FIXED_24K_PAWN = 0;            // e.g. 366000 to pin the rate by hand; 0 = automatic
const FIXED_22K_PAWN = 0;            // e.g. 336700
const ADMIN_URL      = 'https://pushpa-jewellers-admin.vercel.app';
const PREMIUM_PERCENT = 5.12;        // Sri Lankan counters over the international price
const K22_OF_24      = 92;           // 22K as a percentage of 24K
const CACHE_SECONDS  = 600;          // ten minutes
// ----------------------------------------------------------------------------------------------

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GRAMS_PER_PAWN = 8;

function cache_file(): string {
    $dir = sys_get_temp_dir();
    if (!is_dir($dir) || !is_writable($dir)) $dir = __DIR__;
    return rtrim($dir, '/') . '/pushpa-gold-' . md5(__DIR__) . '.json';
}

function get_json(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_USERAGENT      => 'pushpa-gold-rate/1.0',
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new RuntimeException("$url failed: $err");
    if ($code < 200 || $code >= 300) throw new RuntimeException("$url answered $code");
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException("$url did not return JSON");
    return $data;
}

function round100(float $n): int { return (int) (round($n / 100) * 100); }
function from_pawn(float $pawn): array {
    return ['gram' => (int) round($pawn / GRAMS_PER_PAWN), 'pawn' => (int) round($pawn)];
}

function from_admin_shape(array $r): array {
    $p24 = $r['k24']['pawn'] ?? 0;
    $p22 = $r['k22']['pawn'] ?? 0;
    if (!($p24 > 0) || !($p22 > 0)) throw new RuntimeException('admin rate incomplete');
    return [
        'source'   => ($r['source'] ?? '') === 'showroom' ? 'showroom' : 'market',
        'currency' => 'LKR',
        'k24'      => from_pawn($p24),
        'k22'      => from_pawn($p22),
        'updated'  => $r['updated'] ?? gmdate('Y-m-d\TH:i:s\Z'),
    ];
}

function from_admin(): array {
    $base = rtrim(ADMIN_URL, '/');
    // today's counter rate (or the admin's automatic market rate for today) …
    try {
        $r = get_json($base . '/api/public/gold-rate');
        if (!empty($r['is_today'])) return from_admin_shape($r);
    } catch (Throwable $e) { /* no database yet, or no rate today: ask for the market rate */ }
    // … else the admin's market rate, which works even before its database is connected
    return from_admin_shape(get_json($base . '/api/public/market-rate'));
}

function market_here(): array {
    $gold = get_json('https://api.gold-api.com/price/XAU');
    $fx   = get_json('https://open.er-api.com/v6/latest/USD');
    $usdPerOunce = (float) ($gold['price'] ?? 0);
    $usdLkr      = (float) ($fx['rates']['LKR'] ?? 0);
    if (!($usdPerOunce > 0) || !($usdLkr > 0)) throw new RuntimeException('gold or exchange rate missing from upstream');
    $pawn24 = round100(($usdPerOunce / GRAMS_PER_TROY_OUNCE) * $usdLkr * GRAMS_PER_PAWN * (1 + PREMIUM_PERCENT / 100));
    return [
        'source'   => 'market',
        'currency' => 'LKR',
        'k24'      => from_pawn($pawn24),
        'k22'      => from_pawn(round100($pawn24 * K22_OF_24 / 100)),
        'updated'  => is_string($gold['updatedAt'] ?? null) ? $gold['updatedAt'] : gmdate('Y-m-d\TH:i:s\Z'),
    ];
}

function build(): array {
    if (FIXED_24K_PAWN > 0 && FIXED_22K_PAWN > 0) {
        return [
            'source'   => 'showroom',
            'currency' => 'LKR',
            'k24'      => from_pawn(FIXED_24K_PAWN),
            'k22'      => from_pawn(FIXED_22K_PAWN),
            'updated'  => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }
    try {
        return from_admin();
    } catch (Throwable $e) {
        error_log('admin gold rate unavailable, working it out here: ' . $e->getMessage());
        return market_here();
    }
}

header('Content-Type: application/json; charset=utf-8');

$file  = cache_file();
$cached = is_readable($file) ? @file_get_contents($file) : false;
$fresh  = $cached !== false && (time() - (int) @filemtime($file)) < CACHE_SECONDS;

if (!$fresh) {
    try {
        $json = json_encode(build(), JSON_UNESCAPED_SLASHES);
        @file_put_contents($file, $json, LOCK_EX);
        $cached = $json;
    } catch (Throwable $e) {
        error_log('gold rate refresh failed: ' . $e->getMessage());
        // Keep serving the last good rate; only fail when there has never been one.
        if ($cached === false) {
            http_response_code(503);
            header('Cache-Control: no-store');
            echo json_encode(['error' => 'Gold rate unavailable']);
            exit;
        }
    }
}

header('Cache-Control: public, max-age=300');
echo $cached;
