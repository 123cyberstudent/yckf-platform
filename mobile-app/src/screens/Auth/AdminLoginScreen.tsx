// ============================================
// FILE: src/screens/Admin/AdminLoginScreen.tsx  
// Admin Login - Uses Same Auth System
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../../services/AuthService';
import { COLORS, SPACING } from '../../utils/constants';

const AdminLoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP (verification code) states
  const [otpState, setOtpState] = useState<{
    challengeId: number;
    maskedEmail?: string;
    maskedPhone?: string | null;
    devCode?: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.login(email.trim(), password);

      if (result.requiresOtp && result.challengeId) {
        setOtpState({
          challengeId: result.challengeId,
          maskedEmail: result.maskedEmail,
          maskedPhone: result.maskedPhone,
          devCode: result.devCode,
        });
        setOtpCode('');
        setResendIn(result.resendAfter || 60);
        Alert.alert(
          'Verification Code Sent',
          `We've sent a 6-digit code to ${result.maskedEmail || 'your email'}. Enter it to complete login.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (result.success) {
        // Check if user is admin (backend roles: ADMIN, SUPER_ADMIN)
        const isAdmin =
          result.user?.role === 'ADMIN' || result.user?.role === 'SUPER_ADMIN';

        if (isAdmin) {
          Alert.alert('Success', 'Logged in as Admin!', [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('AdminDashboard' as never);
              },
            },
          ]);
        } else {
          await AuthService.logout();
          Alert.alert('Error', 'Admin access required. This account does not have admin privileges.');
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpState) return;
    if (!otpCode.trim()) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setIsOtpLoading(true);
    try {
      const result = await AuthService.verifyOtp(otpState.challengeId, otpCode);
      if (result.success) {
        const isAdmin =
          result.user?.role === 'ADMIN' || result.user?.role === 'SUPER_ADMIN';
        if (isAdmin) {
          setOtpState(null);
          Alert.alert('Success', 'Logged in as Admin!', [
            {
              text: 'OK',
              onPress: () => navigation.navigate('AdminDashboard' as never),
            },
          ]);
        } else {
          await AuthService.logout();
          setOtpState(null);
          Alert.alert('Error', 'Admin access required. This account does not have admin privileges.');
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpState || resendIn > 0) return;
    setIsOtpLoading(true);
    try {
      const result = await AuthService.resendOtp(otpState.challengeId);
      if (result.success) {
        if (result.devCode) setOtpCode(result.devCode);
        setResendIn(result.resendAfter || 60);
        Alert.alert('Code Resent', 'A new verification code has been sent.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const cancelOtp = () => {
    setOtpState(null);
    setOtpCode('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>
              Access the admin dashboard to manage coupons and users
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={COLORS.text.secondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={COLORS.text.secondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                    <>
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.loginButtonText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            {otpState && (
              <View style={styles.otpCard}>
                <Text style={styles.otpTitle}>Enter Verification Code</Text>
                <Text style={styles.otpSubtitle}>
                  Enter the 6-digit code sent to {otpState.maskedEmail || otpState.maskedPhone || 'your email'}.
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key" size={20} color={COLORS.text.secondary} />
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="6-digit code"
                    placeholderTextColor={COLORS.text.secondary}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isOtpLoading}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.loginButton, isOtpLoading && styles.loginButtonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={20} color="#fff" />
                      <Text style={styles.loginButtonText}>Verify & Login</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={styles.otpRow}>
                  <TouchableOpacity onPress={handleResendOtp} disabled={resendIn > 0 || isOtpLoading}>
                    <Text style={styles.otpResend}>
                      {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelOtp} disabled={isOtpLoading}>
                    <Text style={styles.otpCancel}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {!otpState && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Only authorized administrators can access this area
            </Text>
          </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: SPACING.xl,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  otpCard: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  otpSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  otpInput: {
    letterSpacing: 6,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 20,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  otpResend: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  otpCancel: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
});

export default AdminLoginScreen;