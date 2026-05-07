/**
 * Formular fuer technische Konfiguration
 */

import React, { useEffect, useState } from "react";
import { configService } from "../../services/configService";
import type { TechnicalConfig } from "../../types/config.types";
import {
  Cog,
  Save,
  Link as LinkIcon,
  QrCode,
  Globe,
  Plus,
  Trash2,
} from "lucide-react";

interface TechnicalConfigFormProps {
  config: TechnicalConfig;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
}

interface CustomFeatureFlagRow {
  id: string;
  key: string;
  value: boolean;
}

const KNOWN_FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "vacation_enabled",
    label: "Urlaubsantrag aktiv",
    description: "Blendet den Urlaubsantrag in der App ein und erlaubt dessen Nutzung.",
  },
  {
    key: "advance_payment_enabled",
    label: "Vorschuss aktiv",
    description: "Erlaubt Mitarbeitern, Vorschussanfragen in der App zu erfassen.",
  },
  {
    key: "dashboard_show_sick",
    label: "Krankmeldung im Dashboard",
    description: "Zeigt die Krankmeldungs-Kachel direkt im Dashboard an.",
  },
  {
    key: "dashboard_show_vacation",
    label: "Urlaub im Dashboard",
    description: "Zeigt die Urlaubs-Kachel direkt im Dashboard an.",
  },
  {
    key: "simple_dayshift_absence_with_job_fields",
    label: "Tagschicht: Abwesenheit & Auftragsfelder",
    description: "Aktiviert in der Tagschicht vereinfachte Abwesenheitserfassung sowie Auftrags- und Kommissionsnummer-Felder.",
  },
];

const buildCustomFlagRows = (
  flags: Record<string, boolean>,
): CustomFeatureFlagRow[] =>
  Object.entries(flags)
    .filter(([key]) => !KNOWN_FEATURE_FLAGS.some((flag) => flag.key === key))
    .map(([key, value], index) => ({
      id: `${key}-${index}`,
      key,
      value,
    }));

const normalizeFeatureFlags = (
  knownFlags: Record<string, boolean>,
  customFlags: CustomFeatureFlagRow[],
): Record<string, boolean> => {
  const mergedFlags: Record<string, boolean> = { ...knownFlags };

  for (const item of customFlags) {
    const trimmedKey = item.key.trim();
    if (!trimmedKey) {
      continue;
    }

    mergedFlags[trimmedKey] = item.value;
  }

  return mergedFlags;
};

