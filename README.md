# Mitarbeiterapp Pro

Stack: React 18 + TypeScript + Vite (Frontend) | Django 5 + DRF + PostgreSQL 16 (Backend) | Docker + GitHub Actions (Deployment)

---


## GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret

| Secret | Beschreibung |
|--------|-------------|
| `FTP_SERVER` | FTP-Hostname des Webservers |
| `FTP_USERNAME` | FTP-Benutzername |
| `FTP_PASSWORD` | FTP-Passwort |
| `FTP_SERVER_DIR` | Zielpfad z.B. `/public_html/` |
| `API_URL` | `https://deine-domain.de/backend` |

---

## Einmaliges Admin-Setup (Server per SSH)

Vollstaendige Anleitung: `docs/ADMIN_SERVER_SETUP.md`

Kurzfassung:
1. Verzeichnis `/opt/mitarbeiterapp` anlegen
2. `docker-compose.prod.yml` + `.env.app` + `.env` auf den Server laden
3. `.env.app` mit Produktions-Secrets befuellen (`DEBUG=False`, `JWT_COOKIE_SECURE=True` etc.)
4. `DOCKER_IMAGE` in `.env` auf `ghcr.io/FriggemannMichael/mitarbeiterapp:latest` setzen
5. Bei ghcr.io einloggen: `echo "<PAT>" | docker login ghcr.io -u FriggemannMichael --password-stdin`
6. `docker compose -f docker-compose.prod.yml up -d`

---

## Lokale Entwicklung

```bash
# Backend (Django in Docker)
cd backend-django
docker compose up -d

# Frontend (Vite Dev Server)
npm run dev
```

Vite-Proxy leitet `/backend` → `http://localhost:8000` weiter.
`public/config.json` → `api_endpoint` muss `/backend` sein (relativ, ohne Port).

---

## Relevante Doku
- Deployment: `docs/ADMIN_SERVER_SETUP.md`
- Backend: `docs/backend/README.md`
- Skripte: `docs/scripts/README.md`
