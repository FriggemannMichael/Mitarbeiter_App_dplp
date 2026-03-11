/**
 * Logger Service für strukturierte und umgebungsabhängige Logging
 *
 * Features:
 * - Debug-Logs nur in Development
 * - Strukturierte Log-Messages
 * - Error-Tracking bereit für externe Services (Sentry, etc.)
 * - Performance-Logging
 */

interface LogContext {
  component?: string;
  action?: string;
  data?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  /**
   * Debug-Logs (nur Development)
   * Für detaillierte Entwicklungs-Informationen
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const prefix = context?.component ? `[${context.component}]` : '[Debug]';
    console.debug(`${prefix} ${message}`, context?.data || '');
  }

  /**
   * Info-Logs (nur Development)
   * Für allgemeine Informationen
   */
  info(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const prefix = context?.component ? `[${context.component}]` : '[Info]';
    console.info(`${prefix} ${message}`, context?.data || '');
  }

  /**
   * Warning-Logs (Development & Production)
   * Für potenzielle Probleme
   */
  warn(message: string, context?: LogContext): void {
    const prefix = context?.component ? `[${context.component}]` : '[Warn]';
    console.warn(`${prefix} ${message}`, context?.data || '');
  }

  /**
   * Error-Logs (Development & Production)
   * Für Fehler und Exceptions
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const prefix = context?.component ? `[${context.component}]` : '[Error]';
    console.error(`${prefix} ${message}`, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...context?.data,
    });

    // In Production: Send to error reporting service
    if (this.isProduction && error) {
      this.reportError(error, message, context);
    }
  }

  /**
   * Performance-Messung starten
   */
  startTimer(label: string): () => void {
    if (!this.isDevelopment) {
      return () => {}; // No-op in production
    }

    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.debug(`⏱️ ${label} completed in ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Error-Reporting an externe Services (Vorbereitet für Sentry, etc.)
   */
  private reportError(error: Error, message: string, context?: LogContext): void {
    // TODO: Hier Integration mit Error-Reporting-Service
    // Beispiel: Sentry.captureException(error, { tags: { ...context } });

    // Fallback: Console in Production nur bei kritischen Fehlern
    if (this.isProduction) {
      console.error('[Critical Error]', {
        message,
        error: error.message,
        component: context?.component,
      });
    }
  }
}

/**
 * Singleton Logger-Instanz
 */
export const logger = new Logger();
