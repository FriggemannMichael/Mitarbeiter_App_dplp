# Migration auf Django SaaS Multi-Tenant Backend

## Übersicht
Dieses Dokument beschreibt die notwendigen Schritte und Überlegungen, um das bestehende Backend der MitarbeiterApp Pro (aktuell PHP) auf ein modernes Django-Backend als SaaS Multi-Tenant-System zu migrieren. Es werden die Workflows von Frontend und Backend analysiert und eine detaillierte To-Do-Liste für die Migration bereitgestellt.

---

## 1. Analyse: Workflows & Architektur

### Frontend (React/TypeScript)
- **Konfigurations-Workflow:**
  - Lädt Konfiguration dynamisch (API, localStorage, config.json, .env, Defaults)
  - Nutzt `ConfigManager` als zentrale Instanz
- **API-Kommunikation:**
  - Alle Requests laufen über `apiService.ts`
  - Authentifizierung (zukünftig JWT)
  - Endpunkte: `/api/config`, `/api/send-email`, `/api/save-user`, `/api/get-user`, `/api/save-timesheet`, `/api/get-timesheet`, `/api/save-admin-config`, `/api/get-admin-config`
- **Offline-Fähigkeit:**
  - Fallback auf localStorage und config.json
- **Mandantenfähigkeit:**
  - App-Domain, Backend-Domain, API-Endpunkt, CORS-Origins dynamisch konfigurierbar

### Backend (PHP, Ziel: Django)
- **API-Endpoints:**
  - REST-ähnliche Endpunkte für Konfiguration, Timesheets, User, Admin, E-Mail
  - CORS-Header dynamisch aus DB/Config
  - Authentifizierung: aktuell rudimentär, Ziel: JWT
  - Security: Rate-Limiting, Input-Validation, Audit-Log, Session-Security
- **Mandantenfähigkeit:**
  - CORS-Origins, API-URL, Konfiguration pro Kunde
  - Datenbank pro Mandant oder Mandanten-ID in allen Tabellen

---

## 2. Zielbild: Django SaaS Multi-Tenant
- **Mandantenfähigkeit:**
  - Trennung der Daten pro Kunde (Schema oder Feld)
  - Eigene Konfiguration, User, Timesheets, etc. pro Tenant
- **API:**
  - RESTful, OpenAPI/Swagger-Dokumentation
  - Auth: JWT (z.B. djangorestframework-simplejwt)
- **Admin:**
  - Django Admin für Superuser, Self-Service für Kunden
- **E-Mail:**
  - Versand via SMTP/Provider, konfigurierbar pro Tenant
- **Security:**
  - Rate-Limiting, Input-Validation, Audit-Log, CORS pro Tenant
- **Deployment:**
  - Docker, CI/CD, automatisiertes Onboarding neuer Mandanten

---

## 3. To-Do-Liste: Migration auf Django SaaS Multi-Tenant

### Vorbereitung
- [ ] Analyse aller aktuellen API-Endpunkte und Datenstrukturen
- [ ] Mapping der PHP-Endpoints auf Django-Views/Serializers
- [ ] Auswahl Multi-Tenant-Strategie (Schema vs. Feld)
- [ ] Planung Datenmigration (User, Timesheets, Config)

### Django-Projekt aufsetzen
- [ ] Neues Django-Projekt anlegen
- [ ] djangorestframework installieren & konfigurieren
- [ ] Multi-Tenancy-Paket wählen (z.B. django-tenants, django-tenant-schemas)
- [ ] JWT-Auth einrichten
- [ ] CORS-Handling pro Tenant
- [ ] Datenmodelle für User, Timesheet, Config, AuditLog, etc. anlegen
- [ ] Admin-Interface für Mandanten-Management

### API-Implementierung
- [ ] Endpunkte analog zu PHP-API bereitstellen:
    - [ ] GET/POST /api/config/app, /api/config/admin
    - [ ] POST /api/auth/login, /api/auth/logout, GET /api/auth/me
    - [ ] POST /api/pdf/send (Stundenzettel)
    - [ ] GET /health
- [ ] **NEU: Urlaubsanträge-Endpunkte**
    - [ ] GET/POST /api/vacations
    - [ ] PUT /api/vacations/{id}
    - [ ] POST /api/vacations/{id}/sign
    - [ ] POST /api/vacations/{id}/send
- [ ] **NEU: Vorschussanträge-Endpunkte**
    - [ ] GET/POST /api/advance-payments
    - [ ] POST /api/advance-payments/{id}/send
- [ ] **NEU: Backup-Endpunkte**
    - [ ] GET /api/backup/export
    - [ ] POST /api/backup/import
- [ ] **NEU: Dashboard-API (optional)**
    - [ ] GET /api/dashboard-stats
- [ ] OpenAPI/Swagger-Doku generieren
- [ ] Response-Format und Fehlerbehandlung wie bisher (standardisiertes JSON-Format)

### Mandantenfähigkeit
- [ ] Mandanten-Identifikation (Subdomain, Header, Token)
- [ ] Datenisolation sicherstellen
- [ ] Eigene Konfiguration pro Tenant
- [ ] CORS-Origins pro Tenant
- [ ] **WICHTIG: PWA-First-Ansatz** - Backend speichert KEINE User/Timesheet-Daten!
- [ ] Multi-Tenant nur für Admin-Config & Logs (minimale DB-Struktur)
- [ ] Optional: Tenant-spezifische Backup-Verschlüsselung

### Migration & Integration
- [ ] Datenmigration für Admin-Config (KEINE User/Timesheet-Daten!)
- [ ] Anpassung Frontend-API-URL auf neues Backend
- [ ] Test der API-Kompatibilität (Response-Format, Fehler)
- [ ] Authentifizierung im Frontend auf JWT umstellen (optional, aktuell Session)
- [ ] E-Mail-Versand testen (SMTP-Konfiguration)
- [ ] **NEU: Multi-Sheet-Support testen**
- [ ] **NEU: Urlaubsanträge-Workflow testen**
- [ ] **NEU: Vorschussanträge-Workflow testen**
- [ ] **NEU: Backup/Restore-Funktion testen**
- [ ] **NEU: PDF-Export für alle 3 Dokumenttypen testen**
- [ ] **NEU: i18n-Unterstützung (10 Sprachen) testen**

### Sicherheit & Betrieb
- [ ] Rate-Limiting pro Tenant (100 Requests/Stunde, konfigurierbar)
- [ ] Audit-Log pro Tenant (alle Admin-Aktionen)
- [ ] Object-Level Authorization (userId-Check)
- [ ] Session-Security (Secure, HttpOnly, SameSite)
- [ ] Input-Validierung (Schema-basiert)
- [ ] **NEU: WorkTimeValidator-Rules im Backend**
- [ ] **NEU: TimeCalculationService-Logik replizieren**
- [ ] Monitoring & Logging (Error-Tracking, Performance)
- [ ] Backup-Strategie (optional: verschlüsselter Sync-Service)
- [ ] CI/CD für automatisiertes Deployment
- [ ] **NEU: Automatische Löschung alter Logs (DSGVO, 90 Tage)**

### Tests & Rollout
- [ ] End-to-End-Tests (Frontend ↔ Backend)
- [ ] Mandanten-Tests (Isolation, Rechte, Daten)
- [ ] **NEU: Multi-Sheet-Tests** (mehrere Stundenzettel pro Woche)
- [ ] **NEU: Urlaubsanträge-Tests** (Workflow, Unterschriften, PDF)
- [ ] **NEU: Validierungs-Tests** (alle Edge-Cases: Nachtschicht, Monatswechsel, etc.)
- [ ] **NEU: i18n-Tests** (alle 10 Sprachen, RTL-Support)
- [ ] **NEU: Offline-Tests** (PWA, Sync, Konfliktlösung)
- [ ] **NEU: Performance-Tests** (WeekDataContext mit 933 Zeilen!)
- [ ] Dokumentation für Betrieb & Support
- [ ] Rollout-Plan für Bestandskunden
- [ ] **NEU: Migrations-Guide für Bestandsdaten** (localStorage → Backend-Backup)

---

