import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareModal } from "../components/ShareModal";
import ConfigContext from "../contexts/ConfigContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import type { AppConfiguration } from "../types/config.types";

type ConfigContextType = {
  config: AppConfiguration;
  isLoading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
};

const createMockConfig = (
  overrides?: Partial<AppConfiguration>,
): AppConfiguration => {
  const baseConfig: AppConfiguration = {
    company: {
      company_name: "Test Firma",
      company_address: "Test Str. 1",
      company_phone: "+49123456789",
      company_email: "info@test.de",
      company_logo: "",
      allowed_emails: ["test@firma.de", "info@firma.de"],
      allowed_whatsapp: ["+49123456789", "+49987654321"],
      default_email: "test@firma.de",
      default_whatsapp: "+49123456789",
      primary_color: "#1e40af",
      theme_color: "#1e40af",
    },
    technical: {
      customer_key: "dplp",
      api_endpoint: "/backend",
      deployment_path: "/",
      qr_code_type_timesheet: "TIMESHEET",
      qr_code_type_vacation: "VACATION_REQUEST",
      qr_code_type_advance_payment: "ADVANCE_PAYMENT",
      enable_whatsapp: true,
      enable_email: true,
      pwa_qr_code_url: "https://example.test",
      app_domain: "https://example.test",
      backend_domain: "https://example.test",
      whatsapp_base_url: "https://wa.me/",
      cors_allowed_origins: ["https://example.test"],
      feature_flags: {},
    },
    pdf: {
      app_name: "Test App",
      app_short_name: "TA",
      pdf_title_prefix: "Stundennachweis",
      pdf_author: "Test Firma",
      pdf_footer_text: "Test Footer",
      timesheet_header: "Stundennachweis",
      advance_payment_header: "Vorschussantrag",
      vacation_header: "Urlaubsantrag",
      signature_label: "Unterschrift",
      legal_notice_timesheet: "",
      legal_notice_advance_payment: "",
      legal_notice_vacation: "",
      qr_code_app_identifier: "TEST",
    },
    work: {
      max_work_hours_per_day: 10,
      default_break_minutes: 30,
      filename_pattern: "{name}_KW{week}_{year}",
      auto_save_enabled: true,
      offline_mode_enabled: true,
      auto_logout_minutes: 240,
      backup_reminder_days: 7,
      enable_signature_requirement: false,
      enable_photo_upload: false,
      date_format: "DD.MM.YYYY",
      time_format: "24h",
    },
    admin: {
      password: "test123",
    },
    email: {
      smtp_host: "smtp.example.test",
      smtp_port: 587,
      smtp_encryption: "tls",
      smtp_username: "smtp-user",
      smtp_password: "",
      from_email: "info@test.de",
      from_name: "Test Firma",
    },
    isLoaded: true,
  };

  return {
    ...baseConfig,
    ...overrides,
    company: {
      ...baseConfig.company,
      ...overrides?.company,
    },
    technical: {
      ...baseConfig.technical,
      ...overrides?.technical,
    },
    pdf: {
      ...baseConfig.pdf,
      ...overrides?.pdf,
    },
    work: {
      ...baseConfig.work,
      ...overrides?.work,
    },
    admin: {
      ...baseConfig.admin,
      ...overrides?.admin,
    },
    email: {
      ...baseConfig.email,
      ...overrides?.email,
    },
  };
};

const renderWithProviders = (
  ui: React.ReactElement,
  config: AppConfiguration = createMockConfig(),
) => {
  const mockContextValue: ConfigContextType = {
    config,
    isLoading: false,
    error: null,
    reloadConfig: vi.fn().mockResolvedValue(undefined),
  };

  return render(
    <NotificationProvider>
      <ConfigContext.Provider value={mockContextValue}>{ui}</ConfigContext.Provider>
    </NotificationProvider>,
  );
};

describe("ShareModal", () => {
  const originalFetch = global.fetch;
  const originalOpen = window.open;

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    fileName: "test.pdf",
    fileUrl: "blob:test",
    employeeName: "Max Mustermann",
    weekYear: 2025,
    weekNumber: 44,
    customerEmail: "kunde@example.com",
    pdfBlob: new Blob(["test-pdf"], { type: "application/pdf" }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              data: {
                status: "sent",
                customer_email: "kunde@example.com",
                customer_email_sent: true,
                customer_email_error: "",
              },
            }),
          ),
      } as Response),
    ) as typeof fetch;
    window.open = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.open = originalOpen;
  });

  it("zeigt erlaubte E-Mails und den Defaultwert", async () => {
    renderWithProviders(<ShareModal {...defaultProps} />);

    expect(screen.getByText(/Empfänger-E-Mail:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("test@firma.de")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "info@firma.de" }),
      ).toBeInTheDocument();
    });
  });

  it("zeigt erlaubte WhatsApp-Nummern und den Defaultwert", async () => {
    renderWithProviders(<ShareModal {...defaultProps} />);

    expect(screen.getByText(/WhatsApp-Kontakt:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("+49123456789")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "+49987654321" }),
      ).toBeInTheDocument();
    });
  });

  it("blendet den E-Mail-Bereich aus, wenn enable_email=false", async () => {
    renderWithProviders(
      <ShareModal {...defaultProps} />,
      createMockConfig({
        technical: {
          enable_email: false,
        },
      }),
    );

    expect(screen.queryByText(/Empfänger-E-Mail:/i)).not.toBeInTheDocument();
  });

  it("blendet den WhatsApp-Bereich aus, wenn enable_whatsapp=false", async () => {
    renderWithProviders(
      <ShareModal {...defaultProps} />,
      createMockConfig({
        technical: {
          enable_whatsapp: false,
        },
      }),
    );

    expect(screen.queryByText(/WhatsApp-Kontakt:/i)).not.toBeInTheDocument();
  });

  it("verwendet den konfigurierten API-Endpunkt für den Versand", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ShareModal {...defaultProps} />,
      createMockConfig({
        technical: {
          api_endpoint: "/backend",
        },
      }),
    );

    await user.click(screen.getByRole("button", { name: "Senden" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/backend/api/send-pdf",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });
  });

  it("wertet customer_email_sent aus result.data aus", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ShareModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Senden" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [, requestInit] = vi.mocked(global.fetch).mock.calls[0];
    const parsedBody = JSON.parse(String(requestInit?.body));

    expect(parsedBody.customer_email).toBe("kunde@example.com");
    expect(parsedBody.recipient_email).toBe("test@firma.de");
  });

  it("schließt das Modal über den Abbrechen-Button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ShareModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("actions.cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
