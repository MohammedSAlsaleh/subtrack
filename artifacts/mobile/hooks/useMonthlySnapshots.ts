import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription, getMonthlyShareAmount } from '@/context/SubscriptionContext';

const STORAGE_KEY = '@subtrack_monthly_snapshots';
const BACKFILL_FLAG_KEY = '@subtrack_snapshots_backfilled';
const MAX_MONTHS = 12;

export interface MonthlySnapshot {
  month: string;   // "YYYY-MM"
  subs: number;
  bills: number;
  loans: number;
  total: number;
}

/** Formats a Date as "YYYY-MM" */
function toYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns every "YYYY-MM" string from startYYYYMM up to (but not including) endYYYYMM */
function monthsRange(startYYYYMM: string, endYYYYMM: string): string[] {
  const months: string[] = [];
  let [y, m] = startYYYYMM.split('-').map(Number);
  const [ey, em] = endYYYYMM.split('-').map(Number);
  while (y < ey || (y === ey && m < em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

/**
 * Builds synthetic historical snapshots for all months from the earliest
 * subscription startedAt up to (not including) the current month.
 *
 * For each past month we include every active subscription that had already
 * started by that month. Bills and loans use their current monthly totals
 * as a reasonable approximation (we have no historical data for them).
 */
function buildBackfillSnapshots(
  subscriptions: Subscription[],
  currentBills: number,
  currentLoans: number,
): MonthlySnapshot[] {
  const activeSubs = subscriptions.filter(s => s.status === 'active' && s.startedAt);
  if (activeSubs.length === 0) return [];

  const currentMonth = toYYYYMM(new Date());

  // Earliest start month across all active subscriptions
  const earliest = activeSubs.reduce((min, s) => {
    const sm = s.startedAt.slice(0, 7);
    return sm < min ? sm : min;
  }, currentMonth);

  if (earliest >= currentMonth) return []; // Nothing before today

  const pastMonths = monthsRange(earliest, currentMonth);

  return pastMonths.map(month => {
    let subsTotal = 0;
    activeSubs.forEach(sub => {
      const startMonth = sub.startedAt.slice(0, 7);
      if (startMonth <= month) {
        // Use per-user share so historical totals match the share-adjusted monthlyTotal
        subsTotal += getMonthlyShareAmount(sub);
      }
    });
    return {
      month,
      subs: subsTotal,
      bills: currentBills,
      loans: currentLoans,
      total: subsTotal + currentBills + currentLoans,
    };
  });
}

/**
 * Persists a monthly spending snapshot and returns the last MAX_MONTHS of history.
 * Automatically writes/updates the current month's entry whenever any total changes.
 *
 * On first use (when no backfill flag is present in storage), synthesises
 * historical snapshots from each subscription's startedAt date so the bar
 * chart shows realistic data from day one rather than a single current-month stub.
 */
export function useMonthlySnapshots(
  subs: number,
  bills: number,
  loans: number,
  subscriptions: Subscription[] = [],
): MonthlySnapshot[] {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const initialized = useRef(false);
  const backfillAttempted = useRef(false);

  // ── Load persisted snapshots once on mount ───────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setSnapshots(JSON.parse(raw)); } catch { /* ignore */ }
      }
      initialized.current = true;
    });
  }, []);

  // ── One-time backfill when subscriptions become available ────────────────
  // Runs whenever subscriptions change, but only does work once per install
  // (guarded by BACKFILL_FLAG_KEY in AsyncStorage).
  useEffect(() => {
    if (!initialized.current) return;
    if (backfillAttempted.current) return;
    if (subscriptions.length === 0) return;

    backfillAttempted.current = true;

    AsyncStorage.getItem(BACKFILL_FLAG_KEY).then(async alreadyDone => {
      // Mark as done regardless so we don't retry on every cold start
      await AsyncStorage.setItem(BACKFILL_FLAG_KEY, '1');

      if (alreadyDone) return; // Real accumulated data already exists — leave it alone

      const backfillSnaps = buildBackfillSnapshots(subscriptions, bills, loans);
      if (backfillSnaps.length === 0) return;

      setSnapshots(prev => {
        const existingMonths = new Set(prev.map(s => s.month));
        // Backfill only fills months not already present
        const merged = [
          ...backfillSnaps.filter(s => !existingMonths.has(s.month)),
          ...prev,
        ]
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-MAX_MONTHS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    });
  // subscriptions identity changes when context re-renders; we use .length
  // as a stable proxy so the effect fires once subscriptions are loaded.
  // bills/loans are captured at backfill time (best-available approximation).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions.length, initialized.current]);

  // ── Write/update current month whenever totals change ───────────────────
  useEffect(() => {
    if (!initialized.current) return;
    const month = toYYYYMM(new Date());
    const total = subs + bills + loans;
    setSnapshots(prev => {
      const idx = prev.findIndex(s => s.month === month);
      let next: MonthlySnapshot[];
      if (idx >= 0) {
        next = prev.map((s, i) => i === idx ? { month, subs, bills, loans, total } : s);
      } else {
        next = [...prev, { month, subs, bills, loans, total }];
      }
      // Keep only the most recent MAX_MONTHS, sorted ascending
      next = next
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-MAX_MONTHS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, bills, loans]);

  return snapshots;
}
