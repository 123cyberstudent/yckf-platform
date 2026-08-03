// ============================================
// FILE: src/screens/Auth/RegisterScreen.tsx
// Registration Screen for New Users
// ============================================

import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AuthService from '../../services/AuthService';
import { COLORS, SPACING } from '../../utils/constants';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to select a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };



const handleRegister = async () => {
  // Validate inputs
  if (!name.trim()) {
    Alert.alert('Error', 'Please enter your name');
    return;
  }

  if (!email.trim()) {
    Alert.alert('Error', 'Please enter your email');
    return;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  // ⭐ NEW: Trim and normalize email before sending
  const normalizedEmail = email.trim().toLowerCase();
  // ⭐ NEW: Update the email state with normalized version
  setEmail(normalizedEmail);
  if (!password.trim()) {
    Alert.alert('Error', 'Please enter a password');
    return;
  }

  if (!phoneNumber.trim()) {
  Alert.alert('Error', 'Please enter your phone number');
  return;
}

// Validate phone number format
const phoneRegex = /^[0-9+\s()-]+$/;
if (!phoneRegex.test(phoneNumber)) {
  Alert.alert('Error', 'Please enter a valid phone number');
  return;
}

if (phoneNumber.replace(/[^0-9]/g, '').length < 10) {
  Alert.alert('Error', 'Phone number must be at least 10 digits');
  return;
}
  // Validate password strength
  if (password.length < 8) {
    Alert.alert('Error', 'Password must be at least 8 characters long');
    return;
  }

  // ============================================
  // NEW: VALIDATE PASSWORD DOESN'T CONTAIN NAME
  // ============================================
  const passwordLower = password.toLowerCase();
  const nameParts = name.toLowerCase().split(' ').filter(part => part.length > 2);
  const nameInPassword = nameParts.some(part => passwordLower.includes(part));

  if (nameInPassword) {
    Alert.alert(
      'Weak Password',
      'Your password cannot contain your name or parts of your name. Please choose a stronger password for better security.',
      [{ text: 'OK' }]
    );
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  if (!agreedToTerms) {
    Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
    return;
  }

  setIsLoading(true);

  try {
const result = await AuthService.register(normalizedEmail, password, name.trim(), phoneNumber.trim(), profileImage, referralCode.trim() || undefined);    if (result.success) {
      Alert.alert(
        'Account Created! 🎉',
        `Welcome ${name}!\n\nYour account has been created successfully.\n\n🎁 You've unlocked 12 hours of YCKF Premium free.\n\n📧 A confirmation email has been sent to ${email}.\n\nPlease login to continue.`,
        [
          {
            text: 'Login Now',
            onPress: () => {
              // Navigate to Login screen
              navigation.navigate('Login' as never);
            },
          },
        ]
      );
  } else {
      const errorMsg = result.error || 'Could not create account';
      console.log('❌ Registration error:', errorMsg);
      
      // ⭐ NEW: Show different alerts based on error type
      if (errorMsg.toLowerCase().includes('already exists')) {
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Would you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login' as never)
            }
          ]
        );
      } else if (errorMsg.toLowerCase().includes('password cannot contain')) {
        Alert.alert(
          'Weak Password',
          errorMsg,
          [{ text: 'Try Again' }]
        );
      } else {
        Alert.alert('Registration Failed', errorMsg);
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    Alert.alert(
      'Connection Error',
      'Cannot connect to server. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setIsLoading(false);
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
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <View style={styles.profileImageContainer}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person-add" size={40} color="#fff" />
                  )}
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join YCKF community today</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person"
                    size={18}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>

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

              {/* Phone Number Input */}
<View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Phone Number</Text>
  <View style={styles.inputWrapper}>
    <Ionicons
      name="call"
      size={18}
      color="rgba(255, 255, 255, 0.7)"
      style={styles.inputIcon}
    />
    <TextInput
      style={styles.input}
      placeholder="e.g., +233 50 531 3578"
      placeholderTextColor="rgba(255, 255, 255, 0.5)"
      value={phoneNumber}
      onChangeText={setPhoneNumber}
      keyboardType="phone-pad"
      editable={!isLoading}
    />
  </View>
</View>

              {/* Referral Code Input (Optional) */}
<View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
  <View style={styles.inputWrapper}>
    <Ionicons
      name="gift"
      size={18}
      color="rgba(255, 255, 255, 0.7)"
      style={styles.inputIcon}
    />
    <TextInput
      style={styles.input}
      placeholder="e.g., YCKF-A1B2C3"
      placeholderTextColor="rgba(255, 255, 255, 0.5)"
      value={referralCode}
      onChangeText={setReferralCode}
      autoCapitalize="characters"
      autoCorrect={false}
      editable={!isLoading}
    />
  </View>
  <Text style={styles.referralHint}>
    Enter a friend's code to get 1 hour of free Premium access
  </Text>
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
                    placeholder="Minimum 8 characters"
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms Agreement */}
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedToTerms && styles.checkboxChecked,
                  ]}
                >
                  {agreedToTerms && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isLoading && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
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

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login' as never)}
                >
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
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
    paddingVertical: SPACING.lg,
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
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  referralHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    fontWeight: '500',
  },
  termsLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  registerButton: {
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
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;