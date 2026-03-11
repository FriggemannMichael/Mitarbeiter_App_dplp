import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateWithYear,
  formatDateWithConfig,
  formatTimeWithConfig,
  formatHours,
  formatNumber,
  formatTime,
  formatWeek,
  formatDateRange,
  parseTimeToMinutes,
  formatMinutesToTime,
  formatFileSize,
} from "./formatters";

describe("formatters", () => {
  describe("formatDate", () => {
    it("formats date in German format (DD.MM)", () => {
      expect(formatDate("2025-01-15", "de")).toBe("15.01.");
    });

    it("formats date in English format (MM/DD)", () => {
      expect(formatDate("2025-01-15", "en")).toBe("01/15");
    });

    it("handles invalid date gracefully", () => {
      expect(formatDate("invalid", "de")).toBe("Invalid Date");
    });
  });

  describe("formatDateWithYear", () => {
    it("formats date with year in German format", () => {
      expect(formatDateWithYear("2025-01-15", "de")).toBe("15.01.2025");
    });

    it("formats date with year in English format", () => {
      expect(formatDateWithYear("2025-01-15", "en")).toBe("01/15/2025");
    });
  });

  describe("formatDateWithConfig", () => {
    it("uses DD.MM.YYYY format by default", () => {
      expect(formatDateWithConfig("2025-01-15")).toBe("15.01.2025");
    });

    it("uses MM/DD/YYYY format when configured", () => {
      const config = { work: { date_format: "MM/DD/YYYY" } } as any;
      expect(formatDateWithConfig("2025-01-15", config)).toBe("01/15/2025");
    });

    it("uses YYYY-MM-DD format when configured", () => {
      const config = { work: { date_format: "YYYY-MM-DD" } } as any;
      expect(formatDateWithConfig("2025-01-15", config)).toBe("2025-01-15");
    });
  });

  describe("formatTimeWithConfig", () => {
    it("returns empty string for empty input", () => {
      expect(formatTimeWithConfig("")).toBe("");
    });

    it("formats time in 24h format by default", () => {
      expect(formatTimeWithConfig("08:30")).toBe("08:30");
    });

    it("formats time in 12h format when configured", () => {
      const config = { work: { time_format: "12h" } } as any;
      expect(formatTimeWithConfig("14:30", config)).toBe("2:30 PM");
    });

    it("formats midnight correctly in 12h format", () => {
      const config = { work: { time_format: "12h" } } as any;
      expect(formatTimeWithConfig("00:00", config)).toBe("12:00 AM");
    });

    it("formats noon correctly in 12h format", () => {
      const config = { work: { time_format: "12h" } } as any;
      expect(formatTimeWithConfig("12:00", config)).toBe("12:00 PM");
    });
  });

  describe("formatHours", () => {
    it("returns 0:00 for zero values", () => {
      expect(formatHours("00:00", "0.00", "de")).toBe("0:00");
    });

    it("formats hours with German decimal separator (comma)", () => {
      expect(formatHours("08:30", "8.50", "de")).toBe("08:30 (8,50h)");
    });

    it("formats hours with English decimal separator (dot)", () => {
      expect(formatHours("08:30", "8.50", "en")).toBe("08:30 (8.50h)");
    });
  });

  describe("formatNumber", () => {
    it("replaces dot with comma for German", () => {
      expect(formatNumber(8.5, "de")).toBe("8,5");
    });

    it("keeps dot for English", () => {
      expect(formatNumber(8.5, "en")).toBe("8.5");
    });

    it("handles string input", () => {
      expect(formatNumber("8.5", "de")).toBe("8,5");
    });
  });

  describe("formatTime", () => {
    it("pads single digit hours", () => {
      expect(formatTime("9:30")).toBe("09:30");
    });

    it("keeps already padded time", () => {
      expect(formatTime("09:30")).toBe("09:30");
    });

    it("returns empty string for empty input", () => {
      expect(formatTime("")).toBe("");
    });

    it("returns invalid input as-is", () => {
      expect(formatTime("invalid")).toBe("invalid");
    });
  });

  describe("formatWeek", () => {
    it("pads single digit week numbers", () => {
      expect(formatWeek(1)).toBe("01");
    });

    it("keeps double digit weeks", () => {
      expect(formatWeek(12)).toBe("12");
    });

    it("handles 52 weeks", () => {
      expect(formatWeek(52)).toBe("52");
    });
  });

  describe("formatDateRange", () => {
    it("formats date range in German", () => {
      expect(formatDateRange("2025-01-01", "2025-01-07", "de")).toBe(
        "01.01. - 07.01."
      );
    });

    it("formats date range in English", () => {
      expect(formatDateRange("2025-01-01", "2025-01-07", "en")).toBe(
        "01/01 - 01/07"
      );
    });
  });

  describe("parseTimeToMinutes", () => {
    it("parses standard time to minutes", () => {
      expect(parseTimeToMinutes("08:30")).toBe(510);
    });

    it("parses midnight", () => {
      expect(parseTimeToMinutes("00:00")).toBe(0);
    });

    it("parses 15 minutes", () => {
      expect(parseTimeToMinutes("00:15")).toBe(15);
    });

    it("returns 0 for empty string", () => {
      expect(parseTimeToMinutes("")).toBe(0);
    });

    it("returns 0 for invalid input", () => {
      expect(parseTimeToMinutes("invalid")).toBe(0);
    });
  });

  describe("formatMinutesToTime", () => {
    it("formats minutes to time", () => {
      expect(formatMinutesToTime(510)).toBe("08:30");
    });

    it("formats 75 minutes to 01:15", () => {
      expect(formatMinutesToTime(75)).toBe("01:15");
    });

    it("formats 0 minutes to 00:00", () => {
      expect(formatMinutesToTime(0)).toBe("00:00");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes to KB", () => {
      expect(formatFileSize(1024, "en")).toBe("1.0 KB");
    });

    it("formats bytes to MB with German separator", () => {
      expect(formatFileSize(1536000, "de")).toBe("1,5 MB");
    });

    it("formats 0 bytes", () => {
      expect(formatFileSize(0, "en")).toBe("0 Bytes");
    });
  });
});
