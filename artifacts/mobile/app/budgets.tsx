import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions, getCategoryColor, getCategoryLabel, Category } from '@/context/SubscriptionContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { PremiumGate } from '@/components/PremiumGate';
import { useBudgets, getBudgetBarColor } from '@/context/BudgetContext';

const CAT_ICON: Record<Category, string> = {
  streaming: 'tv', software: 'code', fitness: 'activity', food: 'coffee',
  gaming: 'grid', utilities: 'zap', education: 'book-open', other: 'tag',
};

export default function BudgetsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { subscriptions } = useSubscriptions();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();
  const { allCaps: limits, setCap } = useBudgets();
  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editValue, setEditValue] = useState('');

  // Aggregate monthly spend per category
  const spendByCat = useMemo(() => {
    const map: Record<string, number> = {};
    subscriptions.filter(s => s.status === 'active').forEach(s => {
      const monthly = s.billingCycle === 'monthly' ? s.amount
        : s.billingCycle === 'annual' ? s.amount / 12
        : s.amount * 4.33;
      map[s.category] = (map[s.category] ?? 0) + monthly;
    });
    return map;
  }, [subscriptions]);

  const categories = Object.keys(spendByCat) as Category[];

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setEditValue(limits[cat] ? String(limits[cat]) : '');
  };

  const handleSaveLimit = async () => {
    if (!editCat) return;
    const num = parseFloat(editValue);
    if (!editValue || isNaN(num) || num <= 0) {
      Alert.alert(t('error'), isRTL ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
      return;
    }
    await setCap(editCat, num);
    setEditCat(null);
  };

  const handleRemoveLimit = async () => {
    if (!editCat) return;
    await setCap(editCat, null);
    setEditCat(null);
  };

  return (
    <PremiumGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, rtl.row(), { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('budgets_title')}
            </Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('budgets_subtitle')}
            </Text>
          </View>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="pie-chart" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('budgets_empty')}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {categories.map(cat => {
              const spend = spendByCat[cat] ?? 0;
              const limit = limits[cat];
              const pct   = limit ? Math.min(spend / limit, 1) : 0;
              const over  = limit && spend > limit;
              const near  = limit && !over && spend / limit >= 0.8;
              const color = getCategoryColor(cat);
              const barColor = getBudgetBarColor(spend, limit, color);

              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => openEdit(cat)}
                  activeOpacity={0.75}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: over ? '#FF475750' : near ? '#F59E0B50' : colors.border, borderRadius: colors.radius }]}
                >
                  {/* Top row */}
                  <View style={[styles.cardTop, rtl.row()]}>
                    <View style={[styles.catIcon, { backgroundColor: color + '20' }]}>
                      <Feather name={CAT_ICON[cat] as any} size={17} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catName, { color: colors.foreground, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>
                        {getCategoryLabel(cat)}
                      </Text>
                      <Text style={[styles.catSpend, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                        SAR {spend.toFixed(2)}/mo
                        {limit ? ` — ${t('budgets_of_limit', { limit: limit.toFixed(0) })}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.editBtn, { borderColor: colors.border }]}>
                      <Feather name="edit-2" size={13} color={colors.mutedForeground} />
                    </View>
                  </View>

                  {/* Progress bar */}
                  {limit ? (
                    <>
                      <View style={[styles.bar, { backgroundColor: colors.muted }]}>
                        <View style={[
                          styles.barFill,
                          { width: `${pct * 100}%` as any, backgroundColor: barColor },
                        ]} />
                      </View>
                      {over && (
                        <Text style={[styles.overText, { fontFamily: fonts.medium, textAlign: isRTL ? 'right' : 'left' }]}>
                          {t('budgets_over', { amount: (spend - limit).toFixed(2) })}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.noLimitText, { color: colors.primary, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('budgets_tap_to_set')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Edit budget modal */}
        <Modal visible={!!editCat} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditCat(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, rtl.row()]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
                {editCat ? t('budgets_edit_title', { cat: getCategoryLabel(editCat) }) : ''}
              </Text>
              <TouchableOpacity onPress={() => setEditCat(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {editCat && (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
                <Text style={[styles.modalSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                  {t('budgets_edit_sub', { spend: (spendByCat[editCat] ?? 0).toFixed(2) })}
                </Text>
                <View style={[styles.amountRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <Text style={[styles.sarLabel, { color: colors.mutedForeground, fontFamily: fonts.semibold }]}>SAR</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.foreground, fontFamily: fonts.bold }]}
                    placeholder={t('budgets_limit_placeholder')}
                    placeholderTextColor={colors.mutedForeground}
                    value={editValue}
                    onChangeText={v => setEditValue(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
                <TouchableOpacity onPress={handleSaveLimit} activeOpacity={0.85} style={styles.saveBtn}>
                  <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.saveBtnInner}>
                    <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>{t('save')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                {limits[editCat] && (
                  <TouchableOpacity onPress={handleRemoveLimit} style={{ alignItems: 'center', marginTop: 14 }}>
                    <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: fonts.regular }}>{t('budgets_remove_limit')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 22 },
  pageSub:   { fontSize: 12, marginTop: 2 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card:    { padding: 16, borderWidth: 1, gap: 10 },
  cardTop: { gap: 12, alignItems: 'center' },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catName:  { fontSize: 15 },
  catSpend: { fontSize: 12, marginTop: 2 },
  editBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  overText:    { fontSize: 12, color: '#FF4757', marginTop: -4 },
  noLimitText: { fontSize: 12 },
  modal:       { flex: 1, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  modalTitle:  { fontSize: 18 },
  modalBody:   { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  modalSub:    { fontSize: 13, lineHeight: 19 },
  amountRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, height: 56, gap: 10 },
  sarLabel:    { fontSize: 14 },
  amountInput: { flex: 1, fontSize: 24 },
  saveBtn:     { borderRadius: 14, overflow: 'hidden' },
  saveBtnInner:{ height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16 },
});
