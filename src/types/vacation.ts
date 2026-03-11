/**
 * Vacation Request Types
 */

export type VacationType = 'paid' | 'unpaid' | 'special' | 'compensatory';

export interface VacationRequest {
  id: string;
  employeeName: string;
  customer: string; // Customer/Company name
  type: VacationType;
  startDate: string; // ISO date format (YYYY-MM-DD)
  endDate?: string; // Optional, only for paid/unpaid vacation
  singleDate?: string; // Optional, only for special leave (Sonderurlaub)
  reason: string;
  notes: string;
  hasReadTerms: boolean; // User confirmed reading the terms
  employeeSignature?: string; // Base64 signature
  supervisorSignature?: string; // Base64 signature
  supervisorName?: string;
  customerSignature?: string; // Base64 signature for customer
  customerName?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string; // ISO timestamp
  submittedAt?: string; // ISO timestamp
}

export interface VacationFormData {
  type: VacationType;
  startDate: string;
  endDate: string;
  singleDate: string;
  reason: string;
  notes: string;
}
