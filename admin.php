<?php
declare(strict_types=1);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Administração · Magazine do Skincare</title>
  <link rel="icon" href="public/images/brand/magazine-do-skincare.png" type="image/png">
  <link rel="stylesheet" href="css/admin.css?v=9">
  <script src="js/admin.js?v=9" defer></script>
</head>
<body>
  <div id="app"><div class="loading">Carregando painel…</div></div>
  <div id="notice" role="status" aria-live="polite"></div>
</body>
</html>
