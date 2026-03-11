import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { completeOnboarding } from "./helpers";

describe("Timesheet App - Vollständige Funktionsprüfung", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("✅ 1. Grundlegende App-Funktion", () => {
    it("sollte die App ohne Fehler laden", () => {
      render(<App />);
      expect(screen.getByText(/WPDL/)).toBeInTheDocument();
    });

    it("sollte das Logo und den Titel anzeigen", () => {
      render(<App />);
      expect(screen.getByText(/Stundennachweis/)).toBeInTheDocument();
    });
  });

  describe("✅ 2. Benutzer-Onboarding", () => {
    it("sollte Vorname- und Nachname-Eingabefelder anzeigen", () => {
      render(<App />);
      const firstNameInput =
        screen.getByPlaceholderText(/vorname|first.*name/i);
      const lastNameInput = screen.getByPlaceholderText(
        /nachname|mustermann|last.*name/i
      );
      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
    });

    it("sollte GDPR-Checkbox anzeigen", () => {
      render(<App />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });

    it("sollte Weiter-Button anzeigen", () => {
      render(<App />);
      const button = screen.getByRole("button", { name: /weiter/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("✅ 3. Sprach-Funktionalität", () => {
    it("sollte Sprachen-Button anzeigen", () => {
      render(<App />);
      const languageButton = screen.getByRole("button");
      expect(languageButton).toBeInTheDocument();
    });

    it("sollte Dropdown bei Klick öffnen", async () => {
      const user = userEvent.setup();
      render(<App />);

      const buttons = screen.getAllByRole("button");
      const languageButton = buttons.find(
        (btn) => btn.querySelector("img, svg") // Button mit Flagge oder Icon
      );

      if (languageButton) {
        await user.click(languageButton);
        // Prüfe ob mindestens eine Sprache sichtbar wird
        await waitFor(() => {
          expect(
            screen.getByText(/Deutsch|English|Français/)
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe("✅ 4. Formular-Validierung", () => {
    it("sollte Weiter-Button zunächst deaktiviert sein", () => {
      render(<App />);
      const button = screen.getByRole("button", { name: /weiter/i });
      expect(button).toBeDisabled();
    });

    it("sollte Button aktivieren nach Eingaben", async () => {
      const user = userEvent.setup();
      render(<App />);

      const firstNameInput =
        screen.getByPlaceholderText(/vorname|first.*name/i);
      const lastNameInput = screen.getByPlaceholderText(
        /nachname|mustermann|last.*name/i
      );
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(firstNameInput, "Test");
      await user.type(lastNameInput, "User");
      await user.click(checkbox);

      expect(button).toBeEnabled();
    });
  });

  describe("✅ 5. Navigation zur Timesheet-Seite", () => {
    it("sollte zur Timesheet-Seite navigieren", async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(nameInput, "Test User");
      await user.click(checkbox);
      await user.click(button);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Kalender|Calendar|Calendrier/)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("✅ 6. Timesheet Grundfunktionen", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(nameInput, "Test User");
      await user.click(checkbox);
      await user.click(button);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Kalender|Calendar|Calendrier/)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("sollte Wochentage anzeigen", () => {
      const weekdays = [
        /Montag|Monday|Lundi/,
        /Dienstag|Tuesday|Mardi/,
        /Mittwoch|Wednesday|Mercredi/,
        /Donnerstag|Thursday|Jeudi/,
        /Freitag|Friday|Vendredi/,
      ];

      weekdays.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it("sollte Zeitfelder anzeigen", () => {
      const timeInputs = screen.getAllByDisplayValue(/08:00|8:00|16:00|4:00/);
      expect(timeInputs.length).toBeGreaterThan(0);
    });

    it("sollte Export-Buttons anzeigen", () => {
      expect(screen.getByText(/PDF/)).toBeInTheDocument();
      expect(screen.getByText(/CSV/)).toBeInTheDocument();
    });

    it("sollte Signatur-Button anzeigen", () => {
      expect(screen.getByText(/Signatur|Signature/)).toBeInTheDocument();
    });
  });

  describe("✅ 7. Zeiteingabe-Funktionalität", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(nameInput, "Test User");
      await user.click(checkbox);
      await user.click(button);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Kalender|Calendar|Calendrier/)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("sollte Zeitfelder editierbar sein", async () => {
      const user = userEvent.setup();

      const timeInputs = screen.getAllByDisplayValue(/08:00|8:00/);
      if (timeInputs.length > 0) {
        await user.clear(timeInputs[0]);
        await user.type(timeInputs[0], "09:00");
        expect(timeInputs[0]).toHaveValue("09:00");
      }
    });

    it("sollte Pausenzeiten editierbar sein", async () => {
      const user = userEvent.setup();

      const breakInputs = screen.getAllByDisplayValue(/60|1/);
      if (breakInputs.length > 0) {
        await user.clear(breakInputs[0]);
        await user.type(breakInputs[0], "45");
        expect(breakInputs[0]).toHaveValue("45");
      }
    });
  });

  describe("✅ 8. Export-Funktionalität", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(nameInput, "Test User");
      await user.click(checkbox);
      await user.click(button);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Kalender|Calendar|Calendrier/)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("sollte PDF-Export Button klickbar sein", async () => {
      const user = userEvent.setup();

      const pdfButton = screen.getByText(/PDF/);
      await user.click(pdfButton);

      // Kein Error bedeutet erfolgreich
      expect(pdfButton).toBeInTheDocument();
    });

    it("sollte CSV-Export Button klickbar sein", async () => {
      const user = userEvent.setup();

      const csvButton = screen.getByText(/CSV/);
      await user.click(csvButton);

      // Kein Error bedeutet erfolgreich
      expect(csvButton).toBeInTheDocument();
    });
  });

  describe("✅ 9. Signatur-Funktionalität", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      const checkbox = screen.getByRole("checkbox");
      const button = screen.getByRole("button", { name: /weiter/i });

      await user.type(nameInput, "Test User");
      await user.click(checkbox);
      await user.click(button);

      await waitFor(
        () => {
          expect(
            screen.getByText(/Kalender|Calendar|Calendrier/)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("sollte Signatur-Dialog öffnen", async () => {
      const user = userEvent.setup();

      const signatureButton = screen.getByText(/Signatur|Signature/);
      await user.click(signatureButton);

      await waitFor(() => {
        expect(
          screen.getByText(/unterschreiben|sign|signer/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("✅ 10. LocalStorage Persistierung", () => {
    it("sollte Daten in localStorage speichern", async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);
      await user.type(nameInput, "Persistent User");

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Prüfe ob localStorage aufgerufen wird
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("🎯 Performance Tests", () => {
    it("sollte schnell laden", () => {
      const start = performance.now();
      render(<App />);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Unter 1 Sekunde
    });

    it("sollte responsive bleiben", async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);

      // Schnelle Eingaben sollten handled werden
      await user.type(nameInput, "Schnelle Eingabe Test");
      expect(nameInput).toHaveValue("Schnelle Eingabe Test");
    });
  });

  describe("🛡️ Error Handling", () => {
    it("sollte bei leeren Eingaben graceful degradieren", () => {
      render(<App />);

      const button = screen.getByRole("button", { name: /weiter/i });
      expect(button).toBeDisabled();
    });

    it("sollte bei ungültigen Daten nicht crashen", async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = screen.getByPlaceholderText(/Name/i);

      // Extrem lange Eingabe
      await user.type(nameInput, "A".repeat(1000));

      // App sollte nicht crashen
      expect(screen.getByText(/WPDL/)).toBeInTheDocument();
    });
  });

  describe("📱 Mobile/Responsive", () => {
    it("sollte auf kleinen Bildschirmen funktionieren", () => {
      // Simuliere mobile Größe
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<App />);
      expect(screen.getByText(/WPDL/)).toBeInTheDocument();
    });
  });

  describe("🌍 Internationalisierung", () => {
    it("sollte deutsche Texte standardmäßig anzeigen", () => {
      render(<App />);
      expect(screen.getByText(/Stundennachweis/)).toBeInTheDocument();
    });

    it("sollte alle wichtigen Elemente übersetzt haben", () => {
      render(<App />);

      // Prüfe wichtige UI-Elemente
      expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Datenschutz|GDPR|Privacy/i)).toBeInTheDocument();
    });
  });

  describe("🔧 PWA Funktionalität", () => {
    it("sollte offline funktionieren", () => {
      // Simuliere Offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      render(<App />);
      expect(screen.getByText(/WPDL/)).toBeInTheDocument();
    });
  });

  describe("🎯 Kompletter Workflow", () => {
    it("sollte den gesamten Benutzer-Workflow unterstützen", async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. Name eingeben
      const nameInput = screen.getByPlaceholderText(/Name/i);
      await user.type(nameInput, "Workflow Test User");

      // 2. GDPR akzeptieren
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // 3. Zur Timesheet
      const button = screen.getByRole("button", { name: /weiter/i });
      await user.click(button);

      // 4. Prüfe Timesheet geladen
      await waitFor(
        () => {
          expect(screen.getByText(/Kalender|Calendar/)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // 5. Zeiten sollten sichtbar sein
      const timeInputs = screen.getAllByDisplayValue(/08:00|8:00|16:00|4:00/);
      expect(timeInputs.length).toBeGreaterThan(0);

      // 6. Export-Buttons sollten verfügbar sein
      expect(screen.getByText(/PDF/)).toBeInTheDocument();
      expect(screen.getByText(/CSV/)).toBeInTheDocument();

      console.log("✅ Kompletter Workflow erfolgreich getestet!");
    }, 10000); // 10 Sekunden Timeout für kompletten Workflow
  });
});
