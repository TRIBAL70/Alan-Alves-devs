#!/bin/sh
set -eu
sed -i "s/Listen 80/Listen ${PORT:-10000}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${PORT:-10000}>/" /etc/apache2/sites-available/000-default.conf
if [ -n "${DATABASE_URL:-}" ]; then php bin/migrate.php; else echo "Database connection pending; authentication remains disabled."; fi
exec apache2-foreground
