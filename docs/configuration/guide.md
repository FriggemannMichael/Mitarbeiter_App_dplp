# Konfigurationsanleitung - Stundennachweis PRO

## Übersicht

Die **Stundennachweis PRO** App ist eine generische Version, die für jede Firma individuell konfiguriert werden kann. Alle firmenspezifischen Daten werden über Umgebungsvariablen gesteuert.

## Erste Schritte

1. **`.env` Datei erstellen**
   ```bash
   # Kopieren Sie die Beispieldatei
   cp .env.example .env
   ```

2. **Umgebungsvariablen anpassen**
   Öffnen Sie die `.env` Datei und passen Sie alle Werte an Ihre Firma an.

## Wichtige Konfigurationsparameter

### Sicherheit

- **VITE_COMPANY_CODE**: Eindeutiger Code für Ihre Firmeninstallation
- **VITE_EXPECTED_CODE**: Muss mit VITE_COMPANY_CODE übereinstimmen
- **VITE_ADMIN_PASSWORD**: Passwort für Admin-Funktionen (ÄNDERN SIE DIES!)

### Firmeninformationen

- **VITE_COMPANY_NAME**: Ihr Firmenname (z.B. "Ihre Firma GmbH")
- **VITE_COMPANY_ADDRESS**: Vollständige Adresse
- **VITE_COMPANY_PHONE**: Telefonnummer mit Ländercode
- **VITE_COMPANY_EMAIL**: Haupt-E-Mail-Adresse
- **VITE_COMPANY_LOGO**: Pfad zum Firmenlogo (optional)

### Logo einrichten

1. Platzieren Sie Ihr Logo (PNG-Format) im Ordner `public/assets/`
2. Setzen Sie `VITE_COMPANY_LOGO` auf den Pfad: `/pro/assets/ihr-logo.png`
3. Wenn kein Logo gewünscht ist, lassen Sie den Wert leer

### Erlaubte Kontakte

- **VITE_ALLOWED_EMAILS**: Kommagetrennte Liste erlaubter E-Mail-Adressen
  ```
  VITE_ALLOWED_EMAILS=info@firma.de,personal@firma.de,buchhaltung@firma.de
  ```

- **VITE_ALLOWED_WHATSAPP**: Kommagetrennte Liste erlaubter WhatsApp-Nummern
  ```
  VITE_ALLOWED_WHATSAPP=+49123456789,+49987654321
  ```

### Export-Einstellungen

- **VITE_DEFAULT_EMAIL**: Standard-E-Mail für automatische Weiterleitung
- **VITE_DEFAULT_WHATSAPP**: Standard-WhatsApp für automatische Weiterleitung
- **VITE_FILENAME_PATTERN**: Muster für PDF-Dateinamen
  - Verfügbare Platzhalter:
    - `{employeeName}`: Name des Mitarbeiters
    - `{weekYear}`: Jahr
    - `{weekNumber}`: Kalenderwoche

## Beispiel-Konfiguration

```env
# Sicherheit
VITE_COMPANY_CODE=MEINFIRMA-TIMESHEET-2025
VITE_EXPECTED_CODE=MEINFIRMA-TIMESHEET-2025
VITE_ADMIN_PASSWORD=Sup3rS1ch3r3sP@ssw0rt!

# Firmeninfo
VITE_COMPANY_NAME=Musterfirma GmbH
VITE_COMPANY_ADDRESS=Hauptstraße 123, 12345 Musterstadt
VITE_COMPANY_PHONE=+491234567890
VITE_COMPANY_EMAIL=info@musterfirma.de
VITE_COMPANY_LOGO=/pro/assets/logo-musterfirma.png

# Kontakte
VITE_ALLOWED_EMAILS=info@musterfirma.de,personal@musterfirma.de
VITE_ALLOWED_WHATSAPP=+491234567890
VITE_DEFAULT_EMAIL=info@musterfirma.de
VITE_DEFAULT_WHATSAPP=+491234567890

# Export
VITE_FILENAME_PATTERN=Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}
```

## Wichtige Hinweise

### Sicherheit

- ⚠️ **NIEMALS** die `.env` Datei in Git committen!
- Die `.env` Datei steht bereits in der `.gitignore`
- Ändern Sie unbedingt das Admin-Passwort
- Wählen Sie einen eindeutigen Company Code

### Deployment

Bei jedem Deployment auf einem neuen Server:
1. `.env.example` nach `.env` kopieren
2. Alle Werte anpassen
3. Server neu starten

### Entwicklung

Nach Änderungen an der `.env` Datei:
```bash
# Server stoppen und neu starten
npm run dev
```

## Checkliste für neue Installation

- [ ] `.env` Datei erstellt
- [ ] Company Code geändert
- [ ] Admin-Passwort geändert
- [ ] Firmeninformationen eingetragen
- [ ] Logo hochgeladen (falls gewünscht)
- [ ] Erlaubte E-Mail-Adressen eingetragen
- [ ] Erlaubte WhatsApp-Nummern eingetragen
- [ ] Standard-Kontakte festgelegt
- [ ] Dateiname-Muster angepasst (falls gewünscht)
- [ ] Server neu gestartet
- [ ] App im Browser getestet

## Support

Bei Fragen zur Konfiguration wenden Sie sich an den technischen Support.
