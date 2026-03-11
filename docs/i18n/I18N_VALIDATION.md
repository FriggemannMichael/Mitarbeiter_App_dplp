# i18next Translation Validation

Vollständige Qualitätssicherung für alle Übersetzungen mit automatischen Checks für Keys, Platzhalter und fehlende Übersetzungen.

## 📊 Aktuelle Validierungsergebnisse

Das Projekt hat **10 Sprachen** mit **396 Translation Keys**.

### Letzte Prüfung

```
✅ de.json - 1 Fehler, 5 Warnungen
✅ en.json - Referenz
⚠️  fr.json - 4 Fehler, 9 Warnungen
⚠️  pl.json - 2 Fehler, 2 Warnungen
⚠️  ro.json - 1 Fehler, 5 Warnungen
⚠️  ru.json - 2 Fehler, 0 Warnungen
⚠️  uk.json - 1 Fehler, 0 Warnungen
❌ ar.json - 124 Fehler, 50 Warnungen (124 fehlende Keys)
❌ bg.json - 124 Fehler, 50 Warnungen (124 fehlende Keys)
❌ fa.json - 124 Fehler, 50 Warnungen (124 fehlende Keys)
```

## 🚀 Verwendung

### 1. Validierung prüfen (Entwicklung)

```bash
npm run i18n:check
```

Zeigt alle Fehler und Warnungen an, bricht aber **nicht** ab. Ideal während der Entwicklung.

### 2. Validierung prüfen (CI/CD - strikt)

```bash
npm run i18n:check:strict
```

Bricht mit Exit-Code 1 ab, wenn Fehler gefunden werden. Wird automatisch vor jedem Build ausgeführt.

### 3. Fehlende Keys automatisch hinzufügen

```bash
# Dry-Run (zeigt nur was passieren würde)
npm run i18n:sync:dry

# Keys tatsächlich hinzufügen
npm run i18n:sync
```

Fügt automatisch alle fehlenden Keys aus der Referenz (`en.json`) zu allen Sprachen hinzu. Die Keys werden mit `TODO: <English value>` markiert, sodass du sie leicht finden und übersetzen kannst.

**Wichtig:** Überprüfe die Änderungen vor dem Commit:
```bash
git diff src/locales/
```

### 4. Vor jedem Build

Das Validation-Script läuft automatisch über den `prebuild` Hook:

```bash
npm run build  # führt erst i18n:check:strict aus
```

## 🔍 Was wird geprüft?

### 1. Fehlende Keys (ERROR)

Alle Sprachen müssen die gleichen Keys wie `en.json` haben.

**Beispiel:**
```
❌ de.json
  • dashboard.thisWeek - Missing key
    Reference: This Week
```

**Lösung:** Key in der Zielsprache hinzufügen.

### 2. Extra Keys (WARNING)

Keys, die in der Zielsprache existieren, aber nicht in der Referenz.

**Beispiel:**
```
⚠️  de.json
  • old.deprecated.key - Extra key (not in reference)
```

**Lösung:** Key aus der Zielsprache entfernen oder zur Referenz hinzufügen.

### 3. Platzhalter-Mismatch (ERROR)

Platzhalter wie `{{count}}` müssen exakt übereinstimmen.

**Beispiel:**
```
❌ de.json
  • welcome.greeting - Placeholder mismatch
    Expected: {{firstName}}, {{lastName}}
    Actual: {{name}}
```

**Lösung:** Platzhalter korrigieren.

### 4. Nicht übersetzt (WARNING)

Werte, die identisch mit der Referenz sind (wahrscheinlich vergessen zu übersetzen).

**Beispiel:**
```
⚠️  de.json
  • welcome.title - Possibly untranslated (identical to reference)
    Value: Welcome
```

**Lösung:** Text übersetzen.

## 📁 Struktur

```
src/locales/
  ├── en.json          ← Referenzsprache (vollständig)
  ├── de.json          ← Deutsche Übersetzung
  ├── fr.json          ← Französische Übersetzung
  ├── pl.json          ← Polnische Übersetzung
  ├── ro.json          ← Rumänische Übersetzung
  ├── ru.json          ← Russische Übersetzung
  ├── uk.json          ← Ukrainische Übersetzung
  ├── ar.json          ← Arabische Übersetzung (unvollständig)
  ├── bg.json          ← Bulgarische Übersetzung (unvollständig)
  └── fa.json          ← Persische Übersetzung (unvollständig)

scripts/
  └── validate-i18n.js ← Validierungsscript
```

## 🛠️ Workflow

### Neue Übersetzung hinzufügen (Empfohlen)

1. **Füge Key in `en.json` hinzu (Referenz)**
   ```json
   {
     "welcome.newFeature": "New Feature"
   }
   ```

2. **Synchronisiere fehlende Keys automatisch**
   ```bash
   npm run i18n:sync
   ```

   Dies fügt automatisch den Key zu allen Sprachen hinzu:
   ```json
   // de.json, fr.json, etc.
   {
     "welcome.newFeature": "TODO: New Feature"
   }
   ```

3. **Übersetze die markierten Werte**

   Suche nach `TODO:` in allen Locale-Dateien und ersetze:
   ```json
   // de.json
   {
     "welcome.newFeature": "Neue Funktion"  // "TODO:" entfernt
   }

   // fr.json
   {
     "welcome.newFeature": "Nouvelle fonctionnalité"  // "TODO:" entfernt
   }
   ```

4. **Validiere**
   ```bash
   npm run i18n:check
   ```

### Alternative: Manuell hinzufügen

Wenn du nur wenige Keys hast:

1. Füge Key in `en.json` hinzu
2. Kopiere den Key manuell in alle anderen Sprach-Dateien
3. Übersetze die Werte
4. Validiere mit `npm run i18n:check`

### Neue Sprache hinzufügen

1. **Erstelle neue Datei** z.B. `src/locales/es.json`

2. **Kopiere `en.json` als Basis**
   ```bash
   cp src/locales/en.json src/locales/es.json
   ```

3. **Übersetze alle Values**

4. **Validiere**
   ```bash
   npm run i18n:check
   ```

## ⚙️ Konfiguration

Die Validierung verwendet:

- **Referenzsprache:** `en` (kann in Script geändert werden)
- **Locales-Verzeichnis:** `src/locales/`
- **Exit bei Fehler:** `--strict` Flag

### Script anpassen

Öffne [scripts/validate-i18n.js](scripts/validate-i18n.js) und ändere:

```javascript
const REFERENCE_LANG = 'de';  // Andere Referenzsprache
```

## 🎯 Best Practices

### 1. Immer Referenz zuerst

Füge neue Keys **immer zuerst** in `en.json` hinzu, dann in anderen Sprachen.

### 2. Platzhalter konsistent benennen

```json
// ✅ Gut
"welcome.greeting": "Hello {{firstName}} {{lastName}}"

// ❌ Schlecht
"welcome.greeting": "Hello {{first}} {{last}}"
```

### 3. Nested Keys verwenden

```json
{
  "dashboard": {
    "title": "Dashboard",
    "subtitle": "Overview"
  }
}
```

Wird automatisch zu `dashboard.title` und `dashboard.subtitle` geflattened.

### 4. Regelmäßig validieren

```bash
# Vor jedem Commit
npm run i18n:check

# Vor jedem Push
npm run i18n:check:strict
```

### 5. CI-Integration

Die Validierung läuft automatisch:

- ✅ Vor jedem Build (`prebuild`)
- ✅ In GitHub Actions / CI/CD Pipelines

## 🐛 Häufige Probleme

### Problem: "Placeholder mismatch"

**Ursache:** Platzhalter stimmen nicht überein

**Lösung:**
```json
// en.json
"message": "Welcome {{name}}"

// de.json - FALSCH
"message": "Willkommen {{username}}"

// de.json - RICHTIG
"message": "Willkommen {{name}}"
```

### Problem: "Possibly untranslated"

**Ursache:** Wert ist identisch mit Referenz

**Lösung:** Entweder übersetzen oder bewusst ignorieren (wenn der englische Begriff verwendet wird).

### Problem: "Missing key"

**Ursache:** Key existiert in Referenz, aber nicht in Zielsprache

**Lösung:** Key mit Übersetzung hinzufügen.

### Problem: "Extra key"

**Ursache:** Key existiert in Zielsprache, aber nicht in Referenz

**Lösung:**
- Entweder aus Zielsprache entfernen
- Oder zur Referenz hinzufügen (wenn gewollt)

## 📈 Statistiken

Das Script zeigt detaillierte Statistiken:

```
Languages checked: 10
Total translation keys: 396
Errors: 383
Warnings: 171
```

### Fehlerverteilung

- **ar.json:** 124 fehlende Keys (Dashboard/Vacation/SickLeave Features)
- **bg.json:** 124 fehlende Keys (Dashboard/Vacation/SickLeave Features)
- **fa.json:** 124 fehlende Keys (Dashboard/Vacation/SickLeave Features)
- **de.json:** 1 Fehler (Platzhalter oder fehlender Key)
- **fr.json:** 4 Fehler
- **pl.json:** 2 Fehler
- **ro.json:** 1 Fehler
- **ru.json:** 2 Fehler
- **uk.json:** 1 Fehler

## 🎨 Output-Beispiel

```
================================================================================
🔍 i18next Translation Validator
================================================================================

Reference language: en
Found 10 languages: ar, bg, de, en, fa, fr, pl, ro, ru, uk
Reference keys: 396

✓ en.json (reference)
✗ de.json (1 errors, 5 warnings)
⚠ fr.json (4 errors, 9 warnings)

================================================================================
📊 VALIDATION RESULTS
================================================================================

Languages checked: 10
Total translation keys: 396
Errors: 11
Warnings: 21

================================================================================
❌ ERRORS (11)
================================================================================

de.json (1 errors):
  • welcome.greeting
    Placeholder mismatch
    Expected: {{firstName}}, {{lastName}}
    Actual: {{name}}

fr.json (4 errors):
  • dashboard.title
    Missing key
    Reference: Dashboard
```

## 🔗 Integration in CI/CD

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run i18n:check:strict  # Bricht bei Fehlern ab
      - run: npm run build
```

### GitLab CI

```yaml
test:
  stage: test
  script:
    - npm install
    - npm run i18n:check:strict
    - npm run build
```

## 📞 Support

Bei Fragen oder Problemen:

1. Prüfe die [häufigen Probleme](#-häufige-probleme)
2. Führe `npm run i18n:check` aus für Details
3. Schaue in die Output-Logs für spezifische Fehler

## 🔧 Erweiterte Optionen

### Nur bestimmte Sprache prüfen

Bearbeite `scripts/validate-i18n.js`:

```javascript
const languages = ['de', 'en']; // Nur diese prüfen
```

### Warnungen als Fehler behandeln

Bearbeite das Script:

```javascript
if (stats.errors > 0 || stats.warnings > 0) {
  process.exit(1);
}
```

### Andere Referenzsprache

```javascript
const REFERENCE_LANG = 'de'; // Deutsch als Referenz
```

## ✅ Checkliste vor Commit

- [ ] `npm run i18n:check` ohne Fehler
- [ ] Alle neuen Keys in allen Sprachen vorhanden
- [ ] Platzhalter korrekt
- [ ] Keine unübersetzten Strings
- [ ] Build erfolgreich (`npm run build`)
