import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  AccessTime as ClockIcon,
  DarkMode as MoonIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { DayData } from "../utils/storage";
import { formatDate, formatHours } from "../utils/formatters";
import { DayEditModalHybrid } from "./DayEditModalHybrid";
import i18n from "../i18n";

interface DayCardHybridProps {
  day: DayData;
  dayName?: string; // Optional - wird intern berechnet, aber für Kompatibilität behalten
  dayIndex: number;
  isEditable: boolean;
  isDayLocked?: boolean;
  isDayInDifferentMonth?: boolean; // Neu: Zeigt an ob Tag in anderem Monat liegt
  onTimeChange?: (
    dayIndex: number,
    field: keyof DayData,
    value: string | boolean | null
  ) => void;
  onResetDay?: (dayIndex: number) => void;
}

/**
 * Improved Day Card with Material-UI
 *
 * UX Improvements:
 * - Clearer visual hierarchy
 * - Larger touch targets
 * - Better status indicators
 * - Consistent Material Design
 * - Improved accessibility
 */
export const DayCardHybrid: React.FC<DayCardHybridProps> = React.memo(
  ({
    day,
    dayIndex,
    isEditable,
    isDayLocked = false,
    isDayInDifferentMonth = false,
    onTimeChange,
    onResetDay,
  }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const currentLanguage = i18n.language || "de";

    // Berechne den korrekten Wochentag aus dem Datum
    const actualDayName = useMemo(() => {
      const date = new Date(day.date);
      const dayIndex = date.getDay(); // 0=Sonntag, 1=Montag, ..., 6=Samstag

      // Map zu den Translation Keys
      const dayKeys = [
        "days.short.sunday",
        "days.short.monday",
        "days.short.tuesday",
        "days.short.wednesday",
        "days.short.thursday",
        "days.short.friday",
        "days.short.saturday",
      ];

      return t(dayKeys[dayIndex]);
    }, [day.date, t]);


    // Berechne hasTimeData nur wenn day sich ändert
    const hasTimeData = useMemo(
      () =>
        day.from ||
        day.to ||
        day.pause1From ||
        day.pause1To ||
        day.pause2From ||
        day.pause2To,
      [
        day.from,
        day.to,
        day.pause1From,
        day.pause1To,
        day.pause2From,
        day.pause2To,
      ]
    );

    const hasAbsence = useMemo(
      () => day.absence !== null && day.absence !== undefined,
      [day.absence]
    );

    const isWeekend = useMemo(() => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    }, [day.date]);

    // Abwesenheits-Konfiguration
    const absenceConfig: Record<
      string,
      { label: string; color: "error" | "info" | "secondary" | "success" }
    > = useMemo(
      () => ({
        sick: {
          label: t("absence.sick") || "Krank",
          color: "error",
        },
        vacation: {
          label: t("absence.vacation") || "Urlaub",
          color: "info",
        },
        flextime: {
          label: t("absence.flextime") || "Gleitzeit",
          color: "secondary",
        },
        holiday: {
          label: t("absence.holiday") || "Feiertag",
          color: "success",
        },
        unpaid: {
          label: t("absence.unpaid") || "Unbezahlt",
          color: "info",
        },
      }),
      [t]
    );

    const handleOpenModal = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    // Status Icon Component
    const StatusIcon = () => {
      if (hasAbsence && day.absence !== "holiday") {
        return (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 99,
              bgcolor: `${absenceConfig[day.absence!]?.color}.light`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WarningIcon color={absenceConfig[day.absence!]?.color} />
          </Box>
        );
      }

      if (hasTimeData) {
        return (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 99,
              bgcolor: "success.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircleIcon sx={{ color: "white" }} />
          </Box>
        );
      }

      if (day.absence === "holiday") {
        return (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 99,
              bgcolor: "success.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WarningIcon color="success" />
          </Box>
        );
      }

      return (
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: isWeekend ? "warning.light" : "grey.200",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ClockIcon color={isWeekend ? "warning" : "action"} />
        </Box>
      );
    };

    return (
      <>
        <Paper
          elevation={0}
          onClick={handleOpenModal}
          className="app-surface-card"
          sx={{
            p: 2.5,
            cursor: "pointer",
            transition: "background-color 0.2s",
            border: "1px solid var(--app-surface-border)",
            borderRadius: 3,
            opacity: isDayLocked ? 0.6 : 1,
            "&:hover": {
              bgcolor: "rgba(248, 250, 252, 0.9)",
              borderColor: "primary.light",
            },
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Status Icon */}
            <StatusIcon />

            {/* Day Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography variant="h6" fontWeight={700}>
                  {actualDayName}
                </Typography>
                {isDayLocked && !isDayInDifferentMonth && (
                  <Tooltip
                    title={
                      t("day.lockedInOtherSheetTooltip") ||
                      "Stunden wurden schon gebucht"
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
                {isDayInDifferentMonth && (
                  <Tooltip
                    title={
                      t("day.lockedDifferentMonthTooltip") ||
                      "Dieser Tag liegt in einem anderen Monat. Bitte erstellen Sie einen neuen Stundenzettel."
                    }
                  >
                    <Chip
                      icon={<LockIcon fontSize="small" />}
                      label={t("day.lockedDifferentMonth") || "Anderer Monat"}
                      size="small"
                      color="warning"
                      variant="filled"
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
                {isWeekend && (
                  <Chip
                    label="WE"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {formatDate(day.date, currentLanguage)}
              </Typography>
              {hasAbsence && (
                <Chip
                  label={absenceConfig[day.absence!]?.label}
                  size="small"
                  color={absenceConfig[day.absence!]?.color}
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>

            {/* Hours Display */}
            <Box>
              {hasTimeData ? (
                <Chip
                  icon={<ClockIcon />}
                  label={formatHours(day.hours, day.decimal, currentLanguage)}
                  color="primary"
                  sx={{ fontWeight: 700, minWidth: 90 }}
                />
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 90, textAlign: "center" }}
                >
                  --:--
                </Typography>
              )}
            </Box>

            {/* Edit Button */}
            <IconButton size="small" color="primary">
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Paper>

        {/* Edit Modal */}
        <DayEditModalHybrid
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          day={day}
          dayName={actualDayName}
          dayIndex={dayIndex}
          isEditable={isEditable}
          isDayLocked={isDayLocked}
          onTimeChange={onTimeChange}
          onResetDay={onResetDay}
        />
      </>
    );
  }
);

DayCardHybrid.displayName = "DayCardHybrid";
