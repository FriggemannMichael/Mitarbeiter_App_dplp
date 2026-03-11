#!/usr/bin/env node

/**
 * setup-customer.js - ES Module Version
 * Kundenspezifische Konfiguration generieren
 */

import fs from "fs";

// Farben für Console-Output
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg) {
  console.error(`${colors.red}❌ ${msg}${colors.reset}`);
  process.exit(1);
}

// Helper-Funktionen für Security & DRY
function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}

function escapeSingleQuote(str) {
  // Escape single quotes für Shell-Umgebungsvariablen
  return str.replace(/'/g, "'\\''");
}

function escapePhpString(str) {
  // Escape für PHP single-quoted strings
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const configPath = process.argv[2];

if (!configPath) {
  error("Fehler: Konfigurationsdatei erforderlich");
  log("Verwendung: node setup-customer.js <path-to-customer.json>");
  log("Beispiel: node setup-customer.js ./customer-examples/wpdl.json");
  process.exit(1);
}

// Header
log("╔════════════════════════════════════════════════════╗", "cyan");
log("║   SETUP-CUSTOMER: Generiere Kundenkonfiguration   ║", "cyan");
log("╚════════════════════════════════════════════════════╝", "cyan");
log("");

// Step 1: Load config
log("1️⃣  Lade Customer-Konfiguration...", "yellow");

let config;
try {
  const configData = fs.readFileSync(configPath, "utf-8");
  config = JSON.parse(configData);
  log("✅ Konfiguration geladen", "green");
} catch (err) {
  error(`Fehler beim Laden der Konfiguration: ${err.message}`);
}

// Step 2: Validate required fields
log("2️⃣  Validiere erforderliche Felder...", "yellow");

const requiredFields = [
  ["customer", "company_name"],
  ["customer", "company_email"],
  ["contact", "default_email"],
  ["email", "smtp_host"],
  ["technical", "api_endpoint"],
];

let validationFailed = false;
requiredFields.forEach(([...path]) => {
  let value = config;
  for (const part of path) {
    value = value?.[part];
  }
  if (!value) {
    log(`  ❌ Fehlendes Feld: ${path.join(".")}`, "red");
    validationFailed = true;
  }
});

if (validationFailed) {
  error("Validierung fehlgeschlagen");
}

log("✅ Alle erforderlichen Felder vorhanden", "green");
log(`   Kunde: ${config.customer.company_name}`, "cyan");
log("");

// Step 3: Create backups
log("3️⃣  Erstelle Backups...", "yellow");

const backupFiles = ["public/config.json", "backend/config.php", ".env"];

backupFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    const backupFile = `${file}.backup`;
    fs.copyFileSync(file, backupFile);
    log(`  ✅ ${backupFile} erstellt`, "green");
  }
});

log("");

// Step 4: Generate public/config.json
log("4️⃣  Generiere public/config.json...", "yellow");

const publicConfig = {
  company: {
    company_name: config.customer.company_name,
    company_address: config.customer.company_address,
    company_phone: config.customer.company_phone,
    company_email: config.customer.company_email,
    company_logo: config.logo.path,
    primary_color: config.customer.primary_color,
    theme_color: config.customer.theme_color,
    allowed_emails: ensureArray(config.contact.allowed_emails),
    allowed_whatsapp: ensureArray(config.contact.allowed_whatsapp),
    default_email: config.contact.default_email,
    default_whatsapp: config.contact.default_whatsapp,
  },
  pdf: {
    app_name: `${config.customer.company_name}-Mitarbeiter`,
    app_short_name: "Mitarbeiter Pro",
    pdf_title_prefix: "Stundennachweis",
    pdf_author: `${config.customer.company_name} App`,
    pdf_footer_text: "Erstellt mit Mitarbeiter Pro App - DSGVO-konform",
    timesheet_header: "STUNDENNACHWEIS",
    advance_payment_header: "VORSCHUSSANTRAG",
    vacation_header: "URLAUBSANTRAG",
    signature_label: "Vorgesetzter",
    legal_notice_timesheet: "",
    legal_notice_advance_payment: "",
    legal_notice_vacation: "",
    qr_code_app_identifier: "Mitarbeiter Pro",
  },
  technical: {
    api_endpoint: config.technical.api_endpoint,
    deployment_path: config.technical.deployment_path,
    qr_code_type_timesheet: "TIMESHEET",
    qr_code_type_vacation: "VACATION_REQUEST",
    qr_code_type_advance_payment: "ADVANCE_PAYMENT",
    enable_whatsapp: true,
    enable_email: true,
    pwa_qr_code_url: config.technical.pwa_qr_code_url,
    app_domain: config.technical.app_domain,
    backend_domain: config.technical.backend_domain,
    whatsapp_base_url: "https://wa.me/",
    cors_allowed_origins: ensureArray(config.technical.cors_allowed_origins),
  },
  work: {
    max_work_hours_per_day: 12,
    default_break_minutes: 60,
    filename_pattern:
      "Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}",
    auto_save_enabled: true,
    offline_mode_enabled: true,
    auto_logout_minutes: 240,
    backup_reminder_days: 7,
    enable_signature_requirement: true,
    enable_photo_upload: false,
    date_format: "DD.MM.YYYY",
    time_format: "HH:mm",
  },
};

try {
  fs.writeFileSync(
    "public/config.json",
    JSON.stringify(publicConfig, null, 2),
    "utf-8",
  );
  log("✅ public/config.json generiert", "green");
} catch (err) {
  error(`Fehler beim Schreiben von public/config.json: ${err.message}`);
}

// Step 5: Generate backend/config.php
log("5️⃣  Generiere backend/config.php...", "yellow");

const allowedEmails = ensureArray(config.contact.allowed_emails);
const allowedWhatsApp = ensureArray(config.contact.allowed_whatsapp);
const corsOrigins = ensureArray(config.technical.cors_allowed_origins);

const phpConfig = `<?php
/**
 * Kundenspezifische Konfiguration
 * AUTOMATISCH GENERIERT - Nicht manuell bearbeiten!
 * 
 * Kunde: ${config.customer.company_name}
 * Generiert: ${new Date().toISOString()}
 */

return [
    'company' => [
        'company_name' => '${escapePhpString(config.customer.company_name)}',
        'company_address' => '${escapePhpString(config.customer.company_address)}',
        'company_phone' => '${escapePhpString(config.customer.company_phone)}',
        'company_email' => '${escapePhpString(config.customer.company_email)}',
        'company_logo' => '${escapePhpString(config.logo.path)}',
        'primary_color' => '${escapePhpString(config.customer.primary_color)}',
        'theme_color' => '${escapePhpString(config.customer.theme_color)}',
        'allowed_emails' => [
            ${allowedEmails.map((e) => `'${escapePhpString(e)}'`).join(",\n            ")}
        ],
        'allowed_whatsapp' => [
            ${allowedWhatsApp.map((w) => `'${escapePhpString(w)}'`).join(",\n            ")}
        ],
        'default_email' => '${escapePhpString(config.contact.default_email)}',
        'default_whatsapp' => '${escapePhpString(config.contact.default_whatsapp)}',
    ],
    
    'technical' => [
        'api_endpoint' => '${escapePhpString(config.technical.api_endpoint)}',
        'deployment_path' => '${escapePhpString(config.technical.deployment_path)}',
        'app_domain' => '${escapePhpString(config.technical.app_domain)}',
        'backend_domain' => '${escapePhpString(config.technical.backend_domain)}',
        'pwa_qr_code_url' => '${escapePhpString(config.technical.pwa_qr_code_url)}',
        'cors_allowed_origins' => [
            ${corsOrigins.map((o) => `'${escapePhpString(o)}'`).join(",\n            ")}
        ],
    ],
    
    'email' => [
        'smtp_host' => '${escapePhpString(config.email.smtp_host)}',
        'smtp_port' => ${config.email.smtp_port},
        'smtp_encryption' => '${escapePhpString(config.email.smtp_encryption)}',
        'smtp_username' => '${escapePhpString(config.email.smtp_username)}',
        // SECURITY: SMTP-Passwort wird NICHT in config.php gespeichert!
        // Backend sollte es direkt aus .env lesen: getenv('SMTP_PASSWORD')
        'from_email' => '${escapePhpString(config.email.from_email)}',
        'from_name' => '${escapePhpString(config.email.from_name)}',
    ],
];
?>`;

try {
  fs.writeFileSync("backend/config.php", phpConfig, "utf-8");
  log("✅ backend/config.php generiert", "green");
} catch (err) {
  error(`Fehler beim Schreiben von backend/config.php: ${err.message}`);
}

// Step 6: Generate .env
log("6️⃣  Generiere .env...", "yellow");

const envContent = `# Kundenspezifische Umgebungsvariablen
# AUTOMATISCH GENERIERT - Nicht manuell bearbeiten!
# Kunde: ${config.customer.company_name}
# Generiert: ${new Date().toISOString()}

# Security Codes (erforderlich für App-Start)
VITE_COMPANY_CODE='${config.customer.company_name.toUpperCase().replace(/[^A-Z0-9]/g, "-")}-${Date.now()}'
VITE_EXPECTED_CODE='${config.customer.company_name.toUpperCase().replace(/[^A-Z0-9]/g, "-")}-${Date.now()}'
VITE_ADMIN_PASSWORD='CHANGE_ME_IN_PRODUCTION'

# Frontend Config
VITE_COMPANY_NAME='${escapeSingleQuote(config.customer.company_name)}'
VITE_COMPANY_ADDRESS='${escapeSingleQuote(config.customer.company_address)}'
VITE_COMPANY_PHONE='${escapeSingleQuote(config.customer.company_phone)}'
VITE_COMPANY_EMAIL='${escapeSingleQuote(config.customer.company_email)}'
VITE_DEFAULT_EMAIL='${escapeSingleQuote(config.contact.default_email)}'
VITE_DEFAULT_WHATSAPP='${escapeSingleQuote(config.contact.default_whatsapp)}'
VITE_ALLOWED_EMAILS='${escapeSingleQuote(allowedEmails.join(","))}'
VITE_ALLOWED_WHATSAPP='${escapeSingleQuote(allowedWhatsApp.join(","))}'
VITE_PRIMARY_COLOR='${escapeSingleQuote(config.customer.primary_color)}'
VITE_THEME_COLOR='${escapeSingleQuote(config.customer.theme_color)}'

# API Config
VITE_API_URL='${escapeSingleQuote(config.technical.api_endpoint)}'
VITE_APP_DOMAIN='${escapeSingleQuote(config.technical.app_domain)}'
VITE_BACKEND_DOMAIN='${escapeSingleQuote(config.technical.backend_domain)}'

# Backend SMTP Config
SMTP_HOST='${escapeSingleQuote(config.email.smtp_host)}'
SMTP_PORT='${config.email.smtp_port}'
SMTP_ENCRYPTION='${escapeSingleQuote(config.email.smtp_encryption)}'
SMTP_USERNAME='${escapeSingleQuote(config.email.smtp_username)}'
SMTP_PASSWORD='${escapeSingleQuote(config.email.smtp_password)}'
SMTP_FROM_EMAIL='${escapeSingleQuote(config.email.from_email)}'
SMTP_FROM_NAME='${escapeSingleQuote(config.email.from_name)}'
`;

try {
  fs.writeFileSync(".env", envContent, "utf-8");
  log("✅ .env generiert", "green");
} catch (err) {
  error(`Fehler beim Schreiben von .env: ${err.message}`);
}

// Summary
log("");
log("╔════════════════════════════════════════════════════╗", "green");
log("║              ✅ SETUP ERFOLGREICH!                 ║", "green");
log("╚════════════════════════════════════════════════════╝", "green");
log("");

log(`Kunde: ${config.customer.company_name}`, "cyan");
log(`E-Mail: ${config.customer.company_email}`, "cyan");
log("");

log("📁 Generierte Dateien:", "yellow");
log("  ✅ public/config.json", "green");
log("  ✅ backend/config.php", "green");
log("  ✅ .env", "green");
log("");

log("💾 Backups erstellt:", "yellow");
log("  ✅ public/config.json.backup", "green");
log("  ✅ backend/config.php.backup", "green");
log("  ✅ .env.backup", "green");
log("");

log("🚀 Nächste Schritte:", "yellow");
log("  1. npm run build", "cyan");
log("  2. Deploy zu Production", "cyan");
log("");

log("📋 Rollback-Befehl:", "yellow");
log("  cp public/config.json.backup public/config.json", "gray");
log("  cp backend/config.php.backup backend/config.php", "gray");
log("  cp .env.backup .env", "gray");
log("");
