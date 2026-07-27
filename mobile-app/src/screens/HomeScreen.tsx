// ============================================
// FILE: src/screens/HomeScreen.tsx
// Updated with Modern Popup Modals
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

// Services
import LocationService from '../services/LocationService';
import EmergencySOSService from '../services/EmergencySOSService';
import WhatsAppService from '../services/WhatsAppService';
import AuthService from '../services/AuthService';
import { PremiumAccessService } from '../services/PremiumAccessService';

// Utils
import {
  COLORS,
  SPACING,
  SCREEN_NAMES,
  QUICK_ACTIONS,
  APP_CONFIG,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES
} from '../utils/constants';

// Types
import { LocationData } from '../types';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'free' | 'paid'>('free');
  const [imageError, setImageError] = useState(false);

  // Backend Premium Status
  const [isPremium, setIsPremium] = useState(false);
  const [premiumReason, setPremiumReason] = useState<string>('');
  const [premiumExpiry, setPremiumExpiry] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ⭐ NEW - Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>('');

  useEffect(() => {
    // Check network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected || false);
    });

    return () => unsubscribe();
  }, []);

  // Check auth and premium status when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      checkAuthAndPremiumStatus();
    }, [])
  );

  // Check Authentication & Premium Status from Backend
  const checkAuthAndPremiumStatus = async () => {
    try {
      // Check if user is logged in
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Check premium access from backend
        const access = await PremiumAccessService.checkPremiumAccess(true);
        setIsPremium(access.premium);
        setPremiumReason(access.reason);
        setPremiumExpiry(access.expiresAt || null);

        console.log('✅ Premium Status:', {
          premium: access.premium,
          reason: access.reason,
          expiresAt: access.expiresAt
        });
      } else {
        setIsPremium(false);
        setPremiumReason('none');
        setPremiumExpiry(null);
      }
    } catch (error) {
      console.error('❌ Failed to check auth/premium status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAuthAndPremiumStatus();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleQuickAction = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'emergency_report':
          Alert.alert(
            'Emergency Hotline',
            'Choose emergency number to call:',
            [
              {
                text: 'Call 119',
                onPress: () => Linking.openURL('tel:119')
              },
              {
                text: 'Call +233505313578',
                onPress: () => Linking.openURL('tel:+233505313578')
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
          break;

        case 'find_police_station':
          navigation.navigate(SCREEN_NAMES.POLICE_STATION as never);
          break;

        case 'find_fire_station':
          navigation.navigate(SCREEN_NAMES.FIRE_STATION as never);
          break;

        case 'report_cybercrime':
          navigation.navigate(SCREEN_NAMES.CYBERCRIME_REPORT as never);
          break;

        case 'contact_yckf':
          navigation.navigate(SCREEN_NAMES.CONTACT_FORM as never);
          break;

        case 'book_expert':
          navigation.navigate('SelectSpecialist' as never);
          break;

        case 'share_location':
          await handleShareCurrentLocation();
          break;

        case 'live_location':
          await handleShareLiveLocation();
          break;

        default:
          console.log('Unknown action:', actionId);
      }
    } catch (error) {
      console.error('Action failed:', error);
      Alert.alert('Error', 'Failed to perform action. Please try again.');
    }
  };

  const handleShareCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        await WhatsAppService.shareCurrentLocation(location);
        Alert.alert('Success', SUCCESS_MESSAGES.LOCATION_SHARED);
      }
    } catch (error) {
      console.error('Location sharing failed:', error);
      Alert.alert('Error', ERROR_MESSAGES.LOCATION_PERMISSION);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleShareLiveLocation = async () => {
    try {
      await WhatsAppService.shareLiveLocation();
      Alert.alert(
        'Live Location Sharing',
        'WhatsApp will open. Please start sharing your live location in the chat with YCKF.'
      );
    } catch (error) {
      console.error('Live location sharing failed:', error);
      Alert.alert('Error', 'Failed to open WhatsApp for live location sharing.');
    }
  };

  // ⭐ UPDATED - Premium Action Handler with Modern Modal
  const handlePremiumAction = async (action: string) => {
    // Check if user is logged in first
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to access premium features.',
        [
          { text: 'Login', onPress: () => navigation.navigate('Login' as never) },
          { text: 'Register', onPress: () => navigation.navigate('Register' as never) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Check premium access from backend
    const access = await PremiumAccessService.checkPremiumAccess(true);

    if (access.premium) {
      // User has premium access - allow action
      switch (action) {
        case 'Emergency SOS':
          navigation.navigate(SCREEN_NAMES.EMERGENCY_REPORT as never);
          break;
        case 'Find Police Station':
          navigation.navigate(SCREEN_NAMES.POLICE_STATION as never);
          break;
        case 'Find Fire Station':
          navigation.navigate(SCREEN_NAMES.FIRE_STATION as never);
          break;
        case 'Send Emergency Alert':
          Alert.alert(
            '🚨 Send Emergency Alert',
            'This will immediately send your exact location and contact details to the nearest police station. Proceed?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'SEND NOW',
                style: 'destructive',
                onPress: async () => {
                  Alert.alert(
                    'Sending Alert...',
                    'Getting your location and contacting nearest station. Please wait...'
                  );
                  const result = await EmergencySOSService.sendEmergencyAlert();
                  if (result.success) {
                    Alert.alert(
                      '✅ Alert Sent Successfully',
                      `Your location and contact details have been sent to:\n\n🚔 ${result.stationName}\n📞 ${result.stationPhone}\n\nStay calm. Help is on the way.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    Alert.alert(
                      '❌ Failed to Send',
                      `${result.error}\n\nPlease call emergency directly: 191`,
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ]
          );
          break;
        case 'Book Expert':
          navigation.navigate('SelectSpecialist' as never);
          break;
        // case 'Thief Detection':
        //   navigation.navigate(SCREEN_NAMES.SECURITY_PROTECTION as never);
        //   break;
        default:
          console.log('Premium action:', action);
      }
    } else {
      // ⭐ NEW - Show modern modal instead of Alert
      setShowPremiumModal(true);
      setSelectedFeature(action); // Store which feature was clicked

    }
  };

  // ⭐ NEW - Handle Subscribe Button Click
  const handleSubscribeClick = () => {
    setShowPremiumModal(true);
    setSelectedFeature('Subscribe'); // Different message for subscribe button

  };

  // ⭐ Get dynamic modal message based on selected feature
  const getModalMessage = () => {
    switch (selectedFeature) {
      // case 'Thief Detection':
      // return 'Thief Detection helps protect your device by automatically capturing photos when someone tries to access it without authorization. Upgrade to premium to activate this security feature.';
      case 'Emergency SOS':
        return 'Emergency SOS allows you to send voice or text alerts directly to police stations with your location. Upgrade to premium for instant emergency response.';
      case 'Find Police Station':
        return 'Find Police Station helps you locate the nearest police station with directions and contact information. Upgrade to premium to access this feature.';
      case 'Find Fire Station':
        return 'Find Fire Station helps you locate the nearest fire station with directions and contact info. Upgrade to premium to access this feature.';
      case 'Send Emergency Alert':
        return 'Send Emergency Alert automatically sends your exact GPS location and contact details to the nearest police station instantly. Upgrade to premium to access this feature.';
      case 'Book Expert':
        return 'Book Expert lets you schedule consultations with YCKF cybersecurity specialists. Upgrade to premium to get expert guidance.';
      case 'Subscribe':
        return 'Unlock all premium features including Emergency SOS, Find Police Station, Book Expert, and Thief Detection.';
      default:
        return 'Unlock all premium features including Emergency SOS, Find Police Station, Book Expert, and Thief Detection.';
    }
  };

  // Format premium status message
  const getPremiumStatusMessage = () => {
    switch (premiumReason) {
      case 'admin':
        return 'Admin - Permanent Access';
      case 'subscription':
        return premiumExpiry
          ? `Active until ${new Date(premiumExpiry).toLocaleDateString()}`
          : 'Subscription Active';
      case 'coupon':
        return 'Coupon Active';
      case 'demo':
        return 'Demo Access Active';
      default:
        return 'No Premium Access';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />

      {/* Header with Logo */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Semi-circle cutout */}
        <View style={styles.semicircleContainer}>
          <View style={styles.semicircle} />
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            {!imageError ? (
              <Image
                source={require('../../assets/images/companylogo.png')}
                style={{ width: 70, height: 70, borderRadius: 35 }}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Ionicons name="shield-checkmark" size={40} color="#fff" />
            )}
          </View>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>YCKF Mobile Features</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'free' && styles.activeTab]}
          onPress={() => setActiveTab('free')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'free' && styles.activeTabText]}>
            Free Access
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'paid' && styles.activeTab]}
          onPress={() => setActiveTab('paid')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'paid' && styles.activeTabText]}>
            Paid Access
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
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
        {activeTab === 'free' ? (
          // FREE ACCESS FEATURES
          <View style={styles.featuresList}>
            {/* Emergency Hotline */}
            <TouchableOpacity
              style={styles.featureItem}
              onPress={() => handleQuickAction('emergency_report')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="call" size={24} color="#4CAF50" />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Emergency Hotline</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free</Text>
                  </View>
                </View>
                <Text style={styles.featureSubtitle}>Call emergency numbers instantly</Text>
              </View>
            </TouchableOpacity>

            {/* Report Cybercrime */}
            <TouchableOpacity
              style={styles.featureItem}
              onPress={() => handleQuickAction('report_cybercrime')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="bug" size={24} color="#4CAF50" />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Report Cybercrime</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free</Text>
                  </View>
                </View>
                <Text style={styles.featureSubtitle}>Submit a cybercrime incident report</Text>
              </View>
            </TouchableOpacity>

            {/* Share Current Location */}
            <TouchableOpacity
              style={styles.featureItem}
              onPress={() => handleQuickAction('share_location')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="location" size={24} color="#4CAF50" />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Share Current Location</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free</Text>
                  </View>
                </View>
                <Text style={styles.featureSubtitle}>Send your live GPS location</Text>
              </View>
            </TouchableOpacity>

            {/* Contact YCKF */}
            <TouchableOpacity
              style={styles.featureItem}
              onPress={() => handleQuickAction('contact_yckf')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="people" size={24} color="#4CAF50" />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureHeader}>
                  <Text style={styles.featureTitle}>Contact YCKF</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Free</Text>
                  </View>
                </View>
                <Text style={styles.featureSubtitle}>Get in touch with our support team</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          // PAID ACCESS FEATURES
          <>
            <View style={styles.featuresList}>
              {/* Thief Detection Feature was here before*/}

              {/* Emergency SOS */}
              <TouchableOpacity
                style={styles.featureItem}
                onPress={() => handlePremiumAction('Emergency SOS')}
              >
                <View style={[styles.featureIcon, { backgroundColor: isPremium ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Ionicons name="warning" size={24} color={isPremium ? '#4CAF50' : '#F57C00'} />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureTitle}>Emergency SOS</Text>
                    <View style={isPremium ? styles.accessBadge : styles.premiumBadge}>
                      <Text style={isPremium ? styles.accessBadgeText : styles.premiumBadgeText}>
                        {isPremium ? 'ACCESS' : 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.featureSubtitle}>Voice/Text Police Station Alert</Text>
                </View>
                <Ionicons
                  name={isPremium ? 'lock-open' : 'lock-closed'}
                  size={20}
                  color={isPremium ? '#4CAF50' : '#BDBDBD'}
                />
              </TouchableOpacity>

              {/* Find Police Station */}
              <TouchableOpacity
                style={styles.featureItem}
                onPress={() => handlePremiumAction('Find Police Station')}
              >
                <View style={[styles.featureIcon, { backgroundColor: isPremium ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Ionicons name="car" size={24} color={isPremium ? '#4CAF50' : '#F57C00'} />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureTitle}>Find Police Station</Text>
                    <View style={isPremium ? styles.accessBadge : styles.premiumBadge}>
                      <Text style={isPremium ? styles.accessBadgeText : styles.premiumBadgeText}>
                        {isPremium ? 'ACCESS' : 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.featureSubtitle}>Locate nearest police station</Text>
                </View>
                <Ionicons
                  name={isPremium ? 'lock-open' : 'lock-closed'}
                  size={20}
                  color={isPremium ? '#4CAF50' : '#BDBDBD'}
                />
              </TouchableOpacity>

              {/* Find Fire Station */}
              <TouchableOpacity
                style={styles.featureItem}
                onPress={() => handlePremiumAction('Find Fire Station')}
              >
                <View style={[styles.featureIcon, { backgroundColor: isPremium ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Ionicons name="flame" size={24} color={isPremium ? '#4CAF50' : '#FF5722'} />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureTitle}>Find Fire Station</Text>
                    <View style={isPremium ? styles.accessBadge : styles.premiumBadge}>
                      <Text style={isPremium ? styles.accessBadgeText : styles.premiumBadgeText}>
                        {isPremium ? 'ACCESS' : 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.featureSubtitle}>Locate nearest fire station</Text>
                </View>
                <Ionicons
                  name={isPremium ? 'lock-open' : 'lock-closed'}
                  size={20}
                  color={isPremium ? '#4CAF50' : '#BDBDBD'}
                />
              </TouchableOpacity>

              {/* Send Emergency Alert */}
              <TouchableOpacity
                style={[styles.featureItem, { backgroundColor: '#dc2626', shadowColor: '#dc2626' }]}
                onPress={() => handlePremiumAction('Send Emergency Alert')}
              >
                <View style={[styles.featureIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="alert-circle" size={24} color="#fff" />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureHeader}>
                    <Text style={[styles.featureTitle, { color: '#fff' }]}>Send Emergency Alert</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                        {isPremium ? 'ACCESS' : 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.featureSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                    Auto-send location to nearest police station
                  </Text>
                </View>
                <Ionicons
                  name={isPremium ? 'lock-open' : 'lock-closed'}
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>

              {/* Book Expert */}
              <TouchableOpacity
                style={styles.featureItem}
                onPress={() => handlePremiumAction('Book Expert')}
              >
                <View style={[styles.featureIcon, { backgroundColor: isPremium ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Ionicons name="calendar" size={24} color={isPremium ? '#4CAF50' : '#F57C00'} />
                </View>
                <View style={styles.featureContent}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureTitle}>Book Expert</Text>
                    <View style={isPremium ? styles.accessBadge : styles.premiumBadge}>
                      <Text style={isPremium ? styles.accessBadgeText : styles.premiumBadgeText}>
                        {isPremium ? 'ACCESS' : 'Premium'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.featureSubtitle}>Schedule consultation with YCKF expert</Text>
                </View>
                <Ionicons
                  name={isPremium ? 'lock-open' : 'lock-closed'}
                  size={20}
                  color={isPremium ? '#4CAF50' : '#BDBDBD'}
                />
              </TouchableOpacity>
            </View>

            {/* Subscription Info or Status */}
            {!isPremium ? (
              <>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionText}>
                    Unlock premium features for Ghc 100 or USD 9/year
                  </Text>
                </View>

                {/* ⭐ UPDATED - Subscribe Button with Modal */}
                <View style={styles.subscribeButtonContainer}>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={handleSubscribeClick}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.premiumStatusContainer}>
                <View style={styles.premiumStatusCard}>
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                  <Text style={styles.premiumStatusTitle}>Premium Active</Text>
                  <Text style={styles.premiumStatusText}>
                    {getPremiumStatusMessage()}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Your Activity Section */}
        <View style={styles.activitySection}>
          <Text style={styles.simpleSectionTitle}>Your Activity</Text>
          <View style={styles.activityGrid}>
            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => navigation.navigate(SCREEN_NAMES.EVIDENCE_SAFEBOX as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>0</Text>
                <Text style={styles.activityLabel}>Reports Submitted</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => navigation.navigate(SCREEN_NAMES.CASE_TRACKER as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIcon, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="search" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>0</Text>
                <Text style={styles.activityLabel}>Cases Tracked</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => navigation.navigate(SCREEN_NAMES.MY_REPORTS as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIcon, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="clipboard" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>My</Text>
                <Text style={styles.activityLabel}>Reports Portal</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Tips Section */}
        <View style={styles.activitySection}>
          <Text style={styles.simpleSectionTitle}>Safety Tips</Text>
          <TouchableOpacity style={styles.safetyCard} activeOpacity={0.8}>
            <View style={[styles.activityIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            </View>
            <View style={styles.safetyContent}>
              <Text style={styles.safetyTitle}>Stay Protected Online</Text>
              <Text style={styles.safetyText}>
                Always verify suspicious emails and use strong passwords
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.activitySection}>
          <Text style={styles.simpleSectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.aboutSimpleCard}
            onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT as never)}
            activeOpacity={0.8}
          >
            <View style={[styles.activityIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.safetyContent}>
              <Text style={styles.safetyTitle}>About YCKF</Text>
              <Text style={styles.safetyText}>Learn more about our mission</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* ⭐ NEW - PREMIUM MODAL - Modern Design */}
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Premium Feature</Text>
            <Text style={styles.modalMessage}>
              {getModalMessage()}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPremiumModal(false);
                navigation.navigate('SubscriptionTerms' as never);
              }}
            >
              <Text style={styles.modalButtonText}>Subscribe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPremiumModal(false);
                navigation.navigate('CouponRedemption' as never);
              }}
            >
              <Text style={styles.modalButtonText}>Use Coupon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // Header
  headerWrapper: {
    position: 'relative',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 35,
    position: 'relative',
  },
  semicircleContainer: {
    position: 'absolute',
    bottom: -35,
    left: 0,
    right: 0,
    height: 35,
    overflow: 'hidden',
    zIndex: 1,
  },
  semicircle: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 100,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -35,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  // Title
  titleContainer: {
    backgroundColor: '#fff',
    paddingVertical: SPACING.lg,
    paddingTop: 45,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
  },

  // Features List
  featuresList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  featureSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },

  // Badges
  freeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  premiumBadge: {
    backgroundColor: '#D84315',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  accessBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accessBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  newBadge: {
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  premiumStatusContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  premiumStatusCard: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  premiumStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  premiumStatusText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Subscription Info
  subscriptionInfo: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  subscriptionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Subscribe Button
  subscribeButtonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Activity Section
  activitySection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  simpleSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },

  // Activity Grid
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activityInfo: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Safety Tips Card
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  safetyContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // About Simple Card
  aboutSimpleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Footer
  footer: {
    height: SPACING.xl * 2,
  },

  // ⭐ MODAL STYLES - Modern Design (Same as ProfileScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: SPACING.xl,
    width: width - (SPACING.lg * 2),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalCancelButton: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
});
export default HomeScreen;