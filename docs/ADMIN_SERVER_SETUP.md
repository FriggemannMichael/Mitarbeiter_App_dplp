# Einmaliges Server-Setup (Netzwerkadmin)

Danach deployed GitHub Actions alles automatisch.

---

## 1. Verzeichnis anlegen

```bash
mkdir -p /opt/mitarbeiterapp
cd /opt/mitarbeiterapp
```

## 2. Dateien hochladen (per FTP oder SCP)

Folgende Dateien aus `backend-django/` auf den Server kopieren:
- `docker-compose.prod.yml`
- `.env.app.example` → umbenennen zu `.env.app` und befüllen
- `.env.docker.example` → umbenennen zu `.env` und befüllen

## 3. `.env.app` befüllen

Siehe `docs/DEPLOY.md` für alle Werte. Wichtig:
```env
DEBUG=False
ALLOWED_HOSTS=deine-domain.de
ALLOWED_ORIGINS=https://deine-domain.de
JWT_COOKIE_SECURE=True
```

## 4. `.env` befüllen (Docker Compose Variablen)

```env
DB_NAME=mitarbeiterapp
DB_USER=mitarbeiter
DB_PASSWORD=<sicheres-passwort>
DOCKER_IMAGE=ghcr.io/GITHUB_USERNAME/mitarbeiterapp:latest
```

> **DOCKER_IMAGE**: `GITHUB_USERNAME` durch den echten GitHub-Benutzernamen ersetzen.

## 5. Bei GitHub Container Registry einloggen

```bash
echo "<GITHUB_PAT>" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin
```

PAT erstellen unter: GitHub → Settings → Developer Settings → Personal Access Tokens
Benötigte Berechtigung: `read:packages`

Docker merkt sich die Credentials in `~/.docker/config.json` –
Watchtower liest diese Datei automatisch (Volume-Mount in docker-compose.prod.yml).

## 6. Container starten

```bash
docker compose -f docker-compose.prod.yml up -d
```

Migrations laufen automatisch beim ersten Start.

## 7. Webserver konfigurieren (Nginx-Beispiel)

```nginx
server {
    listen 443 ssl;
    server_name deine-domain.de;

    # Frontend (statische Dateien per FTP deployed)
    root /var/www/html;
    index index.html;

    # Backend
    location /backend/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # PWA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

**Ab jetzt:** Jeder Push auf `main` deployed automatisch Frontend + Backend.
Watchtower prüft alle 5 Minuten ob ein neues Docker Image verfügbar ist.
