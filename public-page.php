<?php
declare(strict_types=1);
require __DIR__ . '/php/bootstrap.php';
require __DIR__ . '/php/geolocation.php';
require_once __DIR__ . '/php/merchant.php';
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
        $description = merchant_description($product);
        $description = preg_replace('/\s+/u', ' ', $description);
        $escaped = fn(string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $html = preg_replace('~<meta (?:name="description"|property="og:[^"]+")[^>]*>|<link rel="canonical"[^>]*>~', '', $html);
        $mediaOrigin = str_starts_with($product['imagem'], 'public/images/uploads/') ? 'https://magazineskincare.onrender.com/' : 'https://magazineskincare.online/';
        $photo = str_starts_with($product['imagem'], 'https://') ? $product['imagem'] : $mediaOrigin . ltrim($product['imagem'], '/');
        $price = (float)($product['precoPix'] ?? $product['preco']);
        $available = !empty($product['disponivel']) && (!isset($product['estoque']) || $product['estoque'] > 0);
        $schema = ['@context' => 'https://schema.org', '@type' => 'Product', 'name' => $product['nome'], 'description' => $description, 'image' => [$photo], 'sku' => $product['id'], 'offers' => ['@type' => 'Offer', 'url' => $canonical, 'priceCurrency' => 'BRL', 'price' => number_format($price, 2, '.', ''), 'availability' => $available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', 'seller' => ['@type' => 'Organization', 'name' => 'Magazine do Skincare']]];
        if (!empty($product['marca'])) $schema['brand'] = ['@type' => 'Brand', 'name' => $product['marca']];
        if (!empty($product['gtin']) && valid_gtin((string)$product['gtin'])) $schema['gtin' . strlen((string)$product['gtin'])] = (string)$product['gtin'];
        if (!empty($product['mpn'])) $schema['mpn'] = $product['mpn'];
        $schema['offers']['itemCondition'] = 'https://schema.org/NewCondition';
        $schema['offers']['shippingDetails'] = ['@type' => 'OfferShippingDetails', 'shippingDestination' => ['@type' => 'DefinedRegion', 'addressCountry' => 'BR'], 'shippingRate' => ['@type' => 'MonetaryAmount', 'value' => '0.00', 'currency' => 'BRL']];
        $schema['offers']['hasMerchantReturnPolicy'] = ['@type' => 'MerchantReturnPolicy', 'applicableCountry' => 'BR', 'returnPolicyCategory' => 'https://schema.org/MerchantReturnFiniteReturnWindow', 'merchantReturnDays' => 7, 'merchantReturnLink' => 'https://magazineskincare.online/trocas.html'];
        $head = '<meta name="description" content="' . $escaped($description) . '"><link rel="canonical" href="' . $escaped($canonical) . '"><meta property="og:title" content="' . $title . '"><meta property="og:description" content="' . $escaped($description) . '"><meta property="og:type" content="product"><meta property="og:url" content="' . $escaped($canonical) . '"><meta property="og:image" content="' . $escaped($photo) . '">';
        if ($price > 0) $head .= '<script type="application/ld+json" id="productStructuredData">' . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) . '</script>';
        $html = str_replace('</head>', $head . '</head>', $html);
        $summary = '<section class="product-loading-preview" id="serverProductSummary" aria-label="Resumo do produto"><figure class="product-detail-image"><img src="' . $escaped($photo) . '" alt="' . $escaped($product['nome']) . '" width="600" height="600" fetchpriority="high" decoding="async"></figure><div><h1>' . $escaped($product['nome']) . '</h1>';
        if (!empty($product['marca'])) $summary .= '<p>Marca: ' . $escaped($product['marca']) . '</p>';
        $summary .= '<p><strong data-merchant-price="' . number_format($price, 2, '.', '') . '">R$ ' . number_format($price, 2, ',', '.') . '</strong> no Pix</p><p>' . ($available ? 'Disponível no catálogo.' : 'Indisponível no momento.') . '</p><p>Frete grátis. <a href="entrega.html">Condições de entrega</a> · <a href="trocas.html">Devoluções</a></p><noscript><p>Para utilizar a sacola e finalizar a compra, ative o JavaScript no navegador. Você também pode <a href="contato.html">falar com a loja</a>.</p></noscript></div></section>';
        $html = str_replace('<section class="product-detail" id="productDetail" hidden>', $summary . '<section class="product-detail" id="productDetail" hidden>', $html);
    } else { http_response_code(404); $html = str_replace('</head>', '<meta name="robots" content="noindex"></head>', $html); }
}
echo $html;
