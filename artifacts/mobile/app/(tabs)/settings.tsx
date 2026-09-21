import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ConfirmModal, ConfirmConfig } from '@/components/ConfirmModal';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSubscriptions } from '@/context/SubscriptionContext';
import { useLoans } from '@/context/LoanContext';
import { useBills } from '@/context/BillsContext';
import { useAuth } from '@/context/AuthContext';
import { useBudgets } from '@/context/BudgetContext';
import { useGoals } from '@/context/GoalsContext';
import { useLanguage, useRTL, Language } from '@/context/LanguageContext';
import { useTheme, ThemeOverride } from '@/context/ThemeContext';
import { generateCsv } from '@/utils/generateCsv';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── SettingRow ────────────────────────────────────────────────────────────
interface SettingRowProps {
  icon: string; label: string; subtitle?: string; value?: string;
  toggle?: boolean; toggleValue?: boolean; onToggle?: (v: boolean) => void;
  onPress?: () => void; danger?: boolean; last?: boolean; accent?: boolean;
  premium?: boolean;
}
function SettingRow({ icon, label, subtitle, value, toggle, toggleValue, onToggle, onPress, danger, last, accent, premium }: SettingRowProps) {
  const colors = useColors();
  const { isRTL, fonts } = useLanguage();
  const rtl = useRTL();
  const iconBg = danger ? colors.destructive + '15' : accent ? 'rgba(0,217,166,0.12)' : premium ? 'rgba(123,108,248,0.15)' : colors.secondary;
  const iconColor = danger ? colors.destructive : accent ? '#00D9A6' : premium ? '#9D8FF8' : colors.primary;

  const content = (
    <View style={[styles.row, rtl.row(), !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground, fontFamily: fonts.medium, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor="#fff" />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{value}</Text>
      ) : onPress ? (
        <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={colors.mutedForeground} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
}

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  const colors = useColors();
  const { isRTL, fonts } = useLanguage();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscriptions, banks, monthlyTotal, activeCount, clearAll: clearSubs } = useSubscriptions();
  const { loans, clearAll: clearLoans } = useLoans();
  const { bills, clearAll: clearBills } = useBills();
  const { allCaps } = useBudgets();
  const { goals } = useGoals();
  const { user, logout, restorePremium, saveIncome } = useAuth();
  const { t, fonts, language, setLanguage, isRTL } = useLanguage();
  const { themeOverride, setThemeOverride } = useTheme();
  const rtl = useRTL();

  const [modal, setModal] = useState<ConfirmConfig | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [skipExportPreview, setSkipExportPreview] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('@subtrack_skip_export_preview').then(v => {
      if (v === 'true') setSkipExportPreview(true);
    });
  }, []);

  const [renewalAlerts, setRenewalAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport]   = useState(false);
  const [priceAlerts, setPriceAlerts]     = useState(true);

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeInput, setIncomeInput]         = useState('');
  const [incomeFocused, setIncomeFocused]     = useState(false);
  const [savingIncome, setSavingIncome]       = useState(false);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const isPremium  = !!user?.isPremium;

  const handleLogout = () => {
    setModal({
      title: t('settings_sign_out'),
      message: "You'll need to sign back in to access your subscriptions.",
      confirmLabel: t('settings_sign_out'),
      cancelLabel: t('cancel'),
      destructive: true,
      onConfirm: async () => { await logout(); router.replace('/auth'); },
    });
  };

  const handleRestorePremium = () => {
    setModal({
      title: t('settings_restore_premium'),
      message: t('settings_restore_premium_sub'),
      confirmLabel: t('settings_restore_premium'),
      cancelLabel: t('cancel'),
      onConfirm: async () => {
        const restored = await restorePremium();
        setModal({
          title: restored ? t('premium_restore_found') : t('settings_restore_premium'),
          message: restored ? undefined : t('premium_restore_not_found'),
          confirmLabel: t('done'),
          onConfirm: () => {},
        });
      },
    });
  };

  const handleClearData = () => {
    setModal({
      title: t('settings_clear_data'),
      message: t('settings_clear_data_sub'),
      confirmLabel: t('settings_clear_data'),
      cancelLabel: t('cancel'),
      destructive: true,
      onConfirm: async () => {
        await Promise.all([
          clearSubs(),
          clearLoans(),
          clearBills(),
          AsyncStorage.removeItem('@subtrack_budgets'),
          AsyncStorage.removeItem('@subtrack_goals'),
          AsyncStorage.removeItem('dismissed_duplicate_ids'),
        ]);
        if (user) {
          const updated = { ...user, kycCompleted: false };
          await AsyncStorage.setItem('@subtrack_user', JSON.stringify(updated));
        }
        setModal({ title: t('done'), message: 'All data has been cleared.', confirmLabel: 'OK', onConfirm: () => {} });
      },
    });
  };

  const doExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Available', t('export_sharing_unavailable'));
        return;
      }
      const csv = generateCsv(subscriptions, bills, loans, allCaps, goals);
      const file = new File(Paths.cache, 'subtrack_export.csv');
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export SubTrack Data',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert(t('error'), t('export_error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportPress = async () => {
    if (exporting) return;
    if (skipExportPreview) {
      await doExport();
    } else {
      setShowExportPreview(true);
    }
  };

  const handleToggleSkipPreview = async (val: boolean) => {
    setSkipExportPreview(val);
    await AsyncStorage.setItem('@subtrack_skip_export_preview', val ? 'true' : 'false');
  };

  const toggleLanguage = (lang: Language) => setLanguage(lang);

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '??';
  const bankCount = banks.length;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings_title')}</Text>
        </View>

        {/* Profile card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <LinearGradient colors={['#7B6CF8', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.profileCard, rtl.row(), { borderRadius: colors.radius }]}>
            <View style={styles.profileAvatar}>
              <Text style={[styles.profileInitials, { fontFamily: fonts.bold }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{user?.name ?? 'SubTrack User'}</Text>
              <Text style={[styles.profileEmail, { fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{user?.email ?? ''}</Text>
              <Text style={[styles.profileStats, { fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                {activeCount} {t('nav_subscriptions').toLowerCase()} · SAR {monthlyTotal.toFixed(2)}/mo
              </Text>
            </View>
            <View style={styles.profileBadge}>
              <Text style={[styles.profileBadgeText, { fontFamily: fonts.bold }]}>KSA</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Bank Accounts ── */}
        <Section title={t('settings_s_banks')}>
          <SettingRow
            icon="credit-card"
            label={t('settings_banks_row')}
            subtitle={t('settings_banks_row_sub')}
            onPress={() => router.push('/(tabs)/banks')}
            last
          />
        </Section>

        {/* ── Budget Envelopes ── */}
        <Section title={t('settings_s_budgets')}>
          <SettingRow
            icon="pie-chart"
            label={t('settings_budgets_row')}
            subtitle={t('settings_budgets_row_sub')}
            onPress={() => router.push('/budgets')}
            premium
            last
          />
        </Section>

        {/* ── Financial Profile ── */}
        <Section title="Financial Profile">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setIncomeInput(user?.income ? user.income.toString() : ''); setShowIncomeModal(true); }}
            style={[styles.row, rtl.row(), { borderBottomColor: colors.border }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="trending-up" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: fonts.medium, textAlign: isRTL ? 'right' : 'left' }]}>
                Monthly Income
              </Text>
              {user?.leanVerifiedAt ? (
                <View style={[styles.leanBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Feather name="shield" size={10} color="#00D9A6" />
                  <Text style={[styles.leanBadgeText, { fontFamily: fonts.medium }]}>Lean verified</Text>
                </View>
              ) : (
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                  {user?.income ? 'Set manually' : 'Tap to set your income'}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {user?.income ? (
                <Text style={[styles.rowValue, { color: colors.foreground, fontFamily: fonts.semibold }]}>
                  SAR {user.income.toLocaleString()}
                </Text>
              ) : null}
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        </Section>

        {/* ── Premium ── */}
        <Section title={t('settings_s_premium')}>
          <SettingRow
            icon="star"
            label={t('settings_premium_row')}
            subtitle={isPremium ? t('settings_premium_row_active') : t('settings_premium_row_inactive')}
            onPress={() => router.push('/premium')}
            premium
          />
          <SettingRow
            icon="refresh-cw"
            label={t('settings_restore_premium')}
            subtitle={t('settings_restore_premium_sub')}
            onPress={handleRestorePremium}
            premium
            last
          />
        </Section>

        {/* ── Appearance ── */}
        <Section title={t('settings_s_appearance')}>
          <View style={[styles.langRow, rtl.row(), { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="sun" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: fonts.medium, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings_appearance')}</Text>
            <View style={[styles.langToggle, { backgroundColor: colors.muted, borderRadius: 10 }]}>
              {(['system', 'light', 'dark'] as ThemeOverride[]).map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setThemeOverride(opt)}
                  style={[styles.langOption, themeOverride === opt && { backgroundColor: colors.primary, borderRadius: 8 }]}
                >
                  <Text style={[styles.langOptionText, { fontFamily: fonts.semibold, color: themeOverride === opt ? colors.primaryForeground : colors.mutedForeground }]}>
                    {t(`settings_theme_${opt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        {/* ── Language ── */}
        <Section title={t('settings_s_language')}>
          <View style={[styles.langRow, rtl.row(), { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="globe" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: fonts.medium, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings_language')}</Text>
            <View style={[styles.langToggle, { backgroundColor: colors.muted, borderRadius: 10 }]}>
              {(['en', 'ar'] as Language[]).map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => toggleLanguage(lang)}
                  style={[styles.langOption, language === lang && { backgroundColor: colors.primary, borderRadius: 8 }]}
                >
                  <Text style={[styles.langOptionText, { fontFamily: fonts.semibold, color: language === lang ? colors.primaryForeground : colors.mutedForeground }]}>
                    {lang === 'en' ? 'EN' : 'ع'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        {/* ── Notifications ── */}
        <Section title={t('settings_s_notif')}>
          <SettingRow icon="bell" label={t('settings_renewals')} subtitle={t('settings_renewals_sub')} toggle toggleValue={renewalAlerts} onToggle={setRenewalAlerts} />
          <SettingRow icon="trending-up" label={t('settings_weekly')} subtitle={t('settings_weekly_sub')} toggle toggleValue={weeklyReport} onToggle={setWeeklyReport} />
          <SettingRow icon="alert-circle" label={t('settings_price_alerts')} subtitle={t('settings_price_alerts_sub')} toggle toggleValue={priceAlerts} onToggle={setPriceAlerts} last />
        </Section>

        {/* ── Preferences ── */}
        <Section title={t('settings_s_prefs')}>
          <SettingRow icon="dollar-sign" label={t('settings_currency')} value="SAR (Saudi Riyal)" />
          <SettingRow icon="map-pin" label={t('settings_region')} value="Saudi Arabia" />
          <SettingRow icon="calendar" label={t('settings_billing_start')} value="1st" last />
        </Section>

        {/* ── Export ── */}
        <Section title="DATA">
          <SettingRow
            icon="download"
            label={t('export_title')}
            subtitle={t('export_subtitle')}
            onPress={handleExportPress}
            accent
            last
          />
        </Section>

        {/* ── Stats ── */}
        <Section title={t('settings_s_stats')}>
          <SettingRow icon="repeat" label={t('settings_total_subs')} value={subscriptions.length.toString()} />
          <SettingRow icon="check-circle" label={t('settings_active_count')} value={activeCount.toString()} />
          <SettingRow icon="credit-card" label={t('settings_connected_banks')} value={bankCount.toString()} />
          <SettingRow icon="dollar-sign" label={t('settings_yearly_spend')} value={`SAR ${(monthlyTotal * 12).toFixed(0)}`} last />
        </Section>

        {/* ── About ── */}
        <Section title={t('settings_s_about')}>
          <SettingRow icon="info" label={t('settings_version')} value="1.0.0" />
          <SettingRow icon="star" label={t('settings_rate')} onPress={() => {}} />
          <SettingRow icon="share-2" label={t('settings_share')} onPress={() => {}} last />
        </Section>

        {/* ── Account ── */}
        <Section title={t('settings_s_account')}>
          <SettingRow icon="log-out" label={t('settings_sign_out')} subtitle={user?.email ?? ''} onPress={handleLogout} danger />
          <SettingRow icon="trash-2" label={t('settings_clear_data')} subtitle={t('settings_clear_data_sub')} onPress={handleClearData} danger last />
        </Section>
      </ScrollView>

      {/* ── Income Edit Modal ── */}
      <Modal visible={showIncomeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowIncomeModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, rtl.row()]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>Monthly Income</Text>
            <TouchableOpacity onPress={() => setShowIncomeModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {user?.leanVerifiedAt ? (
              <View style={styles.leanInfoBanner}>
                <Feather name="shield" size={14} color="#00D9A6" />
                <Text style={[styles.leanInfoText, { fontFamily: fonts.medium }]}>
                  Auto-filled from Lean · You can override this at any time
                </Text>
              </View>
            ) : (
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                Enter your monthly net income in SAR. This helps SubTrack calculate your savings rate and budget headroom.
              </Text>
            )}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: fonts.medium }]}>Net monthly income (SAR)</Text>
            <View style={[styles.incomeInputRow, { backgroundColor: colors.card, borderColor: incomeFocused ? colors.primary : colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.incomePrefix, { color: colors.mutedForeground, fontFamily: fonts.medium }]}>SAR</Text>
              <TextInput
                style={[styles.incomeInputText, { color: colors.foreground, fontFamily: fonts.regular }]}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.mutedForeground}
                value={incomeInput}
                onChangeText={v => setIncomeInput(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                returnKeyType="done"
                onFocus={() => setIncomeFocused(true)}
                onBlur={() => setIncomeFocused(false)}
              />
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              disabled={savingIncome || !incomeInput.trim()}
              activeOpacity={0.85}
              onPress={async () => {
                const amt = parseInt(incomeInput, 10);
                if (!amt || amt <= 0) return;
                setSavingIncome(true);
                await saveIncome(amt, false);
                setSavingIncome(false);
                setShowIncomeModal(false);
              }}
            >
              <LinearGradient
                colors={['#7B6CF8', '#9D8FF8']}
                style={[styles.saveBtnInner, (!incomeInput.trim() || savingIncome) && { opacity: 0.5 }]}
              >
                {savingIncome
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>Save Income</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Export Preview Modal ── */}
      <Modal visible={showExportPreview} animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={() => setShowExportPreview(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, rtl.row()]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('export_preview_title')}</Text>
            <TouchableOpacity onPress={() => setShowExportPreview(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
              {t('export_preview_subtitle')}
            </Text>

            {/* Summary rows */}
            <View style={[styles.exportPreviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {[
                { icon: 'refresh-cw', color: '#7B6CF8', count: subscriptions.length, singular: 'export_preview_subscriptions', plural: 'export_preview_subscriptions_plural' },
                { icon: 'file-text', color: '#00D9A6', count: bills.length, singular: 'export_preview_bills', plural: 'export_preview_bills_plural' },
                { icon: 'credit-card', color: '#F59E0B', count: loans.length, singular: 'export_preview_loans', plural: 'export_preview_loans_plural' },
                { icon: 'pie-chart', color: '#EC4899', count: Object.keys(allCaps ?? {}).length, singular: 'export_preview_budgets', plural: 'export_preview_budgets_plural' },
                { icon: 'target', color: '#06B6D4', count: goals.length, singular: 'export_preview_goals', plural: 'export_preview_goals_plural' },
              ].map((item, idx, arr) => {
                const key = item.count === 1 ? item.singular : item.plural;
                const label = t(key as any).replace('{n}', String(item.count));
                const isEmpty = item.count === 0;
                return (
                  <View
                    key={item.singular}
                    style={[
                      styles.exportPreviewRow,
                      rtl.row(),
                      idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.exportPreviewIcon, { backgroundColor: item.color + '18' }]}>
                      <Feather name={item.icon as any} size={15} color={isEmpty ? colors.mutedForeground : item.color} />
                    </View>
                    <Text style={[styles.exportPreviewLabel, { color: isEmpty ? colors.mutedForeground : colors.foreground, fontFamily: isEmpty ? fonts.regular : fonts.medium, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                      {isEmpty ? t('export_preview_empty') : label}
                    </Text>
                    {!isEmpty && (
                      <View style={[styles.exportPreviewBadge, { backgroundColor: item.color + '18' }]}>
                        <Text style={[styles.exportPreviewBadgeText, { color: item.color, fontFamily: fonts.semibold }]}>{item.count}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Don't show again toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleToggleSkipPreview(!skipExportPreview)}
              style={[styles.exportSkipRow, rtl.row(), { borderColor: colors.border }]}
            >
              <View style={[styles.exportSkipCheck, { borderColor: skipExportPreview ? colors.primary : colors.border, backgroundColor: skipExportPreview ? colors.primary : 'transparent' }]}>
                {skipExportPreview && <Feather name="check" size={11} color="#fff" />}
              </View>
              <Text style={[styles.exportSkipLabel, { color: colors.mutedForeground, fontFamily: fonts.regular, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('export_preview_skip')}
              </Text>
            </TouchableOpacity>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 8 }]}
              activeOpacity={0.85}
              disabled={exporting}
              onPress={async () => {
                setShowExportPreview(false);
                // Small delay to let modal close before share sheet opens
                setTimeout(() => doExport(), 300);
              }}
            >
              <LinearGradient colors={['#00D9A6', '#06B6D4']} style={[styles.saveBtnInner, exporting && { opacity: 0.6 }]}>
                {exporting
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="share-2" size={16} color="#fff" />
                      <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>{t('export_preview_confirm')}</Text>
                    </View>
                  )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal config={modal} onClose={() => setModal(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26 },
  profileCard: { alignItems: 'center', padding: 16, gap: 14, marginBottom: 4 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#fff', fontSize: 18 },
  profileName:  { color: '#fff', fontSize: 16 },
  profileEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  profileStats: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  profileBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  profileBadgeText: { color: '#fff', fontSize: 12 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, marginBottom: 8, letterSpacing: 0.5 },
  sectionCard:  { overflow: 'hidden', borderWidth: 1 },
  row: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14 },
  rowSubtitle: { fontSize: 11 },
  rowValue: { fontSize: 13 },
  // Language toggle
  langRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  langToggle: { flexDirection: 'row', padding: 3, gap: 2 },
  langOption: { paddingHorizontal: 12, paddingVertical: 5 },
  langOptionText: { fontSize: 13 },
  // Modal
  modal: { flex: 1, paddingTop: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  modalTitle: { fontSize: 20 },
  modalSubtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  tokenActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,217,166,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(0,217,166,0.2)', marginBottom: 16 },
  tokenActiveTxt: { color: '#00D9A6', fontSize: 13 },
  infoRows: { gap: 10, marginBottom: 24 },
  infoRow: { alignItems: 'center', gap: 10 },
  infoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  inputLabel: { fontSize: 12, marginBottom: 8 },
  tokenInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48, borderWidth: 1, marginBottom: 12 },
  tokenInputText: { flex: 1, fontSize: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  errorText: { color: '#FF6B6B', fontSize: 12, flex: 1 },
  saveBtn: { borderRadius: 12, overflow: 'hidden' },
  saveBtnInner: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 15 },
  // Income
  leanBadge: { alignItems: 'center', gap: 4, marginTop: 2 },
  leanBadgeText: { color: '#00D9A6', fontSize: 11 },
  leanInfoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,217,166,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(0,217,166,0.2)', marginBottom: 20 },
  leanInfoText: { color: '#00D9A6', fontSize: 13, flex: 1, lineHeight: 18 },
  incomeInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 52, borderWidth: 1, marginBottom: 20, gap: 8 },
  incomePrefix: { fontSize: 15 },
  incomeInputText: { flex: 1, fontSize: 22 },
  // Export preview
  exportPreviewCard: { overflow: 'hidden', borderWidth: 1, marginBottom: 20 },
  exportPreviewRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  exportPreviewIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  exportPreviewLabel: { fontSize: 14 },
  exportPreviewBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  exportPreviewBadgeText: { fontSize: 13 },
  exportSkipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, marginBottom: 16 },
  exportSkipCheck: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  exportSkipLabel: { fontSize: 13 },
});
