import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { AuthLangToggle } from '@/components/AuthLangToggle';
import { useLanguage } from '@/context/LanguageContext';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36) + str.length.toString(36);
}

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError(t('auth_err_email_valid'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('auth_err_send_failed'));
        return;
      }
      // Pre-fill the code if the API returned it (no email service in this build)
      if (data.code) setCode(data.code);
      setStep('code');
    } catch {
      setError(t('auth_err_send_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (code.trim().length !== 6) { setError(t('auth_err_code_invalid')); return; }
    if (newPassword.length < 6) { setError(t('auth_err_pw_short')); return; }
    if (newPassword !== confirmPassword) { setError(t('auth_err_pw_mismatch')); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPasswordHash: simpleHash(newPassword),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('auth_err_code_invalid'));
        return;
      }
      setStep('done');
    } catch {
      setError(t('auth_err_code_invalid'));
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
          <TouchableOpacity
            onPress={() => step === 'code' ? setStep('email') : router.back()}
            style={[styles.back, isRTL && { alignSelf: 'flex-end' }]}
          >
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {step === 'done' ? (
            /* ── Success state ── */
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <Feather name="check-circle" size={40} color="#00C48C" />
              </View>
              <Text style={styles.title}>{t('auth_forgot_success_title')}</Text>
              <Text style={[styles.subtitle, { marginTop: 10, lineHeight: 22 }]}>
                {t('auth_forgot_success_msg')}
              </Text>
              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 40 }]}
                onPress={() => router.replace('/auth/login')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.submitBtnInner}>
                  <Text style={styles.submitBtnText}>{t('auth_sign_in')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient colors={['#7B6CF8', '#A78BFA']} style={styles.logoCircle}>
                  <Feather name={step === 'email' ? 'key' : 'shield'} size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.title}>
                  {step === 'email' ? t('auth_forgot_title') : t('auth_forgot_code_title')}
                </Text>
                <Text style={[styles.subtitle, isRTL && { textAlign: 'center' }]}>
                  {step === 'email'
                    ? t('auth_forgot_sub')
                    : `${t('auth_forgot_code_sub')} ${email}`}
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {step === 'email' ? (
                  /* Step 1 — email */
                  <Field
                    label={t('auth_email')}
                    placeholder={t('auth_email_ph')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    icon="mail"
                    isRTL={isRTL}
                  />
                ) : (
                  /* Step 2 — code + new password */
                  <>
                    <Field
                      label={t('auth_forgot_code_label')}
                      placeholder={t('auth_forgot_code_ph')}
                      value={code}
                      onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      icon="hash"
                      isRTL={isRTL}
                    />
                    <Field
                      label={t('auth_forgot_new_pw')}
                      placeholder={t('auth_forgot_new_pw_ph')}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNew}
                      icon="lock"
                      rightIcon={showNew ? 'eye-off' : 'eye'}
                      onRightIcon={() => setShowNew(v => !v)}
                      isRTL={isRTL}
                    />
                    <Field
                      label={t('auth_forgot_confirm_pw')}
                      placeholder={t('auth_forgot_confirm_pw_ph')}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      icon="lock"
                      rightIcon={showConfirm ? 'eye-off' : 'eye'}
                      onRightIcon={() => setShowConfirm(v => !v)}
                      isRTL={isRTL}
                    />
                  </>
                )}

                {!!error && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={step === 'email' ? handleSendCode : handleReset}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.submitBtnInner}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.submitBtnText}>
                          {step === 'email' ? t('auth_forgot_email_btn') : t('auth_forgot_reset_btn')}
                        </Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.footer}>
                <Text style={styles.footerText}>
                  <Text style={styles.footerLink}>{t('auth_forgot_back_login')}</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  icon: string;
  rightIcon?: string;
  onRightIcon?: () => void;
  isRTL?: boolean;
}

function Field({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType, icon, rightIcon, onRightIcon, isRTL }: FieldProps) {
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
          autoCapitalize="none"
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
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    maxWidth: 280,
  },
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
  footer: { marginTop: 28, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Inter_400Regular' },
  footerLink: { color: '#9D8FF8', fontFamily: 'Inter_600SemiBold' },
  doneWrap: { flex: 1, alignItems: 'center', paddingTop: 40 },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,196,140,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});
