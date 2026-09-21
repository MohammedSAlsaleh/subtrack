import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBills, Bill, BillCategory, BILL_CAT_ICON, BILL_CAT_COLOR, daysUntilDue } from '@/context/BillsContext';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { router } from 'expo-router';
import { PremiumGate } from '@/components/PremiumGate';
import { EmptyState } from '@/components/EmptyState';

const BILL_CATEGORIES: BillCategory[] = ['rent', 'insurance', 'utilities', 'phone', 'internet', 'other'];

const CAT_KEY: Record<BillCategory, string> = {
  rent: 'bills_cat_rent', insurance: 'bills_cat_insurance',
  utilities: 'bills_cat_utilities', phone: 'bills_cat_phone',
  internet: 'bills_cat_internet', other: 'bills_cat_other',
};

interface FormState {
  name: string; amount: string; dueDayOfMonth: string; category: BillCategory;
}
const DEFAULT_FORM: FormState = { name: '', amount: '', dueDayOfMonth: '', category: 'rent' };

export default function BillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bills, monthlyBillsTotal, addBill, removeBill } = useBills();
  const { banks } = useSubscriptions();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();

  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors]     = useState<Partial<FormState>>({});
  const [saving, setSaving]     = useState(false);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const openAdd = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForm(DEFAULT_FORM); setErrors({}); setSaving(false); setShowAdd(true);
  };

  const handleDelete = (bill: Bill) => {
    Alert.alert(
      t('bills_delete_title'),
      t('bills_delete_msg', { name: bill.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('bills_delete_btn'), style: 'destructive', onPress: () => removeBill(bill.id) },
      ]
    );
  };

  const handleSave = async () => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim()) errs.name = t('required');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = t('required');
    const day = parseInt(form.dueDayOfMonth, 10);
    if (!form.dueDayOfMonth || isNaN(day) || day < 1 || day > 31) errs.dueDayOfMonth = '1–31';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addBill({ name: form.name.trim(), amount: amt, currency: 'SAR', dueDayOfMonth: day, category: form.category });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const sorted = [...bills].sort((a, b) => daysUntilDue(a.dueDayOfMonth) - daysUntilDue(b.dueDayOfMonth));

  // Gate: no banks connected yet
  if (banks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('bills_title')}</Text>
        </View>
        <View style={styles.gateWrap}>
          <View style={[styles.gateIconWrap, { backgroundColor: colors.muted }]}>
            <Feather name="credit-card" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.gateTitle, { color: colors.foreground }]}>Connect your bank first</Text>
          <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
            SubTrack detects bills from your bank transactions. Connect a bank to get started.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/banks')}
            activeOpacity={0.85}
            style={[styles.gateBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.gateBtnText, { color: colors.primaryForeground }]}>Connect a Bank</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <PremiumGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{t('bills_title')}</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('bills_subtitle')}</Text>
          </View>
          {bills.length > 0 && (
            <View style={[styles.totalPill, { backgroundColor: 'rgba(0,217,166,0.12)', borderColor: 'rgba(0,217,166,0.25)' }]}>
              <Text style={[styles.totalPillText, { fontFamily: fonts.semibold }]}>
                {t('bills_total', { amount: monthlyBillsTotal.toFixed(0) })}
              </Text>
            </View>
          )}
        </View>

        <FlatList
          data={sorted}
          keyExtractor={b => b.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title={t('bills_empty_title')}
              subtitle={t('bills_empty_sub')}
              actionLabel={t('bills_add')}
              onAction={openAdd}
            />
          }
          renderItem={({ item }) => {
            const days = daysUntilDue(item.dueDayOfMonth);
            const dueSoon = days <= 5;
            const color = BILL_CAT_COLOR[item.category];
            return (
              <TouchableOpacity
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.75}
                style={[styles.billRow, { borderBottomColor: colors.border }]}
              >
                {/* Color bar */}
                <View style={[styles.colorBar, { backgroundColor: color }]} />

                <View style={[styles.billIcon, { backgroundColor: color + '20' }]}>
                  <Feather name={BILL_CAT_ICON[item.category] as any} size={18} color={color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.billName, { color: colors.foreground, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>{item.name}</Text>
                  <Text style={[styles.billMeta, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(CAT_KEY[item.category])} · {t('bills_due', { day: item.dueDayOfMonth })}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.billAmount, { color: colors.foreground, fontFamily: fonts.bold }]}>
                    SAR {item.amount.toFixed(0)}
                  </Text>
                  {dueSoon ? (
                    <View style={[styles.dueSoonBadge, { backgroundColor: colors.destructive + '20' }]}>
                      <Text style={[styles.dueSoonText, { color: colors.destructive, fontFamily: fonts.semibold }]}>{t('bills_due_soon')}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.daysText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                      {days === 0 ? t('today') : days === 1 ? t('tomorrow') : `${days}d`}
                    </Text>
                  )}
                </View>

                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />

        {/* FAB */}
        <TouchableOpacity
          onPress={openAdd}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 90 : insets.bottom + 70 }]}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>

        {/* Add Bill Modal */}
        <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, rtl.row()]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('bills_form_title')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>

              {/* Name */}
              <FieldBlock label={t('bills_name')} error={errors.name}>
                <FieldInput
                  placeholder={t('bills_name_placeholder')}
                  value={form.name}
                  onChangeText={(v: string) => { setForm(f => ({ ...f, name: v })); setErrors(e => ({ ...e, name: undefined })); }}
                  icon="file-text" hasError={!!errors.name} autoCapitalize="words"
                  fontFamily={fonts.regular}
                />
              </FieldBlock>

              {/* Category */}
              <FieldBlock label={t('bills_category')}>
                <View style={styles.catGrid}>
                  {BILL_CATEGORIES.map(cat => {
                    const active = form.category === cat;
                    const c = BILL_CAT_COLOR[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setForm(f => ({ ...f, category: cat }))}
                        style={[styles.catCell, { borderColor: active ? c : colors.border, backgroundColor: active ? c + '18' : colors.card, borderRadius: colors.radius }]}
                        activeOpacity={0.75}
                      >
                        <Feather name={BILL_CAT_ICON[cat] as any} size={16} color={active ? c : colors.mutedForeground} />
                        <Text style={[styles.catCellLabel, { color: active ? c : colors.mutedForeground, fontFamily: fonts.medium }]}>{t(CAT_KEY[cat])}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FieldBlock>

              {/* Amount + Due Day row */}
              <View style={rtl.row({ gap: 12 })}>
                <View style={{ flex: 1 }}>
                  <FieldBlock label={t('bills_amount')} error={errors.amount}>
                    <View style={[styles.amtRow, { backgroundColor: colors.card, borderColor: errors.amount ? '#FF6B6B' : colors.border, borderRadius: colors.radius }]}>
                      <Text style={[styles.sarLabel, { color: colors.mutedForeground, fontFamily: fonts.semibold }]}>SAR</Text>
                      <TextInput
                        style={[styles.amtInput, { color: colors.foreground, fontFamily: fonts.bold }]}
                        placeholder="0.00"
                        placeholderTextColor={colors.mutedForeground}
                        value={form.amount}
                        onChangeText={(v: string) => { setForm(f => ({ ...f, amount: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })); setErrors(e => ({ ...e, amount: undefined })); }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </FieldBlock>
                </View>
                <View style={{ flex: 1 }}>
                  <FieldBlock label={t('bills_due_day')} error={errors.dueDayOfMonth}>
                    <FieldInput
                      placeholder={t('bills_due_day_placeholder')}
                      value={form.dueDayOfMonth}
                      onChangeText={(v: string) => { setForm(f => ({ ...f, dueDayOfMonth: v.replace(/\D/g, '').slice(0, 2) })); setErrors(e => ({ ...e, dueDayOfMonth: undefined })); }}
                      icon="calendar" hasError={!!errors.dueDayOfMonth} keyboardType="number-pad"
                      fontFamily={fonts.regular}
                    />
                  </FieldBlock>
                </View>
              </View>

              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={styles.saveBtn}>
                <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.saveBtnInner}>
                  <Feather name="plus-circle" size={16} color="#fff" />
                  <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>{saving ? t('saving') : t('bills_add')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </PremiumGate>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function FieldBlock({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const colors = useColors();
  const { fonts } = useLanguage();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.semibold }]}>{label}</Text>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function FieldInput({ placeholder, value, onChangeText, icon, hasError, autoCapitalize, keyboardType, fontFamily }: any) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: hasError ? '#FF6B6B' : focused ? '#7B6CF8' : colors.border, borderRadius: 12 }]}>
      <Feather name={icon} size={15} color={focused ? '#7B6CF8' : colors.mutedForeground} style={{ marginRight: 8 }} />
      <TextInput
        style={[styles.fieldInputText, { color: colors.foreground, fontFamily }]}
        placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        value={value} onChangeText={onChangeText}
        autoCapitalize={autoCapitalize ?? 'none'} autoCorrect={false}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gateIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  gateTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  gateSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  gateBtn: { paddingHorizontal: 28, paddingVertical: 14, marginTop: 4 },
  gateBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 26 },
  pageSub:   { fontSize: 12, marginTop: 2 },
  totalPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  totalPillText: { color: '#00D9A6', fontSize: 12 },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, paddingVertical: 14, borderBottomWidth: 1, gap: 12, overflow: 'hidden' },
  colorBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  billIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  billName:   { fontSize: 14 },
  billMeta:   { fontSize: 11, marginTop: 2 },
  billAmount: { fontSize: 14 },
  dueSoonBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  dueSoonText:  { fontSize: 10 },
  daysText: { fontSize: 11 },
  deleteBtn: { padding: 4 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  modal: { flex: 1, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  modalTitle: { fontSize: 20 },
  formBody: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCell: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1.5, width: '48%' },
  catCellLabel: { fontSize: 12 },
  amtRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, height: 50, gap: 8 },
  sarLabel: { fontSize: 13 },
  amtInput: { flex: 1, fontSize: 18 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.3 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, height: 48 },
  fieldInputText: { flex: 1, fontSize: 14 },
  fieldError: { fontSize: 11, color: '#FF6B6B' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnInner: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 15 },
});
