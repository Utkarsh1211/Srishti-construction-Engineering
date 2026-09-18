import React, { useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import ProjectCard from '../components/ProjectCard';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCachedFetch } from '../api/useCachedFetch';
import ActionSheet from '../components/ActionSheet';
import Money from '../components/Money';

export default function ProjectListScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [summaries, setSummaries] = useState({});
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [exporting, setExporting] = useState(false);

  const {
    data: projectsRes,
    loading,
    refreshing: bgRefreshing,
    reload
  } = useCachedFetch('projects', () => api.getProjects());

  const { data: companySummary } = useCachedFetch('company-summary', () =>
    api.getCompanySummary().then((r) => r.data)
  );
  const projects = projectsRes?.data || [];

  const filtered = projects.filter(
    (p) =>
      p.project_name.toLowerCase().includes(query.toLowerCase()) ||
      (p.project_code || '').toLowerCase().includes(query.toLowerCase())
  );

  const PINNED_ORDER = ['ACCT-SRISHTI', 'ACCT-SRISRISHTI', 'LOAN-MAIN'];

  const sorted = useMemo(() => {
    const pinned = filtered.filter((p) => PINNED_ORDER.includes(p.project_code));
    pinned.sort((a, b) => PINNED_ORDER.indexOf(a.project_code) - PINNED_ORDER.indexOf(b.project_code));

    const sites = filtered.filter((p) => p.kind === 'site');
    sites.sort((a, b) => {
      const aActive = (a.status || 'active') === 'active';
      const bActive = (b.status || 'active') === 'active';
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.project_name.localeCompare(b.project_name);
    });

    return [...pinned, ...sites];
  }, [filtered]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await api.generateAndDownloadXlsx();
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const openAdd = () => {
    setEditingProject(null);
    setModalVisible(true);
  };
  const [actionSheetTarget, setActionSheetTarget] = useState(null);


  const handleDeleteProject = (project) => {
    Alert.alert('Delete site?', `Remove "${project.project_name}" and all its transactions — this can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProject(project.project_id);
            reload();
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
        <View>
          <Text style={styles.headerEyebrow}>SIGNED IN AS {user?.name?.toUpperCase()}</Text>
          <Text style={type.display}>Sites</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>
      {companySummary && (
        <View style={styles.companyBanner}>
          <Text style={styles.companyBannerLabel}>COMPANY BALANCE</Text>
          <Money
            amount={companySummary.balance}
            kind={companySummary.balance >= 0 ? 'credit' : 'debit'}
            size="amountLarge"
          />
          <Text style={styles.companyBannerSub}>
            Credits ₹{companySummary.site_credits.toLocaleString('en-IN')} · Debits ₹{companySummary.site_debits.toLocaleString('en-IN')} · Withdrawn ₹{companySummary.total_withdrawals.toLocaleString('en-IN') } · Loan recieved ₹{companySummary.total_loan_received.toLocaleString('en-IN')} · Loan repaid ₹{companySummary.total_loan_repaid.toLocaleString('en-IN')}
          </Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search sites or code"
          placeholderTextColor={colors.ink40}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.appBtn} onPress={handleExport} disabled={exporting}>
          <Text style={styles.appBtnText}>.xlsx</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.appBtn} onPress={() => navigation.navigate('BudgetCalculator')}>
          <Text style={styles.appBtnText}>Budget</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.steel} />
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.h2}>No sites yet</Text>
          <Text style={styles.emptySub}>Add your first site to start recording expenses.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.project_id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={bgRefreshing} onRefresh={reload} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => navigation.navigate('ProjectLedger', { project: item })}
              onLongPress={() => setActionSheetTarget(item)}
            />
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ProjectModal
        visible={modalVisible}
        editingProject={editingProject}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false);
          reload();
        }}
      />
      <ActionSheet
        visible={!!actionSheetTarget}
        title={actionSheetTarget?.project_name}
        onClose={() => setActionSheetTarget(null)}
        actions={[
          { label: 'Edit', onPress: () => { setEditingProject(actionSheetTarget); setModalVisible(true); } },
          { label: 'Delete', destructive: true, onPress: () => handleDeleteProject(actionSheetTarget) }
        ]}
      />
    </View>
  );
}

function ProjectModal({ visible, editingProject, onClose, onSaved }) {
  const isEdit = !!editingProject;
  const [name, setName] = useState(editingProject?.project_name || '');
  const [status, setStatus] = useState(editingProject?.status || 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState(null);
  const [projectCode, setProjectCode] = useState(editingProject?.project_code || '');

  React.useEffect(() => {
    if (visible) {
      setName(editingProject?.project_name || '');
      setStatus(editingProject?.status || 'active');
      setError('');
      setCreatedCode(null);
      setProjectCode(editingProject?.project_code || '');
    }
  }, [visible, editingProject]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Site name is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateProject({
          project_id: editingProject.project_id,
          project_name: name.trim(),
          status
        });
        onSaved();
      } else {
        const res = await api.addProject({ project_name: name.trim(), project_code: projectCode.trim().toUpperCase() || null });
        // Show the generated code before closing, so whoever's adding the
        // site can note it down — it doesn't appear anywhere else until
        // they scroll back to find it in the list.
        onSaved();
      }
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setStatus('active');
    setCreatedCode(null);
    setProjectCode('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
    style={styles.modalBackdrop}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <>
            <Text style={type.h1}>{isEdit ? 'Edit site' : 'New Site'}</Text>

            <Text style={styles.fieldLabel}>SITE NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ganga Niketan Site"
              placeholderTextColor={colors.ink40}
            />

            {isEdit && (
              <>
                <Text style={styles.fieldLabel}>STATUS</Text>
                <View style={styles.statusToggle}>
                  <TouchableOpacity
                    style={[styles.statusBtn, status === 'active' && styles.statusBtnActive]}
                    onPress={() => setStatus('active')}
                  >
                    <Text style={[styles.statusBtnText, status === 'active' && styles.statusBtnTextActive]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusBtn, status === 'finished' && styles.statusBtnActiveFinished]}
                    onPress={() => setStatus('finished')}
                  >
                    <Text style={[styles.statusBtnText, status === 'finished' && styles.statusBtnTextActive]}>
                      Finished
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {isEdit && !!editingProject?.project_code && (
              <Text style={styles.codeReadonly}>{editingProject.project_code} (code can't be changed)</Text>
            )}

            {
              !isEdit && (
                <>
                  <Text style={styles.fieldLabel}>SITE CODE</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={projectCode || ''}
                    onChangeText={setProjectCode}
                    placeholder="GNS2234"
                    placeholderTextColor={colors.ink40}
                  />
                </>
              )
            }

            {!!error && <Text style={styles.modalError}>{error}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>{isEdit ? 'Save changes' : 'Save site'}</Text>}
              </TouchableOpacity>
            </View>
          </>
        </View>
      </View>
  </KeyboardAvoidingView>
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
  appBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center'
  },
  appBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
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
    fontSize: 15,
    color: colors.ink
  },
  statusToggle: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  statusBtnActive: { backgroundColor: colors.creditBg, borderColor: colors.credit },
  statusBtnActiveFinished: { backgroundColor: colors.paperDim, borderColor: colors.ink40 },
  statusBtnText: { fontWeight: '600', fontSize: 13, color: colors.ink70 },
  statusBtnTextActive: { color: colors.ink },
  codeReadonly: { fontSize: 12, color: colors.ink40, marginTop: spacing.md },
  modalError: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.paperDim },
  modalCancelText: { fontWeight: '600', color: colors.ink70 },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.steel },
  modalSaveText: { fontWeight: '700', color: colors.white },
  codeLabel: { ...type.label, color: colors.ink40, marginTop: spacing.lg, fontSize: 10 },
  codeValue: { fontSize: 28, fontWeight: '700', color: colors.steel, marginTop: spacing.xs, letterSpacing: 1 },
  codeHint: { fontSize: 13, color: colors.ink70, marginTop: spacing.sm, marginBottom: spacing.lg },
  companyBanner: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  companyBannerLabel: { ...type.label, color: colors.ink40, fontSize: 10, marginBottom: spacing.xs },
  companyBannerSub: { fontSize: 11, color: colors.ink40, marginTop: spacing.xs }
});