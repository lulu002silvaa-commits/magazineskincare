<?php
declare(strict_types=1);

function cloudflare_ip(string $ip): bool {
    // Faixas oficiais: https://www.cloudflare.com/ips/ (revisadas em 30/10/2026).
    $ranges = ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18','190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13','104.24.0.0/14','172.64.0.0/13','131.0.72.0/22','2400:cb00::/32','2606:4700::/32','2803:f800::/32','2405:b500::/32','2405:8100::/32','2a06:98c0::/29','2c0f:f248::/32'];
    $address = @inet_pton($ip);
    if ($address === false) return false;
    foreach ($ranges as $range) {
        [$network, $bits] = explode('/', $range);
        $packed = inet_pton($network);
        if (strlen($packed) !== strlen($address)) continue;
        $bytes = intdiv((int)$bits, 8); $remaining = (int)$bits % 8;
        if (substr($packed, 0, $bytes) !== substr($address, 0, $bytes)) continue;
        if (!$remaining || ((ord($packed[$bytes]) ^ ord($address[$bytes])) & (0xff << (8 - $remaining))) === 0) return true;
    }
    return false;
}

function visitor_ip(array $server): string {
    $remote = $server['REMOTE_ADDR'] ?? '';
    // No Render, o tráfego chega pela borda Cloudflare, que define este cabeçalho.
    // Não confie nesse cabeçalho em hospedagens sem essa cadeia de proxy gerenciada.
    if (getenv('RENDER') === 'true') {
        foreach (['HTTP_CF_CONNECTING_IPV6', 'HTTP_CF_CONNECTING_IP'] as $header) {
            $candidate = trim($server[$header] ?? '');
            if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && !cloudflare_ip($candidate)) return $candidate;
        }
    }
    // Somente a hospedagem configurada pode fornecer o cabeçalho de proxy.
    if (getenv('RENDER') === 'true' || getenv('STORE_TRUST_PROXY') === '1') {
        $chain = explode(',', substr($server['HTTP_X_FORWARDED_FOR'] ?? '', 0, 2048));
        foreach (array_reverse($chain) as $candidate) {
            $candidate = trim($candidate);
            if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && !cloudflare_ip($candidate)) return $candidate;
        }
    }
    return filter_var($remote, FILTER_VALIDATE_IP) && !cloudflare_ip($remote) ? $remote : '';
}

function ip_location(string $ip, ?callable $lookup = null): array {
    $empty = ['city' => '', 'state' => '', 'country' => ''];
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) || cloudflare_ip($ip)) return $empty;
    $key = hash('sha256', $ip);
    $cache = read_data('ip-locations');
    if (($cache['entries'][$key]['expiresAt'] ?? 0) > time()) return $cache['entries'][$key]['location'];
    $reserved = false;
    update_data('ip-locations', function ($data) use ($key, $empty, &$reserved) {
        $now = time();
        if (($data['entries'][$key]['expiresAt'] ?? 0) > $now) return $data;
        if (($data['day'] ?? '') !== gmdate('Y-m-d')) { $data['day'] = gmdate('Y-m-d'); $data['requests'] = 0; }
        if (($data['requests'] ?? 0) >= 950) return $data;
        $data['entries'] = array_filter($data['entries'] ?? [], fn($entry) => ($entry['expiresAt'] ?? 0) > $now);
        $data['entries'] = array_slice($data['entries'], -2999, null, true);
        $data['entries'][$key] = ['expiresAt' => $now + 900, 'location' => $empty];
        $data['requests'] = ($data['requests'] ?? 0) + 1;
        $reserved = true;
        return $data;
    });
    if (!$reserved) return $empty;
    try {
        if ($lookup) {
            $result = $lookup($ip);
        } else {
            if (!function_exists('curl_init')) return $empty;
            $curl = curl_init('https://ipwho.is/' . rawurlencode($ip));
            curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT_MS => 600, CURLOPT_TIMEOUT_MS => 1200, CURLOPT_FOLLOWLOCATION => false, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
            $raw = curl_exec($curl);
            $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            curl_close($curl);
            $result = $status === 200 && is_string($raw) ? json_decode($raw, true) : null;
        }
        if (!is_array($result) || ($result['success'] ?? false) !== true || !is_string($result['ip'] ?? null) || @inet_pton($result['ip']) !== @inet_pton($ip)) return $empty;
        $location = [];
        foreach (['city' => 'city', 'state' => 'region', 'country' => 'country'] as $field => $source) {
            $value = $result[$source] ?? '';
            $matches = [];
            $location[$field] = is_string($value) && preg_match('/^.{0,120}/us', trim($value), $matches) ? $matches[0] : '';
        }
        update_data('ip-locations', function ($data) use ($key, $location) {
            $data['entries'][$key] = ['expiresAt' => time() + 86400 * 7, 'location' => $location];
            return $data;
        });
        return $location;
    } catch (Throwable) {
        // Indisponibilidade do provedor nunca deve impedir uma visita ou compra.
        return $empty;
    }
}

function enrich_visit_locations(array $visits): array {
    $cache = read_data('ip-locations')['entries'] ?? [];
    $lookups = 0; $resolved = [];
    foreach ($visits as &$visit) {
        if (cloudflare_ip($visit['ip'] ?? '')) {
            $visit = array_merge($visit, ['city' => '', 'state' => '', 'country' => '', 'locationNote' => 'IP de proxy · cidade indisponível']);
            continue;
        }
        if (!empty($visit['city']) && !empty($visit['state'])) continue;
        $ip = $visit['ip'] ?? '';
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) continue;
        if (!isset($resolved[$ip])) {
            $entry = $cache[hash('sha256', $ip)] ?? [];
            if (($entry['expiresAt'] ?? 0) > time()) $resolved[$ip] = $entry['location'];
            elseif ($lookups < 3) { $lookups++; $resolved[$ip] = ip_location($ip); }
            else continue;
        }
        if (array_filter($resolved[$ip])) $visit = array_merge($visit, $resolved[$ip]);
    }
    unset($visit);
    return $visits;
}
