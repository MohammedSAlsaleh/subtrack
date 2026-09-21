import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

// Routes where the back button should NOT appear
const DASHBOARD_ROUTES = ['/', '/(tabs)', '/(tabs)/'];

function isDashboard(pathname: string) {
  const clean = pathname.replace(/\/$/, '') || '/';
  return DASHBOARD_ROUTES.some(r => clean === r || clean === r.replace(/\/$/, ''));
}

// ─── Nav items (tabs that are visible) ───────────────────────────────────────
interface NavItem {
  route: string;
  icon: string;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: '/(tabs)/',             icon: 'home',        labelKey: 'nav_dashboard' },
  { route: '/(tabs)/subscriptions',icon: 'repeat',      labelKey: 'nav_subscriptions' },
  { route: '/(tabs)/bills',        icon: 'file-text',   labelKey: 'nav_bills' },
  { route: '/(tabs)/analytics',    icon: 'bar-chart-2', labelKey: 'nav_analytics' },
  { route: '/(tabs)/goals',        icon: 'target',      labelKey: 'nav_goals' },
  { route: '/(tabs)/loans',        icon: 'credit-card', labelKey: 'nav_loans' },
  { route: '/(tabs)/settings',     icon: 'settings',    labelKey: 'nav_settings' },
];

// Normalise the Expo Router pathname to match our route format
function matchRoute(pathname: string, route: string): boolean {
  const clean = pathname.replace(/\/$/, '') || '/';
  const target = route.replace('/(tabs)', '').replace(/\/$/, '') || '/';
  return clean === target || clean === route.replace(/\/$/, '');
}

// ─── FloatingNav ─────────────────────────────────────────────────────────────
export function FloatingNav() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;     // 0 = closed, 1 = open
  const spinAnim = useRef(new Animated.Value(0)).current; // burger → X spin

  const animate = useCallback((toOpen: boolean) => {
    Animated.parallel([
      Animated.spring(anim, {
        toValue: toOpen ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
      Animated.spring(spinAnim, {
        toValue: toOpen ? 1 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),
    ]).start();
  }, [anim, spinAnim]);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    animate(next);
  }, [open, animate]);

  const close = useCallback(() => {
    if (!open) return;
    setOpen(false);
    animate(false);
  }, [open, animate]);

  const navigate = useCallback((route: string) => {
    close();
    setTimeout(() => router.push(route as any), 80);
  }, [close]);

  // Close when route changes
  useEffect(() => { close(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived animation values
  const menuTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const menuOpacity    = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const burgerRotate   = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 12);
  const btnSide = isRTL ? { left: 20 } : { right: 20 };

  const showBack = !isDashboard(pathname);

  return (
    <>
      {/* ── Floating back button ─────────────────────────────────────────── */}
      {showBack && (
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={[
            styles.backBtn,
            isRTL ? { right: 20 } : { left: 20 },
            { top: insets.top + (Platform.OS === 'web' ? 16 : 12), backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={18} color={colors.foreground} />
        </TouchableOpacity>
      )}

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {open && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
        </Pressable>
      )}

      {/* ── Menu panel ───────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={open ? 'box-none' : 'none'}
        style={[
          styles.menu,
          btnSide,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: 20,
            bottom: bottomInset + 64 + 12,
            opacity: menuOpacity,
            transform: [{ translateY: menuTranslateY }],
          },
        ]}
      >
        {NAV_ITEMS.map((item, i) => {
          const active = matchRoute(pathname, item.route);
          const last = i === NAV_ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => navigate(item.route)}
              activeOpacity={0.7}
              style={[
                styles.menuItem,
                !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
                active && { backgroundColor: colors.primary + '12' },
              ]}
            >
              <View style={[
                styles.menuIcon,
                { backgroundColor: active ? colors.primary + '20' : colors.secondary },
              ]}>
                <Feather
                  name={item.icon as any}
                  size={16}
                  color={active ? colors.primary : colors.mutedForeground}
                />
              </View>
              <Text style={[
                styles.menuLabel,
                {
                  color: active ? colors.primary : colors.foreground,
                  fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}>
                {t(item.labelKey)}
              </Text>
              {active && (
                <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── Burger button ─────────────────────────────────────────────────── */}
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.fab,
          btnSide,
          {
            bottom: bottomInset + 16,
            backgroundColor: open ? colors.foreground : colors.primary,
            shadowColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: burgerRotate }] }}>
          <Feather
            name={open ? 'x' : 'menu'}
            size={22}
            color="#fff"
          />
        </Animated.View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  menu: {
    position: 'absolute',
    minWidth: 200,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    position: 'relative',
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    flex: 1,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  backBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
});