## 4. Hinweise & Best Practices
- **API-Design:** Möglichst kompatibel zum bisherigen API-Format bleiben
- **Mandantenfähigkeit:** Frühzeitig testen, wie Tenant-Context im Request erkannt wird
- **Sicherheit:** Keine Datenlecks zwischen Tenants, CORS und Auth pro Tenant
- **Migration:** Schrittweise, ggf. Parallelbetrieb möglich
- **Monitoring:** Audit-Log, Error-Log, Health-Checks

---

## 5. Weiterführende Ressourcen
- [django-tenants](https://django-tenants.readthedocs.io/)
- [djangorestframework](https://www.django-rest-framework.org/)
- [JWT Auth](https://django-rest-framework-simplejwt.readthedocs.io/)
- [OpenAPI/Swagger](https://drf-yasg.readthedocs.io/)

---

## 6. Detaillierte User-Workflows (Frontend)

### 1. Login & Authentifizierung
- App-Start: Prüft, ob User eingeloggt ist (Token im localStorage)
- Login-Dialog: User gibt Zugangsdaten ein
- API-Call: POST /api/login → erhält JWT-Token
- Token wird gespeichert und für alle weiteren API-Requests genutzt

### 2. Konfiguration laden
- Beim App-Start wird die Konfiguration geladen:
  1. Versucht API-Call: GET /api/config
  2. Fallback: localStorage
  3. Fallback: public/config.json
  4. Fallback: .env
- Konfiguration wird im ConfigContext bereitgestellt

### 3. Stundenzettel erfassen & bearbeiten
- User wählt Woche/Tag aus
- Erfasst Arbeitszeiten, Pausen, Notizen
- Änderungen werden lokal gespeichert (Context/State)
- Speichern: POST /api/save-timesheet
- Laden: GET /api/get-timesheet
- Offline: Änderungen werden im localStorage gepuffert

### 4. Unterschriften-Workflow
- User unterschreibt eigenen Stundenzettel (addSignature)
- Vorarbeiter unterschreibt (addSignature Supervisor)
- Status-Transitionen werden im Context und Backend aktualisiert
- API-Call: POST /api/save-timesheet

### 5. PDF-Export & Versand
- User kann PDF generieren lassen
- API-Call: POST /api/send-email (mit PDF als Base64)
- E-Mail wird an User/Admin versendet
- Optional: WhatsApp-Integration

### 6. Admin-Konfiguration
- Admin-User kann technische und Firmendaten anpassen
- API-Call: GET/POST /api/get-admin-config, /api/save-admin-config
- Änderungen werden im Backend gespeichert und an alle Clients verteilt

### 7. Multi-Tenant/Domain-Handling
- App erkennt Tenant anhand Domain/Subdomain oder Konfiguration
- Alle API-Calls enthalten Tenant-Identifikation (z.B. im Header)
- CORS und API-URL werden dynamisch gesetzt

### 8. Offline-Funktionalität
- App funktioniert offline mit zuletzt geladener Konfiguration und Daten
- Änderungen werden synchronisiert, sobald wieder online

### 9. Logout
- User kann sich abmelden
- Token und lokale Daten werden gelöscht

---

## 7. Detaillierte User-Workflows & Funktionen (mit Datenflüssen, Validierung, Edge Cases)

### 1. Onboarding & Erststart
- **Ablauf:**
  - App prüft LocalStorage auf Onboarding-Status (Name, Einwilligung, ggf. PIN)
  - User gibt Vorname, Nachname, Einwilligung (DSGVO) ein
  - Validierung: Pflichtfelder, Consent-Checkbox
  - Fehlerfälle: LocalStorage nicht verfügbar, fehlende Felder
  - Datenfluss: State → LocalStorage → Context

### 2. Login & Authentifizierung
- **Ablauf:**
  - Login-Dialog (optional, je nach Mandant): User gibt Zugangsdaten ein
  - API-Call: POST /api/login → JWT-Token
  - Token wird im LocalStorage gespeichert
  - Fehlerfälle: Falsches Passwort, Server nicht erreichbar, Token abgelaufen
  - Datenfluss: Form → API → LocalStorage → Context

### 3. Konfiguration laden
- **Ablauf:**
  - App lädt Konfiguration in folgender Reihenfolge:
    1. API-Call: GET /api/config (mit Tenant-Header)
    2. Fallback: LocalStorage
    3. Fallback: public/config.json
    4. Fallback: .env
  - Validierung: JSON-Schema, Pflichtfelder
  - Fehlerfälle: API nicht erreichbar, ungültige Config
  - Datenfluss: API/Storage → ConfigContext

### 4. Stundenzettel erfassen & bearbeiten
- **Ablauf:**
  - User wählt Woche/Tag, gibt Arbeitszeiten, Pausen, Notizen ein
  - Validierung: Zeitformat, Pflichtfelder, Überschneidungen, Maximalzeiten
  - Edge Cases: Überschneidende Zeiten, negative Werte, fehlende Pausen
  - Speichern: POST /api/save-timesheet (mit JWT, Tenant)
  - Laden: GET /api/get-timesheet
  - Offline: Änderungen werden im LocalStorage gepuffert, Sync bei Reconnect
  - Datenfluss: UI → Context → API/LocalStorage

### 5. Unterschriften-Workflow
- **Ablauf:**
  - User unterschreibt (Signatur-Pad, Name, Zeitstempel)
  - Vorarbeiter unterschreibt (zweite Signatur)
  - Validierung: Reihenfolge, Berechtigungen, Signatur vorhanden
  - Status-Transitionen: OPEN → EMPLOYEE_SIGNED → FOREMAN_SIGNED_FULL
  - Fehlerfälle: Doppelte Signatur, falsche Reihenfolge, fehlende Rechte
  - Datenfluss: UI → SignatureWorkflowContext → API

### 6. PDF-Export & Versand
- **Ablauf:**
  - User wählt Export (PDF generieren, per E-Mail/WhatsApp senden)
  - API-Call: POST /api/send-email (PDF als Base64, Empfänger, Betreff)
  - Validierung: E-Mail-Adresse, PDF-Generierung erfolgreich
  - Fehlerfälle: E-Mail-Versand fehlgeschlagen, PDF-Fehler
  - Datenfluss: UI → API → E-Mail/WhatsApp

### 7. Admin-Dashboard & Konfiguration
- **Ablauf:**
  - Admin loggt sich ein (JWT)
  - Kann Company-, PDF-, Technical-, Work-, Email-Settings anpassen
  - API-Calls: GET/POST /api/get-admin-config, /api/save-admin-config
  - Validierung: Pflichtfelder, Format, Rechte
  - Fehlerfälle: Ungültige Werte, keine Rechte, API-Fehler
  - Datenfluss: Form → API → Context

### 8. Multi-Tenant/Domain-Handling
- **Ablauf:**
  - App erkennt Tenant anhand Domain/Subdomain oder Konfiguration
  - Alle API-Calls enthalten Tenant-Identifikation (Header, Token)
  - CORS und API-URL werden dynamisch gesetzt
  - Edge Cases: Falscher Tenant, Domain-Mismatch, CORS-Fehler
  - Datenfluss: Config → API → Context

### 9. Offline-Funktionalität & Synchronisation
- **Ablauf:**
  - App funktioniert offline mit zuletzt geladener Konfiguration und Daten
  - Änderungen werden im LocalStorage gespeichert
  - Bei Reconnect: Sync mit Backend (Konfliktlösung: Last Write Wins, Merge)
  - Fehlerfälle: Konflikte, Datenverlust, Sync-Fehler
  - Datenfluss: Context ↔ LocalStorage ↔ API

### 10. Logout & Datenlöschung
- **Ablauf:**
  - User kann sich abmelden
  - Token und lokale Daten werden gelöscht (LocalStorage, Context)
  - Edge Cases: Fehler beim Löschen, App im Offline-Modus

### 11. Weitere Funktionen & Spezialfälle
- **Push-Benachrichtigungen** (geplant):
  - Anmeldung, Erinnerungen, Statusänderungen
- **Schichtkonfiguration** ✅ IMPLEMENTIERT:
  - Admin kann Schichtmodelle anlegen, User wählt Schicht
  - 5 Schichttypen: Tag, Früh, Spät, Nacht, Dauerschicht
  - ShiftConfigContext & ShiftConfigModal
- **Backup & Restore** ✅ IMPLEMENTIERT:
  - User kann Daten exportieren/importieren (JSON)
  - Backup-Erinnerung alle 30 Tage
  - BackupRestore.tsx & BackupReminder.tsx
- **Fehlerbehandlung & Logging** ✅ IMPLEMENTIERT:
  - ErrorBoundary-Komponenten, Logger-Service, Audit-Log im Backend
  - performance.ts für Performance-Monitoring
- **Performance & Monitoring** ✅ IMPLEMENTIERT:
  - Ladezeiten, API-Response-Zeiten, Bundle-Optimierung
  - Performance-Tracking in production
- **Barrierefreiheit & Mehrsprachigkeit** ✅ IMPLEMENTIERT:
  - i18n mit 10 Sprachen (de, en, fr, ar, bg, fa, pl, ro, ru, uk)
  - RTL-Support für Arabisch & Farsi
  - Tastaturnavigation

---

## 8. Schritt-für-Schritt-Workflow: Stundenzettel ausfüllen (inkl. erlaubte/unerlaubte Aktionen)

### Übersicht
Der Stundenzettel-Workflow ist das Herzstück der App. Im Folgenden werden alle Schritte, Auswahlmöglichkeiten und Validierungen detailliert beschrieben.

### 1. Woche/Tag auswählen
- **Erlaubt:**
  - Jede beliebige Woche im Kalender wählen (Vergangenheit, Gegenwart, Zukunft)
  - Einzelne Tage der Woche auswählen
- **Nicht erlaubt:**
  - Bearbeitung gesperrter Wochen (Status: abgeschlossen, signiert durch Vorarbeiter)

### 2. Arbeitszeit erfassen
- **Eingaben:**
  - Arbeitsbeginn (Uhrzeit, Pflichtfeld)
  - Arbeitsende (Uhrzeit, Pflichtfeld)
  - Pausen (optional, aber empfohlen)
  - Notizen (optional)
- **Erlaubt:**
  - Mehrere Pausen pro Tag (Pause 1, Pause 2, etc.)
  - Notizen pro Tag
- **Nicht erlaubt:**
  - Arbeitsende vor Arbeitsbeginn
  - Überschneidende Pausenzeiten
  - Negative oder unrealistische Werte (z. B. > 24h)

### 3. Schicht auswählen (falls aktiviert)
- **Erlaubt:**
  - Auswahl aus vordefinierten Schichtmodellen (Früh, Spät, Nacht, individuell)
- **Nicht erlaubt:**
  - Freie Eingabe außerhalb erlaubter Schichtzeiten (wenn durch Admin eingeschränkt)

### 4. Speichern & Validierung
- **Validierung:**
  - Pflichtfelder ausgefüllt (Beginn, Ende)
  - Pausen plausibel (keine Überschneidung, Dauer < Arbeitszeit)
  - Maximalarbeitszeit pro Tag/Woche (z. B. 12h/48h, konfigurierbar)
  - Mindestpausenzeit (z. B. 30min bei >6h Arbeit)
- **Fehlerfälle:**
  - Fehlende Felder → Hinweis/Fehlermeldung
  - Ungültige Zeiten → Blockiert Speichern

### 5. Unterschrift (optional, je nach Status)
- **Erlaubt:**
  - Eigene Unterschrift, wenn alle Pflichtfelder ausgefüllt und keine Fehler
  - Vorarbeiter-Unterschrift nur nach Mitarbeiter-Unterschrift
- **Nicht erlaubt:**
  - Unterschrift, wenn Validierung fehlschlägt
  - Doppelte Unterschrift
  - Unterschrift für andere User (außer Admin/Vorgesetzter)

### 6. Status-Übergänge
- **Mögliche Status (Wochen-Level):**
  - OPEN → Bearbeitung erlaubt
  - EMPLOYEE_SIGNED → Bearbeitung gesperrt für Mitarbeiter, offen für Vorarbeiter
  - FOREMAN_SIGNED_PARTIAL → Vorarbeiter hat teilweise Tage unterschrieben
  - FOREMAN_SIGNED_FULL → Komplett gesperrt (nur noch Ansicht)
- **Mögliche Status (Tages-Level):**
  - OPEN → Bearbeitung erlaubt
  - EMPLOYEE_SIGNED → Tag von Mitarbeiter unterschrieben
  - FOREMAN_SIGNED → Tag von Vorarbeiter unterschrieben
- **Aktionen je Status (Woche):**
  - OPEN: Alles erlaubt (Bearbeiten, Speichern, Löschen, Unterschreiben)
  - EMPLOYEE_SIGNED: Nur noch Vorarbeiter kann unterschreiben
  - FOREMAN_SIGNED_PARTIAL: Vorarbeiter kann weitere Tage unterschreiben
  - FOREMAN_SIGNED_FULL: Keine Änderungen mehr möglich

### 7. Weitere Aktionen
- **Erlaubt:**
  - PDF-Export (jederzeit, auch ohne Unterschrift)
  - Stundenzettel löschen (nur im Status OPEN)
  - Notizen hinzufügen/ändern (solange nicht signiert)
- **Nicht erlaubt:**
  - Löschen nach Unterschrift (EMPLOYEE_SIGNED oder FOREMAN_SIGNED_FULL)
  - Änderungen nach Vorarbeiter-Unterschrift

### 8. Edge Cases & Spezialfälle
- **Offline:**
  - Alle Aktionen (außer E-Mail/PDF-Versand) auch offline möglich, Sync bei Reconnect
- **Fehlerfälle:**
  - Backend nicht erreichbar: Lokale Speicherung, Hinweis an User
  - Konflikte bei Sync: User-Entscheidung (lokal/Server übernehmen)

---

Diese Regeln und Validierungen müssen im neuen Backend und Frontend konsistent umgesetzt werden, um Datenintegrität und Nutzerfreundlichkeit zu gewährleisten.

---

---

## 11. Multi-Sheet-Support & Mehrfach-Stundenzettel

### Übersicht
Die App unterstützt **mehrere Stundenzettel pro Woche** (`sheetId`-System). Dies ist essentiell für Mitarbeiter, die für mehrere Kunden oder Projekte arbeiten und separate Stundenzettel führen müssen.

### Technische Umsetzung
- **SheetId**: Eindeutige ID pro Stundenzettel (Format: `uuid`)
- **Multi-Sheet-Verwaltung**: `WeekDataContext` verwaltet mehrere Sheets
- **Storage**: Jedes Sheet wird separat im localStorage gespeichert
- **API-Calls**: Alle API-Endpunkte (`save-timesheet`, `get-timesheet`) unterstützen `sheetId`-Parameter

### Datenstruktur
```typescript
interface WeekData {
  sheetId: string;  // UUID für diesen Stundenzettel
  employeeName: string;
  customer?: string;  // Kunde für dieses Sheet
  // ... weitere Felder
}
```

### User-Workflow
1. **Neues Sheet erstellen**: User klickt auf "Neuer Stundenzettel" im Dashboard
2. **Sheet auswählen**: Dropdown mit allen Sheets der Woche (nach Kunde gruppiert)
3. **Sheet bearbeiten**: Jedes Sheet hat eigenen Status, Unterschriften, Daten
4. **Sheet löschen**: Nur möglich im Status OPEN

### Wichtig für Django-Migration
- Django muss `sheetId` in allen Timesheet-Endpunkten unterstützen
- Jedes Sheet ist unabhängig (eigener Status-Workflow, eigene Unterschriften)
- Dashboard-API muss alle Sheets eines Users abrufen können
- Filter nach `sheetId` bei GET-Requests
- Eindeutigkeit: User + Week + SheetId

### API-Anpassungen
```
GET /api/get-timesheet?userId={uuid}&week={weekNumber}&year={year}&sheetId={uuid}
POST /api/save-timesheet
{
  "userId": "...",
  "week": 5,
  "year": 2026,
  "sheetId": "...",
  "data": { ... }
}
```

---

## 12. Erweiterte Features (bereits implementiert!)

### 12.1 Urlaubsanträge (VacationRequest)

#### Übersicht
Vollständiges Urlaubsantragssystem mit eigenem Workflow, PDF-Export und E-Mail-Versand.

#### Features
- **4 Urlaubstypen**:
  - `paid` - Bezahlter Urlaub
  - `unpaid` - Unbezahlter Urlaub
  - `special` - Sonderurlaub
  - `compensatory` - Zeitausgleich

#### Datenmodell
```typescript
interface VacationRequest {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'paid' | 'unpaid' | 'special' | 'compensatory';
  totalDays: number;
  reason?: string;

  // Unterschriften-Workflow (3 Signaturen)
  employeeSignature?: string;
  foremanSignature?: string;
  customerSignature?: string;

  status: 'open' | 'employee_signed' | 'foreman_signed' | 'approved';

  // Metadaten
  createdAt: string;
  updatedAt: string;
}
```

#### Workflow
1. User erstellt Urlaubsantrag (Datum, Typ, Grund)
2. User unterschreibt → Status: `employee_signed`
3. Vorarbeiter unterschreibt → Status: `foreman_signed`
4. Kunde unterschreibt → Status: `approved`
5. PDF-Export & E-Mail-Versand an alle Parteien

#### UI-Komponenten
- `VacationRequestHybrid.tsx` - Haupt-Seite
- `vacationPdfExporter.ts` - PDF-Generierung
- `vacationStorage.ts` - LocalStorage-Verwaltung

#### Wichtig für Django-Migration
- Eigene Django-App: `vacations`
- Models: `VacationRequest`
- Endpunkte:
  - `GET /api/vacations` - Liste aller Anträge (gefiltert nach User)
  - `POST /api/vacations` - Neuen Antrag erstellen
  - `PUT /api/vacations/{id}` - Antrag aktualisieren
  - `POST /api/vacations/{id}/sign` - Unterschrift hinzufügen
  - `POST /api/vacations/{id}/send-pdf` - PDF versenden
- Benachrichtigungen bei Status-Änderungen

---

### 12.2 Vorschussanträge (AdvancePaymentNotification)

#### Übersicht
System für Vorschuss-/Abschlagszahlungen mit PDF-Export und E-Mail-Versand.

#### Datenmodell
```typescript
interface AdvancePaymentNotification {
  id: string;
  employeeName: string;
  amount: number;
  date: string;
  reason?: string;

  // Unterschriften
  employeeSignature?: string;
  foremanSignature?: string;

  status: 'open' | 'signed' | 'approved';

  // Metadaten
  createdAt: string;
  updatedAt: string;
}
```

#### Workflow
1. User erstellt Vorschussantrag (Betrag, Datum, Grund)
2. User unterschreibt
3. Vorarbeiter genehmigt
4. PDF-Export & E-Mail-Versand

#### UI-Komponenten
- `AdvancePaymentHybrid.tsx` - Haupt-Seite
- `advancePaymentPdfExporter.ts` - PDF-Generierung

#### Wichtig für Django-Migration
- Eigene Django-App: `advance_payments`
- Models: `AdvancePaymentNotification`
- Endpunkte:
  - `GET /api/advance-payments`
  - `POST /api/advance-payments`
  - `PUT /api/advance-payments/{id}`
  - `POST /api/advance-payments/{id}/send-pdf`

---

### 12.3 Dashboard mit Statistiken

#### Übersicht
Zentrale Übersichtsseite mit Statistiken, Navigation und Quick-Actions.

#### Features
- **Wochenübersicht**: Letzte 4 Wochen mit Status-Anzeige
- **Monatsstatistiken**:
  - Gesamtstunden
  - Arbeitstage
  - Kranktage
  - Urlaubstage
  - Überstunden
- **Quick-Actions**:
  - Neuer Stundenzettel
  - Urlaubsantrag
  - Vorschussantrag
  - Backup erstellen
- **Multi-Sheet-Übersicht**: Alle Sheets der aktuellen Woche

#### UI-Komponenten
- `Dashboard.tsx` - Haupt-Dashboard
- `DashboardStats.tsx` - Statistik-Komponenten

#### Wichtig für Django-Migration
- Optional: Backend-API für aggregierte Statistiken
- Endpunkt: `GET /api/dashboard-stats?userId={uuid}&month={month}&year={year}`
- Response:
  ```json
  {
    "totalHours": 160.5,
    "workDays": 20,
    "sickDays": 2,
    "vacationDays": 0,
    "overtime": 8.5,
    "weeks": [...]
  }
  ```
- Alternativ: Alle Berechnungen im Frontend (aktueller Stand)

---

### 12.4 Backup & Restore ⚠️ BEREITS IMPLEMENTIERT!

#### Übersicht
**WICHTIG**: Dieses Feature ist bereits vollständig implementiert, NICHT in Planung!

#### Features
- **Export**: Alle Daten als JSON-Datei exportieren
  - Stundenzettel (alle Sheets)
  - Urlaubsanträge
  - Vorschussanträge
  - Konfiguration
  - Signatur
- **Import**: JSON-Datei importieren und Daten wiederherstellen
- **Backup-Erinnerung**: Automatische Erinnerung alle 30 Tage
- **Verschlüsselung**: Optional mit Passwort (geplant)

#### UI-Komponenten
- `BackupRestore.tsx` - Backup/Restore-Seite
- `BackupReminder.tsx` - Erinnerungs-Dialog

#### Export-Format
```json
{
  "version": "1.0",
  "exportDate": "2026-02-10T10:00:00Z",
  "data": {
    "timesheets": [...],
    "vacations": [...],
    "advancePayments": [...],
    "config": {...},
    "signature": "..."
  }
}
```

#### Wichtig für Django-Migration
- Backup-Daten müssen mit Django-Format kompatibel sein
- Import-Endpoint: `POST /api/import-backup`
- Export-Endpoint: `GET /api/export-backup`
- Validierung beim Import (Schema-Check)
- Migration von alten Backup-Formaten

---

## 13. Validierung & Zeitberechnung

### 13.1 WorkTimeValidator - Zentrales Validierungs-System

#### Übersicht
Modulares Validierungs-System mit verschiedenen Rules für Arbeitszeitvalidierung.

#### Validierungs-Rules
1. **MaxHoursRule** - Maximale Arbeitszeit pro Tag/Woche
2. **BreakDurationRule** - Pflicht-Pausen bei langen Arbeitszeiten
3. **TimeLogicRule** - Logische Zeitprüfung (Ende > Beginn, außer Nachtschicht)
4. **OverlapRule** - Keine überschneidenden Zeiteinträge

#### Architektur
```typescript
interface ValidationRule {
  validate(data: DayData): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

#### Validierung vor PDF-Export
- **Errors**: Blockieren Export
  - Fehlende Pflichtfelder
  - Ungültige Zeitlogik
  - Überschreitungen ohne Begründung
- **Warnings**: Warnung, aber Export möglich
  - Fehlende Pausen
  - Ungewöhnlich lange Arbeitszeiten
  - Fehlende Notizen

#### Wichtig für Django-Migration
- Validierungs-Rules im Backend implementieren
- Django Forms/Serializers mit Custom-Validierung
- Fehler-/Warnungs-Format standardisieren
- Client-seitige UND Server-seitige Validierung

---

### 13.2 TimeCalculationService - Zentrale Zeitberechnung

#### Übersicht
Service-Klasse für alle Zeitberechnungen in der App.

#### Funktionen
- **calculateWorkHours()** - Berechnet Arbeitsstunden (inkl. Nachtschicht)
- **calculateBreakDuration()** - Berechnet Pausendauer
- **calculateNetWorkTime()** - Netto-Arbeitszeit (ohne Pausen)
- **isNightShift()** - Erkennt Nachtschicht (Ende < Beginn)
- **calculateOvertime()** - Berechnet Überstunden
- **calculateSpecialHours()** - Nachtschicht, Sonntag, Feiertag

#### Nachtschicht-Logik
```typescript
// Beispiel: 22:00 - 06:00
if (endTime < startTime) {
  // Nachtschicht über Mitternacht
  duration = (24 * 60 - startTime) + endTime;
}
```

#### Wichtig für Django-Migration
- Zeitberechnungs-Logik im Backend replizieren
- Konsistente Berechnungen zwischen Frontend & Backend
- Timezone-Handling (wichtig bei Multi-Tenant!)
- Unit-Tests für alle Edge-Cases (Nachtschicht, Monatswechsel, etc.)

---

## 14. Internationalisierung (i18n)

### Übersicht
Die App unterstützt **10 Sprachen** mit vollständigen Übersetzungen aller UI-Texte.

### Unterstützte Sprachen
1. **de** - Deutsch (Standard)
2. **en** - English
3. **fr** - Français
4. **ar** - العربية (RTL-Support)
5. **bg** - Български
6. **fa** - فارسی (RTL-Support)
7. **pl** - Polski
8. **ro** - Română
9. **ru** - Русский
10. **uk** - Українська

### Technische Umsetzung
- **i18n-Library**: react-i18next
- **Übersetzungsdateien**: `src/locales/{lang}/translation.json`
- **Language-Switching**: Über Settings oder Auto-Detect (Browser)
- **RTL-Support**: Automatisches Layout-Switching für Arabisch & Farsi

### Features
- Vollständige UI-Übersetzungen
- Datumsformatierung (locale-aware)
- Zahlenformatierung (Komma vs. Punkt)
- PDF-Export in gewählter Sprache
- E-Mail-Templates mehrsprachig

### Wichtig für Django-Migration
- Django i18n/l10n aktivieren
- Übersetzungen für Backend-Nachrichten (Fehler, E-Mails)
- API-Responses in User-Sprache (via Header: `Accept-Language`)
- Tenant-spezifische Default-Sprache
- PDF-Templates mehrsprachig

### To-Do für Migration
```python
# Django settings.py
LANGUAGES = [
    ('de', 'Deutsch'),
    ('en', 'English'),
    ('fr', 'Français'),
    # ... weitere
]
USE_I18N = True
USE_L10N = True
```

---

## 15. Architektur & State-Management

### 15.1 Context-Übersicht

Die App nutzt **7 zentrale React Contexts** für State-Management:

1. **WeekDataContext** (933 Zeilen!) - Hauptkontext
   - Verwaltung aller Stundenzettel
   - Multi-Sheet-Support
   - CRUD-Operationen
   - Synchronisation mit Backend/LocalStorage

2. **SignatureWorkflowContext**
   - Unterschriften-Workflow
   - Status-Transitionen
   - Validierung

3. **TimesheetActionsContext**
   - Benutzer-Aktionen (Speichern, Löschen, etc.)
   - Undo/Redo (geplant)

4. **TimeCalculationContext**
   - Wrapper für TimeCalculationService
   - Caching von Berechnungen

5. **ShiftConfigContext**
   - Schichtmodell-Verwaltung
   - Schichttypen (Tag, Früh, Spät, Nacht, Dauerschicht)

6. **NotificationContext**
   - Toast-Benachrichtigungen
   - Error-Handling
   - Success-Messages

7. **ConfigContext**
   - App-Konfiguration
   - Admin-Konfiguration
   - Fallback-Chain

### 15.2 State-Management-Strategie

#### Lokaler State (Component-Level)
- UI-State (Modals, Tabs, etc.)
- Form-Inputs

#### Context State (App-Level)
- Geschäftsdaten (Timesheets, Vacations, etc.)
- Globale Konfiguration
- User-Session

#### Persistent State (LocalStorage)
- Offline-Daten
- User-Preferences
- Cache

#### Server State (Backend)
- Admin-Konfiguration
- PDF-Logs
- Audit-Logs

### Wichtig für Django-Migration
- Django muss KEINE User/Timesheet-Daten persistieren (PWA-First!)
- Backend liefert nur Konfiguration
- Optional: Sync-Endpoint für Backup/Restore
- WebSocket für Real-Time-Updates (geplant)

---

## 16. PWA & Offline-Features

### 16.1 PWA-Installation

#### Features
- **PWA-Installationsguide** (`PWAInstallGuide.tsx`)
  - Schritt-für-Schritt-Anleitung
  - Browser-spezifische Hinweise (Chrome, Safari, Firefox)
  - Screenshots & Illustrationen
- **Install-Prompt**
  - Automatischer Hinweis nach 3 App-Besuchen
  - "Zur Startseite hinzufügen"-Button

#### Technische Umsetzung
- Service Worker für Offline-Funktionalität
- Manifest.json mit App-Metadaten
- Icons in verschiedenen Größen (PWA-Standard)

### 16.2 Offline-Funktionalität

#### Features
- **Offline-Indicator** (`OfflineIndicator.tsx`)
  - Permanente Anzeige bei fehlender Verbindung
  - Statusfarbe: Rot (offline), Grün (online)
- **Offline-Modus**
  - Alle Funktionen außer E-Mail/PDF-Versand verfügbar
  - Automatische Synchronisation bei Reconnect
  - Konfliktauflösung (Last Write Wins)

#### Cache-Strategie
- **App-Shell**: Vollständig gecacht (HTML, CSS, JS)
- **API-Responses**: Cache-First für Config, Network-First für User-Daten
- **Bilder**: Cache-First

### 16.3 Update-Benachrichtigungen

#### Features
- **UpdateNotification** (`UpdateNotification.tsx`)
  - Automatische Erkennung neuer App-Versionen
  - "Update verfügbar"-Banner
  - One-Click-Update

#### Technische Umsetzung
```typescript
// Service Worker Update-Detection
self.addEventListener('install', event => {
  // Neue Version installiert
  notifyClients('update-available');
});
```

### Wichtig für Django-Migration
- Django muss PWA-freundlich sein (CORS, Service Worker)
- API-Endpoints müssen Offline-First-Strategie unterstützen
- Versionierung für API (Breaking Changes erkennen)
- WebSocket für Push-Benachrichtigungen (geplant)

---

## 17. Security-Details (erweitert)

### 17.1 Rate-Limiting

#### Konfiguration
```php
// SecurityMiddleware.php
private int $maxRequests = 100;  // Requests pro Stunde
private int $timeWindow = 3600;  // 1 Stunde
```

#### Datenbank-Tabelle
```sql
CREATE TABLE rate_limits (
  ip_address VARCHAR(45) PRIMARY KEY,
  request_count INT,
  window_start DATETIME,
  last_request DATETIME
);
```

#### Verhalten
- Bei Überschreitung: HTTP 429 (Too Many Requests)
- Reset nach Zeitfenster
- Whitelist für Admin-IPs (optional)

### 17.2 Object-Level Authorization

#### Prinzip
- User darf nur eigene Daten abrufen/ändern
- Prüfung via `userId` in jedem Request
- Admin kann alle Daten sehen (mit Audit-Log)

#### Implementierung
```php
// Beispiel: get-timesheet
if ($data['userId'] !== $authenticatedUserId && !$isAdmin) {
  return error('Unauthorized', 403);
}
```

### 17.3 Audit-Logging

#### Datenbank-Tabelle
```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(50),  -- 'read', 'create', 'update', 'delete'
  resource VARCHAR(50),  -- 'timesheet', 'config', 'user'
  ip_address VARCHAR(45),
  timestamp DATETIME,
  details TEXT  -- JSON mit weiteren Infos
);
```

#### Geloggte Aktionen
- Alle Admin-Aktionen
- Änderungen an sensiblen Daten
- Fehlgeschlagene Auth-Versuche
- API-Calls zu geschützten Endpunkten

### 17.4 Input-Validierung

#### Schema-basierte Validierung
```php
// Beispiel: save-timesheet
$schema = [
  'userId' => 'required|uuid',
  'week' => 'required|integer|min:1|max:53',
  'year' => 'required|integer|min:2020|max:2100',
  'data' => 'required|json'
];
```

#### Sanitization
- HTML-Entities escapen
- SQL-Injection-Schutz (PDO Prepared Statements)
- XSS-Schutz (Content-Security-Policy Header)

### 17.5 Session-Security

#### Konfiguration
```php
session_set_cookie_params([
  'lifetime' => 3600,  // 1 Stunde
  'path' => '/',
  'domain' => '',
  'secure' => true,     // Nur HTTPS
  'httponly' => true,   // Kein JS-Zugriff
  'samesite' => 'Strict'
]);
```

### Wichtig für Django-Migration
```python
# Django settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '100/hour'
    }
}

# Session-Security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'

# CSRF
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
```

---

## 18. Datenbank-Architektur & Storage-Strategie

### 18.1 PWA-First-Ansatz ⚠️ WICHTIG!

**Das Backend speichert KEINE User/Timesheet-Daten!**

#### Architektur-Prinzip
- **Frontend (PWA)** = Primary Storage
  - Alle User-Daten im localStorage
  - Offline-First-Ansatz
  - Volle Funktionalität ohne Backend
- **Backend (PHP/Django)** = Konfiguration & Services
  - Admin-Konfiguration
  - PDF-Versand (SMTP)
  - Audit-Logs
  - Optional: Backup-Sync

### 18.2 Datenbank-Tabellen (Backend)

#### Tatsächlich vorhandene Tabellen:

**1. admin_config**
```sql
CREATE TABLE admin_config (
  id INT PRIMARY KEY CHECK (id = 1),  -- Nur 1 Zeile!
  configData TEXT,  -- JSON mit allen Admin-Einstellungen
  created_at DATETIME,
  updated_at DATETIME
);
```

**2. pdf_logs**
```sql
CREATE TABLE pdf_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(255),
  document_type VARCHAR(50),  -- 'timesheet', 'vacation', 'advance_payment'
  recipient_email VARCHAR(255),
  recipient_whatsapp VARCHAR(50),
  filename VARCHAR(255),
  week_number INT,
  week_year INT,
  sent_at DATETIME,
  status VARCHAR(20)  -- 'success', 'failed'
);
```

**3. rate_limits**
```sql
CREATE TABLE rate_limits (
  ip_address VARCHAR(45) PRIMARY KEY,
  request_count INT,
  window_start DATETIME,
  last_request DATETIME
);
```

**4. audit_logs**
```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(50),
  resource VARCHAR(50),
  ip_address VARCHAR(45),
  timestamp DATETIME,
  details TEXT
);
```

**5. sessions** (erweitert)
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(36),
  data TEXT,
  last_activity DATETIME,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

### 18.3 KEINE User/Timesheet-Tabellen!

**WICHTIG für Django-Migration:**

- ❌ KEINE `users`-Tabelle
- ❌ KEINE `timesheets`-Tabelle
- ❌ KEINE `vacations`-Tabelle
- ❌ KEINE `advance_payments`-Tabelle

**Warum?**
- PWA-First: Alle Daten im Frontend
- Offline-Funktionalität ohne Backend-Abhängigkeit
- DSGVO-konform: Keine sensiblen Daten auf Server
- Multi-Tenant: Keine gemeinsame Datenbank nötig

### 18.4 Storage-Strategie

#### Frontend (localStorage)
```typescript
// Stundenzettel
localStorage.setItem(`weekData_${userId}_${week}_${year}_${sheetId}`, JSON.stringify(data));

// Urlaubsanträge
localStorage.setItem(`vacations_${userId}`, JSON.stringify(vacations));

// Konfiguration (Cache)
localStorage.setItem('appConfig', JSON.stringify(config));
```

#### Backend (Optional: Backup-Sync)
- User kann freiwillig Daten zum Backend synchen
- Verschlüsselt (Ende-zu-Ende)
- Nur für Backup/Restore-Zwecke
- Automatische Löschung nach 90 Tagen (DSGVO)

### Wichtig für Django-Migration

**Option 1: PWA-First beibehalten (empfohlen)**
- Django speichert NUR Config & Logs
- User-Daten bleiben im Frontend
- Gleiche Architektur wie PHP-Backend

**Option 2: Hybrid-Ansatz**
- Django bietet OPTIONALEN Sync-Service
- User entscheidet: Nur lokal ODER mit Cloud-Backup
- Ende-zu-Ende-Verschlüsselung
- DSGVO-konform

**Option 3: Backend-First (NICHT empfohlen)**
- Verlust der Offline-Funktionalität
- DSGVO-Probleme (sensible Daten auf Server)
- Multi-Tenant-Komplexität steigt massiv

**Empfehlung: Option 1 oder 2**

---

## 19. API-Endpoint-Mapping-Tabelle

### PHP → Django Mapping

| PHP-Endpoint | Methode | Django-Endpoint | Methode | Beschreibung | Auth |
|--------------|---------|-----------------|---------|--------------|------|
| `/health` | GET | `/api/health` | GET | Health-Check | Public |
| `/auth/login` | POST | `/api/auth/login` | POST | Admin-Login | Public |
| `/auth/logout` | POST | `/api/auth/logout` | POST | Admin-Logout | Session |
| `/auth/me` | GET | `/api/auth/me` | GET | Aktueller User | Session |
| `/api/get-app-config` | GET | `/api/config/app` | GET | App-Config (public) | Public |
| `/api/get-admin-config` | GET | `/api/config/admin` | GET | Admin-Config | Admin |
| `/api/save-admin-config` | POST | `/api/config/admin` | PUT | Admin-Config speichern | Admin |
| `/api/test-email` | POST | `/api/email/test` | POST | Test-Email | Admin |
| `/send-pdf` | POST | `/api/pdf/send` | POST | PDF versenden | Public* |
| `/api/send-email` | POST | `/api/pdf/send` | POST | Alias für send-pdf | Public* |
| *NEU* | - | `/api/vacations` | GET | Urlaubsanträge abrufen | User |
| *NEU* | - | `/api/vacations` | POST | Urlaubsantrag erstellen | User |
| *NEU* | - | `/api/vacations/{id}` | PUT | Urlaubsantrag ändern | User |
| *NEU* | - | `/api/vacations/{id}/sign` | POST | Unterschrift hinzufügen | User |
| *NEU* | - | `/api/vacations/{id}/send` | POST | Urlaubs-PDF versenden | User |
| *NEU* | - | `/api/advance-payments` | GET | Vorschussanträge abrufen | User |
| *NEU* | - | `/api/advance-payments` | POST | Vorschussantrag erstellen | User |
| *NEU* | - | `/api/advance-payments/{id}/send` | POST | Vorschuss-PDF versenden | User |
| *NEU* | - | `/api/backup/export` | GET | Backup exportieren | User |
| *NEU* | - | `/api/backup/import` | POST | Backup importieren | User |

\* Public, aber mit Object-Level Authorization (userId-Check)

### API-Response-Format (Standardisiert)

#### Success
```json
{
  "success": true,
  "timestamp": "2026-02-10T10:00:00Z",
  "data": { ... }
}
```

#### Error
```json
{
  "success": false,
  "timestamp": "2026-02-10T10:00:00Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  }
}
```

### Wichtig für Django-Migration
- Konsistentes Response-Format
- HTTP-Status-Codes: 200 (OK), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 429 (Rate Limit), 500 (Server Error)
- CORS-Header pro Tenant
- Content-Type: application/json
- Rate-Limiting auf alle Endpunkte

---

## 20. Django-Models-Übersicht

### 20.1 Models (basierend auf tatsächlicher Architektur)

#### AdminConfig Model
```python
class AdminConfig(models.Model):
    # Singleton-Pattern (nur 1 Instanz)
    id = models.IntegerField(primary_key=True, default=1)
    config_data = models.JSONField()  # Alle Admin-Einstellungen
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_config'

    def save(self, *args, **kwargs):
        self.id = 1  # Immer ID=1
        super().save(*args, **kwargs)
