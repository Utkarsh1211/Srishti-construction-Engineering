import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radii, type } from '../theme/theme';
import ClientCard from '../components/ClientCard';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ClientListScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getClients();
      setClients(res.data);
      // fetch summaries in background, don't block the list render
      res.data.forEach((c) => {
        api
          .getClientSummary(c.client_id)
          .then((s) => setSummaries((prev) => ({ ...prev, [c.client_id]: s.data })))
          .catch(() => {});
      });
    } catch (e) {
      Alert.alert('Error loading clients', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleExport = async () => {
    try {
      const res = await api.exportXlsxUrl();
      Linking.openURL(res.url);
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>SIGNED IN AS {user?.name?.toUpperCase()}</Text>
          <Text style={type.display}>Clients</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search clients"
          placeholderTextColor={colors.ink40}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>.xlsx</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.steel} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.h2}>No clients yet</Text>
          <Text style={styles.emptySub}>Add your first client to start a ledger.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.client_id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              summary={summaries[item.client_id]}
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
            />
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddClientModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onCreated={() => {
          setAddModalVisible(false);
          load();
        }}
      />
    </View>
  );
}

function AddClientModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setContact('');
    setAddress('');
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    try {
      await api.addClient({ name: name.trim(), contact: contact.trim(), address: address.trim() });
      reset();
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
          <Text style={type.h1}>New client</Text>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Client or company name" />

          <Text style={styles.fieldLabel}>CONTACT</Text>
          <TextInput style={styles.modalInput} value={contact} onChangeText={setContact} placeholder="Phone or email" keyboardType="default" />

          <Text style={styles.fieldLabel}>ADDRESS</Text>
          <TextInput style={styles.modalInput} value={address} onChangeText={setAddress} placeholder="Site or billing address" />

          {!!error && <Text style={styles.modalError}>{error}</Text>}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>Save client</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg },
  headerEyebrow: { ...type.label, color: colors.ink40, marginBottom: spacing.xs, fontSize: 10 },
  logout: { color: colors.steel, fontWeight: '600', fontSize: 13 },
  searchRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },
  search: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14
  },
  exportBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center'
  },
  exportBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptySub: { color: colors.ink70, marginTop: spacing.xs },
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
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '400', marginTop: -2 },
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
