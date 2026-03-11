/**
 * AppProviders - Zentrale Provider-Komposition
 *
 * Kombiniert alle Contexts in der richtigen Reihenfolge:
 * 1. TimesheetActionsProvider (keine Dependencies, wird von MainApp & TimesheetHybrid genutzt)
 * 2. TimeCalculationProvider (keine Dependencies)
 * 3. SignatureWorkflowProvider (keine Dependencies)
 * 4. ShiftConfigProvider (keine Dependencies)
 * 5. WeekDataProvider (nutzt 2-4)
 *
 * Phase 1 Refactoring
 */

import React from "react";
import { TimesheetActionsProvider } from "./TimesheetActionsContext";
import { TimeCalculationProvider } from "./TimeCalculationContext";
import { SignatureWorkflowProvider } from "./SignatureWorkflowContext";
import { ShiftConfigProvider } from "./ShiftConfigContext";
import { WeekDataProvider } from "./WeekDataContext";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper für alle App-Contexts (neue Architektur)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <TimesheetActionsProvider>
      <TimeCalculationProvider>
      <SignatureWorkflowProvider>
        <ShiftConfigProvider>
          <WeekDataProvider>{children}</WeekDataProvider>
        </ShiftConfigProvider>
      </SignatureWorkflowProvider>
      </TimeCalculationProvider>
    </TimesheetActionsProvider>
  );
};
