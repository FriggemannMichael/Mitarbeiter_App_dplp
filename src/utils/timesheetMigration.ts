/**
 * Migration-Utilities für Timesheet-Logik
 * Konvertiert alte Datenstrukturen in das neue Format gemäß TIMESHEET-LOGIC-SPEC.json
 */

import { WeekData, DayData } from "../types/weekdata.types";

/**
 * Migriert WeekData von altem Format (nur locked) zu neuem Format (mit status)
 * Backward-compatible: Behält locked-Feld für Kompatibilität bei
 */
export function migrateWeekDataToStatus(week: WeekData): WeekData {
  // Wenn bereits ein status vorhanden ist, keine Migration nötig
  if (week.status) {
    return week;
  }

  // Bestimme Status basierend auf Unterschriften und locked-Status
  let status: WeekData["status"] = "OPEN";

  if (week.locked) {
    // Wenn gesperrt, prüfe welche Unterschriften vorhanden sind
    if (week.supervisorSignature) {
      status = "FOREMAN_SIGNED_FULL";
    } else if (week.employeeSignature) {
      status = "EMPLOYEE_SIGNED";
    } else {
      // Locked aber ohne Unterschrift (sollte nicht vorkommen, aber sicher ist sicher)
      status = "EMPLOYEE_SIGNED";
    }
  } else {
    // Wenn nicht gesperrt, prüfe ob Mitarbeiter unterschrieben hat
    if (week.employeeSignature) {
      status = "EMPLOYEE_SIGNED";
    } else {
      status = "OPEN";
    }
  }

  return {
    ...week,
    status,
    // locked bleibt für Backward-Compatibility erhalten
  };
}

/**
 * Migriert DayData und fügt fehlende Felder hinzu
 */
export function migrateDayData(day: DayData, weekData?: WeekData): DayData {
  const migratedDay: DayData = { ...day };

  // Status hinzufügen falls nicht vorhanden
  if (!migratedDay.status) {
    // Wenn der Tag Daten hat (from/to), ist er mindestens OPEN
    if (day.from || day.to) {
      migratedDay.status = "OPEN";
    }
  }

  // locked hinzufügen basierend auf Week-Status
  if (migratedDay.locked === undefined && weekData) {
    // Wenn die Woche gesperrt ist, sind auch alle Tage gesperrt
    migratedDay.locked = weekData.locked || false;
  }

  // overridden-Flag hinzufügen (Standard: false)
  if (migratedDay.overridden === undefined) {
    migratedDay.overridden = false;
  }

  return migratedDay;
}

/**
 * Migriert alle Tage einer Woche
 */
export function migrateWeekDays(week: WeekData): WeekData {
  return {
    ...week,
    days: week.days.map((day) => migrateDayData(day, week)),
  };
}

/**
 * Vollständige Migration einer WeekData-Struktur
 * Wandelt alte Struktur in neue Struktur um
 */
export function migrateWeekDataComplete(week: WeekData): WeekData {
  // Schritt 1: Status-Migration
  let migratedWeek = migrateWeekDataToStatus(week);

  // Schritt 2: Tages-Migration
  migratedWeek = migrateWeekDays(migratedWeek);

  // Schritt 3: Metadaten aktualisieren
  migratedWeek = {
    ...migratedWeek,
    updatedAt: new Date().toISOString(),
    version: (migratedWeek.version || 0) + 1,
  };

  return migratedWeek;
}

/**
 * Prüft ob eine WeekData-Struktur das alte Format hat und Migration benötigt
 */
export function needsMigration(week: WeekData): boolean {
  // Prüfe ob status fehlt
  if (!week.status) {
    return true;
  }

  // Prüfe ob Tage DayData-Felder fehlen
  const firstDay = week.days[0];
  if (
    firstDay &&
    (firstDay.status === undefined || firstDay.locked === undefined)
  ) {
    return true;
  }

  return false;
}

/**
 * Batch-Migration für mehrere Wochen
 */
export function migrateMultipleWeeks(weeks: WeekData[]): WeekData[] {
  return weeks.map((week) => {
    if (needsMigration(week)) {
      return migrateWeekDataComplete(week);
    }
    return week;
  });
}

/**
 * Status-Transition: Von OPEN zu EMPLOYEE_SIGNED
 */
export function transitionToEmployeeSigned(
  week: WeekData,
  signature: string
): WeekData {
  if (week.status !== "OPEN" && week.status !== undefined) {
    throw new Error(
      `Invalid transition: Cannot sign from status ${week.status}`
    );
  }

  return {
    ...week,
    status: "EMPLOYEE_SIGNED",
    employeeSignature: signature,
    updatedAt: new Date().toISOString(),
    version: (week.version || 0) + 1,
  };
}

/**
 * Status-Transition: Von EMPLOYEE_SIGNED zu FOREMAN_SIGNED_FULL
 */
