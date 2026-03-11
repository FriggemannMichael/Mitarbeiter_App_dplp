/**
 * TypeScript Interfaces fÃ¼r die Konfiguration aus PocketBase
 * Diese Types entsprechen den PocketBase Collections
 */

// ==========================================
// Company Configuration
// ==========================================

export interface CompanyConfig {
  id?: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_logo?: string; // PocketBase file URL
  primary_color: string; // Hex color
  theme_color: string; // Hex color
  allowed_emails: string[];
  allowed_whatsapp: string[];
  default_email: string;
  default_whatsapp: string;
  created?: string;
  updated?: string;
}

// ==========================================
// PDF Configuration
// ==========================================

export interface PdfConfig {
  id?: string;
  app_name: string;
  app_short_name: string;
  pdf_title_prefix: string;
  pdf_author: string;
  pdf_footer_text: string;
  timesheet_header: string;
  advance_payment_header: string;
  vacation_header: string;
  signature_label: string;
  legal_notice_timesheet?: string;
  legal_notice_advance_payment?: string;
  legal_notice_vacation?: string;
  qr_code_app_identifier: string;
  created?: string;
  updated?: string;
}

// ==========================================
// Technical Configuration
// ==========================================

export interface TechnicalConfig {
  id?: string;
  customer_key?: string;
  api_endpoint: string;
  deployment_path: string;
  qr_code_type_timesheet: string;
  qr_code_type_vacation: string;
  qr_code_type_advance_payment: string;
  enable_whatsapp: boolean;
  enable_email: boolean;
  pwa_qr_code_url: string;
  // Domain-spezifische URLs (fÃ¼r Multi-Mandanten-FÃ¤higkeit)
  app_domain?: string; // Haupt-Domain der App (z.B. "https://kundendomain.de")
  backend_domain?: string; // Backend-Domain falls abweichend (z.B. "https://api.kundendomain.de")
  whatsapp_base_url?: string; // WhatsApp Base-URL (Standard: "https://wa.me/")
  cors_allowed_origins?: string[]; // Erlaubte CORS-Origins fÃ¼r Backend
  pdf_review_cc_email?: string; // CC-Adresse beim PDF-Versand zur PrÃ¼fung (PDL-Interne Adresse)
  pdf_api_key?: string;         // Shared Secret fÃ¼r /send-pdf Spam-Schutz
  feature_flags?: Record<string, boolean>;
  created?: string;
  updated?: string;
}

// ==========================================
// Work Settings Configuration
// ==========================================

export interface WorkSettings {
  id?: string;
  max_work_hours_per_day: number;
  default_break_minutes: number;
  filename_pattern: string;
  auto_save_enabled: boolean;
  offline_mode_enabled: boolean;
  auto_logout_minutes: number;
  backup_reminder_days: number;
  enable_signature_requirement: boolean;
  enable_photo_upload: boolean;
  date_format: string;
  time_format: string;
  created?: string;
  updated?: string;
}

// ==========================================
// Admin Configuration
// ==========================================

export interface AdminConfig {
  password: string; // Admin-Passwort fÃ¼r Login
}

// ==========================================
// Email Configuration
// ==========================================

export interface EmailConfig {
  id?: string;
  // SMTP Server Einstellungen
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: 'tls' | 'ssl' | 'none';
  smtp_username: string;
  smtp_password: string; // Wird verschlÃ¼sselt in DB gespeichert

  // Absender Einstellungen
  from_email: string;
  from_name: string;

  created?: string;
  updated?: string;
}

// ==========================================
// Combined App Configuration
// ==========================================

/**
 * VollstÃ¤ndige App-Konfiguration (kombiniert alle Bereiche)
 */
export interface AppConfiguration {
  company: CompanyConfig;
  pdf: PdfConfig;
  technical: TechnicalConfig;
  work: WorkSettings;
  admin: AdminConfig;
  email: EmailConfig;
  isLoaded: boolean;
  lastUpdated?: Date;
}

// ==========================================
// Helper Types
// ==========================================

/**
 * Hilfsfunktion zum Generieren von Dateinamen
 */
export interface FilenamePlaceholders {
  employeeName: string;
  weekYear: number;
  weekNumber: number;
}

/**
 * Logo-Upload Response
 */
export interface LogoUploadResponse {
  url: string;
  filename: string;
  size: number;
}

/**
 * Config Update Result
 */
export interface ConfigUpdateResult {
  success: boolean;
  message?: string;
  error?: string;
}


