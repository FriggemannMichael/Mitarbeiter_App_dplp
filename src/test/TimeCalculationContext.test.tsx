/**
 * Tests für TimeCalculationContext
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  TimeCalculationProvider,
  useTimeCalculation,
} from "../contexts/TimeCalculationContext";
import type { WeekData, DayData } from "../types/weekdata.types";

// Helper: Provider Wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TimeCalculationProvider>{children}</TimeCalculationProvider>
);

describe("TimeCalculationContext", () => {
  describe("calculateDayWorkTime", () => {
    it("berechnet normale Arbeitszeit korrekt", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const day: DayData = {
        date: "2024-01-15",
        from: "08:00",
        to: "17:00",
        pause1From: "12:00",
        pause1To: "12:30",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        status: "OPEN",
        locked: false,
        overridden: false,
      };

      const calculated = result.current.calculateDayWorkTime(day);

      expect(calculated.hours).toBe("08:30");
      expect(calculated.decimal).toBe("8.50");
    });

    it("gibt 0:00 zurück wenn Abwesenheit (sick)", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const day: DayData = {
        date: "2024-01-15",
        from: "08:00",
        to: "17:00",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        absence: "sick",
        status: "OPEN",
        locked: false,
        overridden: false,
      };

      const calculated = result.current.calculateDayWorkTime(day);

      expect(calculated.hours).toBe("00:00");
      expect(calculated.decimal).toBe("0.00");
    });

    it("gibt 0:00 zurück wenn from/to fehlen", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const day: DayData = {
        date: "2024-01-15",
        from: "",
        to: "",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        status: "OPEN",
        locked: false,
        overridden: false,
      };

      const calculated = result.current.calculateDayWorkTime(day);

      expect(calculated.hours).toBe("00:00");
      expect(calculated.decimal).toBe("0.00");
    });

    it("berechnet Nachtschicht korrekt", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const day: DayData = {
        date: "2024-01-15",
        from: "22:00",
        to: "06:00",
        pause1From: "01:00",
        pause1To: "01:30",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        isNightShift: true,
        status: "OPEN",
        locked: false,
        overridden: false,
      };

      const calculated = result.current.calculateDayWorkTime(day);

      expect(calculated.hours).toBe("07:30");
      expect(calculated.decimal).toBe("7.50");
    });
  });

  describe("recalculateWeekData", () => {
    it("berechnet alle Tage einer Woche neu", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const weekData: WeekData = {
        employeeName: "Test User",
        customer: "Test Customer",
        customerEmail: "",
        week: 3,
        year: 2024,
        sheetId: 1,
        startDate: "2024-01-15",
        days: [
          {
            date: "2024-01-15",
            from: "08:00",
            to: "17:00",
            pause1From: "12:00",
            pause1To: "12:30",
            pause2From: "",
            pause2To: "",
            hours: "00:00", // Wird neu berechnet
            decimal: "0.00",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
          {
            date: "2024-01-16",
            from: "08:00",
            to: "16:00",
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "00:00",
            decimal: "0.00",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
        ],
        locked: false,
        status: "OPEN",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        version: 1,
      };

      const recalculated = result.current.recalculateWeekData(weekData);

      expect(recalculated.days[0].hours).toBe("08:30");
      expect(recalculated.days[0].decimal).toBe("8.50");

      expect(recalculated.days[1].hours).toBe("08:00");
      expect(recalculated.days[1].decimal).toBe("8.00");

      // updatedAt sollte aktualisiert sein
      expect(recalculated.updatedAt).not.toBe(weekData.updatedAt);
    });

    it("erkennt Nachtschicht automatisch (to < from)", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const weekData: WeekData = {
        employeeName: "Test User",
        customer: "Test Customer",
        customerEmail: "",
        week: 3,
        year: 2024,
        sheetId: 1,
        startDate: "2024-01-15",
        days: [
          {
            date: "2024-01-15",
            from: "22:00",
            to: "06:00", // to < from → Nachtschicht
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "00:00",
            decimal: "0.00",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
        ],
        locked: false,
        status: "OPEN",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        version: 1,
      };

      const recalculated = result.current.recalculateWeekData(weekData);

      expect(recalculated.days[0].isNightShift).toBe(true);
      expect(recalculated.days[0].hours).toBe("08:00");
    });
  });

  describe("getWeekStats", () => {
    it("berechnet Wochen-Statistiken korrekt", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const weekData: WeekData = {
        employeeName: "Test User",
        customer: "Test Customer",
        customerEmail: "",
        week: 3,
        year: 2024,
        sheetId: 1,
        startDate: "2024-01-15",
        days: [
          {
            date: "2024-01-15",
            from: "08:00",
            to: "17:00",
            pause1From: "12:00",
            pause1To: "12:30",
            pause2From: "",
            pause2To: "",
            hours: "08:30",
            decimal: "8.50",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
          {
            date: "2024-01-16",
            from: "08:00",
            to: "16:00",
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "08:00",
            decimal: "8.00",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
          {
            date: "2024-01-17",
            from: "",
            to: "",
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "00:00",
            decimal: "0.00",
            absence: "sick",
            status: "OPEN",
            locked: false,
            overridden: false,
          },
        ],
        locked: false,
        status: "OPEN",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        version: 1,
      };

      const stats = result.current.getWeekStats(weekData);

      expect(stats.totalHours).toBe("16:30");
      expect(stats.totalDecimal).toBe("16.50");
      expect(stats.workDays).toBe(2);
      expect(stats.absenceDays).toBe(1);
      expect(stats.averageHoursPerDay).toBe("08:15"); // 16:30 / 2 = 8:15
    });

    it("gibt leere Stats zurück bei leerer Woche", () => {
      const { result } = renderHook(() => useTimeCalculation(), { wrapper });

      const weekData: WeekData = {
        employeeName: "Test User",
        customer: "Test Customer",
        customerEmail: "",
        week: 3,
        year: 2024,
        sheetId: 1,
        startDate: "2024-01-15",
        days: [],
        locked: false,
        status: "OPEN",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        version: 1,
      };

      const stats = result.current.getWeekStats(weekData);

      expect(stats.totalHours).toBe("00:00");
      expect(stats.totalDecimal).toBe("0.00");
      expect(stats.workDays).toBe(0);
      expect(stats.absenceDays).toBe(0);
      expect(stats.averageHoursPerDay).toBe("00:00");
    });
  });
});
