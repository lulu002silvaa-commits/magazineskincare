<?php
declare(strict_types=1);
require __DIR__ . '/php/bootstrap.php';
header('Content-Type: application/javascript; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
echo catalog_under_review() ? "window.CREAMY_PRODUCTS = [];\n" : file_get_contents(__DIR__ . '/js/products.js');
