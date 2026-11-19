<?php
/* ==========================================================================
   Pushpa Jewellers — every endpoint in docs/API.md, in PHP.
   A route-for-route port of the Node server (server/app.js on the admin
   branch), with the same business rules: order numbers, stock following
   orders, payment status, best sellers, the automatic market gold rate.
   ========================================================================== */

const CATEGORIES = ['rings', 'necklaces', 'earrings', 'bangles', 'bracelets', 'pendants', 'chains', 'sets', 'other'];
const METALS = ['yellow_gold', 'white_gold', 'rose_gold', 'platinum', 'silver', 'other'];
const GOLD = ['yellow_gold', 'white_gold', 'rose_gold'];
const KARATS = [24, 22, 18];
const STATUSES = ['new', 'confirmed', 'in_making', 'ready', 'dispatched', 'completed', 'cancelled'];
const CHANNELS = ['walk_in', 'whatsapp', 'phone', 'instagram', 'facebook', 'website'];
const METHODS = ['cash' => 'Cash', 'card' => 'Card', 'bank' => 'Bank transfer', 'old_gold' => 'Old gold exchange', 'other' => 'Other'];
const SKU_CODES = ['rings' => 'RG', 'necklaces' => 'NK', 'earrings' => 'ER', 'bangles' => 'BG', 'bracelets' => 'BR', 'pendants' => 'PD', 'chains' => 'CH', 'sets' => 'ST'];
const GRAMS_PER_OUNCE = 31.1034768;
const AUTO_BY = 'Automatic (market rate)';

const DEFAULT_SETTINGS = [
    'shop_name' => 'Pushpa Jewellers',
    'showrooms' => [
        ['id' => 'negombo', 'name' => 'Negombo', 'phone' => '031 223 3857', 'address' => '67 & 69 Greens Road, Negombo'],
        ['id' => 'katunayake', 'name' => 'Katunayake', 'phone' => '077 777 0203', 'address' => '8A Averiwatte Road, Katunayake'],
    ],
    'price_rounding' => 100,
    'default_making_percent' => 12,
    'low_stock_default' => 1,
    'featured_limit' => 8,
    /* Sri Lankan market rate = international price × (1 + premium). Calibrated
       8 Nov 2026 against the market's 24K Rs 366,000 / 22K Rs 336,700 a pawn. */
    'market_premium_percent' => 5.12,
    'k22_percent_of_24k' => 92,
    'k18_percent_of_24k' => 75,
    /* the shop takes no orders online: the website says "Price on request" and visitors ask on WhatsApp */
    'website_prices' => false,
];

function round100(float $n): float { return round($n / 100) * 100; }

/* ------------------------------------------------------------------
   Shared reads
   ------------------------------------------------------------------ */
function get_settings(): array
{
    $r = q1('SELECT data FROM settings WHERE id = 1');
    return array_merge(DEFAULT_SETTINGS, $r ? jdec($r['data']) : []);
}
function room_name(array $s, string $id): string
{
    foreach ($s['showrooms'] as $r) if ($r['id'] === $id) return $r['name'];
    return $id;
}
function has_room(array $s, $id): bool
{
    foreach ($s['showrooms'] as $r) if ($r['id'] === $id) return true;
    return false;
}

function product_out(array $r): array
{
    return [
        'id' => $r['id'], 'sku' => $r['sku'], 'name' => $r['name'], 'category' => $r['category'], 'badge' => $r['badge'],
        'description' => $r['description'], 'metal' => $r['metal'],
        'karat' => $r['karat'] === null ? null : (int) $r['karat'],
        'weight_g' => $r['weight_g'] === null ? null : (float) $r['weight_g'],
        'stones' => $r['stones'], 'pricing_mode' => $r['pricing_mode'], 'making_type' => $r['making_type'],
        'making_value' => n($r['making_value']), 'stone_value' => n($r['stone_value']), 'fixed_price' => n($r['fixed_price']),
        'show_price' => (bool) $r['show_price'],
        'images' => jdec($r['images']),
        'stock' => obj(array_map('intval', jdec($r['stock']))),
        'low_stock_at' => (int) $r['low_stock_at'], 'status' => $r['status'],
        'featured_rank' => $r['featured_rank'] === null ? null : (int) $r['featured_rank'],
        'created_at' => iso_from_db($r['created_at']), 'updated_at' => iso_from_db($r['updated_at']),
    ];
}

function get_product($id, bool $lock = false): array
{
    if (!is_uuid($id)) fail(404, 'That product no longer exists.');
    $r = q1('SELECT * FROM products WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id]);
    if (!$r) fail(404, 'That product no longer exists.');
    return product_out($r);
}

function order_out(array $r): array
{
    return [
        'id' => $r['id'], 'number' => $r['number'],
        'created_at' => iso_from_db($r['created_at']), 'updated_at' => iso_from_db($r['updated_at']),
        'channel' => $r['channel'], 'showroom' => $r['showroom'],
        'customer' => obj(jdec($r['customer'])), 'items' => jdec($r['items']),
        'subtotal' => n($r['subtotal']), 'discount' => n($r['discount']), 'total' => n($r['total']), 'paid' => n($r['paid']),
        'payment_status' => $r['payment_status'], 'payments' => jdec($r['payments']),
        'fulfilment' => $r['fulfilment'], 'due_date' => $r['due_date'], 'status' => $r['status'],
        'tracking' => obj(jdec($r['tracking'], ['courier' => '', 'number' => ''])),
        'notes' => $r['notes'], 'history' => jdec($r['history']),
    ];
}

function get_order($idOrNumber, bool $lock = false): array
{
    $key = (string) ($idOrNumber ?? '');
    $sql = 'SELECT * FROM orders WHERE ' . (is_uuid($key) ? 'id = ?' : 'number = ?') . ($lock ? ' FOR UPDATE' : '');
    $r = q1($sql, [is_uuid($key) ? $key : strtoupper($key)]);
    if (!$r) fail(404, 'That order no longer exists.');
    return order_out($r);
}

function move_stock(array $s, string $productId, string $room, int $delta, string $reason, $note, string $orderNumber, string $by): void
{
    if (!has_room($s, $room)) bad('Unknown showroom.');
    $r = q1('SELECT stock FROM products WHERE id = ? FOR UPDATE', [$productId]);
    if (!$r) return;
    $stock = jdec($r['stock']);
    $stock[$room] = (int) ($stock[$room] ?? 0) + $delta;
    q('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [jenc(obj($stock)), now_db(), $productId]);
    q('INSERT INTO stock_movements (id, product_id, showroom, delta, reason, note, order_number, at, by_name) VALUES (?,?,?,?,?,?,?,?,?)',
        [uuid(), $productId, $room, $delta, $reason, str_clean($note), $orderNumber, now_db(), $by]);
}

/* ------------------------------------------------------------------
   Price — the same formula as admin/assets/js/pricing.js
   ------------------------------------------------------------------ */
function price_of(array $p, ?array $rate, $rounding): ?float
{
    if ($p['pricing_mode'] === 'fixed') return ((float) $p['fixed_price']) ?: null;
    if (!in_array($p['metal'], GOLD, true) || !$rate) return null;
    $perGram = (float) ($rate['per_gram'][$p['karat']] ?? 0);
    $weight = (float) $p['weight_g'];
    if (!$perGram || !$weight) return null;
    $metal = $weight * $perGram;
    $making = $p['making_type'] === 'flat' ? (float) $p['making_value'] : $metal * (float) $p['making_value'] / 100;
    $step = ((float) $rounding) ?: 100;
    return round(($metal + $making + (float) $p['stone_value']) / $step) * $step;
}

/* ------------------------------------------------------------------
   Market gold rate — worked out automatically, every day.
   International gold (gold-api.com, USD an ounce) × USD→LKR (open.er-api.com)
   × the Sri Lankan market premium; 22K and 18K as a share of 24K; pawns
   rounded to Rs 100 as the shops quote them. Cached 30 minutes on disk.
   ------------------------------------------------------------------ */
function fetch_market(): array
{
    $file = pj_data_dir() . '/market-cache.json';
    $cache = is_file($file) ? jdec(@file_get_contents($file), null) : null;
    $age = $cache ? time() - (int) ($cache['at'] ?? 0) : PHP_INT_MAX;
    if ($cache && $age < 1800) return $cache;
    if ($cache && !empty($cache['failed_at']) && time() - $cache['failed_at'] < 600) return $cache;
    try {
        $gold = fetch_json('https://api.gold-api.com/price/XAU');
        $fx = fetch_json('https://open.er-api.com/v6/latest/USD');
        $usdOz = (float) ($gold['price'] ?? 0);
        $usdLkr = (float) ($fx['rates']['LKR'] ?? 0);
        if ($usdOz <= 0 || $usdLkr <= 0) throw new RuntimeException('gold or exchange rate missing');
        $cache = ['at' => time(), 'usdOz' => $usdOz, 'usdLkr' => $usdLkr,
            'updated' => is_string($gold['updatedAt'] ?? null) ? $gold['updatedAt'] : now_iso()];
        @file_put_contents($file, jenc($cache), LOCK_EX);
        return $cache;
    } catch (Throwable $e) {
        error_log('pj market gold price failed: ' . $e->getMessage());
        if ($cache) { /* keep the last good figures, and don't hammer the sources */
            $cache['failed_at'] = time();
            @file_put_contents($file, jenc($cache), LOCK_EX);
            return $cache;
        }
        fail(503, 'The market gold price could not be fetched just now.');
    }
}

function market_rate(array $s): array
{
    $m = fetch_market();
    $premium = num($s['market_premium_percent'] ?? null) ?? DEFAULT_SETTINGS['market_premium_percent'];
    $k22 = num($s['k22_percent_of_24k'] ?? null) ?: DEFAULT_SETTINGS['k22_percent_of_24k'];
    $k18 = num($s['k18_percent_of_24k'] ?? null) ?: DEFAULT_SETTINGS['k18_percent_of_24k'];
    $pawn24 = round100(($m['usdOz'] / GRAMS_PER_OUNCE) * $m['usdLkr'] * 8 * (1 + $premium / 100));
    $pawn = [24 => $pawn24, 22 => round100($pawn24 * $k22 / 100), 18 => round100($pawn24 * $k18 / 100)];
    $pg = fn($p) => round($p / 8, 3);
    return [
        'pawn' => $pawn,
        'per_gram' => [24 => $pg($pawn[24]), 22 => $pg($pawn[22]), 18 => $pg($pawn[18])],
        'premium_percent' => $premium,
        'usd_per_ounce' => round($m['usdOz'], 2),
        'usd_lkr' => round($m['usdLkr'], 2),
        'updated' => $m['updated'],
    ];
}

/* If nobody has entered today's rate, put the market rate in for the day.
   A rate a person saves replaces it. Never breaks the request it runs in. */
function ensure_today_rate(): void
{
    $today = colombo_day();
    try {
        if (q1('SELECT 1 AS x FROM gold_rates WHERE date = ?', [$today])) return;
        $r = market_rate(get_settings());
        q('INSERT IGNORE INTO gold_rates (date, per_gram, updated_at, updated_by) VALUES (?,?,?,?)',
            [$today, jenc($r['per_gram']), now_db(), AUTO_BY]);
    } catch (HttpError $e) {
        /* no market price right now: the admin asks a person as usual */
    } catch (Throwable $e) {
        error_log('pj automatic gold rate failed: ' . $e->getMessage());
    }
}

function rate_out(array $r): array
{
    $pg = [];
    foreach (jdec($r['per_gram']) as $k => $v) $pg[(string) $k] = n($v);
    return ['date' => $r['date'], 'per_gram' => obj($pg), 'updated_at' => iso_from_db($r['updated_at']), 'updated_by' => $r['updated_by']];
}

function latest_rate(): ?array
{
    $r = q1('SELECT * FROM gold_rates ORDER BY date DESC LIMIT 1');
    return $r ? rate_out($r) : null;
}

/* ------------------------------------------------------------------
   Auth
   ------------------------------------------------------------------ */
function public_user(array $u): array { return ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role']]; }

function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    }
    return preg_match('/^Bearer\s+(.+)$/i', $h, $m) ? trim($m[1]) : null;
}

function current_user(): array
{
    $token = bearer_token();
    if (!$token) fail(401, 'Please sign in.');
    $u = q1('SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token_hash = ? AND s.expires_at > ?', [hash('sha256', $token), now_db()]);
    if (!$u) fail(401, 'Your session has ended. Please sign in again.');
    return $u;
}

function start_session(array $user): array
{
    $token = bin2hex(random_bytes(32));
    q('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)',
        [hash('sha256', $token), $user['id'], now_db(), gmdate('Y-m-d H:i:s', time() + 30 * 86400)]);
    q('DELETE FROM sessions WHERE expires_at < ?', [now_db()]);
    return ['token' => $token, 'user' => public_user($user)];
}

function check_new_account(array $b): array
{
    $email = strtolower(str_clean($b['email'] ?? '', 200));
    $name = str_clean($b['name'] ?? '', 80);
    $password = (string) ($b['password'] ?? '');
    if ($name === '') bad('Enter your name.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) bad('Enter a valid email address.');
    if (strlen($password) < 8) bad('Use a password of at least 8 characters.');
    return [$email, $name, $password];
}

function auth_status(): array
{
    return ['needs_setup' => (int) q1('SELECT COUNT(*) AS n FROM users')['n'] === 0];
}

function auth_setup(array $b): array
{
    [$email, $name, $password] = check_new_account($b);
    $owner = strtolower(trim((string) (pj_config()['owner_email'] ?? '')));
    return tx(function () use ($email, $name, $password, $owner) {
        q1("SELECT value FROM counters WHERE name = 'order_number' FOR UPDATE"); /* serialises two setups */
        if ((int) q1('SELECT COUNT(*) AS n FROM users')['n'] > 0) fail(409, 'The owner account already exists. Sign in instead.');
        if ($owner === '') fail(403, 'The owner email has not been set for this shop yet.');
        if ($email !== $owner) fail(403, 'Only the shop owner’s email can create the first account.');
        $u = ['id' => uuid(), 'email' => $email, 'name' => $name, 'role' => 'owner'];
        q('INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?,?,?,?,?,?)',
            [$u['id'], $email, $name, 'owner', password_hash($password, PASSWORD_DEFAULT), now_db()]);
        return start_session($u);
    });
}

function auth_register(array $b): array
{
    [$email, $name, $password] = check_new_account($b);
    return tx(function () use ($email, $name, $password) {
        $inv = q1('SELECT email, name, role FROM invites WHERE email = ? FOR UPDATE', [$email]);
        if (!$inv) fail(403, 'This email has not been invited. Ask the shop owner to add you in Settings.');
        if (q1('SELECT 1 AS x FROM users WHERE email = ?', [$email])) fail(409, 'An account with this email already exists. Sign in instead.');
        $u = ['id' => uuid(), 'email' => $email, 'name' => $name ?: $inv['name'], 'role' => $inv['role']];
        q('INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?,?,?,?,?,?)',
            [$u['id'], $email, $u['name'], $u['role'], password_hash($password, PASSWORD_DEFAULT), now_db()]);
        q('DELETE FROM invites WHERE email = ?', [$email]);
        return start_session($u);
    });
}

function auth_login(array $b): array
{
    $email = strtolower(str_clean($b['email'] ?? '', 200));
    $u = q1('SELECT id, email, name, role, password_hash FROM users WHERE email = ?', [$email]);
    if (!$u || !password_verify((string) ($b['password'] ?? ''), $u['password_hash'])) {
        usleep(400000);
        fail(401, 'That email and password do not match.');
    }
    return tx(fn() => start_session($u));
}

function auth_logout(): ?array
{
    $t = bearer_token();
    if ($t) q('DELETE FROM sessions WHERE token_hash = ?', [hash('sha256', $t)]);
    return null;
}

/* ------------------------------------------------------------------
   Staff (owner only)
   ------------------------------------------------------------------ */
function staff_list(): array
{
    $users = array_map(fn($u) => ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role'], 'created_at' => iso_from_db($u['created_at'])],
        q('SELECT id, email, name, role, created_at FROM users ORDER BY created_at'));
    $invites = array_map(fn($i) => ['email' => $i['email'], 'name' => $i['name'], 'role' => $i['role'], 'created_at' => iso_from_db($i['created_at'])],
        q('SELECT email, name, role, created_at FROM invites ORDER BY created_at'));
    return ['users' => $users, 'invites' => $invites];
}

function staff_invite(array $b): array
{
    $email = strtolower(str_clean($b['email'] ?? '', 200));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) bad('Enter a valid email address.');
    $role = ($b['role'] ?? '') === 'owner' ? 'owner' : 'staff';
    if (q1('SELECT 1 AS x FROM users WHERE email = ?', [$email])) bad('That person already has an account.');
    q('INSERT INTO invites (email, name, role, created_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)',
        [$email, str_clean($b['name'] ?? '', 80), $role, now_db()]);
    return staff_list();
}

function staff_uninvite(string $email): array
{
    q('DELETE FROM invites WHERE email = ?', [strtolower($email)]);
    return staff_list();
}

function staff_remove(string $id, array $me): array
{
    if (!is_uuid($id)) fail(404, 'No such account.');
    if ($id === $me['id']) bad('You cannot remove your own account.');
    $owners = q("SELECT id FROM users WHERE role = 'owner'");
    if (count($owners) === 1 && $owners[0]['id'] === $id) bad('The shop needs at least one owner.');
    q('DELETE FROM users WHERE id = ?', [$id]);
    return staff_list();
}

/* ------------------------------------------------------------------
   Products
   ------------------------------------------------------------------ */
const WRITABLE = ['sku', 'name', 'category', 'badge', 'description', 'metal', 'karat', 'weight_g', 'stones', 'pricing_mode',
    'making_type', 'making_value', 'stone_value', 'fixed_price', 'show_price', 'images', 'low_stock_at', 'status'];

function normalise_product(array $v): array
{
    $images = [];
    foreach (is_array($v['images'] ?? null) ? $v['images'] : [] as $i) {
        if (!is_array($i) || !preg_match('#^https?://#i', (string) ($i['url'] ?? ''))) continue;
        $images[] = ['url' => substr((string) $i['url'], 0, 1000), 'alt' => str_clean($i['alt'] ?? '', 200)];
        if (count($images) >= 12) break;
    }
    $out = [
        'sku' => str_clean($v['sku'] ?? '', 40),
        'name' => str_clean($v['name'] ?? '', 120),
        'category' => in_array($v['category'] ?? '', CATEGORIES, true) ? $v['category'] : 'other',
        'badge' => str_clean($v['badge'] ?? '', 40),
        'description' => str_clean($v['description'] ?? '', 2000),
        'metal' => in_array($v['metal'] ?? '', METALS, true) ? $v['metal'] : 'other',
        'karat' => null,
        'weight_g' => num($v['weight_g'] ?? null),
        'stones' => str_clean($v['stones'] ?? '', 200),
        'pricing_mode' => ($v['pricing_mode'] ?? '') === 'fixed' ? 'fixed' : 'gold_rate',
        'making_type' => ($v['making_type'] ?? '') === 'flat' ? 'flat' : 'percent',
        'making_value' => max(0, num($v['making_value'] ?? null) ?? 0),
        'stone_value' => max(0, num($v['stone_value'] ?? null) ?? 0),
        'fixed_price' => max(0, num($v['fixed_price'] ?? null) ?? 0),
        'show_price' => ($v['show_price'] ?? true) !== false,
        'images' => $images,
        'low_stock_at' => (int) max(0, round(num($v['low_stock_at'] ?? null) ?? 0)),
        'status' => in_array($v['status'] ?? '', ['published', 'draft', 'archived'], true) ? $v['status'] : 'published',
    ];
    if (in_array($out['metal'], GOLD, true) && in_array((int) ($v['karat'] ?? 0), KARATS, true)) $out['karat'] = (int) $v['karat'];
    if ($out['weight_g'] !== null && $out['weight_g'] < 0) $out['weight_g'] = null;
    return $out;
}

function validate_product(array $v): void
{
    if ($v['name'] === '') bad('Give the piece a name.');
    if ($v['pricing_mode'] === 'gold_rate') {
        if (!in_array($v['metal'], GOLD, true)) bad('Only gold pieces can follow the gold rate. Use a fixed price for this one.');
        if (!$v['karat']) bad('Pick the karat, so the right gold rate is used.');
        if (!($v['weight_g'] > 0)) bad('Add the weight in grams — the gold-rate price needs it.');
    } elseif (!($v['fixed_price'] > 0)) bad('Add the price.');
}

function check_sku(string $sku, ?string $id): void
{
    foreach (q('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)', [$sku]) as $r) {
        if ($r['id'] !== $id) bad("Another piece already uses SKU $sku.");
    }
}

function next_sku(string $category): string
{
    $n = 100;
    foreach (q('SELECT sku FROM products') as $r) {
        if (preg_match('/(\d+)$/', $r['sku'], $m)) $n = max($n, (int) $m[1]);
    }
    return 'PJ-' . (SKU_CODES[$category] ?? 'OT') . '-' . str_pad((string) ($n + 1), 4, '0', STR_PAD_LEFT);
}

function product_params(array $v): array
{
    return [$v['sku'], $v['name'], $v['category'], $v['badge'], $v['description'], $v['metal'], $v['karat'], $v['weight_g'], $v['stones'],
        $v['pricing_mode'], $v['making_type'], $v['making_value'], $v['stone_value'], $v['fixed_price'], $v['show_price'] ? 1 : 0,
        jenc($v['images']), $v['low_stock_at'], $v['status']];
}

function renumber_featured(): void
{
    $i = 0;
    foreach (q('SELECT id FROM products WHERE featured_rank IS NOT NULL ORDER BY featured_rank, name') as $r) {
        q('UPDATE products SET featured_rank = ? WHERE id = ?', [++$i, $r['id']]);
    }
}

function next_featured_rank(): int
{
    return (int) q1('SELECT COALESCE(MAX(featured_rank), 0) + 1 AS n FROM products')['n'];
}

function products_list(array $p): array
{
    $where = [];
    $params = [];
    $status = $p['status'] ?? 'active';
    if ($status === '' || $status === 'active') $where[] = "status <> 'archived'";
    elseif ($status !== 'all') { $where[] = 'status = ?'; $params[] = $status; }
    if (!empty($p['category'])) { $where[] = 'category = ?'; $params[] = $p['category']; }
    if (!empty($p['featured'])) $where[] = 'featured_rank IS NOT NULL';
    if (!empty($p['search'])) {
        $where[] = "CONCAT_WS(' ', name, sku, stones, badge) LIKE ?";
        $params[] = '%' . addcslashes((string) $p['search'], '%_\\') . '%';
    }
    $rows = q('SELECT * FROM products ' . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY updated_at DESC', $params);
    return array_map('product_out', $rows);
}

function products_create(array $d, array $user): array
{
    return tx(function () use ($d, $user) {
        $s = get_settings();
        $v = normalise_product(array_merge(['making_value' => $s['default_making_percent'], 'low_stock_at' => $s['low_stock_default']], $d));
        validate_product($v);
        if ($v['sku'] === '') $v['sku'] = next_sku($v['category']);
        check_sku($v['sku'], null);
        $stock = [];
        foreach ($s['showrooms'] as $r) $stock[$r['id']] = 0;
        $id = uuid();
        $now = now_db();
        q('INSERT INTO products (sku, name, category, badge, description, metal, karat, weight_g, stones, pricing_mode, making_type,
             making_value, stone_value, fixed_price, show_price, images, low_stock_at, status, stock, id, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            array_merge(product_params($v), [jenc(obj($stock)), $id, $now, $now]));
        foreach (is_array($d['stock'] ?? null) ? $d['stock'] : [] as $room => $qty) {
            $qn = (int) round(num($qty) ?? 0);
            if ($qn > 0) move_stock($s, $id, (string) $room, $qn, 'received', 'Opening stock', '', $user['name']);
        }
        if (!empty($d['featured'])) q('UPDATE products SET featured_rank = ? WHERE id = ?', [next_featured_rank(), $id]);
        return get_product($id);
    });
}

function products_update(string $id, array $d): array
{
    return tx(function () use ($id, $d) {
        $cur = get_product($id, true);
        $merged = $cur;
        foreach (WRITABLE as $k) if (array_key_exists($k, $d)) $merged[$k] = $d[$k];
        $v = normalise_product($merged);
        validate_product($v);
        if ($v['sku'] === '') $v['sku'] = $cur['sku'];
        check_sku($v['sku'], $id);
        q('UPDATE products SET sku=?, name=?, category=?, badge=?, description=?, metal=?, karat=?, weight_g=?, stones=?, pricing_mode=?,
             making_type=?, making_value=?, stone_value=?, fixed_price=?, show_price=?, images=?, low_stock_at=?, status=?, updated_at=? WHERE id=?',
            array_merge(product_params($v), [now_db(), $id]));
        if (array_key_exists('featured', $d)) {
            if ($d['featured'] && !$cur['featured_rank']) {
                q('UPDATE products SET featured_rank = ? WHERE id = ?', [next_featured_rank(), $id]);
            } elseif (!$d['featured'] && $cur['featured_rank']) {
                q('UPDATE products SET featured_rank = NULL WHERE id = ?', [$id]);
                renumber_featured();
            }
        }
        return get_product($id);
    });
}

function products_remove(string $id): array
{
    return tx(function () use ($id) {
        $p = get_product($id, true);
        if (q1('SELECT 1 AS x FROM orders WHERE items LIKE ? LIMIT 1', ['%"product_id":"' . $id . '"%'])) {
            fail(409, "{$p['name']} appears on past orders, so it can’t be deleted. Set it to Archived instead — it disappears from the website but the order history stays intact.");
        }
        q('DELETE FROM products WHERE id = ?', [$id]);
        if ($p['featured_rank']) renumber_featured();
        return ['ok' => true];
    });
}

/* ------------------------------------------------------------------
   Stock
   ------------------------------------------------------------------ */
function stock_adjust(array $d, array $user): array
{
    return tx(function () use ($d, $user) {
        $s = get_settings();
        $p = get_product($d['product_id'] ?? '', true);
        $room = (string) ($d['showroom'] ?? '');
        if (!has_room($s, $room)) bad('Pick a showroom.');
        $stock = (array) $p['stock'];
        $have = (int) ($stock[$room] ?? 0);
        $reason = in_array($d['reason'] ?? '', ['received', 'removed', 'count'], true) ? $d['reason'] : 'adjustment';
        $delta = (int) round(num($d['delta'] ?? null) ?? 0);
        if ($reason === 'count') {
            $count = num($d['count'] ?? null);
            if ($count === null || $count < 0) bad('Enter how many pieces are on the shelf.');
            $delta = (int) round($count) - $have;
            if (!$delta) bad("The count matches what the system already has ($have).");
        }
        if (!$delta) bad('Enter how many pieces.');
        if ($have + $delta < 0) bad('There ' . ($have === 1 ? 'is' : 'are') . " only $have in " . room_name($s, $room) . '.');
        move_stock($s, $p['id'], $room, $delta, $reason, $d['note'] ?? '', '', $user['name']);
        return get_product($p['id']);
    });
}

function stock_transfer(array $d, array $user): array
{
    return tx(function () use ($d, $user) {
        $s = get_settings();
        $p = get_product($d['product_id'] ?? '', true);
        $from = (string) ($d['from'] ?? '');
        $to = (string) ($d['to'] ?? '');
        $qty = (int) round(num($d['qty'] ?? null) ?? 0);
        if ($from === $to) bad('Pick two different showrooms.');
        if ($qty <= 0) bad('Enter how many pieces to move.');
        $stock = (array) $p['stock'];
        $have = (int) ($stock[$from] ?? 0);
        if ($qty > $have) bad("Only $have in " . room_name($s, $from) . '.');
        $note = str_clean($d['note'] ?? '');
        move_stock($s, $p['id'], $from, -$qty, 'transfer_out', $note ?: 'Moved to ' . room_name($s, $to), '', $user['name']);
        move_stock($s, $p['id'], $to, $qty, 'transfer_in', $note ?: 'Moved from ' . room_name($s, $from), '', $user['name']);
        return get_product($p['id']);
    });
}

function stock_movements(array $p): array
{
    $params = [];
    $where = '';
    if (!empty($p['product_id'])) {
        if (!is_uuid($p['product_id'])) return [];
        $where = 'WHERE m.product_id = ?';
        $params[] = $p['product_id'];
    }
    $limit = (int) min(500, max(1, round(num($p['limit'] ?? null) ?? 100)));
    $rows = q("SELECT m.*, COALESCE(p.name, 'Deleted piece') AS product_name, COALESCE(p.sku, '') AS product_sku
                 FROM stock_movements m LEFT JOIN products p ON p.id = m.product_id
                 $where ORDER BY m.at DESC LIMIT $limit", $params);
    return array_map(fn($m) => [
        'id' => $m['id'], 'product_id' => $m['product_id'], 'showroom' => $m['showroom'], 'delta' => (int) $m['delta'],
        'reason' => $m['reason'], 'note' => $m['note'], 'order_number' => $m['order_number'],
        'at' => iso_from_db($m['at']), 'by' => $m['by_name'], 'product_name' => $m['product_name'], 'product_sku' => $m['product_sku'],
    ], $rows);
}

/* ------------------------------------------------------------------
   Gold rates
   ------------------------------------------------------------------ */
function rates_list(array $p): array
{
    ensure_today_rate();
    $limit = (int) min(400, max(1, round(num($p['limit'] ?? null) ?? 60)));
    return array_map('rate_out', q("SELECT * FROM gold_rates ORDER BY date DESC LIMIT $limit"));
}

function rates_save(array $d, array $user): array
{
    $g = is_array($d['per_gram'] ?? null) ? $d['per_gram'] : [];
    $per = [];
    foreach (KARATS as $k) {
        $v = num($g[$k] ?? $g[(string) $k] ?? null);
        if (!($v > 0)) bad("Enter the {$k}kt rate.");
        $per[$k] = round($v, 3); /* per gram, so a pawn (8 g) rate round-trips exactly */
    }
    $date = is_day($d['date'] ?? null) ? $d['date'] : colombo_day();
    q('INSERT INTO gold_rates (date, per_gram, updated_at, updated_by) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE per_gram = VALUES(per_gram), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)',
        [$date, jenc($per), now_db(), $user['name']]);
    return rate_out(q1('SELECT * FROM gold_rates WHERE date = ?', [$date]));
}

/* ------------------------------------------------------------------
   Orders
   ------------------------------------------------------------------ */
function pay_status(float $paid, float $total): string { return $paid <= 0 ? 'unpaid' : ($paid >= $total ? 'paid' : 'advance'); }
function hist(string $type, ?string $status, string $text, string $by): array
{
    return ['type' => $type, 'status' => $status, 'at' => now_iso(), 'text' => $text, 'by' => $by];
}

function normalise_items($items): array
{
    if (!is_array($items) || !$items) bad('Add at least one item to the order.');
    if (count($items) > 50) bad('That is too many items for one order.');
    $ids = [];
    foreach ($items as $it) if (is_array($it) && !empty($it['product_id'])) $ids[] = $it['product_id'];
    foreach ($ids as $id) if (!is_uuid($id)) bad('One of the pieces on this order no longer exists.');
    $byId = [];
    if ($ids) {
        $ph = implode(',', array_fill(0, count($ids), '?'));
        foreach (q("SELECT id, sku, name, images FROM products WHERE id IN ($ph)", array_values(array_unique($ids))) as $p) $byId[$p['id']] = $p;
    }
    $out = [];
    foreach ($items as $it) {
        if (!is_array($it)) bad('Every item needs a description.');
        $qty = (int) max(1, round(num($it['qty'] ?? null) ?? 1));
        $unit = max(0, num($it['unit_price'] ?? null) ?? 0);
        $name = str_clean($it['name'] ?? '', 160);
        if (!empty($it['product_id'])) {
            $p = $byId[$it['product_id']] ?? null;
            if (!$p) bad('One of the pieces on this order no longer exists.');
            $imgs = jdec($p['images']);
            $out[] = ['product_id' => $p['id'], 'sku' => $p['sku'], 'image' => $imgs[0]['url'] ?? '', 'name' => $name ?: $p['name'],
                'qty' => $qty, 'unit_price' => n($unit), 'note' => str_clean($it['note'] ?? '', 300), 'from_stock' => !empty($it['from_stock'])];
        } else {
            if ($name === '') bad('Every custom item needs a description.');
            $out[] = ['product_id' => null, 'sku' => '', 'image' => '', 'name' => $name, 'qty' => $qty, 'unit_price' => n($unit),
                'note' => str_clean($it['note'] ?? '', 300), 'from_stock' => false];
        }
    }
    return $out;
}

function build_order(array $s, array $d): array
{
    $c = is_array($d['customer'] ?? null) ? $d['customer'] : [];
    $customer = ['name' => str_clean($c['name'] ?? '', 120), 'phone' => str_clean($c['phone'] ?? '', 40),
        'email' => str_clean($c['email'] ?? '', 200), 'address' => str_clean($c['address'] ?? '', 500)];
    if ($customer['name'] === '') bad('Add the customer’s name.');
    if ($customer['phone'] === '') bad('Add the customer’s phone number, so the shop can reach them.');
    if (!has_room($s, $d['showroom'] ?? null)) bad('Pick a showroom.');
    $items = normalise_items($d['items'] ?? null);
    $subtotal = 0;
    foreach ($items as $it) $subtotal += $it['qty'] * $it['unit_price'];
    $discount = min($subtotal, max(0, num($d['discount'] ?? null) ?? 0));
    return [
        'channel' => in_array($d['channel'] ?? '', CHANNELS, true) ? $d['channel'] : 'walk_in',
        'showroom' => $d['showroom'],
        'customer' => $customer,
        'items' => $items,
        'subtotal' => $subtotal,
        'discount' => $discount,
        'total' => $subtotal - $discount,
        'fulfilment' => ($d['fulfilment'] ?? '') === 'delivery' ? 'delivery' : 'pickup',
        'due_date' => is_day($d['due_date'] ?? null) ? $d['due_date'] : null,
        'notes' => str_clean($d['notes'] ?? '', 2000),
    ];
}

/* What an order holds back from the shelves: ["productId|showroom" => qty] */
function held(?array $o): array
{
    $out = [];
    if (!$o || ($o['status'] ?? '') === 'cancelled') return $out;
    foreach ($o['items'] as $it) {
        if (empty($it['product_id']) || empty($it['from_stock'])) continue;
        $k = $it['product_id'] . '|' . $o['showroom'];
        $out[$k] = ($out[$k] ?? 0) + (int) $it['qty'];
    }
    return $out;
}

function reconcile(array $s, ?array $before, array $after, string $takeReason, string $returnReason, string $number, string $by): void
{
    $a = held($before);
    $b = held($after);
    $keys = array_unique(array_merge(array_keys($a), array_keys($b)));
    sort($keys); /* stable lock order */
    foreach ($keys as $k) {
        $diff = ($b[$k] ?? 0) - ($a[$k] ?? 0);
        if (!$diff) continue;
        [$pid, $room] = explode('|', $k, 2);
        $p = q1('SELECT id, name, stock FROM products WHERE id = ? FOR UPDATE', [$pid]);
        if (!$p) continue;
        $have = (int) (jdec($p['stock'])[$room] ?? 0);
        if ($diff > 0 && $have < $diff) bad("Only $have × {$p['name']} in " . room_name($s, $room) . '. Untick “from stock” to order it in.');
        move_stock($s, $pid, $room, -$diff, $diff > 0 ? $takeReason : $returnReason, '', $number, $by);
    }
}

function save_order_row(array $o): array
{
    q('UPDATE orders SET channel=?, showroom=?, customer=?, items=?, subtotal=?, discount=?, total=?, paid=?, payment_status=?, payments=?,
         fulfilment=?, due_date=?, status=?, tracking=?, notes=?, history=?, updated_at=? WHERE id=?',
        [$o['channel'], $o['showroom'], jenc(obj((array) $o['customer'])), jenc($o['items']), $o['subtotal'], $o['discount'], $o['total'], $o['paid'],
            pay_status((float) $o['paid'], (float) $o['total']), jenc($o['payments']), $o['fulfilment'], $o['due_date'], $o['status'],
            jenc(obj((array) $o['tracking'])), $o['notes'], jenc($o['history']), now_db(), $o['id']]);
    return get_order($o['id']);
}

function orders_list(array $p): array
{
    $where = [];
    $params = [];
    $st = $p['status'] ?? '';
    if ($st === 'open') $where[] = "status NOT IN ('completed', 'cancelled')";
    elseif (in_array($st, STATUSES, true)) { $where[] = 'status = ?'; $params[] = $st; }
    $limit = (int) min(2000, max(1, round(num($p['limit'] ?? null) ?? 500)));
    $rows = array_map('order_out', q('SELECT * FROM orders ' . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . " ORDER BY created_at DESC LIMIT $limit", $params));
    if (!empty($p['search'])) {
        $needle = preg_replace('/\s+/', '', mb_strtolower((string) $p['search']));
        $rows = array_values(array_filter($rows, function ($o) use ($needle) {
            $c = (array) $o['customer'];
            $hay = preg_replace('/\s+/', '', mb_strtolower($o['number'] . ($c['name'] ?? '') . ($c['phone'] ?? '')));
            return str_contains($hay, $needle);
        }));
    }
    return $rows;
}

function orders_create(array $d, array $user): array
{
    return tx(function () use ($d, $user) {
        $s = get_settings();
        $f = build_order($s, $d);
        /* The counter row stays locked until the transaction ends, and rolls
           back with it, so a refused order never leaves a gap in the numbers */
        q("UPDATE counters SET value = value + 1 WHERE name = 'order_number'");
        $number = 'PJ-' . q1("SELECT value FROM counters WHERE name = 'order_number'")['value'];
        $status = ($d['status'] ?? '') === 'completed' ? 'completed' : 'new';
        reconcile($s, null, ['status' => $status, 'showroom' => $f['showroom'], 'items' => $f['items']], 'sale', 'order_edited', $number, $user['name']);
        $history = [hist('status', 'new', 'Order created', $user['name'])];
        $payments = [];
        $paid = 0;
        $pay = is_array($d['payment'] ?? null) ? $d['payment'] : [];
        $amount = num($pay['amount'] ?? null) ?? 0;
        if ($amount > 0) {
            $method = isset(METHODS[$pay['method'] ?? '']) ? $pay['method'] : 'cash';
            $payments[] = ['amount' => n($amount), 'method' => $method, 'at' => now_iso(), 'note' => '', 'by' => $user['name']];
            $paid = $amount;
            $history[] = hist('payment', null, money($amount) . ' received · ' . METHODS[$method], $user['name']);
        }
        if ($status === 'completed') $history[] = hist('status', 'completed', 'Sold at the counter', $user['name']);
        $id = uuid();
        $now = now_db();
        q('INSERT INTO orders (id, number, created_at, updated_at, channel, showroom, customer, items, subtotal, discount, total, paid,
             payment_status, payments, fulfilment, due_date, status, tracking, notes, history)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$id, $number, $now, $now, $f['channel'], $f['showroom'], jenc($f['customer']), jenc($f['items']), $f['subtotal'], $f['discount'],
                $f['total'], $paid, pay_status($paid, $f['total']), jenc($payments), $f['fulfilment'], $f['due_date'], $status,
                jenc(['courier' => '', 'number' => '']), $f['notes'], jenc($history)]);
        return get_order($id);
    });
}

function orders_update(string $id, array $d, array $user): array
{
    return tx(function () use ($id, $d, $user) {
        $s = get_settings();
        $cur = get_order($id, true);
        $f = build_order($s, $d);
        $next = array_merge($cur, $f);
        reconcile($s, $cur, $next, 'sale', 'order_edited', $cur['number'], $user['name']);
        $next['history'] = array_merge($cur['history'], [hist('edit', null, 'Order details edited', $user['name'])]);
        return save_order_row($next);
    });
}

function orders_set_status(string $id, array $d, array $user): array
{
    return tx(function () use ($id, $d, $user) {
        $s = get_settings();
        if (!in_array($d['status'] ?? '', STATUSES, true)) bad('Unknown status.');
        $cur = get_order($id, true);
        $note = str_clean($d['note'] ?? '');
        if ($cur['status'] === $d['status'] && $note === '') bad('The order already has that status.');
        $next = array_merge($cur, ['status' => $d['status']]);
        if (is_array($d['tracking'] ?? null)) {
            $next['tracking'] = ['courier' => str_clean($d['tracking']['courier'] ?? '', 80), 'number' => str_clean($d['tracking']['number'] ?? '', 80)];
        }
        reconcile($s, $cur, $next, 'sale', 'order_cancelled', $cur['number'], $user['name']);
        $next['history'] = array_merge($cur['history'], [hist('status', $d['status'], $note, $user['name'])]);
        return save_order_row($next);
    });
}

function orders_add_payment(string $id, array $d, array $user): array
{
    return tx(function () use ($id, $d, $user) {
        $cur = get_order($id, true);
        $amount = num($d['amount'] ?? null);
        if (!($amount > 0)) bad('Enter the amount received.');
        $method = isset(METHODS[$d['method'] ?? '']) ? $d['method'] : 'cash';
        $note = str_clean($d['note'] ?? '', 200);
        $next = $cur;
        $next['payments'] = array_merge($cur['payments'], [['amount' => n($amount), 'method' => $method, 'at' => now_iso(), 'note' => $note, 'by' => $user['name']]]);
        $next['paid'] = array_sum(array_map(fn($x) => (float) $x['amount'], $next['payments']));
        $next['history'] = array_merge($cur['history'], [hist('payment', null, money($amount) . ' received · ' . METHODS[$method] . ($note !== '' ? ' — ' . $note : ''), $user['name'])]);
        return save_order_row($next);
    });
}

/* ------------------------------------------------------------------
   Reports — by Sri Lankan calendar day
   ------------------------------------------------------------------ */
function reports_sales(array $p): array
{
    $days = (int) min(366, max(1, round(num($p['days'] ?? null) ?? 14)));
    $rows = [];
    $index = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $date = colombo_day(time() - $i * 86400);
        $index[$date] = count($rows);
        $rows[] = ['date' => $date, 'total' => 0, 'orders' => 0];
    }
    foreach (q("SELECT created_at, total FROM orders WHERE status <> 'cancelled' AND created_at >= ?", [colombo_start($days - 1)]) as $o) {
        $date = colombo_day(strtotime($o['created_at'] . ' UTC'));
        if (!isset($index[$date])) continue;
        $rows[$index[$date]]['total'] = n($rows[$index[$date]]['total'] + (float) $o['total']);
        $rows[$index[$date]]['orders']++;
    }
    return $rows;
}

function reports_best_sellers(array $p): array
{
    $days = (int) round(num($p['days'] ?? null) ?? 0);
    $params = [];
    $where = "status <> 'cancelled'";
    if ($days > 0) { $where .= ' AND created_at >= ?'; $params[] = colombo_start($days - 1); }
    $tally = [];
    foreach (q("SELECT items FROM orders WHERE $where", $params) as $o) {
        foreach (jdec($o['items']) as $it) {
            if (empty($it['product_id'])) continue;
            $pid = $it['product_id'];
            $tally[$pid] ??= ['product_id' => $pid, 'units' => 0, 'revenue' => 0, 'orders' => 0];
            $tally[$pid]['units'] += (int) $it['qty'];
            $tally[$pid]['revenue'] += $it['qty'] * $it['unit_price'];
            $tally[$pid]['orders'] += 1;
        }
    }
    if (!$tally) return [];
    $ids = array_keys($tally);
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $out = [];
    foreach (q("SELECT id, name, sku, images, featured_rank, status FROM products WHERE id IN ($ph)", $ids) as $pr) {
        $t = $tally[$pr['id']];
        $out[] = array_merge($t, ['revenue' => n($t['revenue']), 'name' => $pr['name'], 'sku' => $pr['sku'], 'images' => jdec($pr['images']),
            'featured_rank' => $pr['featured_rank'] === null ? null : (int) $pr['featured_rank'], 'status' => $pr['status']]);
    }
    usort($out, fn($a, $b) => ($b['units'] <=> $a['units']) ?: ($b['revenue'] <=> $a['revenue']));
    return array_slice($out, 0, (int) min(200, max(1, round(num($p['limit'] ?? null) ?? 50))));
}

/* ------------------------------------------------------------------
   Homepage favourites, settings
   ------------------------------------------------------------------ */
function set_featured(array $b): array
{
    $ids = $b['product_ids'] ?? null;
    if (!is_array($ids)) bad('Send a list of product ids.');
    foreach ($ids as $id) if (!is_uuid($id)) bad('Send a list of product ids.');
    return tx(function () use ($ids) {
        q('UPDATE products SET featured_rank = NULL WHERE featured_rank IS NOT NULL');
        foreach (array_values($ids) as $i => $id) {
            if (!q1('SELECT id FROM products WHERE id = ?', [$id])) bad('One of those pieces no longer exists.');
            q('UPDATE products SET featured_rank = ? WHERE id = ?', [$i + 1, $id]);
        }
        return array_map('product_out', q('SELECT * FROM products WHERE featured_rank IS NOT NULL ORDER BY featured_rank'));
    });
}

function update_settings(array $d): array
{
    return tx(function () use ($d) {
        $r = q1('SELECT data FROM settings WHERE id = 1 FOR UPDATE');
        $s = array_merge(DEFAULT_SETTINGS, $r ? jdec($r['data']) : []);
        if (array_key_exists('shop_name', $d)) $s['shop_name'] = str_clean($d['shop_name'], 80) ?: $s['shop_name'];
        if (array_key_exists('website_prices', $d)) $s['website_prices'] = (bool) $d['website_prices'];
        foreach (['price_rounding', 'default_making_percent', 'low_stock_default', 'featured_limit'] as $k) {
            $v = num($d[$k] ?? null);
            if ($v !== null && $v >= 0) $s[$k] = n($v);
        }
        foreach ([['market_premium_percent', 0, 30], ['k22_percent_of_24k', 80, 100], ['k18_percent_of_24k', 60, 90]] as [$k, $lo, $hi]) {
            $v = num($d[$k] ?? null);
            if ($v === null) continue;
            if ($v < $lo || $v > $hi) bad("Keep that between $lo and $hi.");
            $s[$k] = n($v);
        }
        if (is_array($d['showrooms'] ?? null)) {
            foreach ($d['showrooms'] as $u) {
                foreach ($s['showrooms'] as &$room) {
                    if ($room['id'] === ($u['id'] ?? null)) {
                        $room['name'] = str_clean($u['name'] ?? '', 60) ?: $room['name'];
                        $room['phone'] = str_clean($u['phone'] ?? '', 40);
                        $room['address'] = str_clean($u['address'] ?? '', 200);
                    }
                }
                unset($room);
            }
        }
        q('INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [jenc($s)]);
        return $s;
    });
}

/* ------------------------------------------------------------------
   Photos — saved outside public_html, served through the API
   ------------------------------------------------------------------ */
function photos_dir(): string
{
    $dir = pj_data_dir() . '/uploads';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir;
}

function base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = preg_replace('/[^A-Za-z0-9.\-:]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    return ($https ? 'https' : 'http') . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'), '/');
}

