// src/components/common/LocationPicker.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT } from '../../utils/constants';
import { LocationData } from '../../types';

interface LocationPickerProps {
  label?: string;
  location: LocationData | null;
  onLocationCapture: () => void;
  isCapturing?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  label = 'GPS Location',
  location,
  onLocationCapture,
  isCapturing = false,
}) => {
  const formatCoordinates = (loc: LocationData): string => {
    return `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
  };

  const getAccuracyText = (accuracy?: number): string => {
    if (accuracy === undefined || accuracy === null) return '';
    return ` (±${Math.round(accuracy)}m)`;
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {location && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary} />
              <Text style={styles.statusText}>Captured</Text>
            </View>
          )}
        </View>
      )}

      {/* Location Display */}
      {location ? (
        <View style={styles.locationContainer}>
          <View style={styles.locationContent}>
            <Ionicons
              name="location"
              size={24}
              color={COLORS.secondary}
              style={styles.locationIcon}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.coordinatesText}>{formatCoordinates(location)}</Text>
              <Text style={styles.accuracyText}>Accuracy{getAccuracyText(location.accuracy)}</Text>
              {location.timestamp && (
                <Text style={styles.timestampText}>
                  Captured at {new Date(location.timestamp).toLocaleTimeString()}
                </Text>
              )}
            </View>
          </View>

          {/* Recapture Button */}
          <TouchableOpacity
            style={styles.recaptureButton}
            onPress={onLocationCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Capture Button
        <TouchableOpacity
          style={styles.captureButton}
          onPress={onLocationCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.captureIcon} />
              <Text style={styles.captureButtonText}>Capturing Location...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="locate-outline"
                size={24}
                color={COLORS.primary}
                style={styles.captureIcon}
              />
              <Text style={styles.captureButtonText}>Capture GPS Location</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Info Text */}
      <Text style={styles.infoText}>
        {location
          ? 'Your GPS location has been captured and will be included in the report.'
          : 'Tap to capture your current GPS coordinates for the report.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },

  // Label
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: (TYPOGRAPHY.fontWeights?.medium as unknown as string) || '500',
    color: COLORS.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.secondary,
    fontWeight: (TYPOGRAPHY.fontWeights?.medium as unknown as string) || '500',
    marginLeft: 4,
  },

  // Location Display
  locationContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: SPACING.md,
  },
  locationInfo: {
    flex: 1,
  },
  coordinatesText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: (TYPOGRAPHY.fontWeights?.semibold as unknown as string) || '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  accuracyText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  timestampText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.text.light,
  },
  recaptureButton: {
    padding: SPACING.sm,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: LAYOUT.borderRadius.sm,
  },

  // Capture Button
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  captureIcon: {
    marginRight: SPACING.sm,
  },
  captureButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: (TYPOGRAPHY.fontWeights?.medium as unknown as string) || '500',
    color: COLORS.primary,
  },

  // Info
  infoText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.light,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LocationPicker;