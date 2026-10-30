<?php
declare(strict_types=1);
require __DIR__ . '/php/bootstrap.php';
require __DIR__ . '/php/geolocation.php';
$page = $_GET['file'] ?? 'index.html';
if (!in_array($page, ['index.html', 'produto.html', 'carrinho.html', 'checkout.html', 'empresa.html'], true)) { http_response_code(404); exit('Não encontrado.'); }
if (in_array(visitor_ip($_SERVER), read_data('blocked')['ips'] ?? [], true)) { http_response_code(403); exit('Acesso bloqueado.'); }
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache');
$html = (string)file_get_contents(__DIR__ . '/' . $page);
if ($page === 'produto.html') {
    $id = $_GET['id'] ?? '';
    $product = is_string($id) ? array_values(array_filter(store_data()['produtos'], fn($p) => $p['id'] === $id))[0] ?? null : null;
    if ($product) {
        $title = htmlspecialchars($product['nome'] . ' | Magazine do Skincare', ENT_QUOTES, 'UTF-8');
        $html = preg_replace_callback('~<title>.*?</title>~s', fn() => '<title>' . $title . '</title>', $html);
    } else { http_response_code(404); }
}
echo $html;
