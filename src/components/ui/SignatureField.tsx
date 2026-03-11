import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Create as CreateIcon } from "@mui/icons-material";
import SignatureCanvas from "react-signature-canvas";

interface SignatureFieldProps {
  label: string;
  value?: string;
  onChange: (signature: string, name?: string) => void;
  onClear: () => void;
  disabled?: boolean;
  required?: boolean;
  requireName?: boolean;
  nameValue?: string;
  namePlaceholder?: string;
}

/**
 * Enhanced Signature Field Component
 * - Uses MUI components for UI
 * - Keeps canvas signature functionality (legal requirement!)
 * - Modal dialog pattern
 * - Responsive design
 */
export const SignatureField: React.FC<SignatureFieldProps> = ({
  label,
  value,
  onChange,
  onClear,
  disabled = false,
  required = false,
  requireName = false,
  nameValue = "",
  namePlaceholder = "",
}) => {
  const { t } = useTranslation();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [open, setOpen] = useState(false);
  const [tempName, setTempName] = useState(nameValue);

  useEffect(() => {
    setTempName(nameValue);
  }, [nameValue]);

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
      setTempName(nameValue);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    if (!signatureRef.current) return;

    if (signatureRef.current.isEmpty()) {
      return;
    }

    if (requireName && !tempName.trim()) {
      return;
    }

    const dataUrl = signatureRef.current.toDataURL("image/png");
    onChange(dataUrl, requireName ? tempName.trim() : undefined);
    setOpen(false);
  };

  const handleClearCanvas = () => {
    signatureRef.current?.clear();
  };

  const handleDelete = () => {
    onClear();
    setTempName("");
  };

  return (
    <>
      {/* Signature Display/Button */}
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          {label}
          {required && <span style={{ color: "error.main" }}> *</span>}
        </Typography>

        {value ? (
          <Box>
            {/* Display Name if provided */}
            {requireName && nameValue && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {nameValue}
              </Typography>
            )}

            {/* Signature Image */}
            <Box
              sx={{
                border: "2px solid",
                borderColor: "grey.300",
                borderRadius: 3,
                p: 2,
                bgcolor: "grey.50",
                mb: 1,
              }}
            >
              <img
                src={value}
                alt={label}
                style={{
                  width: "100%",
                  height: 96,
                  objectFit: "contain",
                }}
              />
            </Box>

            {/* Action Buttons */}
            {!disabled && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleOpen}
                  fullWidth
                  sx={{ minWidth: 0 }}
                >
                  {t("common.edit") || "Ändern"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  fullWidth
                  sx={{ minWidth: 0 }}
                >
                  {t("common.delete") || "Löschen"}
                </Button>
              </Stack>
            )}
          </Box>
        ) : (
          <Box
            onClick={handleOpen}
            sx={{
              border: "2px dashed",
              borderColor: disabled ? "grey.300" : "primary.main",
              borderRadius: 3,
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 96,
              cursor: disabled ? "not-allowed" : "pointer",
              bgcolor: disabled ? "grey.50" : "transparent",
              transition: "all 0.2s",
              "&:hover": disabled
                ? {}
                : {
                    bgcolor: "rgba(59, 130, 246, 0.04)",
                    borderColor: "primary.dark",
                  },
            }}
          >
            <CreateIcon sx={{ fontSize: 32, color: disabled ? "grey.300" : "primary.main", mb: 1 }} />
            <Typography
              variant="body2"
              color={disabled ? "text.disabled" : "primary"}
              fontWeight={600}
            >
              {disabled
                ? t("signature.disabled") || "Nicht verfügbar"
                : t("signature.sign") || "Hier unterschreiben"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Signature Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Name Input (if required) */}
            {requireName && (
              <TextField
                label={t("signature.supervisorName") || "Name"}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder={namePlaceholder}
                required
                fullWidth
                helperText={t("signature.supervisorNameHelp") || "Bitte geben Sie den Namen ein"}
              />
            )}

            {/* Canvas */}
            <Box
              sx={{
                border: "2px solid",
                borderColor: "grey.300",
                borderRadius: 2,
                bgcolor: "background.paper",
                overflow: "hidden",
              }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-40 touch-none",
                  style: { width: "100%", height: 160 },
                }}
                backgroundColor="#ffffff"
              />
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              {t("signature.drawHint") || "Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Finger"}
            </Typography>
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
          <Button onClick={handleClose}>{t("common.cancel") || "Abbrechen"}</Button>
          <Button onClick={handleClearCanvas} variant="outlined">
            {t("common.clear") || "Löschen"}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={requireName && !tempName.trim()}
          >
            {t("common.save") || "Speichern"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