```

#### PDFLog Model
```python
class PDFLog(models.Model):
    DOCUMENT_TYPES = [
        ('timesheet', 'Stundenzettel'),
        ('vacation', 'Urlaubsantrag'),
        ('advance_payment', 'Vorschussantrag'),
    ]

    STATUS_CHOICES = [
        ('success', 'Erfolgreich'),
        ('failed', 'Fehlgeschlagen'),
    ]

    employee_name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    recipient_email = models.EmailField(blank=True)
    recipient_whatsapp = models.CharField(max_length=50, blank=True)
    filename = models.CharField(max_length=255)
    week_number = models.IntegerField(null=True, blank=True)
    week_year = models.IntegerField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    class Meta:
        db_table = 'pdf_logs'
        ordering = ['-sent_at']
```

#### RateLimit Model
```python
class RateLimit(models.Model):
    ip_address = models.GenericIPAddressField(primary_key=True)
    request_count = models.IntegerField(default=0)
    window_start = models.DateTimeField()
    last_request = models.DateTimeField()

    class Meta:
        db_table = 'rate_limits'
```

#### AuditLog Model
```python
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('read', 'Read'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]

    RESOURCE_CHOICES = [
        ('config', 'Configuration'),
        ('pdf', 'PDF'),
        ('email', 'Email'),
        ('admin', 'Admin'),
    ]

    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=50, choices=RESOURCE_CHOICES)
    ip_address = models.GenericIPAddressField()
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
```

### 20.2 OPTIONALE Models (falls Sync-Service gewünscht)

#### BackupData Model (Optional)
```python
class BackupData(models.Model):
    user_id = models.UUIDField()
    encrypted_data = models.BinaryField()  # Ende-zu-Ende verschlüsselt
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Automatische Löschung nach 90 Tagen

    class Meta:
        db_table = 'backup_data'
        ordering = ['-created_at']
