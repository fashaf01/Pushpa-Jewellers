<?php
/* Pushpa Jewellers — shop API entry point. Every /api/* request lands here
   (see api/.htaccess). The endpoints are in src/app.php; docs/API.md is the contract. */

require __DIR__ . '/src/bootstrap.php';
require __DIR__ . '/src/schema.php';
require __DIR__ . '/src/app.php';

ini_set('display_errors', '0');
date_default_timezone_set('UTC');

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
$path = trim(substr($uri, strlen($base)), '/');
if ($path === 'index.php') $path = '';

handle_request(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path);
