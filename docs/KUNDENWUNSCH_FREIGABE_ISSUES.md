# Kundenwunsch: Erweiterter Freigabe-Workflow (Issue-Liste)

Stand: 10.03.2026

## Kontext

- Aktuell kann die App Stundenzettel senden, aber keine eingehenden Kunden-E-Mails verarbeiten.
- Der Kunde erhaelt den Zettel als PDF-Anhang.
- Gewuenscht sind zwei Freigabevarianten:
  - Direkt freigeben/unterschreiben
  - Per E-Mail pruefen und spaeter an PDL weiterleiten

## Zielbild (fachlich)

- Mitarbeiter unterschreibt in der App.
- Versand geht an `Kunden-E-Mail (To)`.
- PDL erhaelt Kopie in `CC`.
- Freigabe durch Kunden laeuft entweder:
  - digital ueber einen sicheren Freigabe-Link, oder
  - manuell per Mail-Weiterleitung (prozessual, nicht automatisch auswertbar).

## Priorisierte Issues

## P0 (Muss)

- [ ] `ISSUE-01` Empfaengerlogik im Backend umstellen (To/CC korrekt)
  - To: `customer_email`
  - CC: `recipient_email` (PDL)
  - Fallback: ohne Kunden-E-Mail nur an `recipient_email`
  - Akzeptanz: Versandprotokoll zeigt korrektes Routing.

- [ ] `ISSUE-02` Versandstatus im Datenmodell erweitern
  - Neue Statuswerte fuer Wochenzettel:
    - `EMPLOYEE_SIGNED`
    - `SENT_TO_CUSTOMER`
    - `CUSTOMER_APPROVED_DIRECT`
    - `CUSTOMER_APPROVED_EMAIL`
    - `CUSTOMER_REJECTED`
  - Akzeptanz: Statuswechsel sind nachvollziehbar und persistiert.

- [ ] `ISSUE-03` Sperrlogik an neuen Workflow anpassen
  - Sperren nicht erst bei Vorarbeiter-Signatur, sondern direkt nach erfolgreichem Kundensend (`SENT_TO_CUSTOMER`).
  - Entsperren nur ueber Admin-Prozess mit Audit-Eintrag.
  - Akzeptanz: Nach Versand keine stillen Inhaltsaenderungen moeglich.

- [ ] `ISSUE-04` Audit-Log fuer Freigabeprozess
  - Ereignisse: erstellt, gesendet, zugestellt (optional), freigegeben, abgelehnt, entsperrt, erneut gesendet.
  - Akzeptanz: Jeder Freigabeschritt ist revisionssicher dokumentiert.

## P1 (Soll)

- [ ] `ISSUE-05` Freigabevariante A: Direktfreigabe per Token-Link
  - Backend erzeugt einmaligen, befristeten Freigabe-Link pro Versand.
  - Link oeffnet einfache Freigabeseite (kein App-Login erforderlich).
  - Aktionen: `Freigeben` / `Rueckfrage`.
  - Akzeptanz: Klick aendert Status auf `CUSTOMER_APPROVED_DIRECT` oder `CUSTOMER_REJECTED`.

- [ ] `ISSUE-06` E-Mail-Template fuer Kundenfreigabe erweitern
  - Mailtext enthaelt:
    - PDF-Anhang
    - Referenz-ID
    - Freigabe-Link (Variante A)
    - Hinweis auf manuelle Weiterleitung (Variante B)
  - Akzeptanz: Kunde kann ohne Rueckfrage beide Varianten verstehen.

- [ ] `ISSUE-07` Referenz-ID pro Zettel einfuehren
  - Eindeutige ID in Betreff, PDF und Mailtext (z. B. `TS-2026-000123`).
  - Akzeptanz: Jede Kundenrueckmeldung kann eindeutig zugeordnet werden.

- [ ] `ISSUE-08` Admin-Ansicht fuer Freigabestatus
  - Liste offener/abgeschlossener Kundenfreigaben.
  - Filter: Kunde, Mitarbeiter, Woche, Status.
  - Akzeptanz: PDL kann Freigabestand ohne Mailsuche sehen.

## P2 (Kann)

- [ ] `ISSUE-09` Freigabevariante B digitalisieren (optional spaeter)
  - Eingangsmail-Parsing via dedizierter Mailbox/Webhook.
  - Automatisches Mapping ueber Referenz-ID.
  - Akzeptanz: Weiterleitungs-Mail setzt Status automatisch auf `CUSTOMER_APPROVED_EMAIL`.

- [ ] `ISSUE-10` PDF um Freigabe-Metadaten erweitern
  - Sichtbar: Referenz-ID, Versandzeitpunkt, Freigabestatus, Freigabezeitpunkt.
  - Akzeptanz: PDF allein reicht fuer spaetere Nachweise.

- [ ] `ISSUE-11` SLA/Reminder fuer offene Kundenfreigaben
  - Erinnerungsmail nach X Tagen ohne Rueckmeldung.
  - Akzeptanz: Offene Freigaben sinken, Prozess bleibt steuerbar.

## Offene Entscheidungen (vor Umsetzung klaeren)

- [ ] `DECISION-01` Reicht "Freigeben per Klick", oder ist eine echte Kunden-Signatur erforderlich?
- [ ] `DECISION-02` Wie lange soll ein Freigabe-Token gueltig sein (z. B. 7/14/30 Tage)?
- [ ] `DECISION-03` Soll "manuelle Mail-Weiterleitung" anfangs nur als Prozess gelten (ohne Automatik)?
- [ ] `DECISION-04` Was ist der fachliche Unterschied zwischen `Rückfrage` und `Ablehnung`?
- [ ] `DECISION-05` Darf ein bereits freigegebener Zettel nach Entsperrung erneut freigegeben werden (Versionierung)?

