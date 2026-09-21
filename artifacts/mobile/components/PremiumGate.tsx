import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

interface PremiumGateProps {
  children: React.ReactNode;
  /** If true, renders children directly (no gate check). Use for wrapping partial UI. */
  bypass?: boolean;
}

export function PremiumGate({ children, bypass }: PremiumGateProps) {
  const { user } = useAuth();
  const colors = useColors();
  const { t, fonts } = useLanguage();
  const insets = useSafeAreaInsets();

  if (bypass || user?.isPremium) return <>{children}</>;

  // Sit above the tab bar: tab bar ≈ 49 px + safe-area bottom + breathing room
  const overlayBottom = Platform.OS === 'web' ? 100 : insets.bottom + 80;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#0F1629']}
        style={styles.gradient}
      >
        {/* Blurred content hint */}
        <View style={styles.blurHint} pointerEvents="none">
          {children}
        </View>

        {/* Overlay */}
        <View style={[styles.overlay, { paddingBottom: overlayBottom }]}>
          <LinearGradient
            colors={['transparent', 'rgba(10,14,26,0.92)', '#0A0E1A']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.content}>
            <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.crownCircle}>
              <Feather name="star" size={22} color="#fff" />
            </LinearGradient>
            <Text style={[styles.lockedTitle, { fontFamily: fonts.bold }]}>{t('premium_locked_title')}</Text>
            <Text style={[styles.lockedSub, { fontFamily: fonts.regular, color: colors.mutedForeground }]}>{t('premium_locked_sub')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/premium')}
              activeOpacity={0.85}
              style={styles.ctaBtn}
            >
              <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.ctaBtnInner}>
                <Text style={[styles.ctaBtnText, { fontFamily: fonts.semibold }]}>{t('premium_unlock')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, overflow: 'hidden' },
  gradient:    { flex: 1 },
  blurHint:    { flex: 1, opacity: 0.15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  content: { alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockedTitle: { color: '#fff', fontSize: 20 },
  lockedSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  ctaBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, alignSelf: 'stretch' },
  ctaBtnInner: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  ctaBtnText: { color: '#fff', fontSize: 15 },
});
