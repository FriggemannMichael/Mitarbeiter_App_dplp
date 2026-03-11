import { DayData } from "../../../utils/storage";
import { WorkSettings } from "../../../types/config.types";
import {
  ValidationResult,
  ValidationResultImpl,
  ValidationError,
} from "../ValidationResult";

export class MaxHoursRule {
  constructor(private config: WorkSettings) {}

  validate(day: DayData): ValidationResult {
    const errors: ValidationError[] = [];
    const decimalHours = parseFloat(day.decimal);

    if (isNaN(decimalHours)) {
      errors.push({
        field: "decimal",
        message: "Ungültiges Zeitformat",
        code: "INVALID_DECIMAL_FORMAT",
      });
      return new ValidationResultImpl(errors);
    }

    if (decimalHours > this.config.max_work_hours_per_day) {
      errors.push({
        field: "hours",
        message: `Arbeitszeit ${day.hours} überschreitet Maximum von ${this.config.max_work_hours_per_day}h`,
        code: "MAX_HOURS_EXCEEDED",
      });
    }

    if (decimalHours > this.config.max_work_hours_per_day - 2) {
      return new ValidationResultImpl(errors, [
        {
          field: "hours",
          message: `Arbeitszeit ${day.hours} ist sehr hoch`,
          code: "HIGH_HOURS_WARNING",
        },
      ]);
    }

    return new ValidationResultImpl(errors);
  }
}
