# RetailCore ERP

Production-grade, self-hosted Retail POS + Inventory + Purchasing + Accounting ERP.

## Architecture
- **Backend:** Laravel 12 API (PHP 8.3+)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker Compose, Nginx

## Environment Setup & Installation

> **Note on Google AI Studio Environment:**
> The AI Studio live preview container natively supports Node.js applications on port 3000. It does not have PHP or Docker installed. Therefore, this repository is designed to be **exported (via GitHub or ZIP)** and run on your local machine or a VPS using Docker Compose.

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone & Setup
```bash
git clone <repository-url> retailcore-erp
cd retailcore-erp

# Copy environment variables
cp backend/.env.example backend/.env
```

### 2. Start the Docker Environment
```bash
docker-compose up -d
```

### 3. Backend Initialization
```bash
# Enter the backend container
docker-compose exec backend bash

# Install dependencies (requires Laravel 12 / PHP 8.3+)
composer install

# Generate application key
php artisan key:generate

# Run migrations and seeders
php artisan migrate --seed
```

### 4. Access the Application
- **Frontend SPA (Dev):** http://localhost:3000
- **Frontend SPA (Prod Build):** http://localhost
- **Backend API:** http://localhost:8000/api/v1

### Initial Admin Credentials
- **Email:** admin@retailcore.test
- **Password:** password (Development only)

---

## Technical Documentation
- Architecture, rules, and known technical debt are documented in `docs/AI_CONTEXT.md`.
- Database entity relationships and Sprint plans are managed per phase.
