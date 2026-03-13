# Mitarbeiterapp Pro

Stack: React 18 + TypeScript + Vite (Frontend) | Django 5 + DRF + PostgreSQL 16 (Backend) | Docker + GitHub Actions (Deployment)

---

## Plan zur Veroeffentlichung

### 1. Release-Vorbereitung (T-7 bis T-2)
- [ ] Scope finalisieren (Features, Bugfixes, bekannte Restpunkte)
- [ ] Version setzen und Changelog aktualisieren
- [ ] GitHub Secrets pruefen (siehe Abschnitt "GitHub Secrets" unten)
- [ ] Sicherheitscheck durchfuehren (Secrets, CORS, HTTPS, Berechtigungen)

### 2. Qualitaets-Gate (T-2 bis T-1)
- [ ] Abhaengigkeiten installieren: `npm ci`
- [ ] Lint ausfuehren: `npm run lint`
- [ ] Tests ausfuehren: `npm run test:run`
- [ ] i18n-Validierung ausfuehren: `npm run i18n:check:strict`
- [ ] Build pruefen: `npm run build`

### 3. Staging/Abnahme (T-1)
- [ ] Deployment auf Testumgebung
- [ ] Smoke-Tests: Login, Zeiterfassung, Export, E-Mail, Admin
- [ ] Backend-Healthcheck pruefen: `/backend/health`
- [ ] Formale Freigabe dokumentieren (Go/No-Go)

### 4. Produktion (T)
- [ ] Wartungsfenster und Ansprechpartner kommunizieren
- [ ] Letztes Backup von Datenbank und `.env.app` erstellen
- [ ] `public/config.json` → `api_endpoint` auf absolute Produktions-URL setzen (z.B. `https://deine-domain.de/backend`)
- [ ] Branch in `main` mergen → GitHub Actions startet automatisch (Docker Image pushen + Frontend per FTP deployen)
- [ ] Nginx + SSL Status pruefen (`/backend/` → `127.0.0.1:8000`)

### 5. Post-Release (T+0 bis T+1)
- [ ] Smoke-Tests in Produktion
- [ ] Monitoring aktiv pruefen (Error-Logs, Healthcheck, E-Mail)
- [ ] Stakeholder-Info "Release abgeschlossen" versenden
- [ ] Nacharbeiten in Ticketliste erfassen

### Rollback-Plan
- [ ] Ausloeser definieren (z. B. kritische Fehler in Kernfunktionen)
- [ ] Letztes stabiles Docker-Image auf dem Server neu starten: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Datenbank-Backup rueckspielen (nur bei Bedarf)
- [ ] Kommunikationsvorlage fuer Rollback vorbereiten

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
