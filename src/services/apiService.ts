/**
 * API Service für Backend-Kommunikation
 * Zentrale Stelle für alle API-Calls
 */

import type {
  CompanyConfig,
  PdfConfig,
  TechnicalConfig,
  WorkSettings,
  EmailConfig,
} from "../types/config.types";
import type { WeekData } from "../types/weekdata.types";

const DEFAULT_API_BASE_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/backend`
    : "http://localhost:8000/backend";

const API_BASE_URL =
  import.meta.env.VITE_FORCE_API === "true" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : DEFAULT_API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  timestamp: string;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

class ApiRequestError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

interface LoginResponse {
  id: number;
  account_id?: number | null;
  username: string;
  email: string;
  role?: string;
  customer_key?: string;
  token?: string;
}

export interface AccountDto {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at?: string | null;
  updated_at?: string | null;
}

export interface PortalSummaryDto {
  current_week: {
    year: number;
    week: number;
  };
  metrics: {
    current_week_hours: number;
    submitted_timesheets: number;
    missing_timesheets: number;
    current_absence_days: number;
    ready_for_approval: number;
    ready_for_review: number;
  };
  missing_employees: string[];
}

export interface PortalEmployeeDto {
  employee_name: string;
  timesheet_count: number;
  current_week_hours: number;
  current_absence_days: number;
  latest_status: string;
  last_updated_at?: string | null;
  has_current_week_timesheet: boolean;
}

export interface PortalTimesheetDto {
  id: number;
  employee_name: string;
  week_year: number;
  week_number: number;
  sheet_id: string;
  customer: string;
  week_data: WeekData;
  status: string;
  portal_queue?: string;
  workflow_status: string;
  hours_total: number;
  absence_days: number;
  has_signature: boolean;
  has_employee_signature: boolean;
  has_supervisor_signature: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  customer_comment?: string | null;
  history?: Array<{
    timestamp: string;
    action: string;
    status?: string;
    actor?: string;
    actorRole?: string;
    comment?: string;
  }>;
  updated_at?: string | null;
}

export interface PortalAbsenceDto {
  timesheet_id: number;
  employee_name: string;
  date: string;
  absence: string;
  absence_note: string;
  week_year: number;
  week_number: number;
  sheet_id: string;
  customer: string;
}

export interface PortalAuditLogDto {
  id: number;
  action: string;
  created_at?: string | null;
  timesheet_id?: number | null;
  sheet_id?: string | null;
  employee_name?: string | null;
  status?: string | null;
  comment?: string | null;
  actor?: string | null;
  actor_role?: string | null;
}

export interface EmployeeSessionDto {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  has_name_duplicates?: boolean;
  customer_key: string;
  last_login_at?: string | null;
}

interface EmployeeAuthPayload {
  employee: EmployeeSessionDto;
  created?: boolean;
  csrf_token?: string;
}

interface EmployeeSessionPayload {
  employee: EmployeeSessionDto | null;
  csrf_token?: string;
}

export interface TimesheetApiPayload<TWeekData = unknown> {
  id: number;
  week_year?: number | null;
  week_number?: number | null;
  sheet_id?: string | null;
  updated_at?: string | null;
  weekData: TWeekData;
}

class ApiService {
  private baseUrl: string;
  private customerKey: string;
  private authToken: string;
  private employeeCsrfToken: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.customerKey = import.meta.env.VITE_CUSTOMER_KEY || "";
    this.authToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("admin_auth_token") || ""
        : "";
    this.employeeCsrfToken = "";
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("employee_session_token");
    }
  }

  setBaseUrl(baseUrl: string): void {
    const trimmed = (baseUrl || "").trim();
    if (!trimmed) return;
    // Absolute localhost-URLs auf aktuellen Origin normalisieren (Dev: Port kann wechseln)
    if (typeof window !== "undefined" && /^https?:\/\/localhost:\d+/.test(trimmed)) {
      const url = new URL(trimmed);
      this.baseUrl = `${window.location.origin}${url.pathname}`;
      return;
    }
    this.baseUrl = trimmed;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setCustomerKey(customerKey: string): void {
    this.customerKey = (customerKey || "").trim();
  }

  setAuthToken(token: string): void {
    this.authToken = (token || "").trim();
  }

  setEmployeeCsrfToken(token: string): void {
    this.employeeCsrfToken = (token || "").trim();
  }

  private getCookieValue(name: string): string {
    if (typeof document === "undefined") {
      return "";
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
    );

    if (!match) {
      return "";
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  private shouldSilenceApiError(endpoint: string, error: unknown): boolean {
    return (
      endpoint === "/api/employee/session" &&
      error instanceof ApiRequestError &&
      error.status === 401
    );
  }

  /**
   * Generische API-Anfrage mit Error-Handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    // Entferne trailing slash von baseUrl und leading slash von endpoint
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.replace(/^\//, "");
    const url = `${cleanBaseUrl}/${cleanEndpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.customerKey) {
      (defaultHeaders as Record<string, string>)["X-Customer-Key"] = this.customerKey;
    }
    if (this.authToken) {
      (defaultHeaders as Record<string, string>)["Authorization"] = `Bearer ${this.authToken}`;
    }
    const employeeCsrfToken =
      this.getCookieValue("employee_csrf") || this.employeeCsrfToken;
    if (employeeCsrfToken) {
      (defaultHeaders as Record<string, string>)["X-Employee-CSRF"] = employeeCsrfToken;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "include", // WICHTIG für Session-Cookies!
    };

    try {
      const response = await fetch(url, config);

      // JSON parsen
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Invalid JSON response from API");
      }

      // HTTP-Fehler prüfen
      if (!response.ok) {
        throw new ApiRequestError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data.code,
          data.data,
        );
      }

      return data;
    } catch (error) {
      if (!this.shouldSilenceApiError(endpoint, error)) {
        console.error(`API Error (${endpoint}):`, error);
      }

      // Network-Error vs. API-Error unterscheiden
      if (
        error instanceof Error &&
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        throw new Error("Netzwerkfehler: API nicht erreichbar");
      }

      throw error;
    }
  }

  // GET-Request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  // POST-Request
  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // PUT-Request
  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  // ==========================================
  // Auth-Endpoints
  // ==========================================

  async login(
    username: string,
    password: string,
  ): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>("/auth/login", { username, password });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.post<null>("/auth/logout", {});
  }

  async getCurrentUser(): Promise<ApiResponse<LoginResponse>> {
    return this.get<LoginResponse>("/auth/me");
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<null>> {
    return this.post<null>("/api/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async getAccounts(): Promise<ApiResponse<AccountDto[]>> {
    return this.get<AccountDto[]>("/api/accounts");
  }

  async createAccount(payload: {
    username: string;
    password: string;
    role: string;
    email?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<AccountDto>> {
    return this.post<AccountDto>("/api/accounts/create", payload);
  }

  async updateAccount(
    accountId: number,
    payload: {
      role?: string;
      email?: string;
      is_active?: boolean;
      password?: string;
    },
  ): Promise<ApiResponse<AccountDto>> {
    return this.put<AccountDto>(`/api/accounts/${accountId}`, payload);
  }

  async getPortalSummary(): Promise<ApiResponse<PortalSummaryDto>> {
    return this.get<PortalSummaryDto>("/api/portal/summary");
  }

  async getPortalEmployees(): Promise<ApiResponse<PortalEmployeeDto[]>> {
    return this.get<PortalEmployeeDto[]>("/api/portal/employees");
  }

  async getPortalTimesheets(params?: {
    year?: number;
    week?: number;
    month?: number;
    employeeName?: string;
    status?: string;
  }): Promise<ApiResponse<PortalTimesheetDto[]>> {
    const search = new URLSearchParams();
    if (params?.year != null) search.set("year", String(params.year));
    if (params?.week != null) search.set("week", String(params.week));
    if (params?.month != null) search.set("month", String(params.month));
    if (params?.employeeName) search.set("employeeName", params.employeeName);
    if (params?.status) search.set("status", params.status);
    const suffix = search.toString();
    return this.get<PortalTimesheetDto[]>(
      `/api/portal/timesheets${suffix ? `?${suffix}` : ""}`,
    );
  }

  async getPortalAbsences(params?: {
    employeeName?: string;
  }): Promise<ApiResponse<PortalAbsenceDto[]>> {
    const search = new URLSearchParams();
    if (params?.employeeName) search.set("employeeName", params.employeeName);
    const suffix = search.toString();
    return this.get<PortalAbsenceDto[]>(
      `/api/portal/absences${suffix ? `?${suffix}` : ""}`,
    );
  }

  async getPortalAuditLog(params?: {
    timesheetId?: number;
    limit?: number;
  }): Promise<ApiResponse<PortalAuditLogDto[]>> {
    const search = new URLSearchParams();
    if (params?.timesheetId != null) search.set("timesheetId", String(params.timesheetId));
    if (params?.limit != null) search.set("limit", String(params.limit));
    const suffix = search.toString();
    return this.get<PortalAuditLogDto[]>(
      `/api/portal/audit-log${suffix ? `?${suffix}` : ""}`,
    );
  }

  async updatePortalTimesheetStatus(
    timesheetId: number,
    payload: {
      status: "reviewed" | "approved" | "rejected";
      rejectionReason?: string;
      comment?: string;
    },
  ): Promise<ApiResponse<PortalTimesheetDto>> {
    return this.post<PortalTimesheetDto>(
      `/api/portal/timesheets/${timesheetId}/status`,
      payload,
    );
  }

  async addPortalTimesheetComment(
    timesheetId: number,
    payload: {
      comment: string;
    },
  ): Promise<ApiResponse<PortalTimesheetDto>> {
    return this.post<PortalTimesheetDto>(
      `/api/portal/timesheets/${timesheetId}/comment`,
      payload,
    );
  }

  async registerEmployee(payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    pin: string;
  }): Promise<ApiResponse<EmployeeAuthPayload>> {
    const response = await this.post<EmployeeAuthPayload>("/api/employee/register", payload);
    if (response.success && response.data?.csrf_token) {
      this.setEmployeeCsrfToken(response.data.csrf_token);
    }
    return response;
  }

  async loginEmployee(payload: {
    firstName: string;
    lastName: string;
    pin: string;
    phoneNumber?: string;
  }): Promise<ApiResponse<EmployeeAuthPayload>> {
    const response = await this.post<EmployeeAuthPayload>("/api/employee/login", payload);
    if (response.success && response.data?.csrf_token) {
      this.setEmployeeCsrfToken(response.data.csrf_token);
    }
    return response;
  }

  async resetEmployeePin(payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    pin: string;
  }): Promise<ApiResponse<EmployeeAuthPayload>> {
    const response = await this.post<EmployeeAuthPayload>("/api/employee/reset-pin", payload);
    if (response.success && response.data?.csrf_token) {
      this.setEmployeeCsrfToken(response.data.csrf_token);
    }
    return response;
  }

  async updateEmployeePhone(payload: {
    phoneNumber: string;
    pin: string;
  }): Promise<ApiResponse<EmployeeAuthPayload>> {
    return this.post<EmployeeAuthPayload>("/api/employee/update-phone", payload);
  }

  async logoutEmployee(): Promise<ApiResponse<null>> {
    this.setEmployeeCsrfToken("");
    return this.post<null>("/api/employee/logout", {});
  }

  async getEmployeeSession(): Promise<ApiResponse<EmployeeSessionPayload>> {
    const response = await this.get<EmployeeSessionPayload>("/api/employee/session");
    if (response.success && response.data?.csrf_token) {
      this.setEmployeeCsrfToken(response.data.csrf_token);
    }
    if (response.success && !response.data?.employee) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("employee_session_token");
      }
      this.setEmployeeCsrfToken("");
    }
    return response;
  }

  async saveTimesheet<TWeekData>(payload: {
    weekData: TWeekData;
    year: number;
    week: number;
    sheetId?: number | string;
    displayName?: string;
  }): Promise<
    ApiResponse<{
      id: number;
      week_year: number;
      week_number: number;
      sheet_id: string;
    }>
  > {
    return this.post("/api/save-timesheet", payload);
  }

  async getTimesheet<TWeekData>(
    year: number,
    week: number,
    sheetId: number | string = 1,
  ): Promise<ApiResponse<TimesheetApiPayload<TWeekData> | null>> {
    const search = new URLSearchParams({
      year: String(year),
      week: String(week),
      sheetId: String(sheetId),
    });
    return this.get(`/api/get-timesheet?${search.toString()}`);
  }

  async listTimesheets<TWeekData>(params?: {
    year?: number;
    week?: number;
    limit?: number;
  }): Promise<ApiResponse<Array<TimesheetApiPayload<TWeekData>>>> {
    const search = new URLSearchParams();
    if (params?.year != null) search.set("year", String(params.year));
    if (params?.week != null) search.set("week", String(params.week));
    if (params?.limit != null) search.set("limit", String(params.limit));
    const suffix = search.toString();
    return this.get(`/api/list-timesheets${suffix ? `?${suffix}` : ""}`);
  }

  async archiveTimesheet(payload: {
    year: number;
    week: number;
    sheetId?: number | string;
  }): Promise<
    ApiResponse<{
      archived: boolean;
      already_missing?: boolean;
      week_year: number;
      week_number: number;
      sheet_id: string;
      archived_at?: string | null;
    }>
  > {
    return this.post("/api/archive-timesheet", payload);
  }

  // ==========================================
  // Config-Endpoints
  // ==========================================

  async getConfig(): Promise<
    ApiResponse<{
      company: CompanyConfig;
      pdf: PdfConfig;
      technical: TechnicalConfig;
      work: WorkSettings;
    }>
  > {
    return this.get("/api/get-admin-config");
  }

  async getAppConfig(): Promise<
    ApiResponse<{
      company: CompanyConfig;
      pdf: PdfConfig;
      technical: TechnicalConfig;
      work: WorkSettings;
    }>
  > {
    return this.get("/api/get-app-config");
  }

  async updateCompanyConfig(config: CompanyConfig): Promise<ApiResponse<null>> {
    return this.put("/api/save-admin-config", { company: config });
  }

  async updatePdfConfig(config: PdfConfig): Promise<ApiResponse<null>> {
    return this.put("/api/save-admin-config", { pdf: config });
  }

  async updateTechnicalConfig(
    config: TechnicalConfig,
  ): Promise<ApiResponse<null>> {
    return this.put("/api/save-admin-config", { technical: config });
  }

  async updateWorkSettings(settings: WorkSettings): Promise<ApiResponse<null>> {
    return this.put("/api/save-admin-config", { work: settings });
  }

  async updateEmailConfig(config: EmailConfig): Promise<ApiResponse<null>> {
    return this.put("/api/save-admin-config", { email: config });
  }

  async testEmail(recipientEmail: string): Promise<
    ApiResponse<{
      smtp_host: string;
      smtp_port: number;
      from_email: string;
    }>
  > {
    return this.post("/api/test-email", { recipient_email: recipientEmail });
  }

  // ==========================================
  // PDF-Versand
  // ==========================================

  async sendPdf(data: {
    pdf_base64: string;
    recipient_email: string;
    recipient_whatsapp?: string;
    document_type: "timesheet" | "vacation" | "advance_payment";
    employee_name: string;
    filename?: string;
    week_number?: number;
    week_year?: number;
    date_range?: string;
    total_hours?: number;
    amount?: number; // Für Vorschussanträge
  }): Promise<
    ApiResponse<{
      log_id: number;
      status: string;
      message: string;
    }>
  > {
    return this.post("/send-pdf", data);
  }

  // ==========================================
  // Health-Check
  // ==========================================

  async healthCheck(): Promise<
    ApiResponse<{
      status: string;
      version: string;
      timestamp: string;
      database: string;
      php_version: string;
    }>
  > {
    return this.get("/health");
  }
}

// Singleton-Instanz exportieren
export const apiService = new ApiService();
