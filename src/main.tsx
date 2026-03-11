import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from './App.tsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { storage } from "./utils/storage";
import { createAppTheme, type AppThemeMode } from "./theme/appTheme";
import './styles/index.css'

// PWA Service Worker registrieren (nur im production build verfügbar)
// Registrierung läuft über vite-plugin-pwa automatisch

const Root = () => {
  const [mode, setMode] = useState<AppThemeMode>(storage.getTheme());
  const [themeEnabled, setThemeEnabled] = useState(false);
  const effectiveMode: AppThemeMode = themeEnabled ? mode : "light";
  const theme = useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveMode;
  }, [effectiveMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: AppThemeMode }>;
      const nextMode = customEvent.detail?.mode || "light";
      storage.setTheme(nextMode);
      setMode(nextMode);
    };

    const themeEnabledHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setThemeEnabled(Boolean(customEvent.detail?.enabled));
    };

    window.addEventListener("app:set-theme", handler as EventListener);
    window.addEventListener(
      "app:set-theme-enabled",
      themeEnabledHandler as EventListener
    );
    return () =>
      {
        window.removeEventListener("app:set-theme", handler as EventListener);
        window.removeEventListener(
          "app:set-theme-enabled",
          themeEnabledHandler as EventListener
        );
      };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
