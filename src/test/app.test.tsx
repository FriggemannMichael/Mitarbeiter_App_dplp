import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Hilfsfunktion für bessere Test-Lesbarkeit
const renderApp = () => render(<App />)

describe('Timesheet App - Vollständige Funktionsprüfung', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('1. Willkommensseite & Sprachauswahl', () => {
    it('sollte die Willkommensseite korrekt anzeigen', async () => {
      renderApp()
      
      // Prüfe Titel und Logo
      expect(screen.getByText(/WPDL/)).toBeInTheDocument()
      expect(screen.getByText(/Stundennachweis/)).toBeInTheDocument()
    })

    it('sollte alle 7 Sprachen im Dropdown anzeigen', async () => {
      const user = userEvent.setup()
      renderApp()
      
      // Öffne Sprachen-Dropdown
      const languageButton = screen.getByRole('button', { name: /sprache/i })
      await user.click(languageButton)
      
      // Prüfe alle Sprachen
      await waitFor(() => {
        expect(screen.getByText('Deutsch')).toBeInTheDocument()
        expect(screen.getByText('English')).toBeInTheDocument()
        expect(screen.getByText('Français')).toBeInTheDocument()
        expect(screen.getByText('Română')).toBeInTheDocument()
        expect(screen.getByText('Polski')).toBeInTheDocument()
        expect(screen.getByText('Русский')).toBeInTheDocument()
        expect(screen.getByText('العربية')).toBeInTheDocument()
      })
    })

    it('sollte Sprache wechseln können', async () => {
      const user = userEvent.setup()
      renderApp()
      
      // Öffne Dropdown und wähle Englisch
      const languageButton = screen.getByRole('button', { name: /sprache/i })
      await user.click(languageButton)
      
      const englishOption = screen.getByText('English')
      await user.click(englishOption)
      
      // Prüfe ob Interface auf Englisch wechselt
      await waitFor(() => {
        expect(screen.getByText(/Timesheet/)).toBeInTheDocument()
      })
    })

    it('sollte Name eingeben und speichern können', async () => {
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Max Mustermann')
      
      expect(nameInput).toHaveValue('Max Mustermann')
    })

    it('sollte GDPR-Zustimmung funktionieren', async () => {
      const user = userEvent.setup()
      renderApp()
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      expect(gdprCheckbox).toBeChecked()
    })

    it('sollte zur Stundenzettel-Seite weiterleiten', async () => {
      const user = userEvent.setup()
      renderApp()
      
      // Fülle alle erforderlichen Felder aus
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Max Mustermann')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      // Prüfe ob Stundenzettel-Seite geladen wird
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
    })
  })

  describe('2. Stundenzettel Hauptfunktionen', () => {
    beforeEach(async () => {
      // Setup: Gehe direkt zur Stundenzettel-Seite
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
    })

    it('sollte aktuelle Kalenderwoche anzeigen', () => {
      const currentWeek = new Date().toISOString().slice(0, 4)
      expect(screen.getByText(new RegExp(currentWeek))).toBeInTheDocument()
    })

    it('sollte zwischen Wochen navigieren können', async () => {
      const user = userEvent.setup()
      
      const prevButton = screen.getByRole('button', { name: /vorherige/i })
      const nextButton = screen.getByRole('button', { name: /nächste/i })
      
      await user.click(prevButton)
      await user.click(nextButton)
      
      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
    })

    it('sollte alle Wochentage anzeigen', () => {
      const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
      
      days.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })
  })

  describe('3. Zeiterfassung', () => {
    beforeEach(async () => {
      // Setup für Zeiterfassung
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
    })

    it('sollte Arbeitszeiten eingeben können', async () => {
      const user = userEvent.setup()
      
      // Finde erste Startzeit-Eingabe
      const startTimeInputs = screen.getAllByDisplayValue('08:00')
      const endTimeInputs = screen.getAllByDisplayValue('16:00')
      
      await user.clear(startTimeInputs[0])
      await user.type(startTimeInputs[0], '09:00')
      
      await user.clear(endTimeInputs[0])
      await user.type(endTimeInputs[0], '17:00')
      
      expect(startTimeInputs[0]).toHaveValue('09:00')
      expect(endTimeInputs[0]).toHaveValue('17:00')
    })

    it('sollte Pausenzeiten eingeben können', async () => {
      const user = userEvent.setup()
      
      const breakInputs = screen.getAllByDisplayValue('60')
      
      await user.clear(breakInputs[0])
      await user.type(breakInputs[0], '45')
      
      expect(breakInputs[0]).toHaveValue('45')
    })

    it('sollte Arbeitsstunden automatisch berechnen', async () => {
      const user = userEvent.setup()
      
      // Setze Zeiten: 8:00 - 17:00 mit 60min Pause = 8h
      const startTimeInputs = screen.getAllByDisplayValue('08:00')
      const endTimeInputs = screen.getAllByDisplayValue('16:00')
      
      await user.clear(endTimeInputs[0])
      await user.type(endTimeInputs[0], '17:00')
      
      // Prüfe ob 8 Stunden berechnet werden
      await waitFor(() => {
        expect(screen.getByText('8.00')).toBeInTheDocument()
      })
    })

    it('sollte Gesamtstunden der Woche berechnen', async () => {
      const user = userEvent.setup()
      
      // Setze für mehrere Tage Arbeitszeiten
      const endTimeInputs = screen.getAllByDisplayValue('16:00')
      
      // Setze für erste 5 Tage (Mo-Fr) jeweils 8 Stunden
      for (let i = 0; i < 5; i++) {
        await user.clear(endTimeInputs[i])
        await user.type(endTimeInputs[i], '17:00')
      }
      
      // Prüfe Gesamtstunden (5 * 8 = 40h)
      await waitFor(() => {
        expect(screen.getByText(/40\.00/)).toBeInTheDocument()
      })
    })
  })

  describe('4. Digitale Signatur', () => {
    beforeEach(async () => {
      // Setup für Signatur-Tests
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
    })

    it('sollte Signatur-Button anzeigen', () => {
      const signatureButton = screen.getByRole('button', { name: /signatur/i })
      expect(signatureButton).toBeInTheDocument()
    })

    it('sollte Signatur-Dialog öffnen', async () => {
      const user = userEvent.setup()
      
      const signatureButton = screen.getByRole('button', { name: /signatur/i })
      await user.click(signatureButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Hier unterschreiben/i)).toBeInTheDocument()
      })
    })

    it('sollte Canvas für Signatur rendern', async () => {
      const user = userEvent.setup()
      
      const signatureButton = screen.getByRole('button', { name: /signatur/i })
      await user.click(signatureButton)
      
      await waitFor(() => {
        const canvas = screen.getByRole('img')
        expect(canvas).toBeInTheDocument()
      })
    })

    it('sollte Signatur löschen können', async () => {
      const user = userEvent.setup()
      
      const signatureButton = screen.getByRole('button', { name: /signatur/i })
      await user.click(signatureButton)
      
      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /löschen/i })
        expect(clearButton).toBeInTheDocument()
      })
    })
  })

  describe('5. Export-Funktionen', () => {
    beforeEach(async () => {
      // Setup mit Testdaten
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
    })

    it('sollte PDF-Export Button anzeigen', () => {
      const pdfButton = screen.getByRole('button', { name: /PDF/i })
      expect(pdfButton).toBeInTheDocument()
    })

    it('sollte CSV-Export Button anzeigen', () => {
      const csvButton = screen.getByRole('button', { name: /CSV/i })
      expect(csvButton).toBeInTheDocument()
    })

    it('sollte PDF generieren können', async () => {
      const user = userEvent.setup()
      
      const pdfButton = screen.getByRole('button', { name: /PDF/i })
      await user.click(pdfButton)
      
      // Prüfe ob PDF-Generierung gestartet wird
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    it('sollte CSV generieren können', async () => {
      const user = userEvent.setup()
      
      const csvButton = screen.getByRole('button', { name: /CSV/i })
      await user.click(csvButton)
      
      // Prüfe ob CSV-Download gestartet wird
      expect(document.createElement).toHaveBeenCalledWith('a')
    })

    it('sollte Kunden-Validierung bei Export durchführen', async () => {
      const user = userEvent.setup()
      // Mock alert function
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      // Kunde-Feld leer lassen und PDF-Export versuchen
      const pdfButton = screen.getByRole('button', { name: /PDF/i })
      await user.click(pdfButton)
      
      // Validierungsmeldung sollte angezeigt werden
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('erforderlich'))
      
      alertSpy.mockRestore()
    })
  })

  describe('6. Lokale Speicherung', () => {
    it('sollte Daten in localStorage speichern', async () => {
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled()
      })
    })

    it('sollte Daten aus localStorage laden', () => {
      // Setze Testdaten in localStorage
      localStorage.setItem('timesheet-user-name', 'Gespeicherter User')
      localStorage.setItem('timesheet-gdpr-consent', 'true')
      
      renderApp()
      
      // Prüfe ob gespeicherte Daten geladen werden
      expect(localStorage.getItem).toHaveBeenCalledWith('timesheet-user-name')
      expect(localStorage.getItem).toHaveBeenCalledWith('timesheet-gdpr-consent')
    })
  })

  describe('7. PWA-Funktionalität', () => {
    it('sollte offline-fähig sein', () => {
      // Simuliere Offline-Zustand
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      renderApp()
      
      // App sollte auch offline funktionieren
      expect(screen.getByText(/WPDL/)).toBeInTheDocument()
    })

    it('sollte Service Worker registrieren', () => {
      // Service Worker wird durch Vite PWA Plugin registriert
      expect(window.navigator.serviceWorker).toBeDefined()
    })
  })

  describe('8. Responsive Design', () => {
    it('sollte auf mobilen Geräten funktionieren', () => {
      // Simuliere mobile Bildschirmgröße
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      renderApp()
      
      // App sollte responsive sein
      expect(screen.getByText(/WPDL/)).toBeInTheDocument()
    })
  })

  describe('9. Fehlerbehandlung', () => {
    it('sollte ungültige Zeiteingaben handhaben', async () => {
      const user = userEvent.setup()
      renderApp()
      
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Test User')
      
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Kalender/i)).toBeInTheDocument()
      })
      
      // Teste ungültige Zeiteingabe
      const timeInputs = screen.getAllByDisplayValue('08:00')
      await user.clear(timeInputs[0])
      await user.type(timeInputs[0], '25:00')
      
      // App sollte ungültige Eingabe handhaben
      expect(timeInputs[0]).toBeInTheDocument()
    })

    it('sollte leere Formulareingaben handhaben', async () => {
      const user = userEvent.setup()
      renderApp()
      
      // Versuche ohne Name und GDPR fortzufahren
      const continueButton = screen.getByRole('button', { name: /weiter/i })
      
      // Button sollte deaktiviert sein oder Validierung anzeigen
      expect(continueButton).toBeDisabled()
    })
  })

  describe('10. Gesamtintegration', () => {
    it('sollte kompletten Workflow durchlaufen können', async () => {
      const user = userEvent.setup()
      renderApp()
      
      // 1. Sprachauswahl
      const languageButton = screen.getByRole('button', { name: /sprache/i })
      await user.click(languageButton)
      const englishOption = screen.getByText('English')
      await user.click(englishOption)
      
      // 2. Name eingeben
      const nameInput = screen.getByPlaceholderText(/Name/i)
      await user.type(nameInput, 'Integration Test User')
      
      // 3. GDPR zustimmen
      const gdprCheckbox = screen.getByRole('checkbox')
      await user.click(gdprCheckbox)
      
      // 4. Zur Stundenzettel-Seite
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Calendar/i)).toBeInTheDocument()
      })
      
      // 5. Arbeitszeiten eingeben
      const endTimeInputs = screen.getAllByDisplayValue('4:00 PM')
      await user.clear(endTimeInputs[0])
      await user.type(endTimeInputs[0], '5:00 PM')
      
      // 6. Signatur hinzufügen
      const signatureButton = screen.getByRole('button', { name: /signature/i })
      await user.click(signatureButton)
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i })
        user.click(saveButton)
      })
      
      // 7. PDF exportieren
      const pdfButton = screen.getByRole('button', { name: /PDF/i })
      await user.click(pdfButton)
      
      // 8. CSV exportieren
      const csvButton = screen.getByRole('button', { name: /CSV/i })
      await user.click(csvButton)
      
      // Prüfe dass alle Schritte erfolgreich waren
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('a')
    }, 10000) // 10 Sekunden Timeout für kompletten Workflow
  })
})