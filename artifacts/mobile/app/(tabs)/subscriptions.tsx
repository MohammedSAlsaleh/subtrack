import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  useSubscriptions,
  getCategoryLabel,
  Category,
  BillingCycle,
} from '@/context/SubscriptionContext';
import { detectPaymentType } from '@/utils/paymentDetector';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { EmptyState } from '@/components/EmptyState';

// ─── Category metadata ─────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  'streaming', 'software', 'fitness', 'food',
  'gaming', 'utilities', 'education', 'other',
];

const CAT_ICON: Record<Category, string> = {
  streaming:  'tv',
  software:   'code',
  fitness:    'activity',
  food:       'coffee',
  gaming:     'grid',
  utilities:  'zap',
  education:  'book-open',
  other:      'tag',
};

const CAT_COLOR: Record<Category, string> = {
  streaming:  '#FF6B6B',
  software:   '#4ECDC4',
  fitness:    '#45B7D1',
  food:       '#FFA07A',
  gaming:     '#A78BFA',
  utilities:  '#FFD93D',
  education:  '#6BCB77',
  other:      '#9CA3AF',
};

const PERIODS: { value: BillingCycle; label: string }[] = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual',  label: 'Annual'  },
];

// ─── Date helpers ──────────────────────────────────────────────────────────
function fmtDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function parseDate(ddmmyyyy: string): Date | null {
  const [dd, mm, yyyy] = ddmmyyyy.split('/').map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2000) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as YYYY-MM-DD using *local* timezone to avoid UTC day-shift. */
function toLocalDateStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

function nextBilling(start: Date, cycle: BillingCycle): string {
  const d = new Date(start);
  if (cycle === 'weekly')  d.setDate(d.getDate() + 7);
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  if (cycle === 'annual')  d.setFullYear(d.getFullYear() + 1);
  return toLocalDateStr(d);
}

// ─── Types ─────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'active' | 'cancelled' | 'excluded';

interface FormState {
  name:          string;
  category:      Category;
  amount:        string;
  period:        BillingCycle;
  startDate:     string;
  includesVat:   boolean;
  sharedMembers: number;
  isTrial:       boolean;
  trialEndsAt:   string;
}

const DEFAULT_FORM: FormState = {
  name:          '',
  category:      'streaming',
  amount:        '',
  period:        'monthly',
  startDate:     '',
  includesVat:   false,
  sharedMembers: 1,
  isTrial:       false,
  trialEndsAt:   '',
};

// ══════════════════════════════════════════════════════════════════════════
export default function SubscriptionsScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { subscriptions, banks, monthlyTotal, activeCount, excludedCount, addSubscription, restoreSubscription } = useSubscriptions();

  const [filter,    setFilter]    = useState<FilterTab>('active');
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState<Category | null>(null);

  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState<FormState>(DEFAULT_FORM);
  const [errors,   setErrors]   = useState<Partial<FormState>>({});
  const [saving,   setSaving]   = useState(false);

  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // ─── Auto-detection result (shown after adding a regular payment) ─────────
  const [autoDetected, setAutoDetected] = useState<{
    id: string; name: string; reason: string;
  } | null>(null);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  // ─── Duplicate detection ─────────────────────────────────────────────────
  const DISMISSED_DUPES_KEY = 'dismissed_duplicate_ids';

  // IDs that were present when the user last dismissed the banner (persisted)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Load persisted dismissed IDs on mount
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_DUPES_KEY).then(raw => {
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw);
          setDismissedIds(new Set(arr));
        } catch { /* ignore malformed data */ }
      }
    });
  }, []);

  const duplicateIds = useMemo<Set<string>>(() => {
    const byName: Record<string, string[]> = {};
    const byAmountCat: Record<string, string[]> = {};
    for (const s of subscriptions) {
      if (s.status !== 'active') continue; // skip cancelled AND excluded
      const nameKey = s.name.trim().toLowerCase();
      byName[nameKey] = [...(byName[nameKey] ?? []), s.id];
      const amtCatKey = `${s.amount}_${s.category}`;
      byAmountCat[amtCatKey] = [...(byAmountCat[amtCatKey] ?? []), s.id];
    }
    const ids = new Set<string>();
    for (const group of [...Object.values(byName), ...Object.values(byAmountCat)]) {
      if (group.length > 1) group.forEach(id => ids.add(id));
    }
    return ids;
  }, [subscriptions]);

  // Clear stored dismiss state when all duplicates are resolved
  useEffect(() => {
    if (duplicateIds.size === 0) {
      if (dismissedIds.size > 0) {
        setDismissedIds(new Set());
        AsyncStorage.removeItem(DISMISSED_DUPES_KEY);
      }
      if (showDuplicatesOnly) setShowDuplicatesOnly(false);
    }
  }, [duplicateIds.size]);

  // Show banner only when there's at least one duplicate ID not in the dismissed set
  const hasDuplicates =
    duplicateIds.size > 0 &&
    [...duplicateIds].some(id => !dismissedIds.has(id));

  const handleDismissDuplicates = () => {
    // Persist the current set of duplicate IDs so we only re-show for new ones
    const arr = [...duplicateIds];
    setDismissedIds(new Set(arr));
    AsyncStorage.setItem(DISMISSED_DUPES_KEY, JSON.stringify(arr));
    setShowDuplicatesOnly(false);
  };

  const handleHighlightDuplicates = () => {
    setHighlightedIds(duplicateIds);
    // auto-clear highlight after 4 seconds
    setTimeout(() => setHighlightedIds(new Set()), 4000);
  };

  const handleReviewDuplicates = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDuplicatesOnly(true);
    setFilter('active');
    handleHighlightDuplicates();
  };

  // ─── Filtered list ───────────────────────────────────────────────────────
  const displayed = useMemo(() => subscriptions.filter(s => {
    // The 'excluded' tab is the only place excluded items appear
    if (filter === 'excluded') return s.status === 'excluded';
    // Every other tab hides excluded items completely
    if (s.status === 'excluded') return false;
    if (showDuplicatesOnly && !duplicateIds.has(s.id))      return false;
    if (filter === 'active'    && s.status !== 'active')    return false;
    if (filter === 'cancelled' && s.status !== 'cancelled') return false;
    if (catFilter && s.category !== catFilter)              return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [subscriptions, filter, search, catFilter, showDuplicatesOnly, duplicateIds]);

  // ─── Open / close form ───────────────────────────────────────────────────
  const openAdd = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForm(DEFAULT_FORM);
    setErrors({});
    setSaving(false);
    setShowAdd(true);
  };

  const closeAdd = () => setShowAdd(false);

  // ─── Field helpers ───────────────────────────────────────────────────────
  const set = (field: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [field]: v }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  // ─── Validate & save ────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim())       errs.name      = 'Required';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    const dateObj = parseDate(form.startDate);
    if (!dateObj)                errs.startDate = 'Use DD/MM/YYYY format';

    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Validate trial end date if trial is toggled on
    if (form.isTrial && form.trialEndsAt) {
      const trialDate = parseDate(form.trialEndsAt);
      if (!trialDate) {
        setErrors(e => ({ ...e, trialEndsAt: 'Use DD/MM/YYYY format' }));
        return;
      }
    }

    setSaving(true);
    try {
      const trialDate = form.isTrial && form.trialEndsAt ? parseDate(form.trialEndsAt) : null;

      // ── Auto-detect regular vs subscription ──────────────────────────────
      const detection = detectPaymentType({
        name:         form.name.trim(),
        category:     form.category,
        billingCycle: form.period,
        amount:       amt,
      });
      const resolvedStatus = detection.isRegularPayment ? 'excluded' : 'active';

      const newId = await addSubscription({
        name:            form.name.trim(),
        merchantName:    form.name.trim(),
        category:        form.category,
        amount:          amt,
        currency:        'SAR',
        billingCycle:    form.period,
        nextBillingDate: nextBilling(dateObj!, form.period),
        color:           CAT_COLOR[form.category],
        icon:            CAT_ICON[form.category],
        status:          resolvedStatus,
        includesVat:     form.includesVat,
        sharedMembers:   form.sharedMembers,
        isTrial:         form.isTrial,
        trialEndsAt:     trialDate ? trialDate.toISOString().split('T')[0] : undefined,
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (detection.isRegularPayment) {
        setAutoDetected({ id: newId, name: form.name.trim(), reason: detection.reason });
      }

      closeAdd();
    } catch {
      Alert.alert('Error', 'Could not save subscription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Gate: no banks connected yet
  if (banks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Subscriptions</Text>
        </View>
        <View style={styles.gateWrap}>
          <View style={[styles.gateIconWrap, { backgroundColor: colors.muted }]}>
            <Feather name="link" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.gateTitle, { color: colors.foreground }]}>Connect your bank first</Text>
          <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
            SubTrack detects your subscriptions automatically once you link a bank account. Your data stays read-only and secure.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/banks')}
            activeOpacity={0.85}
            style={[styles.gateBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Feather name="plus-circle" size={16} color={colors.primaryForeground} />
            <Text style={[styles.gateBtnText, { color: colors.primaryForeground }]}>Connect a Bank</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Subscriptions</Text>
        <View style={[styles.summaryPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            {activeCount} active · SAR {monthlyTotal.toFixed(0)}/mo
          </Text>
        </View>
      </View>

      {/* ─── Search ─────────────────────────────────────────────────────── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search subscriptions..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Status filter tabs ──────────────────────────────────────────── */}
      <View style={[styles.filterRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {(['all', 'active', 'cancelled', 'excluded'] as FilterTab[]).map(tab => {
          const label = tab === 'excluded' ? 'Regular' : tab.charAt(0).toUpperCase() + tab.slice(1);
          const badge = tab === 'excluded' && excludedCount > 0 ? excludedCount : null;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterTab, filter === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.filterTabText, { color: filter === tab ? colors.primary : colors.mutedForeground }]}>
                  {label}
                </Text>
                {badge !== null && (
                  <View style={{ backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.mutedForeground }}>{badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Category chips ──────────────────────────────────────────────── */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={c => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            onPress={() => setCatFilter(catFilter === cat ? null : cat)}
            style={[
              styles.chip,
              { borderRadius: 20, borderColor: colors.border, borderWidth: 1 },
              catFilter === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.chipText, { color: catFilter === cat ? colors.primaryForeground : colors.mutedForeground }]}>
              {getCategoryLabel(cat)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* ─── Auto-detection banner ───────────────────────────────────────── */}
      {autoDetected && (
        <View style={[styles.dupBanner, { backgroundColor: '#6366F118', borderColor: '#6366F155' }]}>
          <View style={styles.dupBannerLeft}>
            <Feather name="zap" size={15} color="#6366F1" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dupBannerTitle, { color: '#6366F1' }]}>
                Auto-classified as Regular Payment
              </Text>
              <Text style={styles.dupBannerSub} numberOfLines={2}>
                {autoDetected.reason} · moved to Regular tab
              </Text>
            </View>
          </View>
          <View style={styles.dupBannerActions}>
            <TouchableOpacity
              onPress={() => {
                restoreSubscription(autoDetected.id);
                setAutoDetected(null);
              }}
              style={[styles.dupReviewBtn, { borderColor: '#6366F1' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.dupReviewBtnText, { color: '#6366F1' }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAutoDetected(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Duplicate banner ────────────────────────────────────────────── */}
      {hasDuplicates && (
        <TouchableOpacity
          onPress={handleHighlightDuplicates}
          activeOpacity={0.8}
          style={[styles.dupBanner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B55' }]}
        >
          <View style={styles.dupBannerLeft}>
            <Feather name="alert-triangle" size={15} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.dupBannerTitle}>Possible duplicate subscription</Text>
              <Text style={styles.dupBannerSub}>Tap to highlight · Review to filter</Text>
            </View>
          </View>
          <View style={styles.dupBannerActions}>
            <TouchableOpacity
              onPress={e => { e.stopPropagation(); handleReviewDuplicates(); }}
              style={styles.dupReviewBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dupReviewBtnText}>Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={e => { e.stopPropagation(); handleDismissDuplicates(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ─── Review mode indicator ───────────────────────────────────────── */}
      {showDuplicatesOnly && (
        <View style={[styles.dupReviewBar, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B44' }]}>
          <Feather name="filter" size={13} color="#F59E0B" />
          <Text style={styles.dupReviewBarText}>Showing duplicates only</Text>
          <TouchableOpacity
            onPress={() => setShowDuplicatesOnly(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dupReviewBarClear}>Show all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Subscription list ───────────────────────────────────────────── */}
      <FlatList
        data={displayed}
        keyExtractor={s => s.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title="No subscriptions found"
            subtitle={search ? 'Try a different search term.' : 'Add one manually or connect your bank to auto-detect.'}
            actionLabel={!search ? 'Add Subscription' : undefined}
            onAction={!search ? openAdd : undefined}
          />
        }
        renderItem={({ item }) => (
          <View>
            {highlightedIds.has(item.id) && (
              <View style={[styles.dupHighlight, { borderColor: '#F59E0B' }]}>
                <Feather name="copy" size={11} color="#F59E0B" />
                <Text style={styles.dupHighlightText}>Duplicate — consider removing one</Text>
              </View>
            )}
            <SubscriptionCard
              subscription={item}
              onPress={() => router.push(`/subscription/${item.id}`)}
            />
          </View>
        )}
      />

      {/* ─── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={openAdd}
        activeOpacity={0.85}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, borderRadius: 30, bottom: Platform.OS === 'web' ? 90 : insets.bottom + 70 },
        ]}
      >
        <Feather name="plus" size={22} color={colors.primaryForeground} />
      </TouchableOpacity>

      {/* ══ Add Subscription Modal ══════════════════════════════════════════ */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAdd}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modal, { backgroundColor: colors.background }]}
        >
          {/* Handle + header */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Subscription</Text>
            <TouchableOpacity onPress={closeAdd} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalBody}
          >

            {/* ── Name ──────────────────────────────────────────────────── */}
            <FormField label="Subscription Name" error={errors.name}>
              <FieldInput
                placeholder="e.g. Netflix, Adobe, Duolingo"
                value={form.name}
                onChangeText={set('name')}
                icon="type"
                autoCapitalize="words"
                hasError={!!errors.name}
              />
            </FormField>

            {/* ── Category grid ─────────────────────────────────────────── */}
            <FormField label="Category">
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => {
                  const active = form.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}
                      activeOpacity={0.75}
                      style={[
                        styles.catCell,
                        {
                          borderColor: active ? CAT_COLOR[cat] : colors.border,
                          backgroundColor: active ? CAT_COLOR[cat] + '18' : colors.card,
                          borderRadius: colors.radius,
                        },
                      ]}
                    >
                      <Feather
                        name={CAT_ICON[cat] as any}
                        size={18}
                        color={active ? CAT_COLOR[cat] : colors.mutedForeground}
                      />
                      <Text style={[styles.catCellLabel, { color: active ? CAT_COLOR[cat] : colors.mutedForeground }]}>
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormField>

            {/* ── Amount ────────────────────────────────────────────────── */}
            <FormField label="Amount (SAR)" error={errors.amount}>
              <View style={[
                styles.amountRow,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.amount ? '#FF6B6B' : colors.border,
                  borderRadius: colors.radius,
                },
              ]}>
                <Text style={[styles.amountCurrency, { color: colors.mutedForeground }]}>SAR</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.foreground }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.amount}
                  onChangeText={v => {
                    const clean = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    set('amount')(clean);
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </FormField>

            {/* ── Billing period ────────────────────────────────────────── */}
            <FormField label="Billing Period">
              <View style={[styles.segmented, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                {PERIODS.map(p => {
                  const active = form.period === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setForm(f => ({ ...f, period: p.value }))}
                      activeOpacity={0.8}
                      style={[
                        styles.segment,
                        { borderRadius: colors.radius - 2 },
                        active && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.segmentText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FormField>

            {/* ── Start date ────────────────────────────────────────────── */}
            <FormField label="Start Date" error={errors.startDate}>
              <FieldInput
                placeholder="DD/MM/YYYY"
                value={form.startDate}
                onChangeText={v => set('startDate')(fmtDateInput(v))}
                icon="calendar"
                keyboardType="number-pad"
                hasError={!!errors.startDate}
              />
            </FormField>

            {/* ── VAT toggle ────────────────────────────────────────────── */}
            <VatToggle
              value={form.includesVat}
              onToggle={v => setForm(f => ({ ...f, includesVat: v }))}
            />

            {/* ── Shared members ────────────────────────────────────────── */}
            <SharedMembersStepper
              value={form.sharedMembers}
              amount={parseFloat(form.amount) || 0}
              onChange={n => setForm(f => ({ ...f, sharedMembers: n }))}
            />

            {/* ── Free trial toggle ─────────────────────────────────────── */}
            <TrialToggleField
              isTrial={form.isTrial}
              trialEndsAt={form.trialEndsAt}
              trialError={(errors as any).trialEndsAt}
              onToggle={v => setForm(f => ({ ...f, isTrial: v, trialEndsAt: v ? f.trialEndsAt : '' }))}
              onDateChange={v => {
                setForm(f => ({ ...f, trialEndsAt: fmtDateInput(v) }));
                setErrors(e => ({ ...e, trialEndsAt: undefined } as any));
              }}
            />

            {/* ── Preview pill ──────────────────────────────────────────── */}
            {form.name.trim() && parseFloat(form.amount) > 0 && (
              <View style={[styles.preview, { backgroundColor: CAT_COLOR[form.category] + '12', borderColor: CAT_COLOR[form.category] + '35', borderRadius: colors.radius }]}>
                <View style={[styles.previewIcon, { backgroundColor: CAT_COLOR[form.category] + '25' }]}>
                  <Feather name={CAT_ICON[form.category] as any} size={16} color={CAT_COLOR[form.category]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewName, { color: CAT_COLOR[form.category] }]} numberOfLines={1}>
                    {form.name.trim()}
                  </Text>
                  <Text style={[styles.previewMeta, { color: CAT_COLOR[form.category] + 'BB' }]}>
                    SAR {parseFloat(form.amount || '0').toFixed(2)} / {form.period}
                  </Text>
                </View>
                <View style={[styles.previewBadge, { backgroundColor: CAT_COLOR[form.category] + '25' }]}>
                  <Text style={[styles.previewBadgeText, { color: CAT_COLOR[form.category] }]}>Preview</Text>
                </View>
              </View>
            )}

            {/* ── Save button ───────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
              style={styles.saveBtn}
            >
              <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.saveBtnInner}>
                <Feather name="plus-circle" size={17} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving…' : 'Add Subscription'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Trial toggle sub-component ────────────────────────────────────────────
function TrialToggleField({
  isTrial, trialEndsAt, trialError, onToggle, onDateChange,
}: {
  isTrial: boolean;
  trialEndsAt: string;
  trialError?: string;
  onToggle: (v: boolean) => void;
  onDateChange: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <View style={[styles.trialRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.trialRowLeft}>
          <Feather name="clock" size={16} color={isTrial ? '#F59E0B' : colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.trialLabel, { color: colors.foreground }]}>Free Trial</Text>
            <Text style={[styles.trialSub, { color: colors.mutedForeground }]}>
              {isTrial ? 'Set end date to get warned before charge' : 'Tag this as a free trial'}
            </Text>
          </View>
        </View>
        <Switch
          value={isTrial}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: '#F59E0B' }}
          thumbColor="#fff"
        />
      </View>
      {isTrial && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Trial End Date</Text>
          <FieldInput
            placeholder="DD/MM/YYYY"
            value={trialEndsAt}
            onChangeText={onDateChange}
            icon="calendar"
            keyboardType="number-pad"
            hasError={!!trialError}
          />
          {!!trialError && (
            <View style={styles.fieldError}>
              <Feather name="alert-circle" size={12} color="#FF6B6B" />
              <Text style={styles.fieldErrorText}>{trialError}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
      {!!error && (
        <View style={styles.fieldError}>
          <Feather name="alert-circle" size={12} color="#FF6B6B" />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function FieldInput({
  placeholder, value, onChangeText, icon, autoCapitalize, keyboardType, hasError,
}: {
  placeholder: string; value: string; onChangeText: (v: string) => void;
  icon: string; autoCapitalize?: any; keyboardType?: any; hasError?: boolean;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      styles.fieldInputRow,
      {
        backgroundColor: colors.card,
        borderColor: hasError ? '#FF6B6B' : focused ? '#7B6CF8' : colors.border,
        borderRadius: colors.radius,
      },
    ]}>
      <Feather name={icon as any} size={15} color={focused ? '#7B6CF8' : colors.mutedForeground} style={{ marginRight: 10 }} />
      <TextInput
        style={[styles.fieldInputText, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ─── VAT Toggle sub-component ──────────────────────────────────────────────
function VatToggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[vatStyles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={vatStyles.left}>
        <View style={[vatStyles.iconWrap, { backgroundColor: '#F59E0B18' }]}>
          <Feather name="percent" size={14} color="#F59E0B" />
        </View>
        <View>
          <Text style={[vatStyles.label, { color: colors.foreground }]}>Includes 15% VAT</Text>
          <Text style={[vatStyles.hint, { color: colors.mutedForeground }]}>
            Price shown is VAT-inclusive
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: '#F59E0B' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function SharedMembersStepper({ value, amount, onChange }: { value: number; amount: number; onChange: (n: number) => void }) {
  const colors = useColors();
  const shareAmount = amount > 0 ? amount / value : 0;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SHARED WITH (PEOPLE)</Text>
      <View style={[styles.stepperRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          style={[styles.stepperBtn, { opacity: value <= 1 ? 0.35 : 1 }]}
        >
          <Feather name="minus" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.stepperCenter}>
          <Text style={[styles.stepperNum, { color: colors.foreground }]}>{value}</Text>
          <Text style={[styles.stepperHint, { color: colors.mutedForeground }]}>
            {value === 1 ? 'Solo (no split)' : `÷${value} · SAR ${shareAmount.toFixed(2)} each`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onChange(Math.min(6, value + 1))}
          disabled={value >= 6}
          style={[styles.stepperBtn, { opacity: value >= 6 ? 0.35 : 1 }]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const vatStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: 1 },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  hint:     { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
});

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Bank gate
  gateWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 12,
  },
  gateIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  gateTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  gateSub: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 21, marginBottom: 8,
  },
  gateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, marginTop: 4,
  },
  gateBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  // List screen
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  pageTitle:   { fontSize: 26, fontFamily: 'Inter_700Bold' },
  summaryPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  summaryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  searchWrap:  { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  filterRow:   { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  filterTab:   { marginRight: 24, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  chipRow:     { paddingHorizontal: 16, paddingVertical: 10, gap: 6, alignItems: 'center' },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent' },
  chipText:    { fontSize: 12, fontFamily: 'Inter_500Medium' },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },

  // Modal shell
  modal:       { flex: 1, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  modalTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalBody:   { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // Trial toggle
  trialRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12,
  },
  trialRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  trialLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  trialSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  // Form fields
  field:        { gap: 8 },
  fieldLabel:   { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, height: 50 },
  fieldInputText: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  fieldError:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -2 },
  fieldErrorText: { color: '#FF6B6B', fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Category grid (2 cols)
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCell: {
    width: '48%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1.5,
  },
  catCellLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  // Amount
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, height: 50 },
  amountCurrency: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold' },

  // Segmented period
  segmented: { flexDirection: 'row', padding: 4, gap: 4 },
  segment:   { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Preview
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderWidth: 1,
  },
  previewIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewName:      { fontSize: 14, fontFamily: 'Inter_700Bold' },
  previewMeta:      { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  previewBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  previewBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  // Shared members stepper
  stepperRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, gap: 8 },
  stepperBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperCenter:{ flex: 1, alignItems: 'center', gap: 2 },
  stepperNum:   { fontSize: 22, fontFamily: 'Inter_700Bold' },
  stepperHint:  { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Save button
  saveBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnInner: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  saveBtnText:  { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  // Duplicate banner
  dupBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginVertical: 6, padding: 12,
    borderRadius: 10, borderWidth: 1,
  },
  dupBannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dupBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dupBannerTitle:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#F59E0B' },
  dupBannerSub:     { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#F59E0BAA', marginTop: 1 },
  dupReviewBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F59E0B' },
  dupReviewBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  dupReviewBar:     {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 4, marginTop: -2,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  dupReviewBarText:  { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#F59E0B' },
  dupReviewBarClear: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#F59E0B', textDecorationLine: 'underline' },

  // Duplicate highlight label
  dupHighlight: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: 16, marginBottom: -4, marginTop: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderLeftWidth: 3, borderRadius: 2,
  },
  dupHighlightText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#F59E0B' },
});
