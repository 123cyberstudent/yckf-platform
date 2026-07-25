// src/components/case/CaseStatusCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, CASE_STATUS } from '../../utils/constants';

interface CaseStatusCardProps {
  status: string;
  statusLabel: string;
  lastUpdated: Date;
}

const CaseStatusCard: React.FC<CaseStatusCardProps> = ({
  status,
  statusLabel,
  lastUpdated,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case CASE_STATUS.RECEIVED:
        return 'checkmark-circle';
      case CASE_STATUS.UNDER_REVIEW:
        return 'eye';
      case CASE_STATUS.INVESTIGATING:
        return 'search';
      case CASE_STATUS.RESOLVED:
        return 'checkmark-done-circle';
      case CASE_STATUS.CLOSED:
        return 'close-circle';
      default:
        return 'information-circle';
    }
  };

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

  const statusColor = getStatusColor(status);

  return (
    <View style={[styles.container, { borderLeftColor: statusColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${statusColor}15` }]}>
        <Ionicons
          name={getStatusIcon(status) as any}
          size={32}
          color={statusColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Current Status</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        <Text style={styles.updated}>
          Last updated: {lastUpdated.toLocaleDateString()} at{' '}
          {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    ...LAYOUT.shadows.medium,
  },

  // Icon
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  status: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  updated: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.text.light,
  },
});

export default CaseStatusCard;
