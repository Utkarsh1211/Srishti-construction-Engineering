import React, { useMemo, useState } from 'react';
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
import { colors, spacing, radii, type } from '../theme/theme';
import Money from '../components/Money';
import TransactionRow from '../components/TransactionRow';
import CategoryPicker from '../components/CategoryPicker';
import SubcategoryPicker from '../components/SubcategoryPicker';
import AccountDropdown from '../components/AccountDropdown';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCachedFetch } from '../api/useCachedFetch';
import { EXPENSE_CATEGORIES, CREDIT_CATEGORY, WITHDRAWAL_CATEGORY, LOAN_CREDIT_CATEGORY } from '../api/constants/categories';

const FILTER_ALL = 'all';

export default function ProjectLedgerScreen({ route }) {
  const { project } = route.params;
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(FILTER_ALL);
  const [subcategoryFilter, setSubcategoryFilter] = useState(FILTER_ALL);
  const [enteredByFilter, setEnteredByFilter] = useState(FILTER_ALL);
  const {
    data: txnsRes,
    loading,
    reload
  } = useCachedFetch(`transactions:${project.project_id}`, () => api.getTransactions({ project_id: project.project_id }));


  
  const { data: projectsRes } = useCachedFetch('projects', () => api.getProjects());
  const allProjects = projectsRes?.data || [];
  const accounts = allProjects.filter((p) => p.kind === 'account');
  const projectNameById = useMemo(() => {
    const map = {};
    allProjects.forEach((p) => { map[p.project_id] = p.project_name; });
    return map;
  }, [allProjects]);

  const allTxns = txnsRes ? [...txnsRes.data].reverse() : [];

  const isAccountProject = project.kind === 'account';
  const {data: currentBalanceRes} = (isAccountProject) ? useCachedFetch(`summary:${project.project_id}`, () => api.getProjectAccountCurrentBalanceById(project.project_id)) : {data: null};
  const currentBalance = allTxns.length > 0 ? allTxns[0].running_balance : 0;

  const categoriesPresent = useMemo(
    () => [...new Set(allTxns.map((t) => t.category).filter(Boolean))].sort(),
    [allTxns]
  );
  const availableSubcategories = useMemo(() => {
  if (categoryFilter === FILTER_ALL) {
    return [];
  }

  const selectedCategory = EXPENSE_CATEGORIES.find(
    (item) => item.category === categoryFilter
  );

  return selectedCategory?.subcategories || [];
  }, [categoryFilter]);
  const enteredByPresent = useMemo(
    () => [...new Set(allTxns.map((t) => t.entered_by).filter(Boolean))].sort(),
    [allTxns]
  );

  const txns = useMemo(() => {
  return allTxns.filter((t) => {
    if (typeFilter !== FILTER_ALL && t.type !== typeFilter) return false;

    if (
      categoryFilter !== FILTER_ALL &&
      t.category !== categoryFilter
    ) {
      return false;
    }

    if (
      subcategoryFilter !== FILTER_ALL &&
      t.subcategory !== subcategoryFilter
    ) {
      return false;
    }

    if (
      enteredByFilter !== FILTER_ALL &&
      t.entered_by !== enteredByFilter
    ) {
      return false;
    }

    return true;
  });
}, [
  allTxns,
  typeFilter,
  categoryFilter,
  subcategoryFilter,
  enteredByFilter
]);

const isFiltered =
  typeFilter !== FILTER_ALL ||
  categoryFilter !== FILTER_ALL ||
  subcategoryFilter !== FILTER_ALL ||
  enteredByFilter !== FILTER_ALL;
  // With no filters: show the true running balance. With filters active:
  // show the sum of whatever's currently visible, so selecting a category
  // answers "how much have we spent on this" at a glance.
  const displayBalance = useMemo(() => {
    if (!isFiltered) return currentBalance;
    return txns.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [txns, isFiltered, currentBalance]);

  const displayBalanceKind = useMemo(() => {
  if (!isFiltered) {
    return currentBalance >= 0 ? 'credit' : 'debit';
  }

  if (txns.length === 0) {
    return 'balance';
  }

  return txns[0].type;
}, [isFiltered, currentBalance, txns]);

  const activeFilterCount =
    (typeFilter !== FILTER_ALL ? 1 : 0) +
    (categoryFilter !== FILTER_ALL ? 1 : 0) +
    (subcategoryFilter !== FILTER_ALL ? 1 : 0) +
    (enteredByFilter !== FILTER_ALL ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter(FILTER_ALL);
    setCategoryFilter(FILTER_ALL);
    setEnteredByFilter(FILTER_ALL);
    setSubcategoryFilter(FILTER_ALL);
  };

  const handleTypeFilterChange = (val) => {
    setTypeFilter(val);
    if (val === 'credit') {
      setCategoryFilter(CREDIT_CATEGORY);
    } else if (val === 'withdrawal') {
      setCategoryFilter(WITHDRAWAL_CATEGORY);
    } else if (categoryFilter === CREDIT_CATEGORY || categoryFilter === WITHDRAWAL_CATEGORY) {
      setCategoryFilter(FILTER_ALL);
    }
  };

  const openAdd = () => {
    setEditingTxn(null);
    setModalVisible(true);
  };

  const openEdit = (txn) => {
    // Reflected rows (credit entries from a site, viewed inside an account)
    // aren't owned by this project — edit them from the original site instead.
    if (txn.project_id !== project.project_id) return;
    setEditingTxn(txn);
    setModalVisible(true);
  };

  const handleDelete = (txn) => {
    if (txn.project_id !== project.project_id) return;
    Alert.alert('Delete entry?', `Remove "${txn.category}${txn.detail ? ' — ' + txn.detail : ''}" — this can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTransaction(txn.txn_id, project.project_id);
            reload();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  // Which transaction types can be CREATED on this project kind.
  const availableTypes =
  isAccountProject
    ? ['withdrawal']
    : ['credit', 'debit'];
  const availableFilters = availableTypes.includes('credit') ? [{ value: FILTER_ALL, label: 'All' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  ] : [{ value: FILTER_ALL, label: 'All' },
  { value: 'credit', label: 'Credit' },
  {value: 'debit', label: 'Debit' },
  { value: 'withdrawal', label: 'Withdrawal' }];
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={type.display}>{project.project_name}</Text>
        {!!project.project_code && <Text style={styles.codeText}>{project.project_code}</Text>}
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>{isFiltered ? 'Filtered total' : 'Current balance'}</Text>
            <Money amount={displayBalance} kind={displayBalanceKind} size="amountLarge" />
          </View>

          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFiltersOpen((v) => !v)} activeOpacity={0.7}>
            <View style={styles.filterLine1} />
            <View style={styles.filterLine2} />
            <View style={styles.filterLine3} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {filtersOpen && (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <Text style={styles.filterPanelTitle}>Filters</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.filterClear}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.filterGroupLabel}>TYPE</Text>
          <View style={styles.chipRow}>
            {availableFilters.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={typeFilter === opt.value}
                onPress={() => handleTypeFilterChange(opt.value)}
              />
            ))}
          </View>

          {categoriesPresent.length > 0 && (
            <>
              <Text style={styles.filterGroupLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <FilterChip label="All" active={categoryFilter === FILTER_ALL} onPress={() => setCategoryFilter(FILTER_ALL)} />
                {categoriesPresent.map((cat) => (
                  <FilterChip key={cat} label={cat} active={categoryFilter === cat} onPress={() => setCategoryFilter(cat)} />
                ))}
              </ScrollView>
            </>
          )}

          {categoryFilter !== FILTER_ALL && availableSubcategories.length > 0 && (
             <>
              <Text style={styles.filterGroupLabel}>SUBCATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <FilterChip label="All" active={subcategoryFilter === FILTER_ALL} onPress={() => setSubcategoryFilter(FILTER_ALL)} />
                {availableSubcategories.map((subcat) => (
                  <FilterChip key={subcat} label={subcat} active={subcategoryFilter === subcat} onPress={() => setSubcategoryFilter(subcat)} />
                ))}
              </ScrollView>
            </>
          )}

          { !isAccountProject && enteredByPresent.length > 0 && (
            <>
              <Text style={styles.filterGroupLabel}>ENTERED BY</Text>
              <View style={styles.chipRow}>
                <FilterChip label="All" active={enteredByFilter === FILTER_ALL} onPress={() => setEnteredByFilter(FILTER_ALL)} />
                {enteredByPresent.map((person) => (
                  <FilterChip key={person} label={person} active={enteredByFilter === person} onPress={() => setEnteredByFilter(person)} />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.steel} />
      ) : txns.length === 0 ? (
        <View style={styles.empty}>
          <Text style={type.h2}>{allTxns.length === 0 ? 'No entries yet' : 'No entries match these filters'}</Text>
          <Text style={styles.emptySub}>
            {allTxns.length === 0 ? 'Tap + to record the first entry.' : 'Try clearing a filter above.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(item) => item.txn_id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
              ListHeaderComponent={
                isAccountProject && currentBalanceRes ? (
                  <View style={styles.openingRow}>
                    <Text style={styles.openingRowLabel}>Account balance</Text>
                    <View style={styles.openingRowRight}>
                      <Money amount={currentBalanceRes.data.current_balance} kind={currentBalanceRes.data.current_balance >= 0 ? 'credit' : 'debit'} size="amount" />
                      <Text style={styles.openingRowDate}>
                        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ) : null
              }
          renderItem={({ item }) => (
            <TransactionRow
              txn={item}
              isAccount={isAccountProject}
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
        accounts={accounts}
        availableTypes={availableTypes}
        user={user}
        editingTxn={editingTxn}
        onSaved={() => {
          setModalVisible(false);
          reload();
        }}
      />
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionModal({ visible, onClose, project, accounts, availableTypes, user, editingTxn, onSaved }) {
  const isEdit = !!editingTxn;
  const [txnType, setTxnType] = useState(editingTxn?.type || availableTypes[0]);
  const [category, setCategory] = useState(editingTxn?.category || EXPENSE_CATEGORIES[0].category);
  const [subcategory, setSubcategory] = useState(editingTxn?.subcategory || null);
  const [receivedInto, setReceivedInto] = useState(editingTxn?.received_into_project_id || accounts[0]?.project_id || null);
  const [enteredBy, setEnteredBy] = useState(editingTxn?.entered_by || accounts[0]?.project_name || null);
  const [accountId, setAccountId] = useState(editingTxn?.account_id || null);
  const [amount, setAmount] = useState(editingTxn ? String(editingTxn.amount) : '');
  const [detail, setDetail] = useState(editingTxn?.detail || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  React.useEffect(() => {
    if (visible) {
      setTxnType(editingTxn?.type || availableTypes[0]);
      setCategory(editingTxn?.category || EXPENSE_CATEGORIES[0].category);
      setSubcategory(editingTxn?.subcategory || null);
      setReceivedInto(editingTxn?.received_into_project_id || accounts[0]?.project_id || null);
      setEnteredBy(editingTxn?.entered_by || accounts[0]?.project_name || null);
      setAccountId(editingTxn?.account_id || accounts[0]?.project_id || null);
      setAmount(editingTxn ? String(editingTxn.amount) : '');
      setDetail(editingTxn?.detail || '');
      setError('');
    }
  }, [visible, editingTxn]);

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setSubcategory(null);
  };

  const isSiteCredit = project.kind === 'site' && txnType === 'credit';
  const isLoanCredit = project.kind === 'loan' && txnType === 'credit';
  const isAccountWithdrawal = project.kind === 'account' && txnType === 'withdrawal';
  const showCategoryPickers = txnType !== 'credit' && txnType !== 'withdrawal';

  const handleEnteredByAndReceivedIntoChange = (account) => {
    if (txnType === 'credit') {
      setReceivedInto(account.project_id);
    }
    setEnteredBy(account.project_name);
    setAccountId(account.project_id);
  };
  const handleSave = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (isSiteCredit && !receivedInto) {
      setError('Select which account received this payment');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: txnType,
        amount: numAmount,
        detail: detail.trim(),
        account_id: accountId,
        ...(txnType === 'credit' ? {} : { category, subcategory }),
        ...(isSiteCredit ? { received_into_project_id: receivedInto } : {}),
        ...(enteredBy ? { entered_by: enteredBy } : {})
      };

      if (isEdit) {
        await api.updateTransaction({ txn_id: editingTxn.txn_id, project_id: project.project_id, ...payload });
      } else {
        await api.addTransaction({
          project_id: project.project_id,
          project_code: project.project_code,
          date: new Date().toISOString(),
          ...payload
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

          {availableTypes.length > 1 && (
            <View style={styles.typeToggle}>
              {availableTypes.includes('credit') && (
                <TouchableOpacity
                  style={[styles.typeBtn, txnType === 'credit' && styles.typeBtnActiveCredit]}
                  onPress={() => setTxnType('credit')}
                >
                  <Text style={[styles.typeBtnText, txnType === 'credit' && styles.typeBtnTextActive]}>Credit</Text>
                </TouchableOpacity>
              )}
              {availableTypes.includes('debit') && (
                <TouchableOpacity
                  style={[styles.typeBtn, txnType === 'debit' && styles.typeBtnActiveDebit]}
                  onPress={() => setTxnType('debit')}
                >
                  <Text style={[styles.typeBtnText, txnType === 'debit' && styles.typeBtnTextActive]}>Debit</Text>
                </TouchableOpacity>
              )}
              {availableTypes.includes('withdrawal') && (
                <TouchableOpacity
                  style={[styles.typeBtn, txnType === 'withdrawal' && styles.typeBtnActiveWithdrawal]}
                  onPress={() => setTxnType('withdrawal')}
                >
                  <Text style={[styles.typeBtnText, txnType === 'withdrawal' && styles.typeBtnTextActive]}>Withdrawal</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {(isSiteCredit || isLoanCredit) && (
            <>
              <View style={styles.creditNote}>
                <Text style={styles.creditNoteText}>Category: {isLoanCredit ? LOAN_CREDIT_CATEGORY : CREDIT_CATEGORY}</Text>
              </View>
              <Text style={styles.fieldLabel}>RECEIVED INTO</Text>
              <AccountDropdown accounts={accounts} value={receivedInto} type={txnType} onChange={handleEnteredByAndReceivedIntoChange} />
            </>
          )}

          {isAccountWithdrawal && (
            <>
              <View style={styles.withdrawalNote}>
                <Text style={styles.withdrawalNoteText}>Category: {WITHDRAWAL_CATEGORY}</Text>
              </View>
            </>
          )}

          {showCategoryPickers && (
            <>
              <Text style={styles.fieldLabel}>DEBIT FROM</Text>
              <AccountDropdown accounts={accounts} type={txnType} value={accountId} onChange={handleEnteredByAndReceivedIntoChange} />
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <CategoryPicker type={txnType} value={category} onChange={handleCategoryChange} />

              <Text style={styles.fieldLabel}>SUBCATEGORY</Text>
              <SubcategoryPicker category={category} value={subcategory} onChange={setSubcategory} />
            </>
          )}

          <Text style={styles.fieldLabel}>AMOUNT (₹)</Text>
          <TextInput
            style={styles.modalInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.ink40}
          />

          <Text style={styles.fieldLabel}>DETAIL (vendor, notes)</Text>
          <TextInput
            style={styles.modalInput}
            value={detail}
            onChangeText={setDetail}
            placeholder="e.g. Rajesh Contractor"
            placeholderTextColor={colors.ink40}
          />

          {!!error && <Text style={styles.modalError}>{error}</Text>}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSave,
                { backgroundColor: txnType === 'credit' ? colors.credit : txnType === 'debit' ? colors.debit : colors.withdrawal }
              ]}
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
  header: { marginBottom: spacing.md },
  codeText: { fontSize: 12, color: colors.ink40, marginTop: 2, letterSpacing: 0.5 },
  balanceRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: colors.ink70, marginBottom: 2 },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  filterLine1: { width: 20, height: 2, borderRadius: 1, backgroundColor: colors.ink70 },
  filterLine2: { width: 14, height: 2, borderRadius: 1, backgroundColor: colors.ink70 },
  filterLine3: { width: 8, height: 2, borderRadius: 1, backgroundColor: colors.ink70 },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  filterPanel: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  filterPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterPanelTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  filterClear: { fontSize: 13, color: colors.ink40 },
  filterGroupLabel: { ...type.label, color: colors.ink40, fontSize: 10, marginBottom: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chipScroll: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    marginRight: spacing.xs
  },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterChipText: { fontSize: 12, color: colors.ink70 },
  filterChipTextActive: { color: colors.white, fontWeight: '600' },
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
  typeBtnActiveWithdrawal: { backgroundColor: colors.withdrawalBg, borderColor: colors.withdrawal },
  typeBtnText: { fontWeight: '600', fontSize: 13, color: colors.ink70 },
  typeBtnTextActive: { color: colors.ink },
  creditNote: { backgroundColor: colors.creditBg, borderRadius: radii.sm, padding: spacing.sm, marginTop: spacing.md },
  creditNoteText: { fontSize: 13, color: colors.credit, fontWeight: '600' },
  fieldLabel: { ...type.label, color: colors.ink40, marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 10 },
  modalInput: {
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  modalError: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm, backgroundColor: colors.paperDim },
  modalCancelText: { fontWeight: '600', color: colors.ink70 },
  modalSave: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: radii.sm },
  modalSaveText: { fontWeight: '700', color: colors.white },
  openingRow: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  backgroundColor: colors.paperDim, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm
},
openingRowLabel: { fontSize: 13, fontWeight: '600', color: colors.ink70 },
openingRowRight: { alignItems: 'flex-end' },
openingRowDate: { fontSize: 11, color: colors.ink40, marginTop: 2 },
  openingBalanceNote: { fontSize: 11, color: colors.ink40, marginTop: 4 },
  withdrawalNote: { backgroundColor: colors.withdrawalBg, borderRadius: radii.sm, padding: spacing.sm, marginTop: spacing.md },
  withdrawalNoteText: { fontSize: 13, color: colors.withdrawal, fontWeight: '600' },
});