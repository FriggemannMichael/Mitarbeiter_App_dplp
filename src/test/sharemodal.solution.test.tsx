/**
 * LÖSUNG: ShareModal Tests
 *
 * Dieser Test-Suite demonstriert, wie man die ShareModal-Komponente robust testet.
 * Die Kernidee ist eine flexible `renderWithProviders`-Hilfsfunktion, die es erlaubt,
 * den `ConfigContext` für jeden Testfall gezielt zu überschreiben.
 *
 * BEHOBENE PROBLEME:
 * 1. Context Provider fehlt: `NotificationProvider` ist jetzt immer im Wrapper enthalten.
 *    Der `ConfigContext` wird direkt mit einem Wert versorgt, anstatt die komplexe
 *    `ConfigProvider`-Komponente zu verwenden, was das Testen vereinfacht.
 *
 * 2. Fehlende Daten/Optionen: Die `allowed_emails` und `allowed_whatsapp` werden
 *    über den gemockten `config`-Wert direkt in den Test injiziert.
 *
 * 3. Feature Flags werden ignoriert: Der `config`-Wert kann pro Test überschrieben
 *    werden, um Feature-Flags wie `enable_email` gezielt zu testen.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ShareModal } from "../components/ShareModal";
import ConfigContext from "../contexts/ConfigContext"; // Importiere den Context direkt
import { NotificationProvider } from "../contexts/NotificationContext";
import type { AppConfiguration } from "../types/config.types";

type ConfigContextType = {
  config: AppConfiguration;
  isLoading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
};

// ===================================================================================
// 1. MOCK-DATEN & KONFIGURATION
// ===================================================================================

/**
 * Eine vollständige, standardmäßige Mock-Konfiguration.
 * Diese dient als Basis für alle Tests.
 */
const createMockConfig = (
  overrides?: Partial<AppConfiguration>
): AppConfiguration => {
  const baseConfig: AppConfiguration = {
    company: {
      company_name: "Test Firma",
      company_address: "Test Str. 1",
      company_phone: "+49123456789",
      company_email: "info@test.de",
      // Wichtig für die Select-Felder: Diese Werte müssen hier bereitgestellt werden.
      allowed_emails: ["test@example.com", "admin@example.com"],
      allowed_whatsapp: ["+49123456789", "+49111222333"],
      default_email: "test@example.com",
      default_whatsapp: "+49123456789",
      primary_color: "#1e40af",
      theme_color: "#1e40af",
    },
    technical: {
      api_endpoint: "https://test.de/api",
      deployment_path: "/pro/",
      qr_code_type_timesheet: "url",
      qr_code_type_vacation: "url",
      qr_code_type_advance_payment: "url",
      // Feature-Flags standardmäßig aktiviert
      enable_whatsapp: true,
      enable_email: true,
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
    isLoaded: true,
  };

  // Deep-Merge für Overrides (vereinfacht)
  if (overrides) {
    if (overrides.technical) {
      baseConfig.technical = { ...baseConfig.technical, ...overrides.technical };
    }
    if (overrides.company) {
      baseConfig.company = { ...baseConfig.company, ...overrides.company };
    }
  }

  return baseConfig;
};

// ===================================================================================
// 2. VERBESSERTE `renderWithProviders`-HILFSFUNKTION
// ===================================================================================

interface CustomRenderOptions {
  config?: AppConfiguration;
}

/**
 * Eine flexible Render-Hilfsfunktion.
 * @param ui Das zu rendernde React-Element.
 * @param options Ein optionales Objekt, um den `config`-Wert für den Test zu überschreiben.
 */
const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  // Verwende die übergebene Config oder eine Standard-Mock-Config
  const mockConfig = options.config || createMockConfig();

  // Erstelle den vollständigen Context-Wert, wie ihn `useConfig` erwartet
  const mockContextValue: ConfigContextType = {
    config: mockConfig,
    isLoading: false,
    error: null,
    reloadConfig: vi.fn().mockResolvedValue(undefined),
  };

  // Wrapper-Komponente, die alle notwendigen Provider bereitstellt
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <NotificationProvider>
      <ConfigContext.Provider value={mockContextValue}>
        {children}
      </ConfigContext.Provider>
    </NotificationProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock für `fetch`
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('{"success":true}'),
  } as Response)
);

// ===================================================================================
// 3. DIE TESTS
// ===================================================================================

describe("LÖSUNG: ShareModal Tests", () => {
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

  it("Problem 1 & 2: Sollte korrekt rendern und E-Mail-Optionen anzeigen", async () => {
    // Hier wird die Standard-Config verwendet, die `allowed_emails` enthält.
    renderWithProviders(<ShareModal {...defaultProps} />);

    // A. Der Test stürzt nicht mehr ab, da `NotificationProvider` vorhanden ist.
    // B. Die E-Mail-Sektion wird angezeigt, da `enable_email` standardmäßig `true` ist.
    expect(screen.getByText(/Empfänger-E-Mail/i)).toBeInTheDocument();

    // C. Die Optionen aus der Mock-Config sind im Select-Feld vorhanden.
    //    Wir prüfen, ob der Standardwert korrekt ausgewählt ist.
    await waitFor(() => {
      const emailSelect = screen.getByDisplayValue("test@example.com");
      expect(emailSelect).toBeInTheDocument();
      // Optional: Prüfen, ob die anderen Optionen auch da sind
      expect(
        screen.getByRole("option", { name: "admin@example.com" })
      ).toBeInTheDocument();
    });
  });

  it("Problem 3: Sollte Email-Bereich NICHT anzeigen, wenn enable_email=false ist", async () => {
    // Erstelle eine spezielle Config nur für diesen Test
    const configWithEmailDisabled = createMockConfig({
      technical: {
        enable_email: false,
      },
    });

    // Übergebe die spezielle Config an die Render-Funktion
    renderWithProviders(<ShareModal {...defaultProps} />, {
      config: configWithEmailDisabled,
    });

    // Der Test schlägt nun nicht mehr fehl, weil die Konfiguration korrekt
    // angewendet wird und die Komponente den E-Mail-Bereich nicht rendert.
    await waitFor(() => {
      expect(
        screen.queryByText(/Empfänger-E-Mail/i)
      ).not.toBeInTheDocument();
    });
  });

  it("Zusatztest: Sollte WhatsApp-Bereich NICHT anzeigen, wenn enable_whatsapp=false ist", async () => {
    const configWithWhatsAppDisabled = createMockConfig({
      technical: {
        enable_whatsapp: false,
      },
    });

    renderWithProviders(<ShareModal {...defaultProps} />, {
      config: configWithWhatsAppDisabled,
    });

    await waitFor(() => {
      expect(screen.queryByText(/WhatsApp-Kontakt/i)).not.toBeInTheDocument();
    });
  });
});
