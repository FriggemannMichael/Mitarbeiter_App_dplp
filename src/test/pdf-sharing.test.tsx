import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { completeOnboarding } from "./helpers";

// Mock der Web Share API
const mockShare = vi.fn();
const mockCanShare = vi.fn();

// Mock für URL.createObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

describe("🔗 PDF Sharing - Benutzerbasierte Tests", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock Web Share API
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, "canShare", {
      value: mockCanShare,
      writable: true,
    });

    // Mock URL methods
    Object.defineProperty(URL, "createObjectURL", {
      value: mockCreateObjectURL,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: mockRevokeObjectURL,
      writable: true,
    });

    // Default mock returns
    mockCreateObjectURL.mockReturnValue("blob:mock-url-12345");
    mockCanShare.mockReturnValue(true);
    mockShare.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("✅ 1. Grundlegende Share-Funktionalität", () => {
    it("sollte Share-Button anzeigen und aktivieren nach Signatur", async () => {
      render(<App />);

      // Setup: Zum Timesheet navigieren
      await setupTimesheet(user);

      // Share-Button sollte initially deaktiviert sein
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      expect(shareButton).toBeDisabled();

      // Signatur hinzufügen
      await addEmployeeSignature(user);

      // Share-Button sollte jetzt aktiviert sein
      await waitFor(() => {
        expect(shareButton).not.toBeDisabled();
      });
    });

    it("sollte Web Share API nutzen wenn verfügbar", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button klicken
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Web Share API sollte aufgerufen werden
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: expect.stringContaining("Stundennachweis"),
          text: expect.stringContaining("Test User"),
          files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining(".pdf"),
              type: "application/pdf",
            }),
          ]),
        });
      });
    });
  });

  describe("📱 2. ShareModal Fallback-Tests", () => {
    beforeEach(() => {
      // Web Share API nicht verfügbar machen
      Object.defineProperty(navigator, "share", {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: undefined,
        writable: true,
      });
    });

    it("sollte ShareModal öffnen wenn Web Share API nicht verfügbar", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button klicken
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // ShareModal sollte erscheinen
      await waitFor(() => {
        expect(screen.getByText(/teilen|share/i)).toBeInTheDocument();
        expect(
          screen.getByText(/versandart wählen|choose sharing method/i)
        ).toBeInTheDocument();
      });
    });

    it("sollte E-Mail-Versand-Option anzeigen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button klicken
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // E-Mail-Option sollte verfügbar sein
      await waitFor(() => {
        expect(screen.getByText(/e-mail/i)).toBeInTheDocument();
        expect(screen.getByText(/info@wpdl.de/i)).toBeInTheDocument();
      });
    });

    it("sollte WhatsApp-Versand-Option anzeigen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button klicken
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // WhatsApp-Option sollte verfügbar sein
      await waitFor(() => {
        expect(screen.getByText(/whatsapp/i)).toBeInTheDocument();
      });
    });

    it("sollte nur freigegebene WPDL-Kontakte anzeigen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button klicken und E-Mail wählen
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      await waitFor(() => {
        const emailButton = screen.getByText(/e-mail/i);
        user.click(emailButton);
      });

      // Nur erlaubte E-Mails sollten verfügbar sein
      await waitFor(() => {
        expect(screen.getByText("info@wpdl.de")).toBeInTheDocument();
        expect(screen.getByText("i.edeler@wpdl.de")).toBeInTheDocument();
        expect(screen.getByText("personal@wpdl.de")).toBeInTheDocument();
      });
    });
  });

  describe("📧 3. Kunden-E-Mail Integration Tests", () => {
    it("sollte Kunden-E-Mail-Feld anzeigen", async () => {
      render(<App />);

      await setupTimesheet(user);

      // Kunden-E-Mail-Feld sollte sichtbar sein
      expect(
        screen.getByPlaceholderText(/kunde@firma.de/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/kunde erhält kopie/i)).toBeInTheDocument();
    });

    it("sollte Kunden-E-Mail speichern und anzeigen", async () => {
      render(<App />);

      await setupTimesheet(user);

      // Kunden-E-Mail eingeben
      const customerEmailField = screen.getByPlaceholderText(/kunde@firma.de/i);
      await user.type(customerEmailField, "test@kunde.de");

      expect(customerEmailField).toHaveValue("test@kunde.de");
    });

    it("sollte Hinweis auf automatische Kundenkopie im ShareModal anzeigen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Kunden-E-Mail hinzufügen
      const customerEmailField = screen.getByPlaceholderText(/kunde@firma.de/i);
      await user.type(customerEmailField, "kunde@test.de");

      // Share-Button klicken (ohne Web Share API)
      Object.defineProperty(navigator, "share", { value: undefined });
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Kunden-Kopie Hinweis sollte erscheinen
      await waitFor(() => {
        expect(
          screen.getByText(/automatische kundenkopie/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/kunde@test.de/i)).toBeInTheDocument();
      });
    });
  });

  describe("🔒 4. Sicherheits-Tests", () => {
    it("sollte keine Sharing-Optionen für nicht-WPDL Kontakte anbieten", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // ShareModal öffnen
      Object.defineProperty(navigator, "share", { value: undefined });
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Prüfen dass keine externen E-Mails verfügbar sind
      await waitFor(() => {
        expect(screen.queryByText("gmail.com")).not.toBeInTheDocument();
        expect(screen.queryByText("outlook.com")).not.toBeInTheDocument();
        expect(screen.queryByText("yahoo.com")).not.toBeInTheDocument();
      });
    });

    it("sollte Sicherheitshinweis anzeigen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // ShareModal öffnen
      Object.defineProperty(navigator, "share", { value: undefined });
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Sicherheitshinweis sollte sichtbar sein
      await waitFor(() => {
        expect(
          screen.getByText(/datenschutzgründen|data protection/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/vordefinierte empfänger|predefined recipients/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("🎯 5. User Experience Tests", () => {
    it("sollte Export-Anleitung anzeigen", async () => {
      render(<App />);

      await setupTimesheet(user);

      // Export-Anleitung sollte sichtbar sein
      expect(
        screen.getByText(/export-anleitung|export instructions/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/pdf exportieren und privat abspeichern/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/über "teilen" an wpdl weiterleiten/i)
      ).toBeInTheDocument();
    });

    it("sollte Dateiname korrekt generieren", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Mock für Blob creation
      const mockBlob = new Blob(["test"], { type: "application/pdf" });
      global.Blob = vi.fn().mockImplementation(() => mockBlob);

      // Share-Button klicken
      Object.defineProperty(navigator, "share", { value: undefined });
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Korrekte Dateiname-Pattern sollte verwendet werden
      await waitFor(() => {
        expect(
          screen.getByText(/Stundennachweis_KW.*\.pdf/i)
        ).toBeInTheDocument();
      });
    });

    it("sollte ShareModal korrekt schließen", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // ShareModal öffnen
      Object.defineProperty(navigator, "share", { value: undefined });
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText(/versandart wählen/i)).toBeInTheDocument();
      });

      // Modal schließen
      const closeButton = screen.getByRole("button", {
        name: /schließen|close/i,
      });
      await user.click(closeButton);

      // Modal sollte verschwunden sein
      await waitFor(() => {
        expect(
          screen.queryByText(/versandart wählen/i)
        ).not.toBeInTheDocument();
      });

      // URL sollte aufgeräumt werden
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url-12345");
    });
  });

  describe("📱 6. Mobile Sharing Tests", () => {
    it("sollte Touch-optimierte Sharing-Buttons haben", async () => {
      render(<App />);

      await setupTimesheetWithSignature(user);

      // Share-Button sollte ausreichend groß für Touch sein
      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      expect(shareButton).toHaveClass("btn-primary");

      // Button sollte klickbar sein
      expect(shareButton).not.toBeDisabled();
    });

    it("sollte Web Share API für mobile Geräte bevorzugen", async () => {
      // Simuliere mobile Umgebung
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        writable: true,
      });

      render(<App />);

      await setupTimesheetWithSignature(user);

      const shareButton = screen.getByRole("button", { name: /teilen|share/i });
      await user.click(shareButton);

      // Web Share API sollte verwendet werden
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });
    });
  });
});

