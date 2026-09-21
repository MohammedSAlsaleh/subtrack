import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelTrialNotification,
  requestNotificationPermission,
  scheduleTrialNotification,
} from '@/utils/trialNotifications';

export type Category = 'streaming' | 'software' | 'fitness' | 'food' | 'gaming' | 'utilities' | 'education' | 'other';
export type BillingCycle = 'weekly' | 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'excluded';

export interface Subscription {
  id: string;
  name: string;
  merchantName: string;
  category: Category;
  amount: number;
  currency: 'SAR';
  billingCycle: BillingCycle;
  nextBillingDate: string;
  color: string;
  icon: string;
  status: SubscriptionStatus;
  bankAccountId?: string;
  startedAt: string;
  includesVat?: boolean;
  sharedMembers?: number; // 1 = solo (default), 2-6 = shared
  isTrial?: boolean;
  trialEndsAt?: string;  // ISO date string e.g. '2026-07-25'
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  lastFour: string;
  connectedAt: string;
  leanEntityId: string;
}

interface AppState {
  subscriptions: Subscription[];
  banks: BankAccount[];
  loading: boolean;
  addSubscription: (sub: Omit<Subscription, 'id' | 'startedAt'>) => Promise<string>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  excludeSubscription: (id: string) => Promise<void>;
  restoreSubscription: (id: string) => Promise<void>;
  addBank: (bank: Omit<BankAccount, 'id' | 'connectedAt'>) => Promise<string>;
  removeBank: (id: string) => Promise<void>;
  monthlyTotal: number;
  activeCount: number;
  excludedCount: number;
  clearAll: () => Promise<void>;
}

const STORAGE_KEY_SUBS = '@subtrack_subscriptions';
const STORAGE_KEY_BANKS = '@subtrack_banks';

/**
 * Large pool of realistic subscriptions.
 * Dates are intentionally omitted — the bank-seeding code generates
 * randomised nextBillingDate and startedAt values at runtime so the
 * demo looks different every time a fresh account is created.
 */
export type SubscriptionTemplate = Omit<Subscription, 'id' | 'startedAt' | 'nextBillingDate'>;

export const SUBSCRIPTION_POOL: SubscriptionTemplate[] = [
  // ── Streaming ────────────────────────────────────────────────────────────
  { name: 'Netflix',          merchantName: 'Netflix Inc.',                  category: 'streaming',  amount: 39.99,  currency: 'SAR', billingCycle: 'monthly', color: '#E50914', icon: 'tv',          status: 'active'    },
  { name: 'Shahid VIP',       merchantName: 'MBC Group',                     category: 'streaming',  amount: 29.99,  currency: 'SAR', billingCycle: 'monthly', color: '#FF6B35', icon: 'play-circle', status: 'active'    },
  { name: 'Spotify',          merchantName: 'Spotify AB',                    category: 'streaming',  amount: 19.99,  currency: 'SAR', billingCycle: 'monthly', color: '#1DB954', icon: 'music',       status: 'active'    },
  { name: 'OSN+',             merchantName: 'OSN Streaming',                 category: 'streaming',  amount: 55.00,  currency: 'SAR', billingCycle: 'monthly', color: '#8B5CF6', icon: 'monitor',     status: 'cancelled' },
  { name: 'Disney+',          merchantName: 'The Walt Disney Company',       category: 'streaming',  amount: 29.99,  currency: 'SAR', billingCycle: 'monthly', color: '#113CCF', icon: 'star',        status: 'active'    },
  { name: 'Anghami Plus',     merchantName: 'Anghami',                       category: 'streaming',  amount: 14.99,  currency: 'SAR', billingCycle: 'monthly', color: '#5C33CF', icon: 'headphones',  status: 'active'    },
  { name: 'YouTube Premium',  merchantName: 'Google LLC',                    category: 'streaming',  amount: 24.99,  currency: 'SAR', billingCycle: 'monthly', color: '#FF0000', icon: 'video',       status: 'active'    },
  { name: 'Apple TV+',        merchantName: 'Apple Inc.',                    category: 'streaming',  amount: 19.99,  currency: 'SAR', billingCycle: 'monthly', color: '#555555', icon: 'tv',          status: 'active'    },
  { name: 'Starzplay',        merchantName: 'Starzplay Arabia',              category: 'streaming',  amount: 25.00,  currency: 'SAR', billingCycle: 'monthly', color: '#003B8E', icon: 'film',        status: 'active'    },
  { name: 'Jawwy TV',         merchantName: 'STC Jawwy',                     category: 'streaming',  amount: 22.00,  currency: 'SAR', billingCycle: 'monthly', color: '#00A86B', icon: 'play-circle', status: 'active'    },
  // ── Software / Productivity ──────────────────────────────────────────────
  { name: 'Microsoft 365',         merchantName: 'Microsoft Corporation',    category: 'software',   amount: 45.00,  currency: 'SAR', billingCycle: 'monthly', color: '#0078D4', icon: 'grid',        status: 'active'    },
  { name: 'Adobe Creative Cloud',  merchantName: 'Adobe Inc.',               category: 'software',   amount: 219.00, currency: 'SAR', billingCycle: 'monthly', color: '#FF0000', icon: 'feather',     status: 'active'    },
  { name: 'Notion Pro',            merchantName: 'Notion Labs Inc.',         category: 'software',   amount: 20.00,  currency: 'SAR', billingCycle: 'monthly', color: '#191919', icon: 'file-text',   status: 'active'    },
  { name: 'Canva Pro',             merchantName: 'Canva Pty Ltd',            category: 'software',   amount: 55.00,  currency: 'SAR', billingCycle: 'monthly', color: '#7FCCCC', icon: 'layout',      status: 'active'    },
  { name: 'ChatGPT Plus',          merchantName: 'OpenAI',                   category: 'software',   amount: 75.00,  currency: 'SAR', billingCycle: 'monthly', color: '#74AA9C', icon: 'cpu',         status: 'active'    },
  { name: 'Figma Pro',             merchantName: 'Figma Inc.',               category: 'software',   amount: 60.00,  currency: 'SAR', billingCycle: 'monthly', color: '#F24E1E', icon: 'triangle',    status: 'active'    },
  { name: 'Dropbox Plus',          merchantName: 'Dropbox Inc.',             category: 'software',   amount: 40.00,  currency: 'SAR', billingCycle: 'monthly', color: '#0061FF', icon: 'archive',     status: 'active'    },
  { name: 'Zoom Pro',              merchantName: 'Zoom Video Communications',category: 'software',   amount: 60.00,  currency: 'SAR', billingCycle: 'monthly', color: '#2D8CFF', icon: 'video',       status: 'active'    },
  { name: 'GitHub Pro',            merchantName: 'GitHub Inc.',              category: 'software',   amount: 18.75,  currency: 'SAR', billingCycle: 'monthly', color: '#24292F', icon: 'code',        status: 'active'    },
  // ── Utilities / Cloud Storage ────────────────────────────────────────────
  { name: 'Amazon Prime',   merchantName: 'Amazon.com Inc.',                 category: 'utilities',  amount: 11.99,  currency: 'SAR', billingCycle: 'monthly', color: '#FF9900', icon: 'package',     status: 'active'    },
  { name: 'Google One',     merchantName: 'Google LLC',                      category: 'utilities',  amount: 10.99,  currency: 'SAR', billingCycle: 'monthly', color: '#4285F4', icon: 'cloud',       status: 'active'    },
  { name: 'iCloud+ 200 GB', merchantName: 'Apple Inc.',                      category: 'utilities',  amount: 15.99,  currency: 'SAR', billingCycle: 'monthly', color: '#555555', icon: 'cloud',       status: 'active'    },
  // ── Education ────────────────────────────────────────────────────────────
  { name: 'Duolingo Plus',      merchantName: 'Duolingo Inc.',               category: 'education',  amount: 29.99,  currency: 'SAR', billingCycle: 'monthly', color: '#58CC02', icon: 'book-open',   status: 'active'    },
  { name: 'Coursera Plus',      merchantName: 'Coursera Inc.',               category: 'education',  amount: 65.00,  currency: 'SAR', billingCycle: 'annual',  color: '#0056D2', icon: 'book',        status: 'active'    },
  { name: 'LinkedIn Learning',  merchantName: 'LinkedIn Corporation',        category: 'education',  amount: 80.00,  currency: 'SAR', billingCycle: 'monthly', color: '#0A66C2', icon: 'briefcase',   status: 'active'    },
  // ── Fitness / Wellbeing ──────────────────────────────────────────────────
  { name: 'Strava Premium',  merchantName: 'Strava Inc.',                    category: 'fitness',    amount: 30.00,  currency: 'SAR', billingCycle: 'monthly', color: '#FC4C02', icon: 'activity',    status: 'active'    },
  { name: 'Headspace',       merchantName: 'Headspace Inc.',                 category: 'fitness',    amount: 25.00,  currency: 'SAR', billingCycle: 'monthly', color: '#F47D31', icon: 'heart',       status: 'active'    },
  { name: 'Calm',            merchantName: 'Calm.com Inc.',                  category: 'fitness',    amount: 35.00,  currency: 'SAR', billingCycle: 'annual',  color: '#5BB8E3', icon: 'sunrise',     status: 'active'    },
  // ── Gaming ───────────────────────────────────────────────────────────────
  { name: 'Xbox Game Pass',     merchantName: 'Microsoft Corporation',       category: 'gaming',     amount: 34.99,  currency: 'SAR', billingCycle: 'monthly', color: '#107C10', icon: 'monitor',     status: 'active'    },
  { name: 'PlayStation Plus',   merchantName: 'Sony Interactive Entertainment', category: 'gaming',  amount: 45.00,  currency: 'SAR', billingCycle: 'monthly', color: '#003087', icon: 'monitor',     status: 'active'    },
];

