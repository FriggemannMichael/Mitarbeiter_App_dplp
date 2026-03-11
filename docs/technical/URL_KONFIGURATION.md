# URL-Konfiguration für Multi-Domain-Deployment

Dieses Dokument beschreibt, wie Sie die Mitarbeiter-App für verschiedene Domains (z.B. beim Kunden) konfigurieren.

## Übersicht

Die App unterstützt jetzt vollständig konfigurierbare URLs für Multi-Mandanten-Fähigkeit:

- **App-Domain**: Hauptdomain der Anwendung
- **Backend-Domain**: Backend-API-Domain (falls abweichend)
- **CORS-Origins**: Erlaubte Origins für Cross-Origin-Requests
- **WhatsApp Base-URL**: WhatsApp-Integration-URL

## 🎯 Konfigurationsmöglichkeiten

### Option 1: Admin-Dashboard (Empfohlen)

**Schritte:**

1. Melden Sie sich im Admin-Dashboard an: `https://ihre-domain.de/admin`
2. Navigieren Sie zu **Technical Config**
3. Passen Sie folgende Felder an:

   - **App-Domain**: `https://kundendomain.de`
   - **Backend-Domain**: `https://kundendomain.de` (oder abweichend)
   - **API-Endpunkt**: `https://kundendomain.de/backend`
   - **PWA QR-Code URL**: `https://kundendomain.de`
   - **CORS Origins**: `https://kundendomain.de, http://localhost:5173`

4. Klicken Sie auf **"Änderungen speichern"**

### Option 2: .env Datei (Frontend)

Erstellen Sie eine `.env` Datei im Projektstamm:

```env
# API-Konfiguration
VITE_API_URL=https://kundendomain.de/backend

# Optional: Weitere Konfigurationen
VITE_COMPANY_NAME=Kunde GmbH
VITE_COMPANY_EMAIL=info@kunde.de
```

### Option 3: Backend config.php

Bearbeiten Sie `backend/config.php`:

```php
// CORS - Erlaubte Origins
define('ALLOWED_ORIGINS', [
    'https://kundendomain.de',
    'http://localhost:5173',
]);
```

## 📋 Deployment-Checkliste beim Kunden

### Vor dem Deployment:

- [ ] `.env` Datei mit `VITE_API_URL` anpassen
- [ ] `backend/config.php` mit korrekten CORS-Origins anpassen
- [ ] `backend/.env` für SMTP-Konfiguration erstellen

### Nach dem Deployment:

- [ ] Admin-Dashboard öffnen
- [ ] Technical Config → Alle URLs prüfen und anpassen
- [ ] App-Domain auf Kundendomain setzen
- [ ] CORS-Origins auf Kundendomain setzen
- [ ] Speichern und App neu laden

### Test:

- [ ] PDF-Versand per E-Mail testen
- [ ] WhatsApp-Integration testen
- [ ] CORS-Header im Browser-DevTools prüfen
- [ ] Offline-Funktionalität testen

## 🔧 Technische Details

### Frontend (React/TypeScript)

**Dynamische URL-Auflösung:**

```typescript
import { ConfigManager } from './services/config/ConfigManager';

const apiEndpoint = await ConfigManager.getInstance().getApiEndpoint();
const whatsappUrl = await ConfigManager.getInstance().getWhatsAppBaseUrl();
const appDomain = await ConfigManager.getInstance().getAppDomain();
```

**Fallback-Hierarchie:**

1. Datenbank-Konfiguration (via Admin-Dashboard gespeichert)
2. localStorage (Offline-Cache)
3. `public/config.json` (Statische Fallback-Config)
4. `.env` Variablen (`VITE_API_URL`)
5. Hardcoded Defaults

### Backend (PHP)

**CORS-Konfiguration:**

Das Backend lädt CORS-Origins dynamisch aus der Datenbank:

```php
// Lädt aus admin_config.technical.cors_allowed_origins
$allowedOrigins = ['https://kundendomain.de', 'http://localhost:5173'];
```

