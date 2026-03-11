/**
 * Admin-Dashboard
 * Hauptseite für Konfigurationsverwaltung
 */

import React, { useState } from "react";
import { authService } from "../services/authService";
import { configService } from "../services/configService";
import { useConfig } from "../contexts/ConfigContext";
import {
  Settings,
  LogOut,
  Download,
  Building2,
  FileText,
  Cog,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { CompanyConfigForm } from "../components/admin/CompanyConfigForm";
import { PdfConfigForm } from "../components/admin/PdfConfigForm";
import { TechnicalConfigForm } from "../components/admin/TechnicalConfigForm";
import { WorkSettingsForm } from "../components/admin/WorkSettingsForm";
import { EmailConfigForm } from "../components/admin/EmailConfigForm";
import { SecurityConfigForm } from "../components/admin/SecurityConfigForm";
import { AccountManagementForm } from "../components/admin/AccountManagementForm";
import { ConfirmDialog } from "../components/ConfirmDialog";

type TabType = "company" | "pdf" | "technical" | "work" | "email" | "security" | "accounts";

export const AdminDashboard: React.FC = () => {
  const { config, reloadConfig } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>("company");
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/";
  };

  const handleExportConfig = async () => {
    try {
      const result = await configService.downloadConfiguration(config);
      if (result.success) {
        showSaveMessage(
          "success",
          "Backup als config.json heruntergeladen. Sie können diese Datei optional auf den Server hochladen."
        );
      } else {
        showSaveMessage("error", result.error || "Fehler beim Exportieren");
      }
    } catch (error) {
      showSaveMessage("error", "Fehler beim Exportieren der Konfiguration");
    }
  };

  const showSaveMessage = (
    type: "success" | "error" | "warning",
    text: string
  ) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 5000);
  };

  const tabs = [
    {
      id: "company" as TabType,
      name: "Firmendaten",
      icon: Building2,
      description: "Firmenname, Logo, Kontakte",
    },
    {
      id: "pdf" as TabType,
      name: "PDF & Branding",
      icon: FileText,
      description: "PDF-Texte, Header, Footer",
    },
    {
      id: "technical" as TabType,
      name: "Technisch",
      icon: Cog,
      description: "API, QR-Codes, Integration",
    },
    {
      id: "work" as TabType,
      name: "Arbeitszeit",
      icon: Clock,
      description: "Arbeitszeit-Regeln, Pausen",
    },
    {
      id: "email" as TabType,
      name: "Email-Server",
      icon: Mail,
      description: "SMTP, Absender, Versand",
    },
    {
      id: "security" as TabType,
      name: "Sicherheit",
      icon: Shield,
      description: "Passwort, Zugang",
    },
    {
      id: "accounts" as TabType,
      name: "Benutzer",
      icon: Users,
      description: "Accounts & Rollen",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Admin-Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  Konfigurationsverwaltung
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportConfig}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-gray-300"
                title="Optional: Backup als config.json herunterladen"
              >
                <Download className="w-4 h-4" />
                <span>Backup erstellen</span>
              </button>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Save Message */}
      {saveMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              saveMessage.type === "success"
                ? "bg-success/10 border border-success/20"
                : saveMessage.type === "warning"
                ? "bg-warning/10 border border-warning/20"
                : "bg-danger/10 border border-danger/20"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  saveMessage.type === "warning"
                    ? "text-warning"
                    : "text-danger"
                }`}
              />
            )}
            <p
              className={`text-sm font-medium ${
                saveMessage.type === "success"
                  ? "text-success"
                  : saveMessage.type === "warning"
                  ? "text-warning"
                  : "text-danger"
              }`}
            >
              {saveMessage.text}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-center">
                  <p className="text-sm font-medium">{tab.name}</p>
                  <p
                    className={`text-xs ${
                      isActive ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === "company" && (
            <CompanyConfigForm
              config={config.company}
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "pdf" && (
            <PdfConfigForm
              config={config.pdf}
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "technical" && (
            <TechnicalConfigForm
              config={config.technical}
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "work" && (
            <WorkSettingsForm
              config={config.work}
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "email" && (
            <EmailConfigForm
              config={config.email}
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "security" && (
            <SecurityConfigForm
              onSave={showSaveMessage}
              onReload={reloadConfig}
            />
          )}

          {activeTab === "accounts" && (
            <AccountManagementForm
              onSave={showSaveMessage}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-gray-500">
          <p className="font-medium">Stundennachweis Pro - Admin-Dashboard</p>
          <p className="mt-2 max-w-2xl mx-auto">
            <strong>✓ Änderungen sind sofort aktiv!</strong> Sie werden
            automatisch im Browser gespeichert.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Optional können Sie mit "Backup erstellen" eine Sicherungskopie als
            config.json herunterladen.
          </p>
        </div>
      </footer>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Abmelden?"
        message="Möchten Sie sich wirklich abmelden? Alle nicht gespeicherten Änderungen gehen verloren."
        confirmText="Abmelden"
        cancelText="Abbrechen"
        variant="warning"
      />
    </div>
  );
};