// Keep legacy name so existing code compiles until fully migrated
export const SAMPLE_SUBSCRIPTIONS = SUBSCRIPTION_POOL;

const SubscriptionContext = createContext<AppState | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Mirrors of state used by persist helpers so reads are never stale
  const subsRef  = useRef<Subscription[]>([]);
  const banksRef = useRef<BankAccount[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [subsRaw, banksRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SUBS),
          AsyncStorage.getItem(STORAGE_KEY_BANKS),
        ]);
        const parsedBanks: BankAccount[] = banksRaw ? JSON.parse(banksRaw) : [];
        if (banksRaw) {
          banksRef.current = parsedBanks;
          setBanks(parsedBanks);
        }
        // Only restore stored subscriptions if at least one bank is connected.
        // This prevents stale sample/demo data from appearing before a bank is linked.
        if (subsRaw && parsedBanks.length > 0) {
          const parsedSubs: Subscription[] = JSON.parse(subsRaw);
          subsRef.current = parsedSubs;
          setSubscriptions(parsedSubs);
        } else if (parsedBanks.length === 0) {
          // Clear any leftover sample subscriptions so a fresh bank connection starts clean.
          await AsyncStorage.removeItem(STORAGE_KEY_SUBS);
        }
      } catch (e) {
        subsRef.current = SAMPLE_SUBSCRIPTIONS;
        setSubscriptions(SAMPLE_SUBSCRIPTIONS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /**
   * Each saveSubs / saveBanks updates the corresponding ref synchronously,
   * schedules a React state update, then awaits the AsyncStorage write.
   * Callers who await these helpers are guaranteed storage reflects the
   * mutation before they continue — no fire-and-forget.
   */
  const saveSubs = useCallback(async (subs: Subscription[]) => {
    subsRef.current = subs;
    setSubscriptions(subs);
    await AsyncStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(subs));
  }, []);

  const saveBanks = useCallback(async (b: BankAccount[]) => {
    banksRef.current = b;
    setBanks(b);
    await AsyncStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(b));
  }, []);

  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id' | 'startedAt'>): Promise<string> => {
    const newSub: Subscription = {
      ...sub,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      startedAt: new Date().toISOString().split('T')[0],
    };
    await saveSubs([newSub, ...subsRef.current]);

    // Schedule a trial-end notification if applicable.
    if (newSub.isTrial && newSub.trialEndsAt) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleTrialNotification(newSub.id, newSub.name, newSub.trialEndsAt);
      }
    }
    return newSub.id;
  }, [saveSubs]);

  const updateSubscription = useCallback(async (id: string, updates: Partial<Subscription>) => {
    const merged = subsRef.current.find(s => s.id === id);
    const mergedNext = merged ? { ...merged, ...updates } : undefined;
    await saveSubs(subsRef.current.map(s => s.id === id ? { ...s, ...updates } : s));

    // Reschedule or cancel the trial notification based on updated state.
    if (mergedNext) {
      if (mergedNext.isTrial && mergedNext.trialEndsAt && mergedNext.status !== 'cancelled') {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleTrialNotification(mergedNext.id, mergedNext.name, mergedNext.trialEndsAt);
        }
      } else {
        // Trial was removed, end date was cleared, or subscription was cancelled —
        // cancel any pending notification.
        await cancelTrialNotification(id);
      }
    }
  }, [saveSubs]);

  const removeSubscription = useCallback(async (id: string) => {
    await saveSubs(subsRef.current.filter(s => s.id !== id));
    // Cancel any pending trial notification for the removed subscription.
    await cancelTrialNotification(id);
  }, [saveSubs]);

  const excludeSubscription = useCallback(async (id: string) => {
    await saveSubs(subsRef.current.map(s =>
      s.id === id ? { ...s, status: 'excluded' as SubscriptionStatus } : s,
    ));
    await cancelTrialNotification(id);
  }, [saveSubs]);

  const restoreSubscription = useCallback(async (id: string) => {
    await saveSubs(subsRef.current.map(s =>
      s.id === id ? { ...s, status: 'active' as SubscriptionStatus } : s,
    ));
  }, [saveSubs]);

  const addBank = useCallback(async (bank: Omit<BankAccount, 'id' | 'connectedAt'>): Promise<string> => {
    const newBank: BankAccount = {
      ...bank,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      connectedAt: new Date().toISOString(),
    };
    await saveBanks([newBank, ...banksRef.current]);
    return newBank.id;
  }, [saveBanks]);

  const removeBank = useCallback(async (id: string) => {
    await saveBanks(banksRef.current.filter(b => b.id !== id));
  }, [saveBanks]);

  const activeSubscriptions   = subscriptions.filter(s => s.status === 'active');
  const excludedSubscriptions = subscriptions.filter(s => s.status === 'excluded');

  const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
    const members = sub.sharedMembers && sub.sharedMembers > 1 ? sub.sharedMembers : 1;
    const share = sub.amount / members;
    if (sub.billingCycle === 'monthly') return total + share;
    if (sub.billingCycle === 'annual') return total + share / 12;
    if (sub.billingCycle === 'weekly') return total + share * 4.33;
    return total;
  }, 0);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        banks,
        loading,
        addSubscription,
        updateSubscription,
        removeSubscription,
        excludeSubscription,
        restoreSubscription,
        addBank,
        removeBank,
        monthlyTotal,
        activeCount: activeSubscriptions.length,
        excludedCount: excludedSubscriptions.length,
        clearAll: async () => {
          subsRef.current = [];
          banksRef.current = [];
          setSubscriptions([]);
          setBanks([]);
          await AsyncStorage.multiRemove([STORAGE_KEY_SUBS, STORAGE_KEY_BANKS]);
        },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptions must be used within SubscriptionProvider');
  return ctx;
}

