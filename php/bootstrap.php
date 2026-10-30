<?php
declare(strict_types=1);

const STORE_ROOT = __DIR__ . '/..';
date_default_timezone_set('America/Sao_Paulo');
if (getenv('STORE_LOAD_ENV') !== '0' && is_file(STORE_ROOT . '/.env')) {
    foreach (file(STORE_ROOT . '/.env', FILE_IGNORE_NEW_LINES) as $line) {
        if (preg_match('/^([A-Z][A-Z0-9_]*)=(.*)$/', trim($line), $match) && getenv($match[1]) === false) {
            putenv($match[1] . '=' . trim($match[2], " \t\n\r\0\x0B\"'"));
        }
    }
}
define('STORE_DATA', getenv('STORE_DATA_DIR') ?: STORE_ROOT . '/.data');

function json_response(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function data_directory(): void {
    if (!is_dir(STORE_DATA) && !mkdir(STORE_DATA, 0700, true) && !is_dir(STORE_DATA)) {
        throw new RuntimeException('Não foi possível criar a pasta de dados.');
    }
}

function read_data(string $name, array $fallback = []): array {
    $path = STORE_DATA . '/' . $name . '.json';
    foreach ([$path, STORE_DATA . '/' . $name . '.backup.json'] as $candidate) {
        if (!is_file($candidate)) continue;
        try {
            $value = json_decode((string)file_get_contents($candidate), true, 512, JSON_THROW_ON_ERROR);
            if (is_array($value)) {
                if ($candidate !== $path) error_log('Dados recuperados da cópia de segurança: ' . $name);
                return $value;
            }
        } catch (JsonException) { /* Tenta a cópia antes de interromper a operação. */ }
    }
    if (is_file($path) || is_file(STORE_DATA . '/' . $name . '.backup.json')) throw new RuntimeException('Arquivo de dados inválido. Restaure uma cópia de segurança.');
    return $fallback;
}

function write_data_file(string $path, string $contents): void {
    $temp = tempnam(STORE_DATA, 'save-');
    if ($temp === false) throw new RuntimeException('Não foi possível preparar a gravação.');
    try {
        $bytes = file_put_contents($temp, $contents);
        if ($bytes !== strlen($contents) || !rename($temp, $path)) throw new RuntimeException('Não foi possível salvar os dados.');
    } finally { if (is_file($temp)) unlink($temp); }
}

function update_data(string $name, callable $mutate, array $fallback = []): array {
    data_directory();
    $lock = fopen(STORE_DATA . '/' . $name . '.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Não foi possível bloquear os dados.');
    try {
        $value = $mutate(read_data($name, $fallback));
        $contents = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        write_data_file(STORE_DATA . '/' . $name . '.json', $contents);
        try { write_data_file(STORE_DATA . '/' . $name . '.backup.json', $contents); }
        catch (RuntimeException $error) { error_log('Falha na cópia de segurança de ' . $name . ': ' . $error->getMessage()); }
        return $value;
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}

function valid_gtin(string $value): bool {
    if (!preg_match('/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/', $value)) return false;
    $sum = 0;
    for ($i = strlen($value) - 2, $weight = 3; $i >= 0; $i--, $weight = 4 - $weight) $sum += (int)$value[$i] * $weight;
    return (10 - $sum % 10) % 10 === (int)$value[strlen($value) - 1];
}

function product_is_public(array $product): bool {
    static $withdrawn = null;
    if ($withdrawn === null) {
        $policy = json_decode((string)file_get_contents(STORE_ROOT . '/withdrawn-products.json'), true, 512, JSON_THROW_ON_ERROR);
        $withdrawn = $policy['ids'];
    }
    if (in_array($product['id'] ?? '', $withdrawn, true)) return false;
    return !preg_match('/ghk[\s-]*cu|copper\s+tripeptide|peptide\s*cream|tripept[ií]deo.{0,15}cobre/iu', json_encode($product, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
}

function initial_products(): array {
    $source = (string)file_get_contents(STORE_ROOT . '/js/products.js');
    $source = preg_replace('/^\s*window\.CREAMY_PRODUCTS\s*=\s*/', '', $source);
    $source = preg_replace('/;\s*$/', '', $source);
    return json_decode($source, true, 512, JSON_THROW_ON_ERROR);
}

function promotion_gifts(array $products, array $requested, int $amount): array {
    $gift = array_column($products, null, 'id')['drops-serum-hidratante'] ?? null;
    if ($amount <= 34900 || !$gift || empty($gift['disponivel'])) return [];
    if (isset($gift['estoque']) && $gift['estoque'] <= ($requested[$gift['id']] ?? 0)) return [];
    return [['title' => $gift['nome'] . ' — Brinde', 'unitPrice' => 0, 'quantity' => 1, 'tangible' => true]];
}

function initial_store(): array {
    return [
        'revision' => 0,
        'loja' => ['nome' => 'Magazine do Skincare', 'logo' => 'public/images/brand/magazine-do-skincare.png', 'slogan' => 'Ciência e cuidado para transformar sua rotina de skincare'],
        'pagamento' => ['metodo' => (getenv('BLACKCAT_API_KEY') ?: '') !== '' ? 'gateway' : 'pix'],
        'pix' => ['chave' => '', 'nome' => '', 'cidade' => ''],
        'produtos' => initial_products(),
    ];
}

function store_data(): array {
    $store = read_data('store', initial_store());
    $store['produtos'] = array_values(array_filter($store['produtos'], 'product_is_public'));
    $originals = array_column(initial_products(), null, 'id');
    foreach ($store['produtos'] as &$product) {
        $original = $originals[$product['id']] ?? [];
        if (empty($product['gtin']) && ($original['nome'] ?? '') === $product['nome'] && !empty($original['gtin'])) $product['gtin'] = $original['gtin'];
    }
    unset($product);
    return $store;
}

function string_value(mixed $value, string $label, int $max = 200, bool $required = false): string {
    if (!is_string($value) || strlen($value) > $max || ($required && trim($value) === '')) throw new InvalidArgumentException('Confira o campo ' . $label . '.');
    return trim($value);
}

function valid_pix(array $pix): bool {
    $key = $pix['chave'] ?? '';
    return is_string($key) && preg_match('/^[\x21-\x7e]{1,77}$/', $key) && is_string($pix['nome'] ?? null) && trim($pix['nome']) !== '' && is_string($pix['cidade'] ?? null) && trim($pix['cidade']) !== '';
}

function input_json(): array {
    $input = file_get_contents('php://input', false, null, 0, 8 * 1024 * 1024 + 1);
    if ($input === false || strlen($input) > 8 * 1024 * 1024) json_response(['error' => 'Solicitação muito grande.'], 413);
    try { $value = json_decode($input, true, 512, JSON_THROW_ON_ERROR); }
    catch (JsonException) { json_response(['error' => 'Envie JSON válido.'], 400); }
    if (!is_array($value)) json_response(['error' => 'Dados inválidos.'], 400);
    return $value;
}

function start_admin_session(): void {
    data_directory();
    $directory = STORE_DATA . '/sessions';
    if (!is_dir($directory)) mkdir($directory, 0700, true);
    session_save_path($directory);
    session_name('magazine_admin');
    session_start(['use_strict_mode' => 1, 'cookie_httponly' => true, 'cookie_samesite' => 'Strict', 'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function require_csrf(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        json_response(['error' => 'Origem da solicitação inválida.'], 403);
    }
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) json_response(['error' => 'Sessão expirada. Atualize a página.'], 403);
}

function require_admin(): void {
    if (empty($_SESSION['admin']) || time() - ($_SESSION['lastActive'] ?? 0) > 3600) {
        unset($_SESSION['admin']);
        json_response(['error' => 'Entre no painel para continuar.'], 401);
    }
    $_SESSION['lastActive'] = time();
}

function auth_configured(): bool {
    return (getenv('ADMIN_SYNC_PASSWORD') ?: '') !== '' || !empty(read_data('admin-auth')['hash']);
}

function safe_image(string $value): bool {
    if ($value === '') return true;
    if (str_contains($value, '..') || preg_match('/[\x00-\x1f]/', $value)) return false;
    return (bool)preg_match('~^(?:public/images/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif)|https://[^\s<>"\']+)$~i', $value);
}

function validate_product(array $product): array {
    $id = $product['id'] ?? '';
    if (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,180}$/', $id)) throw new InvalidArgumentException('Identificador do produto inválido.');
    foreach (['nome' => 200, 'categoria' => 120, 'descricao' => 50000] as $key => $max) {
        if (!is_string($product[$key] ?? null) || strlen($product[$key]) > $max || ($key !== 'descricao' && trim($product[$key]) === '')) throw new InvalidArgumentException('Confira nome, categoria e descrição.');
    }
    foreach (['preco', 'precoRegular', 'precoPix'] as $key) {
        $value = $product[$key] ?? null;
        if (($key === 'preco' && $value === null) || ($value !== null && (!is_numeric($value) || !is_finite((float)$value) || (float)$value <= 0 || (float)$value > 100000))) throw new InvalidArgumentException('Informe preços válidos e maiores que zero.');
        $product[$key] = $value === null ? null : round((float)$value, 2);
        if ($product[$key] !== null && $product[$key] < 0.01) throw new InvalidArgumentException('O menor preço permitido é R$ 0,01.');
    }
    $stock = $product['estoque'] ?? null;
    if ($stock !== null && (!is_int($stock) || $stock < 0 || $stock > 1000000)) throw new InvalidArgumentException('Estoque inválido.');
    $images = $product['imagens'] ?? [];
    if (!is_array($images) || count($images) > 40) throw new InvalidArgumentException('Use até 40 fotos por produto.');
    foreach (array_merge([$product['imagem'] ?? ''], $images) as $image) {
        if (!is_string($image) || !safe_image($image)) throw new InvalidArgumentException('Use uma foto local ou URL HTTPS válida.');
    }
    $product['disponivel'] = (bool)($product['disponivel'] ?? false) && $stock !== 0;
    $product['imagens'] = array_values(array_unique($images));
    foreach (['uso', 'tiposDePele'] as $key) {
        $values = $product[$key] ?? [];
        if (!is_array($values) || count($values) > 50) throw new InvalidArgumentException('Detalhes do produto inválidos.');
        foreach ($values as $value) string_value($value, $key, 120);
    }
    $specifications = $product['especificacoes'] ?? [];
    if (!is_array($specifications) || count($specifications) > 40) throw new InvalidArgumentException('Especificações inválidas.');
    foreach ($specifications as $label => $value) { string_value($label, 'especificação', 120); string_value($value, 'especificação', 50000); }
    if (isset($product['gtin']) && (!is_string($product['gtin']) || !valid_gtin($product['gtin']))) throw new InvalidArgumentException('Informe o EAN/GTIN real e válido do fabricante.');
    if (!product_is_public($product)) throw new InvalidArgumentException('Este produto está retirado da oferta pública e precisa de revisão antes de voltar à venda.');
    return $product;
}
