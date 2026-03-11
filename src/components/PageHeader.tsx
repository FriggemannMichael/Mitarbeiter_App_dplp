import React from "react";
import { useCompanyConfig } from "../contexts/ConfigContext";
import { User } from "lucide-react";
import { motion } from "framer-motion";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface PageHeaderProps {
  title: string;
  employeeName: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: number | string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  employeeName,
  action,
  children,
  maxWidth = 960,
}) => {
  const companyConfig = useCompanyConfig();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const headerLogoSrc =
    companyConfig.company_logo || "";

  const glassStyle = {
    background: isDark ? "rgba(15, 23, 42, 0.82)" : "rgba(248, 250, 252, 0.88)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "none",
    boxShadow: "none",
  };

  const textColor = {
    primary: isDark ? "grey.100" : "grey.900",
    secondary: isDark ? "grey.400" : "grey.600",
  };

  return (
    <Paper
      elevation={0}
      sx={{
        ...glassStyle,
        position: "sticky",
        top: 0,
        zIndex: 40,
        borderRadius: 0,
        borderBottom: "none",
      }}
    >
      <Box
        sx={{
          maxWidth,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.25, sm: 1.5 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            columnGap: 1.25,
          }}
        >
          <Box sx={{ minWidth: 32, display: "flex", alignItems: "center" }}>
            {headerLogoSrc ? (
              <motion.img
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                src={headerLogoSrc}
                alt={companyConfig.company_name || "Logo"}
                style={{
                  height: "clamp(24px, 5vw, 30px)",
                  width: "auto",
                  display: "block",
                  objectFit: "contain",
                  filter: "drop-shadow(0 1px 2px rgba(15, 23, 42, 0.08))",
                }}
              />
            ) : null}
          </Box>

          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.05rem", sm: "1.2rem" },
              color: "text.primary",
              lineHeight: 1.2,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {action}
              <Chip
                icon={<User size={14} />}
                label={employeeName || "Mitarbeiter"}
                sx={{
                  background: isDark
                    ? "rgba(15, 23, 42, 0.92)"
                    : "rgba(248, 250, 252, 0.95)",
                  color: textColor.primary,
                  fontWeight: 600,
                  borderRadius: "10px",
                  border: isDark
                    ? "1px solid rgba(71, 85, 105, 0.72)"
                    : "1px solid rgba(148, 163, 184, 0.24)",
                  maxWidth: { xs: 180, sm: 320 },
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                  "& .MuiChip-icon": {
                    color: textColor.secondary,
                  },
                }}
              />
            </Stack>
          </motion.div>
        </Box>

        {/* Optional: Additional content (like week navigation) */}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 8, display: "flex", justifyContent: "flex-start" }}
          >
            {children}
          </motion.div>
        )}
      </Box>
    </Paper>
  );
};
