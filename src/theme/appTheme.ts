import { createTheme } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

export const createAppTheme = (mode: AppThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? "#60a5fa" : "#2563eb",
        light: mode === "dark" ? "#93c5fd" : "#3b82f6",
        dark: mode === "dark" ? "#3b82f6" : "#1d4ed8",
      },
      background: {
        default: mode === "dark" ? "#0f172a" : "#f8fafc",
        paper: mode === "dark" ? "#111827" : "#ffffff",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
      h6: {
        fontWeight: 700,
        letterSpacing: "-0.01em",
      },
      body2: {
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 600,
        textTransform: "none",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            minHeight: 44,
            boxShadow: "none",
          },
          contained: {
            boxShadow:
              mode === "dark"
                ? "0 8px 20px rgba(59, 130, 246, 0.24)"
                : "0 8px 20px rgba(37, 99, 235, 0.18)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: mode === "dark" ? "#111827" : "#ffffff",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 16,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border:
              mode === "dark"
                ? "1px solid rgba(148, 163, 184, 0.28)"
                : "1px solid rgba(148, 163, 184, 0.25)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
          },
        },
      },
    },
  });