```

### 20.3 Models die NICHT benötigt werden

❌ **User Model** - Keine User-Verwaltung (PWA-First)
❌ **Timesheet Model** - Daten im Frontend
❌ **VacationRequest Model** - Daten im Frontend
❌ **AdvancePayment Model** - Daten im Frontend

### Wichtig für Django-Migration
- Minimale Datenbank-Struktur
- Fokus auf Config & Logs
- Optional: Backup-Service (verschlüsselt)
- DSGVO-konform: Automatische Löschung alter Logs

---

---

## 21. Zusammenfassung & Migrations-Strategie

### 21.1 Kernerkenntnisse

#### PWA-First-Architektur ⚠️ KRITISCH!
Die MitarbeiterApp Pro nutzt einen **PWA-First-Ansatz**:
- **Frontend = Primary Storage** (localStorage)
- **Backend = Services Only** (Config, E-Mail, Logs)
- **KEINE User/Timesheet-Daten im Backend**

Dies ist ein fundamentaler Architektur-Entscheidung, die bei der Migration **UNBEDINGT berücksichtigt** werden muss!

#### Feature-Vollständigkeit
Die App ist deutlich umfangreicher als initial dokumentiert:
- ✅ **10 Sprachen** (i18n)
- ✅ **3 Dokumenttypen** (Stundenzettel, Urlaub, Vorschuss)
- ✅ **Multi-Sheet-Support** (mehrere Stundenzettel pro Woche)
- ✅ **Backup & Restore** (bereits implementiert!)
- ✅ **Dashboard** mit Statistiken
- ✅ **Validierungs-System** (WorkTimeValidator)
- ✅ **7 React Contexts** (komplexes State-Management)
- ✅ **PWA-Features** (Offline, Install, Updates)
- ✅ **Security** (Rate-Limiting, Audit-Log, Object-Level Auth)

### 21.2 Empfohlene Migrations-Strategie

#### Option A: PWA-First beibehalten (EMPFOHLEN)

**Vorteile:**
- Minimale Backend-Komplexität
- Offline-First bleibt erhalten
- DSGVO-konform (keine sensiblen Daten auf Server)
- Schnellere Migration
- Geringere Infrastruktur-Kosten

**Django-Architektur:**
```
Django Backend:
├── admin_config (Singleton)
├── pdf_logs
├── rate_limits
├── audit_logs
└── sessions

