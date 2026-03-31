import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Stack,
  TextField,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  AccessTime as ClockIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { SectionCard } from "../components/ui/SectionCard";
import { SignatureField } from "../components/ui/SignatureField";
import { PageHeader } from "../components/PageHeader";
import { useWeekData } from "../contexts/WeekDataContext";
import { useAutoLogout } from "../hooks/useAutoLogout";
import { useMonthEndReminder } from "../hooks/useMonthEndReminder";
import { useConfig } from "../contexts/ConfigContext";
import { useNotification } from "../contexts/NotificationContext";
import { useTimesheetActions } from "../contexts/TimesheetActionsContext";
import { appConfig } from "../config/appConfig";
import { DayCardHybrid } from "../components/DayCardHybrid";
import { ShiftConfigModal } from "../components/ShiftConfigModal";
import { BackupRestore } from "../components/BackupRestore";
import { BackupReminder } from "../components/BackupReminder";
import { ShareModal } from "../components/ShareModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PdfExporter } from "../utils/pdfExporter";
import { storage } from "../utils/storage";

interface TimesheetHybridProps {
  employeeName: string;
  onLogout: () => void;
  initialWeek?: { year: number; week: number; sheetId?: number } | null;
}

export const TimesheetHybrid: React.FC<TimesheetHybridProps> = ({
  employeeName,
  onLogout,
  initialWeek,
}) => {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { success, error: showError, warning } = useNotification();
  const { registerCreateNewSheet, unregisterCreateNewSheet } =
    useTimesheetActions();
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showNewSheetConfirm, setShowNewSheetConfirm] = useState(false);
  const [shareFileUrl, setShareFileUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | undefined>(undefined);
  const [showMonthEndReminder, setShowMonthEndReminder] = useState(false);
  const [unsignedWeeks, setUnsignedWeeks] = useState<
    Array<{ year: number; week: number }>
  >([]);

  const [isSendingReview, setIsSendingReview] = useState(false);
  const reviewCcEmail = config.technical.pdf_review_cc_email?.trim() || "";

  const {
    currentWeek,
    currentWeek: weekData,
    isLoading: loading,
    isEditable,
    canSupervisorSign,
    isDayEditable,
    isDayInDifferentMonth,
    updateDay: updateDayTime,
    resetDay,
    applyShiftConfigToWeek,
    updateCustomer,
    updateCustomerEmail,
    addSignature,
    clearSignature,
    sendForReview,
    previousWeek,
    nextWeek,
    loadWeek: setWeek,
    getDateRange,
    getWeekStats,
    // --- NEU: Multi-Sheet Funktionen aus dem Context holen ---
    allSheets,
    switchToSheet,
    createNewSheet,
  } = useWeekData();

  // Berechne totalHours aus weekStats
  const weekStats = getWeekStats();
  const totalHours = {
    hours: weekStats.totalHours,
    decimal: weekStats.totalDecimal,
  };

  // Navigiere zur ausgewählten Woche (wenn vom Dashboard angeklickt)
  useEffect(() => {
    if (initialWeek) {
      setWeek(initialWeek.year, initialWeek.week, initialWeek.sheetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWeek]);

  // Auto-Logout nach Inaktivität
  useAutoLogout({
    onLogout,
    enabled: true,
    timeoutMinutes: appConfig.security.autoLogoutMinutes,
  });

  // Monatsende-Erinnerung für unsignierte Stundenzettel
  useMonthEndReminder({
    enabled: true,
    daysBeforeMonthEnd: 3,
    onMonthEndDetected: (weeks) => {
      setUnsignedWeeks(weeks);
      setShowMonthEndReminder(true);
      warning(t("timesheet.monthEndWarning", { count: weeks.length }));
    },
  });

  // First Use Date setzen
  useEffect(() => {
    storage.setFirstUseDate();
  }, []);

  // Register createNewSheet function in TimesheetActionsContext
  useEffect(() => {
    registerCreateNewSheet(createNewSheet);
    return () => {
      unregisterCreateNewSheet();
    };
  }, [createNewSheet, registerCreateNewSheet, unregisterCreateNewSheet]);

  // Event-Listener für Backup-Erinnerung
  useEffect(() => {
    const handleOpenBackupModal = () => {
      setShowBackupRestore(true);
    };

    window.addEventListener("open-backup-modal", handleOpenBackupModal);

    return () => {
      window.removeEventListener("open-backup-modal", handleOpenBackupModal);
    };
  }, []);

  // Tag-Namen für die Übersetzung (Kurzform)
  const dayNames =
    weekData?.shiftModel === "night"
      ? [
          t("days.short.sunday"),
          t("days.short.monday"),
          t("days.short.tuesday"),
          t("days.short.wednesday"),
          t("days.short.thursday"),
          t("days.short.friday"),
          t("days.short.saturday"),
        ]
      : [
          t("days.short.monday"),
          t("days.short.tuesday"),
          t("days.short.wednesday"),
          t("days.short.thursday"),
          t("days.short.friday"),
          t("days.short.saturday"),
          t("days.short.sunday"),
        ];

  // PDF-Export - Daten bleiben erhalten!
  const handlePDFExport = async () => {
    if (!weekData) return;

    try {
      const exportWeekData = {
        ...weekData,
        employeeName:
          weekData.employeeName?.trim() ||
          employeeName?.trim() ||
          storage.getEmployeeName() ||
          "Mitarbeiter",
      };

      await PdfExporter.exportWeekAsPDF(exportWeekData, config);
      success(t("actions.pdfExportSuccess"));
    } catch (error) {
      showError(t("errors.pdfExport") + (error as Error).message);
    }
  };

  // Direkter Versand zur Prüfung (kein zusätzliches Modal)
  const handleSend = () => {
    if (!weekData?.employeeSignature) return;
    handleSendForReview();
  };

  // Stundenzettel per E-Mail zur externen Prüfung senden
  const handleSendForReview = async () => {
    if (!weekData) return;
    const recipientEmail = weekData.customerEmail?.trim() || "";
    if (!recipientEmail) {
      warning(
        t("timesheet.customerEmailHelp") ||
          "Bitte Kunden-E-Mail erfassen, um zur Prüfung zu senden."
      );
      return;
    }
    setIsSendingReview(true);

    try {
      const exportWeekData = {
        ...weekData,
        employeeName:
          weekData.employeeName?.trim() ||
          employeeName?.trim() ||
          storage.getEmployeeName() ||
          "Mitarbeiter",
      };

      const pdfBytes = await PdfExporter.generatePDF(exportWeekData, config);
      const filename = `Stundennachweis_KW${exportWeekData.week}_${exportWeekData.year}.pdf`;

      const toBase64 = (bytes: Uint8Array) => {
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };
      const base64String = toBase64(new Uint8Array(pdfBytes));

      const dateRange = getDateRange();

      const payload = {
        pdf_base64: base64String,
        recipient_email: recipientEmail,
        cc_email: reviewCcEmail || undefined,
        document_type: "timesheet",
        employee_name: exportWeekData.employeeName,
        filename: filename,
        week_number: exportWeekData.week.toString(),
        week_year: exportWeekData.year.toString(),
        date_range: dateRange,
        total_hours: weekStats.totalHours,
        has_supervisor_signature: Boolean(exportWeekData.supervisorSignature),
        is_customer_recipient: true,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.technical.pdf_api_key) {
        headers["X-Api-Key"] = config.technical.pdf_api_key;
      }

      const resp = await fetch(
        `${config.technical.api_endpoint}/api/send-pdf`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      if (!resp.ok) {
        throw new Error(`HTTP Error: ${resp.status} ${resp.statusText}`);
      }

      const responseText = await resp.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error("Ungültige Server-Antwort (kein JSON)");
      }

      if (!result.success) {
        throw new Error(result.error || t("errors.shareError"));
      }

      // Erst nach erfolgreichem Versand: Status setzen und sperren (nur wenn noch nicht vollständig abgenommen)
      if (weekData.status !== "FOREMAN_SIGNED_FULL") {
        sendForReview(recipientEmail);
      }
      success(t("share.sent_success"));
    } catch (error) {
      showError(`${t("errors.shareError")}: ${(error as Error).message}`);
    } finally {
      setIsSendingReview(false);
    }
  };

  // Share-Funktion
  const handleShare = async () => {
    if (!weekData || !weekData.employeeSignature) return;

    try {
      const exportWeekData = {
        ...weekData,
        employeeName:
          weekData.employeeName?.trim() ||
          employeeName?.trim() ||
          storage.getEmployeeName() ||
          "Mitarbeiter",
      };

      const pdfBytes = await PdfExporter.generatePDF(exportWeekData, config);

      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const fileUrl = URL.createObjectURL(blob);

      setShareFileUrl(fileUrl);
      setPdfBlob(blob);
      setShowShareModal(true);
    } catch (error) {
      showError(t("errors.pdfExport"));
      handlePDFExport();
    }
  };

  const handleShareComplete = () => {
    setShowShareModal(false);
    success(t("actions.shareSuccess"));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <LinearProgress sx={{ width: 200, mb: 2 }} />
        <Typography color="text.secondary">
          {t("status.loadingWeek")}
        </Typography>
      </Box>
    );
  }

  if (!weekData) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 4,
        }}
      >
        <Typography color="error" sx={{ mb: 2 }}>
          {t("status.errorLoadingWeek")}
        </Typography>
        <Button variant="contained" onClick={onLogout}>
          {t("actions.back")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pb: 10 }}>
      {/* Page Header */}
      <PageHeader title={t("timesheet.title")} employeeName={employeeName} />

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Compact Week Navigation Card */}
          <SectionCard>
            <Stack spacing={2}>
              {/* Navigation Controls */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <IconButton onClick={previousWeek} color="primary">
                  <ChevronLeftIcon />
                </IconButton>

                <Box sx={{ textAlign: "center" }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <CalendarIcon color="primary" />
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {t("timesheet.week")} {currentWeek?.week}/
                      {currentWeek?.year}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {getDateRange()}
                  </Typography>
                </Box>

                <IconButton onClick={nextWeek} color="primary">
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            </Stack>
          </SectionCard>

          {/* --- NEU: Sheet Selector (Zettel-Auswahl für Multi-Customer) --- */}
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: "block", ml: 1 }}
            >
              {t("timesheet.sheets")} ({allSheets.length}):
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{ overflowX: "auto", pb: 1, px: 0.5 }}
            >
              {/* Liste aller existierenden Zettel */}
              {allSheets.map((sheet) => {
                // Prüfe ob Zettel signiert ist
                const isSigned =
                  sheet.status === "EMPLOYEE_SIGNED" ||
                  sheet.status === "FOREMAN_SIGNED_PARTIAL" ||
                  sheet.status === "FOREMAN_SIGNED_FULL";

                return (
                  <Chip
                    key={sheet.sheetId}
                    label={
                      sheet.customer
                        ? `${sheet.sheetId}: ${sheet.customer.substring(
                            0,
                            15,
                          )}${sheet.customer.length > 15 ? "..." : ""}`
                        : `${t("timesheet.newSheet")} ${sheet.sheetId}`
                    }
                    onClick={() => switchToSheet(sheet.sheetId)}
                    // Aktiven Zettel hervorheben
                    color={
                      currentWeek?.sheetId === sheet.sheetId
                        ? "primary"
                        : isSigned
                          ? "success"
                          : "default"
                    }
                    variant={
                      currentWeek?.sheetId === sheet.sheetId
                        ? "filled"
                        : "outlined"
                    }
                    // Zeige Icon je nach Status
                    icon={
                      sheet.locked ? (
                        <LockIcon fontSize="small" />
                      ) : isSigned ? (
                        <CheckCircleIcon fontSize="small" />
                      ) : undefined
                    }
                    sx={{
                      fontWeight:
                        currentWeek?.sheetId === sheet.sheetId ? 700 : 400,
                      cursor: "pointer",
                      minWidth: 100,
                      justifyContent: "flex-start",
                      // Warnung für unsignierte Zettel
                      ...(!isSigned &&
                        sheet.sheetId !== currentWeek?.sheetId && {
                          borderColor: "warning.main",
                          color: "warning.main",
                        }),
                    }}
                  />
                );
              })}

              {/* Button für "Neues Blatt" */}
              <Chip
                icon={<AddIcon />}
                label={t("timesheet.newSheet")}
                onClick={() => setShowNewSheetConfirm(true)}
                color="secondary"
                variant="outlined"
                sx={{ cursor: "pointer", borderStyle: "dashed", minWidth: 110 }}
              />
            </Stack>
          </Box>
          {/* --- ENDE: Sheet Selector --- */}

          {/* Customer Information */}
          <SectionCard title={t("timesheet.customer")}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BusinessIcon color="primary" />
                <TextField
                  value={weekData.customer}
                  onChange={(e) => updateCustomer(e.target.value)}
                  placeholder={t("timesheet.placeholders.customer")}
                  fullWidth
                  disabled={weekData.locked}
                  required
                  error={!weekData.customer.trim()}
                  helperText={
                    !weekData.customer.trim() ? t("validation.required") : ""
                  }
                />
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon color="primary" />
                <TextField
                  type="email"
                  label={t("timesheet.customerEmail")}
                  value={weekData.customerEmail || ""}
                  onChange={(e) => updateCustomerEmail(e.target.value)}
                  placeholder={t("timesheet.placeholders.customerEmail")}
                  fullWidth
                  disabled={weekData.locked}
                  required
                  error={!weekData.customerEmail?.trim()}
                  helperText={
                    !weekData.customerEmail?.trim() ? t("validation.required") : t("timesheet.customerEmailHelp")
                  }
                />
              </Stack>
            </Stack>
          </SectionCard>

          {/* Shift Model Button */}
          {isEditable && (
            <Button
              variant="outlined"
              onClick={() => setShowShiftModal(true)}
              fullWidth
              sx={{
                py: 2,
                justifyContent: "space-between",
                textAlign: "left",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <ClockIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {t("day.shiftModel")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {weekData.shiftModel
                      ? t(`day.${weekData.shiftModel}Shift`)
                      : t("day.shiftModelSelect")}
                  </Typography>
                </Box>
              </Stack>
              <ChevronRightIcon />
            </Button>
          )}

          {/* Day Cards */}
          <Stack spacing={2}>
            {weekData.days?.map((day, index) => (
              <DayCardHybrid
                key={day.date}
                day={day}
                dayName={dayNames[index]}
                dayIndex={index}
                isEditable={isEditable}
                isDayLocked={!isDayEditable(index)}
                isDayInDifferentMonth={isDayInDifferentMonth(index)}
                onTimeChange={updateDayTime}
                onResetDay={resetDay}
              />
            )) || []}
          </Stack>

          {/* Total Hours */}
          <SectionCard>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <ClockIcon color="primary" />
                <Typography variant="body1" fontWeight={600}>
                  {t("timesheet.total")}
                </Typography>
              </Stack>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {totalHours.hours}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {totalHours.decimal}h
                </Typography>
              </Box>
            </Stack>
          </SectionCard>

          {/* Signatures */}
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
                value={weekData.employeeSignature}
                onChange={(signature) => {
                  if (!weekData.customerEmail?.trim()) {
                    warning(
                      t("timesheet.customerEmailHelp") ||
                        "Bitte zuerst die Kunden-E-Mail erfassen."
                    );
                    return;
                  }
                  addSignature("employee", signature, undefined);
                }}
                onClear={() => clearSignature("employee")}
                disabled={weekData.locked || !weekData.customerEmail?.trim()}
                required
              />
            </SectionCard>

            {/* Supervisor Signature */}
            <SectionCard>
              <SignatureField
                label={t("signature.supervisor")}
                value={weekData.supervisorSignature}
                onChange={(signature, name) => {
                  addSignature("supervisor", signature, name);
                }}
                onClear={() => clearSignature("supervisor")}
                disabled={!canSupervisorSign || weekData.locked}
                required
                requireName
                nameValue={weekData.supervisorName}
                namePlaceholder={t("signature.supervisorNamePlaceholder")}
              />
            </SectionCard>
          </Box>

          {/* Export Instructions */}
          <SectionCard variant="info">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {t("export.instructions.title")}
            </Typography>
            <Stack component="ol" spacing={0.5} sx={{ pl: 2, m: 0 }}>
              <Typography
                component="li"
                variant="caption"
                color="text.secondary"
              >
                {t("export.instructions.step1")}
              </Typography>
              <Typography
                component="li"
                variant="caption"
                color="text.secondary"
              >
                {t("export.instructions.step2")}
              </Typography>
              <Typography
                component="li"
                variant="caption"
                color="text.secondary"
              >
                {t("export.instructions.step3")}
              </Typography>
            </Stack>
          </SectionCard>

          {/* Action Buttons */}
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handlePDFExport}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {t("export.pdf")}
              </Button>

              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                disabled={
                  config.work.enable_signature_requirement &&
                  (!weekData.employeeSignature || !weekData.supervisorSignature)
                }
                fullWidth
                sx={{ py: 1.5 }}
              >
                {t("export.share")}
              </Button>
            </Stack>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<EmailIcon />}
              onClick={handleSend}
              disabled={
                isSendingReview ||
                !weekData.employeeSignature ||
                !weekData.customerEmail?.trim() ||
                weekData.status === "PENDING_REVIEW"
              }
              fullWidth
              sx={{ py: 1.5 }}
            >
              {t("export.send")}
            </Button>
          </Stack>

          {/* Locked Warning */}
          {weekData.locked && weekData.status !== "PENDING_REVIEW" && (
            <SectionCard variant="warning">
              <Typography
                variant="body2"
                color="warning.main"
                textAlign="center"
              >
                {t("status.weekLocked")}
              </Typography>
            </SectionCard>
          )}

          {/* PENDING_REVIEW Status-Hinweis */}
          {weekData.status === "PENDING_REVIEW" && (
            <SectionCard variant="warning">
              <Stack direction="row" spacing={2} alignItems="center">
                <ScheduleIcon color="warning" />
                <Box>
                  <Typography variant="body2" fontWeight={600} color="warning.main">
                    {t("workflow.pendingReviewStatus")}
                  </Typography>
                  {weekData.reviewSentAt && weekData.reviewRecipientEmail && (
                    <Typography variant="caption" color="text.secondary">
                      {t("workflow.pendingReviewSentAt", {
                        date: new Date(weekData.reviewSentAt).toLocaleString("de-DE"),
                        email: weekData.reviewRecipientEmail,
                      })}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </SectionCard>
          )}

          {/* Footer Info */}
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {t("footer.dataLocal")}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {t("footer.privacy")}
            </Typography>
            <Button
              size="small"
              onClick={() => setShowBackupRestore(true)}
              sx={{ mt: 1 }}
            >
              {t("backup.title")}
            </Button>
          </Box>
        </Stack>
      </Container>

      {/* Backup & Restore Modal */}
      <BackupRestore
        isOpen={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
      />

      {/* Share Modal */}
      {weekData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            if (shareFileUrl) {
              URL.revokeObjectURL(shareFileUrl);
              setShareFileUrl("");
            }
            setPdfBlob(undefined);
          }}
          fileName={`Stundennachweis_KW${weekData.week}_${weekData.year}.pdf`}
          fileUrl={shareFileUrl}
          employeeName={employeeName}
          weekYear={weekData.year}
          weekNumber={weekData.week}
          customerEmail={weekData.customerEmail}
          pdfBlob={pdfBlob}
          onShareComplete={handleShareComplete}
          weekData={weekData}
        />
      )}

      {/* Shift Config Modal */}
      <ShiftConfigModal
        isOpen={showShiftModal}
        shiftType={weekData.shiftModel || null}
        onClose={() => setShowShiftModal(false)}
        onApply={(model, config) => {
          applyShiftConfigToWeek(model, config);
          setShowShiftModal(false);
        }}
      />

      {/* New Sheet Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showNewSheetConfirm}
        onClose={() => setShowNewSheetConfirm(false)}
        onConfirm={createNewSheet}
        title={t("timesheet.confirmNewSheetTitle")}
        message={t("timesheet.confirmNewSheet")}
        confirmText={t("common.create")}
        cancelText={t("common.cancel")}
        variant="info"
      />

      {/* Backup Reminder */}
      <BackupReminder />

      {/* Month-End Reminder Dialog */}
      <Dialog
        open={showMonthEndReminder}
        onClose={() => setShowMonthEndReminder(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            mx: 2,
            width: { xs: "calc(100% - 32px)", sm: "100%" },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="flex-start"
            sx={{ minWidth: 0 }}
          >
            <CalendarIcon
              color="warning"
              sx={{ fontSize: 40, flexShrink: 0, mt: 0.25 }}
            />
            <Typography
              variant="h6"
              sx={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {t("timesheet.monthEndReminderTitle")}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography
              variant="body1"
              sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {t("timesheet.monthEndReminderMessage", {
                count: unsignedWeeks.length,
              })}
            </Typography>

            {unsignedWeeks.length > 0 && (
              <SectionCard variant="warning" noPadding>
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.primary"
                    sx={{ mb: 1 }}
                  >
                    {t("timesheet.unsignedWeeks")}:
                  </Typography>
                  <Stack spacing={1}>
                    {unsignedWeeks.map((week) => (
                      <Box
                        key={`${week.year}-${week.week}`}
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1,
                          bgcolor: "background.paper",
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ minWidth: 0, flex: "1 1 160px", overflowWrap: "anywhere" }}
                        >
                          KW {week.week} / {week.year}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{
                            flexShrink: 0,
                            width: { xs: "100%", sm: "auto" },
                          }}
                          onClick={() => {
                            setWeek(week.year, week.week, 1);
                            setShowMonthEndReminder(false);
                          }}
                        >
                          {t("common.open")}
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </SectionCard>
            )}

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {t("timesheet.monthEndReminderHint")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            alignItems: "stretch",
            "& > :not(style) ~ :not(style)": {
              marginLeft: 0,
            },
          }}
        >
          <Button
            sx={{ width: { xs: "100%", sm: "auto" } }}
            onClick={() => setShowMonthEndReminder(false)}
          >
            {t("backupReminder.remindLater")}
          </Button>
          <Button
            variant="contained"
            sx={{ width: { xs: "100%", sm: "auto" } }}
            onClick={() => {
              if (unsignedWeeks.length > 0) {
                setWeek(unsignedWeeks[0].year, unsignedWeeks[0].week, 1);
              }
              setShowMonthEndReminder(false);
            }}
          >
            {t("timesheet.signNow")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
