import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { BankAccount } from '@/context/SubscriptionContext';

interface Props {
  bank: BankAccount;
  onRemove: () => void;
  subscriptionCount?: number;
}

function getBankColor(bankName: string): string {
  const colors: Record<string, string> = {
    'Al Rajhi Bank': '#78BE20',
    'Saudi National Bank': '#0072CE',
    'Riyad Bank': '#E31837',
    'Banque Saudi Fransi': '#003399',
    'Arab National Bank': '#00529B',
    'SABB': '#DB0011',
    'Alinma Bank': '#6B2D8B',
    'Bank Albilad': '#F7941D',
  };
  return colors[bankName] ?? '#7B6CF8';
}

function getBankIcon(bankName: string): string {
  return 'credit-card';
}

function timeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function BankCard({ bank, onRemove, subscriptionCount = 0 }: Props) {
  const colors = useColors();
  const bankColor = getBankColor(bank.bankName);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: bankColor + '20' }]}>
          <Feather name="credit-card" size={20} color={bankColor} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.bankName, { color: colors.foreground }]} numberOfLines={1}>
            {bank.bankName}
          </Text>
          <Text style={[styles.accountType, { color: colors.mutedForeground }]}>
            {bank.accountType} ···· {bank.lastFour}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.accent + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.statusText, { color: colors.accent }]}>Active</Text>
        </View>
      </View>

      {/* Footer row */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Synced {timeAgo(bank.connectedAt)}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="repeat" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {subscriptionCount} subscription{subscriptionCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  bankName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  accountType: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
