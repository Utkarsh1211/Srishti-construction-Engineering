import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';

export default function AccountDropdown({ accounts, value, type, onChange }) {
  // custom styles based on type
  const activeChipStyle = type === 'credit' ? styles.chipActiveCredit : type === 'debit' ? styles.chipActiveDebit : styles.chipActiveWithdrawal;
  const activeChipTextStyle = type === 'credit' ? styles.chipTextActiveCredit : type === 'debit' ? styles.chipTextActiveDebit : styles.chipTextActiveWithdrawal;
  const chipTextStyle = type === 'credit' ? styles.chipTextCredit : type === 'debit' ? styles.chipTextDebit : styles.chipTextWithdrawal;
  return (
    <View style={styles.wrap}>
      {accounts.map((acct) => {
        //if type is credit, then project_id other wise project_name
        const active = acct.project_id === value ;
        return (
          <TouchableOpacity
            key={acct.project_id}
            style={[styles.chip, active && activeChipStyle]}
            onPress={() => onChange(acct)}
            activeOpacity={0.7}
          >
            <Text style={[chipTextStyle, active && activeChipTextStyle]} numberOfLines={1}>
              {acct.project_name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    flexGrow: 1,
    alignItems: 'center'
  },
  chipActiveCredit: { backgroundColor: colors.creditBg, borderColor: colors.credit },
  chipActiveDebit: { backgroundColor: colors.debitBg, borderColor: colors.debit },
  chipActiveWithdrawal: { backgroundColor: colors.withdrawalBg, borderColor: colors.withdrawal },
  chipTextCredit: { ...type.body, fontSize: 13, color: colors.ink70, fontWeight: '600' },
  chipTextActiveCredit: { color: colors.credit },
  chipTextDebit: { ...type.body, fontSize: 13, color: colors.ink70, fontWeight: '600' },
  chipTextActiveDebit: { color: colors.debit },
  chipActiveWithdrawal: { backgroundColor: colors.withdrawalBg, borderColor: colors.withdrawal },
  chipTextWithdrawal: { ...type.body, fontSize: 13, color: colors.ink70, fontWeight: '600' },
  chipTextActiveWithdrawal: { color: colors.withdrawal }
});