<?php
declare(strict_types=1);

function visitor_ip(array $server): string {
    $remote = $server['REMOTE_ADDR'] ?? '';
    // Somente a hospedagem configurada pode fornecer o cabeçalho de proxy.
    if (getenv('RENDER') === 'true' || getenv('STORE_TRUST_PROXY') === '1') {
        $chain = explode(',', substr($server['HTTP_X_FORWARDED_FOR'] ?? '', 0, 2048));
        foreach (array_reverse($chain) as $candidate) {
            $candidate = trim($candidate);
            if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return $candidate;
        }
    }
    return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '';
}

function ip_location(string $ip, ?callable $lookup = null): array {
    $empty = ['city' => '', 'state' => '', 'country' => ''];
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return $empty;
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
        if (!is_array($result) || ($result['success'] ?? false) !== true || ($result['ip'] ?? '') !== $ip) return $empty;
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
