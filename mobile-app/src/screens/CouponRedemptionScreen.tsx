// src/screens/CouponRedemptionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import SecureCouponService from '../services/SecureCouponService';
import { PremiumAccessService } from '../services/PremiumAccessService';
import AuthService from '../services/AuthService';
import { COLORS, SPACING } from '../utils/constants';

interface CouponAccess {
  hasAccess: boolean;
  reason?: string;
  expiresAt?: string;
  timeRemaining?: number;
}

const CouponRedemptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [couponAccess, setCouponAccess] = useState<CouponAccess>({ hasAccess: false });
  // const [durationHours, setDurationHours] = useState<12 | 24>(24);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndAccess();
  }, []);

  const checkAuthAndAccess = async () => {
    setCheckingAccess(true);
    try {
      // Check if user is authenticated
      const isAuth = await AuthService.isAuthenticated();
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // Check premium access
        const access = await PremiumAccessService.checkPremiumAccess();
        
        if (access.hasAccess && access.reason === 'coupon') {
          // Calculate time remaining if has coupon access
          const timeRemaining = access.expiresAt 
            ? Math.max(0, Math.floor((new Date(access.expiresAt).getTime() - Date.now()) / (1000 * 60)))
            : 0;

          setCouponAccess({
            hasAccess: true,
            reason: access.reason,
            expiresAt: access.expiresAt,
            timeRemaining,
          });
        } else {
          setCouponAccess({ hasAccess: false });
        }
      }
    } catch (error) {
      console.error('Failed to check access:', error);
      setCouponAccess({ hasAccess: false });
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to redeem a coupon',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login' as never) }
        ]
      );
      return;
    }

    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    setIsLoading(true);
    try {
      // First validate
      const validation = await SecureCouponService.validateCoupon(couponCode.trim());
      
      if (!validation.valid) {
        Alert.alert('Invalid Coupon', validation.message);
        setIsLoading(false);
        return;
      }

      
   // Redeem the coupon (duration is set by admin in the coupon)
      const result = await SecureCouponService.redeemCoupon(couponCode.trim());      
      if (result.success && result.redemption) {
      // Calculate duration for display
        const durationMs = new Date(result.redemption.expiresAt).getTime() - Date.now();
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
        const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        let durationText;
        if (durationDays > 30) {
          durationText = `${Math.floor(durationDays / 30)} month(s)`;
        } else if (durationDays > 0) {
          durationText = `${durationDays} day(s)`;
        } else {
          durationText = `${durationHours} hour(s)`;
        }
        
        Alert.alert(
          'Success! 🎉',
          `Coupon activated successfully!\n\nYou now have ${durationText} of premium access.\n\nExpires: ${new Date(result.redemption.expiresAt).toLocaleString()}`,
          [
            {
              text: 'Great!',
              onPress: () => {
                setCouponCode('');
                checkAuthAndAccess();
                // Navigate back to home
                navigation.navigate('Root' as never);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to redeem coupon');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to redeem coupon');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}`;
  };

  // Show loading while checking access
  if (checkingAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activate Coupon</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activate Coupon</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {!isAuthenticated ? (
            // Not logged in - show login prompt
            <View style={styles.loginPromptCard}>
              <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
              <Text style={styles.loginPromptTitle}>Login Required</Text>
              <Text style={styles.loginPromptText}>
                Please log in to activate coupon codes and access premium features
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
          ) : couponAccess.hasAccess ? (
            // Show active access
            <View style={styles.activeAccessCard}>
              <View style={styles.activeIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
              </View>
              <Text style={styles.activeTitle}>Premium Access Active!</Text>
              <Text style={styles.activeSubtitle}>
                You have {formatTimeRemaining(couponAccess.timeRemaining || 0)} remaining
              </Text>
              <Text style={styles.expiryText}>
                Expires: {couponAccess.expiresAt ? new Date(couponAccess.expiresAt).toLocaleString() : 'N/A'}
              </Text>
              
              <View style={styles.featuresBox}>
                <Text style={styles.featuresTitle}>You can now access:</Text>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Emergency SOS</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Find Park</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Book Expert</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Root' as never)}
              >
                <Text style={styles.primaryButtonText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Show coupon entry form
            <>
              <View style={styles.infoCard}>
                <Ionicons name="gift" size={48} color={COLORS.primary} />
                <Text style={styles.infoTitle}>Have a Test Coupon?</Text>
                <Text style={styles.infoText}>
                  Enter your coupon code below to get temporary access to premium features
                </Text>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>Coupon Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter coupon code (e.g., YCKF-ABC123)"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.redeemButton, isLoading && styles.redeemButtonDisabled]}
                  onPress={handleRedeemCoupon}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color="#fff" />
                      <Text style={styles.redeemButtonText}>Activate Coupon</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.noteCard}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.noteText}>
                  Coupon access is temporary and will expire after the selected duration
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  content: {
    padding: SPACING.lg,
  },
  loginPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  loginPromptText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl * 2,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loginButtonText: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  durationOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  durationTextSelected: {
    color: COLORS.primary,
  },
  redeemButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  noteCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  activeAccessCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeIconContainer: {
    marginBottom: SPACING.md,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: SPACING.xs,
  },
  activeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  expiryText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  featuresBox: {
    width: '100%',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CouponRedemptionScreen;