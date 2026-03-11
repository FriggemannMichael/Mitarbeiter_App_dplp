# Was ist neu – und was wurde verbessert?

Stand: 2026-03-11

---

## Für den Kunden

### 🔒 Mehr Sicherheit beim E-Mail-Versand

Der Versand von Stundenzetteln per E-Mail ist jetzt durch zwei zusätzliche Schutzschichten gesichert:

- **Geheimer Schlüssel** – nur die App selbst darf E-Mails versenden
- **Anfragenlimit** – maximal 10 Versandvorgänge pro Minute pro Gerät
- **E-Mail-Prüfung** – die Empfängeradresse wird vor dem Versand automatisch auf Gültigkeit geprüft

### 🗄️ Professionelle Datenbank

Die Datenhaltung wurde auf **PostgreSQL** umgestellt – die gleiche Datenbanktechnologie die von großen Plattformen wie Instagram und Spotify eingesetzt wird. Das bringt:

- Stabile Performance auch bei mehreren gleichzeitigen Nutzern
- Automatisches Daten-Logging (kein Datenverlust bei Serverabsturz)
- Saubere strukturierte Backups jederzeit möglich

### 🐳 Modernes Deployment mit Docker

Die gesamte Anwendung läuft jetzt in **Docker-Containern**. Das bedeutet:

- **Updates in einem Schritt** – ein einziger Befehl aktualisiert die gesamte Anwendung
- **Automatischer Neustart** – fällt der Server aus, startet er eigenständig wieder hoch
- **Isolation** – Datenbank und Anwendung laufen getrennt voneinander, ein Problem in einem Bereich betrifft den anderen nicht
- **Portabilität** – die Anwendung läuft auf jedem Server identisch, Umzüge sind einfach

### 📋 Lückenloseres Protokoll

Alle kritischen Aktionen – Versand von Stundenzetteln, Logins, Konfigurationsänderungen – werden jetzt in einer strukturierten Datenbank protokolliert. Das erleichtert Nachvollziehbarkeit und Fehleranalyse.

### ✍️ Digitaler Freigabe-Prozess

Der Stundenzettel kann jetzt direkt aus der App zur Prüfung an den Kunden gesendet werden – ohne Ausdrucken, ohne manuelle E-Mail:

1. Mitarbeiter trägt Stunden ein und unterschreibt digital in der App
2. Wahl: **Sofort abschließen** (Vorarbeiter unterschreibt vor Ort) oder **Zur Prüfung senden** (Kunde bekommt PDF per E-Mail)
3. Bei "Zur Prüfung senden": PDF geht automatisch an die hinterlegte Kunden-Mailadresse, das Büro erhält eine Kopie (CC)
4. Das Dokument wird gesperrt – nachträgliche Änderungen sind nicht mehr möglich

---

## Technische Zusammenfassung

| Bereich | Verbesserung |
|---|---|
| **Datenbank** | SQLite → PostgreSQL 16 (produktionsreif, skalierbar) |
| **Containerisierung** | Neu: Docker Compose (web + db isoliert) |
| **E-Mail-Schutz** | Rate-Limiting (10/Min/IP) + API-Secret + Format-Validierung |
| **Auto-Restart** | `restart: unless-stopped` in Docker |
| **Code-Struktur** | Klare Trennung: Views / Services / Models |
| **Deployment** | Ein Befehl statt manueller Dateiübertragung |
| **Backup** | Strukturiertes `pg_dump` statt Datei-Kopie |
| **Authentifizierung** | JWT Token (zustandslos, skalierbar) |
