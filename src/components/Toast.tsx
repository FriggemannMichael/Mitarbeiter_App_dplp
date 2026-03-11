/**
 * Toast - Notification-Komponente für Feedback
 * Automatisches Fading & Schließen
 */

import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Notification,
  NotificationType,
} from "../contexts/NotificationContext";

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const iconMap: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const colorMap: Record<
  NotificationType,
  { bg: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-green-50",
    text: "text-green-900",
    icon: "text-green-600",
  },
  error: { bg: "bg-red-50", text: "text-red-900", icon: "text-red-600" },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    icon: "text-amber-600",
  },
  info: { bg: "bg-blue-50", text: "text-blue-900", icon: "text-blue-600" },
};

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const { type, message, id, duration } = notification;
  const colors = colorMap[type];

  // Auto-Close (doppelt hält besser - Context + Component)
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start space-x-3 p-4 rounded-lg shadow-lg border ${colors.bg} border-${type}-200 min-w-[300px] max-w-md`}
    >
      {/* Icon */}
      <div className={colors.icon}>{iconMap[type]}</div>

      {/* Message */}
      <div className={`flex-1 ${colors.text} text-sm font-medium`}>
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={() => onClose(id)}
        className={`${colors.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

// Container für alle Toasts
export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onClose,
}) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
