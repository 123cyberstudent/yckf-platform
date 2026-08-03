// ========================================
// FILE: src/screens/ProfileScreen.tsx
// User Profile, Settings & Logout - UPDATED WITH MODERN POPUPS
// =========================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AuthService, { User } from '../services/AuthService';
import { PremiumAccessService } from '../services/PremiumAccessService';
import WhatsAppService from '../services/WhatsAppService';
import { COLORS, SPACING, SCREEN_NAMES } from '../utils/constants';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [premiumStatus, setPremiumStatus] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  
  // ⭐ NEW - Modal States
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Check premium access using PremiumAccessService
        const access = await PremiumAccessService.checkPremiumAccess(true);
        setIsPremium(access.premium);

        // Get premium status message
        const statusMsg = await PremiumAccessService.getPremiumStatusMessage();
        setPremiumStatus(statusMsg);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              
              // Navigate to Welcome screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' as never }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAdminAccess = async () => {
    const isAdmin = await AuthService.isAdmin();
    
    if (isAdmin) {
      navigation.navigate('AdminDashboard' as never);
    } else {
      Alert.alert(
        'Admin Access',
        'This feature is only available to administrators.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Admin Login', 
            onPress: () => navigation.navigate('AdminLogin' as never) 
          }
        ]
      );
    }
  };

  // ⭐ NEW - Handle Premium Access Click
  const handlePremiumAccessClick = () => {
    if (isPremium) {
      // Already premium - show info
      Alert.alert(
        'Premium Active',
        premiumStatus,
        [{ text: 'OK' }]
      );
    } else {
      // Not premium - show modern modal
      setShowPremiumModal(true);
    }
  };

  // ⭐ NEW - Handle Help & Support Click
  const handleHelpAndSupport = () => {
    setShowSupportModal(true);
  };

  
// ⭐ NEW - Handle Email Support
const handleEmailSupport = async () => {
  setShowSupportModal(false);
  
  try {
    // Import Linking at the top if not already imported
    const { Linking } = require('react-native');
    
    // Create mailto link
    const email = 'yckfadmin@youngcyberknightsfoundation.org';
    const subject = 'Help & Support Request';
    const body = `Hello YCKF Support Team,\n\nName: ${user?.name || 'User'}\nEmail: ${user?.email || 'Not provided'}\n\nI need assistance with:\n\n`;
    
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Check if device can open mailto links
    const canOpen = await Linking.canOpenURL(mailto);
    
    if (canOpen) {
      await Linking.openURL(mailto);
    } else {
      Alert.alert(
        'Email Not Available',
        'No email app found. Please contact us via WhatsApp or email us directly at yckfadmin@youngcyberknightsfoundation.org',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Email error:', error);
    Alert.alert(
      'Error',
      'Failed to open email client. Please try WhatsApp or email us at yckfadmin@youngcyberknightsfoundation.org',
      [{ text: 'OK' }]
    );
  }
};

  // ⭐ NEW - Handle WhatsApp Support
  const handleWhatsAppSupport = async () => {
    setShowSupportModal(false);
    
    try {
      const result = await WhatsAppService.sendContactMessage({
        name: user?.name || 'YCKF User',
        email: user?.email || 'yckfadmin@youngcyberknightsfoundation.org',
        message: 'Hello YCKF Support Team,\n\nI need assistance with...'
      });
      
      if (!result.success) {
        Alert.alert(
          'Error',
          'Failed to open WhatsApp. Please make sure WhatsApp is installed on your device.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      Alert.alert('Error', 'Failed to open WhatsApp.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={70} color={COLORS.text.secondary} />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please log in to access your profile and premium features
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register' as never)}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#fff" />
            )}
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          
          {['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        {/* Premium Status - ⭐ NOW CLICKABLE */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.premiumCard,
              isPremium ? styles.premiumCardActive : styles.premiumCardInactive
            ]}
            onPress={handlePremiumAccessClick}
            activeOpacity={0.7}
          >
            <View style={styles.premiumIconContainer}>
              <Ionicons
                name={isPremium ? 'checkmark-circle' : 'lock-closed'}
                size={28}
                color={isPremium ? '#4CAF50' : '#FFA500'}
              />
            </View>
            <View style={styles.premiumContent}>
              <Text style={styles.premiumTitle}>
                {isPremium ? 'Premium Active' : 'Premium Access'}
              </Text>
              <Text style={styles.premiumSubtitle}>{premiumStatus}</Text>
            </View>
            {!isPremium && (
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Wallet & Courses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet & Learning</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.PLANS as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="diamond" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Premium Plans</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.COURSE_CATALOG as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="school" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Browse Courses</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.CASE_TRACKER as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="search" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>My Cases</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.EVIDENCE_SAFEBOX as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="archive" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Evidence SafeBox</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>About YCKF</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.MY_REPORTS as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="document-text" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>My Reports</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS as never)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="settings" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>

          {['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAdminAccess}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="shield" size={20} color="#FF9800" />
              </View>
              <Text style={styles.menuText}>Admin Dashboard</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}

          {/* ⭐ UPDATED - Help & Support with Custom Modal */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleHelpAndSupport}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ⭐ PREMIUM MODAL - Modern Design */}
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
              Unlock all premium features including Emergency SOS, Find Police Station, Book Expert, and Thief Detection.
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPremiumModal(false);
                navigation.navigate(SCREEN_NAMES.PLANS as never);
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

      {/* ⭐ SUPPORT MODAL - Modern Design */}
      <Modal
        visible={showSupportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <Text style={styles.modalMessage}>
              Choose how you want to contact our support team:
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleEmailSupport}
            >
              <Ionicons name="mail" size={20} color="#fff" style={styles.modalButtonIcon} />
              <Text style={styles.modalButtonText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleWhatsAppSupport}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#fff" style={styles.modalButtonIcon} />
              <Text style={styles.modalButtonText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSupportModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  notLoggedInText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl * 2,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  registerButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl * 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: '100%',
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  premiumCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  premiumCardInactive: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  premiumIconContainer: {
    marginRight: SPACING.sm,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: SPACING.xs,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  bottomSpacing: {
    height: SPACING.md,
  },

  // ⭐ MODAL STYLES - Modern Design
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
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonIcon: {
    marginRight: SPACING.xs,
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

export default ProfileScreen;