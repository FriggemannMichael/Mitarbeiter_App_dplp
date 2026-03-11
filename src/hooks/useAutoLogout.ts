import { useEffect, useRef, useCallback } from 'react';
import { appConfig } from '../config/appConfig';
import { TIMEOUTS } from '../config/constants';

interface UseAutoLogoutProps {
  onLogout: () => void;
  enabled?: boolean;
  timeoutMinutes?: number;
}

/**
 * Custom Hook für automatisches Logout nach Inaktivität
 *
 * @param onLogout - Callback-Funktion die beim Logout aufgerufen wird
 * @param enabled - Ob Auto-Logout aktiviert ist (Standard: true)
 * @param timeoutMinutes - Timeout in Minuten (Standard: aus appConfig)
 */
export const useAutoLogout = ({
  onLogout,
  enabled = true,
  timeoutMinutes = appConfig.security.autoLogoutMinutes,
}: UseAutoLogoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Timer zurücksetzen
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    // Alten Timer löschen
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Neuen Timer setzen
    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      onLogout();
    }, timeoutMs);
  }, [enabled, timeoutMinutes, onLogout]);

  // Event-Handler für Benutzer-Aktivität
  const handleUserActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      // Timer löschen wenn deaktiviert
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Timer initial setzen
    resetTimer();

    // Events für Benutzer-Aktivität
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle: Nur alle 30 Sekunden Timer zurücksetzen
    let lastReset = Date.now();
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastReset > TIMEOUTS.AUTO_LOGOUT_THROTTLE) {
        lastReset = now;
        handleUserActivity();
      }
    };

    // Event-Listener hinzufügen
    events.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, throttledHandler);
      });
    };
  }, [enabled, handleUserActivity, resetTimer]);

  // Verbleibende Zeit berechnen (für Debug/Info)
  const getRemainingTime = useCallback(() => {
    if (!enabled) return null;

    const elapsed = Date.now() - lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const remaining = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remaining / 1000)); // in Sekunden
  }, [enabled, timeoutMinutes]);

  return {
    resetTimer,
    getRemainingTime,
  };
};
