import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  AccessTime as ClockIcon,
  FreeBreakfast as CoffeeIcon,
  DarkMode as MoonIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  RestartAlt as ResetIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { DayData } from "../utils/storage";
import { formatDate, formatHours } from "../utils/formatters";
import { useConfig } from "../contexts/ConfigContext";
import { WorkTimeValidator } from "../core/validation/WorkTimeValidator";
import i18n from "../i18n";
import { isFeatureEnabled } from "../utils/featureFlags";
import type { ShiftModel } from "../types/weekdata.types";

interface DayEditModalHybridProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayData;
  dayName: string;
  dayIndex: number;
  isEditable: boolean;
  isDayLocked?: boolean;
  weekShiftModel?: ShiftModel;
  onTimeChange?: (
    dayIndex: number,
    field: keyof DayData,
    value: string | boolean | null
  ) => void;
  onResetDay?: (dayIndex: number) => void;
}

/**
 * Improved Day Edit Modal with Material-UI
 *
 * UX Improvements:
 * - Larger touch targets (min 48x48px)
 * - Better keyboard support (Tab navigation)
 * - Clearer visual hierarchy
 * - Less scrolling needed
 * - Instant visual feedback
 * - Auto-focus on first field
 * - Material-UI native time inputs
 */
export const DayEditModalHybrid: React.FC<DayEditModalHybridProps> = ({
  isOpen,
  onClose,
  day,
  dayName,
  dayIndex,
  isEditable,
  isDayLocked = false,
  onTimeChange,
  onResetDay,
}) => {
  const { t } = useTranslation();
  const { config } = useConfig();

  // Validator
  const validator = useMemo(
    () => new WorkTimeValidator(config.work),
    [config.work]
  );

  const validationResult = useMemo(() => {
    return validator.validateDay(day, { skipEmptyDays: false });
  }, [validator, day]);

  const effectivelyEditable = isEditable && !isDayLocked;
  const currentLanguage = i18n.language || "de";
  const isWeekend = dayIndex === 5 || dayIndex === 6;
  const simplifiedDayShiftEnabled = isFeatureEnabled(
    config.technical,
    "simple_dayshift_absence_with_job_fields",
    false,
  );
  const useSimplifiedDayShiftMode = simplifiedDayShiftEnabled;

  const handleTimeChange = (
    field: keyof DayData,
    value: string | boolean | null
  ) => {
    if (!onTimeChange) return;

    const textFields: Array<keyof DayData> = [
      "absenceNote",
      "orderNumber",
      "commission",
      "note",
      "nightShiftEndDate",
    ];

    // Boolean oder Absence-Felder direkt durchreichen
    if (
      typeof value === "boolean" ||
      field === "absence" ||
      textFields.includes(field) ||
      value === null
    ) {
      onTimeChange(dayIndex, field, value);
      return;
    }

    // Zeitfelder: Validierung und Weitergabe
    if (value === "" || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      onTimeChange(dayIndex, field, value);
    }
  };

  const handleResetDay = () => {
    if (onResetDay) {
      onResetDay(dayIndex);
    } else if (onTimeChange) {
      onTimeChange(dayIndex, "from", "");
      onTimeChange(dayIndex, "to", "");
      onTimeChange(dayIndex, "pause1From", "");
      onTimeChange(dayIndex, "pause1To", "");
      onTimeChange(dayIndex, "pause2From", "");
      onTimeChange(dayIndex, "pause2To", "");
      onTimeChange(dayIndex, "absence", null);
      onTimeChange(dayIndex, "absenceNote", "");
      onTimeChange(dayIndex, "orderNumber", "");
      onTimeChange(dayIndex, "commission", "");
      onTimeChange(dayIndex, "isNightShift", false);
      onTimeChange(dayIndex, "nightShiftEndDate", "");
      onTimeChange(dayIndex, "note", "");
    }

    setTimeout(() => {
      onClose();
    }, 100);
  };

  const hasTimeData =
    day.from ||
    day.to ||
    day.pause1From ||
    day.pause1To ||
    day.pause2From ||
    day.pause2To;

  const hasAbsence = day.absence !== null && day.absence !== undefined;
  const isAbsenceBlockingTime = hasAbsence && day.absence !== "holiday";

  const absenceOptions = useSimplifiedDayShiftMode
    ? [
        {
          value: "absent",
          label: t("absence.absent") || "Abwesend",
          color: "warning",
        },
      ]
    : [
        { value: "sick", label: t("absence.sick") || "Krank", color: "error" },
        {
          value: "vacation",
          label: t("absence.vacation") || "Urlaub",
          color: "info",
        },
        {
          value: "flextime",
          label: t("absence.flextime") || "Gleitzeit",
          color: "secondary",
        },
        {
          value: "holiday",
          label: t("absence.holiday") || "Feiertag",
          color: "success",
        },
        {
          value: "unpaid",
          label: t("absence.unpaid") || "Unbezahlt",
          color: "default",
        },
      ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      {/* Dialog Title */}
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              {dayName}
            </Typography>
            {isDayLocked && (
              <Tooltip
                title={
                  t("day.lockedInOtherSheetTooltip") ||
                  "Dieser Tag wurde bereits in einem anderen Stundenzettel verwendet"
                }
              >
                <Chip
                  icon={<LockIcon fontSize="small" />}
                  label={t("day.lockedInOtherSheet") || "Gesperrt"}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {day.isNightShift && (
              <Chip
                icon={<MoonIcon fontSize="small" />}
                label={t("day.nightShift") || "Nachtschicht"}
                size="small"
                color="secondary"
              />
            )}
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Date and Hours Summary */}
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {formatDate(day.date, currentLanguage)}
              </Typography>
              {isWeekend && (
                <Chip
                  label="Wochenende"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            {hasTimeData && (
              <Chip
                icon={<ClockIcon />}
                label={formatHours(day.hours, day.decimal, currentLanguage)}
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            )}
          </Box>

          {/* Validation Errors & Warnings */}
          {validationResult.hasErrors() && (
            <Alert severity="error" icon={<WarningIcon />}>
              <Stack spacing={0.5}>
                {validationResult.errors.map((error, idx) => (
                  <Typography key={idx} variant="body2">
                    {error.message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}
          {validationResult.hasWarnings() && !validationResult.hasErrors() && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Stack spacing={0.5}>
                {validationResult.warnings.map((warning, idx) => (
                  <Typography key={idx} variant="body2">
                    {warning.message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          {/* Absence Selection - Optimized for small screens */}
          {effectivelyEditable && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                {t("day.absence") || "Abwesenheit"}
              </Typography>
              <ToggleButtonGroup
                value={day.absence || ""}
                exclusive
                onChange={(_, value) => {
                  if (value === day.absence) {
                    handleTimeChange("absence", null);
                  } else if (value !== null) {
                    handleTimeChange("absence", value);
                  }
                }}
                fullWidth
                sx={{
                  display: "grid",
                  gridTemplateColumns: useSimplifiedDayShiftMode
                    ? "1fr"
                    : "repeat(2, 1fr)",
                  gap: 0.75,
                  "& .MuiToggleButton-root": {
                    py: 1,
                    px: 0.5,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    border: "1.5px solid",
                    borderRadius: 1.5,
                  },
                }}
              >
                {absenceOptions.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    color={option.color as any}
                    sx={{
                      "&.Mui-selected": {
                        fontWeight: 700,
                      },
                    }}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          {effectivelyEditable && useSimplifiedDayShiftMode && (
            <>
              <Divider />
              <Stack spacing={2}>
                <TextField
                  label={t("day.orderNumberOptional") || "Auftragsnummer (optional)"}
                  value={day.orderNumber || ""}
                  onChange={(e) =>
                    handleTimeChange("orderNumber", e.target.value)
                  }
                  disabled={!effectivelyEditable}
                  fullWidth
                />
                <TextField
                  label={t("day.commissionOptional") || "Kommission (optional)"}
                  value={day.commission || ""}
                  onChange={(e) =>
                    handleTimeChange("commission", e.target.value)
                  }
                  disabled={!effectivelyEditable}
                  fullWidth
                />
              </Stack>
            </>
          )}

          {/* Time Inputs */}
          {!isAbsenceBlockingTime && (
            <>
              <Divider />

              {/* Working Hours */}
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <ClockIcon color="primary" />
                  <Typography variant="body2" fontWeight={600}>
                    {t("day.workingHours") || "Arbeitszeiten"}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t("day.from") || "Von"}
                    type="time"
                    value={day.from || ""}
                    onChange={(e) => handleTimeChange("from", e.target.value)}
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900, // 15 min steps
                    }}
                  />
                  <TextField
                    label={t("day.to") || "Bis"}
                    type="time"
                    value={day.to || ""}
                    onChange={(e) => handleTimeChange("to", e.target.value)}
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900,
                    }}
                  />
                </Stack>
              </Box>

              {/* Break 1 */}
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <CoffeeIcon color="action" />
                  <Typography variant="body2" fontWeight={600}>
                    {t("day.break") || "Pause"} 1
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t("day.from") || "Von"}
                    type="time"
                    value={day.pause1From || ""}
                    onChange={(e) =>
                      handleTimeChange("pause1From", e.target.value)
                    }
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900,
                    }}
                  />
                  <TextField
                    label={t("day.to") || "Bis"}
                    type="time"
                    value={day.pause1To || ""}
                    onChange={(e) =>
                      handleTimeChange("pause1To", e.target.value)
                    }
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900,
                    }}
                  />
                </Stack>
              </Box>

              {/* Break 2 */}
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <CoffeeIcon color="action" />
                  <Typography variant="body2" fontWeight={600}>
                    {t("day.break") || "Pause"} 2
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t("day.from") || "Von"}
                    type="time"
                    value={day.pause2From || ""}
                    onChange={(e) =>
                      handleTimeChange("pause2From", e.target.value)
                    }
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900,
                    }}
                  />
                  <TextField
                    label={t("day.to") || "Bis"}
                    type="time"
                    value={day.pause2To || ""}
                    onChange={(e) =>
                      handleTimeChange("pause2To", e.target.value)
                    }
                    disabled={!effectivelyEditable}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      step: 900,
                    }}
                  />
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      {/* Dialog Actions - Optimized for small screens */}
      <DialogActions sx={{ p: 2, flexDirection: "column", gap: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%" }}>
          <Button onClick={onClose} variant="outlined" size="small" fullWidth>
            {t("common.cancel") || "Abbrechen"}
          </Button>
          <Button
            onClick={onClose}
            variant="contained"
            startIcon={<CheckIcon />}
            size="small"
            fullWidth
          >
            {t("common.save") || "Speichern"}
          </Button>
        </Stack>
        {effectivelyEditable && (
          <Button
            onClick={handleResetDay}
            color="error"
            variant="outlined"
            startIcon={<ResetIcon />}
            size="small"
            fullWidth
          >
            {t("day.resetDay") || "Zurücksetzen"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
