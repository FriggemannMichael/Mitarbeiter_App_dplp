/**
 * Formular für technische Konfiguration
 */

import React, { useState, useEffect } from "react";
import { configService } from "../../services/configService";
import type { TechnicalConfig } from "../../types/config.types";
import { Cog, Save, Link as LinkIcon, QrCode, Globe } from "lucide-react";

interface TechnicalConfigFormProps {
  config: TechnicalConfig;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

export const TechnicalConfigForm: React.FC<TechnicalConfigFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [featureFlagsText, setFeatureFlagsText] = useState("{}");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      ...config,
      cors_allowed_origins: config.cors_allowed_origins || [],
    });
    setFeatureFlagsText(
      JSON.stringify(config.feature_flags || {}, null, 2),
    );
  }, [config]);

  const handleChange = (field: keyof TechnicalConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let parsedFlags: Record<string, boolean> = {};
      try {
        const raw = featureFlagsText.trim() || "{}";
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Feature-Flags muessen ein JSON-Objekt sein.");
        }

        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value !== "boolean") {
            throw new Error(`Feature-Flag "${key}" muss true oder false sein.`);
          }
        }
        parsedFlags = parsed as Record<string, boolean>;
      } catch (error) {
        onSave(
          "error",
          error instanceof Error
            ? error.message
            : "Feature-Flags JSON ist ungueltig.",
        );
        return;
      }

      const payload: TechnicalConfig = {
        ...formData,
        customer_key: (formData.customer_key || "default").trim() || "default",
        feature_flags: parsedFlags,
      };

      const result = await configService.updateTechnicalConfig(payload);

      if (result.success) {
        onSave("success", "Technische Konfiguration erfolgreich gespeichert");
        await onReload();
      } else {
        onSave("error", result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      onSave("error", "Fehler beim Speichern der technischen Konfiguration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* API-Konfiguration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary" />
          API-Endpunkte & Domains
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App-Domain *
            </label>
            <input
              type="url"
              value={formData.app_domain || formData.pwa_qr_code_url}
              onChange={(e) => handleChange("app_domain", e.target.value)}
              required
              className="input-field"
              placeholder="https://kundendomain.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              Haupt-Domain der App (wird für alle internen URLs verwendet)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backend-Domain
            </label>
            <input
              type="url"
              value={formData.backend_domain || ""}
              onChange={(e) => handleChange("backend_domain", e.target.value)}
              className="input-field"
              placeholder="https://api.kundendomain.de (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Backend-Domain falls abweichend von App-Domain (optional)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API-Endpunkt für PDF-Versand *
            </label>
            <input
              type="url"
              value={formData.api_endpoint}
              onChange={(e) => handleChange("api_endpoint", e.target.value)}
              required
              className="input-field"
              placeholder="https://api.ihre-domain.de/backend"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vollständiger Pfad zum Backend (z.B. https://domain.de/backend)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Base-URL
            </label>
            <input
              type="url"
              value={formData.whatsapp_base_url || "https://wa.me/"}
              onChange={(e) => handleChange("whatsapp_base_url", e.target.value)}
              className="input-field"
              placeholder="https://wa.me/"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base-URL für WhatsApp-Integration (Standard: https://wa.me/)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Erlaubte CORS-Origins (kommagetrennt)
            </label>
            <input
              type="text"
              value={formData.cors_allowed_origins?.join(", ") || ""}
              onChange={(e) =>
                handleChange(
                  "cors_allowed_origins",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              className="input-field"
              placeholder="https://kundendomain.de, http://localhost:5173"
            />
            <p className="text-xs text-gray-500 mt-1">
              Liste der erlaubten Origins für CORS (Backend-Konfiguration)
            </p>
          </div>
        </div>
      </div>

      {/* Deployment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Deployment
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base-Pfad *
            </label>
            <input
              type="text"
              value={formData.deployment_path}
              onChange={(e) => handleChange("deployment_path", e.target.value)}
              required
              className="input-field"
              placeholder="/pro/"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deployment-Pfad (z.B. "/pro/" oder "/" für Root)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PWA QR-Code URL *
            </label>
            <input
              type="url"
              value={formData.pwa_qr_code_url}
              onChange={(e) => handleChange("pwa_qr_code_url", e.target.value)}
              required
              className="input-field"
              placeholder="https://ihre-domain.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL, die im QR-Code für mobile Installation angezeigt wird
            </p>
          </div>
        </div>
      </div>

      {/* Mandant & Feature Flags */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          Mandant & Feature-Flags
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mandanten-Schluessel
            </label>
            <input
              type="text"
              value={formData.customer_key || ""}
              onChange={(e) => handleChange("customer_key", e.target.value)}
              className="input-field"
              placeholder="kunde-a"
            />
            <p className="text-xs text-gray-500 mt-1">
              Eindeutiger Schluessel pro Kunde (z.B. fuer Branding/Feature-Rollout).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feature-Flags (JSON)
            </label>
            <textarea
              value={featureFlagsText}
              onChange={(e) => setFeatureFlagsText(e.target.value)}
              rows={8}
              className="input-field font-mono text-xs resize-y"
              placeholder={'{\n  "vacation_enabled": true,\n  "advance_payment_enabled": true,\n  "custom_module_x": false\n}'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Werte muessen boolesch sein (`true`/`false`). Beispiel:{" "}
              {"{\"new_customer_feature\": true}"}.
            </p>
          </div>
        </div>
      </div>

      {/* QR-Code-Typen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          QR-Code-Metadaten
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stundenzettel-Typ *
            </label>
            <input
              type="text"
              value={formData.qr_code_type_timesheet}
              onChange={(e) =>
                handleChange("qr_code_type_timesheet", e.target.value)
              }
              required
              className="input-field"
              placeholder="TIMESHEET"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urlaubsantrags-Typ *
            </label>
            <input
              type="text"
              value={formData.qr_code_type_vacation}
              onChange={(e) =>
                handleChange("qr_code_type_vacation", e.target.value)
              }
              required
              className="input-field"
              placeholder="VACATION_REQUEST"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorschuss-Typ *
            </label>
            <input
              type="text"
              value={formData.qr_code_type_advance_payment}
              onChange={(e) =>
                handleChange("qr_code_type_advance_payment", e.target.value)
              }
              required
              className="input-field"
              placeholder="ADVANCE_PAYMENT"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Diese Werte werden in den QR-Codes eingebettet (standardisiert und
          kundenunabhängig)
        </p>
      </div>

      {/* PDF-Versand */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          PDF-Versand
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CC-Adresse (PDL intern)
            </label>
            <input
              type="email"
              value={formData.pdf_review_cc_email || ""}
              onChange={(e) => handleChange("pdf_review_cc_email", e.target.value)}
              className="input-field"
              placeholder="pdl@beispiel.de"
            />
            <p className="text-xs text-gray-500 mt-1">
              Diese Adresse wird beim Stundenzettel-Versand immer in CC gesetzt.
            </p>
          </div>
        </div>
      </div>

      {/* Integrationen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          Aktivierte Funktionen
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.enable_email}
              onChange={(e) => handleChange("enable_email", e.target.checked)}
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">E-Mail-Integration</p>
              <p className="text-sm text-gray-600">
                PDFs können per E-Mail versendet werden
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.enable_whatsapp}
              onChange={(e) =>
                handleChange("enable_whatsapp", e.target.checked)
              }
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">WhatsApp-Integration</p>
              <p className="text-sm text-gray-600">
                PDFs können über WhatsApp geteilt werden
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
