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
}

interface LoginResponse {
  id: number;
  account_id?: number | null;
  username: string;
  email: string;
  role?: string;
  customer_key?: string;
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

class ApiService {
  private baseUrl: string;
  private customerKey: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.customerKey = import.meta.env.VITE_CUSTOMER_KEY || "";
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
        throw new Error(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);

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
