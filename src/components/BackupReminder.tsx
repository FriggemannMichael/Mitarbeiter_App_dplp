import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X, Download } from "lucide-react";
import { storage } from "../utils/storage";
import { BACKUP } from "../config/constants";

export const BackupReminder: React.FC = () => {
  const { t } = useTranslation();
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Prüfen ob Erinnerung angezeigt werden soll
    const checkBackupReminder = () => {
      const lastBackupDate = storage.getLastBackupDate();
      const reminderDismissed = storage.getBackupReminderDismissed();

      // Wenn nie ein Backup erstellt wurde und Erinnerung nicht dauerhaft geschlossen
      if (!lastBackupDate && !reminderDismissed) {
        // Prüfen ob App schon länger verwendet wird
        const firstUseDate = storage.getFirstUseDate();
        if (firstUseDate) {
          const daysSinceFirstUse = Math.floor(
            (Date.now() - new Date(firstUseDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysSinceFirstUse >= BACKUP.FIRST_USE_REMINDER_DAYS) {
            setShowReminder(true);
          }
        }
        return;
      }

      // Wenn letztes Backup älter als konfigurierte Tage
      if (lastBackupDate && !reminderDismissed) {
        const daysSinceBackup = Math.floor(
          (Date.now() - new Date(lastBackupDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceBackup >= BACKUP.REMINDER_DAYS) {
          setShowReminder(true);
        }
      }
    };

    checkBackupReminder();
  }, []);

  const handleCreateBackup = () => {
    // Öffne Backup Modal
    window.dispatchEvent(new CustomEvent("open-backup-modal"));
    setShowReminder(false);
  };

  const handleDismiss = () => {
    setShowReminder(false);
  };

  const handleNeverShow = () => {
    storage.setBackupReminderDismissed(true);
    setShowReminder(false);
  };

  if (!showReminder) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-orange-500 text-white rounded-lg shadow-lg p-4 z-[55] max-w-md mx-auto">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-white mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-white mb-1">
            {t("backupReminder.title")}
          </h3>
          <p className="text-sm text-orange-100 mb-3">
            {t("backupReminder.description")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCreateBackup}
              className="bg-white text-orange-600 px-3 py-1 rounded text-sm font-medium hover:bg-orange-50 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              {t("backupReminder.createNow")}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-orange-700"
            >
              {t("backupReminder.remindLater")}
            </button>
            <button
              onClick={handleNeverShow}
              className="bg-transparent border border-white text-white px-3 py-1 rounded text-sm font-medium hover:bg-orange-600"
            >
              {t("backupReminder.dontRemind")}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-orange-200 hover:text-white flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
