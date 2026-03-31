import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Mail, X, Lock, AlertCircle } from "lucide-react";
import { useConfig } from "../contexts/ConfigContext";
import { useNotification } from "../contexts/NotificationContext";
import { WorkTimeValidator } from "../core/validation/WorkTimeValidator";
import { WeekData, weekUtils } from "../utils/storage";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
  employeeName: string;
  weekYear: number;
  weekNumber: number;
  customerEmail?: string;
  pdfBlob?: Blob;
  onShareComplete?: () => void;
  weekData?: WeekData; // Optional: für Validierung
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileUrl,
  employeeName,
  weekYear,
  weekNumber,
  customerEmail,
  pdfBlob,
  onShareComplete,
  weekData,
}) => {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { success: showSuccess, error: showError } = useNotification();

  const [selectedEmail, setSelectedEmail] = useState(
    config.company.default_email,
  );
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(
    config.company.default_whatsapp,
  );
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const hasSupervisorSignature = Boolean(weekData?.supervisorSignature);

  const dateRange = useMemo(() => {
    const dates = (weekData?.days || [])
      .map((day) => day.date)
      .filter(Boolean)
      .map((date) => new Date(date));

    if (dates.length === 0) {
      return "";
    }

    return `${weekUtils.formatDate(dates[0])} - ${weekUtils.formatDate(dates[dates.length - 1])}`;
  }, [weekData]);

  const buildCustomerEmailBody = () => {
    const intro = hasSupervisorSignature
      ? "anbei erhalten Sie eine Kopie des Stundennachweises"
      : "anbei erhalten Sie den Stundennachweis";
    const dateRangeText = dateRange ? ` (${dateRange})` : "";
    const signatureRequest = hasSupervisorSignature
      ? ""
      : "\n\nBitte bestätigen Sie die geleisteten Stunden, indem Sie den Stundennachweis unterzeichnen und per Email an adminstration@dplp.de weiterleiten.";

    return `Sehr geehrte Damen und Herren,

${intro} von ${employeeName} für die KW ${weekNumber}/${weekYear}${dateRangeText} per automatischem Versand aus dem Mitarbeiter Pro System.${signatureRequest}

Für Rückfragen stehen wir Ihnen gerne unter der 02041 77987-0 zur Verfügung.

Freundliche Grüße

DPL Professionals GmbH`;
  };

  // Validierung der WeekData
  const validationResult = useMemo(() => {
    if (!weekData) return null;
    const validator = new WorkTimeValidator(config.work);
    return validator.validateWeek(weekData);
  }, [weekData, config.work]);

  if (!isOpen) return null;

  // E-Mail-Versand: Erst Backend, dann Web Share API, dann mailto
  const handleEmailShare = async () => {
    setIsSending(true);
    const subject = `Stundennachweis - ${employeeName} - KW ${weekNumber}/${weekYear}`;
    const message = [
      "Hallo,",
      "",
      "anbei der Stundennachweis für:",
      `- Mitarbeiter: ${employeeName}`,
      `- Kalenderwoche: ${weekNumber}/${weekYear}`,
      `- Datei: ${fileName}`,
      "",
      "Mit freundlichen Grüßen",
      employeeName,
      "---",
      "Gesendet mit WPDL Stundennachweis App",
    ].join("\n");

    let backendError = null;
    try {
      // 1. Backend-Versand mit PHP
      if (pdfBlob) {
        const blobToBase64 = (blob: Blob): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };

        const base64Data = await blobToBase64(pdfBlob);
        // Entferne "data:application/pdf;base64," Prefix
        const base64String = base64Data.split(",")[1];

        // Erstelle JSON-Payload für Backend API
        const payload = {
          pdf_base64: base64String,
          recipient_email: selectedEmail,
          customer_email: customerEmail?.trim() || undefined,
          document_type: "timesheet",
          employee_name: employeeName,
          filename: fileName,
          week_number: weekNumber.toString(),
          week_year: weekYear.toString(),
          date_range: dateRange,
          has_supervisor_signature: hasSupervisorSignature,
          is_customer_recipient: false,
        };

        const response = await fetch(
          `${config.technical.api_endpoint}/api/send-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        // Prüfe HTTP-Status
        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status} ${response.statusText}`,
          );
        }

        // Lese Response als Text
        const responseText = await response.text();

        // Versuche JSON zu parsen
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error("Ungültige Server-Antwort (kein JSON)");
        }

        if (result.success) {
          const resultData = result.data || {};
          // Backend sendet automatisch Kopie an Kunden wenn customer_email vorhanden
          let successMessage = "✅ E-Mail erfolgreich versendet!";
          if (resultData.customer_email_sent) {
            successMessage +=
              "\n✅ Kopie an Kunde gesendet: " + resultData.customer_email;
          } else if (
            customerEmail &&
            customerEmail.trim() &&
            !resultData.customer_email_sent
          ) {
            successMessage += "\nⓘ Kopie an Kunde fehlgeschlagen";
            if (resultData.customer_email_error) {
              successMessage += `\n${resultData.customer_email_error}`;
            }
          }

          setSuccess(true);
          showSuccess(successMessage, 3000);
          setTimeout(() => {
            setSuccess(false);
            onClose();
            if (onShareComplete) onShareComplete();
          }, 2000);
          setIsSending(false);
          return;
        } else {
          backendError = result.error || "Versand fehlgeschlagen";
          throw new Error(backendError);
        }
      } else {
        backendError = "Kein PDF-Blob vorhanden";
        throw new Error(backendError);
      }
    } catch (error) {
      // 2. Fallback: Web Share API
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: "application/pdf" });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: subject,
              text: message,
              files: [file],
            });

            // Bei Erfolg: Kunde-E-Mail separat öffnen
            if (customerEmail && customerEmail.trim()) {
              const customerSubject = `Stundennachweis - ${employeeName} - KW ${weekNumber}/${weekYear}`;
              const customerBody = buildCustomerEmailBody();

              const customerMailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(
                customerSubject,
              )}&body=${encodeURIComponent(customerBody)}`;
              window.open(customerMailtoLink, "_blank");
            }

            setSuccess(true);
            setTimeout(() => {
              setSuccess(false);
              onClose();
              if (onShareComplete) onShareComplete();
            }, 2000);
            setIsSending(false);
            return;
          }
        } catch (shareError) {
          // Web Share API fehlgeschlagen
        }
      }

      // 3. Fallback: mailto mit Download
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        const mailtoLink = `mailto:${selectedEmail}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(
          message +
            "\n\nBitte h�ngen Sie die heruntergeladene PDF-Datei manuell an.",
        )}`;
        window.open(mailtoLink, "_blank");

        if (customerEmail && customerEmail.trim()) {
          const customerSubject = `Stundennachweis - ${employeeName} - KW ${weekNumber}/${weekYear}`;
          const customerBody = buildCustomerEmailBody();

          setTimeout(() => {
            const customerMailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(
              customerSubject,
            )}&body=${encodeURIComponent(
              customerBody +
                "\n\nBitte h�ngen Sie die heruntergeladene PDF-Datei manuell an.",
            )}`;
            window.open(customerMailtoLink, "_blank");
          }, 1000);
        }
      }, 500);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onShareComplete) {
          onShareComplete();
        }
      }, 2000);
      setIsSending(false);
    }
  };

  // Share-Funktion: Versucht Web Share API, sonst WhatsApp-Fallback
  const handleShare = async () => {
    setIsSending(true);

    const shareText = `📄 Stundennachweis\n${employeeName} • KW ${weekNumber}/${weekYear}\n${fileName}`;

    try {
      // Versuche Web Share API mit Datei
      if (navigator.share && navigator.canShare) {
        try {
          const resp = await fetch(fileUrl);
          const blob = await resp.blob();
          const file = new File([blob], fileName, { type: "application/pdf" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Stundennachweis - ${employeeName}`,
              text: shareText,
              files: [file],
            });
            setIsSending(false);
            setSuccess(true);
            setTimeout(() => {
              setSuccess(false);
              onClose();
              if (onShareComplete) onShareComplete();
            }, 1500);
            return;
          }
        } catch (err) {
          // Web Share API nicht nutzbar, fallback to WhatsApp
        }
      }

      // Fallback: WhatsApp-Link (öffnet App/Web). Datei wird vorher zum Download angeboten.
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const whatsappUrl = `https://wa.me/${selectedWhatsApp}?text=${encodeURIComponent(
        shareText,
      )}`;
      window.open(whatsappUrl, "_blank");

      setSuccess(true);
      showSuccess("WhatsApp-Nachricht wird geöffnet...", 2000);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onShareComplete) onShareComplete();
      }, 1500);
    } catch (error) {
      showError("Teilen fehlgeschlagen");
    } finally {
      setIsSending(false);
    }
  };

  // Link kopieren
  // copy-Funktion entfernt (nicht mehr benötigt)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-2 sm:mx-0 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {t("export.share")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Errors & Warnings */}
          {validationResult && validationResult.hasErrors() && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Validierungsfehler
                </span>
              </div>
              {validationResult.errors.map((error, idx) => (
                <div key={idx} className="text-sm text-red-700">
                  • {error.message}
                </div>
              ))}
            </div>
          )}
          {validationResult &&
            validationResult.hasWarnings() &&
            !validationResult.hasErrors() && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">
                    Hinweise
                  </span>
                </div>
                {validationResult.warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm text-amber-700">
                    • {warning.message}
                  </div>
                ))}
              </div>
            )}

          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm text-gray-600 mb-1">{t("shareModal.file")}</p>
            <p className="font-medium text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500 mt-2">
              {employeeName} • KW {weekNumber}/{weekYear}
            </p>
          </div>

          {/* Kunden-Kopie Info */}
          {customerEmail && customerEmail.trim() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {t("shareModal.customerCopy")}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t("shareModal.customerReceives")}{" "}
                    <span className="font-medium">{customerEmail}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aktionen: E-Mail-Senden (optional) und Teilen */}
          <div className="flex flex-col gap-2 sm:gap-4 mb-4 sm:mb-6">
            {config.technical.enable_email ? (
              <button
                className="w-full btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center justify-center space-x-1 py-2.5 sm:py-3"
                onClick={handleEmailShare}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t("shareModal.sending") || "Sende..."}</span>
                  </>
                ) : success ? (
                  <span>{t("shareModal.sent") || "Gesendet"}</span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16 6 12 2 8 6"></polyline>
                      <line x1="12" x2="12" y1="2" y2="15"></line>
                    </svg>
                    <span>Senden</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                E-Mail-Versand ist in dieser Version deaktiviert.
              </div>
            )}
            <button
              className="btn-secondary text-xs sm:text-sm flex items-center justify-center space-x-1 py-2.5 sm:py-3"
              onClick={handleShare}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{t("shareModal.sending") || "Sende..."}</span>
                </>
              ) : success ? (
                <span>{t("shareModal.sent") || "Gesendet"}</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" x2="12" y1="15" y2="3"></line>
                  </svg>
                  <span>Teilen</span>
                </>
              )}
            </button>
          </div>

          {/* E-Mail Selection - Wird nur angezeigt wenn aktiviert */}
          {config.technical.enable_email && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empfänger-E-Mail:
              </label>
              <select
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="w-full input-field"
              >
                {config.company.allowed_emails.map((email: string) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Nur freigegebene E-Mail-Adressen verfügbar
              </p>
            </div>
          )}

          {/* WhatsApp Selection - Wird nur angezeigt wenn aktiviert */}
          {config.technical.enable_whatsapp && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp-Kontakt:
              </label>
              <select
                value={selectedWhatsApp}
                onChange={(e) => setSelectedWhatsApp(e.target.value)}
                className="w-full input-field"
              >
                {config.company.allowed_whatsapp.map((number: string) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Nur freigegebene WhatsApp-Nummern verfügbar
              </p>
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t("actions.cancel")}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Sicherheitshinweis:</strong> Aus Datenschutzgründen
                können nur vordefinierte Empfänger ausgewählt werden.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