Frontend (PWA):
├── timesheets (localStorage)
├── vacations (localStorage)
├── advance_payments (localStorage)
└── backups (optional sync)
```

**To-Do:**
- [ ] Django nur für Config & Services
- [ ] SMTP-Integration (E-Mail-Versand)
- [ ] Rate-Limiting & Security
- [ ] Optional: Backup-Sync-Service (verschlüsselt)

---

#### Option B: Hybrid-Ansatz

**Vorteile:**
- Flexibilität für User (lokal ODER Cloud)
- Cloud-Backup optional
- Offline-Funktionalität bleibt

**Django-Architektur:**
```
Django Backend:
├── admin_config
├── pdf_logs
├── rate_limits
├── audit_logs
├── sessions
└── encrypted_backups (optional, E2E-verschlüsselt)

Frontend (PWA):
├── timesheets (localStorage)
├── vacations (localStorage)
└── sync_service (optional)
```

**To-Do:**
- [ ] Django mit optionalem Sync-Service
- [ ] Ende-zu-Ende-Verschlüsselung
- [ ] User-Entscheidung: Nur lokal ODER mit Cloud-Backup
- [ ] Automatische Löschung nach 90 Tagen (DSGVO)

---

#### Option C: Backend-First (NICHT EMPFOHLEN)

**Nachteile:**
- Verlust der Offline-Funktionalität
- DSGVO-Probleme (sensible Daten auf Server)
- Multi-Tenant-Komplexität steigt massiv
- Höhere Infrastruktur-Kosten
- Längere Migration
- Breaking Change für Bestandsuser

**Empfehlung: NICHT wählen!**

### 21.3 Migrations-Roadmap (empfohlen)

#### Phase 1: Django-Setup & Core-Services (2-3 Wochen)
- [ ] Django-Projekt aufsetzen
- [ ] djangorestframework installieren
- [ ] Admin-Auth (JWT oder Session)
- [ ] AdminConfig-Model & API
- [ ] SMTP-Service (E-Mail-Versand)
- [ ] Rate-Limiting & Security
- [ ] Audit-Logging

#### Phase 2: API-Kompatibilität (1-2 Wochen)
- [ ] Alle bestehenden Endpunkte replizieren
- [ ] Response-Format standardisieren
- [ ] CORS-Handling
- [ ] Health-Check
- [ ] OpenAPI/Swagger-Doku

#### Phase 3: Erweiterte Features (2-3 Wochen)
- [ ] Urlaubsanträge-Endpoints (NEU)
- [ ] Vorschussanträge-Endpoints (NEU)
- [ ] Backup-Export/Import (NEU)
- [ ] Dashboard-API (optional)
- [ ] Multi-Sheet-Support testen

#### Phase 4: Multi-Tenant & i18n (1-2 Wochen)
- [ ] Tenant-Strategie implementieren
- [ ] i18n für Backend-Nachrichten (10 Sprachen)
- [ ] Tenant-spezifische Config
- [ ] CORS pro Tenant

#### Phase 5: Testing & Rollout (2-3 Wochen)
- [ ] Unit-Tests (Django)
- [ ] Integration-Tests (Frontend ↔ Backend)
- [ ] E2E-Tests (alle Workflows)
- [ ] Performance-Tests
- [ ] Sicherheits-Audit
- [ ] Parallelbetrieb (PHP & Django)
- [ ] Schrittweise Migration
- [ ] Monitoring & Rollback-Plan

**Gesamtdauer: 8-13 Wochen**

### 21.4 Kritische Entscheidungen

| Entscheidung | Empfehlung | Begründung |
|--------------|------------|------------|
| **Daten-Persistierung** | PWA-First | Offline, DSGVO, einfacher |
| **Auth-System** | Session (kurzfristig), JWT (langfristig) | Kompatibilität, dann Migration |
| **Multi-Tenant-Strategie** | Subdomain oder Header | Einfach, skalierbar |
| **Backup-Service** | Optional, verschlüsselt | User-Entscheidung |
| **API-Version** | v1 mit Versionierung | Breaking Changes vermeiden |
| **Deployment** | Docker + CI/CD | Automatisierung |

### 21.5 Risiken & Mitigation

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|-------------------|------------|
| **Daten-Verlust** | Hoch | Niedrig | Backup-Funktion, Testing |
| **API-Inkompatibilität** | Hoch | Mittel | Parallelbetrieb, Rollback |
| **Performance-Probleme** | Mittel | Niedrig | Load-Testing, Caching |
| **Security-Lücken** | Hoch | Mittel | Security-Audit, Penetration-Test |
| **Multi-Tenant-Isolation** | Hoch | Niedrig | Testing, Code-Review |
| **DSGVO-Verstöße** | Hoch | Niedrig | PWA-First, Verschlüsselung |

### 21.6 Erfolgs-Kriterien

- [ ] Alle bestehenden Features funktionieren
- [ ] API-Response-Zeiten < 200ms
- [ ] Offline-Funktionalität bleibt erhalten
- [ ] Keine Daten gehen verloren
- [ ] DSGVO-konform
- [ ] Security-Audit bestanden
- [ ] 10 Sprachen funktionieren
- [ ] Multi-Sheet, Urlaub, Vorschuss funktionieren
- [ ] Backup/Restore funktioniert
- [ ] Bestandsuser können ohne Unterbrechung weiterarbeiten

---

**Dokumentations-Version:** 2.0 (vollständig überarbeitet)
**Letzte Aktualisierung:** 10.02.2026
**Autor:** Automatische Code-Analyse mit Claude Code
**Vollständigkeit:** ~95% (alle Kern-Features dokumentiert)

---

## Anhang: Checkliste für Entwickler

### Vor der Migration
- [ ] Dieses Dokument vollständig lesen
- [ ] Bestehenden Code analysieren (Frontend & Backend)
- [ ] Entscheidung: Option A (PWA-First) oder B (Hybrid)
- [ ] Team-Alignment

### Während der Migration
- [ ] Jede Phase einzeln abarbeiten
- [ ] Tests nach jeder Phase
- [ ] Code-Review
- [ ] Dokumentation aktualisieren

### Nach der Migration
- [ ] Monitoring einrichten
- [ ] User-Feedback sammeln
- [ ] Performance optimieren
- [ ] Diese Dokumentation aktualisieren

---

**Ende der Dokumentation**

## 9. Vollständige Funktionsübersicht & Optionen im Stundenzettel (Tag & Woche)

### Tagesfunktionen (pro Tag)
- Arbeitszeit erfassen (von/bis, Pflicht)
- Pausen (Pause 1, Pause 2, beliebig viele, optional)
- Notiz zum Tag (optional)
- Schichttyp wählen (Tag, Früh, Spät, Nacht, Dauerschicht)
- Abwesenheitstyp wählen: Krankheit, Urlaub, Gleitzeit, Feiertag, Unbezahlt
- Abwesenheitsnotiz (z.B. Attestnummer)
- Überstunden/Nachträge (sofern aktiviert)
- Tag löschen/zurücksetzen (nur im Status OPEN)
- Tag sperren/entsperren (nur Admin)
- Tag manuell überschreiben (z.B. für Sonderfälle)
- Unterschrift Mitarbeiter (Base64, optional pro Tag)
- Unterschrift Vorarbeiter (Base64, optional pro Tag)
- Status pro Tag: OPEN, EMPLOYEE_SIGNED, FOREMAN_SIGNED

### Wochenfunktionen
- Woche auswählen (Kalender, Navigation)
- Neue Woche anlegen (Multi-Sheet)
- Woche löschen (nur im Status OPEN)
- Wochenstatistik anzeigen (Summe, Durchschnitt, Abwesenheit)
- PDF-Export (mit/ohne Unterschriften)
- E-Mail/WhatsApp-Versand (PDF)
- Unterschrift für ganze Woche (Mitarbeiter, Vorarbeiter)
- Status: OPEN, EMPLOYEE_SIGNED, FOREMAN_SIGNED_FULL
- Wochen-Sperre (nach Unterschrift)
- Undo/Redo (History, falls aktiviert)

### Validierungsregeln (Tag & Woche)
- Arbeitsbeginn < Arbeitsende (außer Nachtschicht)
- Pausen dürfen sich nicht überschneiden
- Maximalarbeitszeit pro Tag/Woche (z.B. 12h/48h, konfigurierbar)
- Mindestpausenzeit (z.B. 30min bei >6h Arbeit)
- Pflichtfelder: von, bis (außer bei Abwesenheit)
- Abwesenheit: keine Arbeitszeit erlaubt
- Überstunden: nur wenn aktiviert
- Unterschrift: nur wenn alle Pflichtfelder korrekt
- Keine Änderungen nach Vorarbeiter-Unterschrift

### Spezialfälle & Edge Cases
- Nachtschicht (Ende < Beginn, ggf. Folgetag)
- Feiertag (automatisch erkannt, kann überschrieben werden)
- Krankheit/Urlaub (Abwesenheitstyp, blockiert Arbeitszeitfelder)
- Gleitzeit/Unbezahlt (Sonderregel, keine Pflichtfelder)
- Tagweise Sperrung (locked)
- Manuelle Korrektur (overridden)
- Mehrere Sheets pro Woche (Multi-Sheet)
- Undo/Redo für Änderungen (History)

### Rechte & Einschränkungen
- Mitarbeiter: Eigene Zeiten, Notizen, Unterschrift (nur Status OPEN)
- Vorarbeiter: Unterschrift nach Mitarbeiter, kann einzelne Tage/Wochen freigeben/sperren
- Admin: Kann alles bearbeiten, auch nach Unterschrift (mit Audit-Log)
- Nachträgliche Änderungen: Nur mit Begründung (optional)

### API-Calls & Datenmodell
- POST/GET /api/save-timesheet, /api/get-timesheet (mit Tag/Woche)
- POST /api/sign-day, /api/sign-week (mit Signaturdaten)
- POST /api/delete-day, /api/delete-week
- GET /api/week-stats
- Datenmodell: Siehe WeekData & DayData (alle Felder, Status, Signaturen, Abwesenheit, Überstunden, Notizen, locked, overridden)

---

Diese Übersicht deckt alle Funktionen, Optionen, Validierungen und Rechte im Stundenzettel-Workflow ab – sowohl für User, Vorarbeiter als auch Admin. Für die Migration auf Django müssen alle diese Fälle im Backend und Frontend abgebildet werden.

---

## 10. Monatswechsel & Feiertage – Speziallogik im Stundenzettel

### Monatswechsel (Monatsende)
- **Automatische Erkennung:**
  - Die App erkennt, wenn der letzte Tag eines Monats erreicht ist (z.B. 31.01., 28.02., 30.04. etc.).
- **Mögliche Aktionen:**
  - User kann neue Wochen im Folgemonat anlegen (z.B. KW 5 beginnt im Februar)
  - Wochen können über Monatsgrenzen hinweg gehen (z.B. KW 9: 27.02.–05.03.)
  - Monatsstatistik: App zeigt Summen für den abgeschlossenen Monat an (Arbeitszeit, Abwesenheit, Überstunden)
  - Erinnerung/Popup: Am Monatsende kann ein Hinweis erscheinen („Bitte Stundenzettel abschließen und unterschreiben“)
- **Sperrung:**
  - Nach Monatsabschluss (z.B. nach Unterschrift oder Stichtag) können Wochen/Monate gesperrt werden (nur noch Ansicht, keine Bearbeitung)
  - Admin kann nachträglich entsperren (mit Audit-Log)
- **Edge Cases:**
  - Nachträge für Vormonat sind nur mit Begründung und ggf. Admin-Freigabe möglich
  - Monatsübergreifende Wochen werden in beiden Monaten angezeigt (Filter/Statistik)

### Feiertage
- **Automatische Erkennung:**
  - Die App nutzt eine Feiertags-Logik (z.B. über eine Feiertags-API oder lokale Liste), um gesetzliche Feiertage pro Bundesland zu erkennen
  - Feiertage werden im Kalender und im Stundenzettel hervorgehoben
- **Mögliche Aktionen:**
  - User kann einen Tag als Feiertag markieren (wird ggf. automatisch gesetzt)
  - Arbeitszeitfelder sind bei Feiertag standardmäßig deaktiviert (können aber überschrieben werden, z.B. für Notdienste)
  - Abwesenheitstyp „Feiertag“ wird automatisch gesetzt
  - Notizfeld für Sonderregelungen (z.B. Bereitschaft, Zuschläge)
- **Validierung:**
  - Keine Pflicht zur Zeiteingabe an Feiertagen
  - Wenn trotzdem Arbeitszeit eingetragen wird: Hinweis/Bestätigung erforderlich
- **Edge Cases:**
  - Feiertage, die auf ein Wochenende fallen, werden trotzdem angezeigt
  - Regionale Feiertage (z.B. Bayern, NRW) werden pro User/Standort berücksichtigt
  - Manuelle Korrektur möglich (z.B. wenn Feiertag falsch erkannt wurde)

---

Diese Speziallogik sorgt für korrekte Monats- und Feiertagsbehandlung im Stundenzettel und muss im neuen System (Frontend & Backend) konsistent umgesetzt werden.
