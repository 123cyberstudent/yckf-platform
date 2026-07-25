// src/components/case/CaseUpdateItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, CASE_STATUS } from '../../utils/constants';
import { CaseUpdate } from '../../types';

interface CaseUpdateItemProps {
  update: CaseUpdate;
  isLast?: boolean;
}

const CaseUpdateItem: React.FC<CaseUpdateItemProps> = ({ update, isLast = false }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case CASE_STATUS.RECEIVED:
        return '#3b82f6';
      case CASE_STATUS.UNDER_REVIEW:
        return COLORS.accent;
      case CASE_STATUS.INVESTIGATING:
        return '#f97316';
      case CASE_STATUS.RESOLVED:
        return COLORS.secondary;
      case CASE_STATUS.CLOSED:
        return COLORS.text.secondary;
      default:
        return COLORS.primary;
    }
  };

  const statusColor = getStatusColor(update.status);

  return (
    <View style={styles.container}>
      {/* Timeline Line */}
      {!isLast && <View style={[styles.timelineLine, { backgroundColor: `${statusColor}30` }]} />}

      {/* Timeline Dot */}
      <View style={[styles.dot, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
        <View style={[styles.dotInner, { backgroundColor: statusColor }]} />
      </View>

      {/* Update Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.date}>
            {update.date.toLocaleDateString()} at{' '}
            {update.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={[styles.card, { borderLeftColor: statusColor }]}>
          <Text style={styles.message}>{update.message}</Text>
          
          <View style={styles.footer}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.text.light} />
            <Text style={styles.updatedBy}>Updated by {update.updatedBy}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: SPACING.lg,
    position: 'relative',
  },

  // Timeline
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: 0,
    width: 2,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    zIndex: 1,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Content
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  date: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.light,
    fontWeight: TYPOGRAPHY.fontWeights.medium as TextStyle['fontWeight'],
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.md,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updatedBy: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.text.light,
    marginLeft: SPACING.xs,
  },
});

export default CaseUpdateItem;
