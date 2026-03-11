/**
 * Zeit-Berechnung Types
 */

export interface TimeRange {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
}

export interface BreakPeriod extends TimeRange {
  // Erbt from/to
}

export interface WorkTimeCalculationParams {
  workTime: TimeRange;
  breaks: BreakPeriod[];
  isNightShift?: boolean;
}

export interface WorkTimeResult {
  hours: string; // "08:30"
  decimal: string; // "8.50" (Industrial Minutes)
  minutes: number; // 510
}

export type ShiftType = "day" | "late" | "night" | "continuous";
