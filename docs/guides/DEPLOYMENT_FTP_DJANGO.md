# Deployment Runbook (FTP + Django Backend)

Stand: 2026-03-11  
Projekt: Mitarbeiterapp (Vite PWA + Django API)

Ergaenzend:
- Finale Abnahme/Go-Live: `docs/guides/GO_LIVE_CHECKLIST.md`

## 1. Zielbild fuer Kundenserver

Dieses Projekt besteht aus zwei Teilen:

1. Frontend (statisch): wird per FTP auf den Webspace hochgeladen (`dist/` Inhalt).
2. Backend (Django + PostgreSQL): laeuft ausschliesslich in Docker (`docker compose`).

Wichtig: Reines "nur FTP auf Shared Hosting" reicht nicht.  
Der Kundenserver braucht Docker Engine + Docker Compose fuer das Backend.

## 2. Voraussetzungen (vor dem Deployment)

- Domain mit HTTPS (gueltiges TLS Zertifikat).
- FTP/SFTP Zugang fuer den Webroot.
- SSH-Zugriff fuer Docker-Deployment.
- Docker Engine + Docker Compose Plugin installiert.
- Freie Ports fuer Reverse Proxy -> Container (`8000` intern fuer Django).
- Reverse Proxy fuer `/backend` -> Django (`127.0.0.1:8000`).

Vorbereitete Deploy-Artefakte in diesem Repo:

- `backend-django/docker-compose.prod.yml`
- `backend-django/.env.app.example`
- `backend-django/.env.docker.example`
- `scripts/deploy-prod.ps1`

## 3. Release lokal vorbereiten

Im Projektroot:

```bash
npm ci
npm run lint
npm run test:run
npm run build
```

Erwartung: Build erzeugt `dist/` ohne Fehler.

## 4. Frontend fuer Produktion konfigurieren

Datei: `public/config.json`

Pflichtfelder vor Build pruefen:

- `technical.api_endpoint`: `https://<kundendomain>/backend`
- `technical.pdf_api_key`: muss exakt dem Backend-Wert `PDF_API_SECRET` entsprechen
- `technical.cors_allowed_origins`: muss Kundendomain enthalten
- Firmen-/Empfaengerdaten (`company.*`, `default_email`, etc.) auf Kunde setzen

Danach neu bauen:

```bash
npm run build
```

## 5. Frontend per FTP deployen

1. Backup auf Server erstellen (aktueller Webroot).
2. Inhalt von lokalem `dist/` in den Ziel-Webroot hochladen (nicht den Ordnernamen `dist`, sondern dessen Inhalt).
3. Alte Asset-Dateien entfernen, damit keine verwaisten Bundles bleiben.
4. Sicherstellen, dass folgende Dateien online vorhanden sind:
   - `index.html`
   - `config.json`
   - `manifest.webmanifest`
   - `sw.js`
   - `registerSW.js`
   - `assets/*`

## 6. Backend auf dem Server bereitstellen

### 6.1 Dateien

Ordner `backend-django/` auf den Server kopieren (FTP oder Git-Deploy).  
Der Start erfolgt danach ausschliesslich per `docker compose`.

### 6.2 Environment anlegen

In `backend-django/.env.app` (Beispielwerte ersetzen):

```env
SECRET_KEY=<lang-unguessable>
DEBUG=False
ALLOWED_HOSTS=<kundendomain>,www.<kundendomain>
ALLOWED_ORIGINS=https://<kundendomain>

DB_NAME=mitarbeiterapp
DB_USER=mitarbeiter
DB_PASSWORD=<starkes-passwort>
DB_HOST=db
DB_PORT=5432

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
ADMIN_ROLE=customer_admin
CUSTOMER_KEY=default

SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USERNAME=<smtp-user>
SMTP_PASSWORD=<smtp-pass>
SMTP_ENCRYPTION=tls
FROM_EMAIL=<absender>
FROM_NAME=<anzeige-name>
RECIPIENT_EMAIL=<interner-empfaenger>

ENCRYPTION_KEY=<stabiler-key>
JWT_SECRET=<lang-unguessable>
JWT_EXPIRE_HOURS=8
JWT_COOKIE_NAME=jwt
JWT_COOKIE_SECURE=True

PDF_API_SECRET=<lang-unguessable>
PDF_RATE_LIMIT=10
```

In `backend-django/.env` (docker compose substitution):

```env
DB_NAME=mitarbeiterapp
DB_USER=mitarbeiter
DB_PASSWORD=<gleich-wie-oben>
```

Tipp:

1. `backend-django/.env.app.example` -> `backend-django/.env.app` kopieren
2. `backend-django/.env.docker.example` -> `backend-django/.env` kopieren
3. Werte ausfuellen

### 6.3 Starten (empfohlen: Prod-Compose-Datei)

```bash
cd backend-django
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web python manage.py migrate
```

