# 🚀 Customer Setup Automation

Automatische Generierung kundenspezifischer Konfigurationsdateien für die **MitarbeiterPro PWA**.

---

## 📋 Übersicht

Dieses Setup-Skript ermöglicht es, in **wenigen Minuten** eine komplett konfigurierte Installation für einen neuen Kunden bereitzustellen. Es nimmt eine JSON-Konfigurationsdatei als Input und generiert automatisch alle benötigten Config-Dateien.

### Was wird generiert?

| Datei                | Zweck                                                         |
| -------------------- | ------------------------------------------------------------- |
| `public/config.json` | Frontend-Konfiguration (Firmendaten, Branding, API-Endpoints) |
| `backend/config.php` | Backend-Konfiguration (SMTP, CORS, Firmendaten)               |
| `.env`               | Umgebungsvariablen (Frontend & Backend Settings)              |

---

## 🎯 Quick Start

### 1. Customer-Config erstellen

Kopiere die Template-Datei und fülle sie aus:

```bash
cp scripts/customer-template.json scripts/customer-examples/mein-kunde.json
```

Öffne `mein-kunde.json` und passe die Werte an:

```json
{
  "customer": {
    "company_name": "Deine Firma GmbH",
    "company_email": "info@deine-firma.de",
    ...
  }
}
```

### 2. Setup-Skript ausführen

```bash
node scripts/setup-customer.js scripts/customer-examples/mein-kunde.json
```

### 3. Fertig! 🎉

Das Skript:

- ✅ Erstellt automatisch Backups (`.backup` Dateien)
- ✅ Generiert alle 3 Config-Dateien
- ✅ Validiert erforderliche Felder
- ✅ Escaped Sonderzeichen (Security-safe!)

---

## 📦 Struktur

```
scripts/
├── setup-customer.js           # Main Script (Node.js ES Module)
├── customer-template.json      # Template mit allen Feldern
├── customer-examples/          # Beispiel-Konfigurationen
│   ├── wpdl.json              # Production Customer (WPDL)
│   ├── test-firma.json        # Test Customer
│   └── test-special-chars.json # Test mit Sonderzeichen
└── README.md                  # Diese Dokumentation
```

---

## 🔧 Customer-Config Format

### Erforderliche Felder (Required)

```json
{
  "customer": {
    "company_name": "Firma GmbH", // ✅ REQUIRED
    "company_email": "info@firma.de" // ✅ REQUIRED
  },
  "contact": {
    "default_email": "info@firma.de" // ✅ REQUIRED
  },
  "email": {
    "smtp_host": "smtp.firma.de" // ✅ REQUIRED
  },
  "technical": {
    "api_endpoint": "https://api.firma.de" // ✅ REQUIRED
  }
}
```

### Vollständiges Template

Siehe [customer-template.json](./customer-template.json) für alle verfügbaren Felder.

**Wichtige Sections:**

| Section     | Beschreibung           | Beispiel-Felder                                            |
| ----------- | ---------------------- | ---------------------------------------------------------- |
| `customer`  | Firmendaten & Branding | `company_name`, `primary_color`, `theme_color`             |
| `contact`   | Kontaktinformationen   | `default_email`, `default_whatsapp`, `allowed_emails`      |
| `email`     | SMTP-Konfiguration     | `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password` |
| `technical` | API & Domains          | `api_endpoint`, `app_domain`, `cors_allowed_origins`       |
| `logo`      | Logo-Pfad              | `path` (z.B. `assets/logo-firma.png`)                      |

---

## 🛡️ Security Features

Das Setup-Skript implementiert mehrere Security-Best-Practices:

### ✅ SEC-001: Shell-Injection Prevention

```javascript
// Apostrophe werden korrekt escaped für .env
"O'Reilly GmbH" → "O'\''Reilly'\''s GmbH"
```

### ✅ SEC-002: PHP-String-Injection Prevention

```javascript
// Apostrophe werden escaped für config.php
"O'Reilly GmbH" → "O\'Reilly\'s GmbH"
```

### ✅ SEC-003: SMTP-Passwort Protection

```php
// SMTP-Passwort wird NICHT in config.php gespeichert!
// Backend liest es direkt aus .env via getenv('SMTP_PASSWORD')
```

**Test mit Sonderzeichen:**

```bash
node scripts/setup-customer.js scripts/customer-examples/test-special-chars.json
```

---

## 🔄 Workflow

### Automatisches Backup

Das Skript erstellt automatisch Backups:

```
public/config.json      → public/config.json.backup
backend/config.php      → backend/config.php.backup
.env                    → .env.backup
```

### Rollback bei Problemen

Falls etwas schief geht, kannst du den vorherigen Zustand wiederherstellen:

```bash
# PowerShell (Windows)
cp public/config.json.backup public/config.json
cp backend/config.php.backup backend/config.php
cp .env.backup .env

# Bash (Linux/Mac)
cp public/config.json.backup public/config.json
cp backend/config.php.backup backend/config.php
cp .env.backup .env
```

---

## 📊 Beispiel-Output

