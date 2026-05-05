/**
 * ShiftConfigContext - Schicht-Konfiguration
 *
 * Verantwortlichkeiten:
 * - Schichtzeiten auf Woche anwenden
 * - Nachtschicht-Reorganisation (Sonntag-Start)
 * - Tag-Auswahl basierend auf Schichtmodell
 * - Automatische Zeitberechnung für Schichten
 *
 * Extrahiert aus WeekDataContext (Phase 1 Refactoring)
 */

import React, { createContext, useContext, useCallback } from "react";
import type { WeekData, DayData } from "../types/weekdata.types";
import { weekUtils } from "../utils/storage";
import { TimeCalculationService } from "../core/time";

export interface ShiftConfig {
  from: string;
  to: string;
  pause1From: string;
  pause1To: string;
  pause2From: string;
  pause2To: string;
}

export type ShiftModel = "day" | "late" | "night" | "continuous";

interface ShiftConfigContextType {
  /**
   * Wendet Schicht-Konfiguration auf eine Woche an
   * @param weekData Wochendaten
   * @param shiftModel Schichtmodell
   * @param config Zeiten-Konfiguration
   * @param selectedDays Optional: Spezifische Tage (0-6), sonst automatisch
   * @param lockedDates Optional: Set von ISO-Datumsstrings, die gesperrt sind
   * @param activeMonthKey Optional: Monat im Format YYYY-M, auf den die Schicht angewendet werden darf
   * @returns Aktualisierte Wochendaten mit angewandter Schicht
   */
  applyShiftConfig: (
    weekData: WeekData,
    shiftModel: ShiftModel,
    config: ShiftConfig,
    selectedDays?: number[],
    lockedDates?: Set<string>,
    activeMonthKey?: string
  ) => WeekData;

  /**
   * Bestimmt Standard-Tage für ein Schichtmodell
   * @param shiftModel Schichtmodell
   * @returns Array von Tag-Indizes (0-6)
   */
  getDefaultDaysForShift: (shiftModel: ShiftModel) => number[];

  /**
   * Reorganisiert Woche für Nachtschicht (Sonntag-Start)
   * @param weekData Wochendaten
   * @returns Reorganisierte Wochendaten
   */
  reorganizeForNightShift: (weekData: WeekData) => WeekData;
}

const ShiftConfigContext = createContext<ShiftConfigContextType | undefined>(
  undefined
);

