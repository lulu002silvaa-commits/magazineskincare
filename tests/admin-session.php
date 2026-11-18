<?php
declare(strict_types=1);
require __DIR__ . '/../php/bootstrap.php';
// Runs only in the isolated test directory configured by tests/run.ps1.
if (getenv('STORE_LOAD_ENV') !== '0' || !getenv('TEST_DATA_DIR') || realpath(STORE_DATA) !== realpath(getenv('TEST_DATA_DIR'))) {
    throw new RuntimeException('Use o ambiente de testes isolado.');
}
ini_set('session.gc_probability', '0');
start_admin_session();
if ((int)ini_get('session.gc_maxlifetime') !== ADMIN_SESSION_IDLE_SECONDS) throw new RuntimeException('Coleta da sessão não acompanha prazo de login.');
$id = session_id();
$_SESSION['admin'] = true;
$_SESSION['lastActive'] = time();
$csrf = $_SESSION['csrf'];
session_write_close();
$file = STORE_DATA . '/sessions/sess_' . $id;
touch($file, time() - 1800);
session_id($id);
start_admin_session();
session_gc();
if (empty($_SESSION['admin']) || $_SESSION['csrf'] !== $csrf || !is_file($file)) throw new RuntimeException('Sessão foi perdida antes de uma hora.');
$storage = storage_diagnostics();
if (!$storage['writable'] || $storage['sessionIdleSeconds'] !== 3600) throw new RuntimeException('Diagnóstico de armazenamento inválido.');
session_destroy();
echo "OK Sessão mantém autenticação e CSRF entre requisições e coleta respeita uma hora.\n";
