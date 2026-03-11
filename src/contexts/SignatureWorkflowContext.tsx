/**
 * SignatureWorkflowContext - Unterschriften-Workflow
 *
 * Verantwortlichkeiten:
 * - Mitarbeiter-Unterschrift hinzufügen/entfernen
 * - Vorarbeiter-Unterschrift hinzufügen/entfernen
 * - Status-Transitionen (OPEN → EMPLOYEE_SIGNED → FOREMAN_SIGNED_FULL)
 * - Validierung (Reihenfolge, Berechtigungen)
 *
 * Extrahiert aus WeekDataContext (Phase 1 Refactoring)
 */

import React, { createContext, useContext, useCallback } from "react";
import type { WeekData } from "../types/weekdata.types";
import {
  transitionToEmployeeSigned,
  transitionToForemanSigned,
  transitionToPendingReview,
} from "../utils/timesheetMigration";

interface SignatureWorkflowContextType {
  /**
   * Fügt eine Unterschrift hinzu (Mitarbeiter oder Vorarbeiter)
   * @param weekData Aktuelle Wochendaten
   * @param type Art der Unterschrift
   * @param signatureData Base64-codierte Signatur
   * @param name Name des Unterzeichners (für Vorarbeiter)
   * @returns Aktualisierte Wochendaten mit Unterschrift
   * @throws Error wenn Validierung fehlschlägt
   */
  addSignature: (
    weekData: WeekData,
    type: "employee" | "supervisor",
    signatureData: string,
    name?: string
  ) => WeekData;

  /**
   * Entfernt eine Unterschrift
   * @param weekData Aktuelle Wochendaten
   * @param type Art der Unterschrift
   * @returns Aktualisierte Wochendaten ohne Unterschrift
   * @throws Error wenn Woche gesperrt ist
   */
  clearSignature: (
    weekData: WeekData,
    type: "employee" | "supervisor"
  ) => WeekData;

  /**
   * Setzt Status auf PENDING_REVIEW und sperrt das Dokument.
   * Nur möglich wenn Status === EMPLOYEE_SIGNED.
   * @param weekData Wochendaten
   * @param recipientEmail E-Mail-Adresse des Prüfers (für Audit-Trail)
   * @returns Aktualisierte Wochendaten mit PENDING_REVIEW Status
   */
  sendForExternalReview: (weekData: WeekData, recipientEmail: string) => WeekData;

  /**
   * Prüft ob Vorarbeiter unterschreiben kann
   * @param weekData Wochendaten
   * @returns true wenn Vorarbeiter unterschreiben darf
   */
  canSupervisorSign: (weekData: WeekData) => boolean;

  /**
   * Prüft ob Mitarbeiter unterschreiben kann
   * @param weekData Wochendaten
   * @returns true wenn Mitarbeiter unterschreiben darf
   */
  canEmployeeSign: (weekData: WeekData) => boolean;
}

const SignatureWorkflowContext = createContext<
  SignatureWorkflowContextType | undefined
>(undefined);

export const SignatureWorkflowProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  /**
   * Unterschrift hinzufügen
   */
  const addSignature = useCallback(
    (
      weekData: WeekData,
      type: "employee" | "supervisor",
      signatureData: string,
      name?: string
    ): WeekData => {
      if (!weekData) {
        throw new Error("Keine Wochendaten vorhanden");
      }

      // Woche gesperrt?
      if (weekData.locked && type === "employee") {
        throw new Error("Woche ist gesperrt und kann nicht unterschrieben werden");
      }

      let updatedWeek: WeekData;

      if (type === "employee") {
        // Mitarbeiter-Unterschrift: Transition zu EMPLOYEE_SIGNED
        updatedWeek = transitionToEmployeeSigned(weekData, signatureData);
      } else if (type === "supervisor") {
        // Vorarbeiter-Unterschrift: Validierung
        if (!weekData.employeeSignature) {
          throw new Error(
            "Mitarbeiter muss zuerst unterschreiben bevor der Vorarbeiter unterschreiben kann."
          );
        }

        if (weekData.status !== "EMPLOYEE_SIGNED") {
          throw new Error(
            "Vorarbeiter kann nur unterschreiben wenn Status EMPLOYEE_SIGNED ist"
          );
        }

        // Transition zu FOREMAN_SIGNED_FULL
        updatedWeek = transitionToForemanSigned(
          weekData,
          signatureData,
          name || "Unbekannt"
        );
      } else {
        throw new Error(`Unbekannter Unterschrifts-Typ: ${type}`);
      }

      return updatedWeek;
    },
    []
  );

  /**
   * Unterschrift löschen
   */
  const clearSignature = useCallback(
    (weekData: WeekData, type: "employee" | "supervisor"): WeekData => {
      if (!weekData) {
        throw new Error("Keine Wochendaten vorhanden");
      }

      // Gesperrte Wochen können nicht geändert werden
      if (weekData.locked) {
        throw new Error("Gesperrte Woche kann nicht bearbeitet werden");
      }

      const updatedWeek = { ...weekData };

      if (type === "employee") {
        // Mitarbeiter-Unterschrift löschen → Beide Unterschriften löschen
        updatedWeek.employeeSignature = undefined;
        updatedWeek.supervisorSignature = undefined;
        updatedWeek.locked = false;
        updatedWeek.status = "OPEN";
      } else if (type === "supervisor") {
        // Vorarbeiter-Unterschrift löschen → Nur Vorarbeiter-Unterschrift
        updatedWeek.supervisorSignature = undefined;
        updatedWeek.locked = false;
        updatedWeek.status = "EMPLOYEE_SIGNED";
      }

      return updatedWeek;
    },
    []
  );

  /**
   * Dokument zur externen Prüfung senden (Status → PENDING_REVIEW, locked = true)
   */
  const sendForExternalReview = useCallback(
    (weekData: WeekData, recipientEmail: string): WeekData => {
      if (!weekData) {
        throw new Error("Keine Wochendaten vorhanden");
      }
      return transitionToPendingReview(weekData, recipientEmail);
    },
    []
  );

  /**
   * Kann Vorarbeiter unterschreiben?
   */
  const canSupervisorSign = useCallback((weekData: WeekData): boolean => {
    if (!weekData) return false;

    return (
      weekData.status === "EMPLOYEE_SIGNED" &&
      !!weekData.employeeSignature &&
      !weekData.supervisorSignature
    );
  }, []);

  /**
   * Kann Mitarbeiter unterschreiben?
   */
  const canEmployeeSign = useCallback((weekData: WeekData): boolean => {
    if (!weekData) return false;

    // Mitarbeiter kann unterschreiben wenn:
    // - Status ist OPEN
    // - Woche ist nicht gesperrt
    // - Noch keine Mitarbeiter-Unterschrift vorhanden
    return (
      weekData.status === "OPEN" &&
      !weekData.locked &&
      !weekData.employeeSignature
    );
  }, []);

  const value: SignatureWorkflowContextType = {
    addSignature,
    clearSignature,
    sendForExternalReview,
    canSupervisorSign,
    canEmployeeSign,
  };

  return (
    <SignatureWorkflowContext.Provider value={value}>
      {children}
    </SignatureWorkflowContext.Provider>
  );
};

/**
 * Hook für Unterschriften-Workflow-Zugriff
 */
export const useSignatureWorkflow = () => {
  const context = useContext(SignatureWorkflowContext);
  if (!context) {
    throw new Error(
      "useSignatureWorkflow muss innerhalb SignatureWorkflowProvider verwendet werden"
    );
  }
  return context;
};
