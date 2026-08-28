import { PaymentReconciliationResult } from './paymentReconciliationService';

const STORAGE_KEY = 'dentist_care_payment_reconciliation_history';

export interface SavedPaymentReconciliation extends PaymentReconciliationResult {
  clinicId: string;
  yearMonth: string;
  savedAt: string;
}

const readAll = (): SavedPaymentReconciliation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
};

export const paymentReconciliationStorageService = {
  get: (clinicId: string, yearMonth: string): SavedPaymentReconciliation | null =>
    readAll().find(entry => entry.clinicId === clinicId && entry.yearMonth === yearMonth) || null,

  save: (clinicId: string, yearMonth: string, result: PaymentReconciliationResult): SavedPaymentReconciliation => {
    const saved: SavedPaymentReconciliation = {
      ...result,
      clinicId,
      yearMonth,
      savedAt: new Date().toISOString()
    };
    const entries = readAll().filter(entry => !(entry.clinicId === clinicId && entry.yearMonth === yearMonth));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...entries]));
    return saved;
  }
};