export const TechnicalConfigForm: React.FC<TechnicalConfigFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [knownFeatureFlags, setKnownFeatureFlags] = useState<Record<string, boolean>>({});
  const [customFeatureFlags, setCustomFeatureFlags] = useState<CustomFeatureFlagRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const featureFlags = config.feature_flags || {};

    setFormData({
      ...config,
      cors_allowed_origins: config.cors_allowed_origins || [],
    });
    setKnownFeatureFlags(
      Object.fromEntries(
        KNOWN_FEATURE_FLAGS.map((flag) => [flag.key, Boolean(featureFlags[flag.key])]),
      ),
    );
    setCustomFeatureFlags(buildCustomFlagRows(featureFlags));
  }, [config]);

  const handleChange = (field: keyof TechnicalConfig, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleKnownFlagChange = (key: string, value: boolean) => {
    setKnownFeatureFlags((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomFlagChange = (
    id: string,
    field: "key" | "value",
    value: string | boolean,
  ) => {
    setCustomFeatureFlags((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddCustomFlag = () => {
    setCustomFeatureFlags((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        key: "",
        value: false,
      },
    ]);
  };

  const handleRemoveCustomFlag = (id: string) => {
    setCustomFeatureFlags((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const duplicateKeys = new Set<string>();
      const seenKeys = new Set<string>();

      for (const item of customFeatureFlags) {
        const trimmedKey = item.key.trim();
        if (!trimmedKey) {
          continue;
        }

        if (KNOWN_FEATURE_FLAGS.some((flag) => flag.key === trimmedKey)) {
          onSave(
            "error",
            `Das Zusatz-Flag "${trimmedKey}" ist bereits als Standard-Flag vorhanden.`,
          );
          return;
        }

        if (seenKeys.has(trimmedKey)) {
          duplicateKeys.add(trimmedKey);
        }

        seenKeys.add(trimmedKey);
      }

      if (duplicateKeys.size > 0) {
        onSave(
          "error",
          `Zusatz-Flags enthalten doppelte Schluessel: ${Array.from(duplicateKeys).join(", ")}`,
        );
        return;
      }

      const payload: TechnicalConfig = {
        ...formData,
        customer_key: (formData.customer_key || "default").trim() || "default",
        feature_flags: normalizeFeatureFlags(knownFeatureFlags, customFeatureFlags),
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
              Haupt-Domain der App (wird fuer alle internen URLs verwendet)
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
              API-Endpunkt fuer PDF-Versand *
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
              Vollstaendiger Pfad zum Backend (z.B. https://domain.de/backend)
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
              Base-URL fuer WhatsApp-Integration (Standard: https://wa.me/)
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
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              className="input-field"
              placeholder="https://kundendomain.de, http://localhost:5173"
            />
            <p className="text-xs text-gray-500 mt-1">
              Liste der erlaubten Origins fuer CORS (Backend-Konfiguration)
            </p>
          </div>
        </div>
      </div>

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
              Deployment-Pfad (z.B. "/pro/" oder "/" fuer Root)
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
              URL, die im QR-Code fuer mobile Installation angezeigt wird
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          Mandant & Feature-Flags
        </h3>
        <div className="space-y-6">
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
              Eindeutiger Schluessel pro Kunde, z.B. fuer Branding oder Feature-Rollout.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard-Funktionen
              </label>
              <p className="text-xs text-gray-500">
                Aktivieren oder deaktivieren Sie die wichtigsten Funktionen ohne JSON-Bearbeitung.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {KNOWN_FEATURE_FLAGS.map((flag) => {
                const isEnabled = Boolean(knownFeatureFlags[flag.key]);

                return (
                  <label
                    key={flag.key}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer ${
                      isEnabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleKnownFlagChange(flag.key, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{flag.label}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isEnabled
                              ? "bg-primary text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {isEnabled ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{flag.description}</p>
                      <p className="mt-2 text-xs font-mono text-gray-500">{flag.key}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zusaetzliche Feature-Flags
                </label>
                <p className="text-xs text-gray-500">
                  Fuer Sonderfaelle oder neue Module, die noch keine eigene Schalter-UI haben.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomFlag}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
                Flag hinzufuegen
              </button>
            </div>

            {customFeatureFlags.length === 0 ? (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Keine zusaetzlichen Flags vorhanden.
              </div>
            ) : (
              <div className="space-y-3">
                {customFeatureFlags.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_auto] gap-3 items-center"
                  >
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) =>
                        handleCustomFlagChange(item.id, "key", e.target.value)
                      }
                      className="input-field"
                      placeholder="custom_module_x"
                    />
                    <select
                      value={String(item.value)}
                      onChange={(e) =>
                        handleCustomFlagChange(item.id, "value", e.target.value === "true")
                      }
                      className="input-field"
                    >
                      <option value="true">Aktiv</option>
                      <option value="false">Inaktiv</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomFlag(item.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      aria-label={`Feature-Flag ${item.key || "neu"} entfernen`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
              onChange={(e) => handleChange("qr_code_type_timesheet", e.target.value)}
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
              onChange={(e) => handleChange("qr_code_type_vacation", e.target.value)}
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
          Diese Werte werden in den QR-Codes eingebettet, standardisiert und kundenunabhaengig.
        </p>
      </div>

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
                PDFs koennen per E-Mail versendet werden
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.enable_whatsapp}
              onChange={(e) => handleChange("enable_whatsapp", e.target.checked)}
              className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-900">WhatsApp-Integration</p>
              <p className="text-sm text-gray-600">
                PDFs koennen ueber WhatsApp geteilt werden
              </p>
            </div>
          </label>
        </div>
      </div>

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
              <span>Aenderungen speichern</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
