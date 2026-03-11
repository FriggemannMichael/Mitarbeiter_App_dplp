import {
  WorkTimeCalculationParams,
  WorkTimeResult,
  BreakPeriod,
  TimeRange,
} from "./types";

/**
 * Zentraler Service für alle Zeit-Berechnungen
 *
 * Features:
 * - Arbeitszeit-Berechnung mit Pausen
 * - Nachtschicht-Support (über Mitternacht)
 * - Industrial Minutes (Dezimal-Format)
 * - Validierung
 *
 * @example
 * const result = TimeCalculationService.calculateWorkTime({
 *   workTime: { from: '08:00', to: '17:00' },
 *   breaks: [{ from: '12:00', to: '12:30' }]
 * });
 * // => { hours: '08:30', decimal: '8.50', minutes: 510 }
 */
export class TimeCalculationService {
  /**
   * Hauptmethode: Berechnet Arbeitszeit
   */
  static calculateWorkTime(params: WorkTimeCalculationParams): WorkTimeResult {
    // 1. Validierung
    this.validateTimeRange(params.workTime);
    params.breaks.forEach((brk) => this.validateTimeRange(brk));

    // 2. In Minuten konvertieren
    const fromMin = this.timeToMinutes(params.workTime.from);
    let toMin = this.timeToMinutes(params.workTime.to);

    // 3. Nachtschicht-Normalisierung
    if (params.isNightShift && toMin < fromMin) {
      toMin += 24 * 60; // +24 Stunden
    }

    // 4. Pausen-Berechnung
    const breakMinutes = this.calculateBreakMinutes(params.breaks);

    // 5. Arbeitszeit = (Ende - Start) - Pausen
    const totalMinutes = Math.max(0, toMin - fromMin - breakMinutes);

    // 6. Formatierung
    return {
      hours: this.minutesToTime(totalMinutes),
      decimal: this.minutesToDecimal(totalMinutes),
      minutes: totalMinutes,
    };
  }

  /**
   * Berechnet Gesamt-Pausen-Zeit
   */
  private static calculateBreakMinutes(breaks: BreakPeriod[]): number {
    return breaks.reduce((total, brk) => {
      if (!brk.from || !brk.to) return total;

      const start = this.timeToMinutes(brk.from);
      const end = this.timeToMinutes(brk.to);

      // Validierung: Ende muss nach Start sein
      if (end <= start) {
        console.warn(`Ungültige Pause: ${brk.from} - ${brk.to}`);
        return total;
      }

      return total + (end - start);
    }, 0);
  }

  /**
   * Zeit-String zu Minuten: "08:30" => 510
   */
  static timeToMinutes(time: string): number {
    if (!time || !time.includes(":")) return 0;

    const [hours, minutes] = time.split(":").map(Number);

    // Validierung
    if (isNaN(hours) || isNaN(minutes)) return 0;
    if (hours < 0 || hours > 23) return 0;
    if (minutes < 0 || minutes > 59) return 0;

    return hours * 60 + minutes;
  }

  /**
   * Minuten zu Zeit-String: 510 => "08:30"
   */
  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Minuten zu Dezimal (Industrial Minutes)
   *
   * Standard: 8h 30min = 8.5
   * Industrial: 8h 30min = 8.50 (30 Minuten = 50 Industrial Minutes)
   *
   * Formel: (minutes / 60) * 100
   */
  static minutesToDecimal(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    // Industrial Minutes: (mins / 60) * 100
    const industrialMinutes = (mins / 60) * 100;
    const decimal = hours + industrialMinutes / 100;

    return decimal.toFixed(2);
  }

  /**
   * Dezimal zu Minuten: "8.50" => 510
   */
  static decimalToMinutes(decimal: string): number {
    const value = parseFloat(decimal);
    const hours = Math.floor(value);
    const decimalPart = value - hours;

    // Industrial Minutes zurück zu echten Minuten
    const minutes = Math.round(((decimalPart * 100) / 100) * 60);

    return hours * 60 + minutes;
  }

  /**
   * Validiert Zeit-String Format
   */
  private static validateTimeRange(range: TimeRange): void {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(range.from)) {
      throw new Error(`Ungültiges Zeit-Format: ${range.from}`);
    }

    if (!timeRegex.test(range.to)) {
      throw new Error(`Ungültiges Zeit-Format: ${range.to}`);
    }
  }

  /**
   * Berechnet Gesamt-Arbeitszeit für mehrere Tage
   */
  static calculateTotalWorkTime(results: WorkTimeResult[]): WorkTimeResult {
    const totalMinutes = results.reduce((sum, r) => sum + r.minutes, 0);

    return {
      hours: this.minutesToTime(totalMinutes),
      decimal: this.minutesToDecimal(totalMinutes),
      minutes: totalMinutes,
    };
  }
}
