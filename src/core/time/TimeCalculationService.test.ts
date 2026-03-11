import { TimeCalculationService } from "./TimeCalculationService";

describe("TimeCalculationService", () => {
  describe("calculateWorkTime", () => {
    it("berechnet Standard-Arbeitszeit ohne Pausen", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "08:00", to: "17:00" },
        breaks: [],
      });

      expect(result).toEqual({
        hours: "09:00",
        decimal: "9.00",
        minutes: 540,
      });
    });

    it("berechnet Arbeitszeit mit einer Pause", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "08:00", to: "17:00" },
        breaks: [{ from: "12:00", to: "12:30" }],
      });

      expect(result).toEqual({
        hours: "08:30",
        decimal: "8.50",
        minutes: 510,
      });
    });

    it("berechnet Arbeitszeit mit zwei Pausen", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "08:00", to: "17:00" },
        breaks: [
          { from: "10:00", to: "10:15" },
          { from: "12:00", to: "12:45" },
        ],
      });

      expect(result).toEqual({
        hours: "08:00",
        decimal: "8.00",
        minutes: 480,
      });
    });

    it("behandelt Nachtschichten korrekt (über Mitternacht)", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "22:00", to: "06:00" },
        breaks: [],
        isNightShift: true,
      });

      expect(result).toEqual({
        hours: "08:00",
        decimal: "8.00",
        minutes: 480,
      });
    });

    it("behandelt Nachtschichten mit Pause", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "22:00", to: "06:00" },
        breaks: [{ from: "02:00", to: "02:30" }],
        isNightShift: true,
      });

      expect(result).toEqual({
        hours: "07:30",
        decimal: "7.50",
        minutes: 450,
      });
    });

    it("gibt 0 zurück bei negativer Arbeitszeit", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "17:00", to: "08:00" },
        breaks: [],
        isNightShift: false,
      });

      expect(result.minutes).toBe(0);
    });

    it("ignoriert ungültige Pausen (Ende vor Start)", () => {
      const result = TimeCalculationService.calculateWorkTime({
        workTime: { from: "08:00", to: "17:00" },
        breaks: [{ from: "12:30", to: "12:00" }],
      });

      expect(result.minutes).toBe(540);
    });
  });

  describe("Industrial Minutes", () => {
    it("konvertiert 15 Minuten korrekt", () => {
      const decimal = TimeCalculationService.minutesToDecimal(15);
      expect(decimal).toBe("0.25");
    });

    it("konvertiert 30 Minuten korrekt", () => {
      const decimal = TimeCalculationService.minutesToDecimal(30);
      expect(decimal).toBe("0.50");
    });

    it("konvertiert 45 Minuten korrekt", () => {
      const decimal = TimeCalculationService.minutesToDecimal(45);
      expect(decimal).toBe("0.75");
    });

    it("konvertiert 8h 15min korrekt", () => {
      const decimal = TimeCalculationService.minutesToDecimal(495);
      expect(decimal).toBe("8.25");
    });
  });

  describe("timeToMinutes", () => {
    it("konvertiert Mitternacht", () => {
      expect(TimeCalculationService.timeToMinutes("00:00")).toBe(0);
    });

    it("konvertiert Mittag", () => {
      expect(TimeCalculationService.timeToMinutes("12:00")).toBe(720);
    });

    it("konvertiert 23:59", () => {
      expect(TimeCalculationService.timeToMinutes("23:59")).toBe(1439);
    });

    it("gibt 0 zurück bei ungültigem Format", () => {
      expect(TimeCalculationService.timeToMinutes("invalid")).toBe(0);
    });
  });

  describe("calculateTotalWorkTime", () => {
    it("summiert mehrere Arbeitstage", () => {
      const days = [
        { hours: "08:00", decimal: "8.00", minutes: 480 },
        { hours: "08:30", decimal: "8.50", minutes: 510 },
        { hours: "07:45", decimal: "7.75", minutes: 465 },
      ];

      const total = TimeCalculationService.calculateTotalWorkTime(days);

      expect(total).toEqual({
        hours: "24:15",
        decimal: "24.25",
        minutes: 1455,
      });
    });
  });
});
