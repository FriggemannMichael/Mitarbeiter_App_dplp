# TODO 2026-04-29

Ziel: Stundendaten serverseitig speichern, ohne Mitarbeiter-Account, mit Token pro Geraet/Browser.

## Morgen zuerst

1. Bestehenden Live-Flow aufnehmen
- Frontend-Stellen dokumentieren, die aktuell nur `localStorage` nutzen
- Backend-Endpunkte dokumentieren, die fuer Timesheets schon existieren
- Festlegen, welche Daten vom Dashboard aus dem Backend kommen muessen

2. Backend-Datenmodell planen
- Neues Modell fuer anonyme Mitarbeiter/Geraeteidentitaet anlegen
- Felder festlegen: `customer_key`, `device_token_hash` oder `device_token`, `display_name`, `created_at`, `last_seen_at`, `is_active`
- `Timesheet` von `user_id=1` auf Zuordnung per `employee/device` umstellen
- Eindeutigkeit fuer Woche/Jahr/Sheet pro Geraet definieren

3. Backend-Authentifizierung fuer Mitarbeitergeraet bauen
- Endpunkt fuer initiale Geraeteregistrierung anlegen
- HTTP-only Cookie fuer `employee_token` setzen
- Middleware/Helper zum Aufloesen des Geraets aus dem Cookie bauen
- Alle Mitarbeiter-Timesheet-Endpunkte auf dieses Token absichern

4. Backend-Timesheet-API umbauen
- `save-timesheet` speichert fuer das Geraet statt fuer `user_id=1`
- `get-timesheet` liest nur Daten des aktuellen Geraets
- Optional: Endpunkt fuer mehrere Wochen / Dashboard-Stats ergaenzen

5. Frontend-Sync einfuehren
- Beim App-Start `employee_token` sicherstellen
- Wochen beim Laden aus Backend holen
- Wochen beim Speichern ins Backend schreiben
- Dashboard von `localStorage` auf Backend-Daten umstellen

6. Migration fuer bestehende Live-Nutzer
- Beim ersten Start nach Update pruefen, ob lokale Wochen existieren
- Lokale Wochen einmalig ins Backend hochladen
- Erfolgreiche Migration lokal markieren
- Fallback-Verhalten definieren, falls Upload fehlschlaegt

7. Tests und Risikoabsicherung
- Backend-Tests fuer Token-Isolation: Geraet A darf Daten von Geraet B nicht sehen
- Frontend-Test fuer Erstmigration aus `localStorage`
- Testfall fuer Dashboard nach direktem Wechsel vom Stundenzettel

## Offene Entscheidungen

- Token nur im HTTP-only Cookie oder zusaetzlich Client-Marker fuer Migration?
- Ein Endpunkt pro Woche oder Sammelendpunkt fuer Dashboard?
- Sollen alte rein lokale Daten nach Migration geloescht werden oder vorerst als Fallback bleiben?

## Heute bereits festgestellt

- Dashboard liest Stunden aktuell aus `localStorage`, nicht aus dem Backend.
- Backend hat Timesheet-Endpunkte, nutzt aber derzeit hart `user_id=1`.
- Ein Bug im Auto-Save wurde bereits behoben, damit beim direkten Wechsel ins Dashboard kein offener Speicherstand verloren geht.
