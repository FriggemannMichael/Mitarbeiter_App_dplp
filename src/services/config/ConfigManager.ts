import type { AppConfiguration } from "../../types/config.types";
import { apiService } from "../apiService";

/**
 * Singleton Config Manager
 *
 * Single Source of Truth fÃ¼r Konfiguration
 * - LÃ¤dt Config aus API/localStorage/config.json/Defaults
 * - Subscriber-Pattern fÃ¼r React-Components
 * - Kein eigenes Caching (das macht ConfigContext)
 */
export class ConfigManager {
  private static instance: ConfigManager;

  // Subscriber fÃ¼r State-Updates
  private subscribers = new Set<(config: AppConfiguration) => void>();

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * LÃ¤dt Konfiguration (Fallback-Chain)
   * 1. REST API (App Config) - standardmÃ¤ÃŸig aktiviert, auÃŸer VITE_SKIP_API=true
   * 2. localStorage (Offline)
   * 3. config.json (Static)
   * 4. Defaults
   */
  async loadConfiguration(): Promise<AppConfiguration> {
    const skipApi = import.meta.env.VITE_SKIP_API === "true";
    let staticConfigJsonRaw: any | null = null;
    const staticConfigUrls = this.getStaticConfigUrls();

    // Demo-/Static-only Mode: Keine API und kein localStorage-Fallback auf evtl. alte Kundenstaende.
    if (skipApi) {
      try {
        for (const configUrl of staticConfigUrls) {
          const response = await fetch(`${configUrl}?t=${Date.now()}`);
          if (!response.ok) {
            continue;
          }

          const jsonDataRaw = (await response.json()) as any;
          const jsonData = this.migrateLegacyConfigShape(jsonDataRaw);
          const defaults = this.getDefaultConfiguration();

          const config: AppConfiguration = {
            company: {
              ...ConfigManager.mergeWithDefaults(
                defaults.company,
                jsonData.company,
              ),
              allowed_emails:
                jsonData.company?.allowed_emails ||
                defaults.company.allowed_emails,
              allowed_whatsapp:
                jsonData.company?.allowed_whatsapp ||
                defaults.company.allowed_whatsapp,
            },
            pdf: ConfigManager.mergeWithDefaults(defaults.pdf, jsonData.pdf),
            technical: {
              ...ConfigManager.mergeWithDefaults(
                defaults.technical,
                jsonData.technical,
              ),
              cors_allowed_origins:
                jsonData.technical?.cors_allowed_origins ||
                defaults.technical.cors_allowed_origins,
            },
            work: ConfigManager.mergeWithDefaults(defaults.work, jsonData.work),
            email: ConfigManager.mergeWithDefaults(
              defaults.email,
              jsonData.email,
            ),
            admin: jsonData.admin || defaults.admin,
            isLoaded: true,
          };

          const normalizedConfig = this.normalizeConfig(config);
          const runtimeApiEndpoint = normalizedConfig.technical?.api_endpoint;
          if (
            typeof runtimeApiEndpoint === "string" &&
            runtimeApiEndpoint.trim() !== ""
          ) {
            apiService.setBaseUrl(runtimeApiEndpoint);
            apiService.setCustomerKey(normalizedConfig.technical.customer_key || "");
          }
          this.saveToLocalStorage(normalizedConfig);
          return normalizedConfig;
        }
      } catch {
        // Falls config nicht ladbar ist, auf Defaults zurueckfallen.
      }

      const fallbackConfig = this.normalizeConfig(this.getDefaultConfiguration());
      apiService.setBaseUrl(fallbackConfig.technical.api_endpoint);
      apiService.setCustomerKey(fallbackConfig.technical.customer_key || "");
      return fallbackConfig;
    }

    // Prefer tenant-specific endpoint from static config before first API request.
    if (!skipApi) {
      try {
        for (const configUrl of staticConfigUrls) {
          const response = await fetch(`${configUrl}?t=${Date.now()}`);
          if (response.ok) {
            staticConfigJsonRaw = (await response.json()) as any;
            const migrated = this.migrateLegacyConfigShape(staticConfigJsonRaw);
            const apiEndpoint = migrated?.technical?.api_endpoint;
            if (typeof apiEndpoint === "string" && apiEndpoint.trim() !== "") {
              apiService.setBaseUrl(apiEndpoint);
              apiService.setCustomerKey(migrated?.technical?.customer_key || "");
            }
            break;
          }
        }
      } catch {
        // Ignore: we'll fall back to localStorage/config.json/defaults below.
      }
    }

    // 1. Versuche REST API fÃ¼r App-Konfiguration (standardmÃ¤ÃŸig aktiviert)
    if (!skipApi) {
      try {
        const response = await apiService.getAppConfig();
        if (response.success && response.data) {
          // Backend liefert response.data.data statt response.data
          const responseData = response.data as any;
          const apiDataRaw = responseData.data || responseData; // Unwrap extra "data" layer
          const apiData = this.migrateLegacyConfigShape(apiDataRaw);
          const defaults = this.getDefaultConfiguration();

          const config: AppConfiguration = {
            company: {
              ...ConfigManager.mergeWithDefaults(
                defaults.company,
                apiData.company,
              ),
              // Logo-Normalisierung (immer anwenden)
              company_logo: this.normalizeLogoData(
                apiData.company?.company_logo,
              ),
              // Arrays explizit behandeln (wichtig!)
              allowed_emails:
                apiData.company?.allowed_emails ||
                defaults.company.allowed_emails,
              allowed_whatsapp:
                apiData.company?.allowed_whatsapp ||
                defaults.company.allowed_whatsapp,
            },
            pdf: ConfigManager.mergeWithDefaults(defaults.pdf, apiData.pdf),
            technical: {
              ...ConfigManager.mergeWithDefaults(
                defaults.technical,
                apiData.technical,
              ),
              cors_allowed_origins:
                apiData.technical?.cors_allowed_origins ||
                defaults.technical.cors_allowed_origins,
            },
            work: ConfigManager.mergeWithDefaults(defaults.work, apiData.work),
            admin: { password: "" },
            email: ConfigManager.mergeWithDefaults(
              defaults.email,
              apiData.email,
            ),
            isLoaded: true,
            lastUpdated: new Date(),
          };

          const normalizedConfig = this.normalizeConfig(config);
          const runtimeApiEndpoint = normalizedConfig.technical?.api_endpoint;
          if (
            typeof runtimeApiEndpoint === "string" &&
            runtimeApiEndpoint.trim() !== ""
          ) {
            apiService.setBaseUrl(runtimeApiEndpoint);
            apiService.setCustomerKey(normalizedConfig.technical.customer_key || "");
          }
          this.saveToLocalStorage(normalizedConfig);
          return normalizedConfig;
        }
      } catch (error) {
        console.warn("API nicht erreichbar, versuche localStorage");
      }
    }

    // 2. localStorage (Offline)
    const localConfig = this.loadFromLocalStorage();
    if (localConfig) {
      const migratedLocalConfig = this.migrateLegacyConfigShape(localConfig);
      const ignoreLocalConfig = (() => {
        if (!staticConfigJsonRaw) return false;

        const migratedStatic = this.migrateLegacyConfigShape(staticConfigJsonRaw);
        const staticEndpoint = migratedStatic?.technical?.api_endpoint;
        const localEndpoint = migratedLocalConfig?.technical?.api_endpoint;

        // If the API endpoint differs, the cache is very likely from another customer/build.
        if (
          typeof staticEndpoint === "string" &&
          staticEndpoint.trim() !== "" &&
          typeof localEndpoint === "string" &&
          localEndpoint.trim() !== "" &&
          staticEndpoint.trim() !== localEndpoint.trim()
        ) {
          return true;
        }

        return false;
      })();

      if (ignoreLocalConfig) {
        // Continue with config.json (Static) below.
      } else {
        const defaults = this.getDefaultConfiguration();

        // Ensure arrays exist
        const safeConfig: AppConfiguration = {
          ...migratedLocalConfig,
          company: {
            ...ConfigManager.mergeWithDefaults(
              defaults.company,
              migratedLocalConfig.company,
            ),
            allowed_emails:
              migratedLocalConfig.company?.allowed_emails ||
              defaults.company.allowed_emails,
            allowed_whatsapp:
              migratedLocalConfig.company?.allowed_whatsapp ||
              defaults.company.allowed_whatsapp,
          },
          pdf: ConfigManager.mergeWithDefaults(
            defaults.pdf,
            migratedLocalConfig.pdf,
          ),
          technical: {
            ...ConfigManager.mergeWithDefaults(
              defaults.technical,
              migratedLocalConfig.technical,
            ),
            cors_allowed_origins:
              migratedLocalConfig.technical?.cors_allowed_origins ||
              defaults.technical.cors_allowed_origins,
          },
          work: ConfigManager.mergeWithDefaults(
            defaults.work,
            migratedLocalConfig.work,
          ),
          email: ConfigManager.mergeWithDefaults(
            defaults.email,
            migratedLocalConfig.email,
          ),
          admin: migratedLocalConfig.admin || defaults.admin,
          isLoaded: migratedLocalConfig.isLoaded ?? true,
          lastUpdated: migratedLocalConfig.lastUpdated || new Date(),
        };

        const normalizedConfig = this.normalizeConfig(safeConfig);
        const runtimeApiEndpoint = normalizedConfig.technical?.api_endpoint;
        if (
          typeof runtimeApiEndpoint === "string" &&
          runtimeApiEndpoint.trim() !== ""
        ) {
          apiService.setBaseUrl(runtimeApiEndpoint);
          apiService.setCustomerKey(normalizedConfig.technical.customer_key || "");
        }
        return normalizedConfig;
      }
    }

    // 3. config.json (Static)
    try {
      const jsonDataRaw =
        staticConfigJsonRaw ??
        (await (async () => {
          for (const configUrl of staticConfigUrls) {
            const response = await fetch(`${configUrl}?t=${Date.now()}`);
            if (response.ok) {
              return (await response.json()) as any;
            }
          }
          return null;
        })());

      if (jsonDataRaw) {
        const jsonData = this.migrateLegacyConfigShape(jsonDataRaw);
        const defaults = this.getDefaultConfiguration();

        const config: AppConfiguration = {
          company: {
            ...ConfigManager.mergeWithDefaults(
              defaults.company,
              jsonData.company,
            ),
            allowed_emails:
              jsonData.company?.allowed_emails ||
              defaults.company.allowed_emails,
            allowed_whatsapp:
              jsonData.company?.allowed_whatsapp ||
              defaults.company.allowed_whatsapp,
          },
          pdf: ConfigManager.mergeWithDefaults(defaults.pdf, jsonData.pdf),
          technical: {
            ...ConfigManager.mergeWithDefaults(
              defaults.technical,
              jsonData.technical,
            ),
            cors_allowed_origins:
              jsonData.technical?.cors_allowed_origins ||
              defaults.technical.cors_allowed_origins,
          },
          work: ConfigManager.mergeWithDefaults(defaults.work, jsonData.work),
          email: ConfigManager.mergeWithDefaults(
            defaults.email,
            jsonData.email,
          ),
          admin: jsonData.admin || defaults.admin,
          isLoaded: true,
        };

        const normalizedConfig = this.normalizeConfig(config);
        const runtimeApiEndpoint = normalizedConfig.technical?.api_endpoint;
        if (
          typeof runtimeApiEndpoint === "string" &&
          runtimeApiEndpoint.trim() !== ""
        ) {
          apiService.setBaseUrl(runtimeApiEndpoint);
          apiService.setCustomerKey(normalizedConfig.technical.customer_key || "");
        }
        this.saveToLocalStorage(normalizedConfig);
        return normalizedConfig;
      }
    } catch (error) {
      console.warn("config.json nicht verfÃ¼gbar");
    }

    // 4. Fallback: Defaults
    const fallbackConfig = this.normalizeConfig(this.getDefaultConfiguration());
    apiService.setBaseUrl(fallbackConfig.technical.api_endpoint);
    apiService.setCustomerKey(fallbackConfig.technical.customer_key || "");
    return fallbackConfig;
  }

