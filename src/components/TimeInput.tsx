import React, { useState, useRef, useEffect } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * iOS-freundliche Zeit-Eingabe-Komponente
 * Verwendet ein einziges Input-Feld mit automatischer Formatierung
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = '00:00',
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      setDisplayValue(value);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const formatTimeInput = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');

    if (digits.length === 0) return '';
    if (digits.length === 1) return digits;
    if (digits.length === 2) return digits;
    if (digits.length === 3) return `${digits[0]}${digits[1]}:${digits[2]}`;
    // 4 or more digits
    return `${digits[0]}${digits[1]}:${digits[2]}${digits[3]}`;
  };

  const validateAndFormatTime = (input: string): string | null => {
    const digits = input.replace(/\D/g, '');

    if (digits.length < 4) return null;

    const hours = parseInt(digits.substring(0, 2), 10);
    const minutes = parseInt(digits.substring(2, 4), 10);

    // Validate
    if (hours > 23 || minutes > 59) return null;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatTimeInput(input);

    setDisplayValue(formatted);

    // Only update parent when we have a complete time
    const validated = validateAndFormatTime(formatted);
    if (validated) {
      onChange(validated);
    } else if (input === '') {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (displayValue) {
      const validated = validateAndFormatTime(displayValue);
      if (validated) {
        setDisplayValue(validated);
        onChange(validated);
      } else {
        // Invalid time, clear it
        setDisplayValue('');
        onChange('');
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all on focus for easy editing
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if ([8, 9, 27, 13, 46, 37, 39].indexOf(e.keyCode) !== -1) {
      return;
    }
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].indexOf(e.keyCode) !== -1) {
      return;
    }
    // Ensure it's a number
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex justify-center">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={5}
        className={`input-field text-center ${className} ${disabled ? 'disabled:bg-gray-100 disabled:text-gray-500' : ''}`}
        style={{ width: '35%', minWidth: '100px' }}
      />
    </div>
  );
};
