/**
 * Formular für Firmendaten-Konfiguration
 * Migration zu wiederverwendbaren Form-Komponenten
 */

import React, { useState, useEffect, useCallback } from "react";
import { configService } from "../../services/configService";
import type { CompanyConfig } from "../../types/config.types";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Palette,
  Upload,
  Save,
  Plus,
  Trash2,
} from "lucide-react";

interface CompanyConfigFormProps {
  config: CompanyConfig;
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => Promise<void>;
}

export const CompanyConfigForm: React.FC<CompanyConfigFormProps> = ({
  config,
  onSave,
  onReload,
}) => {
  const [formData, setFormData] = useState(config);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newWhatsApp, setNewWhatsApp] = useState("");

  useEffect(() => {
    setFormData({
      ...config,
      allowed_emails: config.allowed_emails || [],
      allowed_whatsapp: config.allowed_whatsapp || [],
    });
  }, [config]);

  // Generische Change-Handler
  const handleChange = useCallback((field: keyof CompanyConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Logo-Upload
  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        onSave("error", "Bitte wählen Sie eine Bilddatei");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        onSave("error", "Logo darf maximal 2MB groß sein");
        return;
      }

      setIsUploading(true);

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Logo = reader.result as string;
          setFormData((prev) => ({ ...prev, company_logo: base64Logo }));
          setIsUploading(false);
          onSave("success", "Logo wird beim Speichern übernommen");
        };
        reader.onerror = () => {
          setIsUploading(false);
          onSave("error", "Fehler beim Lesen der Datei");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setIsUploading(false);
        onSave("error", "Fehler beim Hochladen des Logos");
      }
    },
    [onSave]
  );

  // Array-Handler für E-Mails
  const handleAddEmail = useCallback(() => {
    if (!newEmail?.trim()) {
      onSave("error", "Bitte E-Mail-Adresse eingeben");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      onSave("error", "Ungültige E-Mail-Adresse");
      return;
    }

    if (formData.allowed_emails.includes(newEmail)) {
      onSave("error", "E-Mail bereits vorhanden");
      return;
    }

    handleChange("allowed_emails", [...formData.allowed_emails, newEmail]);
    setNewEmail(""); // Clear input after adding
  }, [newEmail, formData.allowed_emails, handleChange, onSave]);

  const handleRemoveEmail = useCallback(
    (email: string) => {
      handleChange(
        "allowed_emails",
        formData.allowed_emails.filter((e) => e !== email)
      );
    },
    [formData.allowed_emails, handleChange]
  );

  // Array-Handler für WhatsApp
  const handleAddWhatsApp = useCallback(() => {
    if (!newWhatsApp?.trim()) {
      onSave("error", "Bitte Telefonnummer eingeben");
      return;
    }

    if (formData.allowed_whatsapp.includes(newWhatsApp)) {
      onSave("error", "Nummer bereits vorhanden");
      return;
    }

    handleChange("allowed_whatsapp", [
      ...formData.allowed_whatsapp,
      newWhatsApp,
    ]);
    setNewWhatsApp(""); // Clear input after adding
  }, [newWhatsApp, formData.allowed_whatsapp, handleChange, onSave]);

  const handleRemoveWhatsApp = useCallback(
    (number: string) => {
      handleChange(
        "allowed_whatsapp",
        formData.allowed_whatsapp.filter((n) => n !== number)
      );
    },
    [formData.allowed_whatsapp, handleChange]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await configService.updateCompanyConfig(formData);

      if (result.success) {
        onSave("success", "Firmendaten erfolgreich gespeichert");
        await onReload();
      } else {
        onSave("error", result.error || "Fehler beim Speichern");
      }
    } catch (error) {
      onSave("error", "Fehler beim Speichern der Firmendaten");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section: Basis-Informationen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Basis-Informationen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firmenname *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              required
              className="input-field"
              placeholder="Ihre Firma GmbH"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.company_email}
                onChange={(e) => handleChange("company_email", e.target.value)}
                required
                className="input-field pl-10"
                placeholder="info@ihre-firma.de"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefonnummer *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.company_phone}
                onChange={(e) => handleChange("company_phone", e.target.value)}
                required
                className="input-field pl-10"
                placeholder="+49123456789"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.company_address}
                onChange={(e) =>
                  handleChange("company_address", e.target.value)
                }
                required
                className="input-field pl-10"
                placeholder="Musterstraße 1, 12345 Musterstadt"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Logo */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Firmenlogo
        </h3>
        <div className="space-y-4">
          {formData.company_logo && (
            <div className="flex items-center gap-4">
              <img
                src={formData.company_logo}
                alt="Firmenlogo"
                className="h-16 w-auto object-contain bg-gray-50 border border-gray-200 rounded p-2"
              />
              <p className="text-sm text-gray-600">Aktuelles Logo</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Neues Logo hochladen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={isUploading}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG oder SVG (max. 2MB)
            </p>
          </div>
        </div>
      </div>

      {/* Section: Branding */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Branding-Farben
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primärfarbe *
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="input-field flex-1"
                placeholder="#2563eb"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme-Farbe (Browser-UI) *
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.theme_color}
                onChange={(e) => handleChange("theme_color", e.target.value)}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.theme_color}
                onChange={(e) => handleChange("theme_color", e.target.value)}
                className="input-field flex-1"
                placeholder="#2563eb"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Erlaubte E-Mails */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Erlaubte E-Mail-Adressen
        </h3>
        <div className="space-y-2">
          {formData.allowed_emails.map((email) => (
            <div
              key={email}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded"
            >
              <span className="flex-1 text-sm text-gray-700">{email}</span>
              <button
                type="button"
                onClick={() => handleRemoveEmail(email)}
                className="text-danger hover:bg-danger/10 p-1 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddEmail())
              }
              className="input-field flex-1"
              placeholder="neue-email@firma.de"
            />
            <button
              type="button"
              onClick={handleAddEmail}
              className="btn-primary px-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Section: Erlaubte WhatsApp */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Erlaubte WhatsApp-Nummern
        </h3>
        <div className="space-y-2">
          {formData.allowed_whatsapp.map((number) => (
            <div
              key={number}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded"
            >
              <span className="flex-1 text-sm text-gray-700">{number}</span>
              <button
                type="button"
                onClick={() => handleRemoveWhatsApp(number)}
                className="text-danger hover:bg-danger/10 p-1 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="tel"
              value={newWhatsApp}
              onChange={(e) => setNewWhatsApp(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddWhatsApp())
              }
              className="input-field flex-1"
              placeholder="+49123456789"
            />
            <button
              type="button"
              onClick={handleAddWhatsApp}
              className="btn-primary px-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Section: Standard-Kontakte */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Standard-Kontakte
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-E-Mail *
            </label>
            <select
              value={formData.default_email}
              onChange={(e) => handleChange("default_email", e.target.value)}
              required
              className="input-field"
            >
              {formData.allowed_emails.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-WhatsApp *
            </label>
            <select
              value={formData.default_whatsapp}
              onChange={(e) => handleChange("default_whatsapp", e.target.value)}
              required
              className="input-field"
            >
              {formData.allowed_whatsapp.map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </div>
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
