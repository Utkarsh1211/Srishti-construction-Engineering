import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from './Money';

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TransactionRow({ txn, onPress, onLongPress }) {
  const isCredit = txn.type === 'credit';
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.badge, { backgroundColor: isCredit ? colors.creditBg : colors.debitBg }]}>
        <Text style={[styles.badgeText, { color: isCredit ? colors.credit : colors.debit }]}>
          {isCredit ? '↓' : '↑'}
        </Text>
      </View>

      <View style={styles.middle}>
        <Text style={type.h2} numberOfLines={1}>
          {txn.description || (isCredit ? 'Payment received' : 'Expense')}
        </Text>
        <Text style={styles.date}>{formatDate(txn.date)}</Text>
      </View>

      <View style={styles.right}>
        <Money amount={txn.amount} kind={isCredit ? 'credit' : 'debit'} size="amount" />
        {txn.running_balance !== undefined && (
          <Text style={styles.runningBalance}>Bal: {Money && formatBalance(txn.running_balance)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatBalance(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  badgeText: { fontSize: 16, fontWeight: '700' },
  middle: { flex: 1, marginRight: spacing.sm },
  date: { ...type.body, fontSize: 12, color: colors.ink40, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  runningBalance: { fontSize: 11, color: colors.ink40, marginTop: 2 }
});
