import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAction } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../../utils/constants';

interface QuickActionCardProps {
  action: QuickAction;
  onPress: () => void;
  loading?: boolean;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - SPACING.lg * 2 - SPACING.md) / 2;

/**
 * Ensure we produce a valid React Native fontWeight string.
 * If TYPOGRAPHY.fontWeights.semibold is missing or invalid, fallback to '600'.
 */
const ALLOWED_FONT_WEIGHTS = [
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
] as const;

function safeFontWeight(value: unknown): TextStyle['fontWeight'] {
  if (typeof value === 'string' && ALLOWED_FONT_WEIGHTS.includes(value as any)) {
    return value as TextStyle['fontWeight'];
  }
  // if value is number but can be converted, convert to string if it's an allowed numeric string
  if (typeof value === 'number') {
    const s = String(value);
    if (ALLOWED_FONT_WEIGHTS.includes(s as any)) return s as TextStyle['fontWeight'];
  }
  return '600';
}

const semiboldFW = safeFontWeight(TYPOGRAPHY.fontWeights?.semibold);

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  action,
  onPress,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: action.color },
        action.disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={action.disabled || loading}
      activeOpacity={0.8}
    >
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
        {loading ? (
          <ActivityIndicator size="small" color={action.color} />
        ) : (
          <Ionicons
            name={action.icon as keyof typeof Ionicons.glyphMap}
            size={28}
            color={action.color}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {action.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {action.subtitle}
        </Text>
      </View>

      {/* Action Indicator */}
      <View style={styles.actionIndicator}>
        <Ionicons name="chevron-forward" size={17} color={COLORS.text.light} />
      </View>

      {/* Loading Overlay */}
      {loading && <View style={styles.loadingOverlay} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 0.7,
    ...LAYOUT.shadows?.medium,
    position: 'relative',
  },
  disabled: {
    opacity: 0.6,
  },

  // Icon
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  // Content
  content: {
    flex: 1,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: semiboldFW,
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // Action Indicator
  actionIndicator: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: LAYOUT.borderRadius.lg,
  },
});

export default QuickActionCard;