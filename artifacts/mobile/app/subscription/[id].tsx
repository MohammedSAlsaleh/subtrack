import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import { ConfirmModal, ConfirmConfig } from '@/components/ConfirmModal';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions, getCategoryLabel, getCategoryColor, Category, BillingCycle } from '@/context/SubscriptionContext';

function formatSAR(amount: number) {
  return amount.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDaysUntil(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Format raw digit input as DD/MM/YYYY
function fmtDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// Parse DD/MM/YYYY → YYYY-MM-DD (no Date/UTC involved, so timezone-safe)
function displayToISO(ddmmyyyy: string): string | null {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2000 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  // Basic calendar sanity: reject obviously impossible dates
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// Convert stored ISO date (YYYY-MM-DD) → DD/MM/YYYY for display
function isoToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function buildBillingHistory(sub: { amount: number; billingCycle: string; startedAt: string; nextBillingDate: string }) {
  const history: { date: string; amount: number }[] = [];
  const next    = new Date(sub.nextBillingDate);
  const now     = new Date();
  // Only show payments that occurred *after* the subscription started
  const started = new Date(sub.startedAt);
  const stepsBack = sub.billingCycle === 'annual' ? 3 : sub.billingCycle === 'weekly' ? 8 : 6;

  for (let i = 1; i <= stepsBack; i++) {
    const d = new Date(next);
    if (sub.billingCycle === 'monthly') d.setMonth(d.getMonth() - i);
    else if (sub.billingCycle === 'annual') d.setFullYear(d.getFullYear() - i);
    else if (sub.billingCycle === 'weekly') d.setDate(d.getDate() - i * 7);

    // Only include dates that are in the past AND on/after the start date
    if (d < now && d >= started) {
      history.push({ date: d.toISOString().split('T')[0], amount: sub.amount });
    }
  }
  return history.slice(0, 4);
}

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptions, banks, updateSubscription, removeSubscription, excludeSubscription, restoreSubscription } = useSubscriptions();

  const sub = useMemo(() => subscriptions.find(s => s.id === id), [subscriptions, id]);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  // ── Edit sheet state ────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCycle, setEditCycle] = useState<BillingCycle>('monthly');
  const [editCategory, setEditCategory] = useState<Category>('other');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<{ name?: string; amount?: string }>({});

  const openEdit = () => {
    if (!sub) return;
    setEditName(sub.name);
    setEditAmount(String(sub.amount));
    setEditCycle(sub.billingCycle);
    setEditCategory(sub.category);
    setEditErrors({});
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    const errs: { name?: string; amount?: string } = {};
    if (!editName.trim()) errs.name = 'Name is required';
    const amt = parseFloat(editAmount);
    if (!editAmount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setEditSaving(true);
    try {
      await updateSubscription(id, {
        name: editName.trim(),
        amount: amt,
        billingCycle: editCycle,
        category: editCategory,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEdit(false);
    } finally { setEditSaving(false); }
  };

  // Local state for trial end date text input (DD/MM/YYYY while editing)
  const [trialDateInput, setTrialDateInput] = useState(() =>
    sub?.trialEndsAt ? isoToDisplay(sub.trialEndsAt) : ''
  );
  const [trialDateError, setTrialDateError] = useState('');

  // Keep input in sync if the subscription changes from outside
  useEffect(() => {
    setTrialDateInput(sub?.trialEndsAt ? isoToDisplay(sub.trialEndsAt) : '');
    setTrialDateError('');
  }, [sub?.trialEndsAt]);

  if (!sub) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Subscription not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysLeft = getDaysUntil(sub.nextBillingDate);
  const billingHistory = buildBillingHistory(sub);
  const catColor = getCategoryColor(sub.category);
  const isActive   = sub.status === 'active';
  const isExcluded = sub.status === 'excluded';
  const linkedBank = sub.bankAccountId ? banks.find(b => b.id === sub.bankAccountId) : undefined;
  const members = sub.sharedMembers && sub.sharedMembers > 1 ? sub.sharedMembers : 1;
  const isShared = members > 1;
  const shareAmount = sub.amount / members;

  const yearlyEquivalent = sub.billingCycle === 'monthly'
    ? sub.amount * 12
    : sub.billingCycle === 'annual'
    ? sub.amount
    : sub.amount * 52;

  const handleToggleStatus = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStatus = isActive ? 'cancelled' : 'active';
    setConfirmConfig({
      title: isActive ? 'Cancel Subscription' : 'Reactivate Subscription',
      message: isActive
        ? `Mark ${sub.name} as cancelled? This won't cancel your actual subscription — you'll need to do that directly with the provider.`
        : `Mark ${sub.name} as active again?`,
      confirmLabel: isActive ? 'Mark Cancelled' : 'Reactivate',
      cancelLabel: 'No',
      destructive: isActive,
      onConfirm: () => updateSubscription(id, { status: newStatus }),
    });
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setConfirmConfig({
      title: 'Delete Subscription',
      message: `Remove ${sub.name} from SubTrack?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: () => {
        removeSubscription(id);
        router.back();
      },
    });
  };

  const handleHowToCancel = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = `How do I cancel ${sub.name} in Saudi Arabia? Walk me through it step by step.`;
    router.push(`/agent?initialMessage=${encodeURIComponent(msg)}`);
  };

  const handleSharedMembersChange = (delta: number) => {
    const current = sub.sharedMembers && sub.sharedMembers > 1 ? sub.sharedMembers : 1;
    const next = Math.max(1, Math.min(6, current + delta));
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    updateSubscription(id, { sharedMembers: next });
  };

  return (
    <>
      <ConfirmModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
      <Stack.Screen
        options={{
          title: sub.name,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity onPress={openEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 4 }}>
              <Feather name="edit-2" size={18} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : insets.bottom + 40 }}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: sub.color + '12' }]}>
          <View style={[styles.heroIcon, { backgroundColor: sub.color + '25' }]}>
            <Feather name={sub.icon as any} size={36} color={sub.color} />
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{sub.name}</Text>
          <Text style={[styles.heroMerchant, { color: colors.mutedForeground }]}>{sub.merchantName}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroCatBadge, { backgroundColor: catColor + '20' }]}>
              <Text style={[styles.heroCatText, { color: catColor }]}>{getCategoryLabel(sub.category)}</Text>
            </View>
            {isShared && (
              <View style={[styles.heroCatBadge, { backgroundColor: colors.primary + '20' }]}>
                <Feather name="users" size={10} color={colors.primary} />
                <Text style={[styles.heroCatText, { color: colors.primary }]}>Shared ÷{members}</Text>
              </View>
            )}
            {sub.isTrial && (
              <View style={[styles.heroCatBadge, { backgroundColor: '#F59E0B20' }]}>
                <Feather name="clock" size={10} color="#F59E0B" />
                <Text style={[styles.heroCatText, { color: '#F59E0B' }]}>
                  {sub.trialEndsAt
                    ? `Trial · ${getDaysUntil(sub.trialEndsAt)}d left`
                    : 'Free Trial'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount card */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <LinearGradient
            colors={[sub.color, sub.color + 'AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.amountCard, { borderRadius: colors.radius }]}
          >
            <View style={styles.amountRow}>
              <View>
                <Text style={styles.amountLabel}>
                  {sub.billingCycle === 'monthly' ? 'Per Month' : sub.billingCycle === 'annual' ? 'Per Year' : 'Per Week'}
                </Text>
                <Text style={styles.amountValue}>SAR {formatSAR(sub.amount)}</Text>
                {isShared && (
                  <Text style={styles.amountShareLabel}>Your share: SAR {formatSAR(shareAmount)}</Text>
                )}
              </View>
              <View style={styles.amountRight}>
                <Text style={styles.amountYearlyLabel}>Yearly</Text>
                <Text style={styles.amountYearlyValue}>SAR {formatSAR(yearlyEquivalent)}</Text>
              </View>
            </View>
            {isActive && (
              <View style={styles.amountNext}>
                <Feather name="clock" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.amountNextText}>
                  {daysLeft === 0 ? 'Billing today' : daysLeft === 1 ? 'Billing tomorrow' : `Next billing in ${daysLeft} days`}
                  {' — '}{formatDate(sub.nextBillingDate)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Shared members control */}
        <View style={[styles.sharedCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.sharedHeader}>
            <Feather name="users" size={15} color={colors.mutedForeground} />
            <Text style={[styles.sharedTitle, { color: colors.foreground }]}>Shared Subscription</Text>
          </View>
          <Text style={[styles.sharedSub, { color: colors.mutedForeground }]}>
            Split the cost with family or friends. Set to 1 for solo.
          </Text>
          <View style={styles.sharedStepper}>
            <TouchableOpacity
              onPress={() => handleSharedMembersChange(-1)}
              disabled={members <= 1}
              style={[styles.stepperBtn, { backgroundColor: colors.muted, borderRadius: 8, opacity: members <= 1 ? 0.4 : 1 }]}
            >
              <Feather name="minus" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={[styles.stepperNum, { color: colors.foreground }]}>{members}</Text>
              <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>
                {members === 1 ? 'person (solo)' : `people · SAR ${formatSAR(shareAmount)} each`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSharedMembersChange(1)}
              disabled={members >= 6}
              style={[styles.stepperBtn, { backgroundColor: colors.muted, borderRadius: 8, opacity: members >= 6 ? 0.4 : 1 }]}
            >
              <Feather name="plus" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <DetailRow label="Status" value={isActive ? 'Active' : 'Cancelled'} valueColor={isActive ? colors.accent : colors.destructive} />
          <DetailRow label="Billing Cycle" value={sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)} colors={colors} />
          <DetailRow label="Started" value={formatDate(sub.startedAt)} colors={colors} />
          <DetailRow label="Next Billing" value={isActive ? formatDate(sub.nextBillingDate) : 'N/A'} colors={colors} last={!linkedBank && !sub.includesVat === undefined} />
          {linkedBank && (
            <DetailRow
              label="Charged to"
              value={`${linkedBank.bankName}  ····  ${linkedBank.lastFour}`}
              colors={colors}
              last={true}
            />
          )}
          {/* VAT toggle row */}
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Includes 15% VAT</Text>
              {sub.includesVat && (
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#F59E0BAA', marginTop: 2 }}>
                  Ex-VAT: SAR {formatSAR(sub.amount / 1.15)}
                </Text>
              )}
            </View>
            <Switch
              value={!!sub.includesVat}
              onValueChange={v => updateSubscription(id, { includesVat: v })}
              trackColor={{ false: colors.muted, true: '#F59E0B' }}
              thumbColor="#fff"
            />
          </View>

          {/* Trial toggle row */}
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="clock" size={14} color={sub.isTrial ? '#F59E0B' : colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Free Trial</Text>
                {sub.isTrial && sub.trialEndsAt && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#F59E0BAA', marginTop: 2 }}>
                    Ends {formatDate(sub.trialEndsAt)}
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={!!sub.isTrial}
              onValueChange={v => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                updateSubscription(id, { isTrial: v, trialEndsAt: v ? sub.trialEndsAt : undefined });
                if (!v) {
                  setTrialDateInput('');
                  setTrialDateError('');
                }
              }}
              trackColor={{ false: colors.muted, true: '#F59E0B' }}
              thumbColor="#fff"
            />
          </View>

          {/* Trial end date input — visible only when isTrial is on */}
          {sub.isTrial && (
            <View style={[styles.trialDateRow, { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#F59E0B08' }]}>
              <Feather name="calendar" size={13} color="#F59E0B" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.trialDateInput, { color: colors.foreground, borderColor: trialDateError ? '#FF6B6B' : colors.border }]}
                placeholder="Trial end date: DD/MM/YYYY"
                placeholderTextColor={colors.mutedForeground}
                value={trialDateInput}
                onChangeText={v => {
                  const formatted = fmtDateInput(v);
                  setTrialDateInput(formatted);
                  setTrialDateError('');
                }}
                onBlur={() => {
                  if (!trialDateInput) {
                    updateSubscription(id, { trialEndsAt: undefined });
                    return;
                  }
                  const iso = displayToISO(trialDateInput);
                  if (!iso) {
                    setTrialDateError('Use DD/MM/YYYY format');
                    return;
                  }
                  updateSubscription(id, { trialEndsAt: iso });
                }}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              {!!trialDateError && (
                <Text style={styles.trialDateError}>{trialDateError}</Text>
              )}
            </View>
          )}
        </View>

        {/* Billing history */}
        {billingHistory.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment History</Text>
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {billingHistory.map((h, i) => (
                <View
                  key={h.date}
                  style={[styles.historyRow, i < billingHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.historyDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.historyDate, { color: colors.foreground }]}>
                    {formatDate(h.date)}
                  </Text>
                  <Text style={[styles.historyAmount, { color: colors.foreground }]}>
                    SAR {formatSAR(h.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* How to cancel — AI assistant (only for active subs) */}
          {isActive && (
            <TouchableOpacity
              onPress={handleHowToCancel}
              activeOpacity={0.8}
              style={[styles.actionBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary, borderRadius: colors.radius }]}
            >
              <Feather name="cpu" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>How to Cancel This</Text>
            </TouchableOpacity>
          )}

          {/* Not a subscription / Restore */}
          {isExcluded ? (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setConfirmConfig({
                  title: 'Restore as Subscription',
                  message: `Move ${sub.name} back to your subscriptions list? It will count toward your monthly total again.`,
                  confirmLabel: 'Restore',
                  cancelLabel: 'Cancel',
                  destructive: false,
                  onConfirm: () => { restoreSubscription(id); router.back(); },
                });
              }}
              activeOpacity={0.8}
              style={[styles.actionBtn, { backgroundColor: colors.accent + '15', borderColor: colors.accent, borderRadius: colors.radius }]}
            >
              <Feather name="refresh-cw" size={18} color={colors.accent} />
              <Text style={[styles.actionBtnText, { color: colors.accent }]}>Restore as Subscription</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setConfirmConfig({
                    title: 'Not a Subscription?',
                    message: `If "${sub.name}" is a regular expense (like a daily coffee or meal) rather than a true subscription, you can hide it from SubTrack. It will move to the "Regular" tab and won't count toward your monthly total.`,
                    confirmLabel: 'Move to Regular',
                    cancelLabel: 'Keep as Subscription',
                    destructive: false,
                    onConfirm: () => { excludeSubscription(id); router.back(); },
                  });
                }}
                activeOpacity={0.8}
                style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <Feather name="slash" size={18} color={colors.mutedForeground} />
                <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Not a Subscription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleStatus}
                activeOpacity={0.8}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isActive ? colors.destructive + '15' : colors.accent + '15',
                    borderColor: isActive ? colors.destructive : colors.accent,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather name={isActive ? 'x-circle' : 'check-circle'} size={18} color={isActive ? colors.destructive : colors.accent} />
                <Text style={[styles.actionBtnText, { color: isActive ? colors.destructive : colors.accent }]}>
                  {isActive ? 'Mark as Cancelled' : 'Mark as Active'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.8}
            style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <Feather name="trash-2" size={18} color={colors.mutedForeground} />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Remove from SubTrack</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Edit Sheet ─────────────────────────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !editSaving && setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit Subscription</Text>
              {!editSaving && (
                <TouchableOpacity onPress={() => setShowEdit(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Name */}
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={v => { setEditName(v); setEditErrors(e => ({ ...e, name: undefined })); }}
              placeholder="e.g. Netflix"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.editInput, { backgroundColor: colors.card, borderColor: editErrors.name ? '#FF6B6B' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            />
            {editErrors.name && <Text style={styles.editErr}>{editErrors.name}</Text>}

            {/* Amount */}
            <Text style={[styles.editLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Amount (SAR)</Text>
            <TextInput
              value={editAmount}
              onChangeText={v => { setEditAmount(v); setEditErrors(e => ({ ...e, amount: undefined })); }}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.editInput, { backgroundColor: colors.card, borderColor: editErrors.amount ? '#FF6B6B' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            />
            {editErrors.amount && <Text style={styles.editErr}>{editErrors.amount}</Text>}

            {/* Billing Cycle */}
            <Text style={[styles.editLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Billing Cycle</Text>
            <View style={styles.editSegment}>
              {(['weekly', 'monthly', 'annual'] as BillingCycle[]).map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setEditCycle(c)}
                  style={[
                    styles.editSegmentBtn,
                    { borderColor: editCycle === c ? colors.primary : colors.border, backgroundColor: editCycle === c ? colors.primary + '15' : colors.card },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.editSegmentText, { color: editCycle === c ? colors.primary : colors.mutedForeground, fontFamily: editCycle === c ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={[styles.editLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Category</Text>
            <View style={styles.editCategoryGrid}>
              {(['streaming', 'software', 'fitness', 'food', 'gaming', 'utilities', 'education', 'other'] as Category[]).map(cat => {
                const catCol = getCategoryColor(cat);
                const selected = editCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditCategory(cat)}
                    style={[
                      styles.editCatChip,
                      { borderColor: selected ? catCol : colors.border, backgroundColor: selected ? catCol + '18' : colors.card },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editCatText, { color: selected ? catCol : colors.mutedForeground, fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save */}
            <TouchableOpacity
              onPress={handleEditSave}
              disabled={editSaving}
              activeOpacity={0.85}
              style={[styles.editSaveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: editSaving ? 0.7 : 1 }]}
            >
              {editSaving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.editSaveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function DetailRow({ label, value, valueColor, colors: c, last }: { label: string; value: string; valueColor?: string; colors?: any; last?: boolean }) {
  const colors = useColors();
  const col = c ?? colors;
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: 1, borderBottomColor: col.border }]}>
      <Text style={[styles.detailLabel, { color: col.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor ?? col.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  back: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroName: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  heroMerchant: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  heroBadgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  heroCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  heroCatText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  amountCard: { padding: 18 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  amountLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  amountValue: { color: '#fff', fontSize: 30, fontFamily: 'Inter_700Bold' },
  amountShareLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
  amountRight: { alignItems: 'flex-end' },
  amountYearlyLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  amountYearlyValue: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  amountNext: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  amountNextText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  sharedCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sharedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sharedTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sharedSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  sharedStepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { flex: 1, alignItems: 'center', gap: 2 },
  stepperNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  stepperLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  detailCard: {
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  historyCard: { overflow: 'hidden', borderWidth: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyDate: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  historyAmount: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  actions: { paddingHorizontal: 16, marginTop: 24, gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  trialDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  trialDateInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 140,
  },
  trialDateError: {
    width: '100%',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#FF6B6B',
    paddingLeft: 22,
    marginTop: 2,
  },

  // Edit sheet
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  editTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  editLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  editInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  editErr: { color: '#FF6B6B', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  editSegment: { flexDirection: 'row', gap: 8 },
  editSegmentBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  editSegmentText: { fontSize: 14 },
  editCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editCatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editCatText: { fontSize: 13 },
  editSaveBtn: { marginTop: 32, paddingVertical: 16, alignItems: 'center' },
  editSaveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
