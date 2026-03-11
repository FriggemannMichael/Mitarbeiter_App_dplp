/**
 * TimeCalculationContext - Isolierte Zeitberechnung
 *
 * Verantwortlichkeiten:
 * - Neuberechnung von Tagesarbeitszeiten
 * - Wochenstatistiken (Gesamt, Durchschnitt)
 * - Integration mit TimeCalculationService
 *
 * Extrahiert aus WeekDataContext (Phase 1 Refactoring)
 */

import React, { createContext, useContext, useCallback } from "react";
import type { WeekData, DayData, WeekStats } from "../types/weekdata.types";
import { TimeCalculationService } from "../core/time";

interface TimeCalculationContextType {
  /**
   * Berechnet alle Tageszeiten einer Woche neu
   * @param weekData Wochendaten
   * @returns Aktualisierte Wochendaten mit neu berechneten Zeiten
   */
  recalculateWeekData: (weekData: WeekData) => WeekData;

  /**
   * Berechnet Statistiken für eine Woche
   * @param weekData Wochendaten
   * @returns Wochen-Statistiken (Gesamt-Stunden, Durchschnitt, etc.)
   */
  getWeekStats: (weekData: WeekData) => WeekStats;

  /**
   * Berechnet Arbeitszeit für einen einzelnen Tag
   * @param day Tagesdaten
   * @returns Berechnete Stunden (HH:MM) und Dezimalwert
   */
  calculateDayWorkTime: (day: DayData) => {
    hours: string;
    decimal: string;
  };
}

const TimeCalculationContext = createContext<
  TimeCalculationContextType | undefined
>(undefined);

export const TimeCalculationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  /**
   * Berechnet Arbeitszeit für einen einzelnen Tag
   */
  const calculateDayWorkTime = useCallback(
    (day: DayData): { hours: string; decimal: string } => {
      // Wenn Abwesenheit (außer Feiertag) -> 0 Stunden
      if (day.absence && day.absence !== "holiday") {
        return { hours: "00:00", decimal: "0.00" };
      }

      // Wenn keine Zeiten vorhanden -> 0 Stunden
      if (!day.from || !day.to) {
        return { hours: "00:00", decimal: "0.00" };
      }

      try {
        // Automatische Nachtschicht-Erkennung: End-Zeit vor Start-Zeit
        const isNightShift = day.isNightShift ?? day.to < day.from;

        const calculated = TimeCalculationService.calculateWorkTime({
          workTime: { from: day.from, to: day.to },
          breaks: [
            { from: day.pause1From, to: day.pause1To },
            { from: day.pause2From, to: day.pause2To },
          ].filter((brk) => brk.from && brk.to),
          isNightShift: isNightShift,
        });

        return {
          hours: calculated.hours,
          decimal: calculated.decimal,
        };
      } catch (error) {
        console.error("[TimeCalculationContext] Fehler bei Zeitberechnung:", error);
        return { hours: "00:00", decimal: "0.00" };
      }
    },
    []
  );

  /**
   * Neuberechnung aller Tageszeiten einer Woche
   */
  const recalculateWeekData = useCallback(
    (weekData: WeekData): WeekData => {
      const updatedDays = weekData.days.map((day) => {
        const calculated = calculateDayWorkTime(day);

        // Automatische Nachtschicht-Erkennung
        const isNightShift = day.to < day.from;

        return {
          ...day,
          hours: calculated.hours,
          decimal: calculated.decimal,
          isNightShift: day.isNightShift ?? isNightShift, // Behalte existierendes Flag oder setze neu
        };
      });

      return {
        ...weekData,
        days: updatedDays,
        updatedAt: new Date().toISOString(),
      };
    },
    [calculateDayWorkTime]
  );

  /**
   * Wochen-Statistiken berechnen
   */
  const getWeekStats = useCallback(
    (weekData: WeekData): WeekStats => {
      // Nur Tage mit Arbeitszeit berücksichtigen (keine Abwesenheit außer Feiertag)
      const results = weekData.days
        .filter((day) => {
          // Wenn Abwesenheit (außer Feiertag) -> nicht zählen
          if (day.absence && day.absence !== "holiday") {
            return false;
          }
          // Nur Tage mit Zeiteinträgen
          return day.from && day.to;
        })
        .map((day) =>
          TimeCalculationService.calculateWorkTime({
            workTime: { from: day.from, to: day.to },
            breaks: [
              { from: day.pause1From, to: day.pause1To },
              { from: day.pause2From, to: day.pause2To },
            ].filter((brk) => brk.from && brk.to),
            isNightShift: day.isNightShift,
          })
        );

      const total = TimeCalculationService.calculateTotalWorkTime(results);
      const workDays = results.length;

      // Abwesenheitstage (außer Feiertage)
      const absenceDays = weekData.days.filter(
        (day) => day.absence && day.absence !== "holiday"
      ).length;

      // Durchschnittliche Stunden pro Tag
      const avgMinutes = workDays > 0 ? Math.round(total.minutes / workDays) : 0;
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;

      return {
        totalHours: total.hours,
        totalDecimal: total.decimal,
        totalMinutes: total.minutes,
        workDays,
        absenceDays,
        averageHoursPerDay: `${String(avgHours).padStart(2, "0")}:${String(
          avgMins
        ).padStart(2, "0")}`,
      };
    },
    []
  );

  const value: TimeCalculationContextType = {
    recalculateWeekData,
    getWeekStats,
    calculateDayWorkTime,
  };

  return (
    <TimeCalculationContext.Provider value={value}>
      {children}
    </TimeCalculationContext.Provider>
  );
};

/**
 * Hook für Zeitberechnungs-Zugriff
 */
export const useTimeCalculation = () => {
  const context = useContext(TimeCalculationContext);
  if (!context) {
    throw new Error(
      "useTimeCalculation muss innerhalb TimeCalculationProvider verwendet werden"
    );
  }
  return context;
};
