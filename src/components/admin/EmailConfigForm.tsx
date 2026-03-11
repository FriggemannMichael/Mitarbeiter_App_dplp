/**
 * Formular für Email-Server Konfiguration (SMTP)
 */

import React, { useState, useEffect } from "react";
import { configService } from "../../services/configService";
import { apiService } from "../../services/apiService";
import type { EmailConfig } from "../../types/config.types";
import { Mail, Save, Server, Send, Eye, EyeOff } from "lucide-react";

interface EmailConfigFormProps {
  config: EmailConfig;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

export const EmailConfigForm: React.FC<EmailConfigFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (field: keyof EmailConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await configService.updateEmailConfig(formData);

      if (result.success) {
        onSave("success", "Email-Konfiguration erfolgreich gespeichert");
        await onReload();
      } else {
        onSave("error", result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      onSave("error", "Fehler beim Speichern der Email-Konfiguration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    // Validiere zuerst, ob eine Test-Email-Adresse angegeben wurde
    if (!formData.smtp_username || !formData.smtp_username.includes('@')) {
      onSave("error", "Bitte geben Sie zuerst einen gültigen SMTP-Benutzernamen (Email) ein");
      return;
    }

    setIsTesting(true);

    try {
      // Sende Test-Email an die SMTP-Username-Adresse (meist die eigene Email)
      const result = await apiService.testEmail(formData.smtp_username);

      if (result.success) {
        onSave(
          "success",
          `Test-Email erfolgreich an ${formData.smtp_username} gesendet! Bitte prüfen Sie Ihren Posteingang.`
        );
      } else {
        onSave(
          "error",
          result.error || "Fehler beim Senden der Test-Email. Prüfen Sie Ihre SMTP-Einstellungen."
        );
      }
    } catch (error) {
      onSave(
        "error",
        error instanceof Error
          ? `SMTP-Fehler: ${error.message}`
          : "Fehler beim Senden der Test-Email. Bitte speichern Sie zuerst die Konfiguration."
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* SMTP Server */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          SMTP-Server
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host *
            </label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={(e) => handleChange("smtp_host", e.target.value)}
              required
              className="input-field"
              placeholder="smtp.strato.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hostname Ihres SMTP-Servers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port *
              </label>
              <input
                type="number"
                value={formData.smtp_port}
                onChange={(e) =>
                  handleChange("smtp_port", parseInt(e.target.value))
                }
                required
                className="input-field"
                placeholder="587"
                min="1"
                max="65535"
              />
              <p className="text-xs text-gray-500 mt-1">
                Üblich: 25, 465 (SSL), 587 (TLS), 2525
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verschlüsselung *
              </label>
              <select
                value={formData.smtp_encryption}
                onChange={(e) =>
                  handleChange(
                    "smtp_encryption",
                    e.target.value as "tls" | "ssl" | "none"
                  )
                }
                required
                className="input-field"
              >
                <option value="tls">TLS (empfohlen)</option>
                <option value="ssl">SSL</option>
                <option value="none">Keine (unsicher)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                TLS/STARTTLS für Port 587, SSL für Port 465
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Zugangsdaten */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Zugangsdaten
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Benutzername *
            </label>
            <input
              type="email"
              value={formData.smtp_username}
              onChange={(e) => handleChange("smtp_username", e.target.value)}
              required
              className="input-field"
              placeholder="info@ihre-firma.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              Meist identisch mit der E-Mail-Adresse
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Passwort *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.smtp_password}
                onChange={(e) => handleChange("smtp_password", e.target.value)}
                required
                className="input-field pr-10"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Wird verschlüsselt in der Datenbank gespeichert
            </p>
          </div>
        </div>
      </div>

      {/* Absender */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Absender-Einstellungen
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Absender E-Mail *
            </label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => handleChange("from_email", e.target.value)}
              required
              className="input-field"
              placeholder="noreply@ihre-firma.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              E-Mail-Adresse, die als Absender angezeigt wird
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Absender Name *
            </label>
            <input
              type="text"
              value={formData.from_name}
              onChange={(e) => handleChange("from_name", e.target.value)}
              required
              className="input-field"
              placeholder="Ihre Firma Zeiterfassung"
            />
            <p className="text-xs text-gray-500 mt-1">
              Name, der als Absender angezeigt wird
            </p>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Wird gespeichert..." : "Konfiguration speichern"}
        </button>

        <button
          type="button"
          onClick={handleTestEmail}
          disabled={isTesting || isSaving}
          className="btn-secondary flex items-center justify-center gap-2"
          title="Sendet eine Test-Email an Ihre SMTP-Benutzername-Adresse"
        >
          <Mail className="w-4 h-4" />
          {isTesting ? "Sende Test-Email..." : "Verbindung testen"}
        </button>
      </div>

      {/* Hinweis für Test-Email */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">
          💡 Test-Email Funktion
        </h4>
        <p className="text-xs text-yellow-800">
          Der Test sendet eine Email an die eingegebene SMTP-Benutzername-Adresse.
          <strong className="block mt-1">
            Wichtig: Speichern Sie die Konfiguration zuerst, bevor Sie die Verbindung testen!
          </strong>
        </p>
      </div>

      {/* Info-Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Wichtige Hinweise:
        </h4>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>
            Stellen Sie sicher, dass Ihr Hosting-Provider SMTP-Verbindungen
            erlaubt
          </li>
          <li>
            Bei den meisten Providern müssen Sie SMTP explizit aktivieren
          </li>
          <li>
            Verwenden Sie TLS-Verschlüsselung (Port 587) für beste Sicherheit
          </li>
          <li>
            Testen Sie die Verbindung nach dem Speichern mit dem Test-Button
          </li>
        </ul>
      </div>
    </form>
  );
};
