# i18n Quick Start Guide

Schnelle Referenz für die tägliche Arbeit mit Übersetzungen.

## 📋 Verfügbare Commands

```bash
# Validierung prüfen (zeigt Fehler & Warnungen)
npm run i18n:check

# Validierung prüfen (strict - bricht bei Fehlern ab)
npm run i18n:check:strict

# Fehlende Keys automatisch hinzufügen (Vorschau)
npm run i18n:sync:dry

# Fehlende Keys automatisch hinzufügen
npm run i18n:sync
```

## ⚡ Quick Workflows

### Neue Translation hinzufügen

```bash
# 1. Key in en.json hinzufügen
# 2. Fehlende Keys synchronisieren
npm run i18n:sync

# 3. TODO-markierte Werte übersetzen
# Suche nach "TODO:" in src/locales/*.json

# 4. Validieren
npm run i18n:check
```

### Vor einem Commit

```bash
# Alle Übersetzungen prüfen
npm run i18n:check

# Wenn Fehler → beheben → nochmal prüfen
npm run i18n:check
```

### Build (automatisch)

```bash
# Läuft automatisch i18n:check:strict vor dem Build
npm run build
```

## 🎯 Aktuelle Sprachen

Das Projekt unterstützt **10 Sprachen**:

- ✅ **en** - English (Referenz, 396 Keys)
- ✅ **de** - Deutsch (vollständig)
- ⚠️ **fr** - Français (4 Keys fehlen)
- ⚠️ **pl** - Polski (2 Keys fehlen)
- ⚠️ **ro** - Română (1 Key fehlt)
- ⚠️ **ru** - Русский (2 Keys fehlen)
- ⚠️ **uk** - Українська (1 Key fehlt)
- ❌ **ar** - العربية (124 Keys fehlen)
- ❌ **bg** - Български (124 Keys fehlen)
- ❌ **fa** - فارسی (124 Keys fehlen)

**Stand:** 2026-01-04

## 🔍 Was wird validiert?

| Check | Typ | Beschreibung |
|-------|-----|--------------|
| Fehlende Keys | ❌ ERROR | Key in Referenz, aber nicht in Zielsprache |
| Extra Keys | ⚠️ WARNING | Key in Zielsprache, aber nicht in Referenz |
| Platzhalter | ❌ ERROR | `{{placeholder}}` stimmen nicht überein |
| Unübersetzt | ⚠️ WARNING | Wert identisch mit Referenz |

## 🚨 Häufige Fehler beheben

### "Missing key"

```bash
# Automatisch hinzufügen
npm run i18n:sync

# Dann TODO-Werte übersetzen
```

### "Placeholder mismatch"

```json
// ❌ FALSCH
"en": "Welcome {{firstName}} {{lastName}}"
"de": "Willkommen {{name}}"

// ✅ RICHTIG
"en": "Welcome {{firstName}} {{lastName}}"
"de": "Willkommen {{firstName}} {{lastName}}"
```

### "Possibly untranslated"

Wert ist identisch mit Englisch - entweder:
- Übersetzen (wenn nötig)
- Oder bewusst so lassen (z.B. Eigennamen)

## 📦 Dateien

```
src/locales/           ← Alle Übersetzungsdateien
  ├── en.json          ← Referenzsprache
  ├── de.json
  ├── fr.json
  └── ...

scripts/
  ├── validate-i18n.js     ← Validierungsscript
  └── sync-missing-keys.js ← Sync-Script
```

## 💡 Tipps

1. **Immer Referenz zuerst**: Neue Keys immer zuerst in `en.json` hinzufügen
2. **Automatisch synchronisieren**: `npm run i18n:sync` spart viel Zeit
3. **Vor jedem Commit**: `npm run i18n:check` ausführen
4. **TODO suchen**: Nach `TODO:` in den Dateien suchen für unübersetzte Strings

## 🔗 Mehr Infos

Siehe [I18N_VALIDATION.md](I18N_VALIDATION.md) für die vollständige Dokumentation.
