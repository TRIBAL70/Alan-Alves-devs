# Alan Barber — PHP + Android
Independent PHP 8.3 application. Render Docker hosting, PDO PostgreSQL, Argon2id passwords, HttpOnly secure sessions, CSRF and origin validation, admin/customer authorization, serialised transactional bookings to prevent overlaps.

## Required configuration
- DATABASE_URL: Internal Database URL of the dedicated `alan-barber-php-db` database. Save only in Render environment variables; never in this repository.
- ADMIN_EMAIL: owner email.
- ADMIN_SETUP_TOKEN: cryptographically random single-use admin activation secret. Visit `/login.html#setup=TOKEN`, enter owner email and choose a password. Never share this link.
- APP_URL: optional canonical HTTPS origin when using a custom domain; Render hostname is detected otherwise.

The application deliberately disables login and booking until DATABASE_URL is configured. It does not persist customer data on Render's ephemeral filesystem.
`bin/start.sh` migrates the schema on launch. Existing Sites/D1 records are not automatically imported and the original site remains intact.

## Security and recovery
Registration always creates a customer account. Selecting Administrator never grants permission. Admin setup requires a secret and is consumed transactionally. Recovery codes are displayed once, stored as SHA-256 hashes, and rotated on use. Sessions expire after 24 hours and are revoked on logout/password recovery.

## Deployment limits
Free Render Postgres created 2026-10-29 expires 2026-11-28. This is a trial deployment, not indefinite production hosting. Free web services can sleep after inactivity. Arrange durable production hosting before admitting real appointments. No paid plan has been purchased.

## Tests
`PHP_BINARY=/path/to/php python3 tests/integration.py` runs auth, permissions, CSRF, isolation, recovery and simultaneous reservation tests against disposable SQLite. Production PostgreSQL uses a transaction-scoped advisory lock for every booking write and owner activation.

## Android
Android 8+ WebView client, HTTPS-only same-origin navigation, external links opened in system browser, offline error and retry. APK lives at `public/downloads/alan-barber.apk` and is served with an attachment header at `/download/alan-barber.apk`. The signing key is kept outside the repository.
