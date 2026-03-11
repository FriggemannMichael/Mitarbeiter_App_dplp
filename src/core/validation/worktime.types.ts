/**
 * WorkTime Validation Types
 * Type definitions für WorkTime-Validierung
 */

import type { DayData, WeekData } from "../../types/weekdata.types";

// Regel-Interfaces für verschiedene Validierungs-Typen
export interface MaxHoursRule {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
}

export interface TimeLogicRule {
  // startTime muss vor endTime sein (außer Nachtschicht)
  allowNightShift: boolean;
}

export interface BreakDurationRule {
  minBreakMinutes: number; // Mindestpause
  requiredBreakAfterHours: number; // Pflichtpause nach X Stunden
}

// Validierungs-Kontext für einen Tag
export interface DayValidationContext {
  day: DayData;
  dayIndex: number;
  weekData?: WeekData;
}

// Validierungs-Kontext für eine Woche
export interface WeekValidationContext {
  week: WeekData;
  includeWarnings: boolean;
}

// Typisierte Felder für DayData (Re-Export für Clarity)
export type WorkTimeFields = Pick<
  DayData,
  | "from"
  | "to"
  | "pause1From"
  | "pause1To"
  | "pause2From"
  | "pause2To"
  | "hours"
>;

// Validierungs-Optionen
export interface ValidationOptions {
  strict?: boolean; // Strenge Validierung (Errors statt Warnings)
  skipAbsenceDays?: boolean; // Tage mit Abwesenheit überspringen
  skipEmptyDays?: boolean; // Leere Tage überspringen
}
