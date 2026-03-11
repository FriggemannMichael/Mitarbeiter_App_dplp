# Mitarbeiterapp Pro

## Plan zur Veroeffentlichung

### 1. Release-Vorbereitung (T-7 bis T-2)
- [ ] Scope finalisieren (Features, Bugfixes, bekannte Restpunkte)
- [ ] Version setzen und Changelog aktualisieren
- [ ] Produktions-Umgebungswerte in `deployment/.env.production` pruefen
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
- [ ] Letztes Backup von Datenbank und `.env` erstellen
- [ ] Deployment gemaess `docs/deployment/README.md` ausfuehren
- [ ] SSL/Nginx/PHP-FPM Status pruefen

### 5. Post-Release (T+0 bis T+1)
- [ ] Smoke-Tests in Produktion
- [ ] Monitoring aktiv pruefen (Error-Logs, Healthcheck, E-Mail)
- [ ] Stakeholder-Info "Release abgeschlossen" versenden
- [ ] Nacharbeiten in Ticketliste erfassen

### Rollback-Plan
- [ ] Ausloeser definieren (z. B. kritische Fehler in Kernfunktionen)
- [ ] Letzte stabile Build-Artefakte bereithalten
- [ ] Datenbank-Backup rueckspielen (nur bei Bedarf)
- [ ] Kommunikationsvorlage fuer Rollback vorbereiten

## Relevante Doku
- Deployment: `docs/deployment/README.md`
- Backend: `docs/backend/README.md`
- Skripte: `docs/scripts/README.md`
