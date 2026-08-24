# Backend Laravel — image prête prod (nginx + php-fpm, non-root, healthcheck)
FROM serversideup/php:8.3-fpm-nginx AS base

# Extensions requises : pdo_pgsql (Postgres), gd (QR/dompdf), intl, zip, bcmath
USER root
# imagick : normalisation des cartons d'invitation (HEIC iPhone, PDF designer,
# redimensionnement). gd reste le repli pour les images web.
RUN install-php-extensions pdo_pgsql gd intl zip bcmath exif imagick

# Délégués ImageMagick pour HEIC (libheif) et PDF (ghostscript), + autorisation
# de lecture des PDF (désactivée par défaut sous Debian via policy.xml).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ghostscript libheif1 \
    && rm -rf /var/lib/apt/lists/* \
    && sed -ri 's/(rights=")none("[[:space:]]+pattern="PDF")/\1read|write\2/' \
         /etc/ImageMagick-6/policy.xml 2>/dev/null || true

# Limites d'upload : PHP (drop-in conf.d, prioritaire via le préfixe zz-) pour
# accepter les cartons haute résolution / HEIC / PDF, et nginx côté serversideup.
COPY docker/php-uploads.ini /usr/local/etc/php/conf.d/zz-uploads.ini
ENV NGINX_CLIENT_MAX_BODY_SIZE=22m

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
