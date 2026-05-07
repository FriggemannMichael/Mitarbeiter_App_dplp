import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Welcome } from "../pages/Welcome";

vi.mock("../services/apiService", () => ({
  apiService: {
    loginEmployee: vi.fn(),
    getEmployeeSession: vi.fn(),
    registerEmployee: vi.fn(),
    resetEmployeePin: vi.fn(),
  },
}));

vi.mock("../utils/storage", async () => {
  const actual = await vi.importActual<typeof import("../utils/storage")>("../utils/storage");
  return {
    ...actual,
    storage: {
      ...actual.storage,
      setLanguage: vi.fn(),
      getConsent: vi.fn(() => false),
      setConsent: vi.fn(),
      setEmployeeName: vi.fn(),
      getEmployeeName: vi.fn(() => ""),
      getPWAGuideShown: vi.fn(() => true),
      setPWAGuideShown: vi.fn(),
    },
  };
});

vi.mock("../contexts/ConfigContext", () => ({
  useCompanyConfig: () => ({
    company_logo: "",
    company_name: "DPLP",
  }),
  usePdfConfig: () => ({
    app_name: "Test App",
  }),
  useConfig: () => ({
    config: {},
  }),
}));

vi.mock("../components/PWAInstallGuide", () => ({
  PWAInstallGuide: () => null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "de", changeLanguage: vi.fn() },
  }),
}));

vi.mock("framer-motion", () => {
  const passthrough = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return {
    motion: new Proxy({}, { get: () => passthrough }),
  };
});

vi.mock("lucide-react", () => {
  const MockIcon = () => <span data-testid="icon" />;
  return new Proxy({}, { get: () => MockIcon });
});

describe("Welcome session handshake", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for a server-confirmed employee session before completing login", async () => {
    const { apiService } = await import("../services/apiService");
    const onAuthenticated = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(apiService.loginEmployee).mockResolvedValue({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        employee: {
          id: 12,
          first_name: "Max",
          last_name: "Mustermann",
          display_name: "Max Mustermann",
          phone_number: "0176123456",
          customer_key: "dplp",
        },
      },
    });

    vi.mocked(apiService.getEmployeeSession)
      .mockRejectedValueOnce(new Error("pending"))
      .mockResolvedValueOnce({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          employee: {
            id: 12,
            first_name: "Max",
            last_name: "Mustermann",
            display_name: "Max Mustermann",
            phone_number: "0176123456",
            customer_key: "dplp",
          },
        },
      });

    render(<Welcome onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByPlaceholderText("welcome.placeholders.firstName"), "Max");
    await user.type(screen.getByPlaceholderText("welcome.placeholders.lastName"), "Mustermann");
    await user.type(screen.getByLabelText(/4-stellige PIN/i), "1234");
    await user.click(screen.getByRole("button", { name: "welcome.submit.login" }));

    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(apiService.getEmployeeSession).toHaveBeenCalledTimes(2);
      expect(onAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 12,
          display_name: "Max Mustermann",
        }),
      );
    });
  });
});
