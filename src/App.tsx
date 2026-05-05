import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { storage } from "./utils/storage";
import { Welcome } from "./pages/Welcome";
import { MainApp } from "./pages/MainApp";
import { AdminRoute } from "./pages/AdminRoute";
import { CustomerPortalRoute } from "./pages/CustomerPortalRoute";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { UpdateNotification } from "./components/UpdateNotification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { usePerformanceMonitoring } from "./utils/performance";
import { AppProviders } from "./contexts/AppProviders";
import {
  NotificationProvider,
  useNotification,
} from "./contexts/NotificationContext";
import { useConfig } from "./contexts/ConfigContext";
import { ToastContainer } from "./components/Toast";
import {
  apiService,
  type EmployeeSessionDto,
} from "./services/apiService";
import { logger } from "./services/logger";
import "./i18n";

function AppContent() {
  const { t } = useTranslation();
  const { error, notifications, removeNotification } = useNotification();
  const { isLoading: isConfigLoading } = useConfig();
  const [employeeSession, setEmployeeSession] = useState<EmployeeSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const migratedEmployeeWeeksRef = useRef<string>("");

  const isAdminRoute =
    currentPath === "/admin" ||
    currentPath === "/pro/admin" ||
    currentPath.endsWith("/admin");
  const isCustomerPortalRoute =
    currentPath === "/verwaltung" ||
    currentPath === "/pro/verwaltung" ||
    currentPath.endsWith("/verwaltung");

  usePerformanceMonitoring();

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    if (!storage.isAvailable()) {
      error(
        "LocalStorage ist nicht verfügbar. Die App funktioniert möglicherweise nicht korrekt.",
        5000,
      );
    }
  }, [error]);

  useEffect(() => {
    if (isConfigLoading || isAdminRoute || isCustomerPortalRoute) {
      if (!isConfigLoading) {
        setLoading(false);
      }
      return;
    }

    let isCancelled = false;

    const loadEmployeeSession = async () => {
      try {
        const response = await apiService.getEmployeeSession();
        const nextSession = response.data?.employee || null;

        if (!isCancelled) {
          setEmployeeSession(nextSession);
          if (nextSession?.display_name) {
            storage.setEmployeeName(nextSession.display_name);
          } else {
            storage.clearEmployeeName();
          }
        }
      } catch {
        if (!isCancelled) {
          setEmployeeSession(null);
          storage.clearEmployeeName();
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadEmployeeSession();

    return () => {
      isCancelled = true;
    };
  }, [isAdminRoute, isCustomerPortalRoute, isConfigLoading]);

  useEffect(() => {
    if (
      loading ||
      isConfigLoading ||
      isAdminRoute ||
      isCustomerPortalRoute ||
      !employeeSession?.display_name
    ) {
      return;
    }

    let isCancelled = false;
    const employeeId = employeeSession.id;
    const employeeName = employeeSession.display_name.trim();

    const migrateEmployeeWeeks = async () => {
      try {
        const migrationAlreadyCompleted =
          migratedEmployeeWeeksRef.current === String(employeeId) ||
          storage.hasCompletedBackendTimesheetMigration(employeeId);

        const storedWeeks = storage.getAllStoredWeeks().filter((weekData) => {
          const localEmployeeId = weekData.employeeId?.trim();
          if (localEmployeeId) {
            return localEmployeeId === String(employeeId);
          }
          return weekData.employeeName?.trim() === employeeName;
        });

        const pendingWeeks = storedWeeks.filter((weekData) =>
          storage.hasWeekPendingBackendSync(
            weekData.year,
            weekData.week,
            weekData.sheetId ?? 1,
          ),
        );

        const backendUpdatedAtBySheet = new Map<string, number>();
        const weekGroups = new Map<string, { year: number; week: number }>();
        storedWeeks.forEach((weekData) => {
          weekGroups.set(`${weekData.year}-${weekData.week}`, {
            year: weekData.year,
            week: weekData.week,
          });
        });

        for (const { year, week } of weekGroups.values()) {
          const listResponse = await apiService.listTimesheets<import("./types/weekdata.types").WeekData>({
            year,
            week,
          });
          if (!listResponse.success || !Array.isArray(listResponse.data)) {
            continue;
          }
          listResponse.data.forEach((sheet) => {
            const sheetId = Number(sheet.sheet_id ?? sheet.weekData?.sheetId ?? 1);
            const updatedAt = sheet.updated_at
              ? new Date(sheet.updated_at).getTime()
              : 0;
            backendUpdatedAtBySheet.set(`${year}-${week}-${sheetId}`, updatedAt);
          });
        }

        const staleOrMissingBackendWeeks = storedWeeks.filter((weekData) => {
          const sheetId = weekData.sheetId ?? 1;
          const backendUpdatedAt = backendUpdatedAtBySheet.get(
            `${weekData.year}-${weekData.week}-${sheetId}`,
          );
          if (backendUpdatedAt == null) {
            return true;
          }
          const localUpdatedAt = weekData.updatedAt
            ? new Date(weekData.updatedAt).getTime()
            : 0;
          return localUpdatedAt > backendUpdatedAt;
        });

        if (
          migrationAlreadyCompleted &&
          pendingWeeks.length === 0 &&
          staleOrMissingBackendWeeks.length === 0
        ) {
          migratedEmployeeWeeksRef.current = String(employeeId);
          return;
        }

        const weeksToSyncMap = new Map<string, (typeof storedWeeks)[number]>();
        const baseWeeksToSync = migrationAlreadyCompleted ? pendingWeeks : storedWeeks;
        [...baseWeeksToSync, ...staleOrMissingBackendWeeks].forEach((weekData) => {
          weeksToSyncMap.set(
            `${weekData.year}-${weekData.week}-${weekData.sheetId ?? 1}`,
            weekData,
          );
        });
        const weeksToSync = Array.from(weeksToSyncMap.values());

        const hasAmbiguousWeeks = weeksToSync.some(
          (weekData) => !weekData.employeeId?.trim(),
        );

        if (employeeSession.has_name_duplicates && hasAmbiguousWeeks) {
          migratedEmployeeWeeksRef.current = String(employeeId);
          logger.warn(
            "Skipped local timesheet migration because employee name is not unique",
            {
              component: "App",
              data: {
                employeeId,
                employeeName,
              },
            },
          );
          return;
        }

        let migratedCount = 0;
        for (const weekData of weeksToSync) {
          await apiService.saveTimesheet({
            weekData: {
              ...weekData,
              employeeId: String(employeeId),
              employeeName,
            },
            year: weekData.year,
            week: weekData.week,
            sheetId: weekData.sheetId ?? 1,
            displayName: employeeName,
          });
          storage.clearWeekPendingBackendSync(
            weekData.year,
            weekData.week,
            weekData.sheetId ?? 1,
          );
          migratedCount += 1;
        }

        storage.markBackendTimesheetMigrationComplete(employeeId);
        migratedEmployeeWeeksRef.current = String(employeeId);

        if (!isCancelled) {
          logger.info("Local timesheets synchronized to backend", {
            component: "App",
            data: {
              employeeName,
              migratedCount,
              pendingCount: pendingWeeks.length,
              staleOrMissingBackendCount: staleOrMissingBackendWeeks.length,
            },
          });
        }
      } catch (migrationError) {
        if (!isCancelled) {
          logger.warn("Local timesheet migration failed", {
            component: "App",
            data: {
              employeeName,
              error:
                migrationError instanceof Error
                  ? migrationError.message
                  : String(migrationError),
            },
          });
        }
      }
    };

    void migrateEmployeeWeeks();

    return () => {
      isCancelled = true;
    };
  }, [employeeSession, isAdminRoute, isCustomerPortalRoute, isConfigLoading, loading]);

  useEffect(() => {
    const enableTheme = Boolean(employeeSession) || isAdminRoute || isCustomerPortalRoute;
    window.dispatchEvent(
      new CustomEvent("app:set-theme-enabled", {
        detail: { enabled: enableTheme },
      }),
    );
  }, [employeeSession, isAdminRoute, isCustomerPortalRoute]);

  const handleEmployeeAuthenticated = (session: EmployeeSessionDto) => {
    storage.setEmployeeName(session.display_name);
    storage.setEmployeeProfileId(session.id);
    setEmployeeSession(session);
  };

  const handleLogout = async () => {
    try {
      await apiService.logoutEmployee();
    } catch {
      // Lokalen Zustand trotzdem leeren
    }

    migratedEmployeeWeeksRef.current = "";
    storage.clearEmployeeName();
    storage.clearEmployeeProfileId();
    setEmployeeSession(null);
  };

  if (loading || isConfigLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary-300/30 rounded-full mx-auto" />
          </div>
          <div className="card-glass px-8 py-6 mx-auto max-w-sm">
            <h1 className="text-2xl font-bold text-gradient mb-2">
              {t("welcome.title")}
            </h1>
            <p className="text-slate-600 font-medium">{t("status.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
        <AdminRoute />
      </ErrorBoundary>
    );
  }

  if (isCustomerPortalRoute) {
    return (
      <ErrorBoundary>
        <CustomerPortalRoute />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <ToastContainer
          notifications={notifications}
          onClose={removeNotification}
        />
        <OfflineIndicator />
        <UpdateNotification />
        {employeeSession ? (
          <AppProviders>
            <MainApp
              employeeName={employeeSession.display_name}
              onLogout={() => {
                void handleLogout();
              }}
            />
          </AppProviders>
        ) : (
          <Welcome onAuthenticated={handleEmployeeAuthenticated} />
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
