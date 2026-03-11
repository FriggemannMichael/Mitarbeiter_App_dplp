# Task Plan: Kundenautomatisierung

**Objective:** Setup-Automation bauen, damit neue Kunden in Minuten deployt werden können (nur Config-Änderungen)

**Status:** 🔄 IN_PROGRESS

---

## Phase 1: Analysis & Mapping ⏳ PENDING

**Goal:** Ermitteln, welche Werte pro Kunde konfiguriert werden müssen

### Task 1.1: Frontend-Config identifizieren

- [ ] `public/config.json` analysieren → Welche Felder sind kundenabhängig?
- [ ] `.env.example` prüfen → Welche Variablen ändern sich?
- [ ] Assets-Pfade → Logo, Favicon, andere Bilder

**Expected Output:** List der Frontend-Konfig-Punkte

**Status:** PENDING

---

### Task 1.2: Backend-Config identifizieren

- [ ] `backend/config.php` → Welche Felder sind kundenabhängig?
- [ ] `backend/config-example.json` → Vergleich mit Frontend
- [ ] SMTP, Database, API-Endpoints → Was ändert sich pro Kunde?

**Expected Output:** List der Backend-Konfig-Punkte

**Status:** PENDING

---

### Task 1.3: Config-Mapping-Tabelle erstellen

- [ ] Frontend-Felder ↔ Backend-Felder mappen
- [ ] Abhängigkeiten dokumentieren
- [ ] Template-Variablen definieren (`{CUSTOMER_NAME}`, `{COMPANY_EMAIL}`, etc.)

**Expected Output:** `customer_config_template.md`

**Status:** PENDING

---

## Phase 2: Setup-Skript entwickeln ⏳ PENDING

**Goal:** Automatisiertes Skript bauen, das Kundendaten → Config-Dateien generiert

### Task 2.1: PowerShell-Setup-Skript erstellen

- [ ] Input: Customer JSON mit allen Daten
- [ ] Output: `public/config.json`, `backend/config.php`, `.env`
- [ ] Validation: Alle erforderlichen Felder vorhanden?
- [ ] Error-Handling: Bei Validierungsfehler abort

**Expected Output:** `scripts/setup-customer.ps1`

**Status:** PENDING

---

### Task 2.2: Customer-Template JSON erstellen

- [ ] Template mit allen erforderlichen Feldern
- [ ] Beispiel für Kunde 1 (WPDL)
- [ ] Beispiel für Kunde 2 (Test)

**Expected Output:** `scripts/customer-template.json`, `scripts/customer-examples/`

**Status:** PENDING

---

### Task 2.3: NPM-Command hinzufügen

- [ ] `package.json` erweitern mit `setup:customer` Command
- [ ] Command ruft das Skript auf mit Customer-Config

**Expected Output:** `npm run setup:customer -- --config=path/to/customer.json`

**Status:** PENDING

---

## Phase 3: Testing ⏳ PENDING

**Goal:** Automation testen mit simulierten Kunden

### Task 3.1: Skript mit Test-Kundendaten testen

- [ ] Customer 1: WPDL (aktuell) → Configs generieren
- [ ] Customer 2: Test-Firma → Configs generieren
- [ ] Verify: Alle Werte korrekt eingesetzt?

**Expected Output:** Verifizierte Config-Dateien

**Status:** PENDING

---

### Task 3.2: Build & Deployment testen

- [ ] `npm run build` mit generiertem Config laufen lassen
- [ ] Bundle erfolgreich?
- [ ] Backend startet mit neuem config.php?

**Expected Output:** Build erfolgreich für ein Test-Deployment

**Status:** PENDING

---

## Phase 4: Code Review ⏳ PENDING

**Goal:** Skript-Qualität & Security prüfen

### Task 4.1: PHP-Skript Code-Review

- [ ] Input-Validierung ok?
- [ ] Keine hartcodierten Secrets?
- [ ] Error-Messages nicht zu spezifisch?

**Status:** PENDING

---

### Task 4.2: PowerShell-Skript Review

- [ ] Error-Handling ok?
- [ ] Rückgängig-Möglichkeit dokumentiert?
- [ ] Logging vorhanden?

**Status:** PENDING

---

## Decisions & Blockers

| Decision                            | Status     | Notes                           |
| ----------------------------------- | ---------- | ------------------------------- |
| PHP oder Shell-Skript für Setup?    | 🔄 PENDING | → Tim: PHP + PowerShell         |
| Wo sollen Template-Dateien liegen?  | 🔄 PENDING | → Proposal: `scripts/` Folder   |
| Backup der alten Config vor Update? | 🔄 PENDING | → Recommendation: Ja, `.backup` |

---

## Constraints

- ✅ **Nur Config-Änderungen** — Kein Code ändern
- ✅ **Automatisierbar** — Ein Command sollte reichen
- ✅ **Idempotent** — Mehrfach laufen können ohne Fehler
- ✅ **Dokumentiert** — Neuer Kunde soll verstehen, was zu tun ist

---

## Success Criteria

- [ ] Setup-Skript existiert und ist lauffähig
- [ ] Eine neue Kundenconfig in < 5 Min generierbar
- [ ] Automation ist dokumentiert
- [ ] Test mit 2 verschiedenen Kunden erfolgreich
