<?php
declare(strict_types=1);

require_once __DIR__ . '/gateway.php';

if ($route === '/payments/blackcat' && $method === 'POST') {
    if (catalog_under_review()) json_response(['error' => 'O catálogo está em atualização. Novas compras estão temporariamente indisponíveis.'], 503);
    $body = input_json(); $store = store_data();
    $mode = $store['pagamento']['metodo'] ?? 'pix'; $pix = $store['pix'] ?? [];
    if ($mode === 'gateway' && !(getenv('BLACKCAT_API_KEY') ?: '')) json_response(['error' => 'Gateway não configurado.'], 503);
    if ($mode === 'pix' && !valid_pix($pix)) json_response(['error' => 'A chave Pix da loja ainda não foi configurada.'], 503);
    $ip = visitor_ip($_SERVER);
    $key = hash('sha256', $ip);
    update_data('payment-limits', function ($data) use ($key) {
        $times = array_values(array_filter($data[$key] ?? [], fn($t) => $t > time() - 60));
        if (count($times) >= 8) json_response(['error' => 'Muitas solicitações. Aguarde um minuto.'], 429);
        $times[] = time(); $data[$key] = $times; return $data;
    });
    $customer = $body['customer'] ?? []; $shipping = $body['shipping'] ?? []; $items = $body['items'] ?? [];
    if (!is_array($customer) || !is_array($shipping) || !is_array($items) || !$items || count($items) > 50) throw new InvalidArgumentException('Confira os dados do pedido.');
    foreach (['name', 'email', 'phone'] as $field) if (!is_string($customer[$field] ?? null) || trim($customer[$field]) === '' || strlen($customer[$field]) > 254) throw new InvalidArgumentException('Preencha os dados de contato.');
    if (!filter_var($customer['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('E-mail inválido.');
    if (!is_array($customer['document'] ?? null)) throw new InvalidArgumentException('CPF inválido.');
    $cpf = preg_replace('/\D/', '', string_value($customer['document']['number'] ?? '', 'CPF', 20, true));
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) throw new InvalidArgumentException('CPF inválido.');
    for ($digit = 9; $digit < 11; $digit++) {
        $sum = 0; for ($i = 0; $i < $digit; $i++) $sum += (int)$cpf[$i] * ($digit + 1 - $i);
        if ((($sum * 10) % 11) % 10 !== (int)$cpf[$digit]) throw new InvalidArgumentException('CPF inválido.');
    }
    $phone = preg_replace('/\D/', '', $customer['phone']);
    if (strlen($phone) < 10 || strlen($phone) > 13) throw new InvalidArgumentException('Telefone inválido.');
    foreach (['street', 'number', 'neighborhood', 'city', 'state', 'zipCode'] as $field) if (!is_string($shipping[$field] ?? null) || trim($shipping[$field]) === '' || strlen($shipping[$field]) > 200) throw new InvalidArgumentException('Preencha o endereço completo.');
    if (!preg_match('/^[A-Za-z]{2}$/', $shipping['state']) || strlen(preg_replace('/\D/', '', $shipping['zipCode'])) !== 8) throw new InvalidArgumentException('Confira UF e CEP.');
    $byId = array_column($store['produtos'], null, 'id'); $saleItems = []; $amount = 0; $requested = [];
    foreach ($items as $item) {
        if (!is_array($item) || !is_string($item['id'] ?? null) || !is_int($item['quantity'] ?? null)) throw new InvalidArgumentException('Itens inválidos.');
        if ($item['quantity'] < 1 || $item['quantity'] > 20) throw new InvalidArgumentException('Quantidade inválida.');
        $requested[$item['id']] = ($requested[$item['id']] ?? 0) + $item['quantity'];
    }
    foreach ($requested as $id => $quantity) {
        $product = $byId[$id] ?? null;
        if (!$product || empty($product['disponivel']) || $quantity < 1 || $quantity > 20 || (isset($product['estoque']) && $quantity > $product['estoque'])) throw new InvalidArgumentException('Produto indisponível ou quantidade inválida. Atualize a sacola.');
        $price = $product['precoPix'] ?? $product['preco']; $unit = (int)round((float)$price * 100);
        if ($unit <= 0) throw new InvalidArgumentException('Preço inválido.');
        $amount += $unit * $quantity;
        $saleItems[] = ['title' => $product['nome'], 'unitPrice' => $unit, 'quantity' => $quantity, 'tangible' => true];
    }
    if (isset($body['expectedAmount']) && (!is_int($body['expectedAmount']) || $body['expectedAmount'] !== $amount)) json_response(['error' => 'O preço dos produtos foi atualizado. Atualize a sacola e confira o novo total antes de pagar.'], 409);
    $gifts = promotion_gifts($store['produtos'], $requested, $amount);
    $requestKey = $body['idempotencyKey'] ?? bin2hex(random_bytes(20));
    if (!is_string($requestKey) || !preg_match('/^[a-zA-Z0-9_-]{12,100}$/', $requestKey)) throw new InvalidArgumentException('Identificador da solicitação inválido.');
    $fingerprint = hash('sha256', json_encode([$customer, $shipping, $requested, $amount, $mode, $gifts], JSON_THROW_ON_ERROR));
    update_data('payment-requests', function ($data) use ($requestKey, $fingerprint) {
        if (isset($data[$requestKey])) {
            if (!hash_equals($data[$requestKey]['fingerprint'], $fingerprint)) json_response(['error' => 'Esta solicitação já foi usada com outros dados. Revise o pedido.'], 409);
            if (isset($data[$requestKey]['response'])) json_response($data[$requestKey]['response'], 200);
            if (($data[$requestKey]['state'] ?? '') === 'rejected') {
                $data[$requestKey] = ['fingerprint' => $fingerprint, 'createdAt' => time(), 'state' => 'processing'];
                return $data;
            }
            json_response(['error' => 'Essa tentativa ainda está em análise. Consulte a loja antes de gerar outra cobrança.'], 409);
        }
        $data[$requestKey] = ['fingerprint' => $fingerprint, 'createdAt' => time(), 'state' => 'processing']; return $data;
    });
    $id = 'MS' . bin2hex(random_bytes(11)); $status = 'PENDING'; $paymentData = []; $invoice = null;
    if ($mode === 'gateway') {
        try {
        $reply = gateway_request('/sales/create-sale', ['amount' => $amount, 'currency' => 'BRL', 'paymentMethod' => 'pix', 'items' => $saleItems, 'customer' => ['name' => $customer['name'], 'email' => $customer['email'], 'phone' => $phone, 'document' => ['number' => $cpf, 'type' => 'cpf']], 'shipping' => array_merge($shipping, ['name' => $customer['name'], 'zipCode' => preg_replace('/\D/', '', $shipping['zipCode'])]), 'pix' => ['expiresInDays' => 1], 'externalRef' => $id]);
        } catch (GatewayException $error) {
            update_data('payment-requests', function ($data) use ($requestKey, $error) {
                $data[$requestKey]['state'] = $error->definitive ? 'rejected' : 'unconfirmed';
                $data[$requestKey]['failure'] = ['reason' => $error->reason, 'httpStatus' => $error->httpStatus, 'at' => time()];
                return $data;
            });
            json_response(['error' => $error->getMessage(), 'code' => $error->reason, 'retryable' => $error->definitive], 502);
        }
        $charge = $reply['data'] ?? [];
        if (!is_string($charge['transactionId'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{1,100}$/', $charge['transactionId'])) json_response(['error' => 'O gateway não retornou uma cobrança válida.'], 502);
        $id = $charge['transactionId']; $paymentData = $charge['paymentData'] ?? []; $invoice = $charge['invoiceUrl'] ?? null;
    }
    // Somente o banco/gateway determina a validade da cobrança.
    // Não esconda um Pix válido por causa de um cronômetro local.
    if (!empty($paymentData['expiresAt'])) $paymentData['checkoutExpiresAt'] = $paymentData['expiresAt'];
    $location = ip_location($ip);
    $attribution = campaign_attribution($body['attribution'] ?? []);
    update_data('transactions', function ($data) use ($id, $amount, $ip, $mode, $saleItems, $cpf, $customer, $shipping, $gifts, $location, $attribution) {
        $data[$id] = ['amount' => $amount, 'createdAt' => time(), 'status' => 'PENDING', 'ip' => $ip, 'agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 400), 'paymentMethod' => $mode === 'pix' ? 'manual_pix' : 'blackcat', 'items' => array_merge($saleItems, $gifts), 'customer' => ['name' => $customer['name'], 'email' => $customer['email'], 'phone' => $customer['phone']], 'shipping' => $shipping, 'documentMasked' => '***.***.***-' . substr($cpf, -2)];
        $data[$id] = array_merge($data[$id], $location);
        $data[$id]['attribution'] = $attribution;
        return $data;
    });
    $response = ['success' => true, 'data' => ['transactionId' => $id, 'status' => $status, 'amount' => $amount, 'paymentMethod' => $mode === 'pix' ? 'manual_pix' : 'blackcat', 'paymentData' => $paymentData, 'invoiceUrl' => $invoice, 'pix' => ['key' => $pix['chave'] ?? '', 'receiverName' => $pix['nome'] ?? '', 'receiverCity' => $pix['cidade'] ?? '']]];
    update_data('payment-requests', function ($data) use ($requestKey, $response) { $data[$requestKey]['response'] = $response; return $data; });
    json_response($response, 201);
}
if (($method === 'GET' && preg_match('~^/payments/([A-Za-z0-9_-]{1,100})$~', $route, $match)) || ($method === 'POST' && preg_match('~^/payments/([A-Za-z0-9_-]{1,100})/confirm$~', $route, $match))) {
    $id = $match[1]; $record = read_data('transactions')[$id] ?? null;
    if (!$record) json_response(['error' => 'Pedido não encontrado.'], 404);
    if ($method === 'POST' && empty($record['customerReportedAt'])) {
        $updated = update_data('transactions', function ($data) use ($id) {
            $data[$id]['customerReportedAt'] ??= time();
            return $data;
        });
        $record = $updated[$id];
    }
    if (($record['paymentMethod'] ?? '') !== 'manual_pix') {
        if (!(getenv('BLACKCAT_API_KEY') ?: '')) json_response(['error' => 'Gateway não configurado.'], 503);
        try { $reply = gateway_request('/sales/' . rawurlencode($id) . '/status'); }
        catch (GatewayException $error) { json_response(['error' => $error->getMessage(), 'code' => $error->reason], 502); }
        $confirmed = $reply['data'] ?? [];
        if (($confirmed['transactionId'] ?? null) !== $id || ($confirmed['amount'] ?? null) !== $record['amount'] || !in_array($confirmed['status'] ?? '', ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'], true)) json_response(['error' => 'Não foi possível confirmar o pagamento.'], 502);
        $record['status'] = $confirmed['status']; $record['paidAt'] = $confirmed['paidAt'] ?? null;
        $updated = update_data('transactions', function ($data) use ($id, $record) { $data[$id]['status'] = $record['status']; $data[$id]['paidAt'] = $record['paidAt']; return $data; });
        $record = $updated[$id];
    }
    json_response(['success' => true, 'data' => ['transactionId' => $id, 'amount' => $record['amount'], 'status' => $record['status'] ?? 'PENDING', 'paidAt' => $record['paidAt'] ?? null]]);
}
