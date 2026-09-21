import React, { useEffect } from 'react';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { BillsProvider } from '@/context/BillsContext';
import { LoanProvider } from '@/context/LoanContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { BudgetProvider } from '@/context/BudgetContext';
import { GoalsProvider } from '@/context/GoalsContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();


/**
 * Remounts the per-account data providers whenever the signed-in account
 * changes, so they re-hydrate from storage instead of keeping the previous
 * account's in-memory data.
 */
function DataProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <React.Fragment key={user?.email ?? 'anon'}>
      <SubscriptionProvider>
        <BillsProvider>
          <LoanProvider>
            <BudgetProvider>
              <GoalsProvider>{children}</GoalsProvider>
            </BudgetProvider>
          </LoanProvider>
        </BillsProvider>
      </SubscriptionProvider>
    </React.Fragment>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/auth');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, loading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen
        name="subscription/[id]"
        options={{ headerShown: true, presentation: 'card', title: 'Subscription' }}
      />
      <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="budgets" options={{ headerShown: false }} />
      <Stack.Screen name="agent" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  <DataProviders>
                    <AuthGate>
                      <View style={{ flex: 1 }}>
                        <RootLayoutNav />
                      </View>
                    </AuthGate>
                  </DataProviders>
                </AuthProvider>
              </LanguageProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
