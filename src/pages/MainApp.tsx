import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dashboard } from "./Dashboard";
import { TimesheetHybrid } from "./TimesheetHybrid";
import { VacationRequestHybrid } from "./VacationRequestHybrid";
import { AdvancePaymentHybrid } from "./AdvancePaymentHybrid";
import { useTimesheetActions } from "../contexts/TimesheetActionsContext";
import { storage } from "../utils/storage";
import { logger } from "../services/logger";
import { Home, ClipboardList, Plus, Palmtree, Euro } from "lucide-react";

type TabType = "dashboard" | "timesheet" | "vacation" | "advancePayment";

interface MainAppProps {
  onLogout: () => void;
}

export const MainApp: React.FC<MainAppProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedWeek, setSelectedWeek] = useState<{
    year: number;
    week: number;
    sheetId?: number;
  } | null>(null);

  const employeeName = storage.getEmployeeName();
  const { createNewSheet } = useTimesheetActions();

  // Debug: Mitarbeitername überprüfen
  logger.debug('Employee name loaded', {
    component: 'MainApp',
    data: { employeeName, length: employeeName.length }
  });

  // Navigiere zu einer bestimmten Woche im Timesheet
  const handleNavigateToWeek = (
    year: number,
    week: number,
    sheetId?: number
  ) => {
    setSelectedWeek({ year, week, sheetId });
    setActiveTab("timesheet");
  };

  // Navigation Handler
  const handleNavigateToDashboard = () => {
    setActiveTab("dashboard");
    setSelectedWeek(null);
  };

  const handleNavigateToTimesheet = () => {
    setActiveTab("timesheet");
    setSelectedWeek(null);
  };

  const handleNavigateToVacation = () => {
    setActiveTab("vacation");
    setSelectedWeek(null);
  };

  const handleNavigateToAdvancePayment = () => {
    setActiveTab("advancePayment");
    setSelectedWeek(null);
  };

  // Handler für "Neuer Stundenzettel" - ruft createNewSheet aus TimesheetActionsContext auf
  const handleCreateNewSheet = () => {
    createNewSheet();
  };

  return (
    <div className="min-h-screen gradient-bg pb-20">
      {/* Content based on active tab */}
      {activeTab === "dashboard" && (
        <Dashboard
          employeeName={employeeName}
          onLogout={onLogout}
          onNavigateToWeek={handleNavigateToWeek}
          onNavigateToTimesheet={handleNavigateToTimesheet}
          onNavigateToVacation={handleNavigateToVacation}
          onNavigateToAdvancePayment={handleNavigateToAdvancePayment}
        />
      )}
      {activeTab === "timesheet" && (
        <TimesheetHybrid
          employeeName={employeeName}
          onLogout={handleNavigateToDashboard}
          initialWeek={selectedWeek}
        />
      )}
      {activeTab === "vacation" && (
        <VacationRequestHybrid employeeName={employeeName} />
      )}
      {activeTab === "advancePayment" && (
        <AdvancePaymentHybrid employeeName={employeeName} />
      )}

      {/* Dynamic Thumb-friendly Bottom Navigation - Fixed at bottom */}
      <div className="app-bottom-nav fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-50 safe-area-inset-bottom">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Dashboard: 4 Buttons (Übersicht, Stunden, Urlaub, Vorschuss) */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleNavigateToDashboard}
                className="app-nav-btn app-nav-btn-active flex flex-col items-center justify-center py-3 px-3 rounded-xl font-semibold transition-colors bg-primary-50 text-primary-700 border border-primary-200"
                aria-label={t("nav.overview")}
              >
                <Home className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("nav.overview")}</span>
              </button>
              <button
                onClick={handleNavigateToTimesheet}
                className="app-nav-btn flex flex-col items-center justify-center py-3 px-3 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("tabs.timesheet")}
              >
                <ClipboardList className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("nav.timesheet")}</span>
              </button>
              <button
                onClick={handleNavigateToVacation}
                className="app-nav-btn flex flex-col items-center justify-center py-3 px-3 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("tabs.vacation")}
              >
                <Palmtree className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("nav.vacation")}</span>
              </button>
              <button
                onClick={handleNavigateToAdvancePayment}
                className="app-nav-btn flex flex-col items-center justify-center py-3 px-3 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("tabs.advancePayment")}
              >
                <Euro className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("nav.advance")}</span>
              </button>
            </div>
          )}

          {/* Timesheet: 2 Buttons (Übersicht, Neuer Stundenzettel) */}
          {activeTab === "timesheet" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleNavigateToDashboard}
                className="app-nav-btn flex flex-col items-center justify-center py-4 px-4 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("nav.overview")}
              >
                <Home className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("nav.overview")}</span>
              </button>
              <button
                onClick={handleCreateNewSheet}
                className="app-nav-btn app-nav-btn-new flex flex-col items-center justify-center py-4 px-4 rounded-xl font-semibold transition-colors bg-emerald-50 text-emerald-700 border border-emerald-200"
                aria-label={t("timesheet.newSheet")}
              >
                <Plus className="mb-1 w-6 h-6" />
                <span className="text-xs">{t("timesheet.newSheet")}</span>
              </button>
            </div>
          )}

          {/* Vacation: 1 Button (Übersicht/Dashboard) */}
          {activeTab === "vacation" && (
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleNavigateToDashboard}
                className="app-nav-btn flex flex-row items-center justify-center gap-3 py-4 px-4 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("nav.overview")}
              >
                <Home className="w-6 h-6" />
                <span className="text-base">{t("nav.overview")}</span>
              </button>
            </div>
          )}

          {/* Advance Payment: 1 Button (Übersicht/Dashboard) */}
          {activeTab === "advancePayment" && (
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleNavigateToDashboard}
                className="app-nav-btn flex flex-row items-center justify-center gap-3 py-4 px-4 rounded-xl font-semibold transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                aria-label={t("nav.overview")}
              >
                <Home className="w-6 h-6" />
                <span className="text-base">{t("nav.overview")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
