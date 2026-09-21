import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AuthLangToggle } from '@/components/AuthLangToggle';
import { useLanguage } from '@/context/LanguageContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  return (
    <LinearGradient colors={['#0A0E1A', '#0F1629', '#0A0E1A']} style={styles.container}>
      {/* Glow accents */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <AuthLangToggle />

      <View style={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>SubTrack</Text>
          <Text style={styles.tagline}>{t('auth_tagline')}</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {[
            { icon: 'credit-card', text: t('auth_feature_1') },
            { icon: 'shield', text: t('auth_feature_2') },
            { icon: 'bell', text: t('auth_feature_3') },
          ].map((f, i) => (
            <View key={i} style={[styles.featureRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon as any} size={15} color="#7B6CF8" />
              </View>
              <Text style={[styles.featureText, isRTL && { textAlign: 'right' }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/register')}
          >
            <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.primaryBtnInner}>
              <Text style={styles.primaryBtnText}>{t('auth_create_account')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.75}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryBtnText}>{t('auth_sign_in')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>{t('auth_footnote')}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#7B6CF820',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#00D9A615',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  logoWrap: { alignItems: 'center', gap: 14 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
  },
  appName: {
    color: '#fff',
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(123,108,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    lineHeight: 20,
  },
  buttons: { gap: 12 },
  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  primaryBtnInner: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  footnote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
});
