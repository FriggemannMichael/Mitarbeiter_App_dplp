import { useState, useEffect, useRef } from "react";
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
import { apiService } from "./services/apiService";
import { logger } from "./services/logger";
import "./i18n"; // i18n initialisieren

// Innere App-Komponente (benötigt NotificationProvider)
function AppContent() {
  const { t } = useTranslation();
  const { error, notifications, removeNotification } = useNotification();
  const { isLoading: isConfigLoading } = useConfig();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const initializedEmployeeDeviceRef = useRef<string>("");
  const migratedEmployeeWeeksRef = useRef<string>("");
  const isAdminRoute =
    currentPath === "/admin" ||
    currentPath === "/pro/admin" ||
    currentPath.endsWith("/admin");
  const isCustomerPortalRoute =
    currentPath === "/verwaltung" ||
    currentPath === "/pro/verwaltung" ||
    currentPath.endsWith("/verwaltung");

  // Performance-Tracking
  usePerformanceMonitoring();

  // URL-Änderungen überwachen (für /admin Route)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Onboarding-Status prüfen
  useEffect(() => {
    const checkOnboardingStatus = () => {
      const hasConsent = storage.getConsent();
      const hasName = storage.getEmployeeName();

      // Benutzer ist onboarded wenn beide Bedingungen erfüllt sind
      setIsOnboarded(hasConsent && hasName.length > 0);
      setLoading(false);
    };

    // LocalStorage-Verfügbarkeit prüfen
    if (!storage.isAvailable()) {
      error(
        "LocalStorage ist nicht verfügbar. Die App funktioniert möglicherweise nicht korrekt.",
        5000
      );
    }

    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (
      loading ||
      isConfigLoading ||
      isAdminRoute ||
      isCustomerPortalRoute ||
      !isOnboarded
    ) {
      return;
    }

    const employeeName = storage.getEmployeeName().trim();
    if (!employeeName) {
      return;
    }

    if (initializedEmployeeDeviceRef.current === employeeName) {
      return;
    }

    let isCancelled = false;

    const initializeEmployeeDevice = async () => {
      try {
        apiService.resetEmployeeTimesheetSyncSupport();
        const response = await apiService.initEmployeeDevice(employeeName);
        if (!response.success) {
          throw new Error(response.error || "Employee device init failed");
        }

        if (!isCancelled) {
          initializedEmployeeDeviceRef.current = employeeName;
          logger.info("Employee device initialized", {
            component: "App",
            data: {
              employeeName,
              created: response.data?.created ?? false,
              deviceId: response.data?.device?.id,
            },
          });

          if (
            migratedEmployeeWeeksRef.current !== employeeName &&
            !storage.hasCompletedBackendTimesheetMigration(employeeName)
          ) {
            const storedWeeks = storage.getAllStoredWeeks().filter(
              (weekData) => weekData.employeeName?.trim() === employeeName,
            );

            if (storedWeeks.length > 0) {
              let migratedCount = 0;

              for (const weekData of storedWeeks) {
                await apiService.saveTimesheet({
                  weekData,
                  year: weekData.year,
                  week: weekData.week,
                  sheetId: weekData.sheetId ?? 1,
                  displayName: employeeName,
                });
                migratedCount += 1;
              }

              storage.markBackendTimesheetMigrationComplete(employeeName);
              migratedEmployeeWeeksRef.current = employeeName;
              logger.info("Local timesheets migrated to backend", {
                component: "App",
                data: {
                  employeeName,
                  migratedCount,
                },
              });
            } else {
              storage.markBackendTimesheetMigrationComplete(employeeName);
              migratedEmployeeWeeksRef.current = employeeName;
            }
          } else {
            migratedEmployeeWeeksRef.current = employeeName;
          }
        }
      } catch (error) {
        logger.warn("Employee device initialization failed", {
          component: "App",
          data: {
            employeeName,
            error:
              error instanceof Error ? error.message : String(error),
          },
        });
      }
    };

    initializeEmployeeDevice();

    return () => {
      isCancelled = true;
    };
  }, [isAdminRoute, isCustomerPortalRoute, isOnboarded, isConfigLoading, loading]);

  // Dark Mode nur im App-Bereich aktivieren (nicht im Welcome/Login-Bereich)
  useEffect(() => {
    const enableTheme = isOnboarded || isAdminRoute || isCustomerPortalRoute;
    window.dispatchEvent(
      new CustomEvent("app:set-theme-enabled", {
        detail: { enabled: enableTheme },
      })
    );
  }, [isOnboarded, isAdminRoute, isCustomerPortalRoute]);

  // Onboarding abschließen
  const handleOnboardingComplete = () => {
    setIsOnboarded(true);
  };

  // Logout (zurück zum Welcome-Screen)
  const handleLogout = () => {
    storage.setConsent(false);
    setIsOnboarded(false);
  };

  // Loading-Screen
  if (loading || isConfigLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary-300/30 rounded-full mx-auto"></div>
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

  // Admin-Route prüfen (berücksichtigt base path /pro/)
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
      <AppProviders>
        <div className="App">
          {/* Toast-Notifications */}
          <ToastContainer
            notifications={notifications}
            onClose={removeNotification}
          />
          {/* PWA-Komponenten */}
          <OfflineIndicator />
          <UpdateNotification />
          {/* PWA / App UI */}
          {isOnboarded ? (
            <MainApp onLogout={handleLogout} />
          ) : (
            <Welcome onComplete={handleOnboardingComplete} />
          )}
        </div>
      </AppProviders>
    </ErrorBoundary>
  );
}

// Haupt-App mit NotificationProvider
function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
