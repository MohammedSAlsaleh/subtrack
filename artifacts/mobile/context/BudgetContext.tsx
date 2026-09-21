import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGETS_KEY = '@subtrack_budgets';

interface BudgetContextValue {
  allCaps: Record<string, number>;
  getCap: (category: string) => number | undefined;
  setCap: (category: string, cap: number | null) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [allCaps, setAllCaps] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(BUDGETS_KEY).then(raw => {
      if (raw) setAllCaps(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback(async (next: Record<string, number>) => {
    setAllCaps(next);
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(next));
  }, []);

  const getCap = useCallback((category: string): number | undefined => {
    return allCaps[category];
  }, [allCaps]);

  const setCap = useCallback(async (category: string, cap: number | null) => {
    if (cap === null) {
      const { [category]: _, ...rest } = allCaps;
      await persist(rest);
    } else {
      await persist({ ...allCaps, [category]: cap });
    }
  }, [allCaps, persist]);

  return (
    <BudgetContext.Provider value={{ allCaps, getCap, setCap }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudgets must be used within BudgetProvider');
  return ctx;
}

/** Compute bar color based on spend vs cap */
export function getBudgetBarColor(spend: number, cap: number | undefined, defaultColor: string): string {
  if (!cap) return defaultColor;
  const pct = spend / cap;
  if (pct >= 1) return '#FF4757';   // red — over budget
  if (pct >= 0.8) return '#F59E0B'; // amber — approaching limit
  return defaultColor;
}