// Helper-Funktionen
async function setupTimesheet(user: ReturnType<typeof userEvent.setup>) {
  // Onboarding abschließen
  await completeOnboarding(user, "Test", "User");

  // Kunde eingeben (erforderlich für Export)
  const customerInput = screen.getByPlaceholderText(
    /firma xyz|company name|client|kunde/i
  );
  await user.type(customerInput, "Test Kunde GmbH");
}

async function addEmployeeSignature(user: ReturnType<typeof userEvent.setup>) {
  // Mitarbeiter-Signatur hinzufügen (erster "Unterschreiben" Button)
  const signButtons = screen.getAllByRole("button", {
    name: /unterschreiben|sign/i,
  });
  const employeeSignButton = signButtons[0]; // Mitarbeiter-Signatur ist der erste Button
  await user.click(employeeSignButton);

  // Warte auf Dialog
  await waitFor(
    () => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    },
    { timeout: 2000 }
  );

  // Mock Canvas-Signatur
  const clearButtons = screen.getAllByRole("button", {
    name: /löschen|clear/i,
  });
  const canvas = clearButtons[0]?.closest("div")?.querySelector("canvas");
  if (canvas) {
    // Simuliere Signatur-Eingabe
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(canvas);
  }

  // Signatur speichern
  const saveButtons = screen.getAllByRole("button", {
    name: /speichern|save/i,
  });
  const saveButton = saveButtons[0];
  await user.click(saveButton);

  // Warte bis Dialog geschlossen ist
  await waitFor(
    () => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
    { timeout: 2000 }
  );
}

async function setupTimesheetWithSignature(
  user: ReturnType<typeof userEvent.setup>
) {
  await setupTimesheet(user);
  await addEmployeeSignature(user);
}
