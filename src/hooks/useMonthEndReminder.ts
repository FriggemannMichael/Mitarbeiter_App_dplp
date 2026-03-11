import { useEffect, useRef } from "react";
import { storage, weekUtils } from "../utils/storage";

interface MonthEndReminderOptions {
  onMonthEndDetected: (unsignedWeeks: Array<{ year: number; week: number }>) => void;
  enabled?: boolean;
  daysBeforeMonthEnd?: number; // Wie viele Tage vor Monatsende soll erinnert werden
}

/**
 * Hook: Erkennt das Monatsende und erinnert an unsignierte Stundenzettel
 *
 * Features:
 * - Prüft täglich ob Monatsende naht
 * - Findet alle unsignierten Stundenzettel des aktuellen Monats
 * - Zeigt Erinnerung nur einmal pro Tag
 * - Konfigurierbar: X Tage vor Monatsende
 */
export const useMonthEndReminder = ({
  onMonthEndDetected,
  enabled = true,
  daysBeforeMonthEnd = 3,
}: MonthEndReminderOptions) => {
  const lastCheckRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const checkMonthEnd = () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Prüfe nur einmal pro Tag
      if (lastCheckRef.current === todayStr) {
        return;
      }

      lastCheckRef.current = todayStr;

      // Berechne letzten Tag des aktuellen Monats
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const currentDay = today.getDate();

      // Prüfe ob wir innerhalb der Warntage sind
      const daysUntilMonthEnd = lastDayOfMonth - currentDay;

      if (daysUntilMonthEnd <= daysBeforeMonthEnd && daysUntilMonthEnd >= 0) {
        // Finde alle unsignierten Stundenzettel des aktuellen Monats
        const unsignedWeeks = findUnsignedWeeksInCurrentMonth();

        if (unsignedWeeks.length > 0) {
          console.log(
            `[MonthEndReminder] ${unsignedWeeks.length} unsignierte Wochen gefunden`,
            unsignedWeeks
          );
          onMonthEndDetected(unsignedWeeks);
        }
      }
    };

    // Sofort beim Laden prüfen
    checkMonthEnd();

    // Dann täglich um Mitternacht prüfen (alle 60 Minuten checken)
    const interval = setInterval(checkMonthEnd, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, daysBeforeMonthEnd, onMonthEndDetected]);
};

/**
 * Findet alle Wochen des aktuellen Monats, die nicht signiert sind
 */
function findUnsignedWeeksInCurrentMonth(): Array<{ year: number; week: number }> {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const unsignedWeeks: Array<{ year: number; week: number }> = [];

  // Alle gespeicherten Wochen durchgehen
  const weekKeys = storage.getAllWeekKeys();

  weekKeys.forEach((key) => {
    // Parse key: "wpdl_week_2025_1_sheet_1" oder "wpdl_week_2025_1"
    const parts = key.split("_");
    if (parts.length < 3) return;

    const year = parseInt(parts[2]);
    const week = parseInt(parts[3]);

    // Hole Wochendaten
    const weekData = storage.getWeekData(year, week, 1); // Sheet 1 als Standard
    if (!weekData) return;

    // Prüfe ob die Woche zum aktuellen Monat gehört
    const weekDays = weekUtils.getWeekDays(year, week);
    const hasCurrentMonthDay = weekDays.some((date) => {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    if (!hasCurrentMonthDay) return;

    // Prüfe ob Woche unsigniert ist (OPEN status oder undefined)
    const status = weekData.status;
    const isUnsigned =
      !status ||
      status === "OPEN" ||
      (status !== "EMPLOYEE_SIGNED" &&
        status !== "FOREMAN_SIGNED_PARTIAL" &&
        status !== "FOREMAN_SIGNED_FULL");

    if (isUnsigned) {
      // Prüfe ob mindestens ein Tag ausgefüllt ist (sonst irrelevant)
      const hasFilledDays = weekData.days.some(
        (day) => day.from || day.to || day.hours !== "00:00"
      );

      if (hasFilledDays) {
        unsignedWeeks.push({ year, week });
      }
    }
  });

  return unsignedWeeks.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });
}