function upload_photo(): array
{
    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) bad('Choose a photo to upload.');
    if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $f['size'] > 4 * 1024 * 1024) bad('That photo is too large. Use one under 4 MB.');
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) bad('The photo did not upload. Please try again.');
    $info = @getimagesize($f['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? null;
    if (!$ext) bad('That file is not a JPG, PNG or WebP photo.');
    $name = uuid() . '.' . $ext;
    if (!@move_uploaded_file($f['tmp_name'], photos_dir() . '/' . $name)) fail(500, 'The photo could not be saved on the server.');
    return ['url' => base_url() . '/photos/' . $name];
}

function serve_photo(string $name): never
{
    if (!preg_match('/^[0-9a-f\-]{36}\.(jpg|png|webp)$/', $name, $m)) { http_response_code(404); exit; }
    $file = photos_dir() . '/' . $name;
    if (!is_file($file)) { http_response_code(404); exit; }
    header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$m[1]]);
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
}

/* ------------------------------------------------------------------
   For the public website (no sign-in)
   ------------------------------------------------------------------ */
function public_gold_rate(): array
{
    ensure_today_rate();
    $r = latest_rate();
    if (!$r) fail(404, 'No gold rate has been entered yet.');
    $pg = (array) $r['per_gram'];
    $k = fn($karat) => ['gram' => (int) round((float) $pg[(string) $karat]), 'pawn' => (int) round((float) $pg[(string) $karat] * 8)];
    return [
        'source' => $r['updated_by'] === AUTO_BY ? 'market' : 'showroom',
        'currency' => 'LKR',
        'date' => $r['date'],
        'is_today' => $r['date'] === colombo_day(),
        'k24' => $k(24), 'k22' => $k(22), 'k18' => $k(18),
        'updated' => $r['updated_at'],
    ];
}

