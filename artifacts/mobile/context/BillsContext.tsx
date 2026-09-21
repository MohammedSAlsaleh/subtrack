import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@subtrack_bills';

export type BillCategory = 'rent' | 'insurance' | 'utilities' | 'phone' | 'internet' | 'other';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDayOfMonth: number; // 1–31
  category: BillCategory;
  createdAt: string;
}

export const BILL_CAT_ICON: Record<BillCategory, string> = {
  rent:       'home',
  insurance:  'shield',
  utilities:  'zap',
  phone:      'smartphone',
  internet:   'wifi',
  other:      'file-text',
};

export const BILL_CAT_COLOR: Record<BillCategory, string> = {
  rent:       '#FF6B6B',
  insurance:  '#45B7D1',
  utilities:  '#FFD93D',
  phone:      '#A78BFA',
  internet:   '#4ECDC4',
  other:      '#9CA3AF',
};

/** Exported so banks.tsx can seed these on first bank connection */
type BillTemplate = Omit<Bill, 'id' | 'createdAt'>;

/**
 * Full pool of plausible bills. The seeder picks a realistic subset at
 * random so the demo looks different for every new account.
 */
export const BILLS_POOL: BillTemplate[] = [
  // ── Rent (always exactly one) ─────────────────────────────────────────────
  { name: 'Monthly Rent — Studio',     amount: 2800, currency: 'SAR', dueDayOfMonth: 1,  category: 'rent'      },
  { name: 'Monthly Rent — 1BR Apt',    amount: 3500, currency: 'SAR', dueDayOfMonth: 1,  category: 'rent'      },
  { name: 'Monthly Rent — 2BR Apt',    amount: 5200, currency: 'SAR', dueDayOfMonth: 1,  category: 'rent'      },
  { name: 'Monthly Rent — Villa',      amount: 7800, currency: 'SAR', dueDayOfMonth: 1,  category: 'rent'      },
  // ── Phone plans ───────────────────────────────────────────────────────────
  { name: 'STC Mobile Plan',           amount: 199,  currency: 'SAR', dueDayOfMonth: 15, category: 'phone'     },
  { name: 'Mobily Plan',               amount: 175,  currency: 'SAR', dueDayOfMonth: 12, category: 'phone'     },
  { name: 'Zain Unlimited',            amount: 225,  currency: 'SAR', dueDayOfMonth: 20, category: 'phone'     },
  { name: 'STC Fiber Home',            amount: 299,  currency: 'SAR', dueDayOfMonth: 8,  category: 'phone'     },
  // ── Insurance ─────────────────────────────────────────────────────────────
  { name: 'TAWUNIYA Health',           amount: 450,  currency: 'SAR', dueDayOfMonth: 20, category: 'insurance' },
  { name: 'Malath Health Insurance',   amount: 380,  currency: 'SAR', dueDayOfMonth: 5,  category: 'insurance' },
  { name: 'Bupa Health',               amount: 560,  currency: 'SAR', dueDayOfMonth: 22, category: 'insurance' },
  // ── Utilities ─────────────────────────────────────────────────────────────
  { name: 'SEC Electricity',           amount: 320,  currency: 'SAR', dueDayOfMonth: 25, category: 'utilities' },
  { name: 'Sawa Water',                amount: 85,   currency: 'SAR', dueDayOfMonth: 28, category: 'utilities' },
  { name: 'SABB Gas',                  amount: 60,   currency: 'SAR', dueDayOfMonth: 27, category: 'utilities' },
  // ── BNPL / instalment ─────────────────────────────────────────────────────
  { name: 'Tabby — iPhone 15 Pro',     amount: 449,  currency: 'SAR', dueDayOfMonth: 10, category: 'other'     },
  { name: 'Tabby — Samsung Galaxy',    amount: 374,  currency: 'SAR', dueDayOfMonth: 14, category: 'other'     },
  { name: 'Tamara — MacBook Air',      amount: 875,  currency: 'SAR', dueDayOfMonth: 18, category: 'other'     },
  { name: 'Tamara — Dyson Airwrap',    amount: 312,  currency: 'SAR', dueDayOfMonth: 7,  category: 'other'     },
];

/** Backwards-compatible alias used by the bank-seeding screen. */
export const SAMPLE_BILLS: BillTemplate[] = BILLS_POOL;

/** Returns how many days until the next due date (0 = today, negative = already passed this month) */
export function daysUntilDue(dueDayOfMonth: number): number {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDayOfMonth);
  const diff = Math.ceil((thisMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    // Next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dueDayOfMonth);
    return Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  return diff;
}

interface BillsContextValue {
  bills: Bill[];
  monthlyBillsTotal: number;
  addBill: (bill: Omit<Bill, 'id' | 'createdAt'>) => Promise<void>;
  removeBill: (id: string) => Promise<void>;
  updateBill: (id: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>) => Promise<void>;
  clearAll: () => Promise<void>;
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<Bill[]>([]);
  // Mirror of state used by applyAndPersist so reads are never stale
  const billsRef = useRef<Bill[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const parsed: Bill[] = JSON.parse(raw);
        billsRef.current = parsed;
        setBills(parsed);
      }
      // No auto-seeding — bills are populated when a bank is first connected
    });
  }, []);

  /**
   * Applies an updater against the current ref (never stale), updates both the
   * ref and React state, then awaits the AsyncStorage write. Callers who await
   * this are guaranteed that storage reflects the mutation before continuing.
   */
  const applyAndPersist = useCallback(async (updater: (prev: Bill[]) => Bill[]) => {
    const next = updater(billsRef.current);
    billsRef.current = next;
    setBills(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'createdAt'>) => {
    const newBill: Bill = {
      ...bill,
      id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await applyAndPersist(prev => [...prev, newBill]);
  }, [applyAndPersist]);

  const removeBill = useCallback(async (id: string) => {
    await applyAndPersist(prev => prev.filter(b => b.id !== id));
  }, [applyAndPersist]);

  const updateBill = useCallback(async (id: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>) => {
    await applyAndPersist(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [applyAndPersist]);

  const monthlyBillsTotal = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <BillsContext.Provider value={{ bills, monthlyBillsTotal, addBill, removeBill, updateBill, clearAll: async () => { billsRef.current = []; setBills([]); await AsyncStorage.removeItem(STORAGE_KEY); } }}>
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBills must be used within BillsProvider');
  return ctx;
}
