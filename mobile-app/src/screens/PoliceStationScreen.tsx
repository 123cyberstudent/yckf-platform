// src/screens/PoliceStationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Services
import LocationService from '../services/LocationService';
import WhatsAppService from '../services/WhatsAppService';
import authService from '../services/AuthService';

// Data
import { POLICE_STATIONS, PoliceStation } from '../data/policeStations';

// Utils
import {
  findNearestStation,
  getStationsByDistance,
  openGoogleMapsDirections,
  callStation,
  formatDistance,
  searchStations,
} from '../utils/stationUtils';
import {
  COLORS,
  SPACING,
  APP_CONFIG,
  ERROR_MESSAGES,
} from '../utils/constants';

// Components
import Button from '../components/common/Button';

interface StationWithDistance {
  station: PoliceStation;
  distance: number;
}

const PoliceStationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearestStation, setNearestStation] = useState<StationWithDistance | null>(null);
  const [nearbyStations, setNearbyStations] = useState<StationWithDistance[]>([]);
  const [allStations, setAllStations] = useState<PoliceStation[]>(POLICE_STATIONS);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showNearby, setShowNearby] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchStations(POLICE_STATIONS, searchQuery);
      setAllStations(filtered);
    } else {
      setAllStations(POLICE_STATIONS);
    }
  }, [searchQuery]);

  const handleFindNearest = async () => {
    setLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();

      if (!location) {
        Alert.alert('Error', ERROR_MESSAGES.LOCATION_PERMISSION);
        setLoading(false);
        return;
      }

      let latitude: number;
      let longitude: number;

      if ('coords' in location && location.coords) {
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } else if ('latitude' in location && 'longitude' in location) {
        latitude = location.latitude;
        longitude = location.longitude;
      } else {
        Alert.alert('Error', 'Invalid location format received. Please try again.');
        setLoading(false);
        return;
      }

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        Alert.alert('Error', 'Invalid location coordinates. Please try again.');
        setLoading(false);
        return;
      }

      setUserLocation({ latitude, longitude });

      const nearest = findNearestStation(latitude, longitude, POLICE_STATIONS);

      if (nearest) {
        const MAX_REASONABLE_DISTANCE_KM = 500;

        if (nearest.distance > MAX_REASONABLE_DISTANCE_KM) {
          Alert.alert(
            '⚠️ Out of Service Area',
            `You appear to be ${formatDistance(nearest.distance)} away from the nearest police station in our database.\n\n` +
            `This app currently serves Ghana only.\n\n` +
            `Nearest station found:\n${nearest.station.name}\n${nearest.station.region} Region\n\n` +
            `Emergency Tip: Please dial your local emergency number:\n` +
            `• Ghana: 191\n` +
            `• Nigeria: 112\n` +
            `• USA/Canada: 911\n` +
            `• UK/EU: 112`,
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'View Anyway',
                style: 'default',
                onPress: () => {
                  setNearestStation(nearest);
                  const nearby = getStationsByDistance(
                    latitude,
                    longitude,
                    POLICE_STATIONS,
                    APP_CONFIG.STATION_SEARCH_RADIUS_KM
                  ).slice(0, APP_CONFIG.MAX_NEARBY_STATIONS);
                  setNearbyStations(nearby);
                },
              },
            ]
          );
          return;
        }

        setNearestStation(nearest);

        const nearby = getStationsByDistance(
          latitude,
          longitude,
          POLICE_STATIONS,
          APP_CONFIG.STATION_SEARCH_RADIUS_KM
        ).slice(0, APP_CONFIG.MAX_NEARBY_STATIONS);

        setNearbyStations(nearby);

        Alert.alert(
          '✅ Station Found',
          `${nearest.station.name}\n${nearest.station.region} Region\n\nDistance: ${formatDistance(nearest.distance)}`,
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Get Directions',
              style: 'default',
              onPress: () => handleGetDirections(nearest.station),
            },
          ]
        );
      } else {
        Alert.alert('Error', ERROR_MESSAGES.STATION_NOT_FOUND);
      }
    } catch (error) {
      console.error('Error finding nearest station:', error);
      Alert.alert('Location Error', ERROR_MESSAGES.LOCATION_PERMISSION);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      const nearby = getStationsByDistance(
        userLocation.latitude,
        userLocation.longitude,
        POLICE_STATIONS,
        APP_CONFIG.STATION_SEARCH_RADIUS_KM
      ).slice(0, APP_CONFIG.MAX_NEARBY_STATIONS);
      setNearbyStations(nearby);
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleGetDirections = async (station: PoliceStation) => {
    try {
      if (!userLocation) {
        Alert.alert(
          'Getting Your Location',
          'Please wait while we fetch your current location...',
          [{ text: 'OK' }]
        );

        const location = await LocationService.getCurrentLocation();
        
        if (!location) {
          Alert.alert(
            'Location Required',
            'We need your location to provide directions. Please enable location services and try again.',
            [{ text: 'OK' }]
          );
          return;
        }

        let latitude: number;
        let longitude: number;

        if ('coords' in location && location.coords) {
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        } else if ('latitude' in location && 'longitude' in location) {
          latitude = location.latitude;
          longitude = location.longitude;
        } else {
          Alert.alert('Error', 'Invalid location format received. Please try again.');
          return;
        }

        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
          Alert.alert('Error', 'Invalid location coordinates. Please try again.');
          return;
        }

        setUserLocation({ latitude, longitude });
        await openGoogleMapsDirections(station, latitude, longitude);
      } else {
        await openGoogleMapsDirections(
          station,
          userLocation.latitude,
          userLocation.longitude
        );
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open Google Maps. Please make sure Google Maps is installed on your device.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCall = async (phoneNumber: string) => {
    Alert.alert(
      'Call Police Station',
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          style: 'default',
          onPress: () => callStation(phoneNumber),
        },
      ]
    );
  };

const handleWhatsApp = async (station: PoliceStation) => {
  try {
    const userData = await authService.getCurrentUser();
    const userEmail = userData?.email || 'Not available';
    const userPhone = (userData as any)?.phoneNumber || (userData as any)?.phone_number || 'Not available';
    
    const userLoc = userLocation || await LocationService.getCurrentLocation();
    
    let locationInfo = '';
    
    if (userLoc) {
      let latitude: number;
      let longitude: number;

      if ('coords' in userLoc && userLoc.coords) {
        latitude = userLoc.coords.latitude;
        longitude = userLoc.coords.longitude;
      } else if ('latitude' in userLoc && 'longitude' in userLoc) {
        latitude = userLoc.latitude;
        longitude = userLoc.longitude;
      } else {
        latitude = 0;
        longitude = 0;
      }

      if (latitude && longitude) {
        const address = await LocationService.getAddressFromLocation({ latitude, longitude });
        
        locationInfo = `\n\n📍 MY CURRENT LOCATION:\n`;
        locationInfo += `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n`;
        
        if (address?.name) {
          locationInfo += `Place: ${address.name}\n`;
        }
        if (address?.city) {
          locationInfo += `City: ${address.city}\n`;
        }
        
        locationInfo += `\nView on Google Maps:\nhttps://maps.google.com/?q=${latitude},${longitude}\n`;
      }
    }

    const message = `🚨 URGENT POLICE ASSISTANCE NEEDED\n\n` +
      `👤 REPORTER INFORMATION:\n` +
      `Email: ${userEmail}\n` +
      `Phone: ${userPhone}\n\n` +
      `Contacting Station: ${station.name}\n` +
      `Station Location: ${station.address}, ${station.city}\n` +
      `Region: ${station.region}\n` +
      `${locationInfo}\n` +
      `⚠️ Emergency alert: Police assistance required urgently. Please respond immediately and use the provided coordinates or location link to navigate to the scene.\n\n` +
      `Sent via YCKF Mobile App`;

    const result = await WhatsAppService.sendMessage(
      station.phoneNumber,
      message
    );

    if (!result.success) {
      Alert.alert('Error', 'Failed to open WhatsApp. Please ensure WhatsApp is installed.');
    }
  } catch (error) {
    console.error('WhatsApp error:', error);
    Alert.alert('Error', 'Could not open WhatsApp');
  }
};

  const renderStationCard = (item: StationWithDistance, isNearest: boolean = false) => {
    const { station, distance } = item;

    return (
      <View
        key={station.id}
        style={[
          styles.stationCard,
          isNearest && styles.nearestStationCard,
        ]}
      >
        {isNearest && (
          <View style={styles.nearestBadge}>
            <Ionicons name="location" size={16} color={COLORS.surface} />
            <Text style={styles.nearestBadgeText}>NEAREST</Text>
          </View>
        )}

        <View style={styles.stationHeader}>
          <View style={styles.stationIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.stationInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationDivision}>{station.division}</Text>
            <Text style={styles.stationRegion}>{station.region} Region</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
          </View>
        </View>

        <View style={styles.stationDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.detailText}>{station.address}, {station.city}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.detailText}>{station.phoneNumber}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleGetDirections(station)}
          >
            <Ionicons name="navigate" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCall(station.phoneNumber)}
          >
            <Ionicons name="call" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={() => handleWhatsApp(station)}
          >
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAllStationCard = (station: PoliceStation) => {
    return (
      <View key={station.id} style={styles.stationCard}>
        <View style={styles.stationHeader}>
          <View style={styles.stationIcon}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.stationInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationDivision}>{station.division}</Text>
            <Text style={styles.stationRegion}>{station.region} Region</Text>
          </View>
        </View>

        <View style={styles.stationDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.detailText}>{station.address}, {station.city}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.detailText}>{station.phoneNumber}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => handleGetDirections(station)}
          >
            <Ionicons name="navigate" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCall(station.phoneNumber)}
          >
            <Ionicons name="call" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={() => handleWhatsApp(station)}
          >
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.surface} />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Police Station</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <Ionicons name="warning" size={24} color={COLORS.error} />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Hotline</Text>
            <Text style={styles.emergencyNumber}>Call {APP_CONFIG.EMERGENCY_HOTLINE}</Text>
          </View>
        </View>

        {/* Find Nearest Button */}
        <View style={styles.section}>
          <Button
            title="Find Nearest Police Station"
            onPress={handleFindNearest}
            icon="location"
            loading={loading}
            fullWidth
            variant="primary"
          />
          <Text style={styles.helperText}>
            📍 We'll use your GPS to find the closest police station
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.section}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, area, region, or division..."
              placeholderTextColor={COLORS.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nearest Station */}
        {nearestStation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearest Station</Text>
            {renderStationCard(nearestStation, true)}
          </View>
        )}

        {/* Nearby Stations */}
        {nearbyStations.length > 1 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowNearby(!showNearby)}
            >
              <Text style={styles.sectionTitle}>
                Nearby Stations ({nearbyStations.length - 1})
              </Text>
              <Ionicons
                name={showNearby ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={COLORS.text.primary}
              />
            </TouchableOpacity>

            {showNearby &&
              nearbyStations.slice(1).map((item) => renderStationCard(item))}
          </View>
        )}

        {/* All Stations List */}
        {!nearestStation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              All Stations ({allStations.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              {searchQuery
                ? `Found ${allStations.length} stations matching "${searchQuery}"`
                : 'Browse all police stations across Ghana'}
            </Text>

            {allStations.map((station) => renderAllStationCard(station))}
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.surface,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emergencyBanner: {
    backgroundColor: COLORS.error + '15',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  emergencyContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  emergencyNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.error,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  stationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nearestStationCard: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  nearestBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  nearestBadgeText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  stationDivision: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  stationRegion: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stationDetails: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    minHeight: 44,
  },
  directionsButton: {
    backgroundColor: COLORS.primary,
  },
  callButton: {
    backgroundColor: COLORS.secondary,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    height: SPACING.xl,
  },
});
export default PoliceStationScreen;
