#!/bin/sh
set -e
mkdir -p /var/www/html/.data
chown -R www-data:www-data /var/www/html/.data
exec docker-php-entrypoint "$@"
