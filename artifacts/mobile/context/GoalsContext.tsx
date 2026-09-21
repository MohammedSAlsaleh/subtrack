import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@subtrack_goals';

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string; // ISO date string (optional)
  createdAt: string;
}

// ── Presets ───────────────────────────────────────────────────────────────────
export interface GoalPreset {
  name: string;
  nameAr: string;
  emoji: string;
  targetAmount: number;
}

export const GOAL_PRESETS: GoalPreset[] = [
  { name: 'Hajj',          nameAr: 'حج',          emoji: '🕋', targetAmount: 15000 },
  { name: 'Umrah',         nameAr: 'عمرة',         emoji: '🌙', targetAmount:  5000 },
  { name: 'Emergency Fund', nameAr: 'صندوق الطوارئ', emoji: '🛡️', targetAmount: 20000 },
  { name: 'Vacation',      nameAr: 'إجازة',        emoji: '✈️', targetAmount:  8000 },
  { name: 'New Car',       nameAr: 'سيارة جديدة',  emoji: '🚗', targetAmount: 80000 },
  { name: 'Wedding',       nameAr: 'زفاف',         emoji: '💍', targetAmount: 50000 },
];

// ── Monthly rate calculation ──────────────────────────────────────────────────
/** Returns SAR/month needed to hit targetDate, or null if no date */
export function monthlyRateNeeded(goal: Goal): number | null {
  if (!goal.targetDate) return null;
  const remaining = goal.targetAmount - goal.savedAmount;
  if (remaining <= 0) return 0;
  const now = new Date();
  const target = new Date(goal.targetDate);
  const monthsLeft = (target.getFullYear() - now.getFullYear()) * 12
    + (target.getMonth() - now.getMonth());
  if (monthsLeft <= 0) return remaining; // overdue
  return remaining / monthsLeft;
}

/** Days until target date */
export function daysUntilGoal(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Progress ratio 0–1 */
export function goalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(goal.savedAmount / goal.targetAmount, 1);
}

// ── Context ───────────────────────────────────────────────────────────────────
interface GoalsContextValue {
  goals: Goal[];
  totalSaved: number;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'savedAmount'>) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Pick<Goal, 'name' | 'emoji' | 'targetAmount' | 'targetDate'>>) => Promise<void>;
  logContribution: (id: string, amount: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);

  // Ref mirrors state so mutations can compute next without relying on
  // React's async batching — avoids calling AsyncStorage inside the
  // synchronous setGoals updater (fire-and-forget), while still keeping
  // the update and persist atomically paired in the same await chain.
  const goalsRef = useRef<Goal[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const parsed: Goal[] = JSON.parse(raw);
        goalsRef.current = parsed;
        setGoals(parsed);
      }
    });
  }, []);

  /**
   * Apply an updater to the current goals, flush state synchronously, then
   * await the AsyncStorage write. Callers MUST await this so that a force-quit
   * after the state update but before the write is as unlikely as possible —
   * the write happens in the same microtask tick as the state update.
   */
  const applyAndPersist = useCallback(async (updater: (prev: Goal[]) => Goal[]) => {
    const next = updater(goalsRef.current);
    goalsRef.current = next;
    setGoals(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'savedAmount'>) => {
    const newGoal: Goal = {
      ...goal,
      savedAmount: 0,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await applyAndPersist(prev => [...prev, newGoal]);
  }, [applyAndPersist]);

  const updateGoal = useCallback(async (id: string, patch: Partial<Pick<Goal, 'name' | 'emoji' | 'targetAmount' | 'targetDate'>>) => {
    await applyAndPersist(prev =>
      prev.map(g => g.id === id ? { ...g, ...patch } : g)
    );
  }, [applyAndPersist]);

  const logContribution = useCallback(async (id: string, amount: number) => {
    // Guard: reject if the goal no longer exists (task #52) before mutating
    if (!goalsRef.current.some(g => g.id === id)) {
      throw new Error('GOAL_NOT_FOUND');
    }
    await applyAndPersist(prev =>
      prev.map(g =>
        g.id === id ? { ...g, savedAmount: g.savedAmount + amount } : g
      )
    );
  }, [applyAndPersist]);

  const removeGoal = useCallback(async (id: string) => {
    await applyAndPersist(prev => prev.filter(g => g.id !== id));
  }, [applyAndPersist]);

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);

  return (
    <GoalsContext.Provider value={{ goals, totalSaved, addGoal, updateGoal, logContribution, removeGoal }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}
