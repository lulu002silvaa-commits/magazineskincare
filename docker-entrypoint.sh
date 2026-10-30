#!/bin/sh
set -e
# Evita iniciar um painel vazio em armazenamento descartável na hospedagem.
if [ "${STORE_REQUIRE_PERSISTENT_DISK:-0}" = "1" ]; then
    if ! awk '$2 == "/var/www/html/.data" { found=1 } END { exit !found }' /proc/mounts; then
        echo "ERRO: monte o disco persistente em /var/www/html/.data antes de iniciar o painel." >&2
        exit 1
    fi
fi
mkdir -p /var/www/html/.data
chown -R www-data:www-data /var/www/html/.data
exec docker-php-entrypoint "$@"
