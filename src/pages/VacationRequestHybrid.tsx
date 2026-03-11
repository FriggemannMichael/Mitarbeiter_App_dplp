import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControlLabel,
  Checkbox,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { SectionCard } from "../components/ui/SectionCard";
import { SignatureField } from "../components/ui/SignatureField";
import { PageHeader } from "../components/PageHeader";
import { useConfig } from "../contexts/ConfigContext";
import { useNotification } from "../contexts/NotificationContext";
import { VacationPdfExporter } from "../utils/vacationPdfExporter";
import { VacationStorage } from "../utils/vacationStorage";
import { storage } from "../utils/storage";
import { apiService } from "../services/apiService";
import {
  VacationType,
  VacationFormData,
  VacationRequest as VacationRequestType,
} from "../types/vacation";

interface VacationRequestHybridProps {
  employeeName: string;
}

const INITIAL_FORM_DATA: VacationFormData = {
  type: "paid",
  startDate: "",
  endDate: "",
  singleDate: "",
  reason: "",
  notes: "",
};

const createVacationRequest = (
  formData: VacationFormData,
  employeeName: string,
  customer: string,
  hasReadTerms: boolean,
  employeeSignature: string | undefined,
  customerSignature: string | undefined,
  status: "draft" | "submitted"
): VacationRequestType => ({
  id: status === "submitted" ? VacationStorage.generateId() : "preview",
  employeeName,
  customer,
  type: formData.type,
  startDate: formData.startDate,
  endDate: formData.endDate,
  singleDate: formData.singleDate,
  reason: formData.reason,
  notes: formData.notes,
  hasReadTerms,
  employeeSignature,
  customerSignature,
  status,
  createdAt: new Date().toISOString(),
  ...(status === "submitted" && { submittedAt: new Date().toISOString() }),
});

const generatePdfFilename = (employeeName: string): string => {
  const sanitizedName = employeeName.replace(/\s+/g, "_");
  const dateString = new Date().toISOString().split("T")[0];
  return `Urlaubsantrag_${sanitizedName}_${dateString}.pdf`;
};

const createPdfBlob = (pdfBytes: Uint8Array): Blob => {
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
};

const trySharePdf = async (
  blob: Blob,
  filename: string,
  employeeName: string
): Promise<boolean> => {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  try {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (!navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      title: `Urlaubsantrag - ${employeeName}`,
      text: `Urlaubsantrag vom ${new Date().toLocaleDateString("de-DE")}`,
      files: [file],
    });
    return true;
  } catch (error) {
    return false;
  }
};

const downloadPdf = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Hybrid Vacation Request Component
 * Combines:
 * - MaterialDemo's grid layout & MUI components
 * - Current VacationRequest's PDF export & validation logic
 * - Canvas signatures (legal requirement)
 * - Responsive: Stack on mobile, grid on desktop
 */