export function getCategoryLabel(cat: Category): string {
  const labels: Record<Category, string> = {
    streaming: 'Streaming',
    software: 'Software',
    fitness: 'Fitness',
    food: 'Food & Drink',
    gaming: 'Gaming',
    utilities: 'Utilities',
    education: 'Education',
    other: 'Other',
  };
  return labels[cat];
}

/**
 * Returns the normalized monthly cost for a subscription from the user's perspective,
 * accounting for both the billing cycle and any shared-members split.
 * Use this everywhere spend is aggregated — dashboards, analytics, snapshots — so
 * all screens are consistent with the monthlyTotal in SubscriptionContext.
 */
export function getMonthlyShareAmount(sub: Subscription): number {
  const members = sub.sharedMembers && sub.sharedMembers > 1 ? sub.sharedMembers : 1;
  const share = sub.amount / members;
  if (sub.billingCycle === 'monthly') return share;
  if (sub.billingCycle === 'annual') return share / 12;
  if (sub.billingCycle === 'weekly') return share * 4.33;
  return share;
}

export function getCategoryColor(cat: Category): string {
  const palette: Record<Category, string> = {
    streaming: '#FF6B6B',
    software: '#4ECDC4',
    fitness: '#45B7D1',
    food: '#FFA07A',
    gaming: '#A78BFA',
    utilities: '#FFD93D',
    education: '#6BCB77',
    other: '#C9CDD4',
  };
  return palette[cat];
}