## Technische Randbedingungen

- Frontend bleibt "send-only" fuer E-Mail.
- Empfang/Auswertung von Kundenantworten muss im Backend oder in externer Mail-Infrastruktur passieren.
- Ohne Backend-Endpoint fuer Freigabe ist keine digitale Kundenfreigabe moeglich.

## Empfohlene Umsetzung in 2 Phasen

1. Phase 1 (schnell, risikoarm):
   - ISSUE-01 bis ISSUE-04
   - ISSUE-06 und ISSUE-07
   - Manuelle Variante B als Prozess
2. Phase 2 (Ausbau):
   - ISSUE-05 und ISSUE-08
   - optional ISSUE-09 bis ISSUE-11

---

## Ticket-Backlog mit Aufwand (S/M/L)

Legende:
- `S` = klein (ca. 0.5-1.5 PT)
- `M` = mittel (ca. 2-4 PT)
- `L` = gross (ca. 5+ PT)

## Reihenfolge: Phase 1 (MVP)

- [ ] `TKT-01` To/CC Routing im Backend korrigieren
  - Mapping: ISSUE-01
  - Aufwand: `S`
  - Abhaengigkeiten: keine
  - Ergebnis: Kunde in To, PDL in CC, sauberer Fallback ohne Kundenmail.

- [ ] `TKT-02` Versandstatus + Status-Transitionen erweitern
  - Mapping: ISSUE-02
  - Aufwand: `M`
  - Abhaengigkeiten: keine
  - Ergebnis: Statusmodell fuer Kundenfreigabe technisch verfuegbar.

- [ ] `TKT-03` Locking auf `SENT_TO_CUSTOMER` umstellen
  - Mapping: ISSUE-03
  - Aufwand: `M`
  - Abhaengigkeiten: TKT-02
  - Ergebnis: Nach Versand unveraenderbarer Beleg, Entsperren nur kontrolliert.

- [ ] `TKT-04` Audit-Log Events fuer neuen Freigabeprozess
  - Mapping: ISSUE-04
  - Aufwand: `S`
  - Abhaengigkeiten: TKT-02
  - Ergebnis: Nachvollziehbare Historie pro Stundenzettel.

- [ ] `TKT-05` Kundenmail-Template mit Referenz-ID und 2 Varianten
  - Mapping: ISSUE-06 + ISSUE-07
  - Aufwand: `S`
  - Abhaengigkeiten: TKT-01
  - Ergebnis: Kunde versteht "Direktfreigabe" und "per Mail pruefen" sofort.

- [ ] `TKT-06` Referenz-ID im PDF + Betreff + Log
  - Mapping: ISSUE-07 + ISSUE-10 (Teil)
  - Aufwand: `M`
  - Abhaengigkeiten: TKT-02
  - Ergebnis: Eindeutige Zuordnung in allen Kanaelen.

- [ ] `TKT-07` Prozessdefinition fuer manuelle Mail-Freigabe (Variante B)
  - Mapping: ISSUE-09 (manuell als Vorstufe), DECISION-03
  - Aufwand: `S`
  - Abhaengigkeiten: TKT-05, TKT-06
  - Ergebnis: Betriebsfaehiger Prozess ohne automatische Eingangsverarbeitung.

## Reihenfolge: Phase 2 (Erweiterung)

- [ ] `TKT-08` Direktfreigabe per Token-Link (ohne Login)
  - Mapping: ISSUE-05
  - Aufwand: `L`
  - Abhaengigkeiten: DECISION-01, DECISION-02, TKT-02, TKT-06
  - Ergebnis: Kunde kann digital freigeben, Status aendert sich automatisch.

- [ ] `TKT-09` Admin-Uebersicht "Kundenfreigaben"
  - Mapping: ISSUE-08
  - Aufwand: `M`
  - Abhaengigkeiten: TKT-02, TKT-04
  - Ergebnis: PDL sieht offenen Stand ohne Mail-Suche.

- [ ] `TKT-10` Eingehende Mail automatisiert verarbeiten (optional)
  - Mapping: ISSUE-09
  - Aufwand: `L`
  - Abhaengigkeiten: TKT-06, externe Mail-Infrastruktur
  - Ergebnis: Weiterleitungs-Mails setzen Status automatisch.

- [ ] `TKT-11` Reminder/SLA fuer offene Freigaben
  - Mapping: ISSUE-11
  - Aufwand: `M`
  - Abhaengigkeiten: TKT-02, TKT-09
  - Ergebnis: Automatische Nachverfolgung bei ausstehenden Kundenreaktionen.

## Umsetzungspaket fuer den 2000-EUR Scope (empfohlen)

- [ ] `PKG-MVP-2000`
  - Enthalten: TKT-01 bis TKT-07
  - Gesamtaufwand: `M-L` (je nach bestehender Datenhaltung)
  - Nutzen: Neuer Kundenprozess laeuft stabil ohne komplexe Inbound-Mail-Automation.

## Vor Start zwingend zu entscheiden

- [ ] `DECISION-01` Klick-Freigabe ausreichend oder echte Signaturpflicht?
- [ ] `DECISION-02` Token-Laufzeit und Sicherheitsniveau fuer Direktfreigabe.
- [ ] `DECISION-03` Variante B zunaechst rein manuell (ja/nein).
- [ ] `DECISION-04` Definition und Behandlung von "Rueckfrage" vs. "Ablehnung".
- [ ] `DECISION-05` Re-Freigabe bei entsperrtem, geaendertem Zettel (Versionierung).
