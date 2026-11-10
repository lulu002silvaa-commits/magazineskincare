<?php
declare(strict_types=1);

final class GatewayException extends RuntimeException {
    public function __construct(public readonly string $reason, public readonly bool $definitive, public readonly int $httpStatus = 0) {
        parent::__construct(match ($reason) {
            'credentials' => 'O provedor Pix recusou a credencial da loja. Entre em contato com a loja.',
            'permission' => 'O provedor Pix não autorizou a conta da loja. Entre em contato com a loja.',
            'validation' => 'O provedor Pix recusou os dados do pedido. Confira os dados e tente novamente.',
            'rate_limit' => 'O provedor Pix está recebendo muitas solicitações. Aguarde um minuto e tente novamente.',
            'provider_error' => 'A BlackCat retornou um erro interno ao gerar o Pix. A loja precisa conferir a tentativa no provedor antes de emitir outra cobrança.',
            default => 'Não foi possível confirmar a resposta do provedor Pix. Consulte a loja antes de tentar outra cobrança.'
        });
    }
}

function gateway_decode_response(string|false $raw, int $status): array {
    // Só uma recusa explícita permite repetir uma criação. Timeout/5xx podem
    // ocorrer depois que o banco já criou o Pix e exigem conferência.
    if ($raw === false) throw new GatewayException('connection', false, $status);
    $result = json_decode($raw, true);
    $reason = match ($status) {
        401 => 'credentials', 403 => 'permission', 400, 422 => 'validation',
        429 => 'rate_limit', 500, 502, 503, 504 => 'provider_error', default => 'unconfirmed'
    };
    if ($status < 200 || $status >= 300) {
        $definitive = in_array($status, [400, 401, 403, 404, 405, 422, 429], true)
            && is_array($result) && ($result['success'] ?? null) === false;
        throw new GatewayException($reason, $definitive, $status);
    }
    if (!is_array($result) || ($result['success'] ?? null) !== true) throw new GatewayException('unconfirmed', false, $status);
    return $result;
}

function gateway_request(string $path, ?array $payload = null): array {
    if (!function_exists('curl_init')) throw new GatewayException('configuration', true);
    $curl = curl_init('https://api.blackcatoficial.com/api' . $path);
    $headers = ['Accept: application/json', 'X-API-Key: ' . (getenv('BLACKCAT_API_KEY') ?: '')];
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 30, CURLOPT_FOLLOWLOCATION => false];
    if ($payload !== null) { $headers[] = 'Content-Type: application/json'; $options[CURLOPT_POST] = true; $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_THROW_ON_ERROR); }
    $options[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($curl, $options);
    $raw = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    return gateway_decode_response($raw, $status);
}
