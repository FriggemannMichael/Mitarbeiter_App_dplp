import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  LogOut,
  MessageCircle,
  MessageSquare,
  XCircle,
} from "lucide-react";

import { useConfig } from "../contexts/ConfigContext";
import {
  apiService,
  type PortalAbsenceDto,
  type PortalEmployeeDto,
  type PortalTimesheetDto,
} from "../services/apiService";
import { managementPortalAuthService } from "../services/managementPortalAuthService";
import { PdfExporter } from "../utils/pdfExporter";

type PortalTab = "dashboard" | "employees" | "absences" | "history";

type SendHistoryEntry = {
  id: string;
  employee_name: string;
  sheet_id: string;
  week_year: number;
  week_number: number;
  customer: string;
  sent_at: string;
  destination: string;
  current_status: string;
  last_actor: string;
  last_comment: string;
};

const statusLabels: Record<string, string> = {
  open: "Offen",
  submitted: "Eingereicht",
  reviewed: "Geprueft",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

const statusClasses: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  reviewed: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function formatStatus(status?: string): string {
  return statusLabels[status || ""] || status || "-";
}

function formatPortalQueue(portalQueue?: string, status?: string): string {
  if (status !== "submitted") {
    return "-";
  }
  return portalQueue === "review" ? "Zu pruefen" : "Freizugeben";
}

function getCurrentIsoWeek(): { week: number; year: number } {
  const date = new Date();
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: utcDate.getUTCFullYear() };
}

