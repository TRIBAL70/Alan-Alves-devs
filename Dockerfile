FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libonig-dev && docker-php-ext-install pdo_pgsql mbstring && a2enmod rewrite headers && rm -rf /var/lib/apt/lists/*
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf && printf '<Directory /var/www/html/public>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/alan.conf && a2enconf alan
WORKDIR /var/www/html
COPY . .
RUN chmod +x bin/start.sh
EXPOSE 10000
CMD ["bin/start.sh"]
