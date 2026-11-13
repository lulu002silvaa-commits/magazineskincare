<?php
declare(strict_types=1);
require __DIR__ . '/php/bootstrap.php';
require __DIR__ . '/php/geolocation.php';
$page = $_GET['file'] ?? 'index.html';
if (!in_array($page, ['index.html', 'produto.html', 'carrinho.html', 'checkout.html', 'empresa.html', 'sobre.html', 'contato.html', 'privacidade.html', 'cookies.html', 'termos.html', 'entrega.html', 'trocas.html', 'reembolso.html'], true)) { http_response_code(404); exit('Não encontrado.'); }
if (in_array(visitor_ip($_SERVER), read_data('blocked')['ips'] ?? [], true)) { http_response_code(403); exit('Acesso bloqueado.'); }
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache');
$html = (string)file_get_contents(__DIR__ . '/' . $page);
if ($page === 'produto.html') {
    $id = $_GET['id'] ?? '';
    $product = is_string($id) ? array_values(array_filter(public_store_data()['produtos'], fn($p) => $p['id'] === $id))[0] ?? null : null;
    if ($product) {
        $title = htmlspecialchars($product['nome'] . ' | Magazine do Skincare', ENT_QUOTES, 'UTF-8');
        $html = preg_replace_callback('~<title>.*?</title>~s', fn() => '<title>' . $title . '</title>', $html);
        $canonical = 'https://magazineskincare.online/produto.html?id=' . rawurlencode($product['id']);
        $description = trim((string)($product['descricao'] ?? '')) ?: $product['nome'] . '. Confira composição, instruções e disponibilidade na loja.';
        $description = preg_replace('/\s+/u', ' ', $description);
        $escaped = fn(string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $html = preg_replace('~<meta (?:name="description"|property="og:[^"]+")[^>]*>|<link rel="canonical"[^>]*>~', '', $html);
        $mediaOrigin = str_starts_with($product['imagem'], 'public/images/uploads/') ? 'https://magazineskincare.onrender.com/' : 'https://magazineskincare.online/';
        $photo = str_starts_with($product['imagem'], 'https://') ? $product['imagem'] : $mediaOrigin . ltrim($product['imagem'], '/');
        $price = (float)($product['precoPix'] ?? $product['preco']);
        $available = !empty($product['disponivel']) && (!isset($product['estoque']) || $product['estoque'] > 0);
        $schema = ['@context' => 'https://schema.org', '@type' => 'Product', 'name' => $product['nome'], 'description' => $description, 'image' => [$photo], 'sku' => $product['id'], 'offers' => ['@type' => 'Offer', 'url' => $canonical, 'priceCurrency' => 'BRL', 'price' => number_format($price, 2, '.', ''), 'availability' => $available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', 'seller' => ['@type' => 'Organization', 'name' => 'Magazine do Skincare']]];
        $head = '<meta name="description" content="' . $escaped($description) . '"><link rel="canonical" href="' . $escaped($canonical) . '"><meta property="og:title" content="' . $title . '"><meta property="og:description" content="' . $escaped($description) . '"><meta property="og:type" content="product"><meta property="og:url" content="' . $escaped($canonical) . '"><meta property="og:image" content="' . $escaped($photo) . '">';
        if ($price > 0) $head .= '<script type="application/ld+json" id="productStructuredData">' . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) . '</script>';
        $html = str_replace('</head>', $head . '</head>', $html);
    } else { http_response_code(404); $html = str_replace('</head>', '<meta name="robots" content="noindex"></head>', $html); }
}
echo $html;
