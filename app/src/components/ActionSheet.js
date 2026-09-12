import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';

/**
 * actions: [{ label, onPress, destructive? }]
 * Always renders a trailing Cancel action automatically.
 */
export default function ActionSheet({ visible, title, actions, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {actions.map((action, i) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.row, i === 0 && !title && styles.rowFirst]}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              activeOpacity={0.6}
            >
              <Text style={[styles.rowText, action.destructive && styles.rowTextDestructive]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelRow} onPress={onClose} activeOpacity={0.6}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,46,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg
  },
  title: {
    ...type.label,
    color: colors.ink40,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  rowFirst: { borderTopWidth: 0 },
  rowText: { ...type.h2, color: colors.steel, textAlign: 'center' },
  rowTextDestructive: { color: colors.danger },
  cancelRow: {
    paddingVertical: 14,
    marginTop: spacing.sm,
    backgroundColor: colors.paperDim,
    borderRadius: radii.sm
  },
  cancelText: { ...type.h2, color: colors.ink70, textAlign: 'center' }
});