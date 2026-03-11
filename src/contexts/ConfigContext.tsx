/**
 * React Context für globale Konfigurationsverwaltung
 * Stellt die Konfiguration in der gesamten App zur Verfügung
 *
 * Single Source of Truth für Config-State
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ConfigManager } from "../services/config/ConfigManager";
import type { AppConfiguration } from "../types/config.types";
import { logger } from "../services/logger";

interface ConfigContextType {
  config: AppConfiguration;
  isLoading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * Config Provider Component
 * Nutzt ConfigManager Singleton als Single Source of Truth
 */
export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wendet die Theme-Farbe auf die App an
   */
  const applyThemeColor = (color: string) => {
    // Meta-Tag für Browser-UI
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", color);
    }

    // CSS Custom Property für dynamische Farbe
    document.documentElement.style.setProperty("--primary-color", color);
  };

  /**
   * Initial Load via ConfigManager
   */
  useEffect(() => {
    const loadInitialConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const manager = ConfigManager.getInstance();
        const loadedConfig = await manager.loadConfiguration();
        setConfig(loadedConfig);

        // Theme-Farbe anwenden
        if (loadedConfig.company.theme_color) {
          applyThemeColor(loadedConfig.company.theme_color);
        }
      } catch (err: any) {
        logger.error("Config load failed", err, { component: 'ConfigContext' });
        setError(err.message || "Konfiguration konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialConfig();
  }, []);

  /**
   * Subscribe zu Config-Changes (z.B. von Admin-Dashboard)
   */
  useEffect(() => {
    const manager = ConfigManager.getInstance();

    // Bei externen Updates: State aktualisieren
    const unsubscribe = manager.subscribe((updatedConfig) => {
      setConfig(updatedConfig);

      if (updatedConfig.company.theme_color) {
        applyThemeColor(updatedConfig.company.theme_color);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Reload-Funktion für manuelles Neuladen
   */
  const reloadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const manager = ConfigManager.getInstance();
      const loadedConfig = await manager.loadConfiguration();
      setConfig(loadedConfig);

      if (loadedConfig.company.theme_color) {
        applyThemeColor(loadedConfig.company.theme_color);
      }
    } catch (err: any) {
      logger.error("Config reload failed", err, { component: 'ConfigContext' });
      setError(err.message || "Konfiguration konnte nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback zu Default-Config wenn noch nicht geladen
  const currentConfig =
    config || ConfigManager.getInstance()["getDefaultConfiguration"]();

  const value: ConfigContextType = {
    config: currentConfig,
    isLoading,
    error,
    reloadConfig,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
};

/**
 * Hook zum Zugriff auf die Konfiguration
 */
export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);

  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }

  return context;
};

/**
 * Hook zum Zugriff auf Company Config
 */
export const useCompanyConfig = () => {
  const { config } = useConfig();
  return config.company;
};

/**
 * Hook zum Zugriff auf PDF Config
 */
export const usePdfConfig = () => {
  const { config } = useConfig();
  return config.pdf;
};

// Removed unused hooks: useTechnicalConfig, useWorkSettings
// Use useConfig() directly to access config.technical or config.work

/**
 * Default Export
 */
export default ConfigContext;
