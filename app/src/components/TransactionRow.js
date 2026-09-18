import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from './Money';

function formatDate(iso) {
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return iso;
  }

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatBalance(n) {
  const value = Number(n) || 0;
  const sign = value < 0 ? '-' : '';

  return (
    sign +
    '₹' +
    Math.abs(value).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })
  );
}

export default function TransactionRow({ txn, isAccount ,onPress, onLongPress }) {
  const isCredit = txn.type === 'credit';
  const isWithdrawal = txn.type === 'withdrawal';

  const firstName = txn.entered_by?.split(' ')[0] || '';

  const tint = isWithdrawal
    ? colors.withdrawal
    : isCredit
      ? colors.credit
      : colors.debit;

  const tintBg = isWithdrawal
    ? colors.withdrawalBg
    : isCredit
      ? colors.creditBg
      : colors.debitBg;

  // ↑ Money coming in
  // ↓ Money going out
  const icon = isWithdrawal ? '◆' : isCredit ? '↑' : '↓';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* LEFT */}
      <View style={styles.leftColumn}>
        <View style={[styles.badge, { backgroundColor: tintBg }]}>
          <Text style={[styles.badgeText, { color: tint }]}>
            {icon}
          </Text>
        </View>

      </View>

      {/* MIDDLE */}
      <View style={styles.middle}>
  <View
    style={[
      styles.categoryTag,
      { backgroundColor: tintBg },
    ]}
  >
    <Text
      style={[styles.categoryTagText, { color: tint }]}
      numberOfLines={1}
    >
      {txn.category}
    </Text>
  </View>

  {!!txn.detail && (
    <Text style={styles.detail} numberOfLines={1}>
      {txn.detail}
    </Text>
  )}

  <View style={styles.metaRow}>
    <Text style={styles.date}>
      {formatDate(txn.date)}
    </Text>
  {
    isAccount &&
    <>
    <Text style={styles.dot}>•</Text>
     <Text style = {styles.date}>
      {txn.project_name.trim().split(/\s+/).slice(0, 3).join(' ')}
    </Text>
    </>
  }
    {!!txn.entered_by && (
      <>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.enteredBy}>
          {firstName}
        </Text>
      </>
    )}

  </View>
</View>

      {/* RIGHT */}
      <View style={styles.right}>
        <Money
          amount={txn.amount}
          kind={
            isWithdrawal
              ? 'withdrawal'
              : isCredit
                ? 'credit'
                : 'debit'
          }
          size="amount"
        />

        {txn.running_balance !== undefined && !isWithdrawal && (
          <Text style={styles.runningBalance}>
            {formatBalance(txn.running_balance)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    backgroundColor: colors.white,

    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,

    // Important for preventing children from overflowing
    minWidth: 0,
  },

  // -------------------------
  // LEFT
  // -------------------------

  leftColumn: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },

  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,

    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    fontSize: 17,
    fontWeight: '700',
  },

  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,

    backgroundColor: colors.ink,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 6,

    borderWidth: 2,
    borderColor: colors.white,
  },

  avatarText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },

  // -------------------------
  // MIDDLE
  // -------------------------

  middle: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },

  categoryTag: {
    // THIS fixes your oversized category pills
    alignSelf: 'flex-start',

    maxWidth: '100%',

    paddingHorizontal: 12,
    paddingVertical: 5,

    borderRadius: radii.pill,
  },

  categoryTagText: {
    fontSize: 12,
    fontWeight: '700',
  },

  detail: {
    ...type.body,

    fontSize: 14,
    color: colors.ink,

    marginTop: 4,

    flexShrink: 1,
  },

  date: {
    fontSize: 12,
    color: colors.ink40,

    marginTop: 3,
  },

  // -------------------------
  // RIGHT
  // -------------------------

  right: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',

    // Gives the amount a predictable area
    width: 115,
    marginLeft: spacing.sm,
  },

  runningBalance: {
    fontSize: 13,
    color: colors.ink40,

    marginTop: 4,

    textAlign: 'right',
  },
  metaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
},

date: {
  fontSize: 11,
  color: colors.ink40,
},

dot: {
  fontSize: 10,
  color: colors.ink40,
  marginHorizontal: 5,
},

enteredBy: {
  fontSize: 11,
  color: colors.ink40,
},
});