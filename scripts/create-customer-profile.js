#!/usr/bin/env node

import fs from "fs";
import path from "path";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}

function slugify(input) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveLogoSource(configPath, sourceFile, fallbackPath) {
  if (sourceFile && sourceFile.trim() !== "") {
    const fromConfigDir = path.resolve(path.dirname(configPath), sourceFile);
    if (fs.existsSync(fromConfigDir)) return fromConfigDir;
  }

  if (fallbackPath && fallbackPath.trim() !== "") {
    const relative = fallbackPath.replace(/^\/+/, "");
    const fromPublic = path.resolve("public", relative);
    if (fs.existsSync(fromPublic)) return fromPublic;
  }

  return null;
}

const configArg = process.argv[2];
const idArgRaw = process.argv[3];
const force = process.argv.includes("--force");

if (!configArg) {
  fail(
    "Usage: npm run customer:create -- <path-to-customer.json> [customer-id] [--force]",
  );
}

const configPath = path.resolve(configArg);
if (!fs.existsSync(configPath)) {
  fail(`Customer config not found: ${configPath}`);
}

const rawConfig = fs.readFileSync(configPath, "utf-8");
const config = JSON.parse(rawConfig);

const customerId = slugify(idArgRaw || config.customer?.company_name);
if (!customerId) {
  fail("Could not derive a valid customer id.");
}

const customerPublicDir = path.resolve("public", "customers", customerId);
const profileConfigPath = path.join(customerPublicDir, "config.json");
const profileLogoFileName = "logo" + path.extname(config.logo?.path || ".png");
const profileLogoPath = path.join(customerPublicDir, profileLogoFileName);
const frontendEnvPath = path.resolve(`.env.customer-${customerId}`);
const customerMetaDir = path.resolve("customers", customerId);
const backendEnvTemplatePath = path.join(customerMetaDir, "backend.env.example");

if (!force) {
  const blockedTargets = [profileConfigPath, frontendEnvPath, backendEnvTemplatePath];
  const existing = blockedTargets.filter((target) => fs.existsSync(target));
  if (existing.length > 0) {
    fail(
      `Profile already exists. Existing files:\n${existing.join("\n")}\nUse --force to overwrite.`,
    );
  }
}

fs.mkdirSync(customerPublicDir, { recursive: true });
fs.mkdirSync(customerMetaDir, { recursive: true });

let finalLogoPath = config.logo?.path || "";
const logoSource = resolveLogoSource(
  configPath,
  config.logo?.source_file || "",
  config.logo?.path || "",
);

if (logoSource) {
  fs.copyFileSync(logoSource, profileLogoPath);
  finalLogoPath = `/customers/${customerId}/${profileLogoFileName}`;
}

const publicConfig = {
  company: {
    company_name: config.customer.company_name,
    company_address: config.customer.company_address,
    company_phone: config.customer.company_phone,
    company_email: config.customer.company_email,
    company_logo: finalLogoPath,
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
    enable_whatsapp:
      typeof config.technical.enable_whatsapp === "boolean"
        ? config.technical.enable_whatsapp
        : true,
    enable_email:
      typeof config.technical.enable_email === "boolean"
        ? config.technical.enable_email
        : true,
    pwa_qr_code_url: config.technical.pwa_qr_code_url,
    app_domain: config.technical.app_domain,
    backend_domain: config.technical.backend_domain,
    whatsapp_base_url: "https://wa.me/",
    cors_allowed_origins: ensureArray(config.technical.cors_allowed_origins),
  },
  work: {
    max_work_hours_per_day: 12,
    default_break_minutes: 60,
    filename_pattern: "Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}",
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

const companyCode = `CUSTOMER-${customerId}`.toUpperCase();

const frontendEnv = [
  `# Auto-generated customer profile: ${customerId}`,
  `VITE_CONFIG_PATH=customers/${customerId}/config.json`,
  `VITE_COMPANY_CODE=${companyCode}`,
  `VITE_EXPECTED_CODE=${companyCode}`,
  `VITE_SKIP_API=${config.technical?.skip_api === true ? "true" : "false"}`,
  "",
].join("\n");

const backendEnvTemplate = [
  `# Backend env template for customer: ${customerId}`,
  `# Copy values to your server-side env file (do not commit secrets).`,
  `SMTP_HOST=${config.email.smtp_host || ""}`,
  `SMTP_PORT=${config.email.smtp_port || 587}`,
  `SMTP_ENCRYPTION=${config.email.smtp_encryption || "tls"}`,
  `SMTP_USERNAME=${config.email.smtp_username || ""}`,
  `SMTP_PASSWORD=`,
  `SMTP_FROM_EMAIL=${config.email.from_email || ""}`,
  `SMTP_FROM_NAME=${config.email.from_name || ""}`,
  "",
].join("\n");

fs.writeFileSync(profileConfigPath, JSON.stringify(publicConfig, null, 2), "utf-8");
fs.writeFileSync(frontendEnvPath, frontendEnv, "utf-8");
fs.writeFileSync(backendEnvTemplatePath, backendEnvTemplate, "utf-8");

console.log(`Created customer profile: ${customerId}`);
console.log(`- ${profileConfigPath}`);
console.log(`- ${frontendEnvPath}`);
console.log(`- ${backendEnvTemplatePath}`);
if (logoSource) {
  console.log(`- ${profileLogoPath}`);
} else {
  console.log("- Logo not copied (source missing), using logo.path from JSON.");
}
