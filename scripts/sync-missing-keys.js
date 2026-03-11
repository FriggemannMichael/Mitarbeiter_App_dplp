#!/usr/bin/env node

/**
 * i18next Missing Keys Synchronization Script
 *
 * Automatically adds missing keys from the reference language to all other languages
 * with a "TODO: Translate" marker, maintaining the original reference value for context.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const LOCALES_DIR = join(__dirname, '../src/locales');
const REFERENCE_LANG = 'de';
const DRY_RUN = process.argv.includes('--dry-run');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Flatten nested object into dot-notation
 */
function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten dot-notation keys back to nested object
 */
function unflattenKeys(obj) {
  const result = {};

  // Sort keys to ensure parent keys are processed before children
  const sortedKeys = Object.keys(obj).sort();

  for (const key of sortedKeys) {
    const value = obj[key];
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      // If the current part doesn't exist or is not an object, create it
      if (!(part in current)) {
        current[part] = {};
      } else if (typeof current[part] !== 'object' || current[part] === null) {
        // If there's a conflict (value exists but we need an object), skip this key
        log(`  ⚠️  Skipping conflicting key: ${key} (conflicts with ${parts.slice(0, i + 1).join('.')})`, 'yellow');
        continue;
      }

      current = current[part];
    }

    const lastPart = parts[parts.length - 1];

    // Only set if it doesn't exist or is not an object (prevent overwriting nested structures)
    if (!(lastPart in current) || typeof current[lastPart] !== 'object') {
      current[lastPart] = value;
    }
  }

  return result;
}

/**
 * Sort object keys alphabetically (nested)
 */
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sorted = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = typeof obj[key] === 'object' && !Array.isArray(obj[key])
      ? sortObject(obj[key])
      : obj[key];
  }

  return sorted;
}

/**
 * Load locale file (returns flat structure if already flat)
 */
function loadLocale(lang) {
  const filePath = join(LOCALES_DIR, `${lang}.json`);
  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);

    // Check if already flat (all keys contain dots)
    const keys = Object.keys(parsed);
    const isFlat = keys.some(k => k.includes('.'));

    return parsed;
  } catch (error) {
    log(`⚠️  Failed to load ${lang}.json: ${error.message}`, 'yellow');
    return null;
  }
}

/**
 * Save locale file with pretty formatting
 */
function saveLocale(lang, data) {
  const filePath = join(LOCALES_DIR, `${lang}.json`);
  const sorted = sortObject(data);
  const json = JSON.stringify(sorted, null, 2) + '\n';

  if (DRY_RUN) {
    log(`[DRY RUN] Would write ${lang}.json`, 'gray');
  } else {
    writeFileSync(filePath, json, 'utf8');
    log(`✓ Updated ${lang}.json`, 'green');
  }
}

/**
 * Main sync function
 */
function syncMissingKeys() {
  log('================================================================================', 'cyan');
  log('🔄 i18next Missing Keys Synchronization', 'cyan');
  log('================================================================================', 'cyan');

  if (DRY_RUN) {
    log('\n⚠️  DRY RUN MODE - No files will be modified\n', 'yellow');
  }

  console.log('');
  log(`Reference language: ${REFERENCE_LANG}`, 'blue');
  log(`Locales directory: ${LOCALES_DIR}`, 'gray');
  console.log('');

  // Load reference
  const reference = loadLocale(REFERENCE_LANG);
  if (!reference) {
    log(`❌ Failed to load reference language!`, 'red');
    process.exit(1);
  }

  const referenceFlat = flattenKeys(reference);
  const totalKeys = Object.keys(referenceFlat).length;

  log(`Reference keys: ${totalKeys}`, 'blue');
  console.log('');

  // Get all locale files
  const files = readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  const languages = files.map(f => f.replace('.json', ''));

  log(`Found ${languages.length} languages: ${languages.join(', ')}`, 'green');
  console.log('');

  let totalAdded = 0;
  let totalRemoved = 0;

  // Process each language
  for (const lang of languages) {
    if (lang === REFERENCE_LANG) {
      log(`⊘ ${lang}.json (reference - skipped)`, 'gray');
      continue;
    }

    const current = loadLocale(lang);
    if (!current) {
      log(`✗ ${lang}.json (failed to load - skipped)`, 'red');
      continue;
    }

    const currentFlat = flattenKeys(current);
    const missing = Object.keys(referenceFlat).filter(k => !(k in currentFlat));
    const extra = Object.keys(currentFlat).filter(k => !(k in referenceFlat));

    if (missing.length === 0 && extra.length === 0) {
      log(`✓ ${lang}.json (already synchronized)`, 'green');
      continue;
    }

    // Add missing keys with reference value and TODO marker
    let modified = false;

    if (missing.length > 0) {
      log(`→ ${lang}.json: Adding ${missing.length} missing keys`, 'yellow');
      missing.forEach(key => {
        // Keep the English value as reference with a TODO marker
        currentFlat[key] = `TODO: ${referenceFlat[key]}`;
      });
      modified = true;
      totalAdded += missing.length;
    }

    if (extra.length > 0) {
      log(`  ⚠️  ${lang}.json: Found ${extra.length} extra keys (keeping them)`, 'gray');
      // Don't remove extra keys automatically, just warn
    }

    if (modified) {
      // Keep the flat structure - most files use flat dot-notation keys
      saveLocale(lang, currentFlat);
    }
  }

  console.log('');
  log('================================================================================', 'cyan');
  log('📊 SYNCHRONIZATION SUMMARY', 'cyan');
  log('================================================================================', 'cyan');
  console.log('');

  log(`Total keys added: ${totalAdded}`, totalAdded > 0 ? 'green' : 'gray');
  log(`Extra keys found: ${totalRemoved}`, totalRemoved > 0 ? 'yellow' : 'gray');

  console.log('');

  if (totalAdded > 0) {
    log(`✅ Synchronization complete!`, 'green');
    log('', 'reset');
    log('⚠️  Next steps:', 'yellow');
    log('   1. Review the added keys (marked with "TODO:")', 'yellow');
    log('   2. Translate the values for each language', 'yellow');
    log('   3. Remove the "TODO:" prefix', 'yellow');
    log('   4. Run: npm run i18n:check', 'yellow');
  } else {
    log(`✅ All languages are already synchronized!`, 'green');
  }

  console.log('');
  log('================================================================================', 'cyan');
  console.log('');
}

// Run sync
syncMissingKeys();
