import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, APP_CONFIG } from '../../utils/constants';

interface WelcomeHeaderProps {
  isOnline: boolean;
}

const { width } = Dimensions.get('window');

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ isOnline }) => {
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/images/companylogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
              <Text style={styles.title}>Welcome to {APP_CONFIG.name}</Text>
              <Text style={styles.subtitle}>
                Your trusted partner in cybersecurity protection
              </Text>
            </View>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            {/* Online Status */}
            <View style={[styles.statusBadge, isOnline ? styles.online : styles.offline]}>
              <Ionicons
                name={isOnline ? 'wifi' : 'wifi-outline'}
                size={12}
                color={COLORS.text.white}
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>

            {/* Security Badge */}
            <View style={[styles.statusBadge, styles.secure]}>
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={COLORS.text.white}
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>Secure</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  safeArea: {
    zIndex: 2,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  // Main Content
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    marginRight: SPACING.lg,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    padding: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 39,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text.white,
    marginBottom: 4,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },

  // Status Indicators
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  online: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  offline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  secure: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.text.white,
  },

  // Decorative Elements
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 100,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -40,
     right: -20,
  },
  circle2: {
    width: 80,
    height: 80,
    top: 20,
    right: width - 60,
  },
  circle3: {
    width: 200,
    height: 200,
    bottom: -80,
    left: -60,
  },
});

export default WelcomeHeader;