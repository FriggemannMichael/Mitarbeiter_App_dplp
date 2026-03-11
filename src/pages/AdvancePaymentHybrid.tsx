import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Container,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import {
  Info as InfoIcon,
  Send as SendIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { SectionCard } from "../components/ui/SectionCard";
import { SignatureField } from "../components/ui/SignatureField";
import { PageHeader } from "../components/PageHeader";
import { useNotification } from "../contexts/NotificationContext";
import { useConfig } from "../contexts/ConfigContext";
import { AdvancePaymentPdfExporter } from "../utils/advancePaymentPdfExporter";
import {
  AdvancePaymentFormData,
  AdvancePaymentNotification,
} from "../types/advancepayment";
import { appConfig } from "../config/appConfig";
import { apiService } from "../services/apiService";

interface AdvancePaymentHybridProps {
  employeeName: string;
  customer?: string;
}

/**
 * Hybrid Advance Payment Component
 * Combines:
 * - MaterialDemo's grid layout & MUI components
 * - Current AdvancePayment's canvas signature & PDF export
 * - Responsive: Stack on mobile, grid on desktop
 */
export const AdvancePaymentHybrid: React.FC<AdvancePaymentHybridProps> = ({
  employeeName,
  customer,
}) => {
  const { t } = useTranslation();
  const { success, error: showError, warning } = useNotification();
  const { config } = useConfig();
  
  const tAdvance = (key: string): string => t(`advancePayment.${key}`);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<AdvancePaymentFormData>({
    amount: 50,
    requestDate: today,
    timesheetsSubmitted: false,
    additionalNotes: "",
  });

  const [employeeSignature, setEmployeeSignature] = useState<string>("");
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleInputChange = (
    field: keyof AdvancePaymentFormData,
    value: string | boolean | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper: Create notification object (used by email, WhatsApp, PDF)
  const createNotification = (): AdvancePaymentNotification => {
    return {
      id: `advance_${Date.now()}`,
      employeeName,
      customer,
      amount: formData.amount,
      requestDate: formData.requestDate,
      additionalNotes: formData.additionalNotes,
      termsConfirmed,
      timesheetsSubmitted: formData.timesheetsSubmitted,
      employeeSignature,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
    };
  };

  // Helper: Generate email/WhatsApp message body
  const generateEmailBody = (): string => {
    const formattedDate = new Date(formData.requestDate).toLocaleDateString(
      "de-DE",
    );

    let message = `${tAdvance("email.greeting")}\n\n`;
    message += `${tAdvance("email.intro")}\n\n`;
    message += `${tAdvance("email.employee_field")} ${employeeName}\n`;
    message += `${tAdvance("email.amount_field")} ${formData.amount} Euro\n`;
    message += `${tAdvance("email.date_field")} ${formattedDate}\n`;

    if (formData.timesheetsSubmitted) {
      message += `\n${tAdvance("email.timesheets_submitted")}\n`;
    }

    if (formData.additionalNotes) {
      message += `\n${tAdvance("email.additional_notes")}\n${formData.additionalNotes}\n`;
    }

    message += `\n\n${tAdvance("email.regards")}\n${employeeName}`;

    return message;
  };

  // Helper: Save notification to localStorage history
  const saveToHistory = (notification: AdvancePaymentNotification) => {
    try {
      const stored = localStorage.getItem("wpdl_advancepayment_history");
      const history = stored ? JSON.parse(stored) : [];
      history.unshift(notification);
      if (history.length > 20) history.pop();
      localStorage.setItem(
        "wpdl_advancepayment_history",
        JSON.stringify(history),
      );
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  };

  // Helper: Check terms confirmation and show warning if not confirmed
  const checkTermsConfirmed = (): boolean => {
    if (!termsConfirmed) {
      warning(
        tAdvance("confirmTerms") || "Bitte bestätigen Sie die Hinweise.",
      );
      return false;
    }
    return true;
  };

  // Helper function removed - unused code cleanup
  // Logic is handled directly in handleSendEmail and handleOpenWhatsApp

  const handleOpenConfirmationModal = () => {
    if (!formData.requestDate || formData.amount <= 0) {
      showError(
        tAdvance("fillRequired") ||
          "Bitte füllen Sie alle Pflichtfelder aus.",
      );
      return;
    }

    if (!employeeSignature) {
      warning(tAdvance("signatureRequired"));
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleSendEmail = async () => {
    if (!checkTermsConfirmed()) {
      return;
    }

    setShowConfirmationModal(false);

    const notification = createNotification();
    saveToHistory(notification);

    try {
      // Generate PDF
      const pdfBytes = await AdvancePaymentPdfExporter.generatePdfBytes(
        notification,
        config,
        employeeSignature,
      );

      // Convert to base64
      const base64Pdf = btoa(
        new Uint8Array(pdfBytes).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      // Determine recipient email
      const recipientEmail =
        config.company?.default_email || appConfig.export.defaultEmail;

      // Determine date range
      const dateRange = new Date(formData.requestDate).toLocaleDateString(
        "de-DE",
      );

      // Generate filename
      const sanitizedName = employeeName.replace(/\s+/g, "_");
      const dateString = new Date().toISOString().split("T")[0];
      const filename = `Vorschussantrag_${sanitizedName}_${dateString}.pdf`;

      // Send via backend
      await apiService.sendPdf({
        pdf_base64: base64Pdf,
        recipient_email: recipientEmail,
        recipient_whatsapp: config.company?.default_whatsapp || "",
        document_type: "advance_payment",
        employee_name: employeeName,
        filename: filename,
        date_range: dateRange,
        amount: formData.amount,
      });

      success(
        tAdvance("pdfSuccess") ||
          "Vorschussantrag wurde erfolgreich versendet!",
      );

      setTimeout(() => {
        setShowSuccessModal(true);
      }, 500);
    } catch (error) {
      console.error("Failed to send advance payment:", error);
      showError(
        tAdvance("pdfError") ||
          "Fehler beim Versenden des Vorschussantrags.",
      );
    }
  };

  const handleSendWhatsApp = async () => {
    if (!checkTermsConfirmed()) {
      return;
    }

    setShowConfirmationModal(false);

    const notification = createNotification();
    saveToHistory(notification);

    try {
      // PDF generieren
      const pdfBytes = await AdvancePaymentPdfExporter.generatePdfBytes(
        notification,
        config,
        employeeSignature,
      );

      // PDF als Blob erstellen
      const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });

      // Dateiname generieren
      const sanitizedName = employeeName.replace(/\s+/g, "_");
      const dateString = new Date().toISOString().split("T")[0];
      const filename = `Vorschussantrag_${sanitizedName}_${dateString}.pdf`;

      // Web Share API versuchen (funktioniert auf Mobilgeräten)
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], filename, { type: "application/pdf" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Vorschussantrag - ${employeeName}`,
            text: generateEmailBody(),
            files: [file],
          });

          success(
            tAdvance("pdfSuccess") || "Vorschussantrag wurde geteilt!",
          );
          setTimeout(() => setShowSuccessModal(true), 500);
          return;
        }
      }

      // Fallback: wa.me-Link (nur Text, kein PDF)
      const whatsappRaw =
        config.company.default_whatsapp || appConfig.export.defaultWhatsApp;
      const whatsappNumber = whatsappRaw.replace(/\+/g, "");
      const body = generateEmailBody();
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`;
      window.open(whatsappUrl, "_blank");

      setTimeout(() => setShowSuccessModal(true), 500);
    } catch (error) {
      console.error("WhatsApp share failed:", error);

      // Bei Fehler: Fallback zu wa.me-Link
      const whatsappRaw =
        config.company.default_whatsapp || appConfig.export.defaultWhatsApp;
      const whatsappNumber = whatsappRaw.replace(/\+/g, "");
      const body = generateEmailBody();
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(body)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleGeneratePdf = async () => {
    if (!formData.requestDate || formData.amount <= 0) {
      showError(
        tAdvance("fillRequired") ||
          "Bitte füllen Sie alle Pflichtfelder aus.",
      );
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const notification = createNotification();

      await AdvancePaymentPdfExporter.generatePdf(
        notification,
        config,
        employeeSignature,
      );

      saveToHistory(notification);

      success(tAdvance("pdfSuccess") || "PDF wurde erfolgreich erstellt!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      showError(tAdvance("pdfError") || "Fehler beim Erstellen des PDFs.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setFormData({
      amount: 50,
      requestDate: today,
      timesheetsSubmitted: false,
      additionalNotes: "",
    });
    setTermsConfirmed(false);
    setEmployeeSignature("");
  };

  const isFormValid = () => {
    return (
      formData.requestDate &&
      formData.amount > 0 &&
      formData.timesheetsSubmitted &&
      employeeSignature &&
      termsConfirmed
    );
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pb: 10 }}>
      <PageHeader title={tAdvance("title")} employeeName={employeeName} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Header Card with Info */}
          <SectionCard variant="info">
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <InfoIcon sx={{ color: "primary.main", mt: 0.5 }} />
              <Box>
                <Typography
                  variant="body2"
                  color="text.primary"
                  fontWeight={600}
                >
                  {tAdvance("importantInformation")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {tAdvance("importantInfoText")}
                </Typography>
              </Box>
            </Stack>
          </SectionCard>

          {/* Main Form - Grid Layout on Desktop */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            {/* Left Column */}
            <Stack spacing={3}>
              {/* Amount Input */}
              <SectionCard title={tAdvance("amount")}>
                <Stack spacing={2}>
                  <TextField
                    type="number"
                    value={formData.amount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      handleInputChange("amount", Math.max(value, 10));
                    }}
                    fullWidth
                    inputProps={{
                      min: 10,
                      step: 10,
                    }}
                    label={tAdvance("amountLabel")}
                    helperText={tAdvance("amountHelp")}
                  />
                </Stack>
              </SectionCard>

              {/* Date */}
              <SectionCard title={tAdvance("dateLabel")}>
                <TextField
                  type="date"
                  value={formData.requestDate}
                  onChange={(e) =>
                    handleInputChange("requestDate", e.target.value)
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled
                  helperText={tAdvance("timeAutoDisplay")}
                />
              </SectionCard>

              {/* Payment Info */}
              <SectionCard title={tAdvance("payment")} variant="success">
                <Typography variant="body2" color="text.secondary">
                  {tAdvance("paymentInfo")}
                </Typography>
              </SectionCard>
            </Stack>

            {/* Right Column */}
            <Stack spacing={3}>
              {/* Confirmations */}
              <SectionCard title={tAdvance("confirmations")}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: formData.timesheetsSubmitted
                        ? "grey.300"
                        : "error.main",
                      borderRadius: 1.5,
                      px: 1,
                      py: 0.5,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.timesheetsSubmitted}
                          onChange={(e) =>
                            handleInputChange(
                              "timesheetsSubmitted",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {tAdvance("timesheetsSubmittedLabel")}
                        </Typography>
                      }
                    />
                  </Box>
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: termsConfirmed ? "grey.300" : "error.main",
                      borderRadius: 1.5,
                      px: 1,
                      py: 0.5,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={termsConfirmed}
                          onChange={(e) => setTermsConfirmed(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {tAdvance("confirmDataCorrect")}
                        </Typography>
                      }
                    />
                  </Box>
                </Stack>
              </SectionCard>

              {/* Additional Notes */}
              <SectionCard title={tAdvance("additionalNotes")}>
                <TextField
                  multiline
                  rows={4}
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    handleInputChange("additionalNotes", e.target.value)
                  }
                  placeholder={tAdvance("additionalNotesOptional")}
                  fullWidth
                />
              </SectionCard>
            </Stack>
          </Box>

          {/* Signature */}
          <SectionCard title={t("signature.employee")}>
            <SignatureField
              label={tAdvance("signature")}
              value={employeeSignature}
              onChange={(signature) => setEmployeeSignature(signature)}
              onClear={() => setEmployeeSignature("")}
              required
            />
          </SectionCard>

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleOpenConfirmationModal}
              disabled={!isFormValid()}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {tAdvance("submitNow")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              sx={{ py: 1.5 }}
            >
              {isGeneratingPdf
                ? tAdvance("generatingPdf")
                : tAdvance("exportPdf")}
            </Button>
          </Stack>

          {!isFormValid() && (
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {tAdvance("fillAllFields")}
            </Typography>
          )}
        </Stack>
      </Container>

      {/* Confirmation Modal */}
      <Dialog
        open={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Antrag finalisieren</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Der Antrag über <strong>{formData.amount.toFixed(0)} €</strong>{" "}
              wird nun versendet. Wählen Sie den Kanal:
            </Typography>

            <SectionCard variant="warning" noPadding>
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Wichtige Hinweise:</strong>
                </Typography>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                  <li>
                    <Typography variant="caption" color="text.secondary">
                      Vorschusszahlungen sind nur vom 10. bis zum Monatsende
                      möglich
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="caption" color="text.secondary">
                      Die Auszahlung erfolgt am nächsten Mittwoch nach
                      Antragstellung
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="caption" color="text.secondary">
                      Der Betrag wird mit der nächsten Gehaltsabrechnung
                      verrechnet
                    </Typography>
                  </li>
                </ul>
              </Box>
            </SectionCard>

            <Box
              sx={{
                border: "1px solid",
                borderColor: termsConfirmed ? "grey.300" : "error.main",
                borderRadius: 1.5,
                px: 1,
                py: 0.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsConfirmed}
                    onChange={(e) => setTermsConfirmed(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Ich habe die Hinweise gelesen und verstanden
                  </Typography>
                }
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "stretch",
            gap: 1,
            "& .MuiButton-root": {
              width: { xs: "100%", sm: "auto" },
              ml: { xs: "0 !important", sm: "8px" },
            },
          }}
        >
          <Button onClick={() => setShowConfirmationModal(false)}>
            Abbrechen
          </Button>
          <Button
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            onClick={handleSendWhatsApp}
            disabled={!termsConfirmed}
          >
            WhatsApp
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={handleSendEmail}
            disabled={!termsConfirmed}
          >
            E-Mail
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={showSuccessModal}
        onClose={handleCloseSuccessModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h6">Erfolgreich versendet!</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Der Vorschussantrag wurde erfolgreich erstellt und protokolliert.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "stretch",
            gap: 1,
            "& .MuiButton-root": {
              width: { xs: "100%", sm: "auto" },
              ml: { xs: "0 !important", sm: "8px" },
            },
          }}
        >
          <Button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            startIcon={<DownloadIcon />}
          >
            PDF herunterladen
          </Button>
          <Button variant="contained" onClick={handleCloseSuccessModal}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
