export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];

  hasErrors(): boolean;
  hasWarnings(): boolean;
  getAllMessages(): string[];
  merge(other: ValidationResult): ValidationResult;
}

export class ValidationResultImpl implements ValidationResult {
  constructor(
    public errors: ValidationError[] = [],
    public warnings: ValidationWarning[] = []
  ) {}

  get isValid(): boolean {
    return this.errors.length === 0;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getAllMessages(): string[] {
    return [
      ...this.errors.map((e) => `❌ ${e.message}`),
      ...this.warnings.map((w) => `⚠️ ${w.message}`),
    ];
  }

  merge(other: ValidationResult): ValidationResult {
    return new ValidationResultImpl(
      [...this.errors, ...other.errors],
      [...this.warnings, ...other.warnings]
    );
  }
}
