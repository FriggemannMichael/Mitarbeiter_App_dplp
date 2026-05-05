// Type definitions für die Datenspeicherung

// Abwesenheitstypen
export type AbsenceType =
  | "sick"
  | "vacation"
  | "flextime"
  | "holiday"
  | "unpaid"
  | "absent"
  | null;

// Erweiterte Tagesstruktur für einfache Schichtmodelle
export interface DayData {
  date: string;
  from: string;
  to: string;
  pause1From: string;
  pause1To: string;
  pause2From: string;
  pause2To: string;
  hours: string;
  decimal: string;
  // Vereinfacht: nur noch Nachtschicht-Flag, keine komplexen Shifts mehr
  isNightShift?: boolean;
  nightShiftEndDate?: string; // Für Nachtschichten: Datum des Folgetags
  // Abwesenheit: Wenn gesetzt, werden Arbeitszeiten ignoriert
  absence?: AbsenceType;
  absenceNote?: string; // Optional: Notiz zur Abwesenheit (z.B. Attest-Nummer)
  orderNumber?: string;
  commission?: string;

  // Neue Felder gemäß TIMESHEET-LOGIC-SPEC.json
  customer?: string; // Kunde für diesen spezifischen Tag (überschreibt WeekData.customer)
  customerEmail?: string; // Kunden-Email für diesen spezifischen Tag
  shiftType?: "Tag" | "Früh" | "Spät" | "Nacht" | "Dauerschicht"; // Schichttyp pro Tag
  status?: "OPEN" | "EMPLOYEE_SIGNED" | "FOREMAN_SIGNED"; // Workflow-Status des Tags
  locked?: boolean; // Tagweise Sperrung
  overridden?: boolean; // Markierung ob manuell vom Standard abweicht
  employeeSignature?: string; // Unterschrift des Mitarbeiters für diesen Tag (Base64)
  foremanSignature?: string; // Unterschrift des Vorarbeiters für diesen Tag (Base64)
  foremanName?: string; // Name des Vorarbeiters der diesen Tag bestätigt hat
  note?: string; // Notiz zum Tag
  specialHours?: {
    overtime?: number; // Überstunden in Minuten
    nightShift?: number; // Nachtschichtzuschlag in Minuten
    sunday?: number; // Sonntagszuschlag in Minuten
    holiday?: number; // Feiertagszuschlag in Minuten
  };
}

// Schichtmodell-Typen
export type ShiftModel = "day" | "late" | "night" | "continuous";

export interface WeekData {
  employeeName: string;
  customer: string;
  customerEmail?: string;
  week: number;
  year: number;
  sheetId: number; // Zettel-ID für mehrere Zettel pro Woche (1, 2, 3...)
  startDate: string;
  days: DayData[];
  employeeSignature?: string;
  supervisorSignature?: string;
  supervisorName?: string; // Name des Vorgesetzten
  locked: boolean;
  shiftModel?: ShiftModel; // Neues Schichtmodell für die ganze Woche

  // Neue Felder gemäß TIMESHEET-LOGIC-SPEC.json
  /**
   * Workflow-Status des Stundenzettels
   * - OPEN: Offen, Mitarbeiter kann alles bearbeiten
   * - EMPLOYEE_SIGNED: Mitarbeiter hat unterschrieben, nur Zeitkorrekturen möglich
   * - FOREMAN_SIGNED_PARTIAL: Vorarbeiter hat einzelne Tage bestätigt
   * - FOREMAN_SIGNED_FULL: Vorarbeiter hat ganze Woche bestätigt, alles gesperrt
   */
  status?:
    | "OPEN"
    | "EMPLOYEE_SIGNED"
    | "FOREMAN_SIGNED_PARTIAL"
    | "FOREMAN_SIGNED_FULL"
    | "PENDING_REVIEW";
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
  version?: number; // Optimistic Locking
}

