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
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radii, type } from '../theme/theme';
import Money from '../components/Money';
import api from '../api/api';

export default function ClientDetailScreen({ route, navigation }) {
  const { client } = route.params;
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projRes, summRes] = await Promise.all([
        api.getProjects(client.client_id),
        api.getClientSummary(client.client_id)
      ]);
      setProjects(projRes.data);
      setSummary(summRes.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [client.client_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CLIENT</Text>
        <Text style={type.display}>{client.name}</Text>
        {client.address ? <Text style={styles.address}>{client.address}</Text> : null}
      </View>

      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>RECEIVED</Text>
            <Money amount={summary.total_credit} kind="credit" size="amount" />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>SPENT</Text>
            <Money amount={summary.total_debit} kind="debit" size="amount" />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>BALANCE</Text>
            <Money amount={summary.balance} kind={summary.balance >= 0 ? 'credit' : 'debit'} size="amount" />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Projects</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.steel} />
      ) : projects.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.h2}>No projects yet</Text>
          <Text style={styles.emptySub}>Add a project to start recording transactions.</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.project_id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectLedger', { project: item, client })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>{item.project_name}</Text>
                <Text style={styles.projectMeta}>
                  {item.status?.toUpperCase() || 'ACTIVE'} · Started{' '}
                  {new Date(item.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddProjectModal
        visible={addModalVisible}
        clientId={client.client_id}
        onClose={() => setAddModalVisible(false)}
        onCreated={() => {
          setAddModalVisible(false);
          load();
        }}
      />
    </View>
  );
}

function AddProjectModal({ visible, clientId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setSaving(true);
    try {
      await api.addProject({
        client_id: clientId,
        project_name: name.trim(),
        start_date: new Date().toISOString(),
        status: 'active'
      });
      setName('');
      setError('');
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={type.h1}>New project</Text>
          <Text style={styles.fieldLabel}>PROJECT NAME</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Site A — Foundation work"
          />
          {!!error && <Text style={styles.modalError}>{error}</Text>}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => { setName(''); onClose(); }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>Save project</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  header: { marginBottom: spacing.lg },
  eyebrow: { ...type.label, color: colors.ink40, marginBottom: spacing.xs, fontSize: 10 },
  address: { color: colors.ink70, marginTop: spacing.xs, fontSize: 13 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...type.label, color: colors.ink40, fontSize: 9, marginBottom: spacing.xs },
  summaryDivider: { width: 1, backgroundColor: '#2E4155' },
  sectionTitle: { ...type.h1, marginBottom: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xl },
  emptySub: { color: colors.ink70, marginTop: spacing.xs, textAlign: 'center' },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  projectMeta: { fontSize: 12, color: colors.ink40, marginTop: 4 },
  chevron: { fontSize: 22, color: colors.ink40, marginLeft: spacing.sm },
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
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.paperDim },
  modalCancelText: { fontWeight: '600', color: colors.ink70 },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.steel },
  modalSaveText: { fontWeight: '700', color: colors.white }
});
