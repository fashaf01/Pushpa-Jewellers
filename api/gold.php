<?php
// Today's gold rate for the bar at the top of the page (served at /api/gold).
// PHP port of gold.js for Hostinger. 24K and 22K in Sri Lankan rupees, per gram and per pawn (8 g).
//
// Source, first match wins:
//   1. The shop admin (pushpa-jewellers-admin): today's counter rate, else its automatic market rate.
//   2. If the admin cannot be reached: the international gold price (gold-api.com) in rupees
//      (open.er-api.com) plus the Sri Lankan market premium, 22K at 92% of 24K, pawns rounded to Rs 100.
// The last good answer is kept in a cache file and served if both sources fail.

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GRAMS_PER_PAWN = 8;
const ADMIN = 'https://pushpa-jewellers-admin.vercel.app';
const PREMIUM = 5.12;
const K22_OF_24 = 92;
const FRESH_SECONDS = 600;                       // re-ask the sources at most every ten minutes
const CACHE = __DIR__ . '/gold-cache.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

function get_json($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) throw new Exception("$url answered $code");
    $data = json_decode($body, true);
    if (!is_array($data)) throw new Exception("$url sent bad JSON");
    return $data;
}

function from_pawn($pawn) { return ['gram' => (int) round($pawn / GRAMS_PER_PAWN), 'pawn' => (int) round($pawn)]; }
function round100($n) { return round($n / 100) * 100; }

function from_admin_shape($r) {
    if (empty($r['k24']['pawn']) || empty($r['k22']['pawn']) || $r['k24']['pawn'] <= 0 || $r['k22']['pawn'] <= 0)
        throw new Exception('admin rate incomplete');
    return [
        'source'   => (($r['source'] ?? '') === 'showroom') ? 'showroom' : 'market',
        'currency' => 'LKR',
        'k24'      => from_pawn($r['k24']['pawn']),
        'k22'      => from_pawn($r['k22']['pawn']),
        'updated'  => $r['updated'] ?? gmdate('c'),
    ];
}

function from_admin() {
    try {
        $r = get_json(ADMIN . '/api/public/gold-rate');
        if (!empty($r['is_today'])) return from_admin_shape($r);
    } catch (Exception $e) { /* no rate today: ask for the market rate */ }
    return from_admin_shape(get_json(ADMIN . '/api/public/market-rate'));
}

function market_here() {
    $gold = get_json('https://api.gold-api.com/price/XAU');
    $fx   = get_json('https://open.er-api.com/v6/latest/USD');
    $usd_oz = (float) ($gold['price'] ?? 0);
    $usd_lkr = (float) ($fx['rates']['LKR'] ?? 0);
    if ($usd_oz <= 0 || $usd_lkr <= 0) throw new Exception('gold or exchange rate missing');
    $pawn24 = round100(($usd_oz / GRAMS_PER_TROY_OUNCE) * $usd_lkr * GRAMS_PER_PAWN * (1 + PREMIUM / 100));
    return [
        'source'   => 'market',
        'currency' => 'LKR',
        'k24'      => from_pawn($pawn24),
        'k22'      => from_pawn(round100($pawn24 * K22_OF_24 / 100)),
        'updated'  => is_string($gold['updatedAt'] ?? null) ? $gold['updatedAt'] : gmdate('c'),
    ];
}

// Fresh cache: answer straight away.
if (is_file(CACHE) && (time() - filemtime(CACHE)) < FRESH_SECONDS) {
    readfile(CACHE);
    exit;
}

try {
    try { $rate = from_admin(); } catch (Exception $e) { $rate = market_here(); }
    $json = json_encode($rate);
    @file_put_contents(CACHE, $json, LOCK_EX);
    echo $json;
} catch (Exception $e) {
    if (is_file(CACHE)) { readfile(CACHE); exit; }   // serve the last good rate
    http_response_code(503);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Gold rate unavailable']);
}
