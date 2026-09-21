import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { Subscription, getCategoryColor } from '@/context/SubscriptionContext';

interface Props {
  subscription: Subscription;
  onPress: () => void;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-SA', { month: 'short', day: 'numeric' });
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SubscriptionCard({ subscription, onPress }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const isUrgent = getDaysUntil(subscription.nextBillingDate) <= 3;
  const isCancelled = subscription.status === 'cancelled';
  const isExcluded  = subscription.status === 'excluded';
  const catColor = getCategoryColor(subscription.category);
  const members = subscription.sharedMembers && subscription.sharedMembers > 1 ? subscription.sharedMembers : 1;
  const isShared = members > 1;
  const shareAmount = subscription.amount / members;

  // Trial badge logic
  const trialDaysLeft = subscription.isTrial && subscription.trialEndsAt
    ? getDaysUntil(subscription.trialEndsAt)
    : null;
  const showTrialBadge = trialDaysLeft !== null && trialDaysLeft >= 0;
  const trialBadgeColor = trialDaysLeft !== null && trialDaysLeft < 3
    ? '#FF4757'
    : '#F59E0B';

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
    >
      {/* Left: icon */}
      <View style={[styles.iconWrap, { backgroundColor: subscription.color + '18' }]}>
        <Feather name={subscription.icon as any} size={20} color={subscription.color} />
      </View>

      {/* Center: info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }, isCancelled && styles.cancelled]} numberOfLines={1}>
            {subscription.name}
          </Text>
          {isCancelled && (
            <View style={[styles.pill, { backgroundColor: colors.destructive + '22' }]}>
              <Text style={[styles.pillText, { color: colors.destructive }]}>Cancelled</Text>
            </View>
          )}
          {isExcluded && (
            <View style={[styles.pill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pillText, { color: colors.mutedForeground }]}>Regular Payment</Text>
            </View>
          )}
          {isShared && !isCancelled && (
            <View style={[styles.pill, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.pillText, { color: colors.primary }]}>÷{members}</Text>
            </View>
          )}
          {showTrialBadge && !isCancelled && (
            <View style={[styles.pill, { backgroundColor: trialBadgeColor + '22' }]}>
              <Text style={[styles.pillText, { color: trialBadgeColor }]}>
                {trialDaysLeft === 0 ? t('trial_badge_today') : t('trial_badge', { days: trialDaysLeft })}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {subscription.billingCycle === 'monthly' ? 'Monthly' : subscription.billingCycle === 'annual' ? 'Annual' : 'Weekly'}
          </Text>
          {!isCancelled && (
            <>
              <Text style={[styles.dot, { color: colors.mutedForeground }]}> · </Text>
              <Text style={[styles.metaText, { color: isUrgent ? colors.destructive : colors.mutedForeground }]}>
                {formatDate(subscription.nextBillingDate)}
              </Text>
            </>
          )}
        </View>
        {isShared && !isCancelled && (
          <Text style={[styles.shareLabel, { color: colors.primary }]}>
            Your share: SAR {formatAmount(shareAmount)}
          </Text>
        )}
      </View>

      {/* Right: amount + VAT badge */}
      <View style={styles.right}>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: isCancelled ? colors.mutedForeground : colors.foreground }]}>
            SAR {formatAmount(subscription.amount)}
          </Text>
          {subscription.includesVat && (
            <View style={styles.vatBadge}>
              <Text style={styles.vatBadgeText}>+VAT</Text>
            </View>
          )}
        </View>
        {subscription.includesVat && (
          <Text style={[styles.exVat, { color: colors.mutedForeground }]}>
            SAR {formatAmount(subscription.amount / 1.15)} ex-VAT
          </Text>
        )}
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
  cancelled: {
    opacity: 0.5,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    fontSize: 12,
  },
  shareLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  vatBadge: {
    backgroundColor: '#F59E0B22',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  vatBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  exVat: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});
