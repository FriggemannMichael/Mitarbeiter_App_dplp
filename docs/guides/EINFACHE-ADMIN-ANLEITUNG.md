# Einfache Admin-Anleitung - Mitarbeiter Pro App

## Überblick

Die Mitarbeiter Pro App verwendet nun eine **einfache JSON-basierte Konfiguration**, die ohne Datenbank-Server auskommt.

### Vorteile:
- Keine separate Datenbank erforderlich
- Einfache Verwaltung per FTP
- Ein Build für alle Kunden
- Konfiguration pro Kunde individualisierbar

---

## Für Kunden: So funktioniert es

### 1. App zugreifen

Öffnen Sie die App-URL in einem **Desktop-Browser** (mindestens 768px Bildschirmbreite):

```
https://ihre-domain.de/admin
```

### 2. Admin-Login

Geben Sie das Admin-Passwort ein. Das Standard-Passwort finden Sie in der `config.json` Datei:

**Standard-Passwort:** `admin123`

**WICHTIG:** Ändern Sie dieses Passwort beim ersten Setup!

### 3. Konfiguration bearbeiten

Im Admin-Dashboard finden Sie 4 Bereiche:

#### Firmendaten
- Firmenname, Adresse, Telefon, E-Mail
- Logo (URL zu einem online gehosteten Bild)
- Primärfarbe und Theme-Farbe (Hex-Codes wie #2563eb)
- Erlaubte E-Mail-Adressen und WhatsApp-Nummern

#### PDF & Branding
- App-Namen
- PDF-Titel-Präfix, Autor, Footer-Text
- Header-Texte für Stundenzettel, Krankmeldung, Urlaub
- Unterschriften-Label
- Rechtliche Hinweise (optional)

#### Technisch
- API-Endpunkt für PDF-Versand
- Deployment-Pfad
- QR-Code-Typen
- E-Mail/WhatsApp-Integration aktivieren/deaktivieren

#### Arbeitszeit
- Max. Arbeitsstunden pro Tag
- Standard-Pausenzeit
- Dateinamen-Pattern für PDF-Exporte
- Datums- und Zeitformate
- Feature-Toggles (Auto-Save, Offline-Modus, etc.)

### 4. Konfiguration exportieren

**Wichtig:** Nach dem Bearbeiten klicken Sie oben rechts auf:

```
[Konfiguration exportieren]
```

Dies lädt die Datei `config.json` auf Ihren Computer herunter.

### 5. Konfiguration hochladen

Laden Sie die heruntergeladene `config.json` Datei per **FTP** auf Ihren Server hoch:

**Zielordner:** `/public/config.json`

Überschreiben Sie die vorhandene Datei.

### 6. Änderungen prüfen

Laden Sie die App-Seite neu (F5). Die Änderungen werden sofort wirksam.

---

## Für Entwickler: Deployment pro Kunde

### Schritt 1: Build erstellen

```bash
npm run build
```

Dies erstellt den `dist/` Ordner mit allen statischen Dateien.

### Schritt 2: Config pro Kunde erstellen

Kopieren Sie die Datei `public/config.json` und passen Sie sie für jeden Kunden an:

```json
{
  "company": {
    "company_name": "Kunde ABC GmbH",
    "company_address": "Beispielstraße 123, 12345 Stadt",
    "company_email": "info@kunde-abc.de",
    "company_logo": "https://kunde-abc.de/logo.png",
    "primary_color": "#1e40af",
    ...
  },
  "admin": {
    "password": "SicheresPasswort123!"
  }
}
```

**WICHTIG:**
- Ändern Sie das Admin-Passwort für jeden Kunden!
- Logo-URL muss öffentlich erreichbar sein (z.B. auf demselben Server)

### Schritt 3: Deployment

Laden Sie für jeden Kunden hoch:

1. **Alle Dateien aus `dist/`** → Root-Verzeichnis des Kunden
2. **Angepasste `config.json`** → `/public/config.json` (überschreibt die Standard-Config)

**Beispiel-Struktur:**
```
kunde-abc.de/
├── index.html
├── assets/
│   ├── index-abc123.js
│   ├── index-def456.css
│   └── ...
└── public/
    └── config.json    ← Kunden-spezifisch!
```

### Schritt 4: Testen

1. Öffnen Sie `https://kunde-abc.de/admin`
2. Login mit dem gesetzten Passwort
3. Prüfen Sie ob alle Firmendaten korrekt angezeigt werden
4. Erstellen Sie einen Test-Stundenzettel und exportieren Sie ein PDF
5. Prüfen Sie ob Logo und Firmendaten im PDF korrekt sind

---

## Konfigurationsfelder Übersicht

### Company Config

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| company_name | string | Firmenname | "Musterfirma GmbH" |
| company_address | string | Firmenadresse | "Musterstr. 1, 12345 Stadt" |
| company_phone | string | Telefonnummer | "+49123456789" |
| company_email | string | E-Mail-Adresse | "info@musterfirma.de" |
| company_logo | string | Logo-URL | "https://musterfirma.de/logo.png" |
| primary_color | string | Primärfarbe (Hex) | "#2563eb" |
| theme_color | string | Theme-Farbe (Hex) | "#2563eb" |
| allowed_emails | array | Erlaubte E-Mails | ["info@firma.de", "hr@firma.de"] |
| allowed_whatsapp | array | Erlaubte WhatsApp | ["+49123456789"] |
| default_email | string | Standard-E-Mail | "info@firma.de" |
| default_whatsapp | string | Standard-WhatsApp | "+49123456789" |

### PDF Config

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| app_name | string | App-Name | "Stundennachweis Pro" |
| app_short_name | string | App-Kurzname | "Mitarbeiter Pro" |
| pdf_title_prefix | string | PDF-Titel-Präfix | "Stundennachweis" |
| pdf_author | string | PDF-Autor | "Mitarbeiter Pro App" |
| pdf_footer_text | string | PDF-Footer | "Erstellt mit Mitarbeiter Pro - DSGVO-konform" |
| timesheet_header | string | Stundenzettel-Header | "STUNDENNACHWEIS" |
| advance_payment_header | string | Vorschuss-Header | "VORSCHUSSANTRAG" |
| vacation_header | string | Urlaub-Header | "URLAUBSANTRAG" |
| signature_label | string | Unterschriften-Label | "Vorgesetzter" |
| qr_code_app_identifier | string | QR-Code-ID | "Mitarbeiter Pro" |

### Technical Config

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| api_endpoint | string | API-Endpunkt | "https://example.com/api/send-pdf.php" |
| deployment_path | string | Deployment-Pfad | "/pro/" |
| qr_code_type_timesheet | string | QR-Typ Stundenzettel | "TIMESHEET" |
| qr_code_type_advance_payment | string | QR-Typ Vorschuss | "ADVANCE_PAYMENT" |
| qr_code_type_vacation | string | QR-Typ Urlaub | "VACATION_REQUEST" |
| enable_whatsapp | boolean | WhatsApp aktiviert | true |
| enable_email | boolean | E-Mail aktiviert | true |

### Work Settings

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| max_work_hours_per_day | number | Max. Arbeitsstunden/Tag | 12 |
| default_break_minutes | number | Standard-Pause (Min) | 60 |
| filename_pattern | string | Dateinamen-Muster | "Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}" |
| auto_save_enabled | boolean | Auto-Save | true |
| offline_mode_enabled | boolean | Offline-Modus | true |
| auto_logout_minutes | number | Auto-Logout (Min) | 240 |
| backup_reminder_days | number | Backup-Erinnerung (Tage) | 7 |
| enable_signature_requirement | boolean | Unterschrift erforderlich | true |
| enable_photo_upload | boolean | Foto-Upload | true |
| date_format | string | Datumsformat | "DD.MM.YYYY" |
| time_format | string | Zeitformat | "HH:mm" |

### Admin Config

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| password | string | Admin-Passwort | "SicheresPasswort123!" |

---

## Troubleshooting

### Problem: "Konfiguration nicht vollständig. Bitte config.json prüfen."

**Lösung:**
- Prüfen Sie ob die Datei `/public/config.json` existiert
- Prüfen Sie ob die JSON-Syntax korrekt ist (z.B. mit jsonlint.com)
- Prüfen Sie ob alle erforderlichen Felder vorhanden sind

### Problem: Logo wird nicht angezeigt

**Lösung:**
- Prüfen Sie ob die Logo-URL öffentlich erreichbar ist
- Öffnen Sie die URL direkt im Browser
- Prüfen Sie CORS-Einstellungen des Servers
- Verwenden Sie PNG oder JPG Format (max 2MB)

### Problem: Admin-Bereich nicht erreichbar

**Lösung:**
- Verwenden Sie einen Desktop-Browser (min. 768px Breite)
- Prüfen Sie ob die URL korrekt ist: `/admin` (ohne .html)
- Leeren Sie den Browser-Cache (Strg+Shift+Entf)

### Problem: Änderungen werden nicht übernommen

**Lösung:**
- Haben Sie auf "Konfiguration exportieren" geklickt?
- Haben Sie die `config.json` per FTP hochgeladen?
- Haben Sie die App-Seite neu geladen (F5)?
- Prüfen Sie Browser-Cache

---

## Sicherheitshinweise

1. **Admin-Passwort ändern:** Ändern Sie das Standard-Passwort `admin123` sofort!
2. **Starkes Passwort:** Verwenden Sie mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen
3. **HTTPS verwenden:** Deployen Sie die App nur über HTTPS, niemals HTTP
4. **Passwort geheim halten:** Teilen Sie das Admin-Passwort nur mit autorisierten Personen
5. **Regelmäßige Backups:** Sichern Sie die `config.json` regelmäßig

---

## Support

Bei Fragen oder Problemen:

1. Prüfen Sie diese Anleitung
2. Prüfen Sie die Browser-Konsole auf Fehlermeldungen (F12)
3. Kontaktieren Sie Ihren Entwickler

---

**Viel Erfolg! 🎉**
