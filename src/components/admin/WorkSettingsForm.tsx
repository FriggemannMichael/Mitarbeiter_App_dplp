/**
 * Formular für Arbeitszeit-Einstellungen
 */

import React, { useState, useEffect } from "react";
import { configService } from "../../services/configService";
import type { WorkSettings } from "../../types/config.types";
import {
  Clock,
  Save,
  FileText,
  Calendar,
  Settings as SettingsIcon,
} from "lucide-react";

interface WorkSettingsFormProps {
  config: WorkSettings;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

export const WorkSettingsForm: React.FC<WorkSettingsFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (field: keyof WorkSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await configService.updateWorkSettings(formData);

      if (result.success) {
        onSave("success", "Arbeitszeit-Einstellungen erfolgreich gespeichert");
        await onReload();
      } else {
        onSave("error", result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      onSave("error", "Fehler beim Speichern der Arbeitszeit-Einstellungen");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Arbeitszeit-Regeln */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Arbeitszeit-Regeln
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max. Arbeitsstunden pro Tag *
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={formData.max_work_hours_per_day}
              onChange={(e) =>
                handleChange("max_work_hours_per_day", parseInt(e.target.value))
              }
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">Standard: 12 Stunden</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-Pausenzeit (Minuten) *
            </label>
            <input
              type="number"
              min="0"
              max="180"
              step="15"
              value={formData.default_break_minutes}
              onChange={(e) =>
                handleChange("default_break_minutes", parseInt(e.target.value))
              }
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">Standard: 60 Minuten</p>
          </div>
        </div>
      </div>

      {/* Dateiname-Pattern */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Dateiname-Muster
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PDF-Dateiname-Pattern *
          </label>
          <input
            type="text"
            value={formData.filename_pattern}
            onChange={(e) => handleChange("filename_pattern", e.target.value)}
            required
            className="input-field font-mono text-sm"
            placeholder="Stundennachweis_{employeeName}_{weekYear}_KW{weekNumber}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Verfügbare Platzhalter: {"{employeeName}"}, {"{weekYear}"},{" "}
            {"{weekNumber}"}
          </p>
        </div>
      </div>

      {/* Format-Einstellungen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Datums- und Zeitformate
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datumsformat *
            </label>
            <select
              value={formData.date_format}
              onChange={(e) => handleChange("date_format", e.target.value)}
              required
              className="input-field"
            >
              <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2025)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zeitformat *
            </label>
            <select
              value={formData.time_format}
              onChange={(e) => handleChange("time_format", e.target.value)}
              required
              className="input-field"
            >
              <option value="HH:mm">HH:mm (24h - 14:30)</option>
              <option value="hh:mm A">hh:mm A (12h - 02:30 PM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* System-Einstellungen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary" />
          System-Einstellungen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-Logout nach Inaktivität (Minuten) *
            </label>
            <input
              type="number"
              min="0"
              max="1440"
              step="30"
              value={formData.auto_logout_minutes}
              onChange={(e) =>
                handleChange("auto_logout_minutes", parseInt(e.target.value))
              }
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              0 = deaktiviert, Standard: 240 Minuten (4 Stunden)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup-Erinnerung (Tage) *
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.backup_reminder_days}
              onChange={(e) =>
                handleChange("backup_reminder_days", parseInt(e.target.value))
              }
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">Standard: 7 Tage</p>
          </div>
        </div>
      </div>

      {/* Feature-Toggles */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Aktivierte Funktionen
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.auto_save_enabled}
              onChange={(e) =>
                handleChange("auto_save_enabled", e.target.checked)
              }
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">
                Automatisches Speichern
              </p>
              <p className="text-sm text-gray-600">
                Daten werden automatisch gespeichert
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.offline_mode_enabled}
              onChange={(e) =>
                handleChange("offline_mode_enabled", e.target.checked)
              }
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">Offline-Modus</p>
              <p className="text-sm text-gray-600">
                App funktioniert auch ohne Internetverbindung
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.enable_signature_requirement}
              onChange={(e) =>
                handleChange("enable_signature_requirement", e.target.checked)
              }
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">
                Unterschrift erforderlich
              </p>
              <p className="text-sm text-gray-600">
                Mitarbeiter müssen Dokumente unterschreiben
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Speichern...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Änderungen speichern</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
