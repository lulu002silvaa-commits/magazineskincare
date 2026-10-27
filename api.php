<?php
declare(strict_types=1);
require __DIR__ . '/php/bootstrap.php';

$route = '/' . trim((string)($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'];
$frontendOrigins = array_merge(['http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://localhost:5500', 'http://localhost:5501'], array_values(array_filter(array_map('trim', explode(',', getenv('STORE_FRONTEND_ORIGINS') ?: '')))));
if (!str_starts_with($route, '/admin/') && in_array($_SERVER['HTTP_ORIGIN'] ?? '', $frontendOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if ($method === 'OPTIONS') { http_response_code(204); exit; }
}
try {
    if (!str_starts_with($route, '/admin/') && $route !== '/health' && in_array($_SERVER['REMOTE_ADDR'] ?? '', read_data('blocked')['ips'] ?? [], true)) {
        json_response(['error' => 'Acesso bloqueado.'], 403);
    }
    if ($route === '/health') json_response(['ok' => true, 'runtime' => 'php']);
    if ($method === 'GET' && preg_match('~^/image/([a-f0-9]{32}\.(jpg|png|webp))$~', $route, $image)) {
        $path = STORE_DATA . '/uploads/' . $image[1];
        if (!is_file($path)) json_response(['error' => 'Imagem não encontrada.'], 404);
        header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$image[2]]);
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: public, max-age=86400');
        readfile($path); exit;
    }
    if ($route === '/catalog' && $method === 'GET') {
        $store = store_data();
        json_response(['products' => $store['produtos'], 'brand' => $store['loja'], 'revision' => $store['revision'] ?? 0]);
    }
    if ($route === '/store' && $method === 'GET') {
        $store = store_data();
        unset($store['senhaAdmin'], $store['pagamento']['gateway']);
        json_response($store);
    }
    if ($route === '/analytics' && $method === 'POST') {
        $body = input_json();
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $blocked = read_data('blocked')['ips'] ?? [];
        if (in_array($ip, $blocked, true)) json_response(['error' => 'Acesso bloqueado.'], 403);
        $id = (string)($body['sessionId'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9_-]{1,160}$/', $id)) json_response(['error' => 'Sessão inválida.'], 400);
        $source = $body['source'] ?? 'view';
        if (!in_array($source, ['view', 'heartbeat', 'click'], true)) json_response(['error' => 'Evento inválido.'], 400);
        $agent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 400);
        $now = time();
        $analytics = update_data('analytics', function ($data) use ($id, $ip, $agent, $body, $source, $now) {
            $data['sessions'] = array_filter($data['sessions'] ?? [], fn($s) => ($s['lastSeen'] ?? 0) > $now - 120);
            $data['sessions'][$id] = ['lastSeen' => $now, 'ip' => $ip];
            if ($source === 'view') {
                $data['totalViews'] = (int)($data['totalViews'] ?? 0) + 1;
                $data['history'][] = ['id' => bin2hex(random_bytes(10)), 'timestamp' => $now, 'sessionId' => $id, 'ip' => $ip, 'source' => 'view', 'path' => substr((string)($body['path'] ?? '/'), 0, 500), 'referrer' => substr((string)($body['referrer'] ?? ''), 0, 500), 'agent' => $agent, 'city' => '', 'state' => '', 'country' => ''];
                $data['history'] = array_slice($data['history'], -1000);
            }
            if ($source === 'click') $data['totalClicks'] = (int)($data['totalClicks'] ?? 0) + 1;
            return $data;
        });
        json_response(['success' => true, 'onlineUsers' => count($analytics['sessions'])]);
    }

    // Administração: sessão PHP e token CSRF em toda gravação.
    if (str_starts_with($route, '/admin/')) {
        start_admin_session();
        if ($method !== 'GET') require_csrf();
        if ($route === '/admin/session' && $method === 'GET') {
            $authenticated = !empty($_SESSION['admin']) && time() - ($_SESSION['lastActive'] ?? 0) <= 3600;
            json_response(['authenticated' => $authenticated, 'csrf' => $_SESSION['csrf'], 'setupRequired' => !auth_configured(), 'setupAllowed' => in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true), 'username' => getenv('ADMIN_USERNAME') ?: 'admin']);
        }
        if ($route === '/admin/setup' && $method === 'POST') {
            if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || auth_configured()) json_response(['error' => 'Configure ADMIN_SYNC_PASSWORD no servidor.'], 403);
            $password = input_json()['password'] ?? '';
            if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72) json_response(['error' => 'Use uma senha com 12 a 72 caracteres.'], 422);
            update_data('admin-auth', function ($data) use ($password) {
                if (!empty($data['hash'])) throw new InvalidArgumentException('O acesso já foi configurado.');
                return ['hash' => password_hash($password, PASSWORD_DEFAULT)];
            });
            json_response(['success' => true]);
        }
        if ($route === '/admin/login' && $method === 'POST') {
            $body = input_json();
            $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
            $limit = read_data('login-attempts')[$key] ?? [];
            if (($limit['count'] ?? 0) >= 8 && ($limit['until'] ?? 0) > time()) json_response(['error' => 'Muitas tentativas. Aguarde 15 minutos.'], 429);
            $password = $body['password'] ?? '';
            if (!is_string($password) || strlen($password) > 200) throw new InvalidArgumentException('Senha inválida.');
            $configured = getenv('ADMIN_SYNC_PASSWORD') ?: '';
            $hash = read_data('admin-auth')['hash'] ?? '';
            $valid = $configured !== '' ? hash_equals($configured, $password) : ($hash !== '' && password_verify($password, $hash));
            if (!$valid || !hash_equals(getenv('ADMIN_USERNAME') ?: 'admin', string_value($body['username'] ?? '', 'usuário', 120))) {
                update_data('login-attempts', function ($data) use ($key) {
                    $data[$key] = ['count' => (($data[$key]['until'] ?? 0) > time() ? ($data[$key]['count'] ?? 0) : 0) + 1, 'until' => time() + 900]; return $data;
                });
                json_response(['error' => 'Usuário ou senha incorretos.'], 401);
            }
            update_data('login-attempts', function ($data) use ($key) { unset($data[$key]); return $data; });
            session_regenerate_id(true);
            $_SESSION['admin'] = true; $_SESSION['lastActive'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(32));
            json_response(['success' => true, 'csrf' => $_SESSION['csrf']]);
        }
        require_admin();
        if ($route === '/admin/logout' && $method === 'POST') {
            $_SESSION = [];
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $cookie['path'], 'secure' => $cookie['secure'], 'httponly' => true, 'samesite' => 'Strict']);
            session_destroy(); json_response(['success' => true]);
        }
        if ($route === '/admin/data' && $method === 'GET') {
            $store = store_data(); unset($store['senhaAdmin'], $store['pagamento']['gateway']);
            $analytics = read_data('analytics');
            $visits = array_reverse(array_values(array_filter($analytics['history'] ?? [], fn($v) => ($v['source'] ?? 'view') === 'view')));
            foreach ($visits as &$visit) { $visit['online'] = (int)($analytics['sessions'][$visit['sessionId'] ?? '']['lastSeen'] ?? 0) >= time() - 120; }
            unset($visit);
            $transactions = read_data('transactions');
            $charges = [];
            foreach ($transactions as $id => $charge) { $charge['id'] = (string)$id; $charges[] = $charge; }
            usort($charges, fn($a, $b) => ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0));
            $online = count(array_filter($analytics['sessions'] ?? [], fn($s) => ($s['lastSeen'] ?? 0) >= time() - 120));
            $revenue = array_sum(array_map(fn($p) => ($p['status'] ?? '') === 'PAID' ? (int)($p['amount'] ?? 0) : 0, $charges));
            json_response(['store' => $store, 'visits' => array_slice($visits, 0, 1000), 'charges' => $charges, 'blocked' => read_data('blocked')['ips'] ?? [], 'stats' => ['visits' => (int)($analytics['totalViews'] ?? 0), 'pix' => count($charges), 'revenue' => $revenue, 'online' => $online], 'gatewayConfigured' => (getenv('BLACKCAT_API_KEY') ?: '') !== '']);
        }
        if ($route === '/admin/product' && in_array($method, ['POST', 'DELETE'], true)) {
            $body = input_json();
            if ($method === 'POST' && !is_array($body['product'] ?? null)) throw new InvalidArgumentException('Dados do produto inválidos.');
            $product = $method === 'POST' ? validate_product($body['product']) : null;
            $id = $product['id'] ?? ($body['id'] ?? '');
            $updated = update_data('store', function ($store) use ($body, $product, $id, $method) {
                if ((int)($body['revision'] ?? -1) !== (int)($store['revision'] ?? 0)) json_response(['error' => 'Outro acesso alterou o catálogo. Atualize o painel antes de salvar.'], 409);
                $found = false;
                foreach ($store['produtos'] as $index => $old) {
                    if ($old['id'] !== $id) continue;
                    if ($method === 'POST' && !empty($body['create'])) throw new InvalidArgumentException('Esse identificador já pertence a outro produto.');
                    $found = true;
                    if ($method === 'DELETE') unset($store['produtos'][$index]);
                    else $store['produtos'][$index] = array_replace($old, $product);
                    break;
                }
                if (!$found && $method === 'POST') {
                    if (count($store['produtos']) >= 500) throw new InvalidArgumentException('Limite de 500 produtos atingido.');
                    $store['produtos'][] = $product;
                }
                if (!$found && $method === 'DELETE') throw new InvalidArgumentException('Produto não encontrado.');
                $store['produtos'] = array_values($store['produtos']);
                $store['revision'] = (int)($store['revision'] ?? 0) + 1;
                return $store;
            }, initial_store());
            json_response(['success' => true, 'revision' => $updated['revision']]);
        }
        if ($route === '/admin/settings' && $method === 'POST') {
            $body = input_json();
            $mode = $body['method'] ?? '';
            if (!in_array($mode, ['pix', 'gateway'], true)) throw new InvalidArgumentException('Forma de pagamento inválida.');
            $name = string_value($body['name'] ?? '', 'nome da loja', 150, true);
            if (!is_array($body['pix'] ?? null)) throw new InvalidArgumentException('Confira as configurações Pix.');
            if ($mode === 'pix' && !valid_pix($body['pix'])) throw new InvalidArgumentException('Preencha uma chave Pix válida, nome e cidade do recebedor.');
            $updated = update_data('store', function ($store) use ($body, $mode, $name) {
                if ((int)($body['revision'] ?? -1) !== (int)($store['revision'] ?? 0)) json_response(['error' => 'As configurações mudaram. Atualize o painel.'], 409);
                $store['loja']['nome'] = $name;
                $store['pagamento']['metodo'] = $mode;
                foreach (['chave', 'nome', 'cidade'] as $key) {
                    $value = string_value($body['pix'][$key] ?? '', 'Pix', 200);
                    $store['pix'][$key] = $value;
                }
                $store['revision'] = (int)($store['revision'] ?? 0) + 1;
                return $store;
            }, initial_store());
            json_response(['success' => true, 'revision' => $updated['revision']]);
        }
        if ($route === '/admin/upload' && $method === 'POST') {
            $file = $_FILES['image'] ?? null;
            if (!$file || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5 * 1024 * 1024 || !is_uploaded_file($file['tmp_name'])) throw new InvalidArgumentException('Envie uma imagem de até 5 MB.');
            $info = @getimagesize($file['tmp_name']);
            $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $mime = $info['mime'] ?? '';
            if (!isset($extensions[$mime]) || $info[0] > 12000 || $info[1] > 12000) throw new InvalidArgumentException('Use JPG, PNG ou WebP válido, com até 12000 pixels por lado.');
            $directory = STORE_DATA . '/uploads';
            if (!is_dir($directory)) mkdir($directory, 0755, true);
            $relative = 'public/images/uploads/' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
            if (!move_uploaded_file($file['tmp_name'], $directory . '/' . basename($relative))) throw new RuntimeException('Não foi possível gravar a imagem.');
            json_response(['path' => $relative], 201);
        }
        if ($route === '/admin/block' && $method === 'POST') {
            $body = input_json(); $ip = $body['ip'] ?? '';
            if (!filter_var($ip, FILTER_VALIDATE_IP)) throw new InvalidArgumentException('IP inválido.');
            update_data('blocked', function ($data) use ($body, $ip) {
                $ips = $data['ips'] ?? [];
                $ips = array_values(array_diff($ips, [$ip]));
                if (!empty($body['blocked'])) $ips[] = $ip;
                return ['ips' => $ips];
            });
            json_response(['success' => true]);
        }
        if ($route === '/admin/unblock-all' && $method === 'POST') {
            update_data('blocked', fn($data) => ['ips' => []]); json_response(['success' => true]);
        }
        if ($route === '/admin/visit' && $method === 'DELETE') {
            $body = input_json(); $id = (string)($body['id'] ?? '');
            update_data('analytics', function ($data) use ($id) { $data['history'] = array_values(array_filter($data['history'] ?? [], fn($row) => ($row['id'] ?? '') !== $id)); return $data; });
            json_response(['success' => true]);
        }
        json_response(['error' => 'Rota administrativa não encontrada.'], 404);
    }
    if ($route === '/payment-config' && $method === 'GET') {
        $store = store_data(); $mode = $store['pagamento']['metodo'] ?? 'pix'; $pix = $store['pix'] ?? [];
        $available = $mode === 'gateway' ? (getenv('BLACKCAT_API_KEY') ?: '') !== '' : valid_pix($pix);
        json_response(['method' => $mode, 'available' => $available, 'pix' => ['key' => $pix['chave'] ?? '', 'receiverName' => $pix['nome'] ?? '', 'receiverCity' => $pix['cidade'] ?? ''], 'message' => $available ? 'Pagamento disponível.' : 'A loja ainda não configurou o pagamento.']);
    }
    require __DIR__ . '/php/payments.php';
    json_response(['error' => 'Rota não encontrada.'], 404);
} catch (InvalidArgumentException $error) {
    json_response(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Store API: ' . $error->getMessage());
    json_response(['error' => 'Não foi possível concluir a operação no servidor. Confira o registro de erros.'], 500);
}
