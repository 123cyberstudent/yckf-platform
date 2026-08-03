// ============================================
// FILE: src/screens/Auth/WelcomeScreen.tsx
// Welcome/Onboarding Screen 
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AuthService, { API_BASE_URL } from '../../services/AuthService';
import { COLORS, SPACING } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

interface PromoBanner {
  title: string;
  message: string;
  ctaLabel: string;
}

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [promo, setPromo] = useState<PromoBanner | null>(null);

  useEffect(() => {
    checkAuthStatus();
    loadEligiblePromo();
  }, []);

  const checkAuthStatus = async () => {
    // Check if user is already logged in
    const user = await AuthService.getCurrentUser();
    if (user) {
      // User is logged in, navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Root' as never }],
      });
    }
  };

  const loadEligiblePromo = async () => {
    try {
      const token = await AuthService.getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/promotions/eligible?placement=signup&platform=MOBILE`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      const data = await response.json();
      if (data.success && data.show && data.promo) {
        setPromo({
          title: data.promo.title,
          message: data.promo.message,
          ctaLabel: data.promo.ctaLabel || 'Sign up free',
        });
      }
    } catch (error) {
      console.error('Failed to load signup promo:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark || '#0a2463']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/images/companylogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>YCKF Mobile</Text>
            <Text style={styles.tagline}>Your Cyber Knights Foundation</Text>
          </View>

          {/* Promo Flyer - appears immediately on app open */}
          {promo && (
            <View style={styles.promoSection}>
              <LinearGradient
                colors={['#FFD54F', '#FFB300']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.promoCard}
              >
                <View style={styles.promoIconContainer}>
                  <Ionicons name="gift" size={22} color="#fff" />
                </View>
                <View style={styles.promoContent}>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoMessage}>{promo.message}</Text>
                </View>
                <TouchableOpacity
                  style={styles.promoButton}
                  onPress={() => navigation.navigate('Register' as never)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.promoButtonText}>{promo.ctaLabel}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#7A4F00" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="shield" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Stay Protected</Text>
                <Text style={styles.featureDescription}>
                  Report cyber crimes and access emergency support
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="location" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Location Safety</Text>
                <Text style={styles.featureDescription}>
                  Share your location with trusted contacts
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="people" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Expert Support</Text>
                <Text style={styles.featureDescription}>
                  Connect with cybersecurity professionals
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login' as never)}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>Login</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register' as never)}
              activeOpacity={0.9}
            >
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestButton}
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Root' as never }],
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: SPACING.md,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: height * 0.04,
    paddingBottom: SPACING.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: SPACING.xs / 2,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  promoSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  promoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A3000',
  },
  promoMessage: {
    fontSize: 11,
    color: '#4A3000',
    lineHeight: 15,
    marginTop: 2,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    marginLeft: SPACING.xs,
  },
  promoButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A4F00',
    marginRight: 2,
  },
  featuresSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  actionSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  loginButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
export default WelcomeScreen;