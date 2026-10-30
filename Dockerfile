FROM php:8.4-apache
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4-openssl-dev ca-certificates && docker-php-ext-install curl && rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite
RUN printf '<Directory /var/www/html>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/store.conf && a2enconf store
COPY . /var/www/html/
RUN mkdir -p /var/www/html/.data && chown -R www-data:www-data /var/www/html/.data
RUN printf 'upload_max_filesize=5M\npost_max_size=8M\ndisplay_errors=Off\nlog_errors=On\nexpose_php=Off\ndate.timezone=America/Sao_Paulo\n' > /usr/local/etc/php/conf.d/store.ini
EXPOSE 80
COPY docker-entrypoint.sh /usr/local/bin/store-entrypoint
RUN chmod +x /usr/local/bin/store-entrypoint
ENTRYPOINT ["store-entrypoint"]
CMD ["apache2-foreground"]