export const ManagementPortalDashboard: React.FC = () => {
  const { config } = useConfig();
  const currentUser = managementPortalAuthService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");
  const [employees, setEmployees] = useState<PortalEmployeeDto[]>([]);
  const [timesheets, setTimesheets] = useState<PortalTimesheetDto[]>([]);
  const [absences, setAbsences] = useState<PortalAbsenceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [selectedTimesheet, setSelectedTimesheet] = useState<PortalTimesheetDto | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [showChatPrototype, setShowChatPrototype] = useState(false);
  const canApprove = managementPortalAuthService.canApproveTimesheets();

  const loadPortalData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [summaryResponse, employeesResponse, timesheetsResponse, absencesResponse] =
        await Promise.all([
        apiService.getPortalSummary(),
        apiService.getPortalEmployees(),
        apiService.getPortalTimesheets(
          timesheetStatusFilter ? { status: timesheetStatusFilter } : undefined,
        ),
        apiService.getPortalAbsences(),
      ]);

      if (!summaryResponse.success) {
        throw new Error(summaryResponse.error || "Portal-Uebersicht konnte nicht geladen werden");
      }
      if (!employeesResponse.success) {
        throw new Error(employeesResponse.error || "Mitarbeiterliste konnte nicht geladen werden");
      }
      if (!timesheetsResponse.success) {
        throw new Error(timesheetsResponse.error || "Stundenzettel konnten nicht geladen werden");
      }
      if (!absencesResponse.success) {
        throw new Error(absencesResponse.error || "Abwesenheiten konnten nicht geladen werden");
      }
      setEmployees(employeesResponse.data || []);
      setTimesheets(timesheetsResponse.data || []);
      setAbsences(absencesResponse.data || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Portal-Daten konnten nicht geladen werden",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPortalData();
  }, [timesheetStatusFilter]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const currentIsoWeek = useMemo(() => getCurrentIsoWeek(), []);

  const releasedTimesheets = useMemo(
    () =>
      timesheets
        .filter(
          (item) =>
            item.status === "submitted" &&
            item.has_employee_signature &&
            item.has_supervisor_signature,
        )
        .slice(0, 8),
    [timesheets],
  );

  const inReviewTimesheets = useMemo(
    () =>
      timesheets
        .filter(
          (item) =>
            item.status === "submitted" &&
            (!item.has_employee_signature || !item.has_supervisor_signature),
        )
        .slice(0, 8),
    [timesheets],
  );

  const submittedTimesheetsThisWeek = useMemo(
    () =>
      timesheets.filter(
        (item) =>
          item.status === "submitted" &&
          item.week_number === currentIsoWeek.week &&
          item.week_year === currentIsoWeek.year,
      ).length,
    [currentIsoWeek.week, currentIsoWeek.year, timesheets],
  );

  const employeeOverview = useMemo(() => {
    const groupedEmployees = new Map<
      string,
      {
        employee_name: string;
        has_current_week_timesheet: boolean;
        last_updated_at?: string | null;
      }
    >();

    employees.forEach((employee) => {
      const key = employee.employee_name.trim();
      const current = groupedEmployees.get(key);
      const currentUpdatedAt = current?.last_updated_at
        ? new Date(current.last_updated_at).getTime()
        : 0;
      const nextUpdatedAt = employee.last_updated_at
        ? new Date(employee.last_updated_at).getTime()
        : 0;

      groupedEmployees.set(key, {
        employee_name: employee.employee_name,
        has_current_week_timesheet:
          Boolean(current?.has_current_week_timesheet) ||
          employee.has_current_week_timesheet,
        last_updated_at:
          nextUpdatedAt >= currentUpdatedAt
            ? employee.last_updated_at
            : current?.last_updated_at,
      });
    });

    return Array.from(groupedEmployees.values()).sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name, "de"),
    );
  }, [employees]);

  const selectedEmployeeTimesheets = useMemo(() => {
    if (!selectedEmployeeName) {
      return [];
    }

    return timesheets
      .filter(
        (timesheet) =>
          timesheet.employee_name.trim() === selectedEmployeeName,
      )
      .sort((a, b) => {
        const updatedAtA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const updatedAtB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        if (updatedAtA !== updatedAtB) {
          return updatedAtB - updatedAtA;
        }
        if (a.week_year !== b.week_year) {
          return b.week_year - a.week_year;
        }
        if (a.week_number !== b.week_number) {
          return b.week_number - a.week_number;
        }
        return Number(b.sheet_id) - Number(a.sheet_id);
      });
  }, [selectedEmployeeName, timesheets]);

  const displayedTimesheets = useMemo(() => {
    if (!selectedEmployeeName) {
      return timesheets;
    }

    return selectedEmployeeTimesheets;
  }, [selectedEmployeeName, selectedEmployeeTimesheets, timesheets]);

  const sendHistoryEntries = useMemo<SendHistoryEntry[]>(() => {
    const entries = timesheets.map((timesheet) => {
      const history = [...(timesheet.history || [])].sort((a, b) => {
        const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timestampB - timestampA;
      });
      const submittedEntry = history.find((entry) => {
        const eventType = entry.status || entry.action;
        return eventType === "submitted";
      });
      const latestEntry = history[0];

      return {
        id: `${timesheet.id}-${timesheet.sheet_id}`,
        employee_name: timesheet.employee_name,
        sheet_id: String(timesheet.sheet_id),
        week_year: timesheet.week_year,
        week_number: timesheet.week_number,
        customer: timesheet.customer || "Kein Kunde",
        sent_at: submittedEntry?.timestamp || timesheet.updated_at || "",
        destination: formatPortalQueue(timesheet.portal_queue, "submitted"),
        current_status: formatStatus(timesheet.status),
        last_actor: latestEntry?.actor || "-",
        last_comment: latestEntry?.comment || timesheet.customer_comment || "-",
      };
    });

    return entries
      .filter((entry) =>
        selectedEmployeeName ? entry.employee_name.trim() === selectedEmployeeName : true,
      )
      .sort((a, b) => {
        const sentAtA = a.sent_at ? new Date(a.sent_at).getTime() : 0;
        const sentAtB = b.sent_at ? new Date(b.sent_at).getTime() : 0;
        if (sentAtA !== sentAtB) {
          return sentAtB - sentAtA;
        }
        if (a.week_year !== b.week_year) {
          return b.week_year - a.week_year;
        }
        if (a.week_number !== b.week_number) {
          return b.week_number - a.week_number;
        }
        return Number(b.sheet_id) - Number(a.sheet_id);
      });
  }, [selectedEmployeeName, timesheets]);

  const handleLogout = async () => {
    await managementPortalAuthService.logout();
    window.location.reload();
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl("");
    setSelectedTimesheet(null);
    setIsPreparingPdf(false);
  };

  const handleReviewAction = async (
    timesheetId: number,
    status: "reviewed" | "approved" | "rejected",
  ) => {
    const comment =
      status !== "approved"
        ? window.prompt("Optionalen Kommentar fuer den Kundenverlauf eingeben:", "") || ""
        : "";
    const rejectionReason =
      status === "rejected"
        ? window.prompt("Bitte Ablehnungsgrund eingeben:", "") || ""
        : "";

    if (status === "rejected" && !rejectionReason.trim()) {
      return;
    }

    try {
      const response = await apiService.updatePortalTimesheetStatus(timesheetId, {
        status,
        comment,
        rejectionReason,
      });
      if (!response.success) {
        throw new Error(response.error || "Status konnte nicht aktualisiert werden");
      }
      await loadPortalData();
    } catch (actionError) {
      window.alert(
        actionError instanceof Error
          ? actionError.message
          : "Status konnte nicht aktualisiert werden",
      );
    }
  };

  const handleAddComment = async (timesheetId: number) => {
    const comment = window.prompt("Kommentar oder Anmerkung zum Stundenzettel:", "") || "";
    if (!comment.trim()) {
      return;
    }

    try {
      const response = await apiService.addPortalTimesheetComment(timesheetId, {
        comment,
      });
      if (!response.success) {
        throw new Error(response.error || "Kommentar konnte nicht gespeichert werden");
      }
      await loadPortalData();
    } catch (actionError) {
      window.alert(
        actionError instanceof Error
          ? actionError.message
          : "Kommentar konnte nicht gespeichert werden",
      );
    }
  };

  const handleOpenPdfPreview = async (timesheet: PortalTimesheetDto) => {
    try {
      setIsPreparingPdf(true);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      const pdfBytes = await PdfExporter.generatePDF(timesheet.week_data, config);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const nextUrl = URL.createObjectURL(blob);
      setSelectedTimesheet(timesheet);
      setPdfPreviewUrl(nextUrl);
    } catch (previewError) {
      window.alert(
        previewError instanceof Error
          ? previewError.message
          : "PDF konnte nicht erstellt werden",
      );
      setSelectedTimesheet(null);
      setPdfPreviewUrl("");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleCsvExport = () => {
    const header = [
      "Mitarbeiter",
      "Jahr",
      "Woche",
      "Zettel",
      "Kunde",
      "Status",
      "Stunden",
      "Abwesenheitstage",
      "Mitarbeiter-Signatur",
      "Vorgesetzten-Signatur",
      "Kommentar",
      "Aktualisiert",
    ];

    const rows = timesheets.map((timesheet) => [
      timesheet.employee_name,
      timesheet.week_year,
      timesheet.week_number,
      timesheet.sheet_id,
      timesheet.customer,
      formatStatus(timesheet.status),
      timesheet.hours_total,
      timesheet.absence_days,
      timesheet.has_employee_signature ? "ja" : "nein",
      timesheet.has_supervisor_signature ? "ja" : "nein",
      timesheet.customer_comment || "",
      timesheet.updated_at || "",
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`)
          .join(";"),
      )
      .join("\n");

    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "verwaltungsportal-stundenzettel.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_45%,#f8fafc_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-6 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-3">
                <Building2 className="w-4 h-4" />
                Verwaltungsportal
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Verwaltung und Freigaben
              </h1>
              <p className="text-sm text-slate-600 mt-2">
                Angemeldet als {currentUser?.username} ({currentUser?.role || "user"})
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadPortalData}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Neu laden
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl bg-slate-900 hover:bg-black text-white px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-6 lg:grid-cols-2">
            {[
              {
                label: "Eingereichte Stundenbelege",
                value: submittedTimesheetsThisWeek,
                suffix: "",
                icon: <CalendarClock className="w-5 h-5" />,
                onClick: undefined,
              },
              {
                label: "Mitarbeiter-Chat",
                value: "Prototyp",
                suffix: "",
                icon: <MessageCircle className="w-5 h-5" />,
                onClick: () => setShowChatPrototype(true),
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left ${
                  item.onClick ? "transition-colors hover:bg-sky-50 hover:border-sky-300" : ""
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  {item.icon}
                  <span className="text-[11px] uppercase tracking-wide font-semibold">
                    {item.onClick ? "Zukunft" : "Live"}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {item.value}
                  {item.suffix}
                </div>
                <div className="text-sm text-slate-600 mt-1">{item.label}</div>
                {!item.onClick && (
                  <div className="text-xs text-slate-500 mt-3">
                    Anzahl der eingereichten Belege in der aktuellen Kalenderwoche
                  </div>
                )}
                {item.onClick && (
                  <div className="text-xs text-slate-500 mt-3">
                    Konzept ansehen und geplante Kommunikation erklaeren
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "employees", label: "Mitarbeiter" },
            { id: "absences", label: "Abwesenheiten" },
            { id: "history", label: "Sendeverlauf" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as PortalTab)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium border transition-colors ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center text-slate-500">
            Portal-Daten werden geladen...
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    Freigegeben
                  </h2>
                  <div className="space-y-3">
                    {releasedTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {timesheet.employee_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            KW {timesheet.week_number}/{timesheet.week_year} -{" "}
                            {timesheet.customer || "Kein Kunde"}
                          </div>
                          {timesheet.customer_comment && (
                            <div className="text-sm text-slate-500 mt-2">
                              Kommentar: {timesheet.customer_comment}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClasses[timesheet.status] || statusClasses.open
                            }`}
                          >
                            {formatStatus(timesheet.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleOpenPdfPreview(timesheet)}
                            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            PDF
                          </button>
                          {canApprove && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleAddComment(timesheet.id)}
                                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Kommentar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReviewAction(timesheet.id, "approved")}
                                className="rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Freigeben
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReviewAction(timesheet.id, "rejected")}
                                className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Ablehnen
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {releasedTimesheets.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Aktuell keine vollstaendig unterschriebenen eingereichten Stundenzettel.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    In Pruefung
                  </h2>
                  <div className="space-y-3">
                    {inReviewTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {timesheet.employee_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            KW {timesheet.week_number}/{timesheet.week_year} -{" "}
                            {timesheet.customer || "Kein Kunde"}
                          </div>
                          {timesheet.customer_comment && (
                            <div className="text-sm text-slate-500 mt-2">
                              Kommentar: {timesheet.customer_comment}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClasses[timesheet.status] || statusClasses.open
                            }`}
                          >
                            {formatStatus(timesheet.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleOpenPdfPreview(timesheet)}
                            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            PDF
                          </button>
                          {canApprove && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleAddComment(timesheet.id)}
                                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Kommentar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReviewAction(timesheet.id, "reviewed")}
                                className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                              >
                                Pruefen
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReviewAction(timesheet.id, "rejected")}
                                className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Ablehnen
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {inReviewTimesheets.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Aktuell keine eingereichten Stundenzettel mit fehlenden Unterschriften.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "employees" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Mitarbeiterliste</h2>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4">Mitarbeiter</th>
                      <th className="py-2 pr-4">Zuletzt aktualisiert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeOverview.map((employee) => (
                      <tr key={employee.employee_name} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEmployeeName((current) =>
                                current === employee.employee_name.trim()
                                  ? ""
                                  : employee.employee_name.trim(),
                              )
                            }
                            className="text-left text-sky-700 hover:text-sky-900 hover:underline underline-offset-2"
                          >
                            {employee.employee_name}
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          {employee.last_updated_at
                            ? new Date(employee.last_updated_at).toLocaleString("de-DE")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedEmployeeName
                          ? `Stundenzettel von ${selectedEmployeeName}`
                          : "Stundenzettel"}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedEmployeeName
                          ? "Verlauf fuer den ausgewaehlten Mitarbeiter"
                          : "Mitarbeiter aus der Liste auswaehlen, um den Verlauf zu sehen"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <select
                        value={timesheetStatusFilter}
                        onChange={(event) => setTimesheetStatusFilter(event.target.value)}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Alle Status</option>
                        <option value="open">Offen</option>
                        <option value="submitted">Eingereicht</option>
                        <option value="reviewed">Geprueft</option>
                        <option value="approved">Freigegeben</option>
                        <option value="rejected">Abgelehnt</option>
                      </select>
                      {selectedEmployeeName && (
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeName("")}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Filter aufheben
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCsvExport}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        CSV exportieren
                      </button>
                    </div>
                  </div>

                  {selectedEmployeeName ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-200">
                            <th className="py-2 pr-4">Mitarbeiter</th>
                            <th className="py-2 pr-4">Woche</th>
                            <th className="py-2 pr-4">Kunde</th>
                            <th className="py-2 pr-4">Stunden</th>
                            <th className="py-2 pr-4">Unterschriften</th>
                            <th className="py-2 pr-4">PDF</th>
                            {canApprove && <th className="py-2 pr-4">Aktion</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {displayedTimesheets.map((timesheet) => (
                            <tr key={timesheet.id} className="border-b border-slate-100 align-top">
                              <td className="py-3 pr-4 font-medium text-slate-900">
                                {timesheet.employee_name}
                              </td>
                              <td className="py-3 pr-4">
                                KW {timesheet.week_number}/{timesheet.week_year} - Zettel{" "}
                                {timesheet.sheet_id}
                              </td>
                              <td className="py-3 pr-4">{timesheet.customer || "Kein Kunde"}</td>
                              <td className="py-3 pr-4">{timesheet.hours_total}h</td>
                              <td className="py-3 pr-4 text-xs text-slate-700">
                                <div>MA: {timesheet.has_employee_signature ? "Ja" : "Nein"}</div>
                                <div>VL: {timesheet.has_supervisor_signature ? "Ja" : "Nein"}</div>
                              </td>
                              <td className="py-3 pr-4">
                                <button
                                  type="button"
                                  onClick={() => void handleOpenPdfPreview(timesheet)}
                                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  PDF ansehen
                                </button>
                              </td>
                              {canApprove && (
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleAddComment(timesheet.id)}
                                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      Kommentar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleReviewAction(timesheet.id, "reviewed")}
                                      className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                                    >
                                      Pruefen
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleReviewAction(timesheet.id, "approved")}
                                      className="rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Freigeben
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleReviewAction(timesheet.id, "rejected")}
                                      className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                    >
                                      Ablehnen
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          {displayedTimesheets.length === 0 && (
                            <tr>
                              <td
                                colSpan={canApprove ? 7 : 6}
                                className="py-6 text-center text-slate-500"
                              >
                                Fuer diesen Mitarbeiter wurden keine Stundenzettel gefunden.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      Bitte einen Mitarbeiter aus der Liste auswaehlen.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "absences" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Abwesenheitsuebersicht
                </h2>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4">Datum</th>
                      <th className="py-2 pr-4">Mitarbeiter</th>
                      <th className="py-2 pr-4">Abwesenheit</th>
                      <th className="py-2 pr-4">Notiz</th>
                      <th className="py-2 pr-4">Woche</th>
                      <th className="py-2 pr-4">Kunde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((absence) => (
                      <tr
                        key={`${absence.timesheet_id}-${absence.date}-${absence.absence}`}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3 pr-4">{absence.date}</td>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {absence.employee_name}
                        </td>
                        <td className="py-3 pr-4">{absence.absence}</td>
                        <td className="py-3 pr-4">{absence.absence_note || "-"}</td>
                        <td className="py-3 pr-4">
                          KW {absence.week_number}/{absence.week_year}
                        </td>
                        <td className="py-3 pr-4">{absence.customer || "Kein Kunde"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {activeTab === "history" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Sendeverlauf</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Wann welcher Stundenzettel eingereicht wurde und wohin er gelaufen ist
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={selectedEmployeeName}
                      onChange={(event) => setSelectedEmployeeName(event.target.value)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Alle Mitarbeiter</option>
                      {employeeOverview.map((employee) => (
                        <option key={employee.employee_name} value={employee.employee_name.trim()}>
                          {employee.employee_name}
                        </option>
                      ))}
                    </select>
                    {selectedEmployeeName && (
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeName("")}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Filter aufheben
                      </button>
                    )}
                  </div>
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4">Zeitpunkt</th>
                      <th className="py-2 pr-4">Mitarbeiter</th>
                      <th className="py-2 pr-4">Zettel</th>
                      <th className="py-2 pr-4">Kunde</th>
                      <th className="py-2 pr-4">Gesendet an</th>
                      <th className="py-2 pr-4">Aktueller Status</th>
                      <th className="py-2 pr-4">Letzte Aktivitaet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendHistoryEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          {entry.sent_at ? new Date(entry.sent_at).toLocaleString("de-DE") : "-"}
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {entry.employee_name}
                        </td>
                        <td className="py-3 pr-4">
                          KW {entry.week_number}/{entry.week_year} - Zettel {entry.sheet_id}
                        </td>
                        <td className="py-3 pr-4">{entry.customer}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {entry.destination}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                            {entry.current_status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div>{entry.last_actor}</div>
                          <div className="text-xs text-slate-500 mt-1">{entry.last_comment}</div>
                        </td>
                      </tr>
                    ))}
                    {sendHistoryEntries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          Keine Eintraege im Sendeverlauf vorhanden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>

      {(isPreparingPdf || pdfPreviewUrl) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  PDF-Vorschau Stundenzettel
                </div>
                <div className="text-sm text-slate-600">
                  {selectedTimesheet
                    ? `${selectedTimesheet.employee_name} - KW ${selectedTimesheet.week_number}/${selectedTimesheet.week_year}`
                    : "PDF wird vorbereitet..."}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTimesheet && canApprove && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleAddComment(selectedTimesheet.id)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Kommentar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewAction(selectedTimesheet.id, "reviewed")}
                      className="rounded-2xl border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
                    >
                                Pruefen
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewAction(selectedTimesheet.id, "approved")}
                      className="rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Freigeben
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewAction(selectedTimesheet.id, "rejected")}
                      className="rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Ablehnen
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-black"
                >
                  Schliessen
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              {isPreparingPdf || !pdfPreviewUrl ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  PDF wird erstellt...
                </div>
              ) : (
                <iframe
                  title="PDF-Vorschau Stundenzettel"
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showChatPrototype && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900">Prototyp Mitarbeiter-Chat</div>
                <div className="text-sm text-slate-600 mt-1">
                  Zukuenftige Direktkommunikation zwischen Verwaltung und Mitarbeiter-App
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatPrototype(false)}
                className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-black"
              >
                Schliessen
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold uppercase tracking-wide text-sky-700 mb-2">
                  Geplante Funktion
                </div>
                <p className="text-sm text-slate-700 leading-6">
                  Der Mitarbeiter-Chat soll Rueckfragen zu Stundenzetteln, Hinweisen zu Einsaetzen,
                  Freigaben, Unterlagen und kurzfristige Verwaltungsnachrichten direkt zwischen
                  Portal und Mitarbeiter-App austauschen. Nachrichten aus dem Verwaltungsportal
                  koennen dabei automatisch per Webhook angestossen und in die App des
                  Mitarbeiters zugestellt werden.
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-base font-bold text-slate-900 mb-2">
                    Was der Chat spaeter koennen soll
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>Direkte Rueckfragen zu einem konkreten Stundenzettel</li>
                    <li>Benachrichtigungen bei Freigabe, Ablehnung oder Pruefung</li>
                    <li>Versand von Einsatzinfos, Dokumenten und organisatorischen Hinweisen</li>
                    <li>Saubere Zuordnung der Kommunikation zu Mitarbeiter und Vorgang</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-base font-bold text-slate-900 mb-2">
                    Warum Matrix als Grundlage
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>Offener Standard statt proprietaerer Messenger-Abhaengigkeit</li>
                    <li>Eigener Serverbetrieb fuer DSGVO-konforme Datenhaltung</li>
                    <li>Gute Eignung fuer sichere App-zu-Portal-Kommunikation</li>
                    <li>Webhook- und Bot-Anbindung fuer automatisierte Prozesse</li>
                  </ul>
                </div>
              </section>

              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="text-base font-bold text-slate-900 mb-2">Marketing-Satz</div>
                <p className="text-sm text-slate-700 leading-6">
                  Der geplante Matrix-basierte Mitarbeiter-Chat verbindet Verwaltung und App in
                  einem sicheren, DSGVO-konformen Kommunikationskanal, der schnell, direkt und
                  voll unter eigener Kontrolle bleibt.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
