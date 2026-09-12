import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import { getSubcategoriesFor } from '../api/constants/categories';

// Renders nothing if the selected category has no subcategories.
export default function SubcategoryPicker({ category, value, onChange }) {
  const subcategories = getSubcategoriesFor(category);
  if (subcategories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {subcategories.map((sub) => {
        const active = sub === value;
        return (
          <TouchableOpacity
            key={sub}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(sub)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.body, fontSize: 12, color: colors.ink70 },
  chipTextActive: { color: colors.white, fontWeight: '600' }
});