import { DayData } from "../../../utils/storage";
import { TimeCalculationService } from "../../time";
import { ValidationResult, ValidationResultImpl } from "../ValidationResult";

export class BreakDurationRule {
  validate(day: DayData): ValidationResult {
    const warnings = [];

    const breaks = [
      { from: day.pause1From, to: day.pause1To },
      { from: day.pause2From, to: day.pause2To },
    ].filter((brk) => brk.from && brk.to);

    const totalBreakMinutes = breaks.reduce((sum, brk) => {
      const start = TimeCalculationService.timeToMinutes(brk.from);
      const end = TimeCalculationService.timeToMinutes(brk.to);
      return sum + (end - start);
    }, 0);

    if (totalBreakMinutes > 180) {
      warnings.push({
        field: "breaks",
        message: `Gesamte Pausenzeit von ${Math.round(
          totalBreakMinutes / 60
        )}h ist ungewöhnlich hoch`,
        code: "LONG_BREAK_WARNING",
      });
    }

    if (totalBreakMinutes > 0 && totalBreakMinutes < 15) {
      warnings.push({
        field: "breaks",
        message: "Pausenzeit unter 15 Minuten ist sehr kurz",
        code: "SHORT_BREAK_WARNING",
      });
    }

    return new ValidationResultImpl([], warnings);
  }
}
