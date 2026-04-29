/**
 * WeekDataContext V2 - Refactored Version
 *
 * ÄNDERUNGEN (Phase 1 Refactoring):
 * - Zeitberechnungen → TimeCalculationContext
 * - Unterschriften → SignatureWorkflowContext
 * - Schicht-Konfiguration → ShiftConfigContext
 * - Code-Duplikation eliminiert: saveWeekData() Helper-Funktion (DRY-Prinzip)
 *   * Auto-Save Effect (Zeile 256-273)
 *   * saveWeek() Funktion (Zeile 336-357)
 *   * addSignature() Funktion (Zeile 559-589)
 *   * clearSignature() Funktion (Zeile 594-618)
 *
 * VERBLEIBEND:
 * - Core State Management (currentWeek, allSheets, etc.)
 * - CRUD-Operationen (loadWeek, saveWeek, deleteWeek)
 * - Day/Customer/Employee Updates
 * - Week Navigation
 * - Sheet Management
 * - BroadcastChannel & Auto-Save
 * - Editability Checks
 *
 * Reduziert von 1208 → ~650 Zeilen (46% Reduktion + DRY-Refactoring)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { WeekData, DayData, WeekStats } from "../types/weekdata.types";
import { storage, weekUtils } from "../utils/storage";
import {
  migrateWeekDataComplete,
  needsMigration,
  isDayEditable as checkDayEditable,
  isWeekEditable as checkWeekEditable,
} from "../utils/timesheetMigration";

// NEUE CONTEXTS IMPORTIEREN
import { useTimeCalculation } from "./TimeCalculationContext";
import { useSignatureWorkflow } from "./SignatureWorkflowContext";
import { useShiftConfig, type ShiftConfig } from "./ShiftConfigContext";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const getMonthKey = (date: string): string => {
  const [year, month] = date.split("-").map(Number);
  return `${year}-${month - 1}`;
};

const hasDayEntry = (day: DayData): boolean => {
  const hasWorkTime = Boolean(day.from && day.to && day.decimal !== "0.00");
  const hasAbsence = Boolean(day.absence);
  return hasWorkTime || hasAbsence;
};

const getActiveMonthKeyForSheet = (
  week: WeekData,
  otherSheets: WeekData[],
): string => {
  const fallbackMonthKey = week.days[0] ? getMonthKey(week.days[0].date) : "";
  const firstUsedDay = week.days.find(hasDayEntry);

  if (firstUsedDay) {
    return getMonthKey(firstUsedDay.date);
  }

  const usedDatesInOtherSheets = new Set<string>();
  otherSheets.forEach((sheet) => {
    sheet.days.forEach((day) => {
      if (hasDayEntry(day)) {
        usedDatesInOtherSheets.add(day.date);
      }
    });
  });

  if (usedDatesInOtherSheets.size === 0) {
    return fallbackMonthKey;
  }

  const freeDaysByMonth = new Map<string, number>();
  week.days.forEach((day) => {
    if (!usedDatesInOtherSheets.has(day.date)) {
      const monthKey = getMonthKey(day.date);
      freeDaysByMonth.set(monthKey, (freeDaysByMonth.get(monthKey) || 0) + 1);
    }
  });

  let activeMonthKey = fallbackMonthKey;
  let highestFreeDayCount = -1;
  freeDaysByMonth.forEach((freeDayCount, monthKey) => {
    if (freeDayCount > highestFreeDayCount) {
      activeMonthKey = monthKey;
      highestFreeDayCount = freeDayCount;
    }
  });

  return activeMonthKey;
};

interface WeekDataContextType {
  // State
  currentWeek: WeekData | null;
  currentSheetId: number;
  allSheets: WeekData[];
  isLoading: boolean;
  error: string | null;
  lastSaved?: string;

  // Week Navigation
  loadWeek: (year: number, week: number, sheetId?: number) => Promise<void>;
  nextWeek: () => void;
  previousWeek: () => void;
  goToCurrentWeek: () => void;

  // Employee Management
  setEmployee: (name: string, id?: string) => void;

  // Customer Management
  updateCustomer: (customer: string) => void;
  updateCustomerEmail: (email: string) => void;

  // Day Operations
  updateDay: (dayIndex: number, field: keyof DayData, value: any) => void;
  resetDay: (dayIndex: number) => void;
  deleteDay: (date: string) => void;

  // Week Operations
  saveWeek: () => Promise<boolean>;
  deleteWeek: (year: number, week: number, sheetId?: number) => Promise<void>;

  // Signature (delegiert an SignatureWorkflowContext)
  addSignature: (
    type: "employee" | "supervisor",
    signatureData: string,
    name?: string,
  ) => void;
  clearSignature: (type: "employee" | "supervisor") => void;

  /**
   * Setzt Status auf PENDING_REVIEW und speichert.
   * Muss NACH erfolgreichem E-Mail-Versand aufgerufen werden.
   */
  sendForReview: (recipientEmail: string) => void;

  // Sheet Management
  switchToSheet: (sheetId: number) => void;
  createNewSheet: () => void;

  // Shift Configuration (delegiert an ShiftConfigContext)
  applyShiftConfigToWeek: (
    shiftModel: "day" | "late" | "night" | "continuous",
    config: ShiftConfig,
    selectedDays?: number[],
  ) => void;

  // Helpers
  getAllWeeks: () => WeekData[];
  getWeekStats: () => WeekStats;
  isDayEditable: (dayIndex: number) => boolean;
  isDayInDifferentMonth: (dayIndex: number) => boolean;
  isEditable: boolean;
  canSupervisorSign: boolean;
  getDateRange: () => string;
}

