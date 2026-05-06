import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  Menu,
  Moon,
  Sun,
  Languages,
  LogOut,
  Trash2,
  Phone,
  Mail,
  Building,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { storage, weekUtils } from "../utils/storage";
import { useConfig } from "../contexts/ConfigContext";
import { PageHeader } from "../components/PageHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { isFeatureEnabled } from "../utils/featureFlags";
import { apiService } from "../services/apiService";
import type { WeekData } from "../types/weekdata.types";

type DashboardSheetSummary = {
  sheetId: number;
  customer: string;
  hours: number;
  locked: boolean;
};

type DashboardWeekSummary = {
  week: number;
  year: number;
  sheets: DashboardSheetSummary[];
  totalHours: number;
};

interface DashboardProps {
  employeeName: string;
  onLogout?: () => void;
  onNavigateToWeek?: (year: number, week: number, sheetId?: number) => void;
  onNavigateToTimesheet?: () => void;
  onNavigateToVacation?: () => void;
  onNavigateToAdvancePayment?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  employeeName,
  onLogout,
  onNavigateToWeek,
}) => {
  const { t, i18n } = useTranslation();
  const { config, isLoading: isConfigLoading } = useConfig();
  const showSickDashboardCard = isFeatureEnabled(
    config?.technical,
    "dashboard_show_sick",
    true
  );
  const showVacationDashboardCard = isFeatureEnabled(
    config?.technical,
    "dashboard_show_vacation",
    true
  );
  const [showMenu, setShowMenu] = useState(false);
  const [backendWeeks, setBackendWeeks] = useState<WeekData[] | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    storage.getTheme()
  );
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPhoneUpdateModal, setShowPhoneUpdateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [phoneUpdatePin, setPhoneUpdatePin] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [phoneUpdateError, setPhoneUpdateError] = useState("");
  const [phoneUpdateSuccess, setPhoneUpdateSuccess] = useState("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<{
    week: number;
    year: number;
    sheets: DashboardSheetSummary[];
    totalHours: number;
  } | null>(null);

  const handleDeleteAllData = () => {
    storage.clearAllData();
    window.location.reload();
  };

  const handleUpdatePhoneNumber = async () => {
    setPhoneUpdateError("");
    setPhoneUpdateSuccess("");

    const normalizedPhoneNumber = newPhoneNumber.trim();
    const normalizedPin = phoneUpdatePin.trim();

    if (!normalizedPhoneNumber) {
      setPhoneUpdateError(t("settings.phoneUpdate.requiredPhone") || "Bitte geben Sie eine neue Handynummer ein.");
      return;
    }
    if (!/^\d{4}$/.test(normalizedPin)) {
      setPhoneUpdateError(t("settings.phoneUpdate.requiredPin") || "Bitte geben Sie Ihre 4-stellige PIN ein.");
      return;
    }

    setIsUpdatingPhone(true);
    try {
      const response = await apiService.updateEmployeePhone({
        phoneNumber: normalizedPhoneNumber,
        pin: normalizedPin,
      });
      if (!response.success) {
        throw new Error(response.error || (t("settings.phoneUpdate.error") || "Handynummer konnte nicht geändert werden."));
      }

      setPhoneUpdateSuccess(
        t("settings.phoneUpdate.success") || "Handynummer wurde erfolgreich aktualisiert.",
      );
      setPhoneUpdatePin("");
      setNewPhoneNumber("");
    } catch (updateError) {
      setPhoneUpdateError(
        updateError instanceof Error
          ? updateError.message
          : t("settings.phoneUpdate.error") || "Handynummer konnte nicht geändert werden.",
      );
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const availableLanguages = [
    { code: "de", label: "Deutsch" },
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "ro", label: "Română" },
    { code: "pl", label: "Polski" },
    { code: "ru", label: "Русский" },
    { code: "uk", label: "Українська" },
    { code: "bg", label: "Български" },
    { code: "ar", label: "العربية" },
    { code: "fa", label: "فارسی" },
  ];
  const currentLanguageCode =
    availableLanguages.find((lang) => i18n.language.startsWith(lang.code))
      ?.code ?? "de";

  const handleToggleTheme = () => {
    const nextMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
    storage.setTheme(nextMode);
    window.dispatchEvent(
      new CustomEvent("app:set-theme", { detail: { mode: nextMode } })
    );
  };

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    storage.setLanguage(languageCode);
  };

  // Aktuelle Woche vom System holen (nutzt weekUtils für korrekte ISO 8601 Berechnung)
  const currentWeekData = weekUtils.getCurrentWeek();
  const currentWeek = currentWeekData.week;
  const currentYear = currentWeekData.year;

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    let isCancelled = false;

    const loadDashboardWeeks = async () => {
      try {
        const response = await apiService.listTimesheets<WeekData>({
          limit: 64,
        });
        if (!response.success || !Array.isArray(response.data)) {
          return;
        }

        const weeks = response.data
          .map((item) => item.weekData)
          .filter((weekData): weekData is WeekData => Boolean(weekData));

        weeks.forEach((weekData) => {
          storage.setWeekData(
            weekData.year,
            weekData.week,
            weekData as import("../utils/storage").WeekData,
            weekData.sheetId ?? 1,
          );
        });

        if (!isCancelled) {
          setBackendWeeks(weeks);
        }
      } catch {
        // localStorage fallback remains active
      }
    };

    void loadDashboardWeeks();

    return () => {
      isCancelled = true;
    };
  }, [isConfigLoading]);

  const localStoredWeeks = useMemo(
    () =>
      storage
      .getAllStoredWeeks()
      .filter((week) => week.employeeName === employeeName),
    [employeeName],
  );

  const sourceWeeks = useMemo(() => {
    if (backendWeeks === null) {
      return localStoredWeeks;
    }

    const mergedWeeks = new Map<string, WeekData>();

    localStoredWeeks.forEach((week) => {
      mergedWeeks.set(`${week.year}-${week.week}-${week.sheetId ?? 1}`, week);
    });

    backendWeeks.forEach((week) => {
      mergedWeeks.set(`${week.year}-${week.week}-${week.sheetId ?? 1}`, week);
    });

    return Array.from(mergedWeeks.values());
  }, [backendWeeks, localStoredWeeks]);

  // Wochendaten laden (mit allen Zetteln pro Woche)
  const weekData = useMemo(() => {

    const weeks: DashboardWeekSummary[] = [];

    const currentMonday = weekUtils.getMonday(currentYear, currentWeek);

    for (let i = 0; i < 4; i++) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() - i * 7);
      const thursday = new Date(monday);
      thursday.setDate(monday.getDate() + 3);
      const year = thursday.getFullYear();
      const week = weekUtils.getWeekNumber(monday);

      // Lade alle Zettel dieser Woche
      const allSheets = storage.getAllSheetsForWeek(year, week);

      if (allSheets.length > 0) {
        const sheets = allSheets.map((sheet) => {
          const totalHours = sheet.days.reduce((sum, day) => {
            const [hours, minutes] = day.hours.split(":").map(Number);
            return sum + hours + minutes / 60;
          }, 0);

          return {
            sheetId: sheet.sheetId,
            customer:
              sheet.customer || t("dashboard.noCustomer") || "Kein Kunde",
            hours: totalHours,
            locked: sheet.locked || false,
          };
        });

        const totalHours = sheets.reduce((sum, s) => sum + s.hours, 0);

        weeks.push({
          week,
          year,
          sheets,
          totalHours,
        });
      }
    }

    // Nur Wochen mit Daten zurückgeben
    return weeks.filter((w) => w.sheets.length > 0);
  }, [currentWeek, currentYear, t]);

  const backendWeekData = useMemo(() => {
    const groupedWeeks = new Map<string, DashboardWeekSummary>();

    sourceWeeks.forEach((sheet) => {
      const key = `${sheet.year}-${sheet.week}`;
      const sheetHours = sheet.days.reduce((sum, day) => {
        const [hours, minutes] = day.hours.split(":").map(Number);
        return sum + hours + minutes / 60;
      }, 0);

      const existingWeek = groupedWeeks.get(key) ?? {
        week: sheet.week,
        year: sheet.year,
        sheets: [],
        totalHours: 0,
      };

      existingWeek.sheets.push({
        sheetId: sheet.sheetId ?? 1,
        customer: sheet.customer || t("dashboard.noCustomer") || "Kein Kunde",
        hours: sheetHours,
        locked: sheet.locked || false,
      });
      existingWeek.totalHours += sheetHours;

      groupedWeeks.set(key, existingWeek);
    });

    return Array.from(groupedWeeks.values())
      .map((week) => ({
        ...week,
        sheets: week.sheets.sort((a, b) => a.sheetId - b.sheetId),
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
      })
      .slice(0, 4);
  }, [sourceWeeks, t]);

  const effectiveWeekData =
    backendWeekData.length > 0 || backendWeeks !== null ? backendWeekData : weekData;

  // Statistiken berechnen
  const stats = useMemo(() => {
    const thisWeek =
      effectiveWeekData.find(
        (week) => week.week === currentWeek && week.year === currentYear,
      ) || effectiveWeekData[0];

    // Monatsstunden berechnen (aktueller Monat)
    const currentMonth = new Date().getMonth();
    let monthHours = 0;

    // Kranktage und Urlaubstage zählen (aktueller Monat)
    let sickDays = 0;
    let vacationDays = 0;

    sourceWeeks.forEach((sheet) => {
      sheet.days.forEach((day) => {
        const dayDate = new Date(day.date);
        if (
          dayDate.getMonth() === currentMonth &&
          dayDate.getFullYear() === currentYear
        ) {
          const [hours, minutes] = day.hours.split(":").map(Number);
          monthHours += hours + minutes / 60;
          if (day.absence === "sick") sickDays++;
          if (day.absence === "vacation") vacationDays++;
        }
      });
    });

    // Offene Wochen (ohne Unterschrift) – aktuelle Woche ausschließen, die ist noch in Bearbeitung
    const openWeeks = effectiveWeekData.filter((w) =>
      !(w.week === currentWeek && w.year === currentYear) &&
      w.sheets.some((s) => !s.locked)
    ).length;

    return {
      thisWeekHours: thisWeek?.totalHours || 0,
      monthHours,
      sickDays,
      vacationDays,
      openWeeks,
    };
  }, [effectiveWeekData, sourceWeeks, currentWeek, currentYear]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const surfaceCard =
    "app-surface-card rounded-2xl";

  const metricCardBase =
    "app-surface-card relative overflow-hidden rounded-2xl p-4 sm:p-5";

  const formatHours = (value: number) =>
    value.toLocaleString(i18n.language || "de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="dashboard-shell min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/80 pb-8">
      {/* Page Header */}
      <PageHeader
        title={t("dashboard.welcome") || "Dashboard"}
        employeeName={employeeName}
        maxWidth="48rem"
        action={
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="header-menu-trigger w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label={t("common.menu") || "Menü"}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className="header-menu-panel absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 min-w-[260px] z-[80]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="header-menu-section px-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      <Languages className="w-3.5 h-3.5" />
                      <span>{t("welcome.language") || "Sprache"}</span>
                    </div>
                    <select
                      value={currentLanguageCode}
                      onChange={(e) => {
                        handleLanguageChange(e.target.value);
                        setShowMenu(false);
                      }}
                      className="header-menu-select w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700"
                    >
                      {availableLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      handleToggleTheme();
                      setShowMenu(false);
                    }}
                    className="header-menu-action w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center space-x-3 text-slate-700 font-medium transition-colors"
                  >
                    {themeMode === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                    <span>
                      {themeMode === "dark"
                        ? t("theme.lightMode") || "Light Mode"
                        : t("theme.darkMode") || "Dark Mode"}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setPhoneUpdateError("");
                      setPhoneUpdateSuccess("");
                      setPhoneUpdatePin("");
                      setNewPhoneNumber("");
                      setShowPhoneUpdateModal(true);
                    }}
                    className="header-menu-action w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center space-x-3 text-slate-700 font-medium transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{t("settings.phoneUpdate.action") || "Handynummer ändern"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLogout?.();
                    }}
                    className="header-menu-action w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center space-x-3 text-slate-700 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t("actions.logout") || "Abmelden"}</span>
                  </button>

                  <div className="header-menu-divider my-1 border-t border-slate-200" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="header-menu-danger w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-3 text-red-600 font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t("actions.deleteAll") || "Alle Daten löschen"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
      >
        <div className="dashboard-week-badge inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>
            KW {currentWeek} • {currentYear}
          </span>
        </div>
      </PageHeader>

      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-48 space-y-5 sm:space-y-6"
        onClick={() => showMenu && setShowMenu(false)}
      >
        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* Diese Woche */}
          <motion.div
            variants={item}
            className={metricCardBase}
          >
            <div className="absolute top-4 right-4">
              <TrendingUp className={`w-4 h-4 ${stats.thisWeekHours >= config.work.max_work_hours_per_day * 5 ? "text-green-500" : "text-slate-300"}`} />
            </div>
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 text-center">
              {formatHours(stats.thisWeekHours)}
              <span className="text-sm font-medium text-slate-500 ml-1">h</span>
            </p>
            <p className="text-sm font-semibold text-slate-600 mt-1 text-center">
              {t("dashboard.thisWeek") || "Diese Woche"}
            </p>
            <div className="mt-4 w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-primary-300 to-primary-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((stats.thisWeekHours / (config.work.max_work_hours_per_day * 5)) * 100, 100)}%` }}
              />
            </div>
          </motion.div>

          {/* Monatsstunden */}
          <motion.div
            variants={item}
            className={metricCardBase}
          >
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shadow-sm">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 text-center">
              {formatHours(stats.monthHours)}
              <span className="text-sm font-medium text-slate-500 ml-1">h</span>
            </p>
            <p className="text-sm font-semibold text-slate-600 mt-1 text-center">
              {new Date().toLocaleDateString("de-DE", { month: "long" })}
            </p>
          </motion.div>

          {showSickDashboardCard && (
            <motion.div
              variants={item}
              className={metricCardBase}
            >
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 text-center">
                {stats.sickDays}
                <span className="text-sm font-medium text-slate-500 ml-1">
                  {stats.sickDays === 1 ? "Tag" : "Tage"}
                </span>
              </p>
              <p className="text-sm font-semibold text-slate-600 mt-1 text-center">
                {t("absence.sick") || "Krank"}
              </p>
            </motion.div>
          )}

          {showVacationDashboardCard && (
            <motion.div
              variants={item}
              className={metricCardBase}
            >
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 text-center">
                {stats.vacationDays}
                <span className="text-sm font-medium text-slate-500 ml-1">
                  {stats.vacationDays === 1 ? "Tag" : "Tage"}
                </span>
              </p>
              <p className="text-sm font-semibold text-slate-600 mt-1 text-center">
                {t("absence.vacation") || "Urlaub"}
              </p>
            </motion.div>
          )}

          {/* Offene Wochen – Handlungsaufforderung */}
          {(() => {
            const currentWeekRunning = effectiveWeekData.some(
              (w) => w.week === currentWeek && w.year === currentYear && w.sheets.some((s) => !s.locked)
            );

            if (stats.openWeeks > 0) {
              // Vergangene Wochen nicht unterschrieben → Warnung
              return (
                <motion.button
                  variants={item}
                  onClick={() => {
                    const firstOpen = effectiveWeekData.find(
                      (w) => !(w.week === currentWeek && w.year === currentYear) && w.sheets.some((s) => !s.locked)
                    );
                    if (firstOpen) setSelectedWeek(firstOpen);
                  }}
                  className="col-span-1 sm:col-span-2 w-full text-left rounded-2xl p-4 sm:p-5 bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {stats.openWeeks === 1
                          ? t("dashboard.pendingSheets.one") ||
                            "1 Stundenzettel noch nicht unterschrieben!"
                          : t("dashboard.pendingSheets.many", {
                              count: stats.openWeeks,
                            }) ||
                            `${stats.openWeeks} Stundenzettel noch nicht unterschrieben!`}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        {t("dashboard.pendingSheets.cta") ||
                          "Jetzt antippen und abzeichnen ->"}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            } else if (currentWeekRunning) {
              // Aktuelle Woche läuft noch, keine alten Rückstände -> neutral
              return (
                <motion.div
                  variants={item}
                  className="col-span-1 sm:col-span-2 rounded-2xl p-4 sm:p-5 bg-sky-50 border border-sky-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-sky-700" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {t("dashboard.currentWeekRunning.title") ||
                          "Aktuelle Woche läuft noch"}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        {t("dashboard.currentWeekRunning.desc") ||
                          "Keine alten offenen Zettel - alles im grünen Bereich."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            } else {
              // Alles abgezeichnet → grün
              return (
                <motion.div
                  variants={item}
                  className="col-span-1 sm:col-span-2 rounded-2xl p-4 sm:p-5 bg-emerald-50 border border-emerald-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {t("dashboard.allSigned.title") || "Alle Stundenzettel unterschrieben!"}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        {t("dashboard.allSigned.desc") ||
                          "Nichts zu tun - alles erledigt."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            }
          })()}
        </motion.div>

        {/* Kontakt-Kachel (klickbar) */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setShowContactModal(true)}
          className={`${surfaceCard} p-5 sm:p-6 w-full text-left`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shadow-sm">
                <Building className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  {t("dashboard.contact") || "Kontakt"}
                </h3>
                <p className="text-sm text-slate-600">
                  {config.company.company_name}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </motion.button>

        {/* Kontakt- und Profilmodale */}
        <AnimatePresence>
          {showPhoneUpdateModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowPhoneUpdateModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-slate-200/80"
              >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {t("settings.phoneUpdate.title") || "Handynummer ändern"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowPhoneUpdateModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    {t("settings.phoneUpdate.description") || "Aktualisieren Sie Ihre Handynummer, damit PIN-Zurücksetzen und die eindeutige Zuordnung weiterhin funktionieren."}
                  </p>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {t("settings.phoneUpdate.newPhone") || "Neue Handynummer"}
                    </span>
                    <input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="input-field mt-2"
                      placeholder={t("welcome.placeholders.phoneNumber") || "z. B. 0176 12345678"}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {t("settings.phoneUpdate.pin") || "Aktuelle PIN"}
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={phoneUpdatePin}
                      onChange={(e) => setPhoneUpdatePin(e.target.value.replace(/\D+/g, "").slice(0, 4))}
                      className="input-field mt-2"
                      placeholder="••••"
                    />
                  </label>

                  {phoneUpdateError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {phoneUpdateError}
                    </div>
                  )}

                  {phoneUpdateSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {phoneUpdateSuccess}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
                  <button
                    onClick={() => setShowPhoneUpdateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t("common.cancel") || "Abbrechen"}
                  </button>
                  <button
                    onClick={() => {
                      void handleUpdatePhoneNumber();
                    }}
                    disabled={isUpdatingPhone}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingPhone
                      ? t("settings.phoneUpdate.saving") || "Speichern..."
                      : t("settings.phoneUpdate.save") || "Speichern"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showContactModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowContactModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-slate-200/80"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                      <Building className="w-5 h-5 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {t("dashboard.contact") || "Kontakt"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-3">
                  {/* Ansprechpartner Telefonnummern */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      {t("dashboard.contactPersons") || "Ansprechpartner"}
                    </h3>

                    {config.company.allowed_whatsapp &&
                    config.company.allowed_whatsapp.length > 0 ? (
                      <div className="space-y-2">
                        {config.company.allowed_whatsapp.map((phone, index) => (
                          <a
                            key={index}
                            href={`tel:${phone}`}
                            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-primary-50 hover:border-primary-200 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                              <Phone className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-0.5">
                                {index === 0
                                  ? t("dashboard.primaryContact") ||
                                    "Hauptkontakt"
                                  : `${t("dashboard.contact") || "Kontakt"} ${
                                      index + 1
                                    }`}
                              </p>
                              <p className="text-base font-semibold text-slate-900 group-hover:text-primary-700">
                                {phone}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">
                          {t("dashboard.noContactPersons") ||
                            "Keine Ansprechpartner hinterlegt"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 my-4"></div>

                  {/* Firmeninfos */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      {t("dashboard.companyInfo") || "Firmeninformationen"}
                    </h3>

                    <div className="space-y-2">
                      {/* Firmenname */}
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <Building className="w-5 h-5 text-primary-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Firma</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {config.company.company_name}
                          </p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <Mail className="w-5 h-5 text-primary-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">E-Mail</p>
                          <a
                            href={`mailto:${config.company.company_email}`}
                            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                          >
                            {config.company.company_email}
                          </a>
                        </div>
                      </div>

                      {/* Adresse */}
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Adresse</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">
                            {config.company.company_address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="w-full btn-primary"
                  >
                    {t("common.close") || "Schließen"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Wochen-Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`${surfaceCard} p-5 sm:p-6`}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            {t("dashboard.weekOverview") || "Wochenübersicht"}
          </h3>
          <div className="space-y-2">
            {effectiveWeekData.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                {t("dashboard.noWeeks") || "Noch keine Stunden erfasst"}
              </div>
            )}
            {effectiveWeekData.map((week, index) => {
              const targetHours = config.work.max_work_hours_per_day * 5;
              const percentage = Math.min(
                (week.totalHours / targetHours) * 100,
                100
              );
              const isCurrentWeek =
                week.week === currentWeek && week.year === currentYear;

              return (
                <motion.button
                  key={`${week.year}-${week.week}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  onClick={() => setSelectedWeek(week)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isCurrentWeek ? "bg-primary-50 border-primary-200" : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {/* Wocheninfo */}
                  <div className="flex-shrink-0 text-sm font-semibold text-slate-700 w-16">
                    KW {week.week}
                    <div className="text-xs text-slate-500 font-normal">
                      {week.year}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 h-8 bg-slate-100 rounded-xl overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                      className={`h-full rounded-xl ${
                        week.totalHours >= targetHours
                          ? "bg-green-600"
                          : week.totalHours >= targetHours * 0.75
                          ? "bg-primary-600"
                          : week.totalHours > 0
                          ? "bg-amber-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-700">
                        {formatHours(week.totalHours)}h
                      </span>
                    </div>
                  </div>

                  {/* Sheet Count + Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {week.sheets.length > 0 && (
                      <span className="text-xs text-slate-500 font-medium">
                        {week.sheets.length}x
                      </span>
                    )}
                    {week.sheets.every((s) => s.locked) &&
                      week.sheets.length > 0 && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Week Details Modal */}
        <AnimatePresence>
          {selectedWeek && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedWeek(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[85vh] sm:max-h-[80vh] overflow-hidden border border-slate-200/80"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      KW {selectedWeek.week} / {selectedWeek.year}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {formatHours(selectedWeek.totalHours)}h gesamt
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Sheet List */}
                <div className="p-3 sm:p-4 space-y-2 overflow-y-auto max-h-[65vh] sm:max-h-[60vh]">
                  {selectedWeek.sheets.length > 0 ? (
                    selectedWeek.sheets.map((sheet) => (
                      <button
                        key={sheet.sheetId}
                        onClick={() => {
                          onNavigateToWeek?.(
                            selectedWeek.year,
                            selectedWeek.week,
                            sheet.sheetId
                          );
                          setSelectedWeek(null);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-300 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                            {sheet.sheetId}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-slate-900">
                              {sheet.customer}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatHours(sheet.hours)}h
                            </div>
                          </div>
                        </div>
                        {sheet.locked && (
                          <Check
                            className="w-5 h-5 text-green-600"
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      {t("dashboard.noSheets") ||
                        "Keine Stundenzettel vorhanden"}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAllData}
          title={t("actions.confirmDeleteAllTitle") || "Alle Daten löschen?"}
          message={
            t("actions.confirmDeleteAll") ||
            "Möchten Sie wirklich ALLE Daten unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
          }
          confirmText={t("actions.delete") || "Löschen"}
          cancelText={t("common.cancel") || "Abbrechen"}
          variant="danger"
        />
      </div>
    </div>
  );
};