Containerstatus pruefen:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
```

Alternativ als Ein-Kommando-Deploy (inkl. Preflight, Migration, Healthcheck):

```powershell
.\scripts\deploy-prod.ps1
```

Optional (abweichende Pfade/Dateinamen):

```powershell
.\scripts\deploy-prod.ps1 -BackendDir "C:\apps\mitarbeiter\backend-django" -ComposeFile "docker-compose.prod.yml"
```

Hinweis: Initiale Migrationen sind vorhanden.  
Bei Model-Aenderungen immer neue Migrationen erzeugen und mitdeployen:

```bash
python manage.py makemigrations
python manage.py migrate
```

## 7. Reverse Proxy + SPA Routing (serverseitig)

### 7.1 API-Weiterleitung

- `/backend/*` muss an Django (`http://127.0.0.1:8000/*`) weitergeleitet werden.
- Request Header `X-Forwarded-Proto`, `Host`, `X-Real-IP` durchreichen.

### 7.2 SPA Fallback

- Direktaufrufe wie `/admin` muessen auf `/index.html` zeigen.
- Ausnahme: echte Dateien (`/assets/*`, `/manifest.webmanifest`, `/sw.js`, etc.) und `/backend/*`.

Beispiel Nginx (schematisch):

```nginx
location /backend/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

## 8. Nach Deployment testen

Pflicht-Smoke-Tests:

1. `https://<kundendomain>/` laedt ohne 404.
2. `https://<kundendomain>/admin` laedt (SPA Fallback ok).
3. `https://<kundendomain>/backend/health` liefert JSON mit `success=true`.
4. Admin-Login funktioniert.
5. PDF-Versand funktioniert (200) mit gesetztem `pdf_api_key`.
6. Mit falschem `X-Api-Key` liefert `/api/send-pdf` -> 401.
7. Mehr als `PDF_RATE_LIMIT` Requests/min -> 429.

## 8.1 Deploy-Reihenfolge (kurz)

1. `public/config.json` fuer Kundenwerte setzen (`api_endpoint`, `pdf_api_key`).
2. Frontend bauen (`npm run build`) und `dist/` per FTP hochladen.
3. Backend-Dateien auf Server aktualisieren (`backend-django/`).
4. Serverseitig `.\scripts\deploy-prod.ps1` ausfuehren.
5. Reverse-Proxy + SPA-Routing pruefen.
6. Smoke-Tests aus Abschnitt 8 ausfuehren.

## 9. Code Review: Was zwingend beachtet werden muss

1. JWT-Cookie-Sicherheit ist jetzt per Env steuerbar (`JWT_COOKIE_SECURE`).  
   Datei: `backend-django/api/services/auth_service.py`  
   In Produktion muss `JWT_COOKIE_SECURE=True` gesetzt sein.

2. Dev-Credentials-Datei ist auf Template ohne echte Secrets umgestellt.  
   Datei: `backend-django/DEV_CREDENTIALS.md`  
   Regel: niemals produktive Zugangsdaten im Repository ablegen.

3. Initiale Django-Migrationen sind versioniert (`backend-django/api/migrations/0001_initial.py`).  
   Bei Aenderungen an Models immer neue Migrationen erzeugen und mitdeployen.

4. Passwortwechsel nutzt jetzt den zentralen `apiService` statt hardcodierter URL.  
   Dateien: `src/services/apiService.ts`, `src/services/configService.ts`  
   Dadurch wird der konfigurierte API-Basispfad verwendet.

5. Backend-Doku wurde auf Django/Docker aktualisiert.  
   Datei: `docs/backend/README.md`  
   Fuer Alt-Dokumente regelmaessig Konsistenzcheck durchfuehren.

## 10. Rollback

1. Vor Deployment Backup von Webroot + DB erstellen.
2. Bei Fehlern:
   - altes Frontend wieder hochladen (FTP),
   - Backend-Container auf vorheriges Image/Volume zuruecksetzen,
   - Healthcheck und Login erneut pruefen.

## 11. Aufgabenverteilung

### 11.1 Unser Team (Code/Deployment)

1. `public/config.json` kundenspezifisch vorbereiten (`api_endpoint`, `pdf_api_key`, Firmenwerte).
2. Frontend bauen (`npm run build`) und `dist/` als Release-Artefakt bereitstellen.
3. Backend-Release bereitstellen (`backend-django/` inkl. `docker-compose.prod.yml`).
4. `.env.app` und `.env` auf Basis der Vorlagen vorbereiten.
5. `.\scripts\deploy-prod.ps1` fuer Preflight, Deploy, Migration und Healthcheck ausfuehren.
6. Smoke-Tests aus Abschnitt 8 fachlich durchfuehren (Login, PDF-Versand, 401/429).
7. Code-seitige Restpunkte umsetzen:
   - JWT-Cookie-Flag produktionsfaehig machen (`secure=True` via Config),
   - Django-Migrationen fuer `api` versionieren,
   - veraltete Doku bereinigen.

### 11.2 Server-Admin (Infrastruktur)

1. Docker Engine + Docker Compose auf dem Kundenserver bereitstellen.
2. HTTPS/TLS fuer die Kundendomain einrichten.
3. Reverse Proxy konfigurieren:
   - `/backend/*` -> `127.0.0.1:8000`,
   - SPA-Fallback (`/admin` etc.) -> `index.html`.
4. Firewall/Netzwerk korrekt setzen (extern 443, Backend intern).
5. SSH sowie FTP/SFTP Zugaenge bereitstellen.
6. Backup/Restore fuer Datenbank-Volume und Webroot einrichten.
7. Produktive Secrets final einspielen/rotieren (SMTP, JWT, ENCRYPTION_KEY, PDF_API_SECRET).
