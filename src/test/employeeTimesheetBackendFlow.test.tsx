import React from "react";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../contexts/AppProviders";
import { useWeekData } from "../contexts/WeekDataContext";
import { Dashboard } from "../pages/Dashboard";
import { apiService } from "../services/apiService";
import { storage } from "../utils/storage";
import type { WeekData } from "../types/weekdata.types";
import { createMockConfig } from "./helpers/configTestHelpers";

// Plain (non-async) factory avoids circular-loading deadlock
vi.mock("../services/apiService", () => ({
  apiService: {
    listTimesheets: vi.fn(),
    getTimesheet: vi.fn(),
    saveTimesheet: vi.fn(),
    archiveTimesheet: vi.fn(),
    initEmployeeDevice: vi.fn(),
    canUseEmployeeTimesheetSync: vi.fn(() => true),
  },
}));

vi.mock("../utils/storage", async () => {
  const actual = await vi.importActual<typeof import("../utils/storage")>("../utils/storage");
  return {
    ...actual,
    storage: {
      ...actual.storage,
      getTheme: vi.fn(() => "light" as const),
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      clearAllData: vi.fn(),
      getEmployeeName: vi.fn(() => "Max Mustermann"),
      getAllStoredWeeks: vi.fn(() => []),
      getAllWeekKeys: vi.fn(() => []),
      getAllSheetsForWeek: vi.fn(() => []),
      getWeekData: vi.fn(() => null),
      setWeekData: vi.fn(),
      removeWeekData: vi.fn(),
      getNextSheetId: vi.fn(() => 2),
      hasCompletedBackendTimesheetMigration: vi.fn(() => true),
      markBackendTimesheetMigrationComplete: vi.fn(),
    },
    weekUtils: {
      ...actual.weekUtils,
      getCurrentWeek: vi.fn(() => ({ year: 2026, week: 18 })),
    },
  };
});

vi.mock("../contexts/ConfigContext", () => ({
  useConfig: () => ({
    config: createMockConfig(),
    isLoading: false,
    error: null,
    reloadConfig: vi.fn(),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "de", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../components/PageHeader", () => ({
  PageHeader: ({ children, title }: { children?: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("../components/ConfirmDialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("lucide-react", () => {
  const MockIcon = () => <span data-testid="icon" />;
  return new Proxy({}, { get: () => MockIcon });
});

vi.mock("framer-motion", () => {
  const passthrough = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: () => passthrough }),
  };
});

vi.mock("@mui/material", () => ({
  Box: ({ children, ...p }: any) => React.createElement("div", p, children),
  Typography: ({ children, ...p }: any) => React.createElement("span", p, children),
  Paper: ({ children, ...p }: any) => React.createElement("div", p, children),
  Chip: ({ label, ...p }: any) => React.createElement("span", p, label),
  Stack: ({ children, ...p }: any) => React.createElement("div", p, children),
  Button: ({ children, ...p }: any) => React.createElement("button", p, children),
  IconButton: ({ children, ...p }: any) => React.createElement("button", p, children),
  Tooltip: ({ children }: any) => children,
  Switch: ({ ...p }: any) => React.createElement("input", { type: "checkbox", ...p }),
  FormControlLabel: ({ label, control }: any) => React.createElement("label", null, control, label),
  Divider: () => React.createElement("hr"),
  CircularProgress: () => React.createElement("span"),
  Alert: ({ children, ...p }: any) => React.createElement("div", p, children),
  AlertTitle: ({ children }: any) => React.createElement("strong", null, children),
}));

vi.mock("@mui/material/styles", () => ({
  useTheme: () => ({ palette: { primary: { main: "#000" } } }),
}));

const buildWeekData = (overrides: Partial<WeekData> = {}, hours = "08:00"): WeekData => ({
  employeeName: "Max Mustermann",
  customer: "Testkunde",
  customerEmail: "kunde@test.de",
  week: 18,
  year: 2026,
  sheetId: 1,
  startDate: "2026-04-27",
  locked: false,
  status: "OPEN",
  days: [
    { date: "2026-04-27", from: "08:00", to: "16:00", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours, decimal: hours === "01:00" ? "1.00" : "8.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-04-28", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-04-29", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-04-30", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-05-01", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-05-02", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
    { date: "2026-05-03", from: "", to: "", pause1From: "", pause1To: "", pause2From: "", pause2To: "", hours: "00:00", decimal: "0.00", status: "OPEN", locked: false, overridden: false },
  ],
  ...overrides,
});

describe("Employee timesheet backend flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Restore default mock implementations after clearAllMocks
    vi.mocked(apiService.saveTimesheet).mockResolvedValue({ success: true, timestamp: new Date().toISOString(), data: undefined });
    vi.mocked(apiService.initEmployeeDevice).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: { device: { id: 1, display_name: "Max Mustermann", is_active: true }, created: false },
    });

    // configurable: true is required so each beforeEach can redefine it
    Object.defineProperty(window, "BroadcastChannel", {
      writable: true,
      configurable: true,
      value: class MockBroadcastChannel {
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        postMessage = vi.fn();
        close = vi.fn();
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("archiviert einen Zettel serverseitig beim Löschen", async () => {
    const backendWeek = buildWeekData();

    vi.mocked(apiService.listTimesheets).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: [{ id: 1, weekData: backendWeek }],
    });
    vi.mocked(apiService.getTimesheet).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: { id: 1, weekData: backendWeek },
    });
    vi.mocked(apiService.archiveTimesheet).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: { archived: true, week_year: 2026, week_number: 18, sheet_id: "1" },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProviders>{children}</AppProviders>
    );

    const { result, unmount } = renderHook(() => useWeekData(), { wrapper });

    // Advance timers so the auto-save debounce and async effects resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.currentWeek?.week).toBe(18);
    });

    await act(async () => {
      await result.current.deleteWeek(2026, 18, 1);
      await vi.runAllTimersAsync();
    });

    expect(apiService.archiveTimesheet).toHaveBeenCalledWith({
      year: 2026,
      week: 18,
      sheetId: 1,
    });
    expect(storage.removeWeekData).toHaveBeenCalledWith(2026, 18, 1);

    unmount();
  });

  it("verwendet bei leerem Backend nicht mehr alte lokale Dashboard-Daten", async () => {
    vi.mocked(apiService.listTimesheets).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: [],
    });
    vi.mocked(storage.getAllStoredWeeks).mockReturnValue([buildWeekData({}, "01:00")]);

    render(
      <Dashboard
        employeeName="Max Mustermann"
        onNavigateToWeek={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(apiService.listTimesheets).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("dashboard.noWeeks")).toBeInTheDocument();
    });

    expect(screen.queryByText(/1,00h/)).not.toBeInTheDocument();
  });
});
