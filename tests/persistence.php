<?php
declare(strict_types=1);
require __DIR__ . '/../php/bootstrap.php';
ini_set('error_log', STORE_DATA . '/persistence-test.log');
function verify_storage(string $name, bool $condition): void {
    if (!$condition) throw new RuntimeException($name);
    echo "OK $name\n";
}
$expected = ['visits' => [['id' => 'preservado']], 'orders' => ['paid' => true]];
update_data('persistence-test', fn() => $expected);
verify_storage('Gravação cria cópia de segurança válida', json_decode(file_get_contents(STORE_DATA . '/persistence-test.backup.json'), true) === $expected);
file_put_contents(STORE_DATA . '/persistence-test.json', '{interrompido');
verify_storage('Arquivo corrompido usa cópia sem zerar os dados', read_data('persistence-test') === $expected);
update_data('persistence-test', function ($data) { $data['new'] = true; return $data; });
verify_storage('Nova gravação preserva registros recuperados', read_data('persistence-test')['visits'] === $expected['visits']);
unlink(STORE_DATA . '/persistence-test.json');
verify_storage('Arquivo principal ausente usa cópia existente', read_data('persistence-test')['new'] === true);
file_put_contents(STORE_DATA . '/persistence-test.backup.json', '{inválido');
$failed = false;
try { read_data('persistence-test'); } catch (RuntimeException) { $failed = true; }
verify_storage('Corrupção sem cópia válida não reinicia com dados vazios', $failed);
