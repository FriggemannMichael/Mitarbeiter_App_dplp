# Deployment-Checkliste

Stand: 2026-03-11
Stack: React PWA (Vite) + Django 5 + PostgreSQL 16 + Docker

---

## 1. Backend `.env.app` befüllen

Vorlage: `backend-django/.env.example`

```env
# Django
SECRET_KEY=<langer-zufaelliger-string>   # NICHT den Dev-Default lassen!
DEBUG=False                               # WICHTIG: niemals True in Produktion
ALLOWED_HOSTS=meine-domain.de,www.meine-domain.de
ALLOWED_ORIGINS=https://meine-domain.de  # exakt, kein trailing slash, kein Wildcard

# Datenbank
DB_NAME=mitarbeiterapp
DB_USER=mitarbeiter
DB_PASSWORD=<sicheres-passwort>
DB_HOST=db
DB_PORT=5432

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>   # $2y$ aus PHP oder $2b$ aus Python – beide gehen

# SMTP
SMTP_HOST=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_ENCRYPTION=tls
FROM_EMAIL=...
FROM_NAME=...
RECIPIENT_EMAIL=<interne-pdl-adresse>   # CC-Empfänger bei PDF-Versand

# Verschlüsselung – GLEICHER KEY wie im alten PHP-Backend!
ENCRYPTION_KEY=<key-aus-php-env>

# JWT
JWT_SECRET=<langer-zufaelliger-string>
JWT_EXPIRE_HOURS=8
JWT_COOKIE_NAME=jwt

# Spam-Schutz – BEIDE Werte müssen mit public/config.json übereinstimmen
PDF_API_SECRET=<langer-zufaelliger-string>   # z.B. openssl rand -hex 32
PDF_RATE_LIMIT=10                            # max. Requests/Minute pro IP
```

**Docker `.env`** (nur für docker-compose Variable-Substitution, separate Datei):
```env
DB_NAME=mitarbeiterapp
DB_USER=mitarbeiter
DB_PASSWORD=<gleiches-passwort-wie-oben>
```

---

## 2. Frontend `public/config.json` anpassen

```json
{
  "technical": {
    "api_endpoint": "https://meine-domain.de/backend",   // ← NICHT /backend relativ!
    "pdf_api_key": "<GLEICHER-WERT-WIE-PDF_API_SECRET>", // ← muss übereinstimmen!
    ...
  }
}
```

> **Kritisch:** `api_endpoint` muss in Produktion die absolute URL sein.
> In lokaler Entwicklung bleibt es `/backend` (Vite-Proxy).

---

## 3. Frontend bauen

```bash
npm run build
# dist/ auf Server hochladen
```

Wenn die App ohne Proxy direkt auf die API zugreift:
```bash
VITE_FORCE_API=true VITE_API_URL=https://meine-domain.de/backend npm run build
```

---

## 4. Docker starten & Migrationen

```bash
cd backend-django/
docker compose up -d
docker compose exec web python manage.py migrate
```

Logs prüfen:
```bash
docker compose logs -f web
```

---

## 5. JWT-Cookie auf HTTPS umstellen

> In `backend-django/api/services/auth_service.py` ist `secure=False` hardcoded.
> In Produktion mit HTTPS **muss** das auf `True` geändert werden, sonst wird der Cookie nicht über HTTPS gesendet.

```python
# auth_service.py ~Zeile 101
secure=True,        # ← für Produktion ändern (derzeit False)
samesite='Lax',
```

---

## 6. Spam-Schutz: Secret abgleichen

| Was | Wo | Wert |
|---|---|---|
| Backend Secret | `backend-django/.env.app` → `PDF_API_SECRET` | z.B. `abc123xyz` |
| Frontend Key | `public/config.json` → `technical.pdf_api_key` | **exakt gleich**: `abc123xyz` |

Stimmen beide nicht überein → jeder `/send-pdf` Call gibt HTTP 401 zurück.

---

## 7. CORS prüfen

`ALLOWED_ORIGINS` in `.env.app` muss exakt die Frontend-Domain enthalten:
- ✅ `https://meine-domain.de`
- ❌ `https://meine-domain.de/` (trailing slash)
- ❌ `*` (funktioniert nicht mit `credentials: include`)

---

## 8. Nach dem Deployment testen

- [ ] Admin-Login unter `https://meine-domain.de/admin`
- [ ] PDF-Versand aus der PWA (Stundenzettel → Unterschrift → Senden)
- [ ] E-Mail kommt beim Kunden an (To) + intern in CC
- [ ] Bei falschem/fehlendem `pdf_api_key` → 401 (Sicherheitstest)
- [ ] Mehr als 10 Requests/Minute von einer IP → 429 (Sicherheitstest)
- [ ] Audit-Log im Django-Admin prüfen (Versandprotokoll)

---

## 9. Bekannte Fallstricke

| Problem | Ursache | Lösung |
|---|---|---|
| 401 beim PDF-Versand | `pdf_api_key` in config.json ≠ `PDF_API_SECRET` in .env.app | Beide angleichen |
| Login funktioniert nicht | Cookie `secure=True` aber kein HTTPS | HTTPS einrichten oder `secure=False` für Test |
| CORS-Fehler | ALLOWED_ORIGINS nicht gesetzt | Domain in `.env.app` eintragen |
| E-Mail geht nicht raus | SMTP-Daten falsch | `/api/test-email` im Admin testen |
| PDF-Versand geht an falsche Adresse | `api_endpoint` noch relativ (`/backend`) | Absolute URL in `config.json` setzen |
| Passwort-Login schlägt fehl | Hash ist `$2y$` aber falsch kopiert | Hash 1:1 aus altem PHP-`.env` kopieren |

---

## 10. Rollback

```bash
# Docker stoppen
docker compose down

# Altes PHP-Backend reaktivieren (falls noch vorhanden)
# api_endpoint in public/config.json zurück auf PHP-Endpunkt setzen
```
