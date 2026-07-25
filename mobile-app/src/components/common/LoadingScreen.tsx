import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, APP_CONFIG } from '../../utils/constants';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  showLogo = true 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        {showLogo && (
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>YCKF</Text>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.spinner}
          />
          <Text style={styles.loadingText}>{message}</Text>
        </View>

        {/* App Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.appName}>{APP_CONFIG.name}</Text>
          <Text style={styles.version}>Version {APP_CONFIG.version}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Logo
  logoContainer: {
    marginBottom: SPACING.xxxl,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.text.white,
    letterSpacing: 2,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  spinner: {
    marginBottom: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // App Info
  infoContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: SPACING.xxxl,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  version: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.light,
  },
});

export default LoadingScreen;
