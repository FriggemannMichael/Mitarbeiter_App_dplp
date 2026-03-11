import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, AlertTriangle, Check, X } from "lucide-react";
import { storage } from "../utils/storage";

interface BackupRestoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"backup" | "restore">("backup");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState("");

  if (!isOpen) return null;

  // Backup-Export
  const handleExportBackup = () => {
    try {
      const backupData = storage.exportAllData();
      const filename = `wpdl_backup_${
        new Date().toISOString().split("T")[0]
      }.json`;

      const blob = new Blob([backupData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Backup-Datum speichern
      storage.setLastBackupDate();
    } catch (error) {
      console.error("Backup-Export fehlgeschlagen:", error);
    }
  };

  // Datei-Auswahl
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportStatus("idle");
      setImportMessage("");
    }
  };

  // Backup-Import
  const handleImportBackup = async () => {
    if (!importFile) return;

    try {
      const fileContent = await importFile.text();
      const success = storage.importAllData(fileContent);

      if (success) {
        setImportStatus("success");
        setImportMessage("Backup erfolgreich wiederhergestellt!");

        // Nach 2 Sekunden Seite neu laden
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setImportStatus("error");
        setImportMessage("Ungültiges Backup-Format oder beschädigte Datei.");
      }
    } catch (error) {
      setImportStatus("error");
      setImportMessage("Fehler beim Lesen der Backup-Datei.");
      console.error("Import-Fehler:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("backup.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === "backup"
                ? "text-primary border-b-2 border-primary bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            {t("backup.create")}
          </button>
          <button
            onClick={() => setActiveTab("restore")}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === "restore"
                ? "text-primary border-b-2 border-primary bg-blue-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            {t("backup.restore")}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "backup" ? (
            // Backup Tab
            <div className="space-y-4">
              <div className="text-center">
                <Download className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("backup.export.title")}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t("backup.export.description")}
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 text-blue-600 mt-0.5">ℹ️</div>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">
                        {t("backup.export.whatIsBackedUp")}
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>• {t("backup.export.weekData")}</li>
                        <li>• {t("backup.export.signatures")}</li>
                        <li>• {t("backup.export.settings")}</li>
                        <li>• {t("backup.export.customerInfo")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportBackup}
                  className="btn-primary w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("backup.export.download")}
                </button>
              </div>
            </div>
          ) : (
            // Restore Tab
            <div className="space-y-4">
              <div className="text-center">
                <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("backup.import.title")}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t("backup.import.description")}
                </p>
              </div>

              {/* Warnung */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">{t("backup.import.warning")}</p>
                    <p>{t("backup.import.warningText")}</p>
                  </div>
                </div>
              </div>

              {/* Datei-Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("backup.import.selectFile")}
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="input-field file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-blue-700"
                />
                {importFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    {t("backup.import.selected")} {importFile.name}
                  </p>
                )}
              </div>

              {/* Status-Nachricht */}
              {importStatus !== "idle" && (
                <div
                  className={`rounded-lg p-3 flex items-center space-x-2 ${
                    importStatus === "success"
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                  }`}
                >
                  {importStatus === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span className="text-sm">{importMessage}</span>
                </div>
              )}

              {/* Import-Button */}
              <button
                onClick={handleImportBackup}
                disabled={!importFile || importStatus === "success"}
                className="btn-primary w-full disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("backup.import.restore")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
