# Go-Live Checklist (Definition of Done)

Stand: 2026-03-11

## 1. Security

- [ ] Alle produktiven Secrets sind neu gesetzt (SMTP, JWT, ENCRYPTION_KEY, PDF_API_SECRET).
- [ ] `DEBUG=False` in `backend-django/.env.app`.
- [ ] `JWT_COOKIE_SECURE=True` in `backend-django/.env.app`.
- [ ] `ALLOWED_HOSTS` und `ALLOWED_ORIGINS` enthalten nur Ziel-Domain(s).
- [ ] `public/config.json` -> `technical.pdf_api_key` ist identisch zu `PDF_API_SECRET`.

## 2. Deployment

- [ ] Frontend-Build erstellt (`npm run build`).
- [ ] `dist/` vollständig per FTP hochgeladen.
- [ ] Backend-Dateien aktualisiert (`backend-django/`).
- [ ] Deploy-Skript erfolgreich: `.\scripts\deploy-prod.ps1`.
- [ ] Container healthy (`docker compose -f backend-django/docker-compose.prod.yml ps`).

## 3. Infrastruktur

- [ ] HTTPS/TLS aktiv auf Kundendomain.
- [ ] Reverse Proxy aktiv:
  - [ ] `/backend/*` -> `127.0.0.1:8000`
  - [ ] SPA-Fallback -> `index.html`
- [ ] Firewall korrekt (extern 443, Backend intern).

## 4. Datenbank & Recovery

- [ ] Migrationen erfolgreich ausgeführt.
- [ ] DB-Backup vor Go-Live erstellt.
- [ ] Restore-Test dokumentiert (mind. 1 erfolgreicher Testlauf).

## 5. Funktionstests

- [ ] Admin-Login funktioniert.
- [ ] Zeiterfassung speichern/laden funktioniert.
- [ ] PDF-Erstellung und Versand funktioniert.
- [ ] Test-Email im Admin-Panel funktioniert.
- [ ] Sicherheitstests:
  - [ ] Falscher API-Key -> 401.
  - [ ] Rate-Limit überschritten -> 429.

## 6. Multi-Customer Readiness

- [ ] `technical.customer_key` ist gesetzt (z. B. `kunde-a`).
- [ ] `technical.feature_flags` sind dokumentiert und geprüft.
- [ ] Nicht genutzte Features für aktuellen Kunden sind deaktiviert.
- [ ] Erweiterungswünsche für Folgekunden als Flags statt Hardcode geplant.

## 7. Übergabe

- [ ] Aufgabenverteilung (Team vs. Server-Admin) abgestimmt.
- [ ] Ansprechpartner für Betrieb/Incident benannt.
- [ ] Rollback-Weg getestet und dokumentiert.
- [ ] Abnahmeprotokoll mit Datum/Version unterschrieben.
