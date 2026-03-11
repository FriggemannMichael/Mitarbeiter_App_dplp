/**
 * Application Constants
 *
 * Centralizes all magic numbers, hard-coded URLs, and configuration values
 * for better maintainability and consistency.
 */

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

export const TIMEOUTS = {
  /** Delay before page reload (milliseconds) */
  PAGE_RELOAD_DELAY: 500,

  /** Throttle interval for auto-logout activity tracking (milliseconds) */
  AUTO_LOGOUT_THROTTLE: 30000, // 30 seconds

  /** Performance metrics collection delay (milliseconds) */
  PERFORMANCE_METRICS_DELAY: 100,
} as const;

// =============================================================================
// BACKUP & REMINDER CONSTANTS
// =============================================================================

export const BACKUP = {
  /** Number of days before showing backup reminder */
  REMINDER_DAYS: 7,

  /** Number of days since first use before showing backup reminder */
  FIRST_USE_REMINDER_DAYS: 7,
} as const;

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * API Endpoints - Dynamically loaded from configuration
 * These are fallback values only. The actual values should be loaded from
 * the ConfigManager at runtime.
 *
 * @deprecated Use ConfigManager.getInstance().getApiEndpoint() instead
 */
export const API_ENDPOINTS = {
  /** Backend endpoint for sending PDFs via email (FALLBACK ONLY) */
  SEND_PDF:
    typeof window !== "undefined"
      ? `${window.location.origin}/backend`
      : "http://localhost:8000/backend",

  /** WhatsApp base URL for sharing (FALLBACK ONLY) */
  WHATSAPP_BASE: "https://wa.me/",
} as const;

// =============================================================================
// TIME FIELD NAMES
// =============================================================================

/**
 * Field names for time inputs in DayData interface
 * Used for validation and form handling
 */
export const TIME_FIELDS = {
  FROM: "from",
  TO: "to",
  PAUSE1_FROM: "pause1From",
  PAUSE1_TO: "pause1To",
  PAUSE2_FROM: "pause2From",
  PAUSE2_TO: "pause2To",
} as const;

/**
 * All time-related field names as array
 * Useful for iteration and validation
 */
export const TIME_FIELD_NAMES = Object.values(TIME_FIELDS);

// =============================================================================
// SHIFT TIMING CONSTANTS
// =============================================================================

export const SHIFT_DETECTION = {
  /** Hour threshold for night shift start (>=22:00) */
  NIGHT_SHIFT_START_HOUR: 22,

  /** Hour threshold for night shift end (<=08:00) */
  NIGHT_SHIFT_END_HOUR: 8,
} as const;

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

/**
 * Regular expressions for validation
 */
export const VALIDATION_PATTERNS = {
  /** Time format HH:MM (00:00 - 23:59) */
  TIME_FORMAT: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,

  /** Email format (basic validation) */
  EMAIL_FORMAT: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// =============================================================================
// LOCALE MAPPINGS
// =============================================================================

/**
 * Maps language codes to locale identifiers for date formatting
 */
export const LOCALE_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
  ro: "ro-RO",
  pl: "pl-PL",
  ru: "ru-RU",
  ar: "ar-SA",
  bg: "bg-BG",
  uk: "uk-UA",
  fa: "fa-IR",
} as const;

/**
 * Default locale if language not found in map
 */
export const DEFAULT_LOCALE = "de-DE";

// =============================================================================
// DAY OF WEEK CONSTANTS
// =============================================================================

/**
 * Day indices for shift model application
 */
export const WORK_DAYS = {
  /** Monday to Friday (Monday-based week) */
  WEEKDAYS: [0, 1, 2, 3, 4],

  /** Sunday to Thursday (for night shifts - Sunday-based week after reorganization) */
  NIGHT_SHIFT_DAYS: [0, 1, 2, 3, 4],

  /** All days */
  ALL_DAYS: [0, 1, 2, 3, 4, 5, 6],
} as const;

// =============================================================================
// PERFORMANCE THRESHOLDS
// =============================================================================

export const PERFORMANCE = {
  /** Render time threshold for slow render warning (milliseconds) */
  SLOW_RENDER_THRESHOLD: 16, // 1 frame at 60fps

  /** Memory usage log threshold (bytes) */
  MEMORY_LOG_THRESHOLD: 50 * 1024 * 1024, // 50MB
} as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UI = {
  /** Default font size for PDF export (points) */
  PDF_DEFAULT_FONT_SIZE: 10,

  /** PDF header font size (points) */
  PDF_HEADER_FONT_SIZE: 14,

  /** PDF title font size (points) */
  PDF_TITLE_FONT_SIZE: 16,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Type helper to extract values from const objects
 */
export type TimeFieldName = (typeof TIME_FIELDS)[keyof typeof TIME_FIELDS];
