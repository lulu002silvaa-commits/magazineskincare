<?php
declare(strict_types=1);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (preg_match('~(?:^|/)(?:\.[^/]+|php|tests|backup[^/]*|Dockerfile|docker-entrypoint\.sh)(?:/|$)|\.(?:py|zip|bat|ps1|sh|lock|json|ini|ya?ml|md)$~i', $path) || str_contains($path, '..')) {
    http_response_code(404); exit('Não encontrado.');
}
if (str_starts_with($path, '/api/')) { $_GET['route'] = substr($path, 4); require __DIR__ . '/api.php'; return true; }
if (preg_match('~^/public/images/uploads/([a-f0-9]{32}\.(?:jpg|png|webp))$~', $path, $image)) { $_GET['route'] = '/image/' . $image[1]; require __DIR__ . '/api.php'; return true; }
if (in_array($path, ['/', '/index.html', '/produto.html', '/carrinho.html', '/checkout.html', '/empresa.html'], true)) {
    $_GET['file'] = $path === '/' ? 'index.html' : ltrim($path, '/');
    require __DIR__ . '/public-page.php'; return true;
}
if ($path === '/admin.html') { header('Location: /admin.php', true, 302); return true; }
if (!is_file(__DIR__ . $path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Página não encontrada.';
    return true;
}
return false;
