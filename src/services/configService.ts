/**
 * Configuration Service - Wrapper fÃ¼r ConfigManager
 *
 * Single Source of Truth: ConfigManager
 * Dieser Service ist nur noch ein API-Wrapper ohne eigene Cache-Logik
 */

import type {
  AppConfiguration,
  CompanyConfig,
  PdfConfig,
  TechnicalConfig,
  WorkSettings,
  EmailConfig,
  ConfigUpdateResult,
} from "../types/config.types";
import { apiService } from "./apiService";
import { ConfigManager } from "./config/ConfigManager";

class ConfigService {
  /**
   * LÃ¤dt Konfiguration via ConfigManager
   * @deprecated Nutze ConfigManager.getInstance().loadConfiguration()
   */
  async loadConfiguration(): Promise<AppConfiguration> {
    const manager = ConfigManager.getInstance();
    return manager.loadConfiguration();
  }

  /**
   * Aktualisiert die Company-Konfiguration
   */
  async updateCompanyConfig(
    companyConfig: CompanyConfig
  ): Promise<ConfigUpdateResult> {
    const manager = ConfigManager.getInstance();

    try {
      // Immer API-Update versuchen (wird in Admin-Dashboard verwendet)
      try {
        console.log("ðŸ”µ Updating company config via API...", companyConfig);
        const response = await apiService.updateCompanyConfig(companyConfig);
        console.log("ðŸ“¡ API response:", response);

        if (!response.success) {
          console.error("âŒ API-Update fehlgeschlagen:", response);
          throw new Error(response.error || "API returned success=false");
        }

        console.log("âœ… API-Update erfolgreich");
      } catch (apiError) {
        console.error("âŒ API-Update Fehler:", apiError);
        // Re-throw error, damit Admin-Dashboard den Fehler sieht
        throw apiError;
      }

      // Cache leeren und frisch von API laden â†’ Subscriber werden benachrichtigt
      manager.clearCache();
      const freshConfig = await manager.loadConfiguration();
      manager.notifySubscribersPublic(freshConfig);

      return {
        success: true,
        message: "Firmendaten erfolgreich gespeichert!",
      };
    } catch (error) {
      console.error("Failed to update company config:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error) ||
              "Fehler beim Aktualisieren der Firmenkonfiguration",
      };
    }
  }

  /**
   * Aktualisiert die PDF-Konfiguration
   */
  async updatePdfConfig(pdfConfig: PdfConfig): Promise<ConfigUpdateResult> {
    const manager = ConfigManager.getInstance();

    try {
      // Immer API-Update versuchen
      try {
        console.log("ðŸ”µ Updating PDF config via API...");
        const response = await apiService.updatePdfConfig(pdfConfig);
        if (!response.success) {
          throw new Error(response.error || "API returned success=false");
        }
        console.log("âœ… API-Update erfolgreich");
      } catch (apiError) {
        console.error("âŒ API-Update Fehler:", apiError);
        throw apiError;
      }

      manager.clearCache();
      const freshConfig = await manager.loadConfiguration();
      manager.notifySubscribersPublic(freshConfig);

      return {
        success: true,
        message: "PDF-Konfiguration erfolgreich gespeichert!",
      };
    } catch (error) {
      console.error("Failed to update PDF config:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error) ||
              "Fehler beim Aktualisieren der PDF-Konfiguration",
      };
    }
  }

  /**
   * Aktualisiert die Technical-Konfiguration
   */
  async updateTechnicalConfig(
    technicalConfig: TechnicalConfig
  ): Promise<ConfigUpdateResult> {
    const manager = ConfigManager.getInstance();

    try {
      // Immer API-Update versuchen
      try {
        console.log("ðŸ”µ Updating technical config via API...");
        const response = await apiService.updateTechnicalConfig(
          technicalConfig
        );
        if (!response.success) {
          throw new Error(response.error || "API returned success=false");
        }
        console.log("âœ… API-Update erfolgreich");
      } catch (apiError) {
        console.error("âŒ API-Update Fehler:", apiError);
        throw apiError;
      }

      manager.clearCache();
      const freshConfig = await manager.loadConfiguration();
      manager.notifySubscribersPublic(freshConfig);

      return {
        success: true,
        message: "Technische Konfiguration erfolgreich gespeichert!",
      };
    } catch (error) {
      console.error("Failed to update technical config:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error) ||
              "Fehler beim Aktualisieren der technischen Konfiguration",
      };
    }
  }

  /**
   * Aktualisiert die Work-Settings
   */
  async updateWorkSettings(
    workSettings: WorkSettings
  ): Promise<ConfigUpdateResult> {
    const manager = ConfigManager.getInstance();

    try {
      // Immer API-Update versuchen
      try {
        console.log("ðŸ”µ Updating work settings via API...");
        const response = await apiService.updateWorkSettings(workSettings);
        if (!response.success) {
          throw new Error(response.error || "API returned success=false");
        }
        console.log("âœ… API-Update erfolgreich");
      } catch (apiError) {
        console.error("âŒ API-Update Fehler:", apiError);
        throw apiError;
      }

      manager.clearCache();
      const freshConfig = await manager.loadConfiguration();
      manager.notifySubscribersPublic(freshConfig);

      return {
        success: true,
        message: "Arbeitszeit-Einstellungen erfolgreich gespeichert!",
      };
    } catch (error) {
      console.error("Failed to update work settings:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error) ||
              "Fehler beim Aktualisieren der Arbeitseinstellungen",
      };
    }
  }

  /**
   * Aktualisiert die Email-Konfiguration
   */
  async updateEmailConfig(
    emailConfig: EmailConfig
  ): Promise<ConfigUpdateResult> {
    const manager = ConfigManager.getInstance();

    try {
      // Immer API-Update versuchen
      try {
        console.log("ðŸ”µ Updating email config via API...");
        const response = await apiService.updateEmailConfig(emailConfig);
        if (!response.success) {
          throw new Error(response.error || "API returned success=false");
        }
        console.log("âœ… API-Update erfolgreich");
      } catch (apiError) {
        console.error("âŒ API-Update Fehler:", apiError);
        throw apiError;
      }

      manager.clearCache();
      const freshConfig = await manager.loadConfiguration();
      manager.notifySubscribersPublic(freshConfig);

      return {
        success: true,
        message: "Email-Konfiguration erfolgreich gespeichert!",
      };
    } catch (error) {
      console.error("Failed to update email config:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error) ||
              "Fehler beim Aktualisieren der Email-Konfiguration",
      };
    }
  }

  /**
   * Exportiert die aktuelle Konfiguration als downloadbare JSON-Datei
   */
  async downloadConfiguration(
    config: AppConfiguration
  ): Promise<ConfigUpdateResult> {
    try {
      const exportConfig = {
        company: config.company,
        pdf: config.pdf,
        technical: config.technical,
        work: config.work,
        admin: config.admin,
      };

      const json = JSON.stringify(exportConfig, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Konfiguration erfolgreich exportiert",
      };
    } catch (error) {
      console.error("Failed to download configuration:", error);
      return {
        success: false,
        error: "Fehler beim Exportieren der Konfiguration",
      };
    }
  }

  /**
   * Cache invalidieren
   */
  invalidateCache(): void {
    const manager = ConfigManager.getInstance();
    manager.clearCache();
  }

  /**
   * Ã„ndert das Admin-Passwort
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiService.changePassword(currentPassword, newPassword);
      if (!response.success) {
        return {
          success: false,
          error: response.error || "Fehler beim Ändern des Passworts",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to change password:", error);
      return {
        success: false,
        error: "Fehler beim Ã„ndern des Passworts",
      };
    }
  }
}

// Singleton-Instanz exportieren
export const configService = new ConfigService();

