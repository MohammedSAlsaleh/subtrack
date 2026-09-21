import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions, BankAccount, SUBSCRIPTION_POOL, SubscriptionTemplate } from '@/context/SubscriptionContext';
import { detectPaymentType } from '@/utils/paymentDetector';
import { useBills, BILLS_POOL } from '@/context/BillsContext';
import { useAuth } from '@/context/AuthContext';
import { BankCard } from '@/components/BankCard';
import { EmptyState } from '@/components/EmptyState';

// ─── Saudi bank palette ────────────────────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
  'Al Rajhi Bank': '#78BE20',
  'Saudi National Bank': '#0072CE',
  'Riyad Bank': '#E31837',
  'Banque Saudi Fransi': '#003399',
  'Arab National Bank': '#00529B',
  'SABB': '#DB0011',
  'Alinma Bank': '#6B2D8B',
  'Bank Albilad': '#F7941D',
};

// ─── Simulated accounts returned by Lean after KYC ────────────────────────
// In production these come from GET /entities/v1/ + GET /accounts/v1/
// ─── Seeding helpers ──────────────────────────────────────────────────────
/** Local YYYY-MM-DD string N days from today (positive = future, negative = past). */
function localDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Random integer in [min, max] inclusive. */
function rInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Fisher-Yates shuffle — returns a new array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SIMULATED_LEAN_ACCOUNTS = [
  { id: 'l1', bankName: 'Al Rajhi Bank',       accountType: 'Current', lastFour: '4821' },
  { id: 'l2', bankName: 'Al Rajhi Bank',       accountType: 'Savings', lastFour: '3317' },
  { id: 'l3', bankName: 'Saudi National Bank', accountType: 'Current', lastFour: '7742' },
  { id: 'l4', bankName: 'Riyad Bank',          accountType: 'Current', lastFour: '9156' },
  { id: 'l5', bankName: 'Alinma Bank',         accountType: 'Savings', lastFour: '2088' },
];

type WizardStep = 'kyc' | 'fetching' | 'select' | 'done';

interface LeanCandidate {
  id: string;
  bankName: string;
  accountType: string;
  lastFour: string;
  selected: boolean;
}

