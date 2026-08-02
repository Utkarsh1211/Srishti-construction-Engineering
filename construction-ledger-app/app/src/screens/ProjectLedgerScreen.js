import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from '../components/Money';
import TransactionRow from '../components/TransactionRow';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectLedgerScreen({ route }) {
  const { project, client } = route.params;
  const { user } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getTransactions(project.project_id);
      // show most recent first
      setTxns([...res.data].reverse());
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [project.project_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const currentBalance = txns.length > 0 ? txns[0].running_balance : 0;

  const openAdd = () => {
    setEditingTxn(null);
    setModalVisible(true);
  };

  const openEdit = (txn) => {
    setEditingTxn(txn);
    setModalVisible(true);
  };

  const handleDelete = (txn) => {
    Alert.alert('Delete entry?', `Remove "${txn.description || txn.type}" — this can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTransaction(txn.txn_id);
            load();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{client.name.toUpperCase()}</Text>
        <Text style={type.display}>{project.project_name}</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Money amount={currentBalance} kind={currentBalance >= 0 ? 'credit' : 'debit'} size="amountLarge" />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.steel} />
      ) : txns.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.h2}>No entries yet</Text>
          <Text style={styles.emptySub}>Tap + to record the first credit or debit.</Text>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(item) => item.txn_id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TransactionRow
              txn={item}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}
            />
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        project={project}
        client={client}
        user={user}
        editingTxn={editingTxn}
        onSaved={() => {
          setModalVisible(false);
          load();
        }}
      />
    </View>
  );
}

function TransactionModal({ visible, onClose, project, client, user, editingTxn, onSaved }) {
  const isEdit = !!editingTxn;
  const [txnType, setTxnType] = useState(editingTxn?.type || 'debit');
  const [amount, setAmount] = useState(editingTxn ? String(editingTxn.amount) : '');
  const [description, setDescription] = useState(editingTxn?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // reset local state whenever a new editingTxn is passed in / modal reopened
  React.useEffect(() => {
    if (visible) {
      setTxnType(editingTxn?.type || 'debit');
      setAmount(editingTxn ? String(editingTxn.amount) : '');
      setDescription(editingTxn?.description || '');
      setError('');
    }
  }, [visible, editingTxn]);

  const handleSave = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateTransaction({
          txn_id: editingTxn.txn_id,
          type: txnType,
          amount: numAmount,
          description: description.trim()
        });
      } else {
        await api.addTransaction({
          project_id: project.project_id,
          client_id: client.client_id,
          date: new Date().toISOString(),
          type: txnType,
          amount: numAmount,
          description: description.trim(),
          entered_by: user?.name || user?.username || ''
        });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
          <Text style={type.h1}>{isEdit ? 'Edit entry' : 'New entry'}</Text>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, txnType === 'credit' && styles.typeBtnActiveCredit]}
              onPress={() => setTxnType('credit')}
            >
              <Text style={[styles.typeBtnText, txnType === 'credit' && styles.typeBtnTextActive]}>
                Credit (received)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, txnType === 'debit' && styles.typeBtnActiveDebit]}
              onPress={() => setTxnType('debit')}
            >
              <Text style={[styles.typeBtnText, txnType === 'debit' && styles.typeBtnTextActive]}>
                Debit (spent)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>AMOUNT (₹)</Text>
          <TextInput
            style={styles.modalInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />

          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            style={styles.modalInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Cement — 50 bags"
          />

          {!!error && <Text style={styles.modalError}>{error}</Text>}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: txnType === 'credit' ? colors.credit : colors.debit }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>Save entry</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  header: { marginBottom: spacing.lg },
  eyebrow: { ...type.label, color: colors.ink40, marginBottom: spacing.xs, fontSize: 10 },
  balanceRow: { marginTop: spacing.md },
  balanceLabel: { fontSize: 12, color: colors.ink70, marginBottom: 2 },
  empty: { alignItems: 'center', marginTop: spacing.xl },
  emptySub: { color: colors.ink70, marginTop: spacing.xs, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4
  },
  fabText: { color: colors.white, fontSize: 28, marginTop: -2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(22,35,46,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg },
  typeToggle: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  typeBtnActiveCredit: { backgroundColor: colors.creditBg, borderColor: colors.credit },
  typeBtnActiveDebit: { backgroundColor: colors.debitBg, borderColor: colors.debit },
  typeBtnText: { fontWeight: '600', fontSize: 13, color: colors.ink70 },
  typeBtnTextActive: { color: colors.ink },
  fieldLabel: { ...type.label, color: colors.ink40, marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 10 },
  modalInput: {
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15
  },
  modalError: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.paperDim },
  modalCancelText: { fontWeight: '600', color: colors.ink70 },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm },
  modalSaveText: { fontWeight: '700', color: colors.white }
});
