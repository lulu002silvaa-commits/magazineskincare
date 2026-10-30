<?php
declare(strict_types=1);
require __DIR__ . '/../php/bootstrap.php';
require __DIR__ . '/../php/geolocation.php';
function verify_geo(string $name, bool $condition): void {
    if (!$condition) throw new RuntimeException($name);
    echo "OK $name\n";
}
putenv('RENDER=false'); putenv('STORE_TRUST_PROXY=0');
$server = ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_X_FORWARDED_FOR' => '1.1.1.1, 8.8.8.8'];
verify_geo('Cabeçalho de proxy ignorado sem confiança explícita', visitor_ip($server) === '127.0.0.1');
putenv('STORE_TRUST_PROXY=1');
verify_geo('Proxy usa último IP público acrescentado', visitor_ip($server) === '8.8.8.8');
$server['HTTP_CF_CONNECTING_IP'] = '9.9.9.9';
verify_geo('Cabeçalho Cloudflare não é confiado fora do Render', visitor_ip($server) === '8.8.8.8');
putenv('RENDER=true');
$server['HTTP_X_FORWARDED_FOR'] = '9.9.9.9, 172.70.140.156';
verify_geo('Render captura visitante em vez do IP da borda Cloudflare', visitor_ip($server) === '9.9.9.9');
$server['HTTP_CF_CONNECTING_IP'] = 'inválido';
verify_geo('Cabeçalho inválido usa cadeia e ignora IP da borda', visitor_ip($server) === '9.9.9.9');
verify_geo('Faixas Cloudflare identificadas em IPv4 e IPv6', cloudflare_ip('172.70.140.156') && cloudflare_ip('162.159.114.84') && cloudflare_ip('104.22.182.4') && cloudflare_ip('2606:4700::1') && !cloudflare_ip('8.8.8.8'));
$oldProxy = enrich_visit_locations([['id' => 'old-proxy', 'ip' => '172.70.140.156', 'city' => 'Cidade do proxy', 'state' => 'Proxy', 'country' => 'Brasil']]);
verify_geo('Cidade antiga de proxy não é atribuída ao visitante', $oldProxy[0]['city'] === '' && $oldProxy[0]['locationNote'] !== '');
putenv('RENDER=false');
verify_geo('IP privado não gera consulta externa', ip_location('127.0.0.1', fn() => throw new RuntimeException('Não consultar'))['city'] === '');
$calls = 0;
$lookup = function ($ip) use (&$calls) { $calls++; return ['success' => true, 'ip' => $ip, 'city' => 'São Paulo', 'region' => 'São Paulo', 'country' => 'Brazil']; };
$first = ip_location('8.8.8.8', $lookup);
verify_geo('Cidade estado e país retornados pelo provedor', $first === ['city' => 'São Paulo', 'state' => 'São Paulo', 'country' => 'Brazil']);
verify_geo('Cache evita consulta repetida', ip_location('8.8.8.8', $lookup) === $first && $calls === 1);
$enriched = enrich_visit_locations([['id' => 'old-visit', 'ip' => '8.8.8.8', 'city' => '', 'state' => '', 'country' => '']]);
verify_geo('Visita antiga pode receber cidade e estado do cache', $enriched[0]['city'] === 'São Paulo' && $enriched[0]['state'] === 'São Paulo' && $enriched[0]['ip'] === '8.8.8.8');
verify_geo('Falha do provedor mantém navegação funcional', ip_location('1.1.1.1', fn() => throw new RuntimeException('Timeout'))['city'] === '');
verify_geo('Falha também recebe cache', ip_location('1.1.1.1', $lookup)['city'] === '' && $calls === 1);
verify_geo('Resposta de outro IP rejeitada', ip_location('9.9.9.9', fn() => ['success' => true, 'ip' => '8.8.8.8', 'city' => 'Errada'])['city'] === '');
$ipv6 = ip_location('2001:4860:4860::8888', fn() => ['success' => true, 'ip' => '2001:4860:4860:0:0:0:0:8888', 'city' => 'Cidade IPv6', 'region' => 'Estado', 'country' => 'País']);
verify_geo('IPv6 equivalente não perde localização por formatação', $ipv6['city'] === 'Cidade IPv6');
