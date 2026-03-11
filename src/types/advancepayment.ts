/**
 * Advance Payment Types
 */

export interface AdvancePaymentNotification {
  id: string;
  employeeName: string;
  customer?: string; // Customer/Company name
  amount: number; // Amount in Euro
  requestDate: string; // ISO date
  additionalNotes: string;
  termsConfirmed?: boolean; // User confirmed reading terms
  employeeSignature?: string; // Base64 signature
  timesheetsSubmitted: boolean; // Confirmation that all timesheets are submitted
  createdAt: string; // ISO timestamp
  sentAt?: string; // ISO timestamp
}

export interface AdvancePaymentFormData {
  amount: number;
  requestDate: string;
  timesheetsSubmitted: boolean;
  additionalNotes: string;
}
