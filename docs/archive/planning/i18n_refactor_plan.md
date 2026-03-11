# Remove Hardcoded WPDL from i18n - Task Plan

## 🎯 Objective

Remove all hardcoded "WPDL" references from locale files and make them dynamic based on customer configuration.

## 📋 Hardcoded Strings Found

**5 keys** × **8 languages** = **40 translations** to fix

### Keys Requiring Update:

| Key                         | Current Value                                 | Replacement Strategy                  |
| --------------------------- | --------------------------------------------- | ------------------------------------- |
| `footer.version`            | "WPDL Timesheet v1.0"                         | "Timesheet v1.0" (generic)            |
| `pwa.email.subject`         | "WPDL Timesheet - Mobile App"                 | "Timesheet - Mobile App"              |
| `pwa.email.body`            | "Here is the link to the WPDL Timesheet App:" | Remove "WPDL"                         |
| `app.title`                 | "WPDL Employee App"                           | "Employee App" or use `companyConfig` |
| `advancePayment.email.signature` | "Sent with WPDL Employee App"                 | "Sent with Employee App"              |

**Languages affected:** de, en, fa, fr, pl, ro, ru, uk

## 📂 Files to Modify

- src/locales/de.json
- src/locales/en.json
- src/locales/fa.json
- src/locales/fr.json
- src/locales/pl.json
- src/locales/ro.json
- src/locales/ru.json
- src/locales/uk.json

## 🔄 Execution Plan

### Phase 1: Extract Current Values ✅ DONE

- Found all 5 hardcoded keys across 8 languages

### Phase 2: Update Locale Files (IN PROGRESS)

- [ ] Replace hardcoded strings with generic alternatives
- [ ] Validate JSON syntax for all files
- [ ] Ensure consistency across all languages

### Phase 3: Build Test

- [ ] Run: `npm run build` → verify no errors
- [ ] Check bundle integrity

### Phase 4: Dev Server Test

- [ ] Run: `npm run dev`
- [ ] Verify app displays correctly with DPDL config
- [ ] Test app.title displays properly
- [ ] Check footer version string

### Phase 5: Code Review & Commit

- [ ] Review all changes
- [ ] Git commit with message: "refactor: remove hardcoded WPDL strings from i18n"

## 📊 Progress

- Phase 1: ✅ COMPLETE - All keys identified
- Phase 2: 🔄 IN PROGRESS
- Phase 3: ⏳ PENDING
- Phase 4: ⏳ PENDING
- Phase 5: ⏳ PENDING
