import React from 'react';
import { Text } from 'react-native';
import { colors, type as typeTokens } from '../theme/theme';

export function formatMoney(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/**
 * kind: 'credit' | 'debit' | 'balance'
 */
export default function Money({ amount, kind = 'balance', size = 'amount', style }) {
  const color =
    kind === 'credit' ? colors.credit :
    kind === 'debit' ? colors.debit :
    kind === 'withdrawal' ? colors.withdrawal :
    colors.ink;
  const prefix =
    kind === 'credit' ? '+' :
    kind === 'debit' ? '-' :
    kind === 'withdrawal' ? '-' :
    '';
  return (
    <Text style={[typeTokens[size], { color }, style]}>
      {prefix}
      {formatMoney(Math.abs(amount))}
    </Text>
  );
}