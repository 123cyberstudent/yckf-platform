// src/screens/LocationShareScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { COLORS, SPACING, TYPOGRAPHY, LAYOUT, ACTIVE_CONTACTS } from '../utils/constants';
import LocationService from '../services/LocationService';
import WhatsAppService from '../services/WhatsAppService';
import { LocationData, LocationAddress } from '../types';
import * as Location from 'expo-location';

const LocationShareScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [lastAddress, setLastAddress] = useState<LocationAddress | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await Location.getForegroundPermissionsAsync();
        console.log('Permission status on mount:', p);
        if (!p.granted && !p.canAskAgain) {
          // Permission permanently denied — prompt user to open settings
          Alert.alert(
            'Location permission blocked',
            'Location permission is blocked. Please open app settings to enable location access for this app.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      } catch (e) {
        console.warn('Permission check failed on mount', e);
      }
    })();
  }, []);

  const fetchAndShareCurrentLocation = async () => {
    try {
      setLoading(true);

      const loc = await LocationService.getCurrentLocation();
      if (!loc) {
        // getCurrentLocation already alerts about permission; just return
        return;
      }

      setLastLocation(loc);

      const addr = await LocationService.getAddressFromLocation(loc);
      setLastAddress(addr || null);

      const message = LocationService.formatLocationForSharing(loc, addr || undefined);

      // Use your existing WhatsApp service — ensure it returns { success, error? }
      const result = await WhatsAppService.sendMessage(ACTIVE_CONTACTS.whatsapp, message);

      if (result?.success) {
        Alert.alert('Success', 'Location shared successfully via WhatsApp!');
      } else {
        Alert.alert('Error', result?.error || 'Failed to share location via WhatsApp');
      }
    } catch (err: any) {
      console.error('Share current location failed', err);
      Alert.alert('Error', err?.message || 'Failed to share location');
    } finally {
      setLoading(false);
    }
  };

  const shareViaEmail = async () => {
    try {
      setLoading(true);

      const loc = await LocationService.getCurrentLocation();
      if (!loc) return;

      setLastLocation(loc);
      const addr = await LocationService.getAddressFromLocation(loc);
      setLastAddress(addr || null);

      const message = LocationService.formatLocationForSharing(loc, addr || undefined);
      const encoded = encodeURIComponent(message);

      const mailto = `mailto:${ACTIVE_CONTACTS.email}?subject=${encodeURIComponent('YCKF - Current Location')}&body=${encoded}`;

      const canOpenMail = await Linking.canOpenURL(mailto);
      if (canOpenMail) {
        await Linking.openURL(mailto);
        Alert.alert('Success', 'Email client opened. Please send the email.');
      } else {
        Alert.alert('Error', 'Unable to open email client on this device.');
      }
    } catch (err: any) {
      console.error('Share via email failed', err);
      Alert.alert('Error', err?.message || 'Failed to share location');
    } finally {
      setLoading(false);
    }
  };

  const openLiveShareInstructions = async () => {
    Alert.alert(
      '📍 Share Live Location',
      'To share live location:\n\n' +
        '1. Open WhatsApp\n' +
        '2. Go to YCKF chat\n' +
        '3. Tap attachment (📎) icon\n' +
        '4. Select "Location"\n' +
        '5. Choose "Share live location"\n' +
        '6. Select duration (15 min / 1 hr / 8 hrs)\n\n' +
        'Would you like to open WhatsApp now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open WhatsApp',
          onPress: async () => {
            try {
              const whatsappUrl = `whatsapp://send?phone=${ACTIVE_CONTACTS.whatsapp}`;
              const can = await Linking.canOpenURL(whatsappUrl);
              if (can) {
                await Linking.openURL(whatsappUrl);
              } else {
                Alert.alert('Error', 'WhatsApp is not installed on this device.');
              }
            } catch (err) {
              console.error('Open WhatsApp failed', err);
              Alert.alert('Error', 'Failed to open WhatsApp.');
            }
          },
        },
      ]
    );
  };

  const refreshLocation = async () => {
    try {
      setLoading(true);

      const loc = await LocationService.getCurrentLocation();
      if (!loc) return;

      setLastLocation(loc);
      const addr = await LocationService.getAddressFromLocation(loc);
      setLastAddress(addr || null);

      Alert.alert('Location Updated', 'Your current location has been captured.');
    } catch (err: any) {
      console.error('Refresh location failed', err);
      Alert.alert('Error', err?.message ?? 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={60} color={COLORS.primary} />
        <Text style={styles.title}>Share Your Location</Text>
        <Text style={styles.description}>
          Quickly share your current GPS coordinates or learn how to share live location with YCKF.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Quick Share</Text>

        <View style={styles.buttonRow}>
          <Button
            title="Share via WhatsApp"
            onPress={fetchAndShareCurrentLocation}
            icon="logo-whatsapp"
            fullWidth
            loading={loading}
            disabled={loading}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Share via Email"
            onPress={shareViaEmail}
            icon="mail"
            variant="secondary"
            fullWidth
            disabled={loading}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="📡 How to Share Live Location"
            onPress={openLiveShareInstructions}
            variant="outline"
            fullWidth
            disabled={loading}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Refresh Location"
            onPress={refreshLocation}
            icon="refresh"
            variant="ghost"
            fullWidth
            loading={loading}
            disabled={loading}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📌 Current Location</Text>
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : lastLocation ? (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="navigate" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Coordinates</Text>
            </View>
            <Text style={styles.infoText}>
              {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
            </Text>

            {lastAddress?.name && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="business" size={20} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>Place</Text>
                </View>
                <Text style={styles.infoText}>{lastAddress.name}</Text>
              </>
            )}

            {lastAddress?.city && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>City</Text>
                </View>
                <Text style={styles.infoText}>{lastAddress.city}</Text>
              </>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="radio-button-on" size={20} color={COLORS.secondary} />
              <Text style={styles.infoLabel}>Accuracy</Text>
            </View>
            <Text style={styles.infoTextSmall}>±{Math.round(lastLocation.accuracy || 0)} meters</Text>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={COLORS.text.secondary} />
              <Text style={styles.infoLabel}>Captured At</Text>
            </View>
            <Text style={styles.infoTextSmall}>
              {new Date(lastLocation.timestamp || Date.now()).toLocaleString()}
            </Text>

            <TouchableOpacity
              style={styles.mapsButton}
              onPress={() => {
                const url = `https://maps.google.com/?q=${lastLocation.latitude},${lastLocation.longitude}`;
                Linking.openURL(url).catch((e) => {
                  console.error('Open maps failed', e);
                  Alert.alert('Error', 'Unable to open maps.');
                });
              }}
            >
              <Ionicons name="map" size={20} color={COLORS.primary} />
              <Text style={styles.mapsButtonText}>View on Google Maps</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={60} color={COLORS.text.light} />
            <Text style={styles.emptyText}>No location captured yet</Text>
            <Text style={styles.emptySubtext}>Tap "Refresh Location" or "Share via WhatsApp" to get started</Text>
          </View>
        )}
      </View>

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark" size={24} color={COLORS.secondary} />
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>Privacy Notice</Text>
          <Text style={styles.privacyText}>
            Your location data is only shared when you explicitly tap the share buttons above. YCKF does not track or store your location without your consent.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xxl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  description: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    marginBottom: SPACING.md,
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSizes.md,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  infoText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  infoTextSmall: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginBottom: SPACING.sm,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: LAYOUT.borderRadius.md,
  },
  mapsButtonText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xxxl,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SPACING.lg,
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: SPACING.sm,
    color: COLORS.text.light,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    textAlign: 'center',
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.secondary}15`,
    padding: SPACING.lg,
    borderRadius: LAYOUT.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    marginTop: SPACING.lg,
  },
  privacyContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  privacyTitle: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  privacyText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default LocationShareScreen;
