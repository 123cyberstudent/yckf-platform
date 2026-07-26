// ============================================
// FILE: src/screens/Auth/LoginScreen.tsx
// Login Screen with Forgot Password Feature
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
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../../services/AuthService';
import { COLORS, SPACING } from '../../utils/constants';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserName, setLastUserName] = useState('');
  const [lastUserImage, setLastUserImage] = useState<string | null>(null);

  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'code' | 'password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  useEffect(() => {
    loadLastUser();
  }, []);

  const loadLastUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('lastUser');
      if (userData) {
        const user = JSON.parse(userData);
        setLastUserName(user.name || '');
        setLastUserImage(user.profileImage || null);
        setEmail(user.email || ''); // Pre-fill email
      }
    } catch (error) {
      console.error('Failed to load last user:', error);
    }
  };

const handleLogin = async () => {
  // Validate inputs
  if (!email.trim()) {
    Alert.alert('Error', 'Please enter your email');
    return;
  }

  if (!password.trim()) {
    Alert.alert('Error', 'Please enter your password');
    return;
  }

  // ⭐ NEW: Normalize email (lowercase and trim)
  const normalizedEmail = email.trim().toLowerCase();

  setIsLoading(true);

  try {
    const result = await AuthService.login(normalizedEmail, password);

      if (result.success) {
        Alert.alert(
          'Welcome Back! 👋',
          `Hello ${result.user?.name || 'User'}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to main app
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Root' as never }],
                });
              },
            },
          ]
        );
     } else {
        const errorMsg = result.error || 'Invalid email or password';
        console.log('❌ Login error:', errorMsg);
        
        // ⭐ NEW: Show more specific error messages
        if (errorMsg.toLowerCase().includes('invalid credentials')) {
          Alert.alert(
            'Login Failed',
            'The email or password you entered is incorrect. Please try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Login Failed', errorMsg);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };
  // ============================================
  // FORGOT PASSWORD HANDLERS
  // ============================================

  const openForgotPasswordModal = () => {
    setForgotEmail(email); // Pre-fill with current email
    setForgotPasswordStep('email');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowForgotPasswordModal(true);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordStep('email');
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

 const handleSendResetCode = async () => {
  if (!forgotEmail.trim()) {
    Alert.alert('Error', 'Please enter your email address');
    return;
  }

  // ⭐ NEW: Normalize email
  const normalizedEmail = forgotEmail.trim().toLowerCase();

  setIsForgotPasswordLoading(true);

  try {
    const result = await AuthService.forgotPassword(normalizedEmail);

      if (result.success) {
        Alert.alert(
          'Code Sent! 📧',
          result.message || 'Check your email for the reset code',
          [{ text: 'OK' }]
        );
        setForgotPasswordStep('code');
        setForgotEmail(normalizedEmail); // Update with normalized email

      } else {
        Alert.alert('Error', result.error || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Send reset code error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode.trim()) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    setIsForgotPasswordLoading(true);

    try {
      const result = await AuthService.verifyResetCode(forgotEmail.trim(), resetCode.trim());

      if (result.success) {
        Alert.alert(
          'Code Verified! ✅',
          'Please enter your new password',
          [{ text: 'OK' }]
        );
        setForgotPasswordStep('password');
      } else {
        Alert.alert('Error', result.error || 'Invalid or expired code');
      }
    } catch (error) {
      console.error('Verify code error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

const handleResetPassword = async () => {
  if (!newPassword.trim()) {
    Alert.alert('Error', 'Please enter a new password');
    return;
  }

  if (newPassword.length < 8) {
    Alert.alert('Error', 'Password must be at least 8 characters');
    return;
  }

  // ============================================
  // NEW: VALIDATE PASSWORD DOESN'T CONTAIN EMAIL NAME
  // ============================================
  const passwordLower = newPassword.toLowerCase();
  const emailName = forgotEmail.split('@')[0].toLowerCase();
  
  if (passwordLower.includes(emailName) && emailName.length > 2) {
    Alert.alert(
      'Weak Password',
      'Your password cannot contain parts of your email address. Please choose a stronger password.',
      [{ text: 'OK' }]
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  setIsForgotPasswordLoading(true);

  try {
    // ⭐ NEW: Use normalized email
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    const result = await AuthService.resetPassword(
      normalizedEmail,
      resetCode.trim(),
      newPassword
    );

    if (result.success) {
      Alert.alert(
        'Password Reset! 🎉',
        result.message || 'Your password has been reset successfully. Please login with your new password.',
        [
          {
            text: 'Login',
            onPress: () => {
              closeForgotPasswordModal();
              setEmail(normalizedEmail); // Use normalized email
              setPassword('');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to reset password');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setIsForgotPasswordLoading(false);
  }
};
  const renderForgotPasswordContent = () => {
    switch (forgotPasswordStep) {
      case 'email':
        return (
          <>
            <Text style={styles.modalTitle}>Forgot Password?</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a code to reset your password
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Email Address</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons
                  name="mail"
                  size={18}
                  color={COLORS.primary}
                  style={styles.modalInputIcon}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!isForgotPasswordLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                isForgotPasswordLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleSendResetCode}
              disabled={isForgotPasswordLoading}
            >
              {isForgotPasswordLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </>
        );

      case 'code':
        return (
          <>
            <Text style={styles.modalTitle}>Enter Reset Code</Text>
            <Text style={styles.modalSubtitle}>
              We've sent a code to {forgotEmail}. Please enter it below.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Reset Code</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons
                  name="key"
                  size={18}
                  color={COLORS.primary}
                  style={styles.modalInputIcon}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter code"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={resetCode}
                  onChangeText={setResetCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isForgotPasswordLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                isForgotPasswordLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={isForgotPasswordLoading}
            >
              {isForgotPasswordLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setForgotPasswordStep('email')}
            >
              <Text style={styles.modalSecondaryButtonText}>Back to Email</Text>
            </TouchableOpacity>
          </>
        );

      case 'password':
        return (
          <>
            <Text style={styles.modalTitle}>Set New Password</Text>
            <Text style={styles.modalSubtitle}>
              Create a strong password with at least 6 characters
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>New Password</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color={COLORS.primary}
                  style={styles.modalInputIcon}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isForgotPasswordLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.modalEyeIcon}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Confirm Password</Text>
              <View style={styles.modalInputWrapper}>
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color={COLORS.primary}
                  style={styles.modalInputIcon}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isForgotPasswordLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.modalEyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                isForgotPasswordLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={isForgotPasswordLoading}
            >
              {isForgotPasswordLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark || '#0a2463']}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.profileImageContainer}>
                {lastUserImage ? (
                  <Image source={{ uri: lastUserImage }} style={styles.profileImage} />
                ) : (
                  <Ionicons name="lock-closed" size={40} color="#fff" />
                )}
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              {lastUserName ? (
                <Text style={styles.subtitle}>{lastUserName}</Text>
              ) : (
                <Text style={styles.subtitle}>Login to your account</Text>
              )}
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail"
                    size={18}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={openForgotPasswordModal}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Login</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={COLORS.primary}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Quick Login Buttons */}
              <View style={styles.quickLoginContainer}>
                <Text style={styles.quickLoginLabel}>Quick Login</Text>
                <View style={styles.quickLoginRow}>
                  <TouchableOpacity
                    style={styles.quickLoginButton}
                    onPress={() => {
                      setEmail('yckfadmin@youngcyberknightsfoundation.org');
                      setPassword('admin@123');
                    }}
                    disabled={isLoading}
                  >
                    <Ionicons name="shield-checkmark" size={16} color="#fff" />
                    <Text style={styles.quickLoginButtonText}>Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickLoginButton, styles.quickLoginButtonUser]}
                    onPress={() => {
                      setEmail('user@youngcyberknightsfoundation.org');
                      setPassword('user@123');
                    }}
                    disabled={isLoading}
                  >
                    <Ionicons name="person" size={16} color="#fff" />
                    <Text style={styles.quickLoginButtonText}>User</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register' as never)}
                >
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeForgotPasswordModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeForgotPasswordModal}
          />
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeForgotPasswordModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>

              {renderForgotPasswordContent()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  keyboardView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  profileImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    paddingBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: SPACING.md,
    fontWeight: '600',
  },
  quickLoginContainer: {
    marginBottom: SPACING.lg,
  },
  quickLoginLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickLoginRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickLoginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickLoginButtonUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickLoginButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  modalInputGroup: {
    marginBottom: SPACING.md,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: SPACING.xs,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: SPACING.md,
  },
  modalInputIcon: {
    marginRight: SPACING.sm,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalEyeIcon: {
    padding: SPACING.xs,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalSecondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default LoginScreen;