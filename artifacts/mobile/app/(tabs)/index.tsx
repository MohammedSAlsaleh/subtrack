import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions, getCategoryColor, getCategoryLabel, Category, getMonthlyShareAmount } from '@/context/SubscriptionContext';
import { useBudgets } from '@/context/BudgetContext';
import { useLoans, LOAN_TYPE_ICON, LOAN_TYPE_COLOR, daysUntil } from '@/context/LoanContext';
import { useGoals } from '@/context/GoalsContext';
import { useBills, BILL_CAT_ICON, BILL_CAT_COLOR, daysUntilDue } from '@/context/BillsContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { ConfirmModal, ConfirmConfig } from '@/components/ConfirmModal';

function formatSAR(amount: number) {
  return amount.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Unified upcoming item ────────────────────────────────────────────────────
type UpcomingKind = 'subscription' | 'loan' | 'bill' | 'trial';

interface UpcomingItem {
  id: string;
  name: string;
  sublabel: string;
  amount: number;
  color: string;
  icon: string;
  daysLeft: number;
  kind: UpcomingKind;
  kindLabel: string;
  kindColor: string;
  route: string;
}

const DUE_SOON_DAYS = 3;

// ─── Suggested subscriptions (popular services in Saudi Arabia) ──────────────
interface SuggestedSub {
  name: string;
  merchantName: string;
  category: Category;
  amount: number;
  color: string;
  icon: string;
}

const SUGGESTED_SUBS: SuggestedSub[] = [
  { name: 'Shahid VIP',      merchantName: 'MBC Group',   category: 'streaming', amount: 29.99, color: '#00C2FF', icon: 'tv' },
  { name: 'Anghami Plus',    merchantName: 'Anghami',     category: 'streaming', amount: 21.99, color: '#A020F0', icon: 'music' },
  { name: 'STC TV',          merchantName: 'STC',         category: 'streaming', amount: 25.00, color: '#4F008C', icon: 'tv' },
  { name: 'YouTube Premium', merchantName: 'Google',      category: 'streaming', amount: 23.99, color: '#FF0000', icon: 'youtube' },
  { name: 'Netflix',         merchantName: 'Netflix Inc.',category: 'streaming', amount: 39.99, color: '#E50914', icon: 'tv' },
  { name: 'Spotify',         merchantName: 'Spotify AB',  category: 'streaming', amount: 21.99, color: '#1DB954', icon: 'music' },
  { name: 'iCloud+',         merchantName: 'Apple',       category: 'software',  amount: 11.99, color: '#3B82F6', icon: 'cloud' },
  { name: 'OSN+',            merchantName: 'OSN',         category: 'streaming', amount: 35.00, color: '#F97316', icon: 'film' },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptions, banks, monthlyTotal, activeCount, addSubscription } = useSubscriptions();
  const banksConnected = banks.length > 0;
  const { loans, monthlyPayments } = useLoans();
  const { goals, totalSaved } = useGoals();
  const { bills, monthlyBillsTotal } = useBills();
  const { user } = useAuth();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();

  const { getCap } = useBudgets();
  const isPremium = !!user?.isPremium;

  // ── First-time bank connect prompt ─────────────────────────────────────────
  const [bankPrompt, setBankPrompt] = useState<ConfirmConfig | null>(null);

  useEffect(() => {
    if (!user || banksConnected) return;
    AsyncStorage.getItem('@subtrack_bank_prompt_shown').then(v => {
      if (v === '1') return;
      setBankPrompt({
        title: t('bank_prompt_title'),
        message: t('bank_prompt_msg'),
        confirmLabel: t('bank_prompt_connect'),
        cancelLabel: t('cancel'),
        onConfirm: () => {
          AsyncStorage.setItem('@subtrack_bank_prompt_shown', '1');
          router.push('/(tabs)/banks');
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banksConnected, user?.id]);

  const dismissBankPrompt = useCallback(() => {
    AsyncStorage.setItem('@subtrack_bank_prompt_shown', '1');
    setBankPrompt(null);
  }, []);

  // ── Overspend banner dismissal ─────────────────────────────────────────────
  const [overspendDismissed, setOverspendDismissed] = useState(false);

  // Key changes each calendar month so it reappears the following month
  const dismissKey = `@subtrack_overspend_dismissed_${new Date().getFullYear()}_${new Date().getMonth()}`;

  useEffect(() => {
    AsyncStorage.getItem(dismissKey).then(v => {
      if (v === '1') setOverspendDismissed(true);
    });
  }, [dismissKey]);

  const dismissOverspendBanner = useCallback(async () => {
    setOverspendDismissed(true);
    await AsyncStorage.setItem(dismissKey, '1');
  }, [dismissKey]);

  // ── Unified monthly outflow ────────────────────────────────────────────────
  const totalMonthlyOutflow = monthlyTotal + monthlyBillsTotal + monthlyPayments;

  // ── Overspend alert logic ──────────────────────────────────────────────────
  const income = user?.income ?? 0;
  const overspendRatio = income > 0 ? totalMonthlyOutflow / income : 0;
  const showOverspendBanner = banksConnected && income > 0 && overspendRatio >= 0.9 && !overspendDismissed;
  const isOverBudget = overspendRatio >= 1.0;

  // ── Subscription upcoming (within 14 days, include 3-day overdue) ─────────
  const active = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);

  const subItems: UpcomingItem[] = useMemo(() => active.map(s => {
    const now = new Date();
    const date = new Date(s.nextBillingDate);
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: `sub_${s.id}`, name: s.name, sublabel: 'Subscription',
      amount: s.amount, color: s.color, icon: s.icon, daysLeft,
      kind: 'subscription' as UpcomingKind, kindLabel: 'Sub', kindColor: s.color,
      route: `/subscription/${s.id}`,
    };
  }).filter(i => i.daysLeft >= -3 && i.daysLeft <= 14), [active]);

  // ── Trial expiry items (within 14 days) ────────────────────────────────────
  const trialItems: UpcomingItem[] = useMemo(() => active
    .filter(s => s.isTrial && s.trialEndsAt)
    .map(s => {
      const now = new Date();
      const date = new Date(s.trialEndsAt!);
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `trial_${s.id}`, name: s.name, sublabel: t('trial_ends'),
        amount: s.amount, color: '#F59E0B', icon: 'clock', daysLeft,
        kind: 'trial' as UpcomingKind, kindLabel: t('kind_trial'), kindColor: '#F59E0B',
        route: `/subscription/${s.id}`,
      };
    })
    .filter(i => i.daysLeft >= 0 && i.daysLeft <= 14),
    [active]);

  // ── Loan upcoming (within 14 days, include overdue) ───────────────────────
  const loanItems: UpcomingItem[] = useMemo(() => loans
    .map(l => {
      const d = daysUntil(l.nextPaymentDate);
      const typeLabel = l.type === 'credit_card' ? 'Card' : l.type === 'bnpl' ? 'BNPL' : 'Loan';
      return {
        id: `loan_${l.id}`, name: l.name, sublabel: l.lender,
        amount: l.nextPaymentAmount, color: LOAN_TYPE_COLOR[l.type],
        icon: LOAN_TYPE_ICON[l.type], daysLeft: d,
        kind: 'loan' as UpcomingKind, kindLabel: typeLabel, kindColor: LOAN_TYPE_COLOR[l.type],
        route: '/(tabs)/loans',
      };
    })
    .filter(i => i.daysLeft <= 14), [loans]);

  // ── Bill upcoming (within 14 days) ──────────────────────────────────────
  const billItems: UpcomingItem[] = useMemo(() => bills
    .map(b => {
      const d = daysUntilDue(b.dueDayOfMonth);
      return {
        id: `bill_${b.id}`, name: b.name, sublabel: b.category,
        amount: b.amount, color: BILL_CAT_COLOR[b.category],
        icon: BILL_CAT_ICON[b.category], daysLeft: d,
        kind: 'bill' as UpcomingKind, kindLabel: 'Bill', kindColor: BILL_CAT_COLOR[b.category],
        route: '/(tabs)/bills',
      };
    })
    .filter(i => i.daysLeft <= 14), [bills]);

  // ── Merge & sort all upcoming items ───────────────────────────────────────
  const upcomingAll: UpcomingItem[] = useMemo(() => {
    return [...subItems, ...trialItems, ...loanItems, ...billItems]
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subItems, trialItems, loanItems, billItems]);

  // ── Due-soon items (within 3 days, including trials) ─────────────────────
  const dueSoonItems: UpcomingItem[] = useMemo(() => {
    const regular = upcomingAll.filter(i => i.kind !== 'trial' && i.daysLeft <= DUE_SOON_DAYS);
    const trials  = trialItems.filter(i => i.daysLeft <= DUE_SOON_DAYS);
    // merge, dedup by id, sort
    const merged = [...regular, ...trials];
    const seen = new Set<string>();
    return merged.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [upcomingAll, trialItems]);

  // ── Remaining upcoming (beyond 3 days) ────────────────────────────────────
  const upcomingRest: UpcomingItem[] = useMemo(() =>
    upcomingAll.filter(i => !dueSoonItems.some(d => d.id === i.id)),
    [upcomingAll, dueSoonItems]);

  // ── Category breakdown (subscriptions only) ───────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    active.forEach(s => {
      map[s.category] = (map[s.category] ?? 0) + getMonthlyShareAmount(s);
    });
    return Object.entries(map).map(([cat, amt]) => ({ cat: cat as Category, amt })).sort((a, b) => b.amt - a.amt);
  }, [active]);

  // ── Top-category income share (only when income is set) ───────────────────
  const topCatIncomePct = useMemo(() => {
    if (income <= 0 || categoryBreakdown.length === 0) return null;
    const top = categoryBreakdown[0];
    return Math.round((top.amt / income) * 100);
  }, [income, categoryBreakdown]);

  const suggestedSubs = useMemo(() => {
    const tracked = new Set(subscriptions.map(s => s.name.toLowerCase()));
    return SUGGESTED_SUBS.filter(s => !tracked.has(s.name.toLowerCase()));
  }, [subscriptions]);

  const handleAddSuggested = useCallback(async (s: SuggestedSub) => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await addSubscription({
      name: s.name,
      merchantName: s.merchantName,
      category: s.category,
      amount: s.amount,
      currency: 'SAR',
      billingCycle: 'monthly',
      nextBillingDate: next.toISOString().split('T')[0],
      color: s.color,
      icon: s.icon,
      status: 'active',
    });
  }, [addSubscription]);
  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const dueLabel = (d: number) => {
    if (d < 0) return t('loans_overdue');
    if (d === 0) return t('today');
    if (d === 1) return t('tomorrow');
    return `${d}d`;
  };

  const isUrgent = (d: number) => d <= 3;

  // ── Render card used for both sections ────────────────────────────────────
  const renderUpcomingCard = (item: UpcomingItem) => {
    const overdue  = item.daysLeft < 0;
    const urgent   = isUrgent(item.daysLeft);
    const isTrial  = item.kind === 'trial';
    const badgeBg  = overdue ? '#FF475720' : urgent || isTrial ? (isTrial ? '#F59E0B20' : '#FFD93D20') : colors.secondary;
    const badgeClr = overdue ? '#FF4757'   : urgent ? '#F59E0B'   : colors.primary;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.8}
        style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: overdue ? '#FF475740' : isTrial ? '#F59E0B40' : colors.border, borderRadius: colors.radius }]}
      >
        <View style={[styles.upcomingIcon, { backgroundColor: item.color + '20' }]}>
          <Feather name={item.icon as any} size={18} color={item.color} />
        </View>
        <Text style={[styles.upcomingName, { color: colors.foreground, fontFamily: fonts.semibold }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.upcomingAmount, { color: colors.foreground, fontFamily: fonts.bold }]}>SAR {formatSAR(item.amount)}</Text>
        <View style={styles.upcomingFooter}>
          <View style={[styles.kindBadge, { backgroundColor: item.kindColor + '20' }]}>
            <Text style={[styles.kindBadgeText, { color: item.kindColor, fontFamily: fonts.semibold }]}>{item.kindLabel}</Text>
          </View>
          <View style={[styles.upcomingBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.upcomingBadgeText, { color: badgeClr, fontFamily: fonts.semibold }]}>{dueLabel(item.daysLeft)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
    >
      <ConfirmModal config={bankPrompt} onClose={dismissBankPrompt} />
      {/* ── Hero ── */}
      <LinearGradient
        colors={['#6C5CE7', '#9D8FF8', '#A78BFA']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPadding + 20 }]}
      >
        <View style={[styles.heroHeader, rtl.row()]}>
          <View>
            <Text style={[styles.heroGreeting, { fontFamily: fonts.regular }]}>
              {(() => {
                const h = new Date().getHours();
                if (h < 12) return t('dash_good_morning');
                if (h < 18) return t('dash_good_afternoon');
                return t('dash_good_evening');
              })()}
            </Text>
            <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>
              {user?.name?.split(' ')[0] ?? ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(tabs)/settings')}>
            <Feather name="settings" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCenterBlock}>
          <Text style={[styles.heroLabel, { fontFamily: fonts.medium }]}>{t('dash_total_outflow')}</Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.heroAmount, { fontFamily: fonts.bold }]}>
              {banksConnected ? `SAR ${formatSAR(totalMonthlyOutflow)}` : 'SAR —'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/analytics')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.heroAnalyticsBtn}
              activeOpacity={0.7}
            >
              <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
          {banksConnected ? (
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Feather name="repeat" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.heroPillText, { fontFamily: fonts.regular }]}>
                  SAR {formatSAR(monthlyTotal)}
                </Text>
              </View>
              <Text style={styles.heroPillDot}>·</Text>
              <View style={styles.heroPill}>
                <Feather name="file-text" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.heroPillText, { fontFamily: fonts.regular }]}>
                  SAR {formatSAR(monthlyBillsTotal)}
                </Text>
              </View>
              <Text style={styles.heroPillDot}>·</Text>
              <View style={styles.heroPill}>
                <Feather name="credit-card" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.heroPillText, { fontFamily: fonts.regular }]}>
                  SAR {formatSAR(monthlyPayments)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.heroPills}>
              <Text style={[styles.heroPillText, { fontFamily: fonts.regular, opacity: 0.6 }]}>
                Connect a bank to see your spending
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]} adjustsFontSizeToFit numberOfLines={1}>
              {banksConnected ? activeCount : '—'}
            </Text>
            <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('dash_active')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]} adjustsFontSizeToFit numberOfLines={1}>
              {banksConnected ? upcomingAll.length : '—'}
            </Text>
            <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('dash_due_soon')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, styles.heroStatValueYear, { fontFamily: fonts.bold }]} adjustsFontSizeToFit numberOfLines={1}>
              {banksConnected ? formatSAR(totalMonthlyOutflow * 12) : '—'}
            </Text>
            <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('dash_per_year')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Overspend banner ── */}
      {showOverspendBanner && (
        <View style={[
          styles.alertBanner,
          {
            backgroundColor: isOverBudget ? '#FF475712' : '#F59E0B12',
            borderColor: isOverBudget ? '#FF475740' : '#F59E0B40',
            borderRadius: colors.radius,
          },
        ]}>
          <View style={[styles.alertIcon, { backgroundColor: isOverBudget ? '#FF475720' : '#F59E0B20' }]}>
            <Feather name="alert-triangle" size={16} color={isOverBudget ? '#FF4757' : '#F59E0B'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: isOverBudget ? '#FF4757' : '#F59E0B', fontFamily: fonts.bold }]}>
              {isOverBudget ? t('alert_overspend_title') : t('alert_near_limit_title')}
            </Text>
            <Text style={[styles.alertBody, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
              {isOverBudget
                ? t('alert_overspend_body').replace('{amount}', formatSAR(totalMonthlyOutflow))
                : t('alert_near_limit_body')
                    .replace('{pct}', Math.round(overspendRatio * 100).toString())
                    .replace('{income}', formatSAR(income))
              }
            </Text>
          </View>
          <TouchableOpacity onPress={dismissOverspendBanner} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Premium banner (non-premium only) ── */}
      {!isPremium && (
        <TouchableOpacity onPress={() => router.push('/premium')} activeOpacity={0.85} style={{ marginHorizontal: 16, marginTop: 16 }}>
          <LinearGradient
            colors={['#1A0E3C', '#2D1B69']}
            style={[styles.premiumBanner, { borderRadius: colors.radius, borderColor: 'rgba(123,108,248,0.4)' }]}
          >
            <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.premiumBannerIcon}>
              <Feather name="star" size={16} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumBannerTitle, { fontFamily: fonts.bold }]}>{t('dash_premium_title')}</Text>
              <Text style={[styles.premiumBannerSub, { fontFamily: fonts.regular }]}>{t('dash_premium_sub')}</Text>
            </View>
            <View style={styles.premiumBannerCta}>
              <Text style={[styles.premiumBannerCtaText, { fontFamily: fonts.semibold }]}>{t('dash_premium_cta')}</Text>
              <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={12} color="#9D8FF8" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Premium feature cards (premium users) ── */}
      {isPremium && (
        <View style={[styles.section, { marginTop: 16 }]}>
          <View style={[styles.premiumCards, { gap: 10 }]}>
            <TouchableOpacity onPress={() => router.push('/budgets')} activeOpacity={0.8}
              style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.premiumCardIcon}>
                <Feather name="pie-chart" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.premiumCardTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_cat_budgets')}</Text>
              <Text style={[styles.premiumCardSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('dash_cat_budgets_sub')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/agent')} activeOpacity={0.8}
              style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <LinearGradient colors={['#F59E0B', '#FBBF24']} style={styles.premiumCardIcon}>
                <Feather name="cpu" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.premiumCardTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_budget_agent')}</Text>
              <Text style={[styles.premiumCardSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('dash_budget_agent_sub')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(tabs)/loans')} activeOpacity={0.8}
              style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <LinearGradient colors={['#FF6B6B', '#FF4757']} style={styles.premiumCardIcon}>
                <Feather name="credit-card" size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.premiumCardTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_loans')}</Text>
              <Text style={[styles.premiumCardSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('dash_loans_sub')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Savings goals widget — visible regardless of bank connection ── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, rtl.row()]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_goals_widget')}</Text>
          {goals.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: fonts.medium }]}>{t('see_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {goals.length > 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/goals')}
            activeOpacity={0.85}
            style={[styles.goalsWidget, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <View style={[styles.goalsWidgetIcon, { backgroundColor: '#16A34A20' }]}>
              <Text style={{ fontSize: 20 }}>🎯</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalsWidgetTitle, { color: colors.foreground, fontFamily: fonts.semibold }]}>
                {t('dash_goals_summary', { n: goals.length, saved: totalSaved.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
              </Text>
              <View style={[styles.goalsBar, { backgroundColor: colors.muted, marginTop: 8 }]}>
                {goals.slice(0, 4).map((g, i) => {
                  const pct = g.targetAmount > 0 ? Math.min(g.savedAmount / g.targetAmount, 1) : 0;
                  return (
                    <View key={g.id} style={[styles.goalsBarSegment, { flex: 1, marginLeft: i > 0 ? 2 : 0 }]}>
                      <View style={[styles.goalsBarFill, { width: `${Math.max(pct * 100, 4)}%` as any, backgroundColor: '#16A34A' }]} />
                    </View>
                  );
                })}
              </View>
            </View>
            <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/goals')}
            activeOpacity={0.85}
            style={[styles.goalsWidget, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <View style={[styles.goalsWidgetIcon, { backgroundColor: '#16A34A20' }]}>
              <Text style={{ fontSize: 20 }}>🎯</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalsWidgetTitle, { color: colors.foreground, fontFamily: fonts.semibold }]}>
                {t('dash_goals_empty_title')}
              </Text>
              <Text style={[styles.goalsWidgetSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('dash_goals_empty_sub')}
              </Text>
            </View>
            <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bank-dependent sections ── */}
      {!banksConnected ? (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/banks')}
          activeOpacity={0.85}
          style={[styles.noBankBanner, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <View style={[styles.noBankIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="link" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.noBankTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>Connect a bank to get started</Text>
            <Text style={[styles.noBankSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>Your spending, renewals, and subscriptions will appear here</Text>
          </View>
          <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      ) : (
        <>
          {/* ── Due-soon section (≤ 3 days) ── */}
          {dueSoonItems.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, rtl.row()]}>
                <View style={[rtl.row(), { gap: 8, alignItems: 'center' }]}>
                  <View style={[styles.dueSoonDot, { backgroundColor: '#FF4757' }]} />
                  <Text style={[styles.sectionTitle, { color: '#FF4757', fontFamily: fonts.bold }]}>{t('alert_due_soon_title')}</Text>
                </View>
                <View style={[styles.upcomingCountBadge, { backgroundColor: '#FF475718' }]}>
                  <Text style={[styles.upcomingCountText, { color: '#FF4757', fontFamily: fonts.semibold }]}>{dueSoonItems.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {dueSoonItems.map(renderUpcomingCard)}
              </ScrollView>
            </View>
          )}

          {/* ── Unified upcoming payments carousel (beyond 3 days) ── */}
          {upcomingRest.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, rtl.row()]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_upcoming_all')}</Text>
                <View style={[styles.upcomingCountBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.upcomingCountText, { color: colors.primary, fontFamily: fonts.semibold }]}>{upcomingRest.length}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {upcomingRest.map(renderUpcomingCard)}
              </ScrollView>
            </View>
          )}

          {/* ── Category breakdown ── */}
          {categoryBreakdown.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, rtl.row()]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_by_category')}</Text>
              </View>
              <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                {categoryBreakdown.map((item, i) => {
                  const pct = monthlyTotal > 0 ? (item.amt / monthlyTotal) : 0;
                  const cap = getCap(item.cat);
                  const catColor = getCategoryColor(item.cat);
                  const barColor = cap
                    ? (item.amt >= cap ? '#FF4757' : item.amt / cap >= 0.8 ? '#F59E0B' : catColor)
                    : catColor;
                  const isTopCat = i === 0 && topCatIncomePct !== null;
                  return (
                    <View key={item.cat} style={[styles.catRow, i < categoryBreakdown.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.catLeft, rtl.row()]}>
                        <View style={[styles.catDot, { backgroundColor: barColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.catLabel, { color: colors.foreground, fontFamily: fonts.medium }]}>{getCategoryLabel(item.cat)}</Text>
                          {isTopCat && (
                            <Text style={[styles.catIncomeAnnotation, { color: barColor, fontFamily: fonts.semibold }]}>
                              {t('dash_top_cat_income').replace('{pct}', topCatIncomePct!.toString())}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={[styles.catRight, rtl.row()]}>
                        <View style={[styles.catBar, { backgroundColor: colors.muted }]}>
                          <View style={[styles.catBarFill, { width: `${Math.max(4, pct * 100)}%` as any, backgroundColor: barColor }]} />
                        </View>
                        <Text style={[styles.catAmount, { color: colors.foreground, fontFamily: fonts.semibold, textAlign: isRTL ? 'left' : 'right' }]}>
                          SAR {formatSAR(item.amt)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Suggested subscriptions ── */}
          {suggestedSubs.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, rtl.row()]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('dash_suggested')}</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/subscriptions')}>
                  <Text style={[styles.seeAll, { color: colors.primary, fontFamily: fonts.medium }]}>{t('see_all')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.suggestedHint, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('dash_suggested_sub')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {suggestedSubs.map(s => (
                  <View key={s.name} style={[styles.suggestedCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                    <View style={[styles.suggestedIcon, { backgroundColor: s.color + '20' }]}>
                      <Feather name={s.icon as any} size={18} color={s.color} />
                    </View>
                    <Text style={[styles.suggestedName, { color: colors.foreground, fontFamily: fonts.semibold }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.suggestedPrice, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                      SAR {s.amount.toFixed(2)}{t('dash_suggested_per_mo')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleAddSuggested(s)}
                      style={[styles.suggestedAddBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={12} color="#fff" />
                      <Text style={[styles.suggestedAddText, { fontFamily: fonts.semibold }]}>{t('dash_suggested_add')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroHeader: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heroGreeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroTitle:    { color: '#fff', fontSize: 22 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  heroCenterBlock: { alignItems: 'center', marginBottom: 22 },
  heroLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 4 },
  heroAmount: { color: '#fff', fontSize: 38, letterSpacing: -1, marginBottom: 8 },
  suggestedHint: { fontSize: 12, marginBottom: 10, marginTop: -6 },
  suggestedCard: { width: 140, padding: 12, borderWidth: 1, gap: 6, alignItems: 'flex-start' },
  suggestedIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  suggestedName: { fontSize: 13 },
  suggestedPrice: { fontSize: 11 },
  suggestedAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  suggestedAddText: { color: '#fff', fontSize: 12 },
  heroAnalyticsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  heroPills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPill:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroPillText: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  heroPillDot:  { color: 'rgba(255,255,255,0.3)', fontSize: 12 },

  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatValue: { color: '#fff', fontSize: 15 },
  heroStatValueYear: { fontSize: 14, width: '100%', textAlign: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Overspend alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16, padding: 14, borderWidth: 1,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 13, marginBottom: 2 },
  alertBody:  { fontSize: 11, lineHeight: 16 },

  // No-bank banner
  noBankBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 20, padding: 16, borderWidth: 1 },
  noBankIcon:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  noBankTitle:  { fontSize: 14, marginBottom: 3 },
  noBankSub:    { fontSize: 12, lineHeight: 17 },

  // Premium banner
  premiumBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  premiumBannerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  premiumBannerTitle: { color: '#9D8FF8', fontSize: 14 },
  premiumBannerSub: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  premiumBannerCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  premiumBannerCtaText: { color: '#9D8FF8', fontSize: 12 },

  // Premium feature cards
  premiumCards: { flexDirection: 'row', paddingHorizontal: 16 },
  premiumCard: { flex: 1, padding: 14, borderWidth: 1, gap: 8 },
  premiumCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  premiumCardTitle: { fontSize: 13 },
  premiumCardSub: { fontSize: 11, lineHeight: 15 },

  // Sections
  section:       { marginTop: 24 },
  sectionHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:  { fontSize: 17 },
  seeAll:        { fontSize: 13 },
  upcomingCountBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  upcomingCountText:  { fontSize: 12 },

  // Due-soon dot indicator
  dueSoonDot: { width: 8, height: 8, borderRadius: 4 },

  // Upcoming card
  upcomingCard:   { width: 126, padding: 12, gap: 5, borderWidth: 1 },
  upcomingIcon:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  upcomingName:   { fontSize: 12 },
  upcomingAmount: { fontSize: 14 },
  upcomingFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  kindBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  kindBadgeText:  { fontSize: 9 },
  upcomingBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  upcomingBadgeText: { fontSize: 9 },

  // Category
  categoryCard: { overflow: 'hidden', borderWidth: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  catLeft: { gap: 8, width: 110 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 13 },
  catRight: { flex: 1, alignItems: 'center', gap: 10 },
  catBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { fontSize: 12, width: 75 },
  catIncomeAnnotation: { fontSize: 10, marginTop: 2 },

  // Goals widget
  goalsWidget: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, padding: 16, borderWidth: 1 },
  goalsWidgetIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalsWidgetTitle: { fontSize: 13 },
  goalsWidgetSub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  goalsBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  goalsBarSegment: { height: '100%', backgroundColor: 'transparent', borderRadius: 3, overflow: 'hidden' },
  goalsBarFill: { height: '100%', borderRadius: 3 },
});