function public_market_rate(): array
{
    $s = DEFAULT_SETTINGS;
    try { if (pj_config()) $s = get_settings(); } catch (Throwable $e) { /* not set up yet: defaults */ }
    $r = market_rate($s);
    $k = fn($karat) => ['gram' => (int) round($r['per_gram'][$karat]), 'pawn' => (int) $r['pawn'][$karat]];
    return [
        'source' => 'market', 'currency' => 'LKR', 'date' => colombo_day(),
        'k24' => $k(24), 'k22' => $k(22), 'k18' => $k(18),
        'per_gram' => obj(array_map('n', $r['per_gram'])),
        'premium_percent' => $r['premium_percent'], 'usd_per_ounce' => $r['usd_per_ounce'], 'usd_lkr' => $r['usd_lkr'],
        'updated' => $r['updated'],
    ];
}

/* The gold-rate bar on the website asks for /api/gold. It shows the shop's
   own rate when the shop is set up, and the market rate until then. */
function website_gold(): array
{
    if (pj_config()) {
        try { return public_gold_rate(); } catch (Throwable $e) { error_log('pj website gold: ' . $e->getMessage()); }
    }
    return public_market_rate();
}

function public_products(array $p): array
{
    $s = get_settings();
    $rate = latest_rate();
    $rateArr = $rate ? ['per_gram' => (array) $rate['per_gram']] : null;
    $where = "status = 'published'";
    $params = [];
    if (!empty($p['featured'])) $where .= ' AND featured_rank IS NOT NULL';
    if (!empty($p['category'])) { $where .= ' AND category = ?'; $params[] = $p['category']; }
    $rows = q("SELECT * FROM products WHERE $where ORDER BY featured_rank IS NULL, featured_rank, name", $params);
    return array_map(function ($r) use ($s, $rateArr) {
        $pr = product_out($r);
        $price = $pr['show_price'] ? price_of($pr, $rateArr, $s['price_rounding']) : null;
        return ['id' => $pr['id'], 'name' => $pr['name'], 'category' => $pr['category'], 'badge' => $pr['badge'], 'metal' => $pr['metal'],
            'karat' => $pr['karat'], 'weight_g' => $pr['weight_g'], 'stones' => $pr['stones'], 'description' => $pr['description'],
            'images' => $pr['images'], 'featured_rank' => $pr['featured_rank'], 'price' => $price === null ? null : n($price)];
    }, $rows);
}

/* ------------------------------------------------------------------
   The website shop — the pieces published here, for /shop/
   Until the owner brings the website's own pieces in (Settings → Website
   shop), the shop keeps showing the pieces written into its files, so it is
   never empty; the "website_shop" setting is what switches it over.
   ------------------------------------------------------------------ */
const WEB_CATS = ['necklaces', 'earrings', 'rings', 'bracelets', 'bangles', 'pendants', 'bridal', 'watches'];
/* the website's filter for each admin category, and back */
const CAT_TO_WEB = ['rings' => 'rings', 'necklaces' => 'necklaces', 'earrings' => 'earrings', 'bangles' => 'bangles',
    'bracelets' => 'bracelets', 'pendants' => 'pendants', 'chains' => 'necklaces', 'sets' => 'bridal', 'other' => null];
const WEB_TO_CAT = ['necklaces' => 'necklaces', 'earrings' => 'earrings', 'rings' => 'rings', 'bracelets' => 'bracelets',
    'bangles' => 'bangles', 'pendants' => 'pendants', 'bridal' => 'sets', 'watches' => 'other'];