export const ShiftConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /**
   * Standard-Tage für Schichtmodell
   */
  const getDefaultDaysForShift = useCallback(
    (shiftModel: ShiftModel): number[] => {
      switch (shiftModel) {
        case "day":
        case "late":
          return [0, 1, 2, 3, 4]; // Mo-Fr (bei Montag-Start)
        case "night":
          return [0, 1, 2, 3, 4]; // So-Do (bei Sonntag-Start für Nachtschicht)
        case "continuous":
          return [0, 1, 2, 3, 4, 5, 6]; // Alle Tage
        default:
          return [0, 1, 2, 3, 4];
      }
    },
    []
  );

  /**
   * Reorganisiert Woche für Nachtschicht (Sonntag-Start)
   */
  const reorganizeForNightShift = useCallback(
    (weekData: WeekData): WeekData => {
      const expectedDays = weekUtils.getWeekDaysForNightShift(
        weekData.year,
        weekData.week
      );
      const currentStartDate = weekData.days[0]?.date;
      const expectedStartDate = weekUtils.toISODate(expectedDays[0]);

      // Bereits korrekt organisiert?
      if (currentStartDate === expectedStartDate) {
        return weekData;
      }

      // Reorganisiere Tage (Sonntag = Start)
      const newDays: DayData[] = expectedDays.map((date) => {
        const isoDate = weekUtils.toISODate(date);
        const existingDay = weekData.days.find((d) => d.date === isoDate);

        return (
          existingDay || {
            date: isoDate,
            from: "",
            to: "",
            pause1From: "",
            pause1To: "",
            pause2From: "",
            pause2To: "",
            hours: "00:00",
            decimal: "0.00",
            status: "OPEN" as const,
            locked: false,
            overridden: false,
          }
        );
      });

      return {
        ...weekData,
        startDate: expectedStartDate,
        days: newDays,
        shiftModel: "night",
      };
    },
    []
  );

  /**
   * Wendet Schicht-Konfiguration auf Woche an
   *
   * BUGFIX: Reorganisiert Wochenstruktur basierend auf Schichtmodell
   * - Nachtschicht: Woche startet am Sonntag (So-Sa)
   * - Andere Schichten: Woche startet am Montag (Mo-So)
   *
   * Bewahrt bestehende Daten (Notizen, Kunden, Abwesenheiten) beim Wechsel
   */
  const applyShiftConfig = useCallback(
    (
      weekData: WeekData,
      shiftModel: ShiftModel,
      config: ShiftConfig,
      selectedDays?: number[],
      lockedDates?: Set<string>,
      activeMonthKey?: string
    ): WeekData => {
      if (!weekData) {
        throw new Error("Keine Wochendaten vorhanden");
      }

      // SCHRITT 1: Bestimme korrekte Datumsstruktur basierend auf Schichtmodell
      // FIX: IMMER neu aufbauen, nicht nur für Nachtschicht
      const targetDates: Date[] =
        shiftModel === "night"
          ? weekUtils.getWeekDaysForNightShift(weekData.year, weekData.week)
          : weekUtils.getWeekDays(weekData.year, weekData.week);

      // SCHRITT 2: Baue neues Tage-Array mit korrekter Reihenfolge
      const newDays: DayData[] = targetDates.map((dateObj, index) => {
        const dateStr = weekUtils.toISODate(dateObj);

        // Versuche, bestehende Daten für dieses Datum zu finden
        const existingDay = weekData.days.find((d) => d.date === dateStr);

        // Basis-Tag: entweder bestehender Tag oder leerer Tag
        const baseDay: DayData = existingDay || {
          date: dateStr,
          from: "",
          to: "",
          pause1From: "",
          pause1To: "",
          pause2From: "",
          pause2To: "",
          hours: "00:00",
          decimal: "0.00",
          status: "OPEN" as const,
          locked: false,
          overridden: false,
        };

        // SCHRITT 3: Bestimme Ziel-Tage für Schichtanwendung
        const targetDays = selectedDays || getDefaultDaysForShift(shiftModel);

        // WICHTIG: Wenn Tag in anderem Sheet gesperrt ist, nicht überschreiben
        if (lockedDates && lockedDates.has(dateStr)) {
          return baseDay;
        }

        // WICHTIG: Wenn Tag in anderem Monat liegt, nicht überschreiben
        // Dies verhindert Überschreiben bei Wochen die Monatsgrenzen überschreiten (z.B. KW 53)
        const allowedMonthKey =
          activeMonthKey ||
          `${targetDates[0].getFullYear()}-${targetDates[0].getMonth()}`;
        const currentMonthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;

        if (currentMonthKey !== allowedMonthKey) {
          return baseDay;
        }

        // Wenn dieser Tag nicht betroffen ist, gib den Basis-Tag zurück
        if (!targetDays.includes(index)) {
          return baseDay;
        }

        // SCHRITT 4: Berechne Nachtschicht-End-Datum falls erforderlich
        let nightShiftEndDate: string | undefined;
        if (shiftModel === "night") {
          const nextDay = new Date(dateObj);
          nextDay.setDate(dateObj.getDate() + 1);
          nightShiftEndDate = weekUtils.toISODate(nextDay);
        }

        // SCHRITT 5: Wende Schichtzeiten an
        const dayWithShift: DayData = {
          ...baseDay,
          from: config.from,
          to: config.to,
          pause1From: config.pause1From,
          pause1To: config.pause1To,
          pause2From: config.pause2From,
          pause2To: config.pause2To,
          isNightShift: shiftModel === "night",
          nightShiftEndDate,
        };

        // SCHRITT 6: Berechne Arbeitszeit
        try {
          const calculated = TimeCalculationService.calculateWorkTime({
            workTime: { from: config.from, to: config.to },
            breaks: [
              { from: config.pause1From, to: config.pause1To },
              { from: config.pause2From, to: config.pause2To },
            ].filter((brk) => brk.from && brk.to),
            isNightShift: shiftModel === "night",
          });

          dayWithShift.hours = calculated.hours;
          dayWithShift.decimal = calculated.decimal;
        } catch (error) {
          console.error(
            "[ShiftConfigContext] Fehler bei Zeitberechnung:",
            error
          );
          dayWithShift.hours = "00:00";
          dayWithShift.decimal = "0.00";
        }

        return dayWithShift;
      });

      // SCHRITT 7: Rückgabe mit neuer Struktur und korrektem Startdatum
      return {
        ...weekData,
        days: newDays,
        shiftModel: shiftModel,
        startDate: weekUtils.toISODate(targetDates[0]),
        updatedAt: new Date().toISOString(),
      };
    },
    [getDefaultDaysForShift]
  );

  const value: ShiftConfigContextType = {
    applyShiftConfig,
    getDefaultDaysForShift,
    reorganizeForNightShift,
  };

  return (
    <ShiftConfigContext.Provider value={value}>
      {children}
    </ShiftConfigContext.Provider>
  );
};

/**
 * Hook für Schicht-Konfigurations-Zugriff
 */
export const useShiftConfig = () => {
  const context = useContext(ShiftConfigContext);
  if (!context) {
    throw new Error(
      "useShiftConfig muss innerhalb ShiftConfigProvider verwendet werden"
    );
  }
  return context;
};