// ─── KYC date auto-formatter ───────────────────────────────────────────────
function formatDateInput(raw: string, prev: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function BanksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { banks, addBank, removeBank, subscriptions, addSubscription, updateSubscription } = useSubscriptions();
  const { addBill } = useBills();
  const { user, markKycCompleted, saveIncome } = useAuth();

  // Keep saveIncome in a ref so setTimeout callbacks always call the latest version
  // and never act on a stale closure from a previous render.
  const saveIncomeRef = React.useRef(saveIncome);
  useEffect(() => { saveIncomeRef.current = saveIncome; }, [saveIncome]);

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>('kyc');

  // KYC fields
  const [nationalId, setNationalId]   = useState('');
  const [birthDate, setBirthDate]     = useState('');
  const [consented, setConsented]     = useState(false);
  const [kycError, setKycError]       = useState('');
  // Keep a ref to the submitted NID so startFetching can use it for the Lean income lookup
  const submittedNid = React.useRef('');

  // Select step
  const [candidates, setCandidates]   = useState<LeanCandidate[]>([]);
  const [saving, setSaving]           = useState(false);

  // Done step — populated when handleConnect finishes
  const [doneAccounts, setDoneAccounts]       = useState<LeanCandidate[]>([]);
  const [doneSubsSeeded, setDoneSubsSeeded]   = useState(0);
  const [doneBillsSeeded, setDoneBillsSeeded] = useState(0);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const getSubCount = (bankId: string) => subscriptions.filter(s => s.bankAccountId === bankId && s.status === 'active').length;

  // ─── Open wizard ──────────────────────────────────────────────────────────
  const openWizard = () => {
    setKycError('');
    setNationalId('');
    setBirthDate('');
    setConsented(false);
    setSaving(false);

    if (user?.kycCompleted && banks.length > 0) {
      // Already verified and has connected banks — skip KYC for additional accounts
      setStep('fetching');
      setShowWizard(true);
      startFetching();
    } else {
      // First connection, or all banks were removed — always show KYC form
      setStep('kyc');
      setShowWizard(true);
    }
  };

  const closeWizard = () => {
    setShowWizard(false);
    setTimeout(() => setStep('kyc'), 400);
  };

  // ─── Step 1: Validate KYC and proceed ────────────────────────────────────
  const handleKycSubmit = async () => {
    setKycError('');

    // ── National ID ──────────────────────────────────────────────────────────
    const idClean = nationalId.replace(/\s/g, '');
    if (!/^\d{10}$/.test(idClean)) {
      setKycError('National ID must be exactly 10 digits.');
      return;
    }
    if (idClean[0] !== '1' && idClean[0] !== '2') {
      setKycError('National ID must start with 1 (Saudi citizen) or 2 (Iqama).');
      return;
    }

    // ── Date of birth ────────────────────────────────────────────────────────
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
      setKycError('Enter your birth date as DD/MM/YYYY.');
      return;
    }
    const [ddStr, mmStr, yyyyStr] = birthDate.split('/');
    const dd = parseInt(ddStr, 10);
    const mm = parseInt(mmStr, 10);
    const yyyy = parseInt(yyyyStr, 10);
    // Range checks before constructing a Date
    if (mm < 1 || mm > 12) {
      setKycError('Month must be between 01 and 12.');
      return;
    }
    if (dd < 1 || dd > 31) {
      setKycError('Day must be between 01 and 31.');
      return;
    }
    // Construct and verify it is a real calendar date (e.g. rejects 31/02/2000)
    const dob = new Date(yyyy, mm - 1, dd);
    if (
      dob.getFullYear() !== yyyy ||
      dob.getMonth() + 1 !== mm ||
      dob.getDate() !== dd
    ) {
      setKycError('That date doesn\'t exist. Please check the day and month.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dob >= today) {
      setKycError('Date of birth must be in the past.');
      return;
    }
    // Must be at least 15 years old
    const minAge = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
    if (dob > minAge) {
      setKycError('You must be at least 15 years old to connect bank accounts.');
      return;
    }
    // Cap at 100 years old
    const maxAge = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    if (dob < maxAge) {
      setKycError('Please enter a valid date of birth.');
      return;
    }

    // ── Consent ──────────────────────────────────────────────────────────────
    if (!consented) {
      setKycError('Please check the consent box to continue.');
      return;
    }

    submittedNid.current = idClean;
    await markKycCompleted();
    setStep('fetching');
    startFetching(idClean);
  };

  // ─── Lean income simulation ───────────────────────────────────────────────
  // Derives a deterministic, realistic monthly salary from the national ID.
  // In production this calls the Lean Technologies identity/income API.
  const simulateLeanIncome = (nid: string): number => {
    const seed = parseInt(nid.slice(-6), 10) || 0;
    // Steps of 500 SAR across a realistic Saudi salary range: 8,000 – 40,000
    const steps = seed % 65; // 0‥64
    return 8000 + steps * 500;
  };

  // ─── Step 2: Simulate Lean account fetch + income lookup via Lean ─────────
  const startFetching = (nid?: string) => {
    setTimeout(async () => {
      // Filter out accounts already connected
      const existingLastFours = new Set(banks.map(b => b.lastFour));
      const fresh = SIMULATED_LEAN_ACCOUNTS
        .filter(a => !existingLastFours.has(a.lastFour))
        .map(a => ({ ...a, selected: true }));
      setCandidates(fresh);

      // Always populate income from Lean when a NID is available.
      // Uses a ref so we always call the latest saveIncome, not a stale closure.
      const resolvedNid = nid ?? submittedNid.current;
      if (resolvedNid) {
        const salary = simulateLeanIncome(resolvedNid);
        await saveIncomeRef.current(salary, true);
      }

      setStep('select');
    }, 2200);
  };

  // ─── Step 3: Toggle selection ─────────────────────────────────────────────
  const toggleCandidate = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const toggleAll = () => {
    const allSelected = candidates.every(c => c.selected);
    setCandidates(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  // ─── Step 4: Connect selected accounts ───────────────────────────────────
  const handleConnect = async () => {
    const chosen = candidates.filter(c => c.selected);
    if (chosen.length === 0) {
      Alert.alert('No accounts selected', 'Select at least one account to connect.');
      return;
    }
    setSaving(true);
    const isFirstConnection = banks.length === 0;

    // Add each bank and collect the generated IDs
    const newBankIds: string[] = [];
    for (const acc of chosen) {
      const id = await addBank({
        bankName: acc.bankName,
        accountType: acc.accountType,
        lastFour: acc.lastFour,
        leanEntityId: `lean_${acc.id}_${acc.lastFour}`,
      });
      newBankIds.push(id);
    }

    // On first connection, seed randomised subscriptions and bills
    if (isFirstConnection && newBankIds.length > 0) {
      // ── Pick a random subset of subscriptions from the full pool ──────────
      // Always include at least one streaming + one software entry, then fill
      // up to a random total of 7-10 from the shuffled remainder.
      const target = rInt(7, 10);
      const streaming = shuffle(SUBSCRIPTION_POOL.filter(s => s.category === 'streaming'));
      const software  = shuffle(SUBSCRIPTION_POOL.filter(s => s.category === 'software'));
      const rest      = shuffle(SUBSCRIPTION_POOL.filter(s => s.category !== 'streaming' && s.category !== 'software'));
      const guaranteed = [streaming[0], software[0]].filter(Boolean);
      const filler = shuffle([...streaming.slice(1), ...software.slice(1), ...rest])
        .slice(0, target - guaranteed.length);
      const chosen_subs: SubscriptionTemplate[] = shuffle([...guaranteed, ...filler]);

      // Distribute round-robin across connected banks with randomised dates
      for (let i = 0; i < chosen_subs.length; i++) {
        const sub = chosen_subs[i];
        const detection = detectPaymentType({
          name:         sub.name,
          category:     sub.category,
          billingCycle: sub.billingCycle,
          amount:       sub.amount,
        });
        // nextBillingDate: scatter across the next 1–40 days
        // startedAt: random point 4–24 months in the past
        const nextBillingDate = localDateOffset(rInt(1, 40));
        const startedAt       = localDateOffset(-rInt(120, 730));
        const newId = await addSubscription({
          ...sub,
          nextBillingDate,
          bankAccountId: newBankIds[i % newBankIds.length],
          status: detection.isRegularPayment ? 'excluded' : sub.status,
        });
        // addSubscription always sets startedAt = today; patch immediately
        // with the randomised past date so history looks realistic.
        await updateSubscription(newId, { startedAt });
      }

      // ── Pick a randomised set of bills ────────────────────────────────────
      // Always 1 rent + 1 phone plan + 1 insurance + up to 3 extras.
      const rentBills      = shuffle(BILLS_POOL.filter(b => b.category === 'rent'));
      const phoneBills     = shuffle(BILLS_POOL.filter(b => b.category === 'phone'));
      const insuranceBills = shuffle(BILLS_POOL.filter(b => b.category === 'insurance'));
      const extraBills     = shuffle(BILLS_POOL.filter(b => !['rent','phone','insurance'].includes(b.category)));
      const bills_to_seed  = [
        rentBills[0],
        phoneBills[0],
        insuranceBills[0],
        ...extraBills.slice(0, rInt(1, 3)),
      ].filter(Boolean);

      for (const bill of bills_to_seed) {
        await addBill(bill);
      }
    }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    setDoneAccounts(chosen);
    setDoneSubsSeeded(isFirstConnection ? rInt(7, 10) : 0);
    setDoneBillsSeeded(isFirstConnection ? rInt(4, 6) : 0);
    setStep('done');
  };

  // ─── Remove ───────────────────────────────────────────────────────────────
  const handleRemove = (bank: BankAccount) => {
    Alert.alert(
      'Remove Bank',
      `Disconnect ${bank.bankName} \u00b7\u00b7\u00b7\u00b7 ${bank.lastFour}? Subscriptions from this account will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => removeBank(bank.id) },
      ]
    );
  };

  const selectedCount = candidates.filter(c => c.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Bank Accounts</Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Powered by Lean Technologies</Text>
        </View>
        <TouchableOpacity
          onPress={openWizard}
          style={[styles.connectBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Feather name="link" size={15} color={colors.primaryForeground} />
          <Text style={[styles.connectBtnText, { color: colors.primaryForeground }]}>
            {banks.length > 0 ? 'Add More' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Security banner ─────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <LinearGradient
          colors={['#1A2235', '#0D1520']}
          style={[styles.banner, { borderRadius: colors.radius, borderColor: '#00D9A625' }]}
        >
          <View style={styles.bannerIcon}>
            <Feather name="shield" size={16} color="#00D9A6" />
          </View>
          <Text style={styles.bannerText}>
            Read-only access via Lean open banking. SubTrack never stores your credentials or moves funds.
          </Text>
        </LinearGradient>
      </View>

      {/* ─── Banks list ──────────────────────────────────────────────────── */}
      <FlatList
        data={banks}
        keyExtractor={b => b.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title="No banks connected"
            subtitle="Connect your Saudi bank accounts to automatically detect and track your subscriptions."
            actionLabel="Connect Banks"
            onAction={openWizard}
          />
        }
        renderItem={({ item }) => (
          <BankCard
            bank={item}
            onRemove={() => handleRemove(item)}
            subscriptionCount={getSubCount(item.id)}
          />
        )}
      />

      {/* ─── Wizard modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showWizard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => step !== 'fetching' && step !== 'done' && closeWizard()}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          {/* ── Step 1: KYC ─────────────────────────────────────────────── */}
          {step === 'kyc' && (
            <ScrollView
              contentContainerStyle={styles.stepWrap}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.stepHeader}>
                <TouchableOpacity onPress={closeWizard} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
                <View style={[styles.stepBadge, { backgroundColor: 'rgba(123,108,248,0.15)' }]}>
                  <Text style={[styles.stepBadgeText, { color: '#9D8FF8' }]}>Step 1 of 3</Text>
                </View>
              </View>

              <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.stepIconCircle}>
                <Feather name="user-check" size={26} color="#fff" />
              </LinearGradient>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Verify Your Identity</Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                This one-time verification lets Lean securely fetch your bank accounts. You{'\u2019'}ll never need to do this again.
              </Text>

              {/* National ID */}
              <KycField
                label="National ID"
                placeholder="10-digit ID number"
                value={nationalId}
                onChangeText={v => setNationalId(v.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                icon="credit-card"
                hint="Saudi ID starts with 1, Iqama starts with 2"
              />

              {/* Birth date */}
              <KycField
                label="Date of Birth"
                placeholder="DD/MM/YYYY"
                value={birthDate}
                onChangeText={v => setBirthDate(formatDateInput(v, birthDate))}
                keyboardType="number-pad"
                icon="calendar"
              />

              {/* Consent */}
              <TouchableOpacity
                onPress={() => setConsented(v => !v)}
                activeOpacity={0.75}
                style={[styles.consentRow, { borderColor: consented ? '#7B6CF8' : colors.border, backgroundColor: consented ? 'rgba(123,108,248,0.06)' : colors.card }]}
              >
                <View style={[styles.checkbox, { borderColor: consented ? '#7B6CF8' : colors.border, backgroundColor: consented ? '#7B6CF8' : 'transparent' }]}>
                  {consented && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={[styles.consentText, { color: colors.mutedForeground }]}>
                  I consent to SubTrack fetching my financial transaction data from my banks via Lean Technologies for subscription detection.
                </Text>
              </TouchableOpacity>

              {!!kycError && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color="#FF6B6B" />
                  <Text style={styles.errorText}>{kycError}</Text>
                </View>
              )}

              <TouchableOpacity onPress={handleKycSubmit} activeOpacity={0.85} style={styles.primaryBtn}>
                <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.primaryBtnInner}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
                Your data is fetched in read-only mode. Lean Technologies is a licensed open banking provider regulated in Saudi Arabia.
              </Text>
            </ScrollView>
          )}

          {/* ── Step 2: Fetching ─────────────────────────────────────────── */}
          {step === 'fetching' && (
            <View style={styles.fetchingWrap}>
              <LinearGradient colors={['#00D9A6', '#00B890']} style={styles.fetchingIcon}>
                <Feather name="zap" size={30} color="#fff" />
              </LinearGradient>
              <Text style={[styles.fetchingTitle, { color: colors.foreground }]}>
                Fetching your accounts
              </Text>
              <Text style={[styles.fetchingSubtitle, { color: colors.mutedForeground }]}>
                Lean is securely connecting to all your Saudi banks and retrieving your active accounts...
              </Text>
              <ActivityIndicator color="#00D9A6" style={{ marginTop: 24 }} size="large" />

              <View style={styles.fetchingBanks}>
                {['Al Rajhi Bank', 'Saudi National Bank', 'Riyad Bank', 'Alinma Bank'].map((b, i) => (
                  <View key={b} style={[styles.fetchingBankPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.fetchingBankDot, { backgroundColor: BANK_COLORS[b] ?? '#7B6CF8' }]} />
                    <Text style={[styles.fetchingBankName, { color: colors.mutedForeground }]}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 3: Select accounts ──────────────────────────────────── */}
          {step === 'select' && (
            <View style={{ flex: 1 }}>
              {/* Modal header */}
              <View style={styles.selectHeader}>
                <View>
                  <Text style={[styles.stepTitle, { color: colors.foreground, marginBottom: 2 }]}>
                    Your Bank Accounts
                  </Text>
                  <Text style={[styles.stepSubtitle, { color: colors.mutedForeground, marginBottom: 0 }]}>
                    Select the accounts you want SubTrack to monitor
                  </Text>
                </View>
                <View style={[styles.stepBadge, { backgroundColor: 'rgba(0,217,166,0.12)' }]}>
                  <Text style={[styles.stepBadgeText, { color: '#00D9A6' }]}>Step 2 of 3</Text>
                </View>
              </View>

              {/* Select all toggle */}
              <TouchableOpacity onPress={toggleAll} style={[styles.selectAllRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.selectAllText, { color: colors.primary }]}>
                  {candidates.every(c => c.selected) ? 'Deselect all' : 'Select all'}
                </Text>
                <Text style={[styles.selectAllCount, { color: colors.mutedForeground }]}>
                  {selectedCount} of {candidates.length} selected
                </Text>
              </TouchableOpacity>

              {candidates.length === 0 ? (
                <View style={styles.noNewAccounts}>
                  <Feather name="check-circle" size={36} color="#00D9A6" />
                  <Text style={[styles.noNewTitle, { color: colors.foreground }]}>All accounts already connected</Text>
                  <Text style={[styles.noNewSubtitle, { color: colors.mutedForeground }]}>No new accounts were found from Lean.</Text>
                  <TouchableOpacity onPress={closeWizard} style={styles.primaryBtn}>
                    <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.primaryBtnInner}>
                      <Text style={styles.primaryBtnText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {candidates.map(acc => (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => toggleCandidate(acc.id)}
                        activeOpacity={0.75}
                        style={[
                          styles.accountRow,
                          {
                            borderBottomColor: colors.border,
                            backgroundColor: acc.selected ? 'rgba(123,108,248,0.04)' : 'transparent',
                          },
                        ]}
                      >
                        {/* Bank color bar */}
                        <View style={[styles.accountColorBar, { backgroundColor: BANK_COLORS[acc.bankName] ?? '#7B6CF8' }]} />

                        {/* Icon */}
                        <View style={[styles.accountIcon, { backgroundColor: (BANK_COLORS[acc.bankName] ?? '#7B6CF8') + '20' }]}>
                          <Feather name="credit-card" size={18} color={BANK_COLORS[acc.bankName] ?? '#7B6CF8'} />
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.accountBankName, { color: colors.foreground }]}>{acc.bankName}</Text>
                          <Text style={[styles.accountMeta, { color: colors.mutedForeground }]}>
                            {acc.accountType}  \u00b7\u00b7\u00b7\u00b7  {acc.lastFour}
                          </Text>
                        </View>

                        {/* Checkbox */}
                        <View style={[
                          styles.checkboxLg,
                          {
                            borderColor: acc.selected ? '#7B6CF8' : colors.border,
                            backgroundColor: acc.selected ? '#7B6CF8' : 'transparent',
                          },
                        ]}>
                          {acc.selected && <Feather name="check" size={13} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Connect button */}
                  <View style={[styles.selectFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                      onPress={handleConnect}
                      disabled={saving || selectedCount === 0}
                      activeOpacity={0.85}
                      style={[styles.primaryBtn, { opacity: selectedCount === 0 ? 0.4 : 1 }]}
                    >
                      <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.primaryBtnInner}>
                        {saving
                          ? <ActivityIndicator color="#fff" />
                          : <>
                              <Feather name="link" size={16} color="#fff" />
                              <Text style={styles.primaryBtnText}>
                                Connect {selectedCount} account{selectedCount !== 1 ? 's' : ''}
                              </Text>
                            </>
                        }
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Step 4: Done ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <ScrollView
              contentContainerStyle={styles.doneWrap}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Glow ring + icon */}
              <View style={styles.doneIconWrap}>
                <View style={styles.doneGlowOuter} />
                <View style={styles.doneGlowInner} />
                <LinearGradient colors={['#00D9A6', '#00B890']} style={styles.doneIcon}>
                  <Feather name="check" size={34} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={[styles.doneTitle, { color: colors.foreground }]}>You're all set!</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                Your bank accounts are connected. SubTrack is already scanning your transactions for recurring charges.
              </Text>

              {/* Stat chips */}
              <View style={styles.doneStats}>
                <View style={[styles.doneStatChip, { backgroundColor: 'rgba(0,217,166,0.1)', borderColor: 'rgba(0,217,166,0.2)' }]}>
                  <Feather name="credit-card" size={13} color="#00D9A6" />
                  <Text style={[styles.doneStatText, { color: '#00D9A6' }]}>
                    {doneAccounts.length} account{doneAccounts.length !== 1 ? 's' : ''} connected
                  </Text>
                </View>
                {doneSubsSeeded > 0 && (
                  <View style={[styles.doneStatChip, { backgroundColor: 'rgba(123,108,248,0.1)', borderColor: 'rgba(123,108,248,0.2)' }]}>
                    <Feather name="zap" size={13} color="#9D8FF8" />
                    <Text style={[styles.doneStatText, { color: '#9D8FF8' }]}>
                      {doneSubsSeeded} subscriptions detected
                    </Text>
                  </View>
                )}
              </View>

              {/* Connected account cards */}
              <View style={[styles.doneCards, { borderColor: colors.border }]}>
                {doneAccounts.map((acc, idx) => {
                  const bankColor = BANK_COLORS[acc.bankName] ?? '#7B6CF8';
                  const isLast = idx === doneAccounts.length - 1;
                  return (
                    <View
                      key={acc.id}
                      style={[
                        styles.doneCardRow,
                        { borderBottomColor: colors.border },
                        isLast && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={[styles.doneCardBar, { backgroundColor: bankColor }]} />
                      <View style={[styles.doneCardIconWrap, { backgroundColor: bankColor + '20' }]}>
                        <Feather name="credit-card" size={16} color={bankColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.doneCardBank, { color: colors.foreground }]}>{acc.bankName}</Text>
                        <Text style={[styles.doneCardMeta, { color: colors.mutedForeground }]}>
                          {acc.accountType} · ···· {acc.lastFour}
                        </Text>
                      </View>
                      <View style={styles.doneCardBadge}>
                        <Feather name="check-circle" size={16} color="#00D9A6" />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* CTA */}
              <TouchableOpacity onPress={closeWizard} activeOpacity={0.85} style={styles.doneCta}>
                <LinearGradient colors={['#00D9A6', '#00B890']} style={styles.doneCtaInner}>
                  <Feather name="home" size={17} color="#fff" />
                  <Text style={styles.doneCtaText}>Go to Dashboard</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={[styles.doneLegal, { color: colors.mutedForeground }]}>
                Data is read-only. SubTrack never stores credentials or moves funds.
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── KYC field helper ──────────────────────────────────────────────────────
interface KycFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  icon: string;
  hint?: string;
}
function KycField({ label, placeholder, value, onChangeText, keyboardType, icon, hint }: KycFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.kycFieldWrap}>
      <Text style={[styles.kycLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[
        styles.kycInputRow,
        { backgroundColor: colors.card, borderColor: focused ? '#7B6CF8' : colors.border },
      ]}>
        <Feather name={icon as any} size={15} color={focused ? '#7B6CF8' : colors.mutedForeground} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.kycInput, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hint && <Text style={[styles.kycHint, { color: colors.mutedForeground }]}>{hint}</Text>}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  connectBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // Security banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0,217,166,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
    flex: 1,
  },

  // Modal
  modal: { flex: 1, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },

  // Step shared
  stepWrap: { paddingHorizontal: 22, paddingBottom: 40 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeBtn: { padding: 4 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stepBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },

  // KYC fields
  kycFieldWrap: { marginBottom: 14 },
  kycLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  kycInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  kycInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  kycHint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Consent
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  consentText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, flex: 1 },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  errorText: { color: '#FF6B6B', fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },

  // Buttons
  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  primaryBtnInner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  legalNote: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16, marginTop: 16 },

  // Fetching step
  fetchingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  fetchingIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fetchingTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  fetchingSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  fetchingBanks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  fetchingBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  fetchingBankDot: { width: 7, height: 7, borderRadius: 4 },
  fetchingBankName: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  // Select step
  selectHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectAllText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  selectAllCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
    overflow: 'hidden',
  },
  accountColorBar: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0, top: 0, bottom: 0 },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
  },
  accountBankName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  accountMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  checkboxLg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  noNewAccounts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  noNewTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  noNewSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  // Done step
  doneWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 48,
    gap: 16,
  },
  doneIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    marginBottom: 4,
  },
  doneGlowOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,217,166,0.10)',
  },
  doneGlowInner: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,217,166,0.15)',
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  doneSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  doneStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 2,
  },
  doneStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  doneStatText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  doneCards: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  doneCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 12,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  doneCardBar: {
    width: 4,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  doneCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    flexShrink: 0,
  },
  doneCardBank: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  doneCardMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  doneCardBadge: { flexShrink: 0 },
  doneCta: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  doneCtaInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
  },
  doneCtaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.1,
  },
  doneLegal: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
});
