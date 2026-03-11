/**
 * Zentrale Type-Definitionen für WeekData State Management
 * Single Source of Truth für alle Wochendaten-Typen
 * Kompatibel mit storage.ts
 */

// Abwesenheitstypen (exakt wie in storage.ts)
export type AbsenceType =
  | "sick"
  | "vacation"
  | "flextime"
  | "holiday"
  | "unpaid"
  | null;

// Mitarbeiter-Daten
export interface Employee {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

// Pausen-Daten
export interface BreakPeriod {
  from: string; // HH:mm Format
  to: string; // HH:mm Format
}

// Tages-Daten (kompatibel mit storage.ts)
export interface DayData {
  date: string; // ISO-8601 Format (YYYY-MM-DD)
  from: string; // HH:mm Format
  to: string; // HH:mm Format
  pause1From: string;
  pause1To: string;
  pause2From: string;
  pause2To: string;
  hours: string; // HH:mm Format (berechnete Arbeitszeit)
  decimal: string; // Dezimalstunden (z.B. "8.50")

  // Optional: Spezielle Einträge
  absence?: AbsenceType;
  absenceNote?: string; // Optional: Notiz zur Abwesenheit (z.B. Attest-Nummer)
  isNightShift?: boolean;
  nightShiftEndDate?: string; // ISO-8601 für Nachtschicht-Ende
  note?: string;

  // Zusatzstunden (falls aktiviert)
  specialHours?: {
    overtime?: number; // Überstunden in Minuten
    nightShift?: number; // Nachtschichtzuschlag in Minuten
    sunday?: number; // Sonntagszuschlag in Minuten
    holiday?: number; // Feiertagszuschlag in Minuten
  };

  // Neue Felder gemäß TIMESHEET-LOGIC-SPEC.json
  /**
   * Kunde für diesen spezifischen Tag (überschreibt WeekData.customer)
   * Ermöglicht Kundenwechsel innerhalb einer Woche
   */
  customer?: string;

  /**
   * Kunden-Email für diesen spezifischen Tag
   */
  customerEmail?: string;

  /**
   * Schichttyp für diesen spezifischen Tag (überschreibt WeekData.shiftModel)
   * Ermöglicht verschiedene Schichttypen innerhalb einer Woche
   */
  shiftType?: "Tag" | "Früh" | "Spät" | "Nacht" | "Dauerschicht";

  /**
   * Workflow-Status des einzelnen Tags
   * - OPEN: Offen, Mitarbeiter kann bearbeiten
   * - EMPLOYEE_SIGNED: Mitarbeiter hat diesen Tag unterschrieben
   * - FOREMAN_SIGNED: Vorarbeiter hat diesen Tag bestätigt
   */
  status?: "OPEN" | "EMPLOYEE_SIGNED" | "FOREMAN_SIGNED";

  /**
   * Tagweise Sperrung
   * Wenn true, kann dieser Tag nicht mehr bearbeitet werden
   */
  locked?: boolean;

  /**
   * Markierung ob dieser Tag manuell vom Standard abweicht
   * Wenn true, werden keine automatischen Vorlagenwerte mehr übernommen
   */
  overridden?: boolean;

  /**
   * Unterschrift des Mitarbeiters für diesen Tag (Base64)
   */
  employeeSignature?: string;

  /**
   * Unterschrift des Vorarbeiters für diesen Tag (Base64)
   */
  foremanSignature?: string;

  /**
   * Name des Vorarbeiters der diesen Tag bestätigt hat
   */
  foremanName?: string;
}

// Unterschriften
export interface Signature {
  data: string; // Base64 encoded signature image
  timestamp: string; // ISO-8601 timestamp
  name?: string;
}

// Schichtmodelle
export type ShiftModel = "day" | "late" | "night" | "continuous";

// Wochen-Daten (Single Source of Truth, kompatibel mit storage.ts)
export interface WeekData {
  // Identifikation
  week: number; // KW (1-53)
  year: number;
  startDate: string; // ISO-8601 (Montag oder Sonntag bei Nachtschicht)
  sheetId: number; // Multi-Sheet Support (Standard: 1)

  // Mitarbeiter & Kunde
  employeeName: string;
  employeeId?: string;
  customer: string;
  customerEmail?: string;

  // Tages-Einträge
  days: DayData[]; // 7 Tage (Mo-So oder So-Sa bei Nachtschicht)

  // Schichtmodell
  shiftModel?: ShiftModel;

  // Status & Unterschriften
  /**
   * @deprecated Use status instead. Will be removed in future version.
   * Kept for backward compatibility during migration.
   */
  locked: boolean;

  /**
   * Workflow-Status des Stundenzettels
   * - OPEN: Offen, Mitarbeiter kann alles bearbeiten
   * - EMPLOYEE_SIGNED: Mitarbeiter hat unterschrieben, nur Zeitkorrekturen möglich
   * - FOREMAN_SIGNED_PARTIAL: Vorarbeiter hat einzelne Tage bestätigt
   * - FOREMAN_SIGNED_FULL: Vorarbeiter hat ganze Woche bestätigt, alles gesperrt
   * - PENDING_REVIEW: Per E-Mail zur externen Prüfung gesendet, Dokument gesperrt
   */
  status?:
    | "OPEN"
    | "EMPLOYEE_SIGNED"
    | "FOREMAN_SIGNED_PARTIAL"
    | "FOREMAN_SIGNED_FULL"
    | "PENDING_REVIEW";

  employeeSignature?: string; // Base64
  supervisorSignature?: string; // Base64
  supervisorName?: string;

  /** ISO-8601 Zeitstempel wann der Stundenzettel zur externen Prüfung gesendet wurde */
  reviewSentAt?: string;
  /** E-Mail-Adresse an die der Stundenzettel zur Prüfung gesendet wurde (Audit-Trail) */
  reviewRecipientEmail?: string;

  // Metadaten
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
  version?: number; // Optimistic Locking
}

// Filter-Optionen für Wochen-Abfragen
export interface WeekDataFilter {
  year?: number;
  weekNumber?: number;
  employeeId?: string;
  customer?: string;
  locked?: boolean;
  dateRange?: {
    from: string; // ISO-8601
    to: string; // ISO-8601
  };
}

// Statistik-Daten
export interface WeekStats {
  totalHours: string; // HH:mm
  totalDecimal: string; // Dezimalstunden
  totalMinutes: number;
  workDays: number; // Anzahl Arbeitstage
  absenceDays: number; // Anzahl Abwesenheitstage
  averageHoursPerDay: string; // Durchschnitt HH:mm
}

// Context State
export interface WeekDataState {
  currentWeek: WeekData | null;
  isLoading: boolean;
  error: string | null;
  lastSaved?: string; // ISO-8601 timestamp
}

// Action Types für Reducer (optional für zukünftige Optimierung)
export type WeekDataAction =
  | { type: "LOAD_WEEK_START" }
  | { type: "LOAD_WEEK_SUCCESS"; payload: WeekData }
  | { type: "LOAD_WEEK_ERROR"; payload: string }
  | { type: "UPDATE_DAY"; payload: { date: string; data: Partial<DayData> } }
  | { type: "DELETE_DAY"; payload: string }
  | { type: "SAVE_WEEK_START" }
  | { type: "SAVE_WEEK_SUCCESS"; payload: { timestamp: string } }
  | { type: "SET_EMPLOYEE"; payload: { name: string; id?: string } }
  | { type: "SET_CUSTOMER"; payload: { name: string; email?: string } }
  | {
      type: "SET_SIGNATURE";
      payload: {
        type: "employee" | "supervisor";
        signature: string;
        name?: string;
      };
    }
  | { type: "LOCK_WEEK" }
  | { type: "UNLOCK_WEEK" }
  | { type: "CLEAR_ERROR" };
