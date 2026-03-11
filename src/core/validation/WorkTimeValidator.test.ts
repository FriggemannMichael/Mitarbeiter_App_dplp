import { WorkTimeValidator } from "./WorkTimeValidator";
import { DayData, WeekData } from "../../utils/storage";
import { WorkSettings } from "../../types/config.types";

const defaultSettings: WorkSettings = {
  max_work_hours_per_day: 12,
  default_break_minutes: 60,
  filename_pattern: "",
  auto_save_enabled: true,
  offline_mode_enabled: true,
  auto_logout_minutes: 240,
  backup_reminder_days: 7,
  enable_signature_requirement: true,
  enable_photo_upload: false,
  date_format: "DD.MM.YYYY",
  time_format: "HH:mm",
};

describe("WorkTimeValidator", () => {
  let validator: WorkTimeValidator;

  beforeEach(() => {
    validator = new WorkTimeValidator(defaultSettings);
  });

  describe("validateDay", () => {
    it("akzeptiert gültigen Tag", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "08:00",
        to: "17:00",
        pause1From: "12:00",
        pause1To: "12:30",
        pause2From: "",
        pause2To: "",
        hours: "08:30",
        decimal: "8.50",
      };

      const result = validator.validateDay(day);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("lehnt zu lange Arbeitszeit ab", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "08:00",
        to: "23:00",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "15:00",
        decimal: "15.00",
      };

      const result = validator.validateDay(day);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: "MAX_HOURS_EXCEEDED",
        })
      );
    });

    it("lehnt End-Zeit vor Start-Zeit ab", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "17:00",
        to: "08:00",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        isNightShift: false,
      };

      const result = validator.validateDay(day);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: "INVALID_TIME_ORDER",
        })
      );
    });

    it("akzeptiert Nachtschicht", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "22:00",
        to: "06:00",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "08:00",
        decimal: "8.00",
        isNightShift: true,
      };

      const result = validator.validateDay(day);
      expect(result.isValid).toBe(true);
    });

    it("warnt bei langen Pausen", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "08:00",
        to: "20:00",
        pause1From: "12:00",
        pause1To: "14:00",
        pause2From: "16:00",
        pause2To: "18:00",
        hours: "08:00",
        decimal: "8.00",
      };

      const result = validator.validateDay(day);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: "LONG_BREAK_WARNING",
        })
      );
    });

    it("ignoriert Abwesenheitstage", () => {
      const day: DayData = {
        date: "2025-01-15",
        from: "",
        to: "",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        absence: "sick",
      };

      const result = validator.validateDay(day);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateWeek", () => {
    it("warnt bei Überschreitung 48h-Woche", () => {
      const weekData: WeekData = {
        employeeName: "Test",
        customer: "Test",
        week: 1,
        year: 2025,
        sheetId: 1,
        startDate: "2025-01-06",
        locked: false,
        days: Array(5)
          .fill(null)
          .map((_, i) => ({
            date: `2025-01-${6 + i}`,
            from: "08:00",
            to: "20:00",
            pause1From: "12:00",
            pause1To: "12:30",
            pause2From: "",
            pause2To: "",
            hours: "11:30",
            decimal: "11.50",
          })),
      };

      const result = validator.validateWeek(weekData);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: "WEEK_LIMIT_WARNING",
        })
      );
    });
  });
});
