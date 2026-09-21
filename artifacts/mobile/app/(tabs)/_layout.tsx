import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingNav } from '@/components/FloatingNav';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index"         options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="subscriptions" options={{ title: 'Subscriptions' }} />
        <Tabs.Screen name="banks"         options={{ href: null }} />
        <Tabs.Screen name="bills"         options={{ title: 'Bills' }} />
        <Tabs.Screen name="analytics"     options={{ href: null }} />
        <Tabs.Screen name="goals"         options={{ title: 'Goals' }} />
        <Tabs.Screen name="loans"         options={{ title: 'Loans' }} />
        <Tabs.Screen name="settings"      options={{ title: 'Settings' }} />
      </Tabs>
      <FloatingNav />
    </View>
  );
}
