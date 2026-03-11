/**
 * Formular für PDF-Konfiguration
 */

import React, { useState, useEffect } from "react";
import { configService } from "../../services/configService";
import type { PdfConfig } from "../../types/config.types";
import { FileText, Save } from "lucide-react";

interface PdfConfigFormProps {
  config: PdfConfig;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

export const PdfConfigForm: React.FC<PdfConfigFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (field: keyof PdfConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await configService.updatePdfConfig(formData);

      if (result.success) {
        onSave("success", "PDF-Konfiguration erfolgreich gespeichert");
        await onReload();
      } else {
        onSave("error", result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      onSave("error", "Fehler beim Speichern der PDF-Konfiguration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* App-Namen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          App-Bezeichnungen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App-Name *
            </label>
            <input
              type="text"
              value={formData.app_name}
              onChange={(e) => handleChange("app_name", e.target.value)}
              required
              className="input-field"
              placeholder="Stundennachweis Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App-Kurzname *
            </label>
            <input
              type="text"
              value={formData.app_short_name}
              onChange={(e) => handleChange("app_short_name", e.target.value)}
              required
              className="input-field"
              placeholder="Mitarbeiter Pro"
            />
          </div>
        </div>
      </div>

      {/* PDF-Metadaten */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PDF-Metadaten
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF-Titel-Präfix *
            </label>
            <input
              type="text"
              value={formData.pdf_title_prefix}
              onChange={(e) => handleChange("pdf_title_prefix", e.target.value)}
              required
              className="input-field"
              placeholder="Stundennachweis"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird Titel des PDF-Dokuments vorangestellt
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF-Autor *
            </label>
            <input
              type="text"
              value={formData.pdf_author}
              onChange={(e) => handleChange("pdf_author", e.target.value)}
              required
              className="input-field"
              placeholder="Mitarbeiter Pro App"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF-Footer-Text *
            </label>
            <input
              type="text"
              value={formData.pdf_footer_text}
              onChange={(e) => handleChange("pdf_footer_text", e.target.value)}
              required
              className="input-field"
              placeholder="Erstellt mit Mitarbeiter Pro App - DSGVO-konform"
            />
          </div>
        </div>
      </div>

      {/* PDF-Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PDF-Header-Texte
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stundenzettel-Header *
            </label>
            <input
              type="text"
              value={formData.timesheet_header}
              onChange={(e) => handleChange("timesheet_header", e.target.value)}
              required
              className="input-field"
              placeholder="STUNDENNACHWEIS"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorschuss-Header *
            </label>
            <input
              type="text"
              value={formData.advance_payment_header}
              onChange={(e) =>
                handleChange("advance_payment_header", e.target.value)
              }
              required
              className="input-field"
              placeholder="VORSCHUSSANTRAG"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urlaubsantrags-Header *
            </label>
            <input
              type="text"
              value={formData.vacation_header}
              onChange={(e) => handleChange("vacation_header", e.target.value)}
              required
              className="input-field"
              placeholder="URLAUBSANTRAG"
            />
          </div>
        </div>
      </div>

      {/* Unterschriften */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Unterschriften-Label
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bezeichnung für Vorgesetzten *
          </label>
          <input
            type="text"
            value={formData.signature_label}
            onChange={(e) => handleChange("signature_label", e.target.value)}
            required
            className="input-field"
            placeholder="Vorgesetzter / Abteilungsleitung / Geschäftsführung"
          />
          <p className="text-xs text-gray-500 mt-1">
            Wird im Unterschriften-Bereich der PDFs angezeigt
          </p>
        </div>
      </div>

      {/* Rechtliche Hinweise */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Rechtliche Hinweise
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stundenzettel-Hinweis (optional)
            </label>
            <textarea
              value={formData.legal_notice_timesheet || ""}
              onChange={(e) =>
                handleChange("legal_notice_timesheet", e.target.value)
              }
              rows={3}
              className="input-field resize-none"
              placeholder="Rechtliche Hinweise für Stundennachweise..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorschuss-Hinweis (optional)
            </label>
            <textarea
              value={formData.legal_notice_advance_payment || ""}
              onChange={(e) =>
                handleChange("legal_notice_advance_payment", e.target.value)
              }
              rows={3}
              className="input-field resize-none"
              placeholder="Rechtliche Hinweise für Vorschussanträge..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urlaubsantrags-Hinweis (optional)
            </label>
            <textarea
              value={formData.legal_notice_vacation || ""}
              onChange={(e) =>
                handleChange("legal_notice_vacation", e.target.value)
              }
              rows={3}
              className="input-field resize-none"
              placeholder="Rechtliche Hinweise für Urlaubsanträge..."
            />
          </div>
        </div>
      </div>

      {/* QR-Code */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          QR-Code-Kennung
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App-Identifier für QR-Codes *
          </label>
          <input
            type="text"
            value={formData.qr_code_app_identifier}
            onChange={(e) =>
              handleChange("qr_code_app_identifier", e.target.value)
            }
            required
            className="input-field"
            placeholder="Mitarbeiter Pro"
          />
          <p className="text-xs text-gray-500 mt-1">
            Wird in QR-Code-Metadaten eingebettet (z.B. "Mitarbeiter
            Pro-TIMESHEET")
          </p>
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
