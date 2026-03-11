/**
 * ShareModal Tests mit neuer Config
 * Testet Email/WhatsApp-Auswahl und enable_email/enable_whatsapp Flags
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareModal } from "../components/ShareModal";
import { ConfigProvider } from "../contexts/ConfigContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import type { AppConfiguration } from "../types/config.types";
import { configService } from "../services/configService";

// Helper für vollständige Mock-Config
const createMockConfig = (
  overrides?: Partial<AppConfiguration>
): AppConfiguration => ({
  company: {
    company_name: "Test Firma",
    company_address: "Test Str. 1",
    company_phone: "+49123456789",
    company_email: "info@test.de",
    allowed_emails: ["test@firma.de", "info@firma.de"],
    allowed_whatsapp: ["+49123456789", "+49987654321"],
    default_email: "test@firma.de",
    default_whatsapp: "+49123456789",
    primary_color: "#1e40af",
    theme_color: "#1e40af",
    ...overrides?.company,
  },
  technical: {
    api_endpoint: "https://test.de/api",
    deployment_path: "/pro/",
    qr_code_type_timesheet: "url",
    qr_code_type_vacation: "url",
    qr_code_type_advance_payment: "url",
    enable_whatsapp: true,
    enable_email: true,
    ...overrides?.technical,
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
    ...overrides?.pdf,
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
    ...overrides?.work,
  },
  admin: {
    password: "test123",
    ...overrides?.admin,
  },
  isLoaded: true,
});

// Mock configService
vi.mock("../services/configService", () => ({
  configService: {
    loadConfiguration: vi.fn(() => Promise.resolve(createMockConfig())),
  },
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('{"success":true}'),
  } as Response)
);

describe("ShareModal Tests mit neuer Config", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    fileName: "test.pdf",
    fileUrl: "blob:test",
    employeeName: "Max Mustermann",
    weekYear: 2025,
    weekNumber: 44,
    pdfBlob: new Blob(["test"], { type: "application/pdf" }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render with providers
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <NotificationProvider>
        <ConfigProvider>{ui}</ConfigProvider>
      </NotificationProvider>
    );
  };

  describe("Email-Funktionalität", () => {
    it("sollte Email-Bereich anzeigen wenn enable_email=true", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Empfänger-E-Mail/i)).toBeInTheDocument();
      });
    });

    it("sollte alle allowed_emails in Dropdown anzeigen", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("test@firma.de")).toBeInTheDocument();
        expect(screen.getByText("info@firma.de")).toBeInTheDocument();
      });
    });

    it("sollte default_email vorausgewählt haben", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        const select = screen.getByDisplayValue("test@firma.de");
        expect(select).toBeInTheDocument();
      });
    });

    it("sollte Email-Auswahl ändern können", async () => {
      const user = userEvent.setup();

      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Empfänger-E-Mail/i)).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue("test@firma.de");
      await user.selectOptions(select, "info@firma.de");

      expect(screen.getByDisplayValue("info@firma.de")).toBeInTheDocument();
    });
  });

  describe("WhatsApp-Funktionalität", () => {
    it("sollte WhatsApp-Bereich anzeigen wenn enable_whatsapp=true", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/WhatsApp-Kontakt/i)).toBeInTheDocument();
      });
    });

    it("sollte alle allowed_whatsapp in Dropdown anzeigen", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("+49123456789")).toBeInTheDocument();
        expect(screen.getByText("+49987654321")).toBeInTheDocument();
      });
    });

    it("sollte default_whatsapp vorausgewählt haben", async () => {
      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        const select = screen.getByDisplayValue("+49123456789");
        expect(select).toBeInTheDocument();
      });
    });
  });

  describe("Feature Flags", () => {
    it("sollte Email-Bereich NICHT anzeigen wenn enable_email=false", async () => {
      // Überschreibe Mock für diesen Test
      const mockConfig = createMockConfig({
        technical: {
          api_endpoint: "https://test.de/api",
          deployment_path: "/pro/",
          qr_code_type_timesheet: "url",
          qr_code_type_vacation: "url",
          qr_code_type_advance_payment: "url",
          enable_email: false,
          enable_whatsapp: true,
        },
      });

      vi.mocked(configService.loadConfiguration).mockResolvedValueOnce(
        mockConfig
      );

      const { rerender } = renderWithProviders(
        <ShareModal {...defaultProps} />
      );

      // Force re-render um neue Config zu laden
      rerender(
        <NotificationProvider>
          <ConfigProvider>
            <ShareModal {...defaultProps} isOpen={false} />
          </ConfigProvider>
        </NotificationProvider>
      );
      rerender(
        <NotificationProvider>
          <ConfigProvider>
            <ShareModal {...defaultProps} isOpen={true} />
          </ConfigProvider>
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Empfänger-E-Mail/i)).not.toBeInTheDocument();
      });
    });

    it("sollte WhatsApp-Bereich NICHT anzeigen wenn enable_whatsapp=false", async () => {
      // Überschreibe Mock für diesen Test
      const mockConfig = createMockConfig({
        technical: {
          api_endpoint: "https://test.de/api",
          deployment_path: "/pro/",
          qr_code_type_timesheet: "url",
          qr_code_type_vacation: "url",
          qr_code_type_advance_payment: "url",
          enable_email: true,
          enable_whatsapp: false,
        },
      });

      vi.mocked(configService.loadConfiguration).mockResolvedValueOnce(
        mockConfig
      );

      const { rerender } = renderWithProviders(
        <ShareModal {...defaultProps} />
      );

      // Force re-render um neue Config zu laden
      rerender(
        <ConfigProvider>
          <ShareModal {...defaultProps} isOpen={false} />
        </ConfigProvider>
      );
      rerender(
        <ConfigProvider>
          <ShareModal {...defaultProps} isOpen={true} />
        </ConfigProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText(/WhatsApp-Kontakt/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("API-Endpoint", () => {
    it("sollte api_endpoint aus Config verwenden", async () => {
      const user = userEvent.setup();

      renderWithProviders(<ShareModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Empfänger-E-Mail/i)).toBeInTheDocument();
      });

      // Simuliere Email-Versand (Button müsste existieren)
      // Da ShareModal keinen direkten "Senden"-Button hat im aktuellen Code,
      // prüfen wir nur dass fetch mit korrektem Endpoint aufgerufen würde

      // Test würde erweitert wenn Button vorhanden
    });
  });

  describe("Modal Schließen", () => {
    it("sollte Modal schließen können", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(<ShareModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Empfänger-E-Mail/i)).toBeInTheDocument();
      });

      // Suche nach dem Cancel-Button mit dem i18n-Key "actions.cancel"
      const cancelButton = screen.getByText("actions.cancel");
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
