/**
 * SecurityConfigForm
 * Formular für Sicherheitseinstellungen (Admin-Passwort)
 */

import React, { useState } from "react";
import { configService } from "../../services/configService";
import { Lock, Eye, EyeOff, AlertCircle, Info, Sparkles } from "lucide-react";
import { generatePassphrase } from "../../utils/passphraseGenerator";

interface SecurityConfigFormProps {
  onSave: (type: "success" | "error" | "warning", message: string) => void;
  onReload: () => void;
}

export const SecurityConfigForm: React.FC<SecurityConfigFormProps> = ({
  onSave,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGeneratePassphrase = () => {
    const passphrase = generatePassphrase();
    setNewPassword(passphrase);
    setConfirmPassword(passphrase);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    if (!currentPassword || !newPassword || !confirmPassword) {
      onSave("error", "Bitte füllen Sie alle Felder aus.");
      return;
    }

    if (newPassword !== confirmPassword) {
      onSave("error", "Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    if (newPassword.length < 8) {
      onSave("error", "Das neue Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await configService.changePassword(
        currentPassword,
        newPassword,
      );

      if (result.success) {
        onSave(
          "success",
          "Passwort erfolgreich geÃ¤ndert. Bitte merken Sie sich Ihr neues Passwort!",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        onSave("error", result.error || "Fehler beim Ändern des Passworts");
      }
    } catch (error) {
      onSave("error", "Fehler beim Ändern des Passworts");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            Sicherheitseinstellungen
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ändern Sie hier Ihr Admin-Passwort
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Wichtige Hinweise:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Das Passwort muss mindestens 8 Zeichen lang sein</li>
            <li>
              Verwenden Sie eine Kombination aus Buchstaben, Zahlen und
              Sonderzeichen
            </li>
            <li>Notieren Sie sich Ihr neues Passwort an einem sicheren Ort</li>
          </ul>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Aktuelles Passwort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aktuelles Passwort
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Aktuelles Passwort eingeben"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Neues Passwort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neues Passwort
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Neues Passwort eingeben"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Passwort bestätigen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neues Passwort bestätigen
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Neues Passwort wiederholen"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Password Mismatch Warning */}
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">
              Die Passwörter stimmen nicht überein
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {isSaving ? "Wird geändert..." : "Passwort ändern"}
          </button>
          <button
            type="button"
            onClick={handleGeneratePassphrase}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            title="Sichere Passphrase generieren"
            aria-label="Sichere Passphrase mit 6 Wörtern und Sonderzeichen generieren"
          >
            <Sparkles className="w-4 h-4" />
            Passphrase generieren
          </button>
        </div>
      </form>
    </div>
  );
};