```
╔════════════════════════════════════════════════════╗
║   SETUP-CUSTOMER: Generiere Kundenkonfiguration   ║
╚════════════════════════════════════════════════════╝

1️⃣  Lade Customer-Konfiguration...
✅ Konfiguration geladen

2️⃣  Validiere erforderliche Felder...
✅ Alle erforderlichen Felder vorhanden
   Kunde: Deine Firma GmbH

3️⃣  Erstelle Backups...
  ✅ public/config.json.backup erstellt
  ✅ backend/config.php.backup erstellt
  ✅ .env.backup erstellt

4️⃣  Generiere public/config.json...
✅ public/config.json generiert

5️⃣  Generiere backend/config.php...
✅ backend/config.php generiert

6️⃣  Generiere .env...
✅ .env generiert

╔════════════════════════════════════════════════════╗
║              ✅ SETUP ERFOLGREICH!                 ║
╚════════════════════════════════════════════════════╝

Kunde: Deine Firma GmbH
E-Mail: info@deine-firma.de

📁 Generierte Dateien:
  ✅ public/config.json
  ✅ backend/config.php
  ✅ .env

🚀 Nächste Schritte:
  1. npm run build
  2. Deploy zu Production
```

---

## 🚀 Deployment-Workflow

### Komplett-Workflow für neuen Kunden:

```bash
# 1. Customer-Config erstellen
cp scripts/customer-template.json scripts/customer-examples/neuer-kunde.json
# → Datei bearbeiten und ausfüllen

# 2. Setup ausführen
node scripts/setup-customer.js scripts/customer-examples/neuer-kunde.json

# 3. Build erstellen
npm run build

# 4. Deploy (FTP/SCP/rsync)
# → dist/ Ordner auf Server kopieren
# → .env auf Server kopieren
# → backend/ Ordner auf Server kopieren
```

**Zeitbedarf:** ~5 Minuten pro Kunde 🚀

---

## ❓ FAQ & Troubleshooting

### Script-Fehler: "Konfigurationsdatei erforderlich"

**Problem:** Kein Pfad zur Customer-Config angegeben.

**Lösung:**

```bash
node scripts/setup-customer.js ./scripts/customer-examples/mein-kunde.json
```

### Validierungsfehler: "Fehlendes Feld: customer.company_name"

**Problem:** Erforderliches Feld fehlt in der JSON-Config.

**Lösung:** Füge das fehlende Feld zur Customer-Config hinzu:

```json
{
  "customer": {
    "company_name": "Deine Firma GmbH" // ← Hinzufügen
  }
}
```

### PHP-Syntax-Error nach Setup

**Problem:** Sonderzeichen in Kundendaten nicht escaped.

**Lösung:** Das sollte nicht passieren! Seit Version mit SEC-002 Fix werden alle Strings escaped. Falls doch: [GitHub Issue erstellen](https://github.com/FriggemannMichael/mitarbeiterapppro/issues).

### SMTP-Passwort funktioniert nicht

**Problem:** Backend kann SMTP-Passwort nicht lesen.

**Lösung:** Backend sollte es aus `.env` lesen:

```php
$smtpPassword = getenv('SMTP_PASSWORD');
```

**NICHT** aus `config.php` (aus Security-Gründen)!

---

## 🔧 Entwicklung & Testing

### Neue Customer-Config testen

```bash
# Test mit WPDL-Daten (Production)
node scripts/setup-customer.js scripts/customer-examples/wpdl.json

# Test mit Test-Firma
node scripts/setup-customer.js scripts/customer-examples/test-firma.json

# Test mit Sonderzeichen
node scripts/setup-customer.js scripts/customer-examples/test-special-chars.json
```

### Helper-Funktionen im Skript

| Funktion                 | Zweck                                  |
| ------------------------ | -------------------------------------- |
| `ensureArray(value)`     | Konvertiert Single-Value zu Array      |
| `escapeSingleQuote(str)` | Escaped `'` für Shell-Variablen (.env) |
| `escapePhpString(str)`   | Escaped `'` und `\` für PHP-Strings    |

---

## 📝 Changelog

### Version 2.0.0 (2026-03-03)

- ✅ Security-Fixes: Shell & PHP Injection Prevention
- ✅ SMTP-Passwort aus config.php entfernt
- ✅ DRY-Refactoring: `ensureArray()` Helper-Funktion
- ✅ Escaping für Sonderzeichen (Apostrophe, Quotes)

### Version 1.0.0 (2026-03-02)

- ✅ Initial Release mit Node.js ES Module
- ✅ Automatische Backup-Erstellung
- ✅ Validierung erforderlicher Felder
- ✅ Colored Console-Output

---

## 🤝 Support

Bei Fragen oder Problemen:

1. **Dokumentation prüfen:** [customer-template.json](./customer-template.json)
2. **Beispiele anschauen:** [customer-examples/](./customer-examples/)
3. **GitHub Issues:** [Issue erstellen](https://github.com/FriggemannMichael/mitarbeiterapppro/issues)

---

## 📜 License

MIT License - Siehe [LICENSE](../LICENSE) für Details.

---

**Made with ❤️ for MitarbeiterPro PWA**
