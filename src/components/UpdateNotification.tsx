import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";

export const UpdateNotification: React.FC = () => {
  const { t } = useTranslation();
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listener für PWA Update-Events (vite-plugin-pwa)
    const handleSWUpdate = () => {
      setShowUpdate(true);
    };

    // Event-Listener für Service Worker Updates
    window.addEventListener("sw-update-available", handleSWUpdate);

    return () => {
      window.removeEventListener("sw-update-available", handleSWUpdate);
    };
  }, []);

  const handleUpdate = () => {
    // Seite neu laden um neuen Service Worker zu aktivieren
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-primary text-white rounded-lg shadow-lg p-4 z-[55] max-w-md mx-auto">
      <div className="flex items-start space-x-3">
        <Download className="w-6 h-6 text-white mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-white mb-1">{t("update.title")}</h3>
          <p className="text-sm text-blue-100 mb-3">
            {t("update.description")}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="bg-white text-primary px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
            >
              {t("update.updateNow")}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
            >
              {t("update.later")}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
