import React, { useState } from 'react';
import {
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
import {
  useGoals, Goal, GOAL_PRESETS,
  goalProgress, monthlyRateNeeded, daysUntilGoal,
} from '@/context/GoalsContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { formatHijriDate } from '@/utils/hijri';
import { ConfirmModal, ConfirmConfig } from '@/components/ConfirmModal';

// ─── Emoji picker set ─────────────────────────────────────────────────────────
const EMOJIS = ['🎯','🕋','🌙','✈️','🚗','🏠','💍','🛡️','📚','💻','🌍','💰','🎓','👶','🏋️','🎸'];

// ─── Date formatting ─────────────────────────────────────────────────────────
function fmtDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function parseDate(ddmmyyyy: string): string | null {
  const [dd, mm, yyyy] = ddmmyyyy.split('/').map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2024) return null;
  return new Date(yyyy, mm - 1, dd).toISOString().split('T')[0];
}

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const EASTERN_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toEA(n: number): string {
  return String(n).replace(/\d/g, d => EASTERN_DIGITS[parseInt(d, 10)]);
}
function formatGregorianDate(iso: string, lang: 'en' | 'ar'): string {
  const [yyyy, mm, dd] = iso.split('-').map(Number);
  if (lang === 'ar') {
    return `${toEA(dd)} ${MONTHS_AR[mm - 1]} ${toEA(yyyy)}`;
  }
  return `${dd} ${MONTHS_EN[mm - 1]} ${yyyy}`;
}

