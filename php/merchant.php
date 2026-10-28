<?php
declare(strict_types=1);

function merchant_xml(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_XML1 | ENT_DISALLOWED, 'UTF-8');
}

function merchant_description(array $product): string {
    $description = trim((string)($product['descricao'] ?? ''));
    if ($description !== '') return $description;
    $parts = [$product['nome']];
    if (!empty($product['categoria'])) $parts[] = 'Categoria: ' . $product['categoria'] . '.';
    foreach (['Principais benefícios', 'Principais ativos', 'Como usar'] as $key) {
        if (!empty($product['especificacoes'][$key])) $parts[] = $key . ': ' . $product['especificacoes'][$key];
    }
    return implode("\n", $parts);
}

function serve_merchant_document(string $route): never {
    $origin = 'https://magazineskincare.online';
    $hosting = json_decode((string)file_get_contents(STORE_ROOT . '/store-hosting.json'), true, 512, JSON_THROW_ON_ERROR);
    $mediaOrigin = rtrim($hosting['apiOrigin'], '/');
    $store = store_data();
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    if ($route === '/sitemap') {
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ([$origin . '/', $origin . '/empresa.html'] as $url) echo '<url><loc>' . merchant_xml($url) . '</loc></url>';
        foreach ($store['produtos'] as $product) echo '<url><loc>' . merchant_xml($origin . '/produto.html?id=' . rawurlencode($product['id'])) . '</loc></url>';
        echo '</urlset>'; exit;
    }
    echo '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>' . merchant_xml($store['loja']['nome']) . '</title><link>' . $origin . '/</link><description>Catálogo público da loja, com preço e disponibilidade atuais.</description>';
    $imageUrl = static function (string $path) use ($origin, $mediaOrigin): string {
        if (preg_match('~^https://~', $path)) return $path;
        return (str_starts_with($path, 'public/images/uploads/') ? $mediaOrigin : $origin) . '/' . ltrim($path, '/');
    };
    foreach ($store['produtos'] as $product) {
        $price = $product['precoPix'] ?? $product['preco'];
        if (!is_numeric($price) || (float)$price <= 0 || empty($product['imagem'])) continue;
        $available = !empty($product['disponivel']) && (!isset($product['estoque']) || $product['estoque'] > 0);
        $description = merchant_description($product);
        preg_match('/^.{0,5000}/us', $description, $descriptionMatch);
        $fields = [
            'id' => $product['id'], 'title' => $product['nome'],
            'description' => $descriptionMatch[0] ?? $product['nome'],
            'link' => $origin . '/produto.html?id=' . rawurlencode($product['id']),
            'image_link' => $imageUrl($product['imagem']),
            'price' => number_format(round((float)$price, 2), 2, '.', '') . ' BRL',
            'availability' => $available ? 'in_stock' : 'out_of_stock',
            'condition' => 'new', 'brand' => $product['marca'] ?? 'Creamy',
            'product_type' => $product['categoria'] ?? '',
        ];
        if (isset($product['gtin']) && valid_gtin((string)$product['gtin'])) $fields['gtin'] = (string)$product['gtin'];
        if (!empty($product['mpn'])) $fields['mpn'] = (string)$product['mpn'];
        echo '<item>';
        foreach ($fields as $name => $value) echo '<g:' . $name . '>' . merchant_xml((string)$value) . '</g:' . $name . '>';
        $additional = array_values(array_diff(array_unique($product['imagens'] ?? []), [$product['imagem']]));
        foreach (array_slice($additional, 0, 10) as $image) echo '<g:additional_image_link>' . merchant_xml($imageUrl($image)) . '</g:additional_image_link>';
        echo '</item>';
    }
    echo '</channel></rss>'; exit;
}
