import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from './Money';

export default function ClientCard({ client, summary, onPress }) {
  const initials = (client.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const balance = summary ? summary.balance : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={type.h2} numberOfLines={1}>{client.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {client.contact || 'No contact info'}
        </Text>
      </View>
      {balance !== null && (
        <View style={styles.balanceWrap}>
          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Money amount={balance} kind={balance >= 0 ? 'credit' : 'debit'} size="amount" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  sub: { ...type.body, color: colors.ink70, marginTop: 2, fontSize: 13 },
  balanceWrap: { alignItems: 'flex-end' },
  balanceLabel: { ...type.label, color: colors.ink40, marginBottom: 2, fontSize: 10 }
});
