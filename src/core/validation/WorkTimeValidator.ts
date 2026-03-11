import { DayData, WeekData } from "../../utils/storage";
import { WorkSettings } from "../../types/config.types";
import { ValidationResult, ValidationResultImpl } from "./ValidationResult";
import { MaxHoursRule } from "./rules/MaxHoursRule";
import { TimeLogicRule } from "./rules/TimeLogicRule";
import { BreakDurationRule } from "./rules/BreakDurationRule";
import { ValidationOptions } from "./worktime.types";

/**
 * Zentraler Validator für Arbeitszeiten
 *
 * Validierungs-Regeln:
 * - Maximale Arbeitszeit pro Tag
 * - Zeit-Logik (Ende nach Start)
 * - Pausen-Logik
 * - Wochenlimit
 *
 * Features:
 * - Integration mit TimeCalculationService
 * - Typisierte Errors/Warnings
 * - Hook-ready
 *
 * @example
 * const validator = new WorkTimeValidator(config.work);
 * const result = validator.validateDay(day);
 *
 * if (!result.isValid) {
 *   console.error(result.errors);
 * }
 */
export class WorkTimeValidator {
  private maxHoursRule: MaxHoursRule;
  private timeLogicRule: TimeLogicRule;
  private breakDurationRule: BreakDurationRule;

  constructor(config: WorkSettings) {
    this.maxHoursRule = new MaxHoursRule(config);
    this.timeLogicRule = new TimeLogicRule();
    this.breakDurationRule = new BreakDurationRule();
  }

  /**
   * Validiert einen einzelnen Tag
   * @param day - DayData (kompatibel mit alten & neuen Types)
   * @param options - Validierungs-Optionen
   */
  validateDay(day: DayData, options: ValidationOptions = {}): ValidationResult {
    const { skipAbsenceDays = true, skipEmptyDays = true } = options;

    // Skip Abwesenheits-Tage (außer Feiertag)
    if (skipAbsenceDays && day.absence && day.absence !== "holiday") {
      return new ValidationResultImpl();
    }

    // Skip leere Tage
    if (skipEmptyDays && !day.from && !day.to) {
      return new ValidationResultImpl();
    }

    // Regel-Validierung
    const results = [
      this.maxHoursRule.validate(day),
      this.timeLogicRule.validate(day),
      this.breakDurationRule.validate(day),
    ];

    return results.reduce(
      (merged, result) => merged.merge(result),
      new ValidationResultImpl()
    );
  }

  /**
   * Validiert eine komplette Woche
   * @param week - WeekData
   * @param options - Validierungs-Optionen
   */
  validateWeek(
    week: WeekData,
    options: ValidationOptions = {}
  ): ValidationResult {
    // Validiere alle Tage
    const dayResults = week.days.map((day) => this.validateDay(day, options));

    const mergedResult = dayResults.reduce(
      (merged, result) => merged.merge(result),
      new ValidationResultImpl()
    );

    // Wochenlimit-Validierung
    const weekResult = this.validateWeekLimit(week);

    return mergedResult.merge(weekResult);
  }

  /**
   * Prüft Wochenlimit (z.B. max 48h)
   */
  private validateWeekLimit(week: WeekData): ValidationResult {
    const warnings = [];

    // Berechne Gesamt-Stunden (nur Arbeitstage, keine Abwesenheit außer Feiertag)
    const totalMinutes = week.days.reduce((sum, day) => {
      if (day.absence && day.absence !== "holiday") return sum;
      const decimalHours = parseFloat(day.decimal || "0");
      return sum + decimalHours * 60;
    }, 0);

    const totalHours = totalMinutes / 60;

    // Warnung bei Überschreitung
    if (totalHours > 48) {
      warnings.push({
        field: "week",
        message: `Wochenarbeitszeit ${totalHours.toFixed(
          1
        )}h überschreitet empfohlenes Maximum von 48h`,
        code: "WEEK_LIMIT_WARNING",
      });
    }

    // Warnung bei sehr geringer Arbeitszeit
    if (totalHours < 10 && totalHours > 0) {
      warnings.push({
        field: "week",
        message: `Wochenarbeitszeit ${totalHours.toFixed(1)}h ist sehr gering`,
        code: "LOW_HOURS_WARNING",
      });
    }

    return new ValidationResultImpl([], warnings);
  }

  /**
   * Quick-Check ob Tag gültig ist (nur Errors, keine Warnings)
   */
  isDayValid(day: DayData, options: ValidationOptions = {}): boolean {
    return this.validateDay(day, options).isValid;
  }

  /**
   * Quick-Check ob Woche gültig ist (nur Errors, keine Warnings)
   */
  isWeekValid(week: WeekData, options: ValidationOptions = {}): boolean {
    return this.validateWeek(week, options).isValid;
  }

  /**
   * Gibt alle Fehler-Messages für einen Tag zurück
   */
  getDayErrors(day: DayData, options: ValidationOptions = {}): string[] {
    const result = this.validateDay(day, options);
    return result.errors.map((e) => e.message);
  }

  /**
   * Gibt alle Warnungen für einen Tag zurück
   */
  getDayWarnings(day: DayData, options: ValidationOptions = {}): string[] {
    const result = this.validateDay(day, options);
    return result.warnings.map((w) => w.message);
  }
}