**Fallback:** `backend/config.php` → `ALLOWED_ORIGINS`

## 📁 Betroffene Dateien

### Konfigurationsdateien:

- `backend/config-example.json` - Backend-Konfiguration (Beispiel)
- `backend/config.php` - CORS-Fallback
- `public/config.json` - Frontend-Fallback-Config
- `.env.example` - Frontend-Umgebungsvariablen (Vorlage)

### Code-Dateien:

- `src/types/config.types.ts` - TypeScript-Interfaces für TechnicalConfig
- `src/services/config/ConfigManager.ts` - Config-Management + URL-Helper
- `src/components/admin/TechnicalConfigForm.tsx` - Admin-UI für URL-Config
- `backend/index.php` - Dynamisches CORS-Loading

## 🚀 Beispiel: Deployment für "kunde-gmbh.de"

### 1. Frontend `.env`:

```env
VITE_API_URL=https://kunde-gmbh.de/backend
VITE_COMPANY_NAME=Kunde GmbH
VITE_COMPANY_EMAIL=info@kunde-gmbh.de
```

### 2. Backend `config.php`:

```php
define('ALLOWED_ORIGINS', [
    'https://kunde-gmbh.de',
    'http://localhost:5173',
]);
```

### 3. Admin-Dashboard (nach Deployment):

- **App-Domain**: `https://kunde-gmbh.de`
- **Backend-Domain**: `https://kunde-gmbh.de`
- **API-Endpunkt**: `https://kunde-gmbh.de/backend`
- **CORS Origins**: `https://kunde-gmbh.de, http://localhost:5173`

### 4. Build & Deploy:

```bash
npm run build
# Upload dist/ → https://kunde-gmbh.de/
# Upload backend/ → https://kunde-gmbh.de/backend/
```

## ❗ Wichtige Hinweise

1. **CORS-Origins müssen identisch sein**: Frontend-Domain und CORS-Origin müssen exakt übereinstimmen (inkl. `https://` und ohne trailing slash)

2. **Nach Domain-Änderung**: App im Browser neu laden (STRG+F5) um Cache zu leeren

3. **localStorage-Cache**: Bei Problemen localStorage leeren:
   ```javascript
   localStorage.removeItem('app_config');
   ```

4. **Backend CORS**: Änderungen in der Datenbank werden sofort aktiv (kein Server-Neustart nötig)

5. **Offline-Funktionalität**: Die App funktioniert offline mit der zuletzt geladenen Konfiguration

## 🐛 Troubleshooting

### Problem: CORS-Fehler im Browser

**Ursache:** CORS-Origin stimmt nicht mit Frontend-Domain überein

**Lösung:**
1. Admin-Dashboard → Technical Config
2. CORS-Origins prüfen und Kundendomain hinzufügen
3. Speichern und Browser-Cache leeren

### Problem: API-Calls gehen an falsche Domain

**Ursache:** Frontend nutzt gecachte alte Konfiguration

**Lösung:**
1. localStorage leeren: `localStorage.removeItem('app_config')`
2. Browser neu laden (STRG+F5)
3. Admin-Dashboard → API-Endpunkt prüfen

### Problem: WhatsApp-Sharing funktioniert nicht

**Ursache:** WhatsApp Base-URL nicht konfiguriert

**Lösung:**
1. Admin-Dashboard → Technical Config
2. WhatsApp Base-URL: `https://wa.me/`
3. Speichern

## 📝 Changelog

### Version 1.1.0 (2026-01-05)

- ✅ Dynamische URL-Konfiguration über Admin-Dashboard
- ✅ Multi-Domain-Support (App-Domain, Backend-Domain)
- ✅ CORS-Origins aus Datenbank ladbar
- ✅ WhatsApp Base-URL konfigurierbar
- ✅ Fallback-Chain für robuste Offline-Funktionalität
- ✅ Hardcoded URLs entfernt/durch Fallbacks ersetzt

---

**Bei Fragen:** Siehe `README.md` oder kontaktieren Sie den Support.
