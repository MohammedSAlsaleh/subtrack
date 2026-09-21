import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@subtrack_loans';

export type LoanType = 'credit_card' | 'bnpl' | 'personal_loan' | 'other';

export interface Loan {
  id: string;
  name: string;           // e.g. "Al Rajhi Platinum Visa", "Tabby – iPhone 15"
  lender: string;         // e.g. "Al Rajhi Bank", "Tabby"
  type: LoanType;
  currency: string;
  currentBalance: number; // remaining balance owed
  originalAmount: number; // original loan / credit limit for cards
  interestRate?: number;  // annual % (APR)
  minimumPayment?: number;
  nextPaymentDate: string; // ISO date string
  nextPaymentAmount: number;
  // Credit-card extras
  creditLimit?: number;
  // BNPL extras
  totalInstallments?: number;
  paidInstallments?: number;
  installmentAmount?: number;
  createdAt: string;
}

export const LOAN_TYPE_ICON: Record<LoanType, string> = {
  credit_card:    'credit-card',
  bnpl:           'shopping-bag',
  personal_loan:  'briefcase',
  other:          'file-text',
};

export const LOAN_TYPE_COLOR: Record<LoanType, string> = {
  credit_card:   '#FF6B6B',
  bnpl:          '#A78BFA',
  personal_loan: '#45B7D1',
  other:         '#9CA3AF',
};

// ── Days until a date ────────────────────────────────────────────────────────
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now    = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Progress ratio (0–1) ─────────────────────────────────────────────────────
export function loanProgress(loan: Loan): number {
  if (loan.type === 'bnpl' && loan.totalInstallments) {
    return (loan.paidInstallments ?? 0) / loan.totalInstallments;
  }
  if (loan.type === 'credit_card' && loan.creditLimit) {
    // Show utilisation (how much of limit is used)
    return Math.min(loan.currentBalance / loan.creditLimit, 1);
  }
  if (loan.originalAmount > 0) {
    return 1 - Math.min(loan.currentBalance / loan.originalAmount, 1);
  }
  return 0;
}

// ── Sample data (Saudi market) ───────────────────────────────────────────────
function makeNextDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const SAMPLE_LOANS: Loan[] = [
  {
    id: 'loan_1',
    name: 'Platinum Visa',
    lender: 'Al Rajhi Bank',
    type: 'credit_card',
    currency: 'SAR',
    currentBalance: 12500,
    originalAmount: 25000,
    creditLimit: 25000,
    interestRate: 24,
    minimumPayment: 625,
    nextPaymentDate: makeNextDate(18),
    nextPaymentAmount: 625,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'loan_2',
    name: 'Samsung 65" TV',
    lender: 'Tabby',
    type: 'bnpl',
    currency: 'SAR',
    currentBalance: 1800,
    originalAmount: 2400,
    totalInstallments: 4,
    paidInstallments: 1,
    installmentAmount: 600,
    nextPaymentDate: makeNextDate(12),
    nextPaymentAmount: 600,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'loan_3',
    name: 'MacBook Air M3',
    lender: 'Tamara',
    type: 'bnpl',
    currency: 'SAR',
    currentBalance: 2667,
    originalAmount: 4000,
    totalInstallments: 6,
    paidInstallments: 2,
    installmentAmount: 667,
    nextPaymentDate: makeNextDate(6),
    nextPaymentAmount: 667,
    createdAt: new Date().toISOString(),
  },
];

// ── Context ──────────────────────────────────────────────────────────────────
interface LoanContextValue {
  loans: Loan[];
  totalDebt: number;
  monthlyPayments: number;
  addLoan:    (loan: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
  updateLoan: (id: string, updates: Partial<Omit<Loan, 'id' | 'createdAt'>>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  clearAll:   () => Promise<void>;
}

const LoanContext = createContext<LoanContextValue | null>(null);

export function LoanProvider({ children }: { children: React.ReactNode }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  // Mirror of state used by persist so reads are never stale across rapid mutations
  const loansRef = useRef<Loan[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const parsed: Loan[] = JSON.parse(raw);
        loansRef.current = parsed;
        setLoans(parsed);
      } else {
        loansRef.current = SAMPLE_LOANS;
        setLoans(SAMPLE_LOANS);
        // Fire-and-forget is intentional here: this only runs once on first launch
        // to seed deterministic sample data. A crash during this write is harmless —
        // the next launch will simply re-seed the same samples.
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_LOANS));
      }
    });
  }, []);

  /**
   * Updates the ref synchronously, schedules a React state update, then awaits
   * the AsyncStorage write. Callers who await persist() are guaranteed storage
   * reflects the mutation before they continue.
   */
  const persist = useCallback(async (next: Loan[]) => {
    loansRef.current = next;
    setLoans(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addLoan = useCallback(async (loan: Omit<Loan, 'id' | 'createdAt'>) => {
    await persist([...loansRef.current, { ...loan, id: `loan_${Date.now()}`, createdAt: new Date().toISOString() }]);
  }, [persist]);

  const updateLoan = useCallback(async (id: string, updates: Partial<Omit<Loan, 'id' | 'createdAt'>>) => {
    await persist(loansRef.current.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [persist]);

  const removeLoan = useCallback(async (id: string) => {
    await persist(loansRef.current.filter(l => l.id !== id));
  }, [persist]);

  const totalDebt       = loans.reduce((s, l) => s + l.currentBalance, 0);
  const monthlyPayments = loans.reduce((s, l) => s + l.nextPaymentAmount, 0);

  return (
    <LoanContext.Provider value={{ loans, totalDebt, monthlyPayments, addLoan, updateLoan, removeLoan, clearAll: async () => { loansRef.current = []; setLoans([]); await AsyncStorage.removeItem(STORAGE_KEY); } }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used within LoanProvider');
  return ctx;
}
