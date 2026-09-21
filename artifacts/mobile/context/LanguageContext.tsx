import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/locales/en';
import ar from '@/locales/ar';

export type Language = 'en' | 'ar';

const STORAGE_KEY = '@subtrack_language';

const translations: Record<Language, Record<string, string>> = { en, ar };

export const FONTS = {
  en: {
    regular: 'Inter_400Regular',
    medium:  'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:    'Inter_700Bold',
  },
  ar: {
    regular: 'Cairo_400Regular',
    medium:  'Cairo_600SemiBold',   // Cairo has 400/600/700 weights
    semibold: 'Cairo_600SemiBold',
    bold:    'Cairo_700Bold',
  },
} as const;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
  fonts: typeof FONTS[Language];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'ar' || v === 'en') setLang(v);
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLang(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    // RTL for native — layout updates immediately via style, no restart needed
    // I18nManager.forceRTL(lang === 'ar');
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str = translations[language][key] ?? translations['en'][key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [language]);

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, fonts: FONTS[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** RTL-aware style helpers */
export function useRTL() {
  const { isRTL } = useLanguage();
  return {
    isRTL,
    row:  (base?: object) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', ...base } as any),
    text: (base?: object) => ({ textAlign: isRTL ? 'right' : 'left', ...base } as any),
    end:  (base?: object) => ({ alignItems: isRTL ? 'flex-start' : 'flex-end', ...base } as any),
  };
}
