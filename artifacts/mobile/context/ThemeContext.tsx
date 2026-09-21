import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeOverride = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = '@subtrack_theme';

interface ThemeContextValue {
  themeOverride: ThemeOverride;
  setThemeOverride: (t: ThemeOverride) => Promise<void>;
  resolvedScheme: ResolvedScheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeOverride, setOverride] = useState<ThemeOverride>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setOverride(v);
    });
  }, []);

  const setThemeOverride = useCallback(async (t: ThemeOverride) => {
    setOverride(t);
    await AsyncStorage.setItem(STORAGE_KEY, t);
  }, []);

  const resolvedScheme: ResolvedScheme =
    themeOverride === 'system'
      ? systemScheme === 'dark' ? 'dark' : 'light'
      : themeOverride;

  return (
    <ThemeContext.Provider value={{ themeOverride, setThemeOverride, resolvedScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
