import React, { createContext, useContext, useCallback, useRef } from 'react';
import { logger } from '../services/logger';

interface TimesheetActionsContextType {
  registerCreateNewSheet: (callback: () => void) => void;
  unregisterCreateNewSheet: () => void;
  createNewSheet: () => void;
}

const TimesheetActionsContext = createContext<TimesheetActionsContextType | undefined>(undefined);

interface TimesheetActionsProviderProps {
  children: React.ReactNode;
}

export const TimesheetActionsProvider: React.FC<TimesheetActionsProviderProps> = ({ children }) => {
  const createNewSheetCallbackRef = useRef<(() => void) | null>(null);

  const registerCreateNewSheet = useCallback((callback: () => void) => {
    createNewSheetCallbackRef.current = callback;
  }, []);

  const unregisterCreateNewSheet = useCallback(() => {
    createNewSheetCallbackRef.current = null;
  }, []);

  const createNewSheet = useCallback(() => {
    if (createNewSheetCallbackRef.current) {
      createNewSheetCallbackRef.current();
    } else {
      logger.warn('createNewSheet callback is not registered', {
        component: 'TimesheetActionsContext'
      });
    }
  }, []);

  return (
    <TimesheetActionsContext.Provider
      value={{
        registerCreateNewSheet,
        unregisterCreateNewSheet,
        createNewSheet,
      }}
    >
      {children}
    </TimesheetActionsContext.Provider>
  );
};

export const useTimesheetActions = () => {
  const context = useContext(TimesheetActionsContext);
  if (!context) {
    throw new Error('useTimesheetActions must be used within TimesheetActionsProvider');
  }
  return context;
};
