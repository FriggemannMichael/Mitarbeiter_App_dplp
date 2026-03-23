// Sichere Konfiguration für Stundennachweis PRO
// Echte Daten sind in .env Datei - NICHT im Code!
// Nur Administratoren dürfen .env Datei bearbeiten

// Sicherheitscheck - App nur mit korrektem Firmencode nutzbar
const COMPANY_CODE = import.meta.env.VITE_COMPANY_CODE;
const EXPECTED_CODE =
  import.meta.env.VITE_EXPECTED_CODE || "TIMESHEET-PRO-2026";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

if (COMPANY_CODE !== EXPECTED_CODE) {
  throw new Error("Unauthorized: Invalid company configuration");
}

// Admin-Passwort für Konfigurationsänderungen
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

// Typen für die Konfiguration
interface AppConfig {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  allowedEmails: string[];
  allowedWhatsAppNumbers: string[];
  export: {
    defaultEmail: string;
    defaultWhatsApp: string;
    filenamePattern: string;
    pdf: {
      includeCompanyLogo: boolean;
      includeSignatures: boolean;
      watermark: boolean;
    };
  };
  app: {
    maxWorkHoursPerDay: number;
    autoSave: boolean;
    offlineMode: boolean;
    defaultBreakMinutes: number;
    version: string;
  };
  security: {
    encryptLocalData: boolean;
    autoLogoutMinutes: number;
    backupReminderDays: number;
    companyCode: string;
  };
  admin: {
    verifyPassword: (password: string) => boolean;
    updateConfig: (password: string, newConfig: Partial<AppConfig>) => boolean;
  };
}

export const appConfig: AppConfig = {
  // Unternehmensinformationen (aus Umgebungsvariablen)
  company: {
    name: import.meta.env.VITE_COMPANY_NAME || "Ihre Firma GmbH",
    address:
      import.meta.env.VITE_COMPANY_ADDRESS ||
      "Musterstraße 1, 12345 Musterstadt",
    phone: import.meta.env.VITE_COMPANY_PHONE || "+49123456789",
    email: import.meta.env.VITE_COMPANY_EMAIL || "info@ihre-firma.de",
  },

  // SICHERHEIT: Festgelegte E-Mail-Empfänger (aus Umgebungsvariablen)
  allowedEmails: import.meta.env.VITE_ALLOWED_EMAILS
    ? import.meta.env.VITE_ALLOWED_EMAILS.split(",").map((e: string) =>
        e.trim(),
      )
    : ["info@ihre-firma.de"],

  // SICHERHEIT: Festgelegte WhatsApp-Nummern (aus Umgebungsvariablen)
  allowedWhatsAppNumbers: import.meta.env.VITE_ALLOWED_WHATSAPP
    ? import.meta.env.VITE_ALLOWED_WHATSAPP.split(",").map((n: string) =>
        n.trim(),
      )
    : ["+49123456789"],

  // Export-Einstellungen
  export: {
    // Standard-Empfänger für automatische Weiterleitung
    defaultEmail: import.meta.env.VITE_DEFAULT_EMAIL || "info@ihre-firma.de",
    defaultWhatsApp: import.meta.env.VITE_DEFAULT_WHATSAPP || "+49123456789",

    // Dateiname-Format für Exports
    filenamePattern:
      import.meta.env.VITE_FILENAME_PATTERN ||
      "Stundennachweis_{employeeName}_{weekYear}_{weekNumber}",

    // PDF-Einstellungen
    pdf: {
      includeCompanyLogo: true,
      includeSignatures: true,
      watermark: false,
    },
  },

  // App-Einstellungen
  app: {
    // Maximale Arbeitszeit pro Tag (in Stunden)
    maxWorkHoursPerDay: 12,

    // Automatische Speicherung aktiviert
    autoSave: true,

    // Offline-Modus verfügbar
    offlineMode: true,

    // Standard-Pausenzeit (in Minuten)
    defaultBreakMinutes: 60,

    // App-Version (aus .env)
    version: import.meta.env.VITE_APP_VERSION || "1.0.0",
  },

  // Sicherheitseinstellungen
  security: {
    // Daten lokal verschlüsseln
    encryptLocalData: false,

    // Automatisches Logout nach Inaktivität (in Minuten)
    autoLogoutMinutes: 240, // 4 Stunden

    // Backup-Erinnerung (in Tagen)
    backupReminderDays: 7,

    // Firmencode für Authentifizierung
    companyCode: COMPANY_CODE,
  },

  // Admin-Funktionen (nur mit Passwort)
  admin: {
    // Passwort für Admin-Funktionen prüfen
    verifyPassword: (password: string): boolean => {
      return password === ADMIN_PASSWORD;
    },

    // Konfiguration zur Laufzeit ändern (nur für Admins)
    updateConfig: (
      password: string,
      newConfig: Partial<AppConfig>,
    ): boolean => {
      if (password !== ADMIN_PASSWORD) {
        console.error("Unauthorized: Invalid admin password");
        return false;
      }

      // Hier könnten Konfigurationsänderungen implementiert werden
      devLog(
        "Admin access granted - configuration update requested:",
        Object.keys(newConfig),
      );
      return true;
    },
  },
};

// Hilfsfunktionen für die Konfiguration
export const configUtils = {
  // Prüfen ob E-Mail-Adresse erlaubt ist
  isEmailAllowed: (email: string): boolean => {
    return appConfig.allowedEmails.includes(email.toLowerCase());
  },

  // Prüfen ob WhatsApp-Nummer erlaubt ist
  isWhatsAppNumberAllowed: (number: string): boolean => {
    return appConfig.allowedWhatsAppNumbers.includes(number);
  },

  // Formatierte Liste der erlaubten E-Mails für UI
  getFormattedAllowedEmails: (): string[] => {
    return appConfig.allowedEmails;
  },

  // Formatierte Liste der erlaubten WhatsApp-Nummern für UI
  getFormattedAllowedWhatsAppNumbers: (): string[] => {
    return appConfig.allowedWhatsAppNumbers.map((num: string) => {
      // Nummer für Anzeige formatieren (versteckt letzte Ziffern)
      const visiblePart = num.slice(0, -4);
      const hiddenPart = "XXXX";
      return `${visiblePart}${hiddenPart}`;
    });
  },

  // Standard-Dateiname generieren
  generateFilename: (
    employeeName: string,
    year: number,
    week: number,
  ): string => {
    const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, "_");
    return appConfig.export.filenamePattern
      .replace("{employeeName}", cleanName)
      .replace("{weekYear}", year.toString())
      .replace("{weekNumber}", week.toString().padStart(2, "0"));
  },
};
