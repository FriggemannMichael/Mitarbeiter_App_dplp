/**
 * NotificationContext - Zentrales Toast/Notification-System
 * Für Success, Error, Warning & Info Messages
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // in ms, default 3000
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (
    type: NotificationType,
    message: string,
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Entferne Notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Zeige neue Notification
  const showNotification = useCallback(
    (type: NotificationType, message: string, duration: number = 3000) => {
      const id = `notification-${Date.now()}-${Math.random()}`;

      const notification: Notification = {
        id,
        type,
        message,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-Remove nach Duration
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  // Convenience-Methoden
  const success = useCallback(
    (message: string, duration?: number) => {
      showNotification("success", message, duration);
    },
    [showNotification]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      showNotification("error", message, duration);
    },
    [showNotification]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      showNotification("warning", message, duration);
    },
    [showNotification]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      showNotification("info", message, duration);
    },
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
