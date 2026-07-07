# Backend Laravel — image prête prod (nginx + php-fpm, non-root, healthcheck)
FROM serversideup/php:8.3-fpm-nginx AS base

# Extensions requises : pdo_pgsql (Postgres), gd (QR/dompdf), intl, zip, bcmath
USER root
RUN install-php-extensions pdo_pgsql gd intl zip bcmath exif
USER www-data

WORKDIR /var/www/html

# Dépendances PHP (couche cache : on copie d'abord composer.*)
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Code applicatif
COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize --no-dev \
    && php artisan storage:link || true

# serversideup : exécute automatiquement au démarrage du conteneur
#  - la migration (--force)  - le lien de stockage  - le cache de config/route
ENV AUTORUN_ENABLED=true \
    AUTORUN_LARAVEL_MIGRATION=true \
    AUTORUN_LARAVEL_STORAGE_LINK=true \
    AUTORUN_LARAVEL_CONFIG_CACHE=true \
    AUTORUN_LARAVEL_ROUTE_CACHE=true \
    AUTORUN_LARAVEL_VIEW_CACHE=true \
    PHP_OPCACHE_ENABLE=1

# serversideup/php-fpm-nginx écoute sur 8080 (non-root)
EXPOSE 8080
