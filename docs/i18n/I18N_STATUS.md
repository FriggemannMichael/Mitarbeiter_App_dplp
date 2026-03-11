# i18n Translation Status

**Last Updated:** 2026-01-04
**Reference Language:** German (de)
**Total Languages:** 10
**Total Translation Keys:** 396

## Language Files

| Language | Code | Keys | Status | Notes |
|----------|------|------|--------|-------|
| Arabic | ar | 446 | ✓ Complete | 50 extra keys (legacy) |
| Bulgarian | bg | 446 | ✓ Complete | 50 extra keys (legacy) |
| **German** | **de** | **396** | **✓ Reference** | Primary language |
| English | en | 396 | ✓ Complete | 5 warnings (acceptable) |
| Farsi | fa | 406 | ✓ Complete | 10 extra keys (legacy) |
| French | fr | 396 | ✓ Complete | 4 warnings (acceptable) |
| Polish | pl | 396 | ✓ Complete | 4 warnings (acceptable) |
| Romanian | ro | 396 | ✓ Complete | 4 warnings (acceptable) |
| Russian | ru | 396 | ✓ Complete | Perfect |
| Ukrainian | uk | 396 | ✓ Complete | Perfect |

## Validation Summary

✅ **All languages are synchronized!**

- **Errors:** 0
- **Warnings:** 127 (acceptable)

### Warning Details

Warnings are non-critical and fall into these categories:

1. **Extra Keys (110 warnings)**
   Some languages (ar, bg, fa) have legacy keys that were removed from German but kept for backward compatibility:
   - `dashboard.noActivity`, `dashboard.stats.*`, `vacation.annual`, etc.
   - These can be safely removed if no longer needed

2. **Identical Values (17 warnings)**
   Some words are similar across languages (acceptable):
   - "Offline", "Online" (technical terms)
   - "Profil" (similar in German, French, Polish, Romanian)
   - "Kontakt" (German/Polish cognate)

## NPM Scripts

The following scripts are available:

```bash
# Check translation validity
npm run i18n:check

# Check with strict mode (fails on errors)
npm run i18n:check:strict

# Sync missing keys from German to other languages
npm run i18n:sync

# Preview sync without making changes
npm run i18n:sync:dry
```

## Configuration

Both validation and sync scripts are configured in:
- `scripts/validate-i18n.js` - Line 23: `REFERENCE_LANG = 'de'`
- `scripts/sync-missing-keys.js` - Line 19: `REFERENCE_LANG = 'de'`

## Workflow

When adding new translations:

1. **Add keys to German** ([src/locales/de.json](src/locales/de.json))
2. **Sync to other languages:**
   ```bash
   npm run i18n:sync
   ```
3. **Translate the TODO markers** in each language file
4. **Validate:**
   ```bash
   npm run i18n:check
   ```

## Extra Keys to Clean Up (Optional)

The following extra keys exist in some languages but not in German (de):

### Legacy Dashboard Keys
- `dashboard.noActivity`
- `dashboard.pendingApprovals`
- `dashboard.recentActivity`
- `dashboard.stats.overtime`
- `dashboard.stats.remaining`
- `dashboard.stats.thisMonth`
- `dashboard.stats.thisWeek`
- `dashboard.stats.totalHours`
- `dashboard.stats.vacationDays`
- `dashboard.viewAll`

### Legacy Settings Keys
- `settings.language`
- `settings.notifications`
- `settings.theme`

### Legacy Advance Payment Keys
- `advancePayment.amountRequired`
- `advancePayment.approved`
- `advancePayment.confirmDelete`
- `advancePayment.deleteRequest`
- `advancePayment.editRequest`
- `advancePayment.history`
- `advancePayment.noRequests`
- `advancePayment.pending`
- `advancePayment.reason`
- `advancePayment.reasonRequired`
- `advancePayment.rejected`
- `advancePayment.requestSubmitted`
- `advancePayment.requestedAmount`
- `advancePayment.requests`
- `advancePayment.status`
- `advancePayment.submit`

### Legacy Tabs Keys
- `tabs.advance`
- `tabs.overview`

### Legacy Vacation Keys
- `vacation.annual`
- `vacation.approved`
- `vacation.available`
- `vacation.balance`
- `vacation.confirmDelete`
- `vacation.days`
- `vacation.deleteRequest`
- `vacation.editRequest`
- `vacation.history`
- `vacation.noRequests`
- `vacation.pending`
- `vacation.personal`
- `vacation.rejected`
- `vacation.requestSubmitted`
- `vacation.requests`
- `vacation.sick`
- `vacation.status`
- `vacation.unpaid`
- `vacation.used`

**Note:** These extra keys are kept for backward compatibility. Remove them from ar.json, bg.json, and fa.json if they're no longer used in the application.
