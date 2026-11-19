<?php
/* Pushpa Jewellers — one-time set-up page.
   Connects the shop to the MySQL database made in hPanel and saves the
   settings in pj-data/config.php, outside public_html. Once that file
   exists this page only says the shop is set up; it never changes anything again.
   To start over, delete pj-data/config.php in hPanel's File Manager. */

require __DIR__ . '/src/bootstrap.php';
require __DIR__ . '/src/schema.php';
require __DIR__ . '/src/app.php';

ini_set('display_errors', '0');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$installed = pj_config() !== null;
$error = '';
$done = false;
$in = ['db_name' => '', 'db_user' => '', 'db_host' => 'localhost', 'owner_email' => ''];

if (!$installed && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    foreach ($in as $k => $_) $in[$k] = trim((string) ($_POST[$k] ?? $in[$k]));
    $pass = (string) ($_POST['db_pass'] ?? '');
    $in['owner_email'] = strtolower($in['owner_email']);
    try {
        if ($in['db_name'] === '' || $in['db_user'] === '') throw new RuntimeException('Fill in the database name and username from hPanel.');
        /* Only a database on this hosting account: nobody else can point the shop at theirs */
        if (!in_array(strtolower($in['db_host']), ['localhost', '127.0.0.1'], true)) throw new RuntimeException('The database host must be localhost (what hPanel shows for databases on this plan).');
        if (!filter_var($in['owner_email'], FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Enter the owner’s email address. Only this email can create the first admin account.');
        $cfg = ['db_host' => $in['db_host'], 'db_name' => $in['db_name'], 'db_user' => $in['db_user'], 'db_pass' => $pass, 'owner_email' => $in['owner_email']];
        try {
            $pdo = pj_connect($cfg);
        } catch (PDOException $e) {
            throw new RuntimeException('Could not connect with those details. Check the database name, username and password in hPanel → Databases, and try again.');
        }
        foreach (glob(pj_data_dir() . '/schema-v*.ok') ?: [] as $marker) @unlink($marker);
        pj_ensure_schema($pdo, DEFAULT_SETTINGS);
        pj_write_config($cfg);
        $done = true;
    } catch (HttpError | RuntimeException $e) {
        $error = $e->getMessage();
    } catch (Throwable $e) {
        error_log('pj install: ' . $e->getMessage());
        $error = 'Something went wrong while setting up. Please try again.';
    }
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Shop set-up · Pushpa Jewellers</title>
<style>
  :root { --plum: #3b0a25; --gold: #b8892b; --ink: #2a1a22; --muted: #6d5a63; --line: #e7dcd2; --bg: #faf6f1; --card: #fff; --err: #a3271f; --ok: #1f6b3a; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
  main { max-width: 520px; margin: 0 auto; padding: 40px 16px 64px; }
  h1 { font: 500 28px/1.2 Georgia, "Times New Roman", serif; color: var(--plum); margin: 0 0 6px; }
  .lead { color: var(--muted); margin: 0 0 24px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 22px; }
  label { display: block; font-weight: 600; font-size: 14px; margin: 16px 0 6px; }
  label:first-child { margin-top: 0; }
  .hint { font-weight: 400; color: var(--muted); font-size: 13px; display: block; margin-top: 2px; }
  input { width: 100%; font: inherit; padding: 11px 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
  input:focus { outline: 2px solid var(--gold); outline-offset: 1px; border-color: var(--gold); }
  button, .btn { display: inline-block; margin-top: 22px; width: 100%; text-align: center; font: 600 16px/1 inherit; font-family: inherit;
    padding: 14px; border: 0; border-radius: 8px; background: var(--plum); color: #fff; cursor: pointer; text-decoration: none; }
  button:hover, .btn:hover { background: #57153a; }
  .msg { border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; font-size: 15px; }
  .msg--err { background: #fbeceb; color: var(--err); border: 1px solid #f0c9c6; }
  .msg--ok { background: #e9f5ee; color: var(--ok); border: 1px solid #c3e2cf; }
  ol { padding-left: 20px; margin: 0; } li { margin: 6px 0; }
  details { margin-top: 16px; font-size: 14px; color: var(--muted); } summary { cursor: pointer; }
  code { background: #f3ece4; padding: 1px 5px; border-radius: 4px; font-size: 14px; }
</style>
</head>
<body>
<main>
  <h1>Pushpa Jewellers · shop set-up</h1>
<?php if ($done): ?>
  <p class="lead">The shop is connected to its database.</p>
  <div class="card">
    <div class="msg msg--ok">Set-up is complete. This page is now locked.</div>
    <ol>
      <li>Open the admin panel.</li>
      <li>Choose <strong>Set up the shop</strong> and create your account with <strong><?= $h($in['owner_email']) ?></strong>.</li>
      <li>From then on, sign in there to change gold rates, products, orders and settings.</li>
    </ol>
    <a class="btn" href="../admin/">Open the admin panel</a>
  </div>
<?php elseif ($installed): ?>
  <p class="lead">The shop is already set up.</p>
  <div class="card">
    <p style="margin-top:0">Sign in to the admin panel to make changes.</p>
    <a class="btn" href="../admin/">Open the admin panel</a>
    <details><summary>Need to connect a different database?</summary>
      <p>In hPanel → File Manager, delete <code>pj-data/config.php</code> (it sits next to <code>public_html</code>), then reload this page.</p>
    </details>
  </div>
<?php else: ?>
  <p class="lead">One-time step: connect the website to the database you made in hPanel → <strong>Databases</strong>.</p>
  <div class="card">
    <?php if ($error): ?><div class="msg msg--err"><?= $h($error) ?></div><?php endif; ?>
    <form method="post" autocomplete="off">
      <label for="db_name">Database name <span class="hint">Looks like u123456789_pushpa</span></label>
      <input id="db_name" name="db_name" required value="<?= $h($in['db_name']) ?>">

      <label for="db_user">Database username <span class="hint">Also looks like u123456789_…</span></label>
      <input id="db_user" name="db_user" required value="<?= $h($in['db_user']) ?>">

      <label for="db_pass">Database password <span class="hint">The one you chose when making the database</span></label>
      <input id="db_pass" name="db_pass" type="password" required>

      <label for="owner_email">Owner’s email <span class="hint">Only this email can create the first admin account</span></label>
      <input id="owner_email" name="owner_email" type="email" required value="<?= $h($in['owner_email']) ?>">

      <details><summary>Advanced</summary>
        <label for="db_host">Database host</label>
        <input id="db_host" name="db_host" value="<?= $h($in['db_host']) ?>">
      </details>

      <button type="submit">Connect the shop</button>
    </form>
  </div>
<?php endif; ?>
</main>
</body>
</html>
