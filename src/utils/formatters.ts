import { LOCALE_MAP, DEFAULT_LOCALE } from "../config/constants";
import type { AppConfiguration } from "../types/config.types";

/**
 * Formatting Utilities
 *
 * Centralized formatting functions for dates, times, numbers, etc.
 * Extracted from components for better reusability and maintainability.
 */

/**
 * Parse ISO date string to local date (avoiding timezone issues)
 *
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Date object in local timezone
 */
const parseISODateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format a date according to config settings
 *
 * @param dateString - ISO date string
 * @param config - App configuration with date_format setting
 * @returns Formatted date string
 */
export const formatDateWithConfig = (
  dateString: string,
  config?: AppConfiguration
): string => {
  const date = parseISODateLocal(dateString);
  const format = config?.work.date_format || "DD.MM.YYYY";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  switch (format) {
    case "DD.MM.YYYY":
      return `${day}.${month}.${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return `${day}.${month}.${year}`;
  }
};

/**
 * Format a time according to config settings
 *
 * @param time - Time string (HH:mm format)
 * @param config - App configuration with time_format setting
 * @returns Formatted time string
 */
export const formatTimeWithConfig = (
  time: string,
  config?: AppConfiguration
): string => {
  if (!time) return "";

  const format = config?.work.time_format || "HH:mm";
  const [hours, minutes] = time.split(":").map(Number);

  if (format === "12h" || format === "hh:mm AM/PM") {
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  // Default: 24h format
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

/**
 * Format a date string to localized short date format (DD.MM)
 *
 * @param dateString - ISO date string (e.g., "2025-01-15")
 * @param language - Language code (e.g., "de", "en", "fr")
 * @returns Formatted date string (e.g., "15.01" for de, "01/15" for en)
 *
 * @example
 * formatDate("2025-01-15", "de") // returns "15.01"
 * formatDate("2025-01-15", "en") // returns "01/15"
 */
export const formatDate = (dateString: string, language: string): string => {
  const date = parseISODateLocal(dateString);
  const locale = LOCALE_MAP[language] || DEFAULT_LOCALE;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
  });
};

/**
 * Format a date string to localized full date format (with year)
 *
 * @param dateString - ISO date string (e.g., "2025-01-15")
 * @param language - Language code (e.g., "de", "en", "fr")
 * @returns Formatted date string with year (e.g., "15.01.2025" for de)
 *
 * @example
 * formatDateWithYear("2025-01-15", "de") // returns "15.01.2025"
 * formatDateWithYear("2025-01-15", "en") // returns "01/15/2025"
 */
export const formatDateWithYear = (
  dateString: string,
  language: string
): string => {
  const date = parseISODateLocal(dateString);
  const locale = LOCALE_MAP[language] || DEFAULT_LOCALE;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Format hours display with decimal representation
 *
 * @param hours - Hours in HH:MM format (e.g., "08:30")
 * @param decimal - Decimal hours (e.g., "8.50")
 * @param language - Language code for decimal separator (de uses comma, others use dot)
 * @returns Formatted hours string (e.g., "08:30 (8,50h)" for de)
 *
 * @example
 * formatHours("08:30", "8.50", "de") // returns "08:30 (8,50h)"
 * formatHours("08:30", "8.50", "en") // returns "08:30 (8.50h)"
 * formatHours("00:00", "0.00", "de") // returns "0:00"
 */
export const formatHours = (
  hours: string,
  decimal: string,
  language: string
): string => {
  // Return simple "0:00" for empty/zero values
  if (hours === "00:00" || decimal === "0.00") {
    return "0:00";
  }

  // German uses comma as decimal separator
  const formattedDecimal =
    language === "de" ? decimal.replace(".", ",") : decimal;

  return `${hours} (${formattedDecimal}h)`;
};

/**
 * Format a number with localized decimal separator
 *
 * @param value - Numeric value or string representation
 * @param language - Language code (de uses comma, others use dot)
 * @returns Formatted number string
 *
 * @example
 * formatNumber(8.5, "de") // returns "8,5"
 * formatNumber(8.5, "en") // returns "8.5"
 * formatNumber("8.5", "de") // returns "8,5"
 */
export const formatNumber = (
  value: number | string,
  language: string
): string => {
  const stringValue = typeof value === "number" ? value.toString() : value;

  if (language === "de") {
    return stringValue.replace(".", ",");
  }

  return stringValue;
};

/**
 * Format a time string to ensure HH:MM format
 *
 * @param time - Time string (may be incomplete, e.g., "9:30" or "09:30")
 * @returns Formatted time in HH:MM format (e.g., "09:30")
 *
 * @example
 * formatTime("9:30") // returns "09:30"
 * formatTime("09:30") // returns "09:30"
 * formatTime("") // returns ""
 */
export const formatTime = (time: string): string => {
  if (!time || time === "") return "";

  const parts = time.split(":");
  if (parts.length !== 2) return time;

  const hours = parts[0].padStart(2, "0");
  const minutes = parts[1].padStart(2, "0");

  return `${hours}:${minutes}`;
};

/**
 * Format a week number with leading zero
 *
 * @param week - Week number (1-53)
 * @returns Week number with leading zero (e.g., "01", "52")
 *
 * @example
 * formatWeek(1) // returns "01"
 * formatWeek(12) // returns "12"
 * formatWeek(52) // returns "52"
 */
export const formatWeek = (week: number): string => {
  return week.toString().padStart(2, "0");
};

/**
 * Format a date range string
 *
 * @param startDate - Start date ISO string
 * @param endDate - End date ISO string
 * @param language - Language code for formatting
 * @returns Formatted date range (e.g., "01.01 - 07.01")
 *
 * @example
 * formatDateRange("2025-01-01", "2025-01-07", "de") // returns "01.01 - 07.01"
 */
export const formatDateRange = (
  startDate: string,
  endDate: string,
  language: string
): string => {
  const start = formatDate(startDate, language);
  const end = formatDate(endDate, language);
  return `${start} - ${end}`;
};

/**
 * Parse a time string to minutes
 *
 * @param time - Time in HH:MM format
 * @returns Total minutes, or 0 if invalid
 *
 * @example
 * parseTimeToMinutes("08:30") // returns 510
 * parseTimeToMinutes("00:15") // returns 15
 * parseTimeToMinutes("") // returns 0
 */
export const parseTimeToMinutes = (time: string): number => {
  if (!time || time === "") return 0;

  const parts = time.split(":");
  if (parts.length !== 2) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return 0;

  return hours * 60 + minutes;
};

/**
 * Format minutes to HH:MM time string
 *
 * @param minutes - Total minutes
 * @returns Time in HH:MM format
 *
 * @example
 * formatMinutesToTime(510) // returns "08:30"
 * formatMinutesToTime(75) // returns "01:15"
 * formatMinutesToTime(0) // returns "00:00"
 */
export const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Format file size in bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @param language - Language code for number formatting
 * @returns Formatted file size (e.g., "1.5 MB", "1,5 MB")
 *
 * @example
 * formatFileSize(1536000, "en") // returns "1.5 MB"
 * formatFileSize(1536000, "de") // returns "1,5 MB"
 * formatFileSize(1024, "en") // returns "1.0 KB"
 */
export const formatFileSize = (
  bytes: number,
  language: string = "en"
): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  const formattedValue = formatNumber(value.toFixed(1), language);

  return `${formattedValue} ${sizes[i]}`;
};
