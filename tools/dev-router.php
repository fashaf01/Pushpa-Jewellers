<?php
/* Local preview with PHP's own server, gold bar and admin included:
     php -S localhost:8000 tools/dev-router.php
   /api/* goes to the backend, as api/.htaccess does on Hostinger; everything else is served as a file. */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (preg_match('#^/api(/|$)#', $path) && $path !== '/api/install.php') {
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    chdir(dirname(__DIR__) . '/api');
    require dirname(__DIR__) . '/api/index.php';
    return true;
}
return false;
