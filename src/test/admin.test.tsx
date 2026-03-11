import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminLogin } from "../pages/AdminLogin";
import { AdminDashboard } from "../pages/AdminDashboard";
import { ConfigProvider } from "../contexts/ConfigContext";
import { authService } from "../services/authService";
import { apiService } from "../services/apiService";

vi.mock("../services/authService", () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    isDesktopDevice: vi.fn(() => true),
    getCurrentUser: vi.fn(() => ({ id: 1, username: "admin", role: "customer_admin" })),
  },
}));

vi.mock("../services/configService", () => ({
  configService: {
    loadConfiguration: vi.fn(() =>
      Promise.resolve({
        company: {
          company_name: "Test Firma",
          company_email: "test@firma.de",
          company_phone: "+49123456789",
          company_address: "Teststr. 1",
          company_logo: "",
          primary_color: "#2563eb",
          theme_color: "#2563eb",
          allowed_emails: ["test@firma.de"],
          allowed_whatsapp: ["+49123456789"],
          default_email: "test@firma.de",
          default_whatsapp: "+49123456789",
        },
        pdf: {
          app_name: "Test App",
          app_short_name: "Test",
          pdf_title_prefix: "Stundennachweis",
          pdf_author: "Test App",
          pdf_footer_text: "Test Footer",
          timesheet_header: "STUNDENNACHWEIS",
          advance_payment_header: "VORSCHUSSANTRAG",
          vacation_header: "URLAUBSANTRAG",
          signature_label: "Vorgesetzter",
          qr_code_app_identifier: "Test",
        },
        technical: {
          customer_key: "default",
          api_endpoint: "https://test.de/api",
          deployment_path: "/pro/",
          qr_code_type_timesheet: "TIMESHEET",
          qr_code_type_advance_payment: "ADVANCE_PAYMENT",
          qr_code_type_vacation: "VACATION_REQUEST",
          enable_whatsapp: true,
          enable_email: true,
          pwa_qr_code_url: "https://test.de",
          app_domain: "https://test.de",
          backend_domain: "https://test.de",
          whatsapp_base_url: "https://wa.me/",
          cors_allowed_origins: ["https://test.de"],
          feature_flags: {},
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
        admin: {
          password: "test123",
        },
        email: {
          smtp_host: "smtp.office365.com",
          smtp_port: 587,
          smtp_encryption: "tls",
          smtp_username: "test@firma.de",
          smtp_password: "",
          from_email: "test@firma.de",
          from_name: "Test",
        },
        isLoaded: true,
      })
    ),
    updateCompanyConfig: vi.fn(() => Promise.resolve({ success: true })),
    updatePdfConfig: vi.fn(() => Promise.resolve({ success: true })),
    updateTechnicalConfig: vi.fn(() => Promise.resolve({ success: true })),
    updateWorkSettings: vi.fn(() => Promise.resolve({ success: true })),
    updateEmailConfig: vi.fn(() => Promise.resolve({ success: true })),
    downloadConfiguration: vi.fn(() => Promise.resolve({ success: true, message: "Exportiert" })),
    changePassword: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock("../services/apiService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/apiService")>();
  return {
    ...original,
    apiService: {
      setBaseUrl: vi.fn(),
      getBaseUrl: vi.fn(() => "http://localhost:8000/backend"),
      setCustomerKey: vi.fn(),
      getAppConfig: vi.fn(() => Promise.resolve({ success: false })),
      getAccounts: vi.fn(() => Promise.resolve({ success: true, data: [] })),
      createAccount: vi.fn(() => Promise.resolve({ success: true, data: { id: 2 } })),
      updateAccount: vi.fn(() => Promise.resolve({ success: true, data: { id: 1 } })),
    },
  };
});

describe("Admin UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("zeigt Login-Formular auf Desktop", () => {
    vi.mocked(authService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authService.isDesktopDevice).mockReturnValue(true);

    render(
      <ConfigProvider>
        <AdminLogin onLoginSuccess={vi.fn()} />
      </ConfigProvider>,
    );

    expect(screen.getByText(/Admin-Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Benutzername/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Passwort/i)).toBeInTheDocument();
  });

  it("führt erfolgreichen Login mit Username und Passwort aus", async () => {
    vi.mocked(authService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authService.isDesktopDevice).mockReturnValue(true);
    vi.mocked(authService.login).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <ConfigProvider>
        <AdminLogin onLoginSuccess={onSuccess} />
      </ConfigProvider>,
    );

    await user.type(screen.getByLabelText(/Benutzername/i), "admin");
    await user.type(screen.getByLabelText(/Passwort/i), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: /Anmelden/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith("admin", "StrongPass123!");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("zeigt Benutzer-Tab im Dashboard", async () => {
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);

    render(
      <ConfigProvider>
        <AdminDashboard />
      </ConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Benutzer/i)).toBeInTheDocument();
    });
  });

  it("lädt Accounts beim Öffnen des Benutzer-Tabs", async () => {
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <ConfigProvider>
        <AdminDashboard />
      </ConfigProvider>,
    );

    await user.click(screen.getByText(/Benutzer/i));

    await waitFor(() => {
      expect(apiService.getAccounts).toHaveBeenCalled();
    });
  });
});
