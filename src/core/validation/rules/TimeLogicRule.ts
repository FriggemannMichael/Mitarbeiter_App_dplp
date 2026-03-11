import { DayData } from "../../../utils/storage";
import { TimeCalculationService } from "../../time";
import { ValidationResult, ValidationResultImpl } from "../ValidationResult";

export class TimeLogicRule {
  validate(day: DayData): ValidationResult {
    const errors = [];

    if ((day.from && !day.to) || (!day.from && day.to)) {
      errors.push({
        field: "workTime",
        message: "Start- und End-Zeit müssen beide ausgefüllt sein",
        code: "INCOMPLETE_WORK_TIME",
      });
    }

    if (day.from && day.to && !day.isNightShift) {
      const fromMin = TimeCalculationService.timeToMinutes(day.from);
      const toMin = TimeCalculationService.timeToMinutes(day.to);

      if (toMin <= fromMin) {
        errors.push({
          field: "to",
          message:
            "End-Zeit muss nach Start-Zeit liegen (oder Nachtschicht aktivieren)",
          code: "INVALID_TIME_ORDER",
        });
      }
    }

    if (day.pause1From && day.pause1To) {
      const pause1From = TimeCalculationService.timeToMinutes(day.pause1From);
      const pause1To = TimeCalculationService.timeToMinutes(day.pause1To);

      if (pause1To <= pause1From) {
        errors.push({
          field: "pause1",
          message: "Pause 1: End-Zeit muss nach Start-Zeit liegen",
          code: "INVALID_BREAK1_ORDER",
        });
      }
    }

    if (day.pause2From && day.pause2To) {
      const pause2From = TimeCalculationService.timeToMinutes(day.pause2From);
      const pause2To = TimeCalculationService.timeToMinutes(day.pause2To);

      if (pause2To <= pause2From) {
        errors.push({
          field: "pause2",
          message: "Pause 2: End-Zeit muss nach Start-Zeit liegen",
          code: "INVALID_BREAK2_ORDER",
        });
      }
    }

    return new ValidationResultImpl(errors);
  }
}