  /**
   * Speichert Config-Update in API + localStorage
   */
  async saveConfiguration(config: AppConfiguration): Promise<void> {
    // API speichern (wenn verfÃ¼gbar)
    try {
      // API-Call fÃ¼r vollstÃ¤ndigen Config-Save
      // Aktuell gibt es nur partielle Updates via configService
    } catch (error) {
      // API-Save fehlgeschlagen
    }

    // localStorage speichern
    this.saveToLocalStorage(config);

    // Subscribers benachrichtigen
    this.notifySubscribers(config);
  }

  /**
   * Subscriber-Pattern fÃ¼r React-Components
   */
  subscribe(callback: (config: AppConfiguration) => void): () => void {
    this.subscribers.add(callback);

    // Cleanup-Funktion
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Cache invalidieren (z.B. nach Logout)
   */
  clearCache(): void {
    localStorage.removeItem(this.getCacheKey());
    this.notifySubscribers(this.getDefaultConfiguration());
  }

  /**
   * Holt die API-Endpoint-URL aus der Konfiguration
   */
  async getApiEndpoint(): Promise<string> {
    const config = await this.loadConfiguration();
    return config.technical.api_endpoint || this.getRuntimeApiEndpoint();
  }

  /**
   * Holt die WhatsApp Base-URL aus der Konfiguration
   */
  async getWhatsAppBaseUrl(): Promise<string> {
    const config = await this.loadConfiguration();
    return config.technical.whatsapp_base_url || "https://wa.me/";
  }

  /**
   * Holt die App-Domain aus der Konfiguration
   */
  async getAppDomain(): Promise<string> {
    const config = await this.loadConfiguration();
    return (
      config.technical.app_domain ||
      config.technical.pwa_qr_code_url ||
      this.getRuntimeOrigin()
    );
  }

  /**
   * Holt die Backend-Domain aus der Konfiguration
   */
  async getBackendDomain(): Promise<string> {
    const config = await this.loadConfiguration();
    return (
      config.technical.backend_domain ||
      config.technical.app_domain ||
      config.technical.pwa_qr_code_url ||
      this.getRuntimeOrigin()
    );
  }

  /**
   * Holt die CORS Allowed Origins aus der Konfiguration
   */
  async getCorsAllowedOrigins(): Promise<string[]> {
    const config = await this.loadConfiguration();
    return config.technical.cors_allowed_origins || this.getRuntimeCorsOrigins();
  }

  // Private Helpers

  private getRuntimeOrigin(): string {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "http://localhost:5173";
  }

  private getRuntimeApiEndpoint(): string {
    return `${this.getRuntimeOrigin()}/backend`;
  }

  private getRuntimeCorsOrigins(): string[] {
    return Array.from(new Set([this.getRuntimeOrigin(), "http://localhost:5173"]));
  }

  notifySubscribersPublic(config: AppConfiguration): void {
    this.notifySubscribers(config);
  }

  private notifySubscribers(config: AppConfiguration): void {
    this.subscribers.forEach((callback) => callback(config));
  }

  private saveToLocalStorage(config: AppConfiguration): void {
    try {
      localStorage.setItem(this.getCacheKey(), JSON.stringify(config));
    } catch (error) {
      console.error("localStorage write failed:", error);
    }
  }

  private loadFromLocalStorage(): AppConfiguration | null {
    try {
      const cached = localStorage.getItem(this.getCacheKey());
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error("localStorage read failed:", error);
    }
    return null;
  }

  private getCacheKey(): string {
    const configPath =
      typeof import.meta.env.VITE_CONFIG_PATH === "string"
        ? import.meta.env.VITE_CONFIG_PATH.trim()
        : "";

    if (!configPath) {
      return "app_config";
    }

    const normalized = configPath.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `app_config__${normalized}`;
  }

  private getDefaultConfiguration(): AppConfiguration {
    // Defaults aus .env mit neutralen Fallback-Werten
    const runtimeOrigin = this.getRuntimeOrigin();
    const runtimeApiEndpoint = this.getRuntimeApiEndpoint();
    const defaultCompanyEmail =
      import.meta.env.VITE_DEFAULT_EMAIL || "info@example.com";

    return {
      company: {
        company_name:
          import.meta.env.VITE_COMPANY_NAME ||
          "Ihre Firma GmbH",
        company_address:
          import.meta.env.VITE_COMPANY_ADDRESS ||
          "Musterstrasse 1, 12345 Musterstadt",
        company_phone: import.meta.env.VITE_COMPANY_PHONE || "+49 123 4567890",
        company_email: import.meta.env.VITE_COMPANY_EMAIL || defaultCompanyEmail,
        primary_color: import.meta.env.VITE_PRIMARY_COLOR || "#1e3a8a",
        theme_color: import.meta.env.VITE_THEME_COLOR || "#1e3a8a",
        allowed_emails: import.meta.env.VITE_ALLOWED_EMAILS
          ? import.meta.env.VITE_ALLOWED_EMAILS.split(",").map((e: string) =>
              e.trim(),
            )
          : [defaultCompanyEmail],
        allowed_whatsapp: import.meta.env.VITE_ALLOWED_WHATSAPP
          ? import.meta.env.VITE_ALLOWED_WHATSAPP.split(",").map((n: string) =>
              n.trim(),
            )
          : ["+49 123 4567890"],
        default_email: defaultCompanyEmail,
        default_whatsapp:
          import.meta.env.VITE_DEFAULT_WHATSAPP || "+49 123 4567890",
        company_logo: "/customers/DPL%20Logo.svg",
      },
      pdf: {
        app_name: "Stundennachweis Pro",
        app_short_name: "Mitarbeiter Pro",
        pdf_title_prefix: "Stundennachweis",
        pdf_author: "Mitarbeiter Pro App",
        pdf_footer_text: "Erstellt mit Mitarbeiter Pro App",
        timesheet_header: "STUNDENNACHWEIS",
        advance_payment_header: "VORSCHUSSANTRAG",
        vacation_header: "URLAUBSANTRAG",
        signature_label: "Vorgesetzter",
        legal_notice_advance_payment: "",
        qr_code_app_identifier: "Mitarbeiter Pro",
      },
      technical: {
        customer_key: "default",
        api_endpoint: runtimeApiEndpoint,
        deployment_path: "/",
        qr_code_type_timesheet: "TIMESHEET",
        qr_code_type_vacation: "VACATION_REQUEST",
        qr_code_type_advance_payment: "ADVANCE_PAYMENT",
        enable_whatsapp: true,
        enable_email: true,
        pwa_qr_code_url: runtimeOrigin,
        app_domain: runtimeOrigin,
        backend_domain: runtimeOrigin,
        whatsapp_base_url: "https://wa.me/",
        cors_allowed_origins: this.getRuntimeCorsOrigins(),
        feature_flags: {},
      },
      work: {
        max_work_hours_per_day: 12,
        default_break_minutes: 60,
        filename_pattern:
          "Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}",
        auto_save_enabled: true,
        offline_mode_enabled: true,
        auto_logout_minutes: 240,
        backup_reminder_days: 7,
        enable_signature_requirement: true,
        enable_photo_upload: false,
        date_format: "DD.MM.YYYY",
        time_format: "HH:mm",
      },
      admin: {
        password: "admin123",
      },
      email: {
        smtp_host: "smtp.office365.com",
        smtp_port: 587,
        smtp_encryption: "tls",
        smtp_username: defaultCompanyEmail,
        smtp_password: "",
        from_email: defaultCompanyEmail,
        from_name: `${import.meta.env.VITE_COMPANY_NAME || "Ihre Firma"} App`,
      },
      isLoaded: false,
    };
  }

  // Normalisiert konfigurationsabhaengige Pfade (z.B. Logos) auf Basis der Vite-Base-URL
  private normalizeConfig(config: AppConfiguration): AppConfiguration {
    const normalizedLogo = this.normalizeAssetPath(config.company.company_logo);

    return {
      ...config,
      company: {
        ...config.company,
        company_logo: normalizedLogo,
      },
    };
  }

  private migrateLegacyConfigShape(raw: any): any {
    if (!raw || typeof raw !== "object") {
      return raw;
    }

    const migrated = JSON.parse(JSON.stringify(raw));

    if (migrated.pdf && typeof migrated.pdf === "object") {
      if (
        (migrated.pdf.advance_payment_header === undefined ||
          migrated.pdf.advance_payment_header === null ||
          migrated.pdf.advance_payment_header === "") &&
        migrated.pdf.sick_leave_header
      ) {
        migrated.pdf.advance_payment_header = migrated.pdf.sick_leave_header;
      }

      if (
        migrated.pdf.legal_notice_advance_payment === undefined &&
        migrated.pdf.legal_notice_sick_leave !== undefined
      ) {
        migrated.pdf.legal_notice_advance_payment =
          migrated.pdf.legal_notice_sick_leave;
      }

      delete migrated.pdf.sick_leave_header;
      delete migrated.pdf.legal_notice_sick_leave;
    }

    if (migrated.technical && typeof migrated.technical === "object") {
      if (
        (migrated.technical.qr_code_type_advance_payment === undefined ||
          migrated.technical.qr_code_type_advance_payment === null ||
          migrated.technical.qr_code_type_advance_payment === "") &&
        migrated.technical.qr_code_type_sick_leave
      ) {
        migrated.technical.qr_code_type_advance_payment =
          migrated.technical.qr_code_type_sick_leave;
      }

      delete migrated.technical.qr_code_type_sick_leave;
      delete migrated.technical.feature_sick_leave;
    }

    return migrated;
  }

  // ErgÃ¤nzt relative Asset-Pfade um den konfigurierten Deployment-Basis-Pfad
  private normalizeAssetPath(path?: string | null): string | undefined {
    if (path == null) {
      return path === null ? undefined : path;
    }

    const trimmed = path.trim();
    if (trimmed === "") {
      return trimmed;
    }

    const lowerTrimmed = trimmed.toLowerCase();
    if (
      lowerTrimmed.startsWith("http://") ||
      lowerTrimmed.startsWith("https://") ||
      lowerTrimmed.startsWith("data:") ||
      lowerTrimmed.startsWith("blob:") ||
      lowerTrimmed.startsWith("//")
    ) {
      return trimmed;
    }

    const baseUrl = import.meta.env.BASE_URL || "/";

    if (trimmed.startsWith(baseUrl)) {
      return trimmed;
    }

    const normalizedBase = this.trimTrailingSlash(baseUrl);
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

    if (normalizedBase === "") {
      return normalizedPath;
    }

    return `${normalizedBase}${normalizedPath}`;
  }

  private trimTrailingSlash(value: string): string {
    if (value === "/") {
      return "";
    }

    return value.endsWith("/") ? value.slice(0, -1) : value;
  }

  /**
   * Konvertiert Hex-Logo-Daten zu Data-URL
   */
  private normalizeLogoData(logoData?: string | null): string {
    if (!logoData) return "";

    const trimmed = logoData.trim();

    // Wenn bereits Data-URL oder HTTP-URL
    if (
      trimmed.startsWith("data:") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    // Relative/absolute Asset-Pfade direkt uebernehmen (werden spaeter via normalizeAssetPath auf BASE_URL normalisiert)
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("./") ||
      trimmed.startsWith("../") ||
      trimmed.includes("/") ||
      trimmed.includes("\\")
    ) {
      return trimmed;
    }

    // Nur echte Hex-Binaerdaten in Data-URL umwandeln
    const isHexBinary = /^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0;
    if (!isHexBinary) {
      return trimmed;
    }

    // Hex zu Base64 konvertieren
    try {
      const base64 = this.hexToBase64(trimmed);
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error("Logo-Konvertierung fehlgeschlagen:", error);
      return trimmed;
    }
  }

  private getStaticConfigUrls(): string[] {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const configuredPathRaw =
      typeof import.meta.env.VITE_CONFIG_PATH === "string"
        ? import.meta.env.VITE_CONFIG_PATH.trim()
        : "";

    const candidates = [configuredPathRaw || "config.json", "config.json"];
    const urls: string[] = [];

    for (const candidate of candidates) {
      const lower = candidate.toLowerCase();
      const isAbsolute =
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("//");

      const normalizedUrl = isAbsolute
        ? candidate
        : `${baseUrl}${candidate.replace(/^\/+/, "")}`;

      if (!urls.includes(normalizedUrl)) {
        urls.push(normalizedUrl);
      }
    }

    return urls;
  }

  private hexToBase64(hexString: string): string {
    const bytes =
      hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  /**
   * Merged zwei Objekte sicher: Nur defined Werte aus source Ã¼berschreiben target
   * Verhindert, dass undefined-Werte aus der API die Defaults Ã¼berschreiben
   */
  private static mergeWithDefaults<T extends Record<string, any>>(
    target: T,
    source: Partial<T> | undefined | null,
  ): T {
    if (!source) return target;

    const result = { ...target };

    for (const key in source) {
      const value = source[key];
      // Nur definierte und nicht-null Werte Ã¼berschreiben
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }

    return result;
  }
}
