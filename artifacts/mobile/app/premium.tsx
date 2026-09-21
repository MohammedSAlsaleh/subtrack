import React, { useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { ConfirmModal, ConfirmConfig } from '@/components/ConfirmModal';

const FEATURES = [
  {
    key: 'f1',
    icon: 'pie-chart',
    gradient: ['#7B6CF8', '#A78BFA'] as [string, string],
    titleKey: 'premium_f1_title',
    subKey:   'premium_f1_sub',
  },
  {
    key: 'f2',
    icon: 'file-text',
    gradient: ['#00D9A6', '#00B890'] as [string, string],
    titleKey: 'premium_f2_title',
    subKey:   'premium_f2_sub',
  },
  {
    key: 'f3',
    icon: 'cpu',
    gradient: ['#F59E0B', '#FBBF24'] as [string, string],
    titleKey: 'premium_f3_title',
    subKey:   'premium_f3_sub',
  },
  {
    key: 'f4',
    icon: 'credit-card',
    gradient: ['#FF6B6B', '#FF4757'] as [string, string],
    titleKey: 'premium_f4_title',
    subKey:   'premium_f4_sub',
  },
];

export default function PremiumScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user, upgradeToPremium, downgradePremium, restorePremium } = useAuth();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();
  const [loading, setLoading]     = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [modal, setModal]         = useState<ConfirmConfig | null>(null);

  const isPremium = !!user?.isPremium;

  const handleActivate = async () => {
    if (isPremium) {
      setModal({
        title: t('premium_downgrade'),
        message: t('premium_downgrade_confirm'),
        confirmLabel: t('premium_downgrade'),
        cancelLabel: t('cancel'),
        destructive: true,
        onConfirm: async () => {
          setLoading(true);
          try { await downgradePremium(); } catch { /* ignore */ }
          setLoading(false);
          router.back();
        },
      });
      return;
    }
    setLoading(true);
    try {
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await upgradeToPremium();
      setLoading(false);
      setModal({
        title: '🎉 ' + t('premium_active_status'),
        confirmLabel: t('done'),
        onConfirm: () => router.back(),
      });
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message ?? 'Something went wrong. Please try again.';
      setModal({ title: 'Could not activate Premium', message: msg, confirmLabel: 'OK', onConfirm: () => {} });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: insets.top + 12, right: isRTL ? undefined : 16, left: isRTL ? 16 : undefined }]}
      >
        <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero */}
        <LinearGradient
          colors={['#0D1025', '#1A0E3C', '#0D1025']}
          style={[styles.hero, { paddingTop: insets.top + 52 }]}
        >
          {/* Glow orbs */}
          <View style={[styles.orb, { backgroundColor: '#7B6CF8', top: insets.top + 10, left: 30 }]} />
          <View style={[styles.orb, { backgroundColor: '#00D9A6', bottom: 20, right: 20 }]} />

          {isPremium ? (
            <View style={[styles.activeBadge, { backgroundColor: 'rgba(0,217,166,0.15)', borderColor: 'rgba(0,217,166,0.3)' }]}>
              <Feather name="check-circle" size={14} color="#00D9A6" />
              <Text style={[styles.activeBadgeText, { fontFamily: fonts.semibold }]}>{t('premium_active_badge')}</Text>
            </View>
          ) : (
            <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.crownBadge}>
              <Feather name="star" size={20} color="#fff" />
            </LinearGradient>
          )}

          <Text style={[styles.heroTitle, { fontFamily: fonts.bold, textAlign: 'center' }]}>
            {isPremium ? t('premium_active_status') : t('premium_title')}
          </Text>
          <Text style={[styles.heroSub, { fontFamily: fonts.regular, textAlign: 'center' }]}>
            {t('premium_subtitle')}
          </Text>

          <View style={styles.pricePill}>
            <Text style={[styles.priceText, { fontFamily: fonts.bold }]}>{t('premium_price')}</Text>
          </View>
        </LinearGradient>

        {/* Feature cards */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View
              key={f.key}
              style={[
                styles.featureCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <LinearGradient colors={f.gradient} style={styles.featureIcon}>
                <Feather name={f.icon as any} size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.foreground, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t(f.titleKey)}
                </Text>
                <Text style={[styles.featureSub, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t(f.subKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Comparison bullets */}
        <View style={[styles.bullets, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[
            { icon: 'check', color: '#00D9A6', label: Platform.OS === 'web' ? 'Subscription tracking (free)' : t('nav_subscriptions') + ' (free)' },
            { icon: 'check', color: '#00D9A6', label: 'Bank auto-detection (free)' },
            { icon: 'star',  color: '#7B6CF8', labelKey: 'premium_f1_title' },
            { icon: 'star',  color: '#7B6CF8', labelKey: 'premium_f2_title' },
            { icon: 'star',  color: '#7B6CF8', labelKey: 'premium_f3_title' },
          ].map((b, i) => (
            <View key={i} style={[styles.bulletRow, rtl.row(), { borderBottomColor: colors.border, borderBottomWidth: i < 4 ? 1 : 0 }]}>
              <View style={[styles.bulletIcon, { backgroundColor: b.color + '18' }]}>
                <Feather name={b.icon as any} size={13} color={b.color} />
              </View>
              <Text style={[styles.bulletText, { color: colors.foreground, fontFamily: fonts.regular }]}>
                {b.labelKey ? t(b.labelKey) : b.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <TouchableOpacity onPress={handleActivate} disabled={loading} activeOpacity={0.85} style={styles.activateBtn}>
            <LinearGradient
              colors={isPremium ? ['#374151', '#4B5563'] : ['#7B6CF8', '#9D8FF8']}
              style={styles.activateBtnInner}
            >
              <Text style={[styles.activateBtnText, { fontFamily: fonts.semibold }]}>
                {loading ? '...' : isPremium ? t('premium_downgrade') : t('premium_activate')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 12, alignItems: 'center' }}
            disabled={restoring || isPremium}
            onPress={async () => {
              setRestoring(true);
              const restored = await restorePremium();
              setRestoring(false);
              setModal({
                title: restored ? '🎉 ' + t('premium_active_status') : t('settings_restore_premium'),
                message: restored ? t('premium_restore_found') : t('premium_restore_not_found'),
                confirmLabel: t('done'),
                onConfirm: () => { if (restored) router.back(); },
              });
            }}
          >
            <Text style={[styles.restoreText, { color: restoring ? colors.mutedForeground : colors.primary, fontFamily: fonts.regular }]}>
              {restoring ? t('premium_restore_checking') : t('premium_restore')}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.legalText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
            {isRTL
              ? 'يمكنك إلغاء الاشتراك في أي وقت. لا يوجد التزام.'
              : 'Cancel anytime. No commitment.'}
          </Text>
        </View>
      </ScrollView>
      <ConfirmModal config={modal} onClose={() => setModal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn:  { position: 'absolute', zIndex: 10, padding: 8 },

  // Hero
  hero:       { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center', gap: 10, overflow: 'hidden' },
  orb:        { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.25, filter: 'blur(40px)' as any },
  crownBadge: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  activeBadgeText: { color: '#00D9A6', fontSize: 12 },
  heroTitle:  { color: '#fff', fontSize: 24, marginTop: 4 },
  heroSub:    { color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 20 },
  pricePill: {
    backgroundColor: 'rgba(123,108,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123,108,248,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  priceText: { color: '#9D8FF8', fontSize: 18 },

  // Features
  features: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  featureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderWidth: 1 },
  featureIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { fontSize: 15, marginBottom: 4 },
  featureSub:   { fontSize: 12, lineHeight: 17 },

  // Bullets
  bullets: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, overflow: 'hidden' },
  bulletRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  bulletIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bulletText: { fontSize: 13, flex: 1 },

  // CTA
  cta:            { paddingHorizontal: 20, paddingTop: 24 },
  activateBtn:    { borderRadius: 14, overflow: 'hidden' },
  activateBtnInner: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  activateBtnText: { color: '#fff', fontSize: 16 },
  restoreText:  { fontSize: 13 },
  legalText:    { fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
