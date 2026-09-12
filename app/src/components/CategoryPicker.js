import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import { EXPENSE_CATEGORIES } from '../api/constants/categories';

const getCategoriesByType = (transactionType) => {
  switch (transactionType) {
    case 'credit':
      return EXPENSE_CATEGORIES.filter(
        (category) => category.category === 'Client Payment'
      );

    case 'withdrawal':
      return EXPENSE_CATEGORIES.filter(
        (category) => category.category === 'Personal Work'
      );

    default:
      return EXPENSE_CATEGORIES.filter(
        (category) =>
          category.category !== 'Client Payment' &&
          category.category !== 'Personal Work'
      );
  }
};

export default function CategoryPicker({
  type: transactionType,
  value,
  onChange,
}) {
  const categories = getCategoriesByType(transactionType);
  const isSingleCategory = categories.length === 1;

  return (
    <View style={styles.wrap}>
      {categories.map((category) => {
        const isActive =
          isSingleCategory || category.category === value;

        return (
          <TouchableOpacity
            key={category.category}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onChange(category.category)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                isActive && styles.chipTextActive
              ]}
            >
              {category.category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper
  },
  chipActive: {
    backgroundColor: colors.steel,
    borderColor: colors.steel
  },
  chipText: {
    ...type.body,
    fontSize: 12,
    color: colors.ink70
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600'
  }
});