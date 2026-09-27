# RetailCore POS_ERP — System Status & Deployment Sync Monitor

This document describes the architecture, endpoints, configuration, and deployment procedures for the **System Status & Deployment Sync Monitor**.

---

## 1. Overview

The System Status & Deployment Sync Monitor provides authoritative operational visibility on the administrator dashboard. It answers two fundamental questions:
1. **"Which version is currently running where?"**
2. **"Is the Live Server actually running the latest code from GitHub?"**

The monitor is strictly diagnostic/observability-oriented: it does not perform automatic deployments, pull requests, or database modifications.

---

## 2. API Endpoint

### `GET /api/v1/system/status`
- **Authentication**: Required (`auth:sanctum`).
- **Authorization**: Authenticated tenant users / administrators.
- **Request Headers (Optional)**:
  - `X-Frontend-Version`: Client-side build SHA (e.g. `82b2d50`).
- **Query Parameters (Optional)**:
  - `frontend_version`: Alternative query parameter fallback for client build SHA.

### Example Response Payload
```json
{
  "success": true,
  "data": {
    "environment": "production",
    "github": {
      "repository": "tofayelah/POS-Project",
      "branch": "main",
      "commit": "82b2d50",
      "commit_full": "82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89",
      "commit_message": "fix(inventory): remove duplicate stock-in implementation",
      "status": "connected"
    },
    "ai_studio": {
      "commit": null,
      "build_id": null,
      "status": "not_reported"
    },
    "live": {
      "environment": "PRODUCTION",
      "commit": "82b2d50",
      "commit_full": "82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89",
      "branch": "main",
      "deployed_at": "2026-09-27T13:15:01+06:00",
      "backend": {
        "status": "healthy",
        "version": "82b2d50",
        "api_version": "v1"
      },
      "frontend": {
        "status": "healthy",
        "version": "82b2d50"
      },
      "database": {
        "status": "healthy"
      }
    },
    "comparison": {
      "github_vs_live": "UP_TO_DATE",
      "backend_vs_frontend": "SYNCHRONIZED",
      "github_vs_ai_studio": "NOT_REPORTED"
    },
    "checked_at": "2026-09-27T14:26:00Z"
  }
}
```

---

## 3. Environment Variables & Configuration

Configuration is centrally loaded from `backend/config/system.php`:

| Environment Variable | Default | Purpose |
|---|---|---|
| `RETAILCORE_ENVIRONMENT` | `APP_ENV` | Environment identifier (`local`, `staging`, `production`) |
| `RETAILCORE_GIT_COMMIT` | `GIT_COMMIT` | Authoritative Git commit SHA running on the backend |
| `RETAILCORE_GIT_BRANCH` | `main` | Git branch deployed on backend |
| `RETAILCORE_DEPLOYED_AT` | Current / null | ISO-8601 timestamp of last deployment |
| `GITHUB_REPOSITORY` | `tofayelah/POS-Project` | Target GitHub repository to check for latest main commit |
| `GITHUB_BRANCH` | `main` | Target GitHub branch to track |
| `GITHUB_API_URL` | `https://api.github.com` | Base URL for GitHub API |
| `GITHUB_COMMIT_OVERRIDE`| `null` | Test/offline override for GitHub latest commit |
| `AI_STUDIO_GIT_COMMIT` | `null` | Commit SHA reported by AI Studio preview environment |
| `AI_STUDIO_BUILD_ID` | `null` | Build identifier reported by AI Studio |

---

## 4. Frontend Version Injection

In the Vite React application, build metadata is safe and non-sensitive:
- `VITE_GIT_COMMIT`: Injected at build time by CI/CD pipeline (defaults to repository baseline).
- `VITE_APP_VERSION`: Semantic version string.
- `VITE_BUILD_TIME`: Build timestamp.

The frontend sends its version via `X-Frontend-Version` header on each status query, enabling the backend to detect backend-to-frontend build skew.

---

## 5. Version Comparison Engine

The comparison engine evaluates version relationships without guessing:

1. **GitHub ↔ Live**:
   - `UP_TO_DATE`: When GitHub latest commit matches Live Server commit.
   - `OUTDATED`: When Live Server commit differs from GitHub latest commit.
   - `UNKNOWN`: When GitHub API is unreachable, rate-limited, or network is down.

2. **Backend ↔ Frontend**:
   - `SYNCHRONIZED`: When backend version matches frontend bundle version.
   - `VERSION_MISMATCH`: When client is running an older or mismatched build bundle.
   - `NOT_REPORTED`: When frontend version was not provided in request.

3. **GitHub ↔ AI Studio**:
   - `UP_TO_DATE` / `VERSION_MISMATCH`: When AI Studio metadata is explicitly configured.
   - `NOT_REPORTED`: When AI Studio environment variables are absent.

---

## 6. Security Standards

- **No Secret Exposure**: The status endpoint never outputs database credentials, passwords, `APP_KEY`, API tokens, filesystem paths, IP addresses, or internal network hostnames.
- **Authentication**: Requires valid user session / Sanctum token.
- **Multi-Tenant Isolation**: The system status is global infrastructure telemetry; it does not touch or pollute tenant Company records or subledgers.

---

## 7. Production Deployment Procedure

During automated deployment (e.g. GitHub Actions, Docker build, or deployment script), inject the commit metadata:

```bash
# In backend .env or container environment
RETAILCORE_GIT_COMMIT=$(git rev-parse HEAD)
RETAILCORE_GIT_BRANCH=$(git branch --show-current)
RETAILCORE_DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# In frontend build step
export VITE_GIT_COMMIT=$(git rev-parse HEAD)
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
npm run build
```

---

## 8. Troubleshooting

- **GitHub reports "Unavailable"**:
  - The server might have hit GitHub API rate limits or has outbound internet restrictions. Live status is still reported accurately; comparison falls back to `UNKNOWN` safely.
- **Frontend shows "Mismatch"**:
  - The browser may be caching an older JavaScript bundle. Hard-refresh the browser or clear service worker/assets cache.
- **Live Server shows "Outdated"**:
  - New commits have been pushed to GitHub `main` that have not yet been deployed to the live production server.
