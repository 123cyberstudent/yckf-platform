import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../../utils/constants';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  onPress?: () => void;
  subtitle?: string;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - SPACING.lg * 2 - SPACING.md) / 2;

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  onPress,
  subtitle,
}) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.container, { borderTopColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={color}
          />
        </View>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={COLORS.text.light}
          />
        )}
      </View>

      {/* Value */}
      <Text style={styles.value}>{value}</Text>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.lg,
    borderTopWidth: 3,
    ...LAYOUT.shadows.small,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  value: {
    fontSize: 29,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 32,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.text.light,
    marginTop: 4,
    lineHeight: 16,
  },
});
export default StatsCard;

