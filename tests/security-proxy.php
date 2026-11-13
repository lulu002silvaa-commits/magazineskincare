<?php
declare(strict_types=1);
putenv('STORE_LOAD_ENV=0');
require __DIR__ . '/../php/bootstrap.php';
putenv('RENDER=false'); putenv('STORE_TRUST_PROXY=0');
$_SERVER['HTTPS'] = 'off'; $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
if (request_is_https()) throw new RuntimeException('Header de proxy não confiável foi aceito.');
putenv('RENDER=true');
if (!request_is_https()) throw new RuntimeException('HTTPS do proxy Render não foi reconhecido.');
$_SERVER['HTTP_X_FORWARDED_PROTO'] = 'http';
if (request_is_https()) throw new RuntimeException('HTTP foi confundido com HTTPS.');
$_SERVER['HTTPS'] = 'on';
if (!request_is_https()) throw new RuntimeException('HTTPS direto não foi reconhecido.');
echo "HTTPS direto e proxy confiável verificados sem alterar credenciais ou dados.\n";