const WeekDataContext = createContext<WeekDataContextType | undefined>(
  undefined,
);

export const WeekDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // INJECTED CONTEXTS
  const timeCalc = useTimeCalculation();
  const signatureWorkflow = useSignatureWorkflow();
  const shiftConfig = useShiftConfig();

  // STATE
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [currentSheetId, setCurrentSheetId] = useState(1);
  const [allSheets, setAllSheets] = useState<WeekData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);

  const [currentWeekInfo, setCurrentWeekInfo] = useState(() =>
    weekUtils.getCurrentWeek(),
  );

  // BroadcastChannel für Tab-Sync
  const channelRef = useRef<BroadcastChannel | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // BroadcastChannel Setup
  useEffect(() => {
    channelRef.current = new BroadcastChannel("weekdata-sync");

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === "WEEK_UPDATED") {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }

        setCurrentWeek((current) => {
          if (
            current &&
            data.year === current.year &&
            data.week === current.week &&
            data.sheetId === current.sheetId &&
            data.updatedAt !== current.updatedAt
          ) {
            return data;
          }
          return current;
        });
      } else if (type === "WEEK_DELETED") {
        setCurrentWeek((current) => {
          if (
            current &&
            data.year === current.year &&
            data.week === current.week &&
            data.sheetId === current.sheetId
          ) {
            return null;
          }
          return current;
        });
      }
    };

    channelRef.current.addEventListener("message", handleMessage);
    return () => {
      channelRef.current?.removeEventListener("message", handleMessage);
      channelRef.current?.close();
    };
  }, []);

  /**
   * Helper: Erstelle leere Woche
   */
  const createEmptyWeek = useCallback(
    (year: number, week: number, sheetId: number = 1): WeekData => {
      const weekDays = weekUtils.getWeekDays(year, week);
      const emptyDays: DayData[] = weekDays.map((date) => ({
        date: weekUtils.toISODate(date),
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
      }));

      return {
        employeeName: storage.getEmployeeName(),
        customer: "",
        customerEmail: "",
        week,
        year,
        sheetId,
        startDate: weekUtils.toISODate(weekDays[0]),
        days: emptyDays,
        locked: false,
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
    },
    [],
  );

  /**
   * Helper: Speichert Wochendaten (DRY - Don't Repeat Yourself)
   * Reduziert Code-Duplikation von ~60 Zeilen auf zentrale Funktion
   */
  const saveWeekData = useCallback(
    (weekData: WeekData): WeekData => {
      // Neuberechnung der Wochendaten
      const recalculatedWeek = timeCalc.recalculateWeekData(weekData);
      const weekToSave = {
        ...recalculatedWeek,
        sheetId: recalculatedWeek.sheetId ?? 1,
      };

      // In Storage speichern
      storage.setWeekData(
        weekToSave.year,
        weekToSave.week,
        weekToSave as import("../utils/storage").WeekData,
        weekToSave.sheetId,
      );

      // Letzten Speicherzeitpunkt aktualisieren
      setLastSaved(new Date().toISOString());

      // Broadcast an andere Tabs
      channelRef.current?.postMessage({
        type: "WEEK_UPDATED",
        data: weekToSave,
      });

      return weekToSave;
    },
    [timeCalc],
  );

  /**
   * Auto-Save mit Debounce
   */
  useEffect(() => {
    if (!currentWeek) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      // Nutze zentrale Speicher-Funktion (DRY)
      saveWeekData(currentWeek);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentWeek, saveWeekData]);

  /**
   * Lädt Wochendaten aus storage
   */
  const loadWeek = useCallback(
    async (year: number, week: number, sheetId: number = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const sheets = storage.getAllSheetsForWeek(year, week);
        setAllSheets(sheets as WeekData[]);

        let data = storage.getWeekData(year, week, sheetId) as WeekData | null;

        if (!data) {
          data = createEmptyWeek(year, week, sheetId);
        } else {
          // Fix: employeeName aus localStorage übernehmen falls leer
          if (!data.employeeName || data.employeeName.trim() === "") {
            data = { ...data, employeeName: storage.getEmployeeName() };
          }
          if (needsMigration(data)) {
            data = migrateWeekDataComplete(data);
            storage.setWeekData(
              year,
              week,
              data as import("../utils/storage").WeekData,
              sheetId,
            );
          }

          // Nachtschicht-Reorganisation
          if (data.shiftModel === "night") {
            data = shiftConfig.reorganizeForNightShift(data);
            storage.setWeekData(
              year,
              week,
              data as import("../utils/storage").WeekData,
            );
          }
        }

        setCurrentWeek(data as WeekData);
        setCurrentWeekInfo({ year, week });
        setCurrentSheetId(sheetId);
      } catch (err: any) {
        console.error("Fehler beim Laden der Woche:", err);
        setError(err.message || "Fehler beim Laden");
      } finally {
        setIsLoading(false);
      }
    },
    [createEmptyWeek, shiftConfig],
  );

  /**
   * Auto-Navigation: Beim ersten Laden automatisch zur aktuellen Woche navigieren
   */
  useEffect(() => {
    const current = weekUtils.getCurrentWeek();
    loadWeek(current.year, current.week, 1);
  }, []); // Nur beim ersten Mount ausführen

  /**
   * Speichert aktuelle Woche
   */
  const saveWeek = useCallback(async (): Promise<boolean> => {
    if (!currentWeek) return false;

    try {
      // Nutze zentrale Speicher-Funktion (DRY)
      const weekToSave = saveWeekData(currentWeek);

      setCurrentWeek(weekToSave);

      const sheets = storage.getAllSheetsForWeek(
        weekToSave.year,
        weekToSave.week,
      );
      setAllSheets(sheets as WeekData[]);

      return true;
    } catch (err: any) {
      console.error("Fehler beim Speichern:", err);
      setError(err.message || "Fehler beim Speichern");
      return false;
    }
  }, [currentWeek, saveWeekData]);

  /**
   * Woche löschen
   */
  const deleteWeek = useCallback(
    async (year: number, week: number, sheetId: number = 1) => {
      try {
        const weekKey = `week_${year}_${week}_${sheetId}`;
        localStorage.removeItem(weekKey);

        if (
          currentWeek?.year === year &&
          currentWeek?.week === week &&
          currentWeek?.sheetId === sheetId
        ) {
          setCurrentWeek(null);
        }

        channelRef.current?.postMessage({
          type: "WEEK_DELETED",
          data: { year, week, sheetId },
        });

        const sheets = storage.getAllSheetsForWeek(year, week);
        setAllSheets(sheets as WeekData[]);
      } catch (err: any) {
        console.error("Fehler beim Löschen:", err);
        setError(err.message || "Fehler beim Löschen");
      }
    },
    [currentWeek],
  );

  /**
   * Tag aktualisieren
   */
  const updateDay = useCallback(
    (dayIndex: number, field: keyof DayData, value: any) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }

      const updatedDays = [...currentWeek.days];
      updatedDays[dayIndex] = { ...updatedDays[dayIndex], [field]: value };

      const day = updatedDays[dayIndex];

      // Abwesenheit behandeln
      if (field === "absence" && value !== null && value !== "holiday") {
        updatedDays[dayIndex].hours = "00:00";
        updatedDays[dayIndex].decimal = "0.00";
        setCurrentWeek({ ...currentWeek, days: updatedDays });
        return;
      }

      // Arbeitszeit neu berechnen (NEUE LOGIK: Nutze TimeCalculationContext)
      if (
        [
          "from",
          "to",
          "pause1From",
          "pause1To",
          "pause2From",
          "pause2To",
          "isNightShift",
          "absence",
        ].includes(field)
      ) {
        if (day.absence && day.absence !== "holiday") {
          updatedDays[dayIndex].hours = "00:00";
          updatedDays[dayIndex].decimal = "0.00";
          setCurrentWeek({ ...currentWeek, days: updatedDays });
          return;
        }

        // Automatische Schichterkennung
        if ((field === "from" || field === "to") && day.from && day.to) {
          const fromHour = parseInt(day.from.split(":")[0]);
          const toHour = parseInt(day.to.split(":")[0]);
          const isNightShiftTime =
            fromHour >= 22 || toHour <= 8 || fromHour > toHour;
          updatedDays[dayIndex].isNightShift = isNightShiftTime;
        }

        // Berechne Arbeitszeit via TimeCalculationContext
        if (day.from && day.to) {
          const calculated = timeCalc.calculateDayWorkTime(day);
          updatedDays[dayIndex].hours = calculated.hours;
          updatedDays[dayIndex].decimal = calculated.decimal;
        } else {
          updatedDays[dayIndex].hours = "00:00";
          updatedDays[dayIndex].decimal = "0.00";
        }
      }

      setCurrentWeek({ ...currentWeek, days: updatedDays });
    },
    [currentWeek, timeCalc],
  );

  /**
   * Tag zurücksetzen
   */
  const resetDay = useCallback(
    (dayIndex: number) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }

      const updatedDays = [...currentWeek.days];
      const day = updatedDays[dayIndex];

      updatedDays[dayIndex] = {
        ...day,
        from: "",
        to: "",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
        hours: "00:00",
        decimal: "0.00",
        absence: null,
        absenceNote: "",
        orderNumber: "",
        commission: "",
        isNightShift: false,
        nightShiftEndDate: "",
        note: "",
      };

      setCurrentWeek({ ...currentWeek, days: updatedDays });
    },
    [currentWeek],
  );

  /**
   * Tag löschen
   */
  const deleteDay = useCallback(
    (date: string) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }

      const updatedDays = currentWeek.days.map((day) =>
        day.date === date
          ? {
              ...day,
              from: "",
              to: "",
              pause1From: "",
              pause1To: "",
              pause2From: "",
              pause2To: "",
              hours: "00:00",
              decimal: "0.00",
              absence: null,
              orderNumber: "",
              commission: "",
              isNightShift: false,
              note: undefined,
            }
          : day,
      );

      setCurrentWeek({ ...currentWeek, days: updatedDays });
    },
    [currentWeek],
  );

  /**
   * Mitarbeiter setzen
   */
  const setEmployee = useCallback(
    (name: string, id?: string) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }
      setCurrentWeek({
        ...currentWeek,
        employeeName: name,
        employeeId: id,
      });
    },
    [currentWeek],
  );

  /**
   * Kunde aktualisieren
   */
  const updateCustomer = useCallback(
    (customer: string) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }
      setCurrentWeek({ ...currentWeek, customer });
    },
    [currentWeek],
  );

  /**
   * Kunden-E-Mail aktualisieren
   */
  const updateCustomerEmail = useCallback(
    (customerEmail: string) => {
      if (!currentWeek) return;
      if (
        currentWeek.locked ||
        currentWeek.status === "PENDING_REVIEW" ||
        currentWeek.status === "FOREMAN_SIGNED_FULL"
      ) {
        return;
      }
      setCurrentWeek({ ...currentWeek, customerEmail });
    },
    [currentWeek],
  );

  /**
   * NEUE LOGIK: Unterschrift hinzufügen (delegiert an SignatureWorkflowContext)
   */
  const addSignature = useCallback(
    (type: "employee" | "supervisor", signatureData: string, name?: string) => {
      if (!currentWeek) return;

      // Timer löschen
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      try {
        // Delegiere an SignatureWorkflowContext
        const updatedWeek = signatureWorkflow.addSignature(
          currentWeek,
          type,
          signatureData,
          name,
        );

        // Nutze zentrale Speicher-Funktion (DRY)
        const weekToSave = saveWeekData(updatedWeek);
        setCurrentWeek(weekToSave);

        devLog(`[WeekDataContext] Unterschrift (${type}) gespeichert`);
      } catch (error) {
        console.error("Fehler beim Unterschreiben:", error);
        setError(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    },
    [currentWeek, signatureWorkflow, saveWeekData],
  );

  /**
   * NEUE LOGIK: Unterschrift löschen (delegiert an SignatureWorkflowContext)
   */
  const clearSignature = useCallback(
    (type: "employee" | "supervisor") => {
      if (!currentWeek) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      try {
        // Delegiere an SignatureWorkflowContext
        const updatedWeek = signatureWorkflow.clearSignature(currentWeek, type);

        // Nutze zentrale Speicher-Funktion (DRY)
        const weekToSave = saveWeekData(updatedWeek);
        setCurrentWeek(weekToSave);

        devLog(`[WeekDataContext] Unterschrift (${type}) gelöscht`);
      } catch (error) {
        console.error("Fehler beim Löschen der Unterschrift:", error);
        setError(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    },
    [currentWeek, signatureWorkflow, saveWeekData],
  );

  /**
   * Status auf PENDING_REVIEW setzen (nach erfolgreichem E-Mail-Versand aufrufen)
   */
  const sendForReview = useCallback(
    (recipientEmail: string) => {
      if (!currentWeek) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      try {
        const updatedWeek = signatureWorkflow.sendForExternalReview(
          currentWeek,
          recipientEmail
        );
        const weekToSave = saveWeekData(updatedWeek);
        setCurrentWeek(weekToSave);
      } catch (error) {
        console.error("Fehler beim Setzen von PENDING_REVIEW:", error);
        setError(error instanceof Error ? error.message : "Unbekannter Fehler");
        throw error;
      }
    },
    [currentWeek, signatureWorkflow, saveWeekData]
  );

  /**
   * Wochenwechsel
   */
  const nextWeek = useCallback(() => {
    let newYear = currentWeekInfo.year;
    let newWeek = currentWeekInfo.week + 1;
    if (newWeek > 52) {
      newYear++;
      newWeek = 1;
    }
    loadWeek(newYear, newWeek, currentSheetId);
  }, [currentWeekInfo, currentSheetId, loadWeek]);

  const previousWeek = useCallback(() => {
    let newYear = currentWeekInfo.year;
    let newWeek = currentWeekInfo.week - 1;
    if (newWeek < 1) {
      newYear--;
      newWeek = 52;
    }
    loadWeek(newYear, newWeek, currentSheetId);
  }, [currentWeekInfo, currentSheetId, loadWeek]);

  const goToCurrentWeek = useCallback(() => {
    const current = weekUtils.getCurrentWeek();
    loadWeek(current.year, current.week, currentSheetId);
  }, [currentSheetId, loadWeek]);

  /**
   * Sheet-Wechsel
   */
  const switchToSheet = useCallback(
    (sheetId: number) => {
      if (!currentWeek) return;
      loadWeek(currentWeek.year, currentWeek.week, sheetId);
    },
    [currentWeek, loadWeek],
  );

  const createNewSheet = useCallback(() => {
    if (!currentWeek) return;
    const nextId = storage.getNextSheetId(currentWeek.year, currentWeek.week);
    loadWeek(currentWeek.year, currentWeek.week, nextId);
  }, [currentWeek, loadWeek]);

  /**
   * Alle Wochen abrufen
   */
  const getAllWeeks = useCallback((): WeekData[] => {
    const weekKeys = storage.getAllWeekKeys();
    const weeks: WeekData[] = [];

    weekKeys.forEach((key) => {
      const parts = key.split("_");
      if (parts.length >= 3) {
        const year = parseInt(parts[1]);
        const week = parseInt(parts[2]);
        const sheetId = parts[3] ? parseInt(parts[3]) : 1;

        const weekData = storage.getWeekData(year, week, sheetId);
        if (weekData) {
          weeks.push(weekData as WeekData);
        }
      }
    });

    return weeks.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  }, []);

  /**
   * NEUE LOGIK: Wochen-Statistiken (delegiert an TimeCalculationContext)
   */
  const getWeekStats = useCallback((): WeekStats => {
    if (!currentWeek) {
      return {
        totalHours: "00:00",
        totalDecimal: "0.00",
        totalMinutes: 0,
        workDays: 0,
        absenceDays: 0,
        averageHoursPerDay: "00:00",
      };
    }

    return timeCalc.getWeekStats(currentWeek);
  }, [currentWeek, timeCalc]);

  /**
   * Tag-Bearbeitbarkeit prüfen
   */
  const getUsedDaysInOtherSheets = useCallback((): Set<string> => {
    if (!currentWeek) return new Set();

    const usedDates = new Set<string>();
    allSheets.forEach((sheet) => {
      if (sheet.sheetId === currentSheetId) return;

      sheet.days.forEach((day) => {
        if (hasDayEntry(day)) {
          usedDates.add(day.date);
        }
      });
    });

    return usedDates;
  }, [currentWeek, allSheets, currentSheetId]);

  /**
   * NEUE LOGIK: Schichtzeiten anwenden (delegiert an ShiftConfigContext)
   */
  const applyShiftConfigToWeek = useCallback(
    (
      shiftModel: "day" | "late" | "night" | "continuous",
      config: ShiftConfig,
      selectedDays?: number[],
    ) => {
      if (!currentWeek) return;

      try {
        // Hole gesperrte Tage aus anderen Sheets
        const lockedDates = getUsedDaysInOtherSheets();
        const otherSheets = allSheets.filter(
          (sheet) => sheet.sheetId !== currentSheetId,
        );
        const activeMonthKey = getActiveMonthKeyForSheet(
          currentWeek,
          otherSheets,
        );

        // Delegiere an ShiftConfigContext mit gesperrten Tagen
        const updatedWeek = shiftConfig.applyShiftConfig(
          currentWeek,
          shiftModel,
          config,
          selectedDays,
          lockedDates,
          activeMonthKey,
        );

        setCurrentWeek(updatedWeek);
      } catch (error) {
        console.error("Fehler beim Anwenden der Schicht-Konfiguration:", error);
        setError(error instanceof Error ? error.message : "Unbekannter Fehler");
      }
    },
    [
      currentWeek,
      shiftConfig,
      getUsedDaysInOtherSheets,
      allSheets,
      currentSheetId,
    ],
  );

  const isDayEditable = useCallback(
    (dayIndex: number): boolean => {
      if (!currentWeek) return false;

      const day = currentWeek.days[dayIndex];
      if (!day) return false;

      // Prüfe andere Sheets - wenn Tag dort verwendet wird, ist er gesperrt
      const usedDays = getUsedDaysInOtherSheets();
      if (usedDays.has(day.date)) {
        return false;
      }

      // Monatsübergreifende Tage: Bestimme den "Haupt-Monat" des Sheets
      // Der Haupt-Monat ist der Monat des ersten Wochentags (Montag),
      // nicht der Monat mit den meisten Tagen – sonst werden die letzten
      // Märztage in der KW gesperrt, die mit 30./31.03 beginnt.
      const otherSheets = allSheets.filter(
        (sheet) => sheet.sheetId !== currentSheetId,
      );
      const activeMonthKey = getActiveMonthKeyForSheet(currentWeek, otherSheets);

      // Tag ist nur bearbeitbar, wenn er zum Haupt-Monat gehört
      if (getMonthKey(day.date) !== activeMonthKey) {
        return false;
      }

      return checkDayEditable(day, currentWeek.status);
    },
    [currentWeek, getUsedDaysInOtherSheets, allSheets, currentSheetId],
  );

  const isEditable = currentWeek ? checkWeekEditable(currentWeek) : false;

  // NEUE LOGIK: canSupervisorSign delegiert an SignatureWorkflowContext
  const canSupervisorSign = currentWeek
    ? signatureWorkflow.canSupervisorSign(currentWeek)
    : false;

  /**
   * Prüft ob ein Tag in einem anderen Monat liegt als der erste Tag der Woche
   * Dies ist wichtig für Wochen die Monatsgrenzen überschreiten (z.B. KW 53)
   */
  const isDayInDifferentMonth = useCallback(
    (dayIndex: number): boolean => {
      if (!currentWeek) return false;

      const day = currentWeek.days[dayIndex];
      if (!day) return false;

      const otherSheets = allSheets.filter(
        (sheet) => sheet.sheetId !== currentSheetId,
      );
      const activeMonthKey = getActiveMonthKeyForSheet(currentWeek, otherSheets);

      return getMonthKey(day.date) !== activeMonthKey;
    },
    [currentWeek, allSheets, currentSheetId],
  );

  /**
   * Datumsbereich
   */
  const getDateRange = useCallback((): string => {
    if (!currentWeek) return "";
    const days = weekUtils.getWeekDays(currentWeek.year, currentWeek.week);
    const start = weekUtils.formatDate(days[0]);
    const end = weekUtils.formatDate(days[6]);
    return `${start} - ${end}`;
  }, [currentWeek]);

  // Initial Load
  useEffect(() => {
    const loadInitialWeek = async () => {
      const systemWeek = weekUtils.getCurrentWeek();
      devLog("[WeekDataContext] Initial Load - System-Woche:", systemWeek);
      setCurrentWeekInfo(systemWeek);
      await loadWeek(systemWeek.year, systemWeek.week, 1);
    };

    loadInitialWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: WeekDataContextType = {
    currentWeek,
    currentSheetId,
    allSheets,
    isLoading,
    error,
    lastSaved,
    loadWeek,
    nextWeek,
    previousWeek,
    goToCurrentWeek,
    setEmployee,
    updateCustomer,
    updateCustomerEmail,
    updateDay,
    resetDay,
    deleteDay,
    saveWeek,
    deleteWeek,
    addSignature,
    clearSignature,
    sendForReview,
    switchToSheet,
    createNewSheet,
    applyShiftConfigToWeek,
    getAllWeeks,
    getWeekStats,
    isDayEditable,
    isDayInDifferentMonth,
    isEditable,
    canSupervisorSign,
    getDateRange,
  };

  return (
    <WeekDataContext.Provider value={value}>
      {children}
    </WeekDataContext.Provider>
  );
};

/**
 * Hook für WeekData-Zugriff
 */
export const useWeekData = () => {
  const context = useContext(WeekDataContext);
  if (!context) {
    throw new Error(
      "useWeekData muss innerhalb WeekDataProvider verwendet werden",
    );
  }
  return context;
};
