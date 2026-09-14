# Production Deployment Guide

## 1. Environment & Architecture
The POS/ERP application is designed to be deployed using Docker, separating concerns into individual containers:
- **Nginx (Reverse Proxy & Static Files)**: Serves the built React SPA (`frontend/dist`) and proxies API requests (`/api/*`) to the Laravel backend. Handles SSL termination (e.g. via Certbot/Let's Encrypt).
- **Backend (PHP-FPM/Laravel)**: Executes business logic.
- **Database (PostgreSQL 16)**: Holds all relational and transactional data. Persistent volume required.
- **Cache/Queue (Redis)**: Optional but recommended for handling background queue jobs and caching.

## 2. Environment Configuration
1. Ensure `.env` is properly populated based on `.env.example`.
2. **Critical Variables**:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_KEY` must be generated and securely stored.
   - `APP_URL` must match your domain (e.g., `https://erp.example.com`).
   - `CORS_ALLOWED_ORIGINS` should strictly match the frontend domain.
   - Database credentials (`DB_PASSWORD`, etc.) must be strong and not tracked in source control.

## 3. Database Migration
Database migrations should be run using the `--force` flag in production to bypass confirmation prompts.
```bash
docker-compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

## 4. Storage & Uploads
Ensure the `storage/app/public` directory is linked properly and accessible by the web server.
```bash
docker-compose -f docker-compose.prod.yml exec app php artisan storage:link
```
Ensure persistent Docker volumes are mapped to `/var/www/html/storage`.

## 5. Caching & Optimization
Cache configuration and routes for performance:
```bash
docker-compose -f docker-compose.prod.yml exec app php artisan config:cache
docker-compose -f docker-compose.prod.yml exec app php artisan route:cache
docker-compose -f docker-compose.prod.yml exec app php artisan view:cache
```

## 6. Nginx & HTTPS
- Place the SSL certificates in the designated Nginx ssl volume.
- Enforce `Strict-Transport-Security` (HSTS).
- Route `location /` to the static frontend build.
- Route `location /api` to PHP-FPM using `fastcgi_pass`.

## 7. Health Checks & Logs
- Set up automated monitoring (e.g., Uptime Kuma or Datadog) hitting `GET /api/v1/health`.
- Map Laravel logs (`storage/logs/laravel.log`) to an external log aggregator (e.g., ELK stack, Datadog).
- Ensure Docker containers have appropriate restart policies (`restart: unless-stopped`).

## 8. Rollback Procedures
1. Quickly revert the Docker image tag to the previous stable release.
2. Run database rollback if migrations were applied: `php artisan migrate:rollback --step=1 --force` (Note: highly risky in production if data was already written. Always backup before migration).
3. Clear caches: `php artisan cache:clear && php artisan config:cache`.