function formatSAR(n: number) {
  return n.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onContribute,
  onDelete,
  onEdit,
  monthlyIncome,
}: {
  goal: Goal;
  onContribute: () => void;
  onDelete: () => void;
  onEdit: () => void;
  monthlyIncome?: number;
}) {
  const colors = useColors();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();

  const pct = goalProgress(goal);
  const done = pct >= 1;
  const rate = monthlyRateNeeded(goal);
  const days = goal.targetDate ? daysUntilGoal(goal.targetDate) : null;
  const isAmber = rate != null && monthlyIncome != null && !done && rate / monthlyIncome > 0.2;

  const hijriLabel = goal.targetDate
    ? formatHijriDate(goal.targetDate, isRTL ? 'ar' : 'en')
    : null;

  const accentColor = done ? '#4ADE80' : isAmber ? '#F59E0B' : '#7B6CF8';

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: isAmber ? '#F59E0B40' : colors.border, borderRadius: colors.radius }]}>
      {/* Left accent bar */}
      <View style={[styles.goalBar, { backgroundColor: accentColor }]} />

      <View style={styles.goalBody}>
        {/* Header row */}
        <View style={[styles.goalHeader, rtl.row()]}>
          <View style={[styles.goalEmoji, { backgroundColor: accentColor + '20' }]}>
            <Text style={styles.goalEmojiText}>{goal.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalName, { color: colors.foreground, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {goal.name}
            </Text>
            {days !== null && (
              <Text style={[styles.goalDays, { color: isAmber ? '#F59E0B' : colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                {done
                  ? t('goals_completed')
                  : days <= 0
                  ? t('goals_deadline_passed')
                  : t('goals_days_left', { n: days })}
              </Text>
            )}
            {goal.targetDate && hijriLabel ? (
              <Text style={[styles.goalHijri, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                {formatGregorianDate(goal.targetDate, isRTL ? 'ar' : 'en')}
                {' · '}
                {hijriLabel}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: accentColor }]} />
        </View>

        {/* Amount row */}
        <View style={[styles.goalAmounts, rtl.row()]}>
          <Text style={[styles.savedAmt, { color: accentColor, fontFamily: fonts.bold }]}>
            SAR {formatSAR(goal.savedAmount)}
          </Text>
          <Text style={[styles.targetAmt, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
            {t('goals_of')} SAR {formatSAR(goal.targetAmount)}
          </Text>
          <Text style={[styles.pctBadge, { color: accentColor, fontFamily: fonts.semibold }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>

        {/* Rate row & Add savings button */}
        <View style={[styles.goalFooter, rtl.row()]}>
          {rate != null && !done && (
            <View style={[styles.ratePill, { backgroundColor: isAmber ? '#F59E0B20' : colors.secondary }]}>
              <Feather name="trending-up" size={10} color={isAmber ? '#F59E0B' : colors.primary} />
              <Text style={[styles.rateText, { color: isAmber ? '#F59E0B' : colors.primary, fontFamily: fonts.semibold }]}>
                {t('goals_per_mo', { amount: formatSAR(rate) })}
              </Text>
            </View>
          )}
          {done && (
            <View style={[styles.ratePill, { backgroundColor: '#4ADE8020' }]}>
              <Feather name="check-circle" size={10} color="#4ADE80" />
              <Text style={[styles.rateText, { color: '#4ADE80', fontFamily: fonts.semibold }]}>{t('goals_completed')}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {!done && (
            <TouchableOpacity
              onPress={onContribute}
              style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={12} color="#fff" />
              <Text style={[styles.addBtnText, { fontFamily: fonts.semibold }]}>{t('goals_add_savings')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, totalSaved, addGoal, updateGoal, logContribution, removeGoal } = useGoals();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  // ── Delete confirm modal ────────────────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  // ── Add / Edit goal modal ───────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null); // non-null = edit mode
  const [name, setName]       = useState('');
  const [emoji, setEmoji]     = useState('🎯');
  const [target, setTarget]   = useState('');
  const [dateStr, setDateStr] = useState('');
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  // ── Contribute modal ────────────────────────────────────────────────────────
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contribution, setContribution]     = useState('');
  const [contributing, setContributing]     = useState(false);

  const openAdd = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditGoal(null);
    setName(''); setEmoji('🎯'); setTarget(''); setDateStr(''); setErrors({}); setSaving(false);
    setShowAdd(true);
  };

  const openEdit = (goal: Goal) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditGoal(goal);
    setName(goal.name);
    setEmoji(goal.emoji);
    setTarget(String(goal.targetAmount));
    // Convert ISO date back to DD/MM/YYYY for display
    if (goal.targetDate) {
      const [yyyy, mm, dd] = goal.targetDate.split('-');
      setDateStr(`${dd}/${mm}/${yyyy}`);
    } else {
      setDateStr('');
    }
    setErrors({}); setSaving(false);
    setShowAdd(true);
  };

  const applyPreset = (preset: typeof GOAL_PRESETS[0]) => {
    setName(isRTL ? preset.nameAr : preset.name);
    setEmoji(preset.emoji);
    setTarget(String(preset.targetAmount));
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('required');
    const amt = parseFloat(target);
    if (!target || isNaN(amt) || amt <= 0) errs.target = t('required');
    let targetDate: string | undefined;
    if (dateStr.trim()) {
      const parsed = parseDate(dateStr);
      if (!parsed) errs.date = 'DD/MM/YYYY';
      else targetDate = parsed;
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editGoal) {
        await updateGoal(editGoal.id, { name: name.trim(), emoji, targetAmount: amt, targetDate });
      } else {
        await addGoal({ name: name.trim(), emoji, targetAmount: amt, targetDate });
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const amt = parseFloat(contribution);
    if (!contribution || isNaN(amt) || amt <= 0) return;
    setContributing(true);
    try {
      await logContribution(contributeGoal.id, amt);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setContributeGoal(null);
      setContribution('');
    } catch (err: any) {
      if (err?.message === 'GOAL_NOT_FOUND') {
        setContributeGoal(null);
        setContribution('');
        setConfirmConfig({
          title: t('goals_contribution_failed_title'),
          message: t('goals_contribution_failed_msg'),
          confirmLabel: t('ok') || 'OK',
          onConfirm: () => {},
        });
      }
    } finally { setContributing(false); }
  };

  const handleDelete = (goal: Goal) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setConfirmConfig({
      title: t('goals_delete_title'),
      message: t('goals_delete_msg', { name: goal.name }),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
      destructive: true,
      onConfirm: () => removeGoal(goal.id),
    });
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? Math.min(totalSaved / totalTarget, 1) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfirmModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
      {/* ── Header ── */}
      <LinearGradient
        colors={['#16A34A', '#22C55E', '#4ADE80']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={[styles.headerRow, rtl.row()]}>
          <View>
            <Text style={[styles.headerTitle, { fontFamily: fonts.bold }]}>{t('goals_title')}</Text>
            <Text style={[styles.headerSub, { fontFamily: fonts.regular }]}>{t('goals_subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={styles.addHeaderBtn} activeOpacity={0.85}>
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary pills */}
        {goals.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[styles.summaryValue, { fontFamily: fonts.bold }]}>{goals.length}</Text>
              <Text style={[styles.summaryLabel, { fontFamily: fonts.regular }]}>{t('goals_active')}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[styles.summaryValue, { fontFamily: fonts.bold }]}>SAR {formatSAR(totalSaved)}</Text>
              <Text style={[styles.summaryLabel, { fontFamily: fonts.regular }]}>{t('goals_total_saved')}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[styles.summaryValue, { fontFamily: fonts.bold }]}>{Math.round(overallPct * 100)}%</Text>
              <Text style={[styles.summaryLabel, { fontFamily: fonts.regular }]}>{t('goals_overall')}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── Goal list ── */}
      {goals.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('goals_empty_title')}</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('goals_empty_sub')}</Text>
          <TouchableOpacity
            onPress={openAdd}
            activeOpacity={0.85}
            style={[styles.emptyBtn, { backgroundColor: '#16A34A', borderRadius: colors.radius }]}
          >
            <Text style={[styles.emptyBtnText, { fontFamily: fonts.semibold }]}>{t('goals_create_first')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={g => g.id}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 120 : 100, gap: 12 }}
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onContribute={() => { setContributeGoal(item); setContribution(''); }}
              onDelete={() => handleDelete(item)}
              onEdit={() => openEdit(item)}
            />
          )}
        />
      )}

      {/* ── Add goal modal ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modal header */}
            <View style={[styles.modalHeader, rtl.row()]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{editGoal ? t('goals_edit_title') : t('goals_add_title')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Presets */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium }]}>{t('goals_presets')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {GOAL_PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.name}
                    onPress={() => applyPreset(p)}
                    style={[styles.presetChip, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.presetEmoji}>{p.emoji}</Text>
                    <Text style={[styles.presetLabel, { color: colors.foreground, fontFamily: fonts.medium }]}>
                      {isRTL ? p.nameAr : p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Emoji picker */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium }]}>{t('goals_emoji')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.emojiChip, { backgroundColor: emoji === e ? '#16A34A20' : colors.secondary, borderColor: emoji === e ? '#16A34A' : colors.border }]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium }]}>{t('goals_name')}</Text>
            <TextInput
              value={name}
              onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
              placeholder={t('goals_name_placeholder')}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: errors.name ? '#FF4757' : colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius, textAlign: isRTL ? 'right' : 'left' }]}
            />
            {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}

            {/* Target amount */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium, marginTop: 14 }]}>{t('goals_target_amount')}</Text>
            <TextInput
              value={target}
              onChangeText={v => { setTarget(v); setErrors(e => ({ ...e, target: '' })); }}
              placeholder="e.g. 15000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.card, borderColor: errors.target ? '#FF4757' : colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius, textAlign: isRTL ? 'right' : 'left' }]}
            />
            {errors.target ? <Text style={styles.errText}>{errors.target}</Text> : null}

            {/* Target date */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium, marginTop: 14 }]}>
              {t('goals_target_date')} <Text style={{ opacity: 0.5 }}>({t('goals_optional')})</Text>
            </Text>
            <TextInput
              value={dateStr}
              onChangeText={v => { setDateStr(fmtDateInput(v)); setErrors(e => ({ ...e, date: '' })); }}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.card, borderColor: errors.date ? '#FF4757' : colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius, textAlign: isRTL ? 'right' : 'left' }]}
            />
            {errors.date ? <Text style={styles.errText}>{errors.date}</Text> : null}

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: '#16A34A', borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>
                {saving ? t('saving') : editGoal ? t('goals_update_goal') : t('goals_save_goal')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Contribute modal ── */}
      <Modal visible={!!contributeGoal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setContributeGoal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
            <View style={[styles.modalHeader, rtl.row()]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
                {contributeGoal?.emoji} {contributeGoal?.name}
              </Text>
              <TouchableOpacity onPress={() => setContributeGoal(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: fonts.medium, marginTop: 16 }]}>{t('goals_contribution_amount')}</Text>
            <TextInput
              value={contribution}
              onChangeText={setContribution}
              placeholder="SAR 0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              autoFocus
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius, fontSize: 24, textAlign: 'center' }]}
            />

            {contributeGoal && (
              <Text style={[styles.contribMeta, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('goals_saved_so_far', { saved: formatSAR(contributeGoal.savedAmount), target: formatSAR(contributeGoal.targetAmount) })}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleContribute}
              activeOpacity={0.85}
              disabled={contributing}
              style={[styles.saveBtn, { backgroundColor: '#16A34A', borderRadius: colors.radius, opacity: contributing ? 0.7 : 1, marginTop: 24 }]}
            >
              <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>
                {contributing ? t('saving') : t('goals_log_contribution')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 24, marginBottom: 2 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  addHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  summaryValue: { color: '#fff', fontSize: 14 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },

  // Goal card
  goalCard: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  goalBar: { width: 4 },
  goalBody: { flex: 1, padding: 14, gap: 10 },
  goalHeader: { alignItems: 'center', gap: 10 },
  goalEmoji: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalEmojiText: { fontSize: 22 },
  goalName: { fontSize: 15 },
  goalDays: { fontSize: 11, marginTop: 2 },
  goalHijri: { fontSize: 11, marginTop: 1 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  goalAmounts: { alignItems: 'center', gap: 6 },
  savedAmt: { fontSize: 15 },
  targetAmt: { fontSize: 12, flex: 1 },
  pctBadge: { fontSize: 13 },
  goalFooter: { alignItems: 'center', gap: 8 },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rateText: { fontSize: 11 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12 },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15 },

  // Modal
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20 },
  fieldLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errText: { color: '#FF4757', fontSize: 12, marginTop: 4 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  presetEmoji: { fontSize: 16 },
  presetLabel: { fontSize: 13 },
  emojiChip: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1.5 },
  emojiText: { fontSize: 22 },
  saveBtn: { marginTop: 28, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16 },
  contribMeta: { fontSize: 13, textAlign: 'center', marginTop: 10 },
});