function website_pieces_file(): array
{
    $file = dirname(__DIR__) . '/seed/website-pieces.json';
    $data = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    return is_array($data['pieces'] ?? null) ? $data['pieces'] : [];
}

/* slugs of the website pieces already brought in */
function imported_slugs(): array
{
    $out = [];
    foreach (q('SELECT web FROM products WHERE web IS NOT NULL') as $r) {
        $w = jdec($r['web'], null);
        if (is_array($w) && !empty($w['slug'])) $out[$w['slug']] = true;
    }
    return $out;
}

function shop_import_status(): array
{
    $file = website_pieces_file();
    $have = imported_slugs();
    $waiting = 0;
    foreach ($file as $p) if (empty($have[$p['slug'] ?? ''])) $waiting++;
    return ['website_shop' => !empty(get_settings()['website_shop']), 'in_file' => count($file),
        'imported' => count($have), 'waiting' => $waiting];
}

/* Brings the website's pieces (api/seed/website-pieces.json, written by tools/export-pieces.js) in as
   products. Safe to repeat: a piece already brought in is skipped. Prices come across as fixed prices,
   exactly as the website showed them; stock starts at 0 until it is counted. */
function shop_import(): array
{
    return tx(function () {
        $s = get_settings();
        $have = imported_slugs();
        $origin = preg_replace('#/api$#', '', base_url());
        $stock = [];
        foreach ($s['showrooms'] as $r) $stock[$r['id']] = 0;
        $n = 100;
        foreach (q('SELECT sku FROM products') as $r) if (preg_match('/(\d+)$/', $r['sku'], $m)) $n = max($n, (int) $m[1]);
        $added = 0;
        $now = gmdate('U');
        foreach (website_pieces_file() as $p) {
            $slug = (string) ($p['slug'] ?? '');
            if ($slug === '' || !empty($have[$slug])) continue;
            $cats = array_values(array_intersect((array) ($p['cats'] ?? []), WEB_CATS));
            $category = WEB_TO_CAT[$cats[0] ?? ''] ?? 'other';
            $watch = in_array('watches', $cats, true);
            $karat = in_array((int) ($p['karat'] ?? 0), KARATS, true) ? (int) $p['karat'] : null;
            $gold = !$watch && ($karat || stripos((string) $p['name'], 'gold') !== false);
            $weightText = (string) ($p['weight'] ?? '');
            /* one plain weight becomes the product's weight; a set or a range stays as printed */
            $weight = preg_match('/^\s*(\d+(?:\.\d+)?)\s*g\s*$/', $weightText, $m) ? (float) $m[1] : null;
            $images = [];
            for ($i = 1; $i <= max(1, (int) ($p['photos'] ?? 1)); $i++) {
                $images[] = ['url' => $origin . '/assets/img/shop/' . $slug . ($i > 1 ? '-' . $i : '') . '.webp', 'alt' => str_clean($p['name'], 200)];
            }
            $web = ['slug' => $slug, 'kind' => (string) ($p['kind'] ?? ''), 'cats' => $cats, 'weight' => $weightText,
                'weight_g_src' => $weight, 'order' => (int) ($p['order'] ?? 0)];
            foreach (['note', 'ig', 'bestseller', 'brand', 'line', 'specs', 'casio', 'credit'] as $k) {
                if (isset($p[$k]) && $p[$k] !== '') $web[$k] = $p[$k];
            }
            $price = max(0, (float) ($p['price'] ?? 0));
            $sku = 'PJ-' . (SKU_CODES[$category] ?? 'OT') . '-' . str_pad((string) (++$n), 4, '0', STR_PAD_LEFT);
            /* created_at follows the website's order, so "newest first" in the admin matches the shop */
            $at = gmdate('Y-m-d H:i:s', $now - (int) ($p['order'] ?? 0)) . '.000';
            q('INSERT INTO products (id, sku, name, category, badge, description, metal, karat, weight_g, stones, pricing_mode,
                 making_type, making_value, stone_value, fixed_price, show_price, images, stock, low_stock_at, status,
                 featured_rank, created_at, updated_at, web)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [uuid(), $sku, str_clean($p['name'], 120), $category, !empty($p['bestseller']) ? 'Best seller' : '',
                 str_clean($p['about'] ?? '', 2000), $gold ? 'yellow_gold' : 'other', $gold ? $karat : null, $weight, '',
                 'fixed', 'percent', $s['default_making_percent'], 0, $price, $price > 0 ? 1 : 0, jenc($images),
                 jenc(obj($stock)), 0, 'published', null, $at, $at, jenc($web)]);
            $added++;
        }
        /* from now on the website shop shows the pieces published here */
        $r = q1('SELECT data FROM settings WHERE id = 1 FOR UPDATE');
        $cur = array_merge(DEFAULT_SETTINGS, $r ? jdec($r['data']) : []);
        $cur['website_shop'] = true;
        q('INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [jenc($cur)]);
        return ['added' => $added] + shop_import_status();
    });
}

/* GET /api/public/shop — what /shop/ shows. {source:'website'} means "keep the pieces in your own files". */
function public_shop(): array
{
    $s = get_settings();
    $showPrices = !empty($s['website_prices']);
    if (empty($s['website_shop'])) return ['source' => 'website', 'show_prices' => $showPrices];
    $rate = latest_rate();
    $rateArr = $rate ? ['per_gram' => (array) $rate['per_gram']] : null;
    $pieces = [];
    foreach (q("SELECT * FROM products WHERE status = 'published' ORDER BY created_at DESC") as $r) {
        $pr = product_out($r);
        /* with prices off, none leave the server */
        $price = $showPrices && $pr['show_price'] ? price_of($pr, $rateArr, $s['price_rounding']) : null;
        /* the site's own photos are given as paths, so they keep working if the domain changes */
        $images = array_map(function ($i) {
            $path = parse_url($i['url'], PHP_URL_PATH) ?: '';
            return ['url' => str_starts_with($path, '/assets/img/') ? $path : $i['url'], 'alt' => $i['alt']];
        }, $pr['images']);
        $web = jdec($r['web'] ?? null, null);
        $pieces[] = ['id' => $pr['id'], 'sku' => $pr['sku'], 'name' => $pr['name'], 'category' => $pr['category'],
            'badge' => $pr['badge'], 'metal' => $pr['metal'], 'karat' => $pr['karat'], 'weight_g' => $pr['weight_g'],
            'stones' => $pr['stones'], 'description' => $pr['description'], 'images' => $images,
            'price' => $price === null ? null : n($price), 'created_at' => $pr['created_at'],
            'web' => is_array($web) ? $web : null];
    }
    return ['source' => 'admin', 'show_prices' => $showPrices, 'pieces' => $pieces];
}

/* ------------------------------------------------------------------
   Order tracking from the website — order number + last 4 digits of the
   customer's mobile. Answers with the progress only: no prices, payments
   or customer details. Wrong guesses are counted per visitor.
   ------------------------------------------------------------------ */
const TRACK_TRIES = 12;          /* lookups per visitor ... */
const TRACK_WINDOW = 900;        /* ... in 15 minutes */

function track_visitor(): string
{
    $ip = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
    $fwd = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0]);
    return hash('sha256', ($fwd ?: $ip) . '|' . (pj_config()['db_name'] ?? 'pj'));
}

