<?php
declare(strict_types=1);
require __DIR__ . '/../php/gateway.php';
$checks = 0;
foreach ([400 => 'validation', 401 => 'credentials', 403 => 'permission', 422 => 'validation', 429 => 'rate_limit'] as $status => $reason) {
    try { gateway_decode_response('{"success":false,"message":"Private details"}', $status); throw new RuntimeException('Esperava recusa'); }
    catch (GatewayException $error) {
        if (!$error->definitive || $error->reason !== $reason || str_contains($error->getMessage(), 'Private')) throw new RuntimeException('Recusa classificada incorretamente');
        $checks++;
    }
}
foreach ([[false, 0], ['{"success":false}', 500], ['<html>proxy error</html>', 403], ['invalid', 200], ['{"success":false}', 200]] as [$raw, $status]) {
    try { gateway_decode_response($raw, $status); throw new RuntimeException('Esperava incerteza'); }
    catch (GatewayException $error) { if ($error->definitive) throw new RuntimeException('Não pode liberar repetição incerta'); $checks++; }
}
$reply = gateway_decode_response('{"success":true,"data":{"transactionId":"TEST-1"}}', 201);
if ($reply['data']['transactionId'] !== 'TEST-1') throw new RuntimeException('Resposta válida não foi preservada');
echo (++$checks) . " verificações da BlackCat passaram sem criar cobranças externas.\n";