// LocalStorage Keys
const STORAGE_PREFIX = "wpdl_";
const LANGUAGE_KEY = "wpdl_language";
const NAME_KEY = "wpdl_employee_name";
const CONSENT_KEY = "wpdl_consent";
const PWA_GUIDE_KEY = "wpdl_pwa_guide_shown";
const PWA_MODAL_DISMISSED_KEY = "wpdl_pwa_modal_dismissed";
const PWA_MODAL_NEVER_KEY = "wpdl_pwa_modal_never";
const LAST_BACKUP_DATE_KEY = "wpdl_last_backup_date";
const BACKUP_REMINDER_DISMISSED_KEY = "wpdl_backup_reminder_dismissed";
const FIRST_USE_DATE_KEY = "wpdl_first_use_date";
const THEME_KEY = "wpdl_theme";
const BACKEND_TIMESHEET_MIGRATION_PREFIX = "wpdl_backend_timesheet_migration_v2_";

// Helper Funktionen für localStorage
export const storage = {
  // Sprache speichern/laden
  setLanguage: (language: string): void => {
    localStorage.setItem(LANGUAGE_KEY, language);
  },

  getLanguage: (): string => {
    return localStorage.getItem(LANGUAGE_KEY) || "de";
  },

  // Theme speichern/laden
  setTheme: (theme: "light" | "dark"): void => {
    localStorage.setItem(THEME_KEY, theme);
  },

  getTheme: (): "light" | "dark" => {
    const value = localStorage.getItem(THEME_KEY);
    return value === "dark" ? "dark" : "light";
  },

  // Mitarbeitername speichern/laden
  setEmployeeName: (name: string): void => {
    localStorage.setItem(NAME_KEY, name);
  },

  getEmployeeName: (): string => {
    return localStorage.getItem(NAME_KEY) || "";
  },

  clearEmployeeName: (): void => {
    localStorage.removeItem(NAME_KEY);
  },

  // Datenschutz-Zustimmung
  setConsent: (consent: boolean): void => {
    localStorage.setItem(CONSENT_KEY, consent.toString());
  },

  getConsent: (): boolean => {
    return localStorage.getItem(CONSENT_KEY) === "true";
  },

  // PWA Installationsguide
  setPWAGuideShown: (shown: boolean): void => {
    localStorage.setItem(PWA_GUIDE_KEY, shown.toString());
  },

  getPWAGuideShown: (): boolean => {
    return localStorage.getItem(PWA_GUIDE_KEY) === "true";
  },

  // PWA Modal Verwaltung
  setPWAModalDismissed: (): void => {
    const timestamp = Date.now();
    localStorage.setItem(PWA_MODAL_DISMISSED_KEY, timestamp.toString());
  },

  getPWAModalDismissed: (): number | null => {
    const timestamp = localStorage.getItem(PWA_MODAL_DISMISSED_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  },

  setPWAModalNever: (never: boolean): void => {
    localStorage.setItem(PWA_MODAL_NEVER_KEY, never.toString());
  },

  getPWAModalNever: (): boolean => {
    return localStorage.getItem(PWA_MODAL_NEVER_KEY) === "true";
  },

  shouldShowPWAModal: (): boolean => {
    // Nicht anzeigen wenn "Nie wieder" gewählt
    if (localStorage.getItem(PWA_MODAL_NEVER_KEY) === "true") {
      return false;
    }

    // Nicht anzeigen wenn App bereits installiert
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      return false;
    }

    // Prüfen ob "Später erinnern" noch aktiv ist (7 Tage)
    const dismissedTimestamp = localStorage.getItem(PWA_MODAL_DISMISSED_KEY);
    if (dismissedTimestamp) {
      const dismissedTime = parseInt(dismissedTimestamp, 10);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDaysInMs) {
        return false;
      }
    }

    return true;
  },

  // Wochendaten speichern/laden (mit SheetId)
  setWeekData: (
    year: number,
    week: number,
    data: WeekData,
    sheetId: number = 1
  ): void => {
    const key = `${STORAGE_PREFIX}week_${year}_${week}_sheet_${sheetId}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  getWeekData: (
    year: number,
    week: number,
    sheetId: number = 1
  ): WeekData | null => {
    const key = `${STORAGE_PREFIX}week_${year}_${week}_sheet_${sheetId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  removeWeekData: (
    year: number,
    week: number,
    sheetId: number = 1
  ): void => {
    const key = `${STORAGE_PREFIX}week_${year}_${week}_sheet_${sheetId}`;
    localStorage.removeItem(key);
  },

  // Alle Zettel einer Woche laden
  getAllSheetsForWeek: (year: number, week: number): WeekData[] => {
    const sheets: WeekData[] = [];
    let sheetId = 1;

    // Suche nach Zetteln bis keiner mehr gefunden wird
    while (true) {
      const data = storage.getWeekData(year, week, sheetId);
      if (!data) break;
      sheets.push(data);
      sheetId++;
    }

    return sheets;
  },

  // Nächste verfügbare SheetId für eine Woche ermitteln
  getNextSheetId: (year: number, week: number): number => {
    let sheetId = 1;
    while (storage.getWeekData(year, week, sheetId)) {
      sheetId++;
    }
    return sheetId;
  },

  // Kunde aus der letzten Woche laden
  getCustomer: (): string => {
    // Hole die aktuellste Woche, die einen Kunden hat
    const weekKeys = storage.getAllWeekKeys();
    for (const key of weekKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        const weekData: WeekData = JSON.parse(data);
        if (weekData.customer) {
          return weekData.customer;
        }
      }
    }
    return "";
  },

  // Alle Wochen-Keys auflisten
  getAllWeekKeys: (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}week_`)) {
        keys.push(key);
      }
    }
    return keys;
  },

  getAllStoredWeeks: (): WeekData[] => {
    const weeks: WeekData[] = [];

    storage.getAllWeekKeys().forEach((key) => {
      const data = localStorage.getItem(key);
      if (!data) return;

      try {
        const parsed = JSON.parse(data) as WeekData;
        if (
          parsed &&
          typeof parsed.year === "number" &&
          typeof parsed.week === "number" &&
          typeof parsed.sheetId === "number"
        ) {
          weeks.push(parsed);
        }
      } catch (error) {
        console.warn(`Failed to parse stored week for key ${key}:`, error);
      }
    });

    return weeks.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.week !== b.week) return a.week - b.week;
      return a.sheetId - b.sheetId;
    });
  },

  hasCompletedBackendTimesheetMigration: (employeeId: number): boolean => {
    if (!Number.isFinite(employeeId) || employeeId <= 0) return false;
    return (
      localStorage.getItem(
        `${BACKEND_TIMESHEET_MIGRATION_PREFIX}${employeeId}`,
      ) === "true"
    );
  },

  markBackendTimesheetMigrationComplete: (employeeId: number): void => {
    if (!Number.isFinite(employeeId) || employeeId <= 0) return;
    localStorage.setItem(
      `${BACKEND_TIMESHEET_MIGRATION_PREFIX}${employeeId}`,
      "true",
    );
  },

  getRecentDayFieldValues: (
    field: "orderNumber" | "commission",
    limit: number = 20,
    additionalWeeks: WeekData[] = [],
  ): string[] => {
    const valuesWithTimestamp: Array<{ value: string; updatedAt: number }> = [];

    const persistedWeeks = storage.getAllStoredWeeks();
    const allWeeks = [...persistedWeeks, ...additionalWeeks];

    allWeeks.forEach((weekData) => {
      const updatedAt = weekData.updatedAt
        ? new Date(weekData.updatedAt).getTime()
        : 0;

      weekData.days?.forEach((day) => {
        const rawValue = day[field];
        const value =
          typeof rawValue === "string" ? rawValue.trim() : "";

        if (!value) return;

        valuesWithTimestamp.push({ value, updatedAt });
      });
    });

    const latestByValue = new Map<string, number>();
    valuesWithTimestamp.forEach(({ value, updatedAt }) => {
      const current = latestByValue.get(value) ?? 0;
      if (updatedAt >= current) {
        latestByValue.set(value, updatedAt);
      }
    });

    return Array.from(latestByValue.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
      .slice(0, limit)
      .map(([value]) => value);
  },

  // Alle App-Daten löschen
  clearAllData: (): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    // Auch andere App-spezifische Keys
    keysToRemove.push(LANGUAGE_KEY, NAME_KEY, CONSENT_KEY);

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  // Backup: Alle Daten exportieren
  exportAllData: (): string => {
    const weeks: Record<string, unknown> = {};
    
    // Alle Wochendaten
    storage.getAllWeekKeys().forEach((key) => {
      const data = localStorage.getItem(key);
      if (data) {
        weeks[key] = JSON.parse(data);
      }
    });

    const allData = {
      language: storage.getLanguage(),
      employeeName: storage.getEmployeeName(),
      consent: storage.getConsent(),
      weeks,
    };

    return JSON.stringify(allData, null, 2);
  },

  // Restore: Daten importieren
  importAllData: (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);

      // Grundeinstellungen wiederherstellen
      if (data.language) storage.setLanguage(data.language);
      if (data.employeeName) storage.setEmployeeName(data.employeeName);
      if (typeof data.consent === "boolean") storage.setConsent(data.consent);

      // Wochendaten wiederherstellen
      if (data.weeks) {
        Object.entries(data.weeks).forEach(([key, weekData]) => {
          localStorage.setItem(key, JSON.stringify(weekData));
        });
      }

      return true;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  },

  // Prüfen ob localStorage verfügbar ist
  isAvailable: (): boolean => {
    try {
      const test = "wpdl_test";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Backup-Erinnerung Funktionen
  setLastBackupDate: (date?: string): void => {
    const backupDate = date || new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_DATE_KEY, backupDate);
  },

  getLastBackupDate: (): string | null => {
    return localStorage.getItem(LAST_BACKUP_DATE_KEY);
  },

  setBackupReminderDismissed: (dismissed: boolean): void => {
    localStorage.setItem(BACKUP_REMINDER_DISMISSED_KEY, dismissed.toString());
  },

  getBackupReminderDismissed: (): boolean => {
    return localStorage.getItem(BACKUP_REMINDER_DISMISSED_KEY) === "true";
  },

  setFirstUseDate: (): void => {
    // Nur setzen wenn noch nicht vorhanden
    if (!localStorage.getItem(FIRST_USE_DATE_KEY)) {
      localStorage.setItem(FIRST_USE_DATE_KEY, new Date().toISOString());
    }
  },

  getFirstUseDate: (): string | null => {
    return localStorage.getItem(FIRST_USE_DATE_KEY);
  },
};

// Hilfsfunktionen für Zeitberechnungen
import { TimeCalculationService } from "../core/time";

export const timeUtils = {
  // Backward-Kompatibilität (DEPRECATED)
  timeToMinutes: TimeCalculationService.timeToMinutes,
  minutesToTime: TimeCalculationService.minutesToTime,

  // Arbeitszeit berechnen (mit Nachtschicht-Support und Industrial Minutes)
  calculateWorkHours: (
    from: string,
    to: string,
    pause1From: string,
    pause1To: string,
    pause2From: string,
    pause2To: string,
    isNightShift?: boolean
  ) => {
    return TimeCalculationService.calculateWorkTime({
      workTime: { from, to },
      breaks: [
        { from: pause1From, to: pause1To },
        { from: pause2From, to: pause2To },
      ].filter((brk) => brk.from && brk.to),
      isNightShift,
    });
  },

  // Schichtmodell-Templates für automatische Zeitvorbelegung
  getShiftModelTemplate: (
    shiftModel: ShiftModel,
    dayIndex: number
  ): { from: string; to: string; isNightShift: boolean } => {
    switch (shiftModel) {
      case "day":
        // Tagschicht Mo-Fr: 08:00-17:00, Sa-So: frei
        if (dayIndex >= 0 && dayIndex <= 4) {
          // Mo-Fr
          return { from: "08:00", to: "17:00", isNightShift: false };
        }
        return { from: "", to: "", isNightShift: false };

      case "late":
        // Spätschicht Mo-Fr: 14:00-23:00, Sa-So: frei
        if (dayIndex >= 0 && dayIndex <= 4) {
          // Mo-Fr
          return { from: "14:00", to: "23:00", isNightShift: false };
        }
        return { from: "", to: "", isNightShift: false };

      case "night":
        // Nachtschicht So-Do: 22:00-06:00, Fr-Sa: frei
        if (dayIndex === 6 || (dayIndex >= 0 && dayIndex <= 3)) {
          // So-Do
          return { from: "22:00", to: "06:00", isNightShift: true };
        }
        return { from: "", to: "", isNightShift: false };

      case "continuous":
        // Vollkontinuierliche Schicht: Mo-So unterschiedliche Zeiten
        const continuousSchedule = [
          { from: "06:00", to: "14:00", isNightShift: false }, // Mo
          { from: "14:00", to: "22:00", isNightShift: false }, // Di
          { from: "22:00", to: "06:00", isNightShift: true }, // Mi-Do
          { from: "06:00", to: "14:00", isNightShift: false }, // Do
          { from: "14:00", to: "22:00", isNightShift: false }, // Fr
          { from: "", to: "", isNightShift: false }, // Sa (frei)
          { from: "", to: "", isNightShift: false }, // So (frei)
        ];
        return (
          continuousSchedule[dayIndex] || {
            from: "",
            to: "",
            isNightShift: false,
          }
        );

      default:
        return { from: "", to: "", isNightShift: false };
    }
  },

  // Gesamtstunden aller Tage berechnen
  calculateTotalHours: (days: DayData[]) => {
    const results = days
      .filter((day) => day.from && day.to)
      .map((day) =>
        TimeCalculationService.calculateWorkTime({
          workTime: { from: day.from, to: day.to },
          breaks: [
            { from: day.pause1From, to: day.pause1To },
            { from: day.pause2From, to: day.pause2To },
          ].filter((brk) => brk.from && brk.to),
          isNightShift: day.isNightShift,
        })
      );

    return TimeCalculationService.calculateTotalWorkTime(results);
  },

  // Schichtmodell für ganze Woche anwenden
  applyShiftModelToWeek: (
    days: DayData[],
    shiftModel: ShiftModel
  ): DayData[] => {
    return days.map((day, index) => {
      const template = timeUtils.getShiftModelTemplate(shiftModel, index);

      return {
        ...day,
        from: template.from,
        to: template.to,
        isNightShift: template.isNightShift,
        nightShiftEndDate: template.isNightShift
          ? weekUtils.toISODate(
              new Date(new Date(day.date).getTime() + 24 * 60 * 60 * 1000)
            )
          : undefined,
        // Arbeitszeit neu berechnen
        ...timeUtils.calculateWorkHours(
          template.from,
          template.to,
          "",
          "",
          "",
          "",
          template.isNightShift
        ),
      };
    });
  },
};

// Kalenderwochen-Berechnung (ISO-8601)
// Nutzt DIREKT das System-Datum ohne manuelle Berechnungen
export const weekUtils = {
  // Kalenderwoche aus Datum berechnen - nutzt System-Datum direkt
  // ISO 8601 Standard wird vom Device/Browser nativ implementiert
  getWeekNumber: (date: Date): number => {
    // Erstelle eine Kopie des Datums um Seiteneffekte zu vermeiden
    const targetDate = new Date(date.getTime());

    // Setze auf Donnerstag der aktuellen Woche (ISO 8601)
    // Donnerstag ist immer in der "richtigen" Woche
    const dayOfWeek = targetDate.getDay(); // 0 = Sonntag, 1 = Montag, ...
    const thursday = new Date(targetDate.getTime());
    thursday.setDate(targetDate.getDate() + (4 - (dayOfWeek || 7)));

    // Hole Jahr vom Donnerstag (wichtig für Jahreswechsel)
    const year = thursday.getFullYear();

    // Erster Tag des Jahres
    const firstDayOfYear = new Date(year, 0, 1);

    // Berechne Differenz in Tagen
    const daysDiff = Math.floor(
      (thursday.getTime() - firstDayOfYear.getTime()) / 86400000
    );

    // Kalenderwoche = Tage / 7 + 1
    return Math.floor(daysDiff / 7) + 1;
  },

  // Montag einer Kalenderwoche berechnen (DACH-Optimiert / ISO-8601)
  getMonday: (year: number, week: number): Date => {
    // 1. Der 4. Januar ist per Definition IMMER in KW 1 (ISO-Norm)
    // Wir erstellen das Datum in LOKALER Zeit (00:00:00), nicht UTC
    const simple = new Date(year, 0, 4);

    // 2. Welcher Wochentag ist der 4.1.?
    // In JS ist Sonntag = 0. Wir machen daraus 7, damit Mo(1) bis So(7) gilt.
    const dayOfWeek = simple.getDay() || 7;

    // 3. Wir gehen zurück zum Montag dieser ersten Woche
    // Datum - (Wochentag - 1)
    // Bsp: Wenn 4.1. ein Donnerstag (4) ist, gehen wir 3 Tage zurück
    simple.setDate(simple.getDate() - dayOfWeek + 1);

    // 4. Jetzt addieren wir die gewünschten Wochen dazu
    // (week - 1) * 7 Tage
    simple.setDate(simple.getDate() + (week - 1) * 7);

    // 5. WICHTIG: Uhrzeit resetten, damit keine Zeitzonen-Effekte auftreten
    simple.setHours(0, 0, 0, 0);

    return simple;
  },

  // Alle 7 Tage einer Woche als Datum-Array
  getWeekDays: (year: number, week: number): Date[] => {
    const monday = weekUtils.getMonday(year, week);
    const days: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      // Kopie erstellen, damit 'monday' nicht verändert wird
      day.setDate(monday.getDate() + i);
      days.push(day);
    }

    return days;
  },

  // Alle 7 Tage einer Nachtschicht-Woche als Datum-Array (Start: Sonntag)
  // Für Nachtschichten: Sonntag->Montag, Montag->Dienstag, ..., Freitag->Samstag
  getWeekDaysForNightShift: (year: number, week: number): Date[] => {
    const monday = weekUtils.getMonday(year, week);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() - 1); // Einen Tag zurück = Sonntag

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      days.push(day);
    }

    return days; // [Sonntag, Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag]
  },

  // Datum formatieren (DD.MM.YYYY) - internationalisiert
  formatDate: (date: Date, locale?: string): string => {
    const currentLocale = locale || "de-DE";
    return date.toLocaleDateString(currentLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  },

  toISODate: (date: Date): string => {
    const year = date.getFullYear();
    // getMonth() ist 0-basiert (Januar=0), daher +1
    // padStart(2, '0') macht aus "1" -> "01"
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  },

  // Aktuelle Kalenderwoche - holt DIREKT vom System
  getCurrentWeek: () => {
    // Nutze das aktuelle System-Datum (vom Device)
    const now = new Date();

    // Wichtig: Wir nutzen die lokale Zeit des Devices, nicht UTC
    // So wird die richtige Woche auch bei Zeitzonenwechseln angezeigt
    const currentYear = now.getFullYear();
    const currentWeek = weekUtils.getWeekNumber(now);

    return {
      year: currentYear,
      week: currentWeek,
    };
  },
};
