import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from '../components/Money';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCachedFetch } from '../api/useCachedFetch';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}
function formatDisplay(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BudgetCalculatorScreen() {
  const { user } = useAuth();
  const { data: projectsRes } = useCachedFetch('projects', () => api.getProjects());
  const accounts = (projectsRes?.data || []).filter((p) => p.kind === 'account');

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // default: start of current month
    return d;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null); // 'from' | 'to' | null
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const openPicker = (which) => {
    const current = which === 'from' ? fromDate : toDate;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        onChange: (event, selected) => {
          if (selected) {
            if (which === 'from') setFromDate(selected);
            else setToDate(selected);
          }
        }
      });
    } else {
      setShowPicker(which);
    }
  };

  const handleCalculate = async () => {
    if (!selectedAccount) {
      Alert.alert('Pick an account', 'Select which account to calculate for.');
      return;
    }
    if (fromDate > toDate) {
      Alert.alert('Invalid range', '"From" date must be before "To" date.');
      return;
    }
    setCalculating(true);
    setResult(null);
    try {
      const res = await api.getPeriodSummary(selectedAccount.project_id, formatDate(fromDate), formatDate(toDate));
      setResult(res.data);
      if (res.data.leftover > 0) {
        Alert.alert(
          'Withdrawal available',
          `₹${res.data.leftover.toLocaleString('en-IN')} is available for this period. Add a withdrawal entry to keep the ledger clean?`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Add withdrawal', onPress: () => setWithdrawalModalVisible(true) }
          ]
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCalculating(false);
    }
  };

  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={type.display}>Monthly Budget</Text>
      <Text style={styles.subtitle}>Check how much can be withdrawn from an account for a given period.</Text>

      <Text style={styles.fieldLabel}>ACCOUNT</Text>
      <View style={styles.chipRow}>
        {accounts.map((acct) => {
          const active = selectedAccount?.project_id === acct.project_id;
          return (
            <TouchableOpacity
              key={acct.project_id}
              style={[styles.accountChip, active && styles.accountChipActive]}
              onPress={() => { setSelectedAccount(acct); setResult(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.accountChipText, active && styles.accountChipTextActive]}>{acct.project_name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>FROM</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('from')}>
        <Text style={styles.dateBtnText}>{formatDisplay(fromDate)}</Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>TO</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('to')}>
        <Text style={styles.dateBtnText}>{formatDisplay(toDate)}</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? fromDate : toDate}
          mode="date"
          display="inline"
          onChange={(event, selected) => {
            setShowPicker(null);
            if (selected) {
              if (showPicker === 'from') setFromDate(selected);
              else setToDate(selected);
            }
          }}
        />
      )}

      <TouchableOpacity style={styles.calculateBtn} onPress={handleCalculate} disabled={calculating}>
        {calculating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.calculateBtnText}>Calculate</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Credits received</Text>
            <Money amount={result.total_credit} kind="credit" size="amount" />
          </View>
        <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Already debited</Text>
            <Money amount={result.total_debit} kind="debit" size="amount" />
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Already withdrawn</Text>
            <Money amount={result.total_withdrawal} kind="withdrawal" size="amount" />
          </View>
          <View style={[styles.resultRow, styles.resultDivider]}>
            <Text style={styles.resultLabelBold}>Available to withdraw</Text>
            <Money amount={result.leftover} kind={result.leftover >= 0 ? 'credit' : 'debit'} size="amountLarge" />
          </View>
        </View>
      )}

      <WithdrawalPromptModal
        visible={withdrawalModalVisible}
        onClose={() => setWithdrawalModalVisible(false)}
        account={selectedAccount}
        suggestedAmount={result?.leftover}
        defaultDate={toDate}
        user={user}
        onSaved={() => {
          setWithdrawalModalVisible(false);
          handleCalculate(); // refresh the numbers to reflect the new withdrawal
        }}
      />
    </ScrollView>
  );
}

function WithdrawalPromptModal({ visible, onClose, account, suggestedAmount, defaultDate, user, onSaved }) {
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (visible) {
      setAmount(suggestedAmount ? String(Math.round(suggestedAmount)) : '');
      setDetail(`Period withdrawal through ${formatDisplay(defaultDate)}`);
      setError('');
    }
  }, [visible, suggestedAmount, defaultDate]);

  if (!visible) return null;

  const handleSave = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.addTransaction({
        project_id: account.project_id,
        project_code: account.project_code,
        account_id: account.project_id,
        date: formatDate(defaultDate) + 'T12:00:00.000Z',
        type: 'withdrawal',
        category: 'Personal Work',
        subcategory: null,
        detail: detail.trim(),
        amount: numAmount,
        entered_by: account.project_name,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
    style={styles.modalBackdrop}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={type.h1}>Add withdrawal</Text>
        <Text style={styles.modalSub}>{account?.project_name} · dated {formatDisplay(defaultDate)}</Text>

        <Text style={styles.fieldLabel}>AMOUNT (₹)</Text>
        <TextInput style={styles.modalInput} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={colors.ink40} />

        <Text style={styles.fieldLabel}>NOTE</Text>
        <TextInput style={styles.modalInput} value={detail} onChangeText={setDetail} placeholderTextColor={colors.ink40} />

        {!!error && <Text style={styles.modalError}>{error}</Text>}

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSave} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>Save withdrawal</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { fontSize: 13, color: colors.ink70, marginTop: spacing.xs, marginBottom: spacing.lg },
  fieldLabel: { ...type.label, color: colors.ink40, marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 10 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  accountChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center'
  },
  accountChipActive: { backgroundColor: colors.creditBg, borderColor: colors.credit },
  accountChipText: { fontSize: 13, fontWeight: '600', color: colors.ink70 },
  accountChipTextActive: { color: colors.credit },
  dateBtn: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md
  },
  dateBtnText: { fontSize: 15, color: colors.ink },
  calculateBtn: {
    backgroundColor: colors.steel,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xl
  },
  calculateBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  resultCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  resultDivider: { borderTopWidth: 1, borderTopColor: '#2E4155', marginTop: spacing.xs, paddingTop: spacing.md },
  resultLabel: { fontSize: 13, color: colors.ink40 },
  resultLabelBold: { fontSize: 13, color: colors.white, fontWeight: '700' },
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(22,35,46,0.5)', justifyContent: 'flex-end'
  },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg },
  modalSub: { fontSize: 12, color: colors.ink40, marginTop: spacing.xs },
  modalInput: {
    backgroundColor: colors.paper, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.ink
  },
  modalError: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.paperDim },
  modalCancelText: { fontWeight: '600', color: colors.ink70 },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.withdrawal },
  modalSaveText: { fontWeight: '700', color: colors.white }
});