import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from './App.tsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { storage } from "./utils/storage";
import { createAppTheme, type AppThemeMode } from "./theme/appTheme";
import './styles/index.css'

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      const unregisterTasks = registrations
        .filter((registration) => {
          const scopeUrl = new URL(registration.scope);
          return scopeUrl.origin === window.location.origin;
        })
        .map((registration) => registration.unregister());

      void Promise.allSettled(unregisterTasks).then(() => {
        if ("caches" in window) {
          void caches.keys().then((cacheNames) => {
            const deletionTasks = cacheNames
              .filter(
                (cacheName) =>
                  cacheName.startsWith("workbox-") ||
                  cacheName.startsWith("google-fonts-cache")
              )
              .map((cacheName) => caches.delete(cacheName));

            void Promise.allSettled(deletionTasks);
          });
        }
      });
    });
  });
}

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
    return () => {
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
