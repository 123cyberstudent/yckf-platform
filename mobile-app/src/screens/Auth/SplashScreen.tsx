// ============================================
// FILE: src/screens/Auth/SplashScreen.tsx
// App Launch Screen - Checks Authentication
// ============================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../../services/AuthService';
import { COLORS, SPACING } from '../../utils/constants';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Initialize auth service
      await AuthService.initialize();

      // Check if user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();

      // Wait a bit for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (isAuthenticated) {
        // User is logged in, go to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Root' as never }],
        });
      } else {
        // User not logged in, go to welcome screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' as never }],
        });
      }
    } catch (error) {
      console.error('Splash screen error:', error);
      // On error, go to welcome screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' as never }],
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={80} color="#fff" />
        </View>
        <Text style={styles.appName}>YCKF</Text>
        <Text style={styles.tagline}>Young Cyber Knights Foundation</Text>
      </View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 3,
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  version: {
    position: 'absolute',
    bottom: SPACING.xl,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default SplashScreen;