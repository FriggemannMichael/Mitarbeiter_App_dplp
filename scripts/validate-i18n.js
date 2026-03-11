#!/usr/bin/env node

/**
 * i18next Translation Validation Script
 *
 * Checks:
 * - All languages have the same keys as reference (en)
 * - No missing or extra keys
 * - Placeholders match ({{variable}})
 * - No untranslated strings (identical to reference)
 * - Valid JSON syntax
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const LOCALES_DIR = join(__dirname, '../src/locales');
const REFERENCE_LANG = 'de';
const EXIT_ON_ERROR = process.argv.includes('--strict');

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

// Statistics
const stats = {
  totalLanguages: 0,
  totalKeys: 0,
  errors: 0,
  warnings: 0,
  issues: [],
};

/**
 * Extract placeholders from a translation string
 * @param {string} str - Translation string
 * @returns {string[]} Array of placeholder names
 */
function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = [...str.matchAll(/\{\{([^}]+)\}\}/g)];
  return matches.map(m => m[1].trim()).sort();
}

/**
 * Flatten nested JSON object into dot-notation keys
 * @param {Object} obj - JSON object
 * @param {string} prefix - Key prefix
 * @returns {Object} Flattened object
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
 * Load and parse a locale file
 * @param {string} lang - Language code
 * @returns {Object|null} Parsed JSON or null on error
 */
function loadLocale(lang) {
  const filePath = join(LOCALES_DIR, `${lang}.json`);

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    stats.errors++;
    stats.issues.push({
      type: 'error',
      lang,
      message: `Failed to load or parse: ${error.message}`,
    });
    return null;
  }
}

/**
 * Compare two language files
 * @param {string} lang - Language code to check
 * @param {Object} referenceFlat - Flattened reference translations
 * @param {Object} currentFlat - Flattened current translations
 */
function compareLanguages(lang, referenceFlat, currentFlat) {
  const referenceKeys = Object.keys(referenceFlat);
  const currentKeys = Object.keys(currentFlat);

  const missing = referenceKeys.filter(k => !(k in currentFlat));
  const extra = currentKeys.filter(k => !(k in referenceFlat));

  // Check missing keys
  if (missing.length > 0) {
    stats.errors += missing.length;
    missing.forEach(key => {
      stats.issues.push({
        type: 'error',
        lang,
        key,
        message: `Missing key`,
        reference: referenceFlat[key],
      });
    });
  }

  // Check extra keys
  if (extra.length > 0) {
    stats.warnings += extra.length;
    extra.forEach(key => {
      stats.issues.push({
        type: 'warning',
        lang,
        key,
        message: `Extra key (not in reference)`,
      });
    });
  }

  // Check existing keys
  referenceKeys.forEach(key => {
    if (!(key in currentFlat)) return; // Already reported as missing

    const refValue = referenceFlat[key];
    const currValue = currentFlat[key];

    // Check placeholder consistency
    const refPlaceholders = extractPlaceholders(refValue);
    const currPlaceholders = extractPlaceholders(currValue);

    if (JSON.stringify(refPlaceholders) !== JSON.stringify(currPlaceholders)) {
      stats.errors++;
      stats.issues.push({
        type: 'error',
        lang,
        key,
        message: `Placeholder mismatch`,
        expected: refPlaceholders.length > 0 ? `{{${refPlaceholders.join('}}, {{')}}}` : 'none',
        actual: currPlaceholders.length > 0 ? `{{${currPlaceholders.join('}}, {{')}}}` : 'none',
      });
    }

    // Check for untranslated strings (same as reference)
    if (lang !== REFERENCE_LANG && refValue === currValue && typeof refValue === 'string' && refValue.length > 0) {
      stats.warnings++;
      stats.issues.push({
        type: 'warning',
        lang,
        key,
        message: `Possibly untranslated (identical to reference)`,
        value: refValue,
      });
    }
  });
}

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print report section
 */
function printSection(title) {
  console.log('');
  log(`${'='.repeat(80)}`, 'cyan');
  log(title, 'cyan');
  log(`${'='.repeat(80)}`, 'cyan');
}

/**
 * Print validation results
 */
function printResults() {
  printSection('📊 VALIDATION RESULTS');

  console.log('');
  log(`Languages checked: ${stats.totalLanguages}`, 'blue');
  log(`Total translation keys: ${stats.totalKeys}`, 'blue');
  log(`Errors: ${stats.errors}`, stats.errors > 0 ? 'red' : 'green');
  log(`Warnings: ${stats.warnings}`, stats.warnings > 0 ? 'yellow' : 'green');

  if (stats.issues.length === 0) {
    console.log('');
    log('✅ All validations passed!', 'green');
    return;
  }

  // Group issues by type and language
  const byType = {
    error: stats.issues.filter(i => i.type === 'error'),
    warning: stats.issues.filter(i => i.type === 'warning'),
  };

  // Print errors
  if (byType.error.length > 0) {
    printSection(`❌ ERRORS (${byType.error.length})`);

    const byLang = {};
    byType.error.forEach(issue => {
      if (!byLang[issue.lang]) byLang[issue.lang] = [];
      byLang[issue.lang].push(issue);
    });

    Object.entries(byLang).forEach(([lang, issues]) => {
      console.log('');
      log(`${lang}.json (${issues.length} errors):`, 'red');
      issues.forEach(issue => {
        console.log(`  ${colors.gray}•${colors.reset} ${issue.key || 'N/A'}`);
        console.log(`    ${colors.red}${issue.message}${colors.reset}`);
        if (issue.expected) {
          console.log(`    Expected: ${colors.green}${issue.expected}${colors.reset}`);
          console.log(`    Actual:   ${colors.red}${issue.actual}${colors.reset}`);
        }
        if (issue.reference) {
          console.log(`    Reference: ${colors.gray}${issue.reference}${colors.reset}`);
        }
      });
    });
  }

  // Print warnings
  if (byType.warning.length > 0) {
    printSection(`⚠️  WARNINGS (${byType.warning.length})`);

    const byLang = {};
    byType.warning.forEach(issue => {
      if (!byLang[issue.lang]) byLang[issue.lang] = [];
      byLang[issue.lang].push(issue);
    });

    Object.entries(byLang).forEach(([lang, issues]) => {
      console.log('');
      log(`${lang}.json (${issues.length} warnings):`, 'yellow');
      issues.forEach(issue => {
        console.log(`  ${colors.gray}•${colors.reset} ${issue.key || 'N/A'}`);
        console.log(`    ${colors.yellow}${issue.message}${colors.reset}`);
        if (issue.value) {
          console.log(`    Value: ${colors.gray}${issue.value}${colors.reset}`);
        }
      });
    });
  }
}

/**
 * Main validation function
 */
function validateTranslations() {
  printSection('🔍 i18next Translation Validator');

  console.log('');
  log(`Reference language: ${REFERENCE_LANG}`, 'blue');
  log(`Locales directory: ${LOCALES_DIR}`, 'gray');
  console.log('');

  // Get all locale files
  const files = readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  const languages = files.map(f => f.replace('.json', ''));

  if (!languages.includes(REFERENCE_LANG)) {
    log(`❌ Reference language '${REFERENCE_LANG}.json' not found!`, 'red');
    process.exit(1);
  }

  stats.totalLanguages = languages.length;

  log(`Found ${languages.length} languages: ${languages.join(', ')}`, 'green');

  // Load reference
  const reference = loadLocale(REFERENCE_LANG);
  if (!reference) {
    log(`❌ Failed to load reference language!`, 'red');
    process.exit(1);
  }

  const referenceFlat = flattenKeys(reference);
  stats.totalKeys = Object.keys(referenceFlat).length;

  log(`Reference keys: ${stats.totalKeys}`, 'blue');
  console.log('');

  // Validate each language
  languages.forEach(lang => {
    if (lang === REFERENCE_LANG) {
      log(`✓ ${lang}.json (reference)`, 'gray');
      return;
    }

    const current = loadLocale(lang);
    if (!current) {
      log(`✗ ${lang}.json (failed to load)`, 'red');
      return;
    }

    const currentFlat = flattenKeys(current);
    compareLanguages(lang, referenceFlat, currentFlat);

    const langErrors = stats.issues.filter(i => i.lang === lang && i.type === 'error').length;
    const langWarnings = stats.issues.filter(i => i.lang === lang && i.type === 'warning').length;

    if (langErrors > 0) {
      log(`✗ ${lang}.json (${langErrors} errors, ${langWarnings} warnings)`, 'red');
    } else if (langWarnings > 0) {
      log(`⚠ ${lang}.json (${langWarnings} warnings)`, 'yellow');
    } else {
      log(`✓ ${lang}.json`, 'green');
    }
  });

  // Print results
  printResults();

  console.log('');
  log('='.repeat(80), 'cyan');
  console.log('');

  // Exit with appropriate code
  if (stats.errors > 0) {
    if (EXIT_ON_ERROR) {
      log('❌ Validation failed! Exiting with error code.', 'red');
      process.exit(1);
    } else {
      log('⚠️  Validation completed with errors. Use --strict to fail CI builds.', 'yellow');
      process.exit(0);
    }
  } else if (stats.warnings > 0) {
    log('⚠️  Validation completed with warnings.', 'yellow');
    process.exit(0);
  } else {
    log('✅ All translations are valid!', 'green');
    process.exit(0);
  }
}

// Run validation
validateTranslations();