function public_track(array $p): array
{
    $who = track_visitor();
    $since = gmdate('Y-m-d H:i:s', time() - TRACK_WINDOW);
    $tries = (int) (q1('SELECT COUNT(*) AS c FROM track_attempts WHERE who = ? AND at > ?', [$who, $since])['c'] ?? 0);
    if ($tries >= TRACK_TRIES) fail(429, 'Too many tries. Please wait 15 minutes, or ask us on WhatsApp.', 'too_many');
    q('INSERT INTO track_attempts (who, at) VALUES (?, ?)', [$who, now_db()]);
    if (random_int(1, 50) === 1) q('DELETE FROM track_attempts WHERE at < ?', [gmdate('Y-m-d H:i:s', time() - 86400)]);

    $digits = preg_replace('/\D/', '', (string) ($p['number'] ?? ''));
    $last4 = preg_replace('/\D/', '', (string) ($p['phone'] ?? ''));
    $notFound = fn() => fail(404, 'We could not find an order with that number and mobile. Check the number on your receipt.', 'not_found');
    if ($digits === '' || strlen($last4) !== 4) $notFound();
    $r = q1('SELECT * FROM orders WHERE number = ?', ['PJ-' . ltrim($digits, '0')]);
    if (!$r) $notFound();
    $o = order_out($r);
    $phone = preg_replace('/\D/', '', (string) (((array) $o['customer'])['phone'] ?? ''));
    if (strlen($phone) < 4 || !hash_equals(substr($phone, -4), $last4)) $notFound();

    $s = get_settings();
    $room = room_name($s, $o['showroom']);
    $delivery = $o['fulfilment'] === 'delivery';
    $when = [];
    foreach ($o['history'] as $h) if (($h['type'] ?? '') === 'status' && !empty($h['status'])) $when[$h['status']] = $h['at'] ?? null;
    $when['new'] = $when['new'] ?? $o['created_at'];
    $steps = [
        ['new', 'Order placed', 'We have your order.'],
        ['confirmed', 'Confirmed', 'Design, karat and weight agreed.'],
        ['in_making', 'With the goldsmith', 'Your piece is being made.'],
        ['ready', $delivery ? 'Ready to send' : 'Ready to collect', $delivery ? 'Packed and ready to go out.' : "Collect it from our $room showroom."],
    ];
    if ($delivery) $steps[] = ['dispatched', 'On its way', 'Sent out to you.'];
    $steps[] = ['completed', $delivery ? 'Delivered' : 'Collected', 'Handed over to you. Thank you.'];
    $keys = array_column($steps, 0);
    $cur = array_search($o['status'] === 'dispatched' && !$delivery ? 'ready' : $o['status'], $keys, true);
    $out = [];
    foreach ($steps as $i => [$key, $label, $text]) {
        $out[] = ['key' => $key, 'label' => $label, 'text' => $text, 'at' => $when[$key] ?? null,
            'state' => $cur === false ? '' : ($i < $cur ? 'done' : ($i === $cur ? ($key === 'completed' ? 'done' : 'current') : ''))];
    }
    $tracking = (array) $o['tracking'];
    return [
        'number' => $o['number'], 'status' => $o['status'], 'cancelled' => $o['status'] === 'cancelled',
        'fulfilment' => $o['fulfilment'], 'showroom' => $room, 'due_date' => $o['due_date'],
        'items' => array_values(array_map(fn($i) => ['name' => $i['name'], 'qty' => (int) ($i['qty'] ?? 1)], $o['items'])),
        'steps' => $out, 'updated_at' => $o['updated_at'],
        'tracking' => $delivery && ($tracking['number'] ?? '') !== '' ? ['courier' => $tracking['courier'] ?? '', 'number' => $tracking['number']] : null,
    ];
}

/* ------------------------------------------------------------------
   Routing
   ------------------------------------------------------------------ */
function routes(): array
{
    return [
        ['GET', 'health', ['public' => true], function () { q('SELECT 1'); return ['ok' => true, 'mode' => 'live']; }],
        ['GET', 'gold', ['public' => true, 'noDb' => true], fn() => website_gold()],
        ['GET', 'photos/:name', ['public' => true, 'noDb' => true], fn($r) => serve_photo($r['params']['name'])],
        ['GET', 'auth/status', ['public' => true], fn() => auth_status()],
        ['POST', 'auth/setup', ['public' => true], fn($r) => auth_setup($r['body'])],
        ['POST', 'auth/register', ['public' => true], fn($r) => auth_register($r['body'])],
        ['POST', 'auth/login', ['public' => true], fn($r) => auth_login($r['body'])],
        ['POST', 'auth/logout', ['public' => true], fn() => auth_logout()],
        ['GET', 'auth/me', [], fn($r) => public_user($r['user'])],
        ['GET', 'public/products', ['public' => true], fn($r) => public_products($r['query'])],
        ['GET', 'public/gold-rate', ['public' => true], fn() => public_gold_rate()],
        ['GET', 'public/market-rate', ['public' => true, 'noDb' => true], fn() => public_market_rate()],
        ['GET', 'public/shop', ['public' => true], fn() => public_shop()],
        ['GET', 'public/track', ['public' => true], fn($r) => public_track($r['query'])],

        ['GET', 'shop/import', ['owner' => true], fn() => shop_import_status()],
        ['POST', 'shop/import', ['owner' => true], fn() => shop_import()],

        ['GET', 'staff', ['owner' => true], fn() => staff_list()],
        ['POST', 'staff/invites', ['owner' => true], fn($r) => staff_invite($r['body'])],
        ['DELETE', 'staff/invites/:email', ['owner' => true], fn($r) => staff_uninvite($r['params']['email'])],
        ['DELETE', 'staff/:id', ['owner' => true], fn($r) => staff_remove($r['params']['id'], $r['user'])],

        ['GET', 'products', [], fn($r) => products_list($r['query'])],
        ['POST', 'products', [], fn($r) => products_create($r['body'], $r['user'])],
        ['GET', 'products/:id', [], fn($r) => get_product($r['params']['id'])],
        ['PUT', 'products/:id', [], fn($r) => products_update($r['params']['id'], $r['body'])],
        ['DELETE', 'products/:id', [], fn($r) => products_remove($r['params']['id'])],
        ['POST', 'uploads', [], fn() => upload_photo()],

        ['POST', 'stock/adjust', [], fn($r) => stock_adjust($r['body'], $r['user'])],
        ['POST', 'stock/transfer', [], fn($r) => stock_transfer($r['body'], $r['user'])],
        ['GET', 'stock/movements', [], fn($r) => stock_movements($r['query'])],

        ['GET', 'gold-rates', [], fn($r) => rates_list($r['query'])],
        ['POST', 'gold-rates', [], fn($r) => rates_save($r['body'], $r['user'])],

        ['GET', 'orders', [], fn($r) => orders_list($r['query'])],
        ['POST', 'orders', [], fn($r) => orders_create($r['body'], $r['user'])],
        ['GET', 'orders/:id', [], fn($r) => get_order($r['params']['id'])],
        ['PUT', 'orders/:id', [], fn($r) => orders_update($r['params']['id'], $r['body'], $r['user'])],
        ['POST', 'orders/:id/status', [], fn($r) => orders_set_status($r['params']['id'], $r['body'], $r['user'])],
        ['POST', 'orders/:id/payments', [], fn($r) => orders_add_payment($r['params']['id'], $r['body'], $r['user'])],

        ['GET', 'reports/sales', [], fn($r) => reports_sales($r['query'])],
        ['GET', 'reports/best-sellers', [], fn($r) => reports_best_sellers($r['query'])],
        ['PUT', 'homepage/featured', [], fn($r) => set_featured($r['body'])],
        ['GET', 'settings', [], fn() => get_settings()],
        ['PUT', 'settings', [], fn($r) => update_settings($r['body'])],
    ];
}

function match_route(string $method, string $path): ?array
{
    $parts = array_values(array_filter(explode('/', $path), 'strlen'));
    foreach (routes() as [$m, $pattern, $opts, $fn]) {
        if ($m !== $method) continue;
        $segs = explode('/', $pattern);
        if (count($segs) !== count($parts)) continue;
        $params = [];
        $ok = true;
        foreach ($segs as $i => $seg) {
            if ($seg !== '' && $seg[0] === ':') $params[substr($seg, 1)] = rawurldecode($parts[$i]);
            elseif ($seg !== $parts[$i]) { $ok = false; break; }
        }
        if ($ok) return ['opts' => $opts, 'fn' => $fn, 'params' => $params];
    }
    return null;
}

function send_json(int $status, $body): never
{
    http_response_code($status);
    header('Cache-Control: no-store');
    if ($body === null) exit;
    header('Content-Type: application/json; charset=utf-8');
    echo jenc($body);
    exit;
}

function handle_request(string $method, string $path): never
{
    try {
        $route = match_route($method, $path);
        if (!$route) fail(404, 'No such API route.');
        if (empty($route['opts']['noDb'])) pj_ensure_schema(db(), DEFAULT_SETTINGS);

        $body = [];
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'json') !== false) {
            $raw = file_get_contents('php://input');
            if ($raw !== '' && $raw !== false) {
                $body = json_decode($raw, true);
                if (!is_array($body)) bad('The request was not valid JSON.');
            }
        }
        $ctx = ['body' => $body, 'query' => $_GET, 'params' => $route['params']];
        if (empty($route['opts']['public'])) {
            $ctx['user'] = current_user();
            if (!empty($route['opts']['owner']) && $ctx['user']['role'] !== 'owner') fail(403, 'Only the shop owner can do that.');
        }
        $out = ($route['fn'])($ctx);
        if ($path === 'gold') {
            /* the website's gold bar: short cache, so a saved counter rate shows within minutes */
            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: public, max-age=300');
            echo jenc($out);
            exit;
        }
        if ($out === null) send_json(204, null);
        send_json($method === 'POST' && in_array($path, ['products', 'orders'], true) ? 201 : 200, $out);
    } catch (HttpError $e) {
        send_json($e->status, $e->code_name ? ['error' => $e->getMessage(), 'code' => $e->code_name] : ['error' => $e->getMessage()]);
    } catch (PDOException $e) {
        if (($e->errorInfo[1] ?? 0) == 1062) send_json(409, ['error' => 'That already exists.']);
        error_log('pj api: ' . $e->getMessage());
        send_json(500, ['error' => 'Something went wrong on the server. Please try again.']);
    } catch (Throwable $e) {
        error_log('pj api: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        send_json(500, ['error' => 'Something went wrong on the server. Please try again.']);
    }
}
