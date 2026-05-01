import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import {
  apiService,
  type PortalAbsenceDto,
  type PortalAuditLogDto,
  type PortalEmployeeDto,
  type PortalSummaryDto,
  type PortalTimesheetDto,
} from "../services/apiService";
import { portalAuthService } from "../services/portalAuthService";

type PortalTab = "dashboard" | "employees" | "timesheets" | "absences" | "audit";

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

export const CustomerPortalDashboard: React.FC = () => {
  const currentUser = portalAuthService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");
  const [summary, setSummary] = useState<PortalSummaryDto | null>(null);
  const [employees, setEmployees] = useState<PortalEmployeeDto[]>([]);
  const [timesheets, setTimesheets] = useState<PortalTimesheetDto[]>([]);
  const [absences, setAbsences] = useState<PortalAbsenceDto[]>([]);
  const [auditEntries, setAuditEntries] = useState<PortalAuditLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("");
  const canApprove = portalAuthService.canApproveTimesheets();

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

  const employeeCountWithoutCurrentWeekSheet = useMemo(
    () => employees.filter((employee) => !employee.has_current_week_timesheet).length,
    [employees],
  );

  const submittedTimesheets = useMemo(
    () => timesheets.filter((item) => item.status === "submitted").slice(0, 8),
    [timesheets],
  );

  const handleLogout = async () => {
    await portalAuthService.logout();
    window.location.reload();
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
      "Unterschrift",
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
      timesheet.has_signature ? "ja" : "nein",
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
    link.download = "kundenportal-stundenzettel.csv";
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
                Kundenportal
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Freigaben und Kundenpruefung
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {[
              {
                label: "Stunden laufende Woche",
                value: summary?.metrics.current_week_hours ?? 0,
                suffix: "h",
                icon: <Clock3 className="w-5 h-5" />,
              },
              {
                label: "Eingereichte Zettel",
                value: summary?.metrics.submitted_timesheets ?? 0,
                suffix: "",
                icon: <CalendarClock className="w-5 h-5" />,
              },
              {
                label: "Fehlende Stundenzettel",
                value:
                  summary?.metrics.missing_timesheets ??
                  employeeCountWithoutCurrentWeekSheet,
                suffix: "",
                icon: <Users className="w-5 h-5" />,
              },
              {
                label: "Audit-Eintraege",
                value: auditEntries.length,
                suffix: "",
                icon: <ShieldCheck className="w-5 h-5" />,
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
                    Eingereichte Stundenzettel
                  </h2>
                  <div className="space-y-3">
                    {submittedTimesheets.map((timesheet) => (
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
                          {canApprove && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAddComment(timesheet.id)}
                                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Kommentar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "reviewed")}
                                className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                              >
                                Pruefen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "approved")}
                                className="rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Freigeben
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "rejected")}
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
                    {submittedTimesheets.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Aktuell keine eingereichten Stundenzettel.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">
                    Fehlende Stundenzettel
                  </h2>
                  <div className="space-y-2">
                    {(summary?.missing_employees || []).map((employeeName) => (
                      <div
                        key={employeeName}
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                      >
                        {employeeName}
                      </div>
                    ))}
                    {(summary?.missing_employees || []).length === 0 && (
                      <div className="text-sm text-slate-500">
                        Fuer die laufende Woche sind aktuell keine fehlenden
                        Stundenzettel erkannt.
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
                      <th className="py-2 pr-4">Zettel gesamt</th>
                      <th className="py-2 pr-4">Stunden laufende Woche</th>
                      <th className="py-2 pr-4">Abwesenheiten</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Laufende Woche vorhanden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.employee_name} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {employee.employee_name}
                        </td>
                        <td className="py-3 pr-4">{employee.timesheet_count}</td>
                        <td className="py-3 pr-4">{employee.current_week_hours}h</td>
                        <td className="py-3 pr-4">{employee.current_absence_days}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClasses[employee.latest_status] || statusClasses.open
                            }`}
                          >
                            {formatStatus(employee.latest_status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {employee.has_current_week_timesheet ? "Ja" : "Nein"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <option value="reviewed">Geprueft</option>
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
                      <th className="py-2 pr-4">Status und Verlauf</th>
                      <th className="py-2 pr-4">Unterschrift</th>
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
                        <td className="py-3 pr-4">{timesheet.has_signature ? "Ja" : "Nein"}</td>
                        {canApprove && (
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddComment(timesheet.id)}
                                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Kommentar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "reviewed")}
                                className="rounded-xl border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                              >
                                Pruefen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "approved")}
                                className="rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Freigeben
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewAction(timesheet.id, "rejected")}
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

            {activeTab === "audit" && (
              <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Audit-Log Kundenportal
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
                          Noch keine Audit-Eintraege vorhanden.
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
    </div>
  );
};