export function transitionToForemanSigned(
  week: WeekData,
  signature: string,
  foremanName: string
): WeekData {
  if (week.status !== "EMPLOYEE_SIGNED") {
    throw new Error(
      `Invalid transition: Cannot sign by foreman from status ${week.status}. Employee must sign first.`
    );
  }

  // Alle Tage als bestätigt markieren
  const updatedDays = week.days.map((day) => ({
    ...day,
    status: "FOREMAN_SIGNED" as const,
    locked: true,
    foremanSignature: signature,
    foremanName: foremanName,
  }));

  return {
    ...week,
    status: "FOREMAN_SIGNED_FULL",
    locked: true, // Backward-Compatibility
    supervisorSignature: signature,
    supervisorName: foremanName,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
    version: (week.version || 0) + 1,
  };
}

/**
 * Status-Transition: Einzelnen Tag vom Vorarbeiter bestätigen lassen (Partial)
 */
export function transitionDayToForemanSigned(
  week: WeekData,
  dayDate: string,
  signature: string,
  foremanName: string
): WeekData {
  if (week.status !== "EMPLOYEE_SIGNED") {
    throw new Error(
      `Invalid transition: Cannot sign day by foreman from status ${week.status}. Employee must sign first.`
    );
  }

  // Finde den Tag und aktualisiere ihn
  const updatedDays = week.days.map((day) => {
    if (day.date === dayDate) {
      return {
        ...day,
        status: "FOREMAN_SIGNED" as const,
        locked: true,
        foremanSignature: signature,
        foremanName: foremanName,
      };
    }
    return day;
  });

  // Prüfe ob alle Tage bestätigt sind
  const allDaysSigned = updatedDays.every(
    (day) => day.status === "FOREMAN_SIGNED" || day.absence !== undefined
  );

  return {
    ...week,
    status: allDaysSigned ? "FOREMAN_SIGNED_FULL" : "FOREMAN_SIGNED_PARTIAL",
    locked: allDaysSigned, // Nur komplett sperren wenn alle Tage bestätigt
    supervisorSignature: allDaysSigned ? signature : week.supervisorSignature,
    supervisorName: allDaysSigned ? foremanName : week.supervisorName,
    days: updatedDays,
    updatedAt: new Date().toISOString(),
    version: (week.version || 0) + 1,
  };
}

/**
 * Status-Transition: Von EMPLOYEE_SIGNED zu PENDING_REVIEW
 * Dokument wird sofort gesperrt, kein Vorarbeiter-Signaturfeld mehr zugänglich.
 */
export function transitionToPendingReview(
  week: WeekData,
  recipientEmail: string
): WeekData {
  if (week.status !== "EMPLOYEE_SIGNED") {
    throw new Error(
      `Invalid transition: Cannot send for review from status ${week.status}. Employee must sign first.`
    );
  }

  return {
    ...week,
    status: "PENDING_REVIEW",
    locked: true,
    days: week.days.map((day) => ({
      ...day,
      locked: true,
    })),
    reviewSentAt: new Date().toISOString(),
    reviewRecipientEmail: recipientEmail,
    updatedAt: new Date().toISOString(),
    version: (week.version || 0) + 1,
  };
}

/**
 * Entsperren einer Woche (Admin/Support-Funktion)
 */
export function unlockWeek(week: WeekData): WeekData {
  return {
    ...week,
    status: "OPEN",
    locked: false,
    employeeSignature: undefined,
    supervisorSignature: undefined,
    supervisorName: undefined,
    days: week.days.map((day) => ({
      ...day,
      status: "OPEN",
      locked: false,
      employeeSignature: undefined,
      foremanSignature: undefined,
      foremanName: undefined,
    })),
    updatedAt: new Date().toISOString(),
    version: (week.version || 0) + 1,
  };
}

/**
 * Prüft ob ein Tag editierbar ist
 *
 * WICHTIG: Für Multi-Sheet Support sollte ein Tag editierbar sein,
 * solange er selbst nicht gesperrt ist - unabhängig vom Wochen-Status!
 * Der Wochen-Status bezieht sich nur auf das AKTUELLE Sheet, nicht auf andere Sheets.
 */
export function isDayEditable(
  day: DayData,
  weekStatus?: WeekData["status"]
): boolean {
  // Ab PENDING_REVIEW und bei komplett bestätigter Woche ist alles gesperrt
  if (weekStatus === "PENDING_REVIEW" || weekStatus === "FOREMAN_SIGNED_FULL") {
    return false;
  }

  // Tag ist individuell gesperrt -> nicht editierbar
  if (day.locked) {
    return false;
  }

  // Tag-Status ist FOREMAN_SIGNED -> nicht editierbar
  if (day.status === "FOREMAN_SIGNED") {
    return false;
  }

  // Für offene Wochen: Leere Tage sind editierbar
  const hasTimeData = day.from && day.to && day.decimal !== "0.00";
  if (!hasTimeData) {
    return true;
  }

  // Sonst editierbar
  return true;
}

/**
 * Prüft ob eine Woche editierbar ist
 */
export function isWeekEditable(week: WeekData): boolean {
  // Woche ist gesperrt -> nicht editierbar
  if (week.locked) {
    return false;
  }

  // Woche hat abgeschlossenen Status -> nicht editierbar
  if (
    week.status === "FOREMAN_SIGNED_FULL" ||
    week.status === "PENDING_REVIEW"
  ) {
    return false;
  }

  // Sonst editierbar
  return true;
}