export const VacationRequestHybrid: React.FC<VacationRequestHybridProps> = ({
  employeeName,
}) => {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { success, error: showError, warning } = useNotification();

  const [formData, setFormData] = useState<VacationFormData>(INITIAL_FORM_DATA);
  const [customer, setCustomer] = useState("");
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [employeeSignature, setEmployeeSignature] = useState<
    string | undefined
  >();
  const [customerSignature, setCustomerSignature] = useState<
    string | undefined
  >();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const savedCustomer = storage.getCustomer();
    if (savedCustomer) {
      setCustomer(savedCustomer);
    }
  }, []);

  const handleInputChange = (field: keyof VacationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: VacationType) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  const isFormValid = () => {
    if (!customer.trim() || !hasReadTerms || !employeeSignature) {
      return false;
    }

    if (formData.type === "special") {
      return !!(formData.singleDate && formData.reason);
    }
    return !!(formData.startDate && formData.endDate);
  };

  const validateFormBeforeSubmit = (): boolean => {
    if (!customer.trim()) {
      showError(t("validation.customerRequired"));
      return false;
    }

    if (!hasReadTerms) {
      warning(t("vacation.mustReadTerms"));
      return false;
    }

    if (!employeeSignature) {
      warning(t("validation.signatureRequired"));
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCustomer("");
    setHasReadTerms(false);
    setEmployeeSignature(undefined);
    setCustomerSignature(undefined);
    setConfirmChecked(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormBeforeSubmit()) {
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    console.log("🟢 confirmSubmit called");

    if (!confirmChecked) {
      warning(t("vacation.mustConfirmUnderstood"));
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("🟢 Creating vacation request...");
      const vacationRequest = createVacationRequest(
        formData,
        employeeName,
        customer,
        hasReadTerms,
        employeeSignature,
        customerSignature,
        "submitted"
      );

      VacationStorage.saveRequest(vacationRequest);
      console.log("🟢 Vacation request saved to storage");

      console.log("🟢 Generating PDF...");
      const pdfBytes = await VacationPdfExporter.generatePDF(
        vacationRequest,
        config
      );
      const blob = createPdfBlob(pdfBytes);
      const filename = generatePdfFilename(employeeName);
      console.log("🟢 PDF generated:", filename);

      // Convert PDF to base64
      const base64Pdf = btoa(
        new Uint8Array(pdfBytes).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Determine email recipient
      const recipientEmail =
        config.company?.default_email ||
        config.company?.allowed_emails?.[0] ||
        "";

      // Determine date range for email
      let dateRange = "";
      if (formData.type === "special") {
        dateRange = formData.singleDate || "";
      } else {
        dateRange =
          formData.startDate && formData.endDate
            ? `${formData.startDate} - ${formData.endDate}`
            : "";
      }

      // Send PDF via email (Backend handles PDF attachment automatically)
      try {
        console.log("🔵 Sending vacation PDF via backend...", {
          recipient_email: recipientEmail,
          document_type: "vacation",
          employee_name: employeeName,
          filename: filename,
          date_range: dateRange,
        });

        const response = await apiService.sendPdf({
          pdf_base64: base64Pdf,
          recipient_email: recipientEmail,
          recipient_whatsapp: config.company?.default_whatsapp || "",
          document_type: "vacation",
          employee_name: employeeName,
          filename: filename,
          date_range: dateRange,
        });

        console.log("✅ Backend response:", response);

        if (response.success) {
          console.log("🟢 Backend successfully sent email!");
          success(t("vacation.submitSuccess"));
        } else {
          console.log("🔴 Backend returned success=false");
          throw new Error(response.error || "Backend returned success=false");
        }
      } catch (emailError) {
        console.error("❌ Email send error:", emailError);

        // Zeige detaillierten Fehler
        const errorMessage =
          emailError instanceof Error ? emailError.message : String(emailError);
        showError(`${t("errors.shareError")}: ${errorMessage}`);

        // Fallback: Nur bei Fehler lokalen Download anbieten
        console.log("🔴 Entering fallback - opening share dialog");
        warning(t("vacation.submitError"));
        const shareSuccess = await trySharePdf(blob, filename, employeeName);
        if (!shareSuccess) {
          downloadPdf(blob, filename);
        }
        return; // Wichtig: Return hier, damit nicht weiter ausgeführt wird
      }

      console.log("🟢 Closing dialog and resetting form");
      setShowConfirmDialog(false);
      resetForm();
    } catch (error) {
      console.error("🔴 Outer error:", error);
      showError(t("vacation.submitError"));
    } finally {
      console.log("🟢 Finally: Setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!validateFormBeforeSubmit()) {
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const vacationRequest = createVacationRequest(
        formData,
        employeeName,
        customer,
        hasReadTerms,
        employeeSignature,
        customerSignature,
        "draft"
      );

      const pdfBytes = await VacationPdfExporter.generatePDF(
        vacationRequest,
        config
      );
      const blob = createPdfBlob(pdfBytes);
      const filename = generatePdfFilename(employeeName);

      downloadPdf(blob, filename);

      success(t("vacation.pdfSuccess"));
    } catch (error) {
      showError(t("vacation.pdfError"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getVacationTypeLabel = (type: VacationType) => {
    switch (type) {
      case "paid":
        return t("vacation.paidVacation");
      case "unpaid":
        return t("vacation.unpaidVacation");
      case "special":
        return t("vacation.specialLeave");
      case "compensatory":
        return t("vacation.compensatoryLeave");
      default:
        return type;
    }
  };

  const handleDialogCancel = () => {
    setShowConfirmDialog(false);
    setConfirmChecked(false);
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pb: 10 }}>
      <PageHeader title={t("vacation.title")} employeeName={employeeName} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
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
              {/* Customer */}
              <SectionCard title={t("timesheet.customer")}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BusinessIcon sx={{ color: "#3b82f6" }} />
                  <TextField
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder={t("timesheet.placeholders.customer")}
                    fullWidth
                    required
                    error={!customer.trim()}
                  />
                </Stack>
              </SectionCard>

              {/* Vacation Type */}
              <SectionCard title={t("vacation.type")}>
                <TextField
                  select
                  value={formData.type}
                  onChange={(e) =>
                    handleTypeChange(e.target.value as VacationType)
                  }
                  fullWidth
                >
                  <MenuItem value="paid">
                    {getVacationTypeLabel("paid")}
                  </MenuItem>
                  <MenuItem value="unpaid">
                    {getVacationTypeLabel("unpaid")}
                  </MenuItem>
                  <MenuItem value="special">
                    {getVacationTypeLabel("special")}
                  </MenuItem>
                  <MenuItem value="compensatory">
                    {getVacationTypeLabel("compensatory")}
                  </MenuItem>
                </TextField>
              </SectionCard>

              {/* Date Selection */}
              <SectionCard
                title={
                  formData.type === "special"
                    ? t("vacation.date")
                    : t("vacation.dates")
                }
              >
                {formData.type === "special" ? (
                  <TextField
                    type="date"
                    value={formData.singleDate}
                    onChange={(e) =>
                      handleInputChange("singleDate", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                  />
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        handleInputChange("startDate", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      label={t("vacation.startDate")}
                      fullWidth
                      required
                    />
                    <TextField
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        handleInputChange("endDate", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: formData.startDate }}
                      label={t("vacation.endDate")}
                      fullWidth
                      required
                    />
                  </Stack>
                )}
              </SectionCard>
            </Stack>

            {/* Right Column */}
            <Stack spacing={3}>
              {/* Reason */}
              <SectionCard title={t("vacation.reason")}>
                <TextField
                  multiline
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder={t("vacation.reasonPlaceholder")}
                  fullWidth
                  required={formData.type === "special"}
                />
              </SectionCard>

              {/* Additional Notes */}
              <SectionCard title={t("vacation.notes")}>
                <TextField
                  multiline
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("vacation.notesPlaceholder")}
                  fullWidth
                />
              </SectionCard>
            </Stack>
          </Box>

          {/* Legal Terms */}
          <SectionCard variant="info">
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <InfoIcon sx={{ color: "#3b82f6", mt: 0.5 }} />
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.primary"
                  >
                    {t("vacation.legalTerms")}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Typography
                        key={i}
                        variant="caption"
                        color="text.secondary"
                        dangerouslySetInnerHTML={{
                          __html: "• " + t(`vacation.legalTerms.point${i}`),
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: hasReadTerms ? "grey.300" : "error.main",
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.5,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasReadTerms}
                      onChange={(e) => setHasReadTerms(e.target.checked)}
                      sx={{ alignSelf: "center", mt: 0, p: 0.75, mr: 0.75 }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}
                    >
                      {t("vacation.confirmReadTerms")}
                    </Typography>
                  }
                  sx={{
                    alignItems: "center",
                    m: 0,
                    gap: 0.5,
                    "& .MuiFormControlLabel-label": { mt: 0 },
                  }}
                />
              </Box>
            </Stack>
          </SectionCard>

          {/* Signatures - Grid Layout */}
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
            {/* Employee Signature */}
            <SectionCard>
              <SignatureField
                label={t("signature.employee")}
                value={employeeSignature}
                onChange={(signature) => setEmployeeSignature(signature)}
                onClear={() => setEmployeeSignature(undefined)}
                required
              />
            </SectionCard>

            {/* Customer Signature */}
            <SectionCard>
              <SignatureField
                label={t("signature.customer")}
                value={customerSignature}
                onChange={(signature) => setCustomerSignature(signature)}
                onClear={() => setCustomerSignature(undefined)}
              />
            </SectionCard>
          </Box>

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!isFormValid()}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {t("vacation.submit")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              sx={{ py: 1.5 }}
            >
              {isGeneratingPdf
                ? t("vacation.preview.generating")
                : t("vacation.exportPdf")}
            </Button>
          </Stack>

          {!isFormValid() && (
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {t("vacation.fillRequired")}
            </Typography>
          )}
        </Stack>
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
            <Typography variant="h6">{t("vacation.confirmSubmit")}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <SectionCard variant="warning" noPadding>
              <Box sx={{ p: 2 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="warning.main"
                  gutterBottom
                >
                  {t("vacation.importantReminder")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("vacation.confirmMessage")}
                </Typography>
              </Box>
            </SectionCard>

            <Box
              sx={{
                border: "1px solid",
                borderColor: confirmChecked ? "grey.300" : "error.main",
                borderRadius: 1.5,
                px: 1,
                py: 0.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    sx={{ alignSelf: "center", mt: 0, p: 0.75, mr: 0.75 }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}
                  >
                    {t("vacation.confirmUnderstood")}
                  </Typography>
                }
                sx={{
                  alignItems: "center",
                  m: 0,
                  gap: 0.5,
                  "& .MuiFormControlLabel-label": { mt: 0 },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogCancel} disabled={isSubmitting}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={confirmSubmit}
            disabled={!confirmChecked || isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
          >
            {isSubmitting ? t("vacation.submitting") : t("vacation.submitNow")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
