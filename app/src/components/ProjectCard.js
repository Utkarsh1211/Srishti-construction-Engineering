import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from './Money';

export default function ProjectCard({ project, onPress, onLongPress }) {

  const balance = project.balance;
  const isActive = (project.status || 'active') === 'active';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={type.h2} numberOfLines={1}>{project.project_name}</Text>
        <View style={styles.subRow}>
          {!!project.project_code && <Text style={styles.code}>{project.project_code}</Text>}
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusFinished]}>
            <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextFinished]}>
              {isActive ? 'Active' : 'Finished'}
            </Text>
          </View>
        </View>
      </View>
      {balance !== null && (
        <View style={styles.balanceWrap}>
          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Money amount={balance} kind={balance >= 0 ? 'credit' : (project.kind === 'account' ? 'withdrawal' : 'debit')} size="amount" />
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
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.xs },
  code: { fontSize: 12, color: colors.ink40, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  statusActive: { backgroundColor: colors.creditBg },
  statusFinished: { backgroundColor: colors.paperDim },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextActive: { color: colors.credit },
  statusTextFinished: { color: colors.ink40 },
  balanceWrap: { alignItems: 'flex-end' },
  balanceLabel: { ...type.label, color: colors.ink40, marginBottom: 2, fontSize: 10 }
});