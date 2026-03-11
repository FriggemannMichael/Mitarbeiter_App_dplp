import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  noPadding?: boolean;
  variant?: "default" | "info" | "warning" | "success";
}

/**
 * Reusable Section Card Component
 * Combines MaterialDemo's SectionCard pattern with consistent styling
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  noPadding = false,
  variant = "default",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "info":
        return {
          bgcolor: "rgba(59, 130, 246, 0.05)",
          border: "1px solid rgba(59, 130, 246, 0.24)",
        };
      case "warning":
        return {
          bgcolor: "rgba(245, 158, 11, 0.05)",
          border: "1px solid rgba(245, 158, 11, 0.24)",
        };
      case "success":
        return {
          bgcolor: "rgba(16, 185, 129, 0.05)",
          border: "1px solid rgba(16, 185, 129, 0.24)",
        };
      default:
        return {
          border: "1px solid var(--app-surface-border)",
          bgcolor: "var(--app-surface-bg)",
        };
    }
  };

  return (
    <Paper
      elevation={0}
      className="app-surface-card"
      sx={{
        borderRadius: "var(--app-surface-radius)",
        p: noPadding ? 0 : 3,
        ...getVariantStyles(),
      }}
    >
      <Stack spacing={2}>
        {title && (
          <div>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </div>
        )}
        {children}
      </Stack>
    </Paper>
  );
};
