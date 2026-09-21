import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { AuthLangToggle } from '@/components/AuthLangToggle';
import { useLanguage } from '@/context/LanguageContext';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { t, isRTL } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError(t('auth_err_name')); return; }
    if (!email.trim() || !email.includes('@')) { setError(t('auth_err_email_valid')); return; }
    if (password.length < 6) { setError(t('auth_err_password_len')); return; }

    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? t('auth_err_reg_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A0E1A', '#0F1629']} style={styles.container}>
      <AuthLangToggle />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={[styles.back, isRTL && { alignSelf: 'flex-end' }]}>
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logoIcon} />
            <Text style={styles.title}>{t('auth_reg_title')}</Text>
            <Text style={styles.subtitle}>{t('auth_reg_sub')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label={t('auth_name')}
              placeholder={t('auth_name_ph')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              icon="user"
              isRTL={isRTL}
            />
            <Field
              label={t('auth_email')}
              placeholder={t('auth_email_ph')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
              isRTL={isRTL}
            />
            <Field
              label={t('auth_password')}
              placeholder={t('auth_password_ph_reg')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              icon="lock"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIcon={() => setShowPassword(v => !v)}
              isRTL={isRTL}
            />

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.submitBtnInner}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{t('auth_create_account')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Demo Notice */}
          <View style={styles.demoNotice}>
            <View style={[styles.demoLabelRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.demoIcon}>⚠️</Text>
              <Text style={[styles.demoBadge, isRTL && { textAlign: 'right' }]}>{t('auth_demo_badge')}</Text>
            </View>
            <View style={[styles.demoBulletRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.demoBulletDot}>•</Text>
              <Text style={[styles.demoBulletText, isRTL && { textAlign: 'right' }]}>{t('auth_demo_line1')}</Text>
            </View>
            <View style={[styles.demoBulletRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.demoBulletDot}>•</Text>
              <Text style={[styles.demoBulletText, isRTL && { textAlign: 'right' }]}>{t('auth_demo_line2')}</Text>
            </View>
            <View style={[styles.demoBulletRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.demoBulletDot}>•</Text>
              <Text style={[styles.demoBulletText, isRTL && { textAlign: 'right' }]}>{t('auth_demo_line3')}</Text>
            </View>
          </View>

          {/* Footer */}
          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.footer}>
            <Text style={styles.footerText}>
              {t('auth_have_account')}{' '}
              <Text style={styles.footerLink}>{t('auth_signin_link')}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  icon: string;
  rightIcon?: string;
  onRightIcon?: () => void;
  isRTL?: boolean;
}

function Field({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, icon, rightIcon, onRightIcon, isRTL }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
      <View style={[styles.fieldRow, focused && styles.fieldRowFocused, isRTL && { flexDirection: 'row-reverse' }]}>
        <Feather name={icon as any} size={16} color={focused ? '#7B6CF8' : 'rgba(255,255,255,0.35)'} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
        <TextInput
          style={[styles.fieldInput, isRTL && { textAlign: 'right' }]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && onRightIcon && (
          <TouchableOpacity onPress={onRightIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={rightIcon as any} size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 24 },
  back: { marginBottom: 24, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', gap: 10, marginBottom: 36 },
  logoIcon: { width: 72, height: 72, borderRadius: 16, marginBottom: 4 },
  title: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Inter_400Regular' },
  form: { gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_500Medium' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    height: 50,
  },
  fieldRowFocused: {
    borderColor: '#7B6CF8',
    backgroundColor: 'rgba(123,108,248,0.08)',
  },
  fieldInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  submitBtnInner: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  demoNotice: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,200,60,0.35)',
    backgroundColor: 'rgba(255,200,60,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  demoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  demoIcon: { fontSize: 13 },
  demoBadge: {
    color: 'rgba(255,200,60,0.9)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  demoBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  demoBulletDot: {
    color: 'rgba(255,200,60,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  demoBulletText: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  footer: { marginTop: 28, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Inter_400Regular' },
  footerLink: { color: '#9D8FF8', fontFamily: 'Inter_600SemiBold' },
});
