<?php
/* ==========================================================================
   Pushpa Jewellers — shop API on Hostinger (PHP 8 + MySQL/MariaDB).
   Shared pieces: where private files live, the database, small helpers.

   Private files (database settings, product photos, caches) live OUTSIDE
   public_html, in a "pj-data" folder next to it, so a redeploy from GitHub
   can never delete them and the web can never read them directly.
   ========================================================================== */

const PJ_COLOMBO_OFFSET = 19800; /* Sri Lanka is UTC+5:30 all year */

class HttpError extends Exception
{
    public int $status;
    public ?string $code_name;
    public function __construct(int $status, string $message, ?string $code = null)
    {
        parent::__construct($message);
        $this->status = $status;
        $this->code_name = $code;
    }
}

function fail(int $status, string $message, ?string $code = null): never { throw new HttpError($status, $message, $code); }
function bad(string $message): never { throw new HttpError(422, $message); }

/* ---------- where private files live ---------- */
function pj_data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;
    $env = getenv('PJ_DATA_DIR');
    if ($env) return $dir = rtrim($env, '/');
    $webRoot = dirname(__DIR__, 2);                 /* public_html */
    $outside = dirname($webRoot) . '/pj-data';      /* next to public_html */
    if ((is_dir($outside) || @mkdir($outside, 0750, true)) && is_writable($outside)) return $dir = $outside;
    /* Fallback: inside the API folder, blocked from the web by api/.htaccess */
    $inside = dirname(__DIR__) . '/data';
    if (!is_dir($inside)) @mkdir($inside, 0750, true);
    if (!is_file($inside . '/.htaccess')) @file_put_contents($inside . '/.htaccess', "Require all denied\n");
    return $dir = $inside;
}

function pj_config(): ?array
{
    static $cfg = false;
    if ($cfg !== false) return $cfg;
    $file = pj_data_dir() . '/config.php';
    $cfg = is_file($file) ? (require $file) : null;
    if (!is_array($cfg)) $cfg = null;
    return $cfg;
}

function pj_write_config(array $cfg): void
{
    $php = "<?php\n// Pushpa Jewellers shop API settings. Written by api/install.php.\nreturn " . var_export($cfg, true) . ";\n";
    $file = pj_data_dir() . '/config.php';
    if (@file_put_contents($file, $php, LOCK_EX) === false) fail(500, 'Could not save the settings file in ' . pj_data_dir() . '.');
    @chmod($file, 0640);
}

/* ---------- database ---------- */
function pj_connect(array $cfg): PDO
{
    $dsn = 'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    if (isset($GLOBALS['PJ_TEST_PDO'])) return $pdo = $GLOBALS['PJ_TEST_PDO']; /* automated tests only */
    $cfg = pj_config();
    if (!$cfg) fail(503, 'The shop is not set up yet. Open /api/install.php to connect the database.', 'not_installed');
    try {
        $pdo = pj_connect($cfg);
    } catch (PDOException $e) {
        error_log('pj db connect: ' . $e->getMessage());
        fail(503, 'The shop database cannot be reached just now. Please try again in a minute.', 'db_unavailable');
    }
    return $pdo;
}

function q(string $sql, array $params = []): array
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->columnCount() ? $st->fetchAll() : [];
}

function q1(string $sql, array $params = []): ?array
{
    $rows = q($sql, $params);
    return $rows[0] ?? null;
}

function tx(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $out = $fn();
        $pdo->commit();
        return $out;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/* ---------- small helpers ---------- */
function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
function is_uuid($v): bool { return is_string($v) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v) === 1; }
function is_day($v): bool { return is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1; }

/* ISO 8601 UTC with milliseconds, as the admin expects */
function now_iso(): string
{
    $t = microtime(true);
    return gmdate('Y-m-d\TH:i:s', (int) $t) . sprintf('.%03dZ', (int) (($t - floor($t)) * 1000));
}
/* DATETIME(3) value for the database */
function now_db(): string
{
    $t = microtime(true);
    return gmdate('Y-m-d H:i:s', (int) $t) . sprintf('.%03d', (int) (($t - floor($t)) * 1000));
}
function iso_from_db(?string $v): ?string
{
    if ($v === null || $v === '') return null;
    $v = str_replace(' ', 'T', $v);
    if (!str_contains($v, '.')) $v .= '.000';
    return substr($v, 0, 23) . 'Z';
}
function db_from_iso(string $iso): string { return gmdate('Y-m-d H:i:s', strtotime($iso)); }

function colombo_day(?int $ts = null): string { return gmdate('Y-m-d', ($ts ?? time()) + PJ_COLOMBO_OFFSET); }
/* UTC DATETIME of the start of the Colombo day N days ago */
function colombo_start(int $daysAgo): string
{
    $midnight = strtotime(colombo_day() . ' 00:00:00 UTC') - PJ_COLOMBO_OFFSET - $daysAgo * 86400;
    return gmdate('Y-m-d H:i:s', $midnight);
}

function str_clean($v, int $max = 500): string { return mb_substr(trim((string) ($v ?? '')), 0, $max); }
function num($v): ?float
{
    if ($v === '' || $v === null || is_bool($v) || is_array($v) || !is_numeric($v)) return null;
    return (float) $v;
}
function money(float $n): string { return 'Rs ' . number_format(round($n)); }
function jenc($v): string { return json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
function jdec(?string $s, $empty = [])
{
    if ($s === null || $s === '') return $empty;
    $v = json_decode($s, true);
    return $v === null ? $empty : $v;
}
/* Keep {} as an object in JSON even when empty */
function obj($a) { return (is_array($a) && !$a) ? new stdClass() : $a; }
/* Whole numbers go out as ints, so JSON shows 745000 and not 745000.0 */
function n($v)
{
    if ($v === null) return null;
    $f = (float) $v;
    return (floor($f) == $f && abs($f) < 9e15) ? (int) $f : $f;
}

/* ---------- HTTP fetch for the market gold price ---------- */
function fetch_json(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_USERAGENT => 'PushpaJewellers/1.0',
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) throw new RuntimeException("$url answered $code");
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException("$url sent bad JSON");
    return $data;
}
