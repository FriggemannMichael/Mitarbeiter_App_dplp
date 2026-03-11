import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Moon, RotateCcw, X, Sun, ChevronRight } from "lucide-react";
import { ShiftModel } from "../utils/storage";
import { TimeInput } from "./TimeInput";

interface ShiftTimeConfig {
  from: string;
  to: string;
  pause1From: string;
  pause1To: string;
  pause2From: string;
  pause2To: string;
}

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftType: ShiftModel | null;
  onApply: (
    shiftType: ShiftModel,
    config: ShiftTimeConfig,
    selectedDays?: number[]
  ) => void;
}

export const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  shiftType: _shiftType, // Kept for compatibility but not used
  onApply,
}) => {
  const { t } = useTranslation();
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftModel | null>(
    null
  );
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<ShiftTimeConfig>({
    from: "",
    to: "",
    pause1From: "",
    pause1To: "",
    pause2From: "",
    pause2To: "",
  });

  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedShiftType(null);
      setShowConfig(false);
      setConfig({
        from: "",
        to: "",
        pause1From: "",
        pause1To: "",
        pause2From: "",
        pause2To: "",
      });
      setSelectedDays([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Schichtmodell-Optionen
  const shiftOptions = [
    {
      type: "day" as ShiftModel,
      icon: Clock,
      label: t("day.dayShift"),
      color: "bg-blue-500",
      description:
        t("day.shiftConfig.dayDescription") || "Standard Arbeitszeit",
    },
    {
      type: "late" as ShiftModel,
      icon: Sun,
      label: t("day.lateShift"),
      color: "bg-orange-500",
      description: t("day.shiftConfig.lateDescription") || "Nachmittag/Abend",
    },
    {
      type: "night" as ShiftModel,
      icon: Moon,
      label: t("day.nightShift"),
      color: "bg-indigo-500",
      description: t("day.shiftConfig.nightDescription") || "Nachtarbeit",
    },
    {
      type: "continuous" as ShiftModel,
      icon: RotateCcw,
      label: t("day.continuousShift"),
      color: "bg-purple-500",
      description: t("day.shiftConfig.continuousDescription") || "Durchgehend",
    },
  ];

  // Wenn keine Schicht ausgewählt, zeige Auswahl
  if (!showConfig || !selectedShiftType) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              {t("day.shiftModelSelect") || "Schichtmodell auswählen"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Schicht-Auswahl */}
          <div className="p-4 space-y-3">
            {shiftOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => {
                    setSelectedShiftType(option.type);
                    setShowConfig(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-lg ${option.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      {option.description}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Ab hier ist die Config-Ansicht (bereits vorhanden)

  const dayNames = [
    t("days.monday"),
    t("days.tuesday"),
    t("days.wednesday"),
    t("days.thursday"),
    t("days.friday"),
    t("days.saturday"),
    t("days.sunday"),
  ];

  const getShiftTitle = () => {
    switch (selectedShiftType) {
      case "day":
        return t("day.shiftConfig.dayTitle");
      case "late":
        return t("day.shiftConfig.lateTitle");
      case "night":
        return t("day.shiftConfig.nightTitle");
      case "continuous":
        return t("day.shiftConfig.continuousTitle");
      default:
        return t("day.shiftConfig.title");
    }
  };

  const getShiftIcon = () => {
    switch (selectedShiftType) {
      case "day":
        return <Clock className="w-5 h-5" />;
      case "late":
        return <Sun className="w-5 h-5" />;
      case "night":
        return <Moon className="w-5 h-5" />;
      case "continuous":
        return <RotateCcw className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getDefaultDays = () => {
    switch (selectedShiftType) {
      case "day":
        return [0, 1, 2, 3, 4]; // Mo-Fr (Montag-basiert)
      case "late":
        return [0, 1, 2, 3, 4]; // Mo-Fr (Montag-basiert)
      case "night":
        // WICHTIG: Bei Nachtschicht wird die Woche zu Sonntag-Start reorganisiert
        // Daher: Index 0=Sonntag, 1=Montag, 2=Dienstag, 3=Mittwoch, 4=Donnerstag
        return [0, 1, 2, 3, 4]; // So-Do (Sonntag-basiert nach Reorganisation)
      case "continuous":
        return [0, 1, 2, 3, 4, 5, 6]; // Alle Tage
      default:
        return [];
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleApply = () => {
    if (!selectedShiftType) return;
    const daysToApply =
      selectedShiftType === "continuous" ? selectedDays : getDefaultDays();
    onApply(selectedShiftType, config, daysToApply);
    onClose();
  };

  const isTimeValid = config.from && config.to;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
              {getShiftIcon()}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {getShiftTitle()}
            </h2>
          </div>
          <button onClick={onClose} className="icon-btn hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Arbeitszeiten */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              {t("day.shiftConfig.workTimes")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  {t("day.shiftConfig.workStart")}
                </label>
                <TimeInput
                  value={config.from}
                  onChange={(value) =>
                    setConfig((prev) => ({ ...prev, from: value }))
                  }
                  placeholder="08:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  {t("day.shiftConfig.workEnd")}
                </label>
                <TimeInput
                  value={config.to}
                  onChange={(value) =>
                    setConfig((prev) => ({ ...prev, to: value }))
                  }
                  placeholder="17:00"
                />
              </div>
            </div>
          </div>

          {/* Pausenzeiten */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              {t("day.shiftConfig.breakTimes")}
            </h3>

            {/* Pause 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                {t("day.shiftConfig.break1")}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 text-center">
                    {t("day.from")}
                  </label>
                  <TimeInput
                    value={config.pause1From}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, pause1From: value }))
                    }
                    placeholder="10:00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 text-center">
                    {t("day.to")}
                  </label>
                  <TimeInput
                    value={config.pause1To}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, pause1To: value }))
                    }
                    placeholder="10:15"
                  />
                </div>
              </div>
            </div>

            {/* Pause 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                {t("day.shiftConfig.break2")}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 text-center">
                    {t("day.from")}
                  </label>
                  <TimeInput
                    value={config.pause2From}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, pause2From: value }))
                    }
                    placeholder="14:00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 text-center">
                    {t("day.to")}
                  </label>
                  <TimeInput
                    value={config.pause2To}
                    onChange={(value) =>
                      setConfig((prev) => ({ ...prev, pause2To: value }))
                    }
                    placeholder="14:15"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tageauswahl für Vollkontinuierlich */}
          {selectedShiftType === "continuous" && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                {t("day.shiftConfig.selectDays")}
              </h3>
              <div className="space-y-2">
                {dayNames.map((dayName, index) => (
                  <label key={index} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(index)}
                      onChange={() => handleDayToggle(index)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{dayName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Info für Standard-Schichten */}
          {selectedShiftType !== "continuous" && selectedShiftType !== null && (
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-700">
                {selectedShiftType === "day"
                  ? t("day.shiftConfig.dayInfo")
                  : selectedShiftType === "late"
                  ? t("day.shiftConfig.lateInfo")
                  : t("day.shiftConfig.nightInfo")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 sticky bottom-0">
          <button onClick={onClose} className="btn-secondary text-sm">
            {t("day.shiftConfig.cancel")}
          </button>
          <button
            onClick={handleApply}
            disabled={
              !isTimeValid ||
              (selectedShiftType === "continuous" && selectedDays.length === 0)
            }
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {t("day.shiftConfig.applyToWeek")}
          </button>
        </div>
      </div>
    </div>
  );
};
