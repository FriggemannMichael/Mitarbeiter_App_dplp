import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  LogOut,
  MessageSquare,
  XCircle,
} from "lucide-react";

import { useConfig } from "../contexts/ConfigContext";
import {
  apiService,
  type PortalAbsenceDto,
  type PortalAuditLogDto,
  type PortalEmployeeDto,
  type PortalSummaryDto,
  type PortalTimesheetDto,
} from "../services/apiService";
import { managementPortalAuthService } from "../services/managementPortalAuthService";
import { PdfExporter } from "../utils/pdfExporter";

type PortalTab = "dashboard" | "employees" | "timesheets" | "absences" | "audit";

const statusLabels: Record<string, string> = {
  open: "Offen",
  submitted: "Eingereicht",
  reviewed: "Geprüft",
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
  return portalQueue === "review" ? "Zu prüfen" : "Freizugeben";
}

export const ManagementPortalDashboard: React.FC = () => {
  const { config } = useConfig();
  const currentUser = managementPortalAuthService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");
  const [summary, setSummary] = useState<PortalSummaryDto | null>(null);
  const [employees, setEmployees] = useState<PortalEmployeeDto[]>([]);
  const [timesheets, setTimesheets] = useState<PortalTimesheetDto[]>([]);
  const [absences, setAbsences] = useState<PortalAbsenceDto[]>([]);
  const [auditEntries, setAuditEntries] = useState<PortalAuditLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [selectedTimesheet, setSelectedTimesheet] = useState<PortalTimesheetDto | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const canApprove = managementPortalAuthService.canApproveTimesheets();

  const loadPortalData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [
        summaryResponse,
        employeesResponse,
        timesheetsResponse,
        absencesResponse,
        auditResponse,
      ] = await Promise.all([
        apiService.getPortalSummary(),
        apiService.getPortalEmployees(),
        apiService.getPortalTimesheets(
          timesheetStatusFilter ? { status: timesheetStatusFilter } : undefined,
        ),
        apiService.getPortalAbsences(),
        apiService.getPortalAuditLog({ limit: 100 }),
      ]);

      if (!summaryResponse.success) {
        throw new Error(summaryResponse.error || "Portal-Übersicht konnte nicht geladen werden");
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
      if (!auditResponse.success) {
        throw new Error(auditResponse.error || "Audit-Log konnte nicht geladen werden");
      }

      setSummary(summaryResponse.data || null);
      setEmployees(employeesResponse.data || []);
      setTimesheets(timesheetsResponse.data || []);
      setAbsences(absencesResponse.data || []);
      setAuditEntries(auditResponse.data || []);
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

  const approvalTimesheets = useMemo(
    () =>
      timesheets
        .filter((item) => item.status === "submitted" && item.portal_queue === "approval")
        .slice(0, 8),
    [timesheets],
  );

  const reviewTimesheets = useMemo(
    () =>
      timesheets
        .filter((item) => item.status === "submitted" && item.portal_queue === "review")
        .slice(0, 8),
    [timesheets],
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
          timesheet.employee_name.trim() === selectedEmployeeName &&
          timesheet.status === "submitted",
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
        ? window.prompt("Optionalen Kommentar für den Kundenverlauf eingeben:", "") || ""
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
      "Klassifizierung",
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
      formatPortalQueue(timesheet.portal_queue, timesheet.status),
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

          <div className="grid grid-cols-1 mt-6">
            {[
              {
                label: "Eingereichte Zettel",
                value: summary?.metrics.submitted_timesheets ?? 0,
                suffix: "",
                icon: <CalendarClock className="w-5 h-5" />,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  {item.icon}
                  <span className="text-[11px] uppercase tracking-wide font-semibold">
                    Live
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {item.value}
                  {item.suffix}
                </div>
                <div className="text-sm text-slate-600 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "employees", label: "Mitarbeiter" },
            { id: "timesheets", label: "Stundenzettel" },
            { id: "absences", label: "Abwesenheiten" },
            { id: "audit", label: "Audit-Log" },
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
                    Freizugeben
                  </h2>
                  <div className="space-y-3">
                    {approvalTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {timesheet.employee_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            KW {timesheet.week_number}/{timesheet.week_year} ·{" "}
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
                    {approvalTimesheets.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Aktuell keine freizugebenden Stundenzettel.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    Zu prüfen
                  </h2>
                  <div className="space-y-3">
                    {reviewTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {timesheet.employee_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            KW {timesheet.week_number}/{timesheet.week_year} ·{" "}
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
                                Prüfen
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
                    {reviewTimesheets.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Aktuell keine zu prüfenden Stundenzettel.
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

                {selectedEmployeeName && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Verlauf eingereichter Stundenzettel
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">{selectedEmployeeName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeName("")}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Schließen
                      </button>
                    </div>

                    {selectedEmployeeTimesheets.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        Für diesen Mitarbeiter gibt es aktuell keine eingereichten
                        Stundenzettel.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-200">
                              <th className="py-2 pr-4">Woche</th>
                              <th className="py-2 pr-4">Kunde</th>
                              <th className="py-2 pr-4">Stunden</th>
                              <th className="py-2 pr-4">Status</th>
                              <th className="py-2 pr-4">Aktualisiert</th>
                              <th className="py-2 pr-4">PDF</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEmployeeTimesheets.map((timesheet) => (
                              <tr key={timesheet.id} className="border-b border-slate-200/70">
                                <td className="py-3 pr-4">
                                  KW {timesheet.week_number}/{timesheet.week_year} · Zettel{" "}
                                  {timesheet.sheet_id}
                                </td>
                                <td className="py-3 pr-4">
                                  {timesheet.customer || "Kein Kunde"}
                                </td>
                                <td className="py-3 pr-4">{timesheet.hours_total}h</td>
                                <td className="py-3 pr-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      statusClasses[timesheet.status] || statusClasses.open
                                    }`}
                                  >
                                    {formatStatus(timesheet.status)}
                                  </span>
                                </td>
                                <td className="py-3 pr-4">
                                  {timesheet.updated_at
                                    ? new Date(timesheet.updated_at).toLocaleString("de-DE")
                                    : "-"}
                                </td>
                                <td className="py-3 pr-4">
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenPdfPreview(timesheet)}
                                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    PDF ansehen
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === "timesheets" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Stundenzettel</h2>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={timesheetStatusFilter}
                      onChange={(event) => setTimesheetStatusFilter(event.target.value)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Alle Status</option>
                      <option value="open">Offen</option>
                      <option value="submitted">Eingereicht</option>
                      <option value="reviewed">Geprüft</option>
                      <option value="approved">Freigegeben</option>
                      <option value="rejected">Abgelehnt</option>
                    </select>
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

                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4">Mitarbeiter</th>
                      <th className="py-2 pr-4">Woche</th>
                      <th className="py-2 pr-4">Kunde</th>
                      <th className="py-2 pr-4">Stunden</th>
                      <th className="py-2 pr-4">Klassifizierung</th>
                      <th className="py-2 pr-4">Status und Verlauf</th>
                      <th className="py-2 pr-4">Unterschriften</th>
                      <th className="py-2 pr-4">PDF</th>
                      {canApprove && <th className="py-2 pr-4">Aktion</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((timesheet) => (
                      <tr key={timesheet.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {timesheet.employee_name}
                        </td>
                        <td className="py-3 pr-4">
                          KW {timesheet.week_number}/{timesheet.week_year} · Zettel{" "}
                          {timesheet.sheet_id}
                        </td>
                        <td className="py-3 pr-4">{timesheet.customer || "Kein Kunde"}</td>
                        <td className="py-3 pr-4">{timesheet.hours_total}h</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {formatPortalQueue(timesheet.portal_queue, timesheet.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClasses[timesheet.status] || statusClasses.open
                            }`}
                          >
                            {formatStatus(timesheet.status)}
                          </span>
                          {timesheet.rejection_reason && (
                            <div className="text-xs text-rose-700 mt-2">
                              Ablehnungsgrund: {timesheet.rejection_reason}
                            </div>
                          )}
                          {timesheet.customer_comment && (
                            <div className="text-xs text-slate-600 mt-2">
                              Kommentar: {timesheet.customer_comment}
                            </div>
                          )}
                          {(timesheet.history || []).length > 0 && (
                            <div className="mt-3 space-y-2">
                              {(timesheet.history || [])
                                .slice(-3)
                                .reverse()
                                .map((entry, index) => (
                                  <div
                                    key={`${timesheet.id}-${entry.timestamp}-${index}`}
                                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                  >
                                    <div className="font-medium text-slate-700">
                                      {entry.actor || "Unbekannt"} ·{" "}
                                      {formatStatus(entry.status || entry.action)}
                                    </div>
                                    <div>{entry.timestamp}</div>
                                    {entry.comment && (
                                      <div className="mt-1">{entry.comment}</div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </td>
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
                                Prüfen
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
                  </tbody>
                </table>
              </section>
            )}

            {activeTab === "absences" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Abwesenheitsübersicht
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

            {activeTab === "audit" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Audit-Log Verwaltungsportal
                </h2>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4">Zeitpunkt</th>
                      <th className="py-2 pr-4">Mitarbeiter</th>
                      <th className="py-2 pr-4">Zettel</th>
                      <th className="py-2 pr-4">Aktion</th>
                      <th className="py-2 pr-4">Benutzer</th>
                      <th className="py-2 pr-4">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">{entry.created_at || "-"}</td>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {entry.employee_name || "-"}
                        </td>
                        <td className="py-3 pr-4">{entry.sheet_id || "-"}</td>
                        <td className="py-3 pr-4">{formatStatus(entry.status || entry.action)}</td>
                        <td className="py-3 pr-4">
                          {entry.actor || "-"}
                          {entry.actor_role ? ` (${entry.actor_role})` : ""}
                        </td>
                        <td className="py-3 pr-4">{entry.comment || "-"}</td>
                      </tr>
                    ))}
                    {auditEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Noch keine Audit-Einträge vorhanden.
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
                    ? `${selectedTimesheet.employee_name} · KW ${selectedTimesheet.week_number}/${selectedTimesheet.week_year}`
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
                                Prüfen
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
    </div>
  );
};
