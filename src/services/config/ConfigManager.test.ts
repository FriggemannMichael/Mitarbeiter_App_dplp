import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ConfigManager } from "./ConfigManager";
import { apiService } from "../apiService";
import { createMockConfig } from "../../test/helpers/configTestHelpers";

vi.mock("../apiService");

describe("ConfigManager", () => {
  const originalFetch = global.fetch;
  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;

  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    global.fetch = originalFetch;
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
  });

  describe("Singleton-Pattern", () => {
    it("gibt immer dieselbe Instanz zurück", () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("loadConfiguration", () => {
    it("lädt von API wenn verfügbar", async () => {
      const mockConfig = {
        company: { company_name: "Test GmbH" },
        pdf: { app_name: "Test App" },
        technical: { api_endpoint: "https://test.com" },
        work: { max_work_hours_per_day: 10 },
      };

      vi.mocked(apiService.getAppConfig).mockResolvedValue({
        success: true,
        timestamp: new Date().toISOString(),
        data: mockConfig as any,
      });

      const manager = ConfigManager.getInstance();
      const config = await manager.loadConfiguration();

      expect(config.company.company_name).toBe("Test GmbH");
      expect(config.isLoaded).toBe(true);
      expect(apiService.getAppConfig).toHaveBeenCalled();

      // Sollte in localStorage gespeichert werden
      const cached = localStorage.getItem("app_config");
      expect(cached).toBeTruthy();
    });

    it("lädt von localStorage wenn API fehlt", async () => {
      const mockConfig = createMockConfig({
        company: { company_name: "Cached GmbH" } as any,
      });

      localStorage.setItem("app_config", JSON.stringify(mockConfig));

      vi.mocked(apiService.getAppConfig).mockRejectedValue(
        new Error("Network error"),
      );

      const manager = ConfigManager.getInstance();
      const config = await manager.loadConfiguration();

      expect(config.company.company_name).toBe("Cached GmbH");
      expect(config.isLoaded).toBe(true);
    });

    it("lädt von config.json wenn API und localStorage fehlen", async () => {
      vi.mocked(apiService.getAppConfig).mockRejectedValue(
        new Error("Network error"),
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          company: { company_name: "JSON GmbH" },
          pdf: {},
          technical: {},
          work: {},
          admin: {},
        }),
      });

      const manager = ConfigManager.getInstance();
      const config = await manager.loadConfiguration();

      expect(config.company.company_name).toBe("JSON GmbH");
    });

    it("lädt Default-Config wenn alles fehlt", async () => {
      vi.mocked(apiService.getAppConfig).mockRejectedValue(
        new Error("Network error"),
      );

      global.fetch = vi.fn().mockRejectedValue(new Error("File not found"));

      const manager = ConfigManager.getInstance();
      const config = await manager.loadConfiguration();

      expect(config.company.company_name).toBeTruthy();
      expect(config.isLoaded).toBe(false);
    });
  });

  describe("saveConfiguration", () => {
    it("speichert in localStorage", async () => {
      const mockConfig = createMockConfig({
        company: { company_name: "Save Test" } as any,
      });

      const manager = ConfigManager.getInstance();
      await manager.saveConfiguration(mockConfig);

      const cached = localStorage.getItem("app_config");
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.company.company_name).toBe("Save Test");
    });
  });

  describe("Subscriber-Pattern", () => {
    it("benachrichtigt Subscribers bei Config-Change", async () => {
      const manager = ConfigManager.getInstance();
      const callback = vi.fn();

      manager.subscribe(callback);

      const newConfig = createMockConfig({
        company: { company_name: "Updated" } as any,
      });

      await manager.saveConfiguration(newConfig);

      expect(callback).toHaveBeenCalledWith(newConfig);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("entfernt Subscribers korrekt (unsubscribe)", async () => {
      const manager = ConfigManager.getInstance();
      const callback = vi.fn();

      const unsubscribe = manager.subscribe(callback);
      unsubscribe();

      const newConfig = createMockConfig();

      await manager.saveConfiguration(newConfig);

      // Callback sollte nicht aufgerufen werden nach unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it("unterstützt mehrere Subscribers gleichzeitig", async () => {
      const manager = ConfigManager.getInstance();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      manager.subscribe(callback1);
      manager.subscribe(callback2);
      const unsubscribe3 = manager.subscribe(callback3);

      // callback3 abmelden
      unsubscribe3();

      const newConfig = createMockConfig({
        company: { company_name: "Multi" } as any,
      });

      await manager.saveConfiguration(newConfig);

      expect(callback1).toHaveBeenCalledWith(newConfig);
      expect(callback2).toHaveBeenCalledWith(newConfig);
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe("clearCache", () => {
    it("löscht localStorage und benachrichtigt Subscribers", () => {
      const manager = ConfigManager.getInstance();
      const callback = vi.fn();

      // localStorage füllen
      localStorage.setItem("app_config", JSON.stringify({ test: "data" }));

      manager.subscribe(callback);
      manager.clearCache();

      // localStorage sollte leer sein
      expect(localStorage.getItem("app_config")).toBeNull();

      // Subscribers sollten mit Default-Config benachrichtigt werden
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].isLoaded).toBe(false);
    });
  });

  describe("localStorage Error-Handling", () => {
    it("handled localStorage write errors gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // localStorage.setItem zum Fehlschlagen bringen
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const manager = ConfigManager.getInstance();
      const mockConfig = createMockConfig();

      await manager.saveConfiguration(mockConfig);

      expect(consoleError).toHaveBeenCalledWith(
        "localStorage write failed:",
        expect.any(Error),
      );

      consoleError.mockRestore();
    });

    it("handled localStorage read errors gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // localStorage.getItem zum Fehlschlagen bringen
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      vi.mocked(apiService.getAppConfig).mockRejectedValue(
        new Error("Network error"),
      );

      global.fetch = vi.fn().mockRejectedValue(new Error("File not found"));

      const manager = ConfigManager.getInstance();
      const config = await manager.loadConfiguration();

      // Sollte Default-Config zurückgeben
      expect(config.isLoaded).toBe(false);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
