import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage, Language } from '@/context/LanguageContext';

/**
 * Small floating EN / ع language toggle for the auth screens.
 * Positioned top-right (top-left in RTL).
 */
export function AuthLangToggle() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isRTL } = useLanguage();

  return (
    <View
      style={[
        styles.wrap,
        { top: insets.top + 16 },
        isRTL ? { left: 20 } : { right: 20 },
      ]}
    >
      {(['en', 'ar'] as Language[]).map(lang => {
        const active = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            activeOpacity={0.8}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {lang === 'en' ? 'EN' : 'ع'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 3,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: '#7B6CF8',
  },
  optionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  optionTextActive: {
    color: '#fff',
  },
});
