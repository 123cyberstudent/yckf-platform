// src/components/evidence/EvidenceItemCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../../utils/constants';
import { EvidenceItem } from '../../types';

interface EvidenceItemCardProps {
  item: EvidenceItem;
  onPress: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

const EvidenceItemCard: React.FC<EvidenceItemCardProps> = ({
  item,
  onPress,
  onDelete,
  onSubmit,
  isSelected = false,
  isSelectionMode = false,
}) => {
  // safe destructuring with defaults - Fixed TypeScript errors
  const {
    type = 'report',
    title,
    description,
  } = item || {};
  
  // Access optional properties safely with type assertion
  const filename = (item as any)?.filename;
  const thumbnail = (item as any)?.thumbnail;
  const date = (item as any)?.date;

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'report':
        return 'document-text';
      case 'photo':
        return 'image';
      case 'document':
        return 'document';
      case 'audio':
        return 'mic';
      case 'video':
        return 'videocam';
      default:
        return 'file-tray';
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'report':
        return COLORS.primary;
      case 'photo':
        return COLORS.secondary;
      case 'document':
        return (COLORS as any).accent || COLORS.primary;
      case 'audio':
        return '#8b5cf6';
      case 'video':
        return '#ef4444';
      default:
        return COLORS.text.secondary;
    }
  };

  const typeIcon = getTypeIcon(type);
  const typeColor = getTypeColor(type);

  // Format date safely
  const formattedDate = (() => {
    if (!date) return null;
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString();
    } catch {
      return null;
    }
  })();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Left: thumbnail or icon */}
      <View style={styles.left}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: `${typeColor}15` }]}>
            <Ionicons name={typeIcon as any} size={20} color={typeColor} />
          </View>
        )}
      </View>

      {/* Middle: title / meta */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? filename ?? 'Untitled evidence'}
        </Text>

        {formattedDate ? (
          <Text style={styles.meta} numberOfLines={1}>
            {formattedDate}
          </Text>
        ) : null}

        {description ? (
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Right: actions */}
      <View style={styles.actions}>
        {isSelectionMode ? (
          <View style={styles.checkbox}>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            ) : (
              <Ionicons name="ellipse-outline" size={24} color={COLORS.text.secondary} />
            )}
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.iconButton} onPress={onSubmit} testID="evidence-submit">
              <Ionicons name="cloud-upload" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={onDelete} testID="evidence-delete">
              <Ionicons name="trash" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: (LAYOUT && LAYOUT.borderRadius && LAYOUT.borderRadius.md) || 10,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    minHeight: 70, // Reduced for better mobile fit
    ...(LAYOUT?.shadows?.small || {}),
  },
  selected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  left: {
    marginRight: SPACING.sm,
  },
  thumbnail: {
    width: 45,
    height: 45,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  iconWrap: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes?.sm ?? 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  meta: {
    fontSize: TYPOGRAPHY.fontSizes?.xs ?? 11,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSizes?.xs ?? 11,
    color: COLORS.text.secondary,
  },

  actions: {
    marginLeft: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 4,
    borderRadius: 6,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
});

export default EvidenceItemCard;