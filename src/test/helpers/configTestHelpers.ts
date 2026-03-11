import { AppConfiguration } from "../../types/config.types";

/**
 * Factory function to create mock configuration for tests
 * Prevents duplication of mock data across test files
 */
export function createMockConfig(
  overrides: Partial<AppConfiguration> = {}
): AppConfiguration {
  const baseConfig: AppConfiguration = {
    company: {
      company_name: "Test GmbH",
      company_address: "",
      company_phone: "",
      company_email: "",
      primary_color: "#2563eb",
      theme_color: "#2563eb",
      allowed_emails: [],
      allowed_whatsapp: [],
      default_email: "",
      default_whatsapp: "",
    },
    pdf: {
      app_name: "App",
      app_short_name: "App",
      pdf_title_prefix: "PDF",
      pdf_author: "Author",
      pdf_footer_text: "Footer",
      timesheet_header: "Header",
      advance_payment_header: "Advance",
      vacation_header: "Vacation",
      signature_label: "Signature",
      qr_code_app_identifier: "QR",
      legal_notice_timesheet: "",
      legal_notice_vacation: "",
      legal_notice_advance_payment: "",
    },
    technical: {
      api_endpoint: "https://test.com",
      deployment_path: "/",
      qr_code_type_timesheet: "TIMESHEET",
      qr_code_type_advance_payment: "ADVANCE",
      qr_code_type_vacation: "VACATION",
      enable_email: true,
      enable_whatsapp: true,
      pwa_qr_code_url: "https://test.com",
    },
    work: {
      max_work_hours_per_day: 12,
      default_break_minutes: 60,
      filename_pattern: "pattern",
      auto_save_enabled: true,
      offline_mode_enabled: true,
      auto_logout_minutes: 240,
      backup_reminder_days: 7,
      enable_signature_requirement: true,
      enable_photo_upload: false,
      date_format: "DD.MM.YYYY",
      time_format: "HH:mm",
    },
    admin: { password: "test" },
    isLoaded: true,
  };

  return {
    ...baseConfig,
    ...overrides,
    company: { ...baseConfig.company, ...(overrides.company || {}) },
    pdf: { ...baseConfig.pdf, ...(overrides.pdf || {}) },
    technical: { ...baseConfig.technical, ...(overrides.technical || {}) },
    work: { ...baseConfig.work, ...(overrides.work || {}) },
    admin: { ...baseConfig.admin, ...(overrides.admin || {}) },
  };
}

/**
 * Creates a minimal mock config for tests that don't need all fields
 */
export function createMinimalMockConfig(
  companyName: string = "Test GmbH"
): AppConfiguration {
  return createMockConfig({
    company: { company_name: companyName } as any,
    isLoaded: true,
  });
}
