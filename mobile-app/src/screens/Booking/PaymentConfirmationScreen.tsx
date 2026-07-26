// ============================================
// FILE: src/screens/PaymentConfirmationScreen.tsx
// Payment Confirmation Form Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, API_ENDPOINTS } from '../../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import authService from '../../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PaymentConfirmationScreenProps {
  navigation: any;
  route: {
    params: {
      paymentMethod: string;
      amount: string;
    };
  };
}

const PaymentConfirmationScreen: React.FC<PaymentConfirmationScreenProps> = ({
  navigation,
  route,
}) => {
  const { paymentMethod, amount } = route.params || {};

  const [network, setNetwork] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [errors, setErrors] = useState({
    network: '',
    transactionRef: '',
    payerName: '',
    payerPhone: '',
  });

  const validateForm = () => {
    const newErrors = {
      network: '',
      transactionRef: '',
      payerName: '',
      payerPhone: '',
    };

    let isValid = true;

    // Validate network
    if (!network.trim()) {
      newErrors.network = 'Please select a network';
      isValid = false;
    }

    // Validate transaction reference
    if (!transactionRef.trim()) {
      newErrors.transactionRef = 'Transaction reference is required';
      isValid = false;
    } else if (transactionRef.trim().length < 5) {
      newErrors.transactionRef = 'Invalid transaction reference';
      isValid = false;
    }

    // Validate payer name
    if (!payerName.trim()) {
      newErrors.payerName = 'Payer name is required';
      isValid = false;
    } else if (payerName.trim().length < 3) {
      newErrors.payerName = 'Name must be at least 3 characters';
      isValid = false;
    }

    // Validate phone number
    if (payerPhone.trim()) {
      const phoneRegex = /^[0-9+\s()-]+$/;
      if (!phoneRegex.test(payerPhone)) {
        newErrors.payerPhone = 'Invalid phone number format';
        isValid = false;
      } else if (payerPhone.replace(/[^0-9]/g, '').length < 10) {
        newErrors.payerPhone = 'Phone number must be at least 10 digits';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload payment screenshot.'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].base64 || result.assets[0].uri);
        Alert.alert('Success', 'Screenshot uploaded successfully!');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Email Template Generator
  const generateEmailHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 25px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 18px; font-weight: bold; color: #0066cc; margin-bottom: 10px; border-bottom: 2px solid #0066cc; padding-bottom: 5px; }
          .info-row { display: flex; margin-bottom: 8px; }
          .info-label { font-weight: bold; min-width: 180px; color: #555; }
          .info-value { color: #333; }
          .action-box { background: #FEF3C7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #F59E0B; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 PAYMENT CONFIRMATION</h1>
            <p style="margin: 0; font-size: 14px;">Premium Subscription Payment</p>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">PAYMENT DETAILS</div>
              <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">${data.paymentMethod}</span></div>
              <div class="info-row"><span class="info-label">Amount:</span><span class="info-value">${data.amount}</span></div>
              <div class="info-row"><span class="info-label">Network:</span><span class="info-value">${data.network}</span></div>
              <div class="info-row"><span class="info-label">Transaction Ref:</span><span class="info-value"><strong>${data.transactionRef}</strong></span></div>
            </div>

           <div class="section">
            <div class="section-title">PAYER INFORMATION</div>
            <div class="info-row"><span class="info-label">Payer Name:</span><span class="info-value">${data.payerName}</span></div>
            <div class="info-row"><span class="info-label">Phone Number:</span><span class="info-value">${data.payerPhone}</span></div>
          </div>

          <div class="section">
           <div class="section-title">USER ACCOUNT INFORMATION</div>
           <div class="info-row"><span class="info-label">Registered Email:</span><span class="info-value">${data.userEmail}</span></div>
           <div class="info-row"><span class="info-label">Registered Phone:</span><span class="info-value">${data.userPhone || 'Not provided'}</span></div>
          </div>

            <div class="section">
              <div class="section-title">SUBMISSION INFO</div>
              <div class="info-row"><span class="info-label">Submitted At:</span><span class="info-value">${new Date(data.submittedAt).toLocaleString()}</span></div>
              <div class="info-row"><span class="info-label">Submitted Via:</span><span class="info-value">YCKF Mobile App</span></div>
            </div>

            ${data.hasScreenshot ? `
            <div class="section">
              <div class="section-title">📸 PAYMENT SCREENSHOT</div>
              <div class="info-row"><span class="info-label">Status:</span><span class="info-value">Screenshot attached to this email</span></div>
            </div>
            ` : ''}

            <div class="action-box">
              <strong>⚡ NEXT STEPS:</strong>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Verify transaction reference in your mobile money records</li>
                <li>Confirm payment receipt (GHS 100.00)</li>
                <li>Generate 12-month premium activation coupon code</li>
                <li>Send activation code to user's email: ${data.userEmail}</li>
              </ol>
            </div>

            <div class="footer">
              <p><strong>YCKF Premium Subscription System</strong></p>
              <p>Automated payment verification notification</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="font-size: 11px; color: #999;">
                This is an automated email from the YCKF Mobile App payment system.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {


        // ⭐ Get user data from authService
       const userData = await authService.getCurrentUser();
  
       // ⭐ ADD DEBUGGING
        console.log('📞 Payment Screen - User data:', JSON.stringify(userData, null, 2));
  
      // ⭐ Get user data from authService
      // const userData = await authService.getCurrentUser();
      const userEmail = userData?.email || 'unknown@example.com';
      const userPhone = (userData as any)?.phoneNumber || (userData as any)?.phone_number || 'Not provided';
      
      // ⭐ ADD MORE DEBUGGING
       console.log('📧 Payment - User Email:', userEmail);
       console.log('📱 Payment - User Phone:', userPhone);
      // Prepare submission data
      const submissionData = {
        paymentMethod: paymentMethod || 'Mobile Money (GHS)',
        amount: amount || 'GHS 100.00',
        network,
        transactionRef: transactionRef.trim(),
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim() || 'Not provided',
        userEmail,        // ⭐ User's registered email
        userPhone,        // ⭐ User's registered phone
        submittedAt: new Date().toISOString(),
        hasScreenshot: !!screenshot,
      };

      // Generate email HTML
      const emailHTML = generateEmailHTML(submissionData);

      // Prepare payload for backend
      const payload = {
        to: ['yckfadmin@youngcyberknightsfoundation.org', 'mypracticalworks@gmail.com'],
        subject: `💰 Payment Confirmation - ${submissionData.transactionRef}`,
        html: emailHTML,
        screenshot: screenshot || null,
        metadata: {
          transactionRef: submissionData.transactionRef,
          network: submissionData.network,
          userEmail: submissionData.userEmail,
          userPhone: submissionData.userPhone,  // ⭐ Add to metadata
        }
      };

      console.log('📧 Sending payment confirmation to admin:', submissionData.transactionRef);

      // Send to backend
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Payment confirmation sent successfully');

        // Navigate to success screen
        navigation.replace('PaymentSubmitted', {
          transactionRef: transactionRef.trim(),
        });
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('❌ Payment confirmation submission error:', error);
      Alert.alert(
        'Submission Error',
        'Failed to submit payment confirmation. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Confirmation</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>
            Confirm your Mobile Money payment
          </Text>
          <Text style={styles.instructionText}>
            After submitting, your transaction reference will be sent to YCKF for verification.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Payment Method (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>
                {paymentMethod || 'Mobile Money (GHS)'}
              </Text>
            </View>
          </View>

          {/* Amount (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>
                {amount || 'GHS 100.00'}
              </Text>
            </View>
          </View>

          {/* Network Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Network</Text>
            <View style={styles.networkButtons}>
              {['MTN', 'Telecel', 'AirtelTigo'].map((net) => (
                <TouchableOpacity
                  key={net}
                  style={[
                    styles.networkButton,
                    network === net && styles.networkButtonActive,
                  ]}
                  onPress={() => {
                    setNetwork(net);
                    setErrors({ ...errors, network: '' });
                  }}
                >
                  <Text
                    style={[
                      styles.networkButtonText,
                      network === net && styles.networkButtonTextActive,
                    ]}
                  >
                    {net}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.network ? (
              <Text style={styles.errorText}>{errors.network}</Text>
            ) : (
              <Text style={styles.helperText}>
                Select network (MTN / Telecel / AirtelTigo)
              </Text>
            )}
          </View>

          {/* Transaction Reference ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Transaction Reference ID</Text>
            <TextInput
              style={[styles.input, errors.transactionRef && styles.inputError]}
              placeholder="e.g., MTN-TRX-8H3K2T"
              value={transactionRef}
              onChangeText={(text) => {
                setTransactionRef(text);
                setErrors({ ...errors, transactionRef: '' });
              }}
              autoCapitalize="characters"
            />
            {errors.transactionRef ? (
              <Text style={styles.errorText}>{errors.transactionRef}</Text>
            ) : null}
          </View>

          {/* Payer Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payer Name</Text>
            <TextInput
              style={[styles.input, errors.payerName && styles.inputError]}
              placeholder="e.g., John Doe"
              value={payerName}
              onChangeText={(text) => {
                setPayerName(text);
                setErrors({ ...errors, payerName: '' });
              }}
              autoCapitalize="words"
            />
            {errors.payerName ? (
              <Text style={styles.errorText}>{errors.payerName}</Text>
            ) : null}
          </View>

          {/* Payer Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payer Phone (optional)</Text>
            <TextInput
              style={[styles.input, errors.payerPhone && styles.inputError]}
              placeholder="e.g., +233 55 000 0000"
              value={payerPhone}
              onChangeText={(text) => {
                setPayerPhone(text);
                setErrors({ ...errors, payerPhone: '' });
              }}
              keyboardType="phone-pad"
            />
            {errors.payerPhone ? (
              <Text style={styles.errorText}>{errors.payerPhone}</Text>
            ) : null}
          </View>

          {/* Screenshot Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Upload Screenshot (Optional)</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImage}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>
                {screenshot ? 'Screenshot Uploaded ✓' : 'Tap to upload (JPG/PNG)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Notice */}
        <View style={styles.emailNotice}>
          <Text style={styles.emailNoticeText}>
            Submissions are emailed to:{'\n'}
            <Text style={styles.emailAddress}>
              yckfadmin@youngcyberknightsfoundation.org
            </Text>
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
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
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  instructionBox: {
    backgroundColor: '#EFF6FF',
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  readOnlyInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readOnlyText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  networkButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  networkButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  networkButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  networkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  networkButtonTextActive: {
    color: COLORS.primary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emailNotice: {
    backgroundColor: '#FEF3C7',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  emailNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  emailAddress: {
    fontWeight: '700',
    color: '#92400E',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaymentConfirmationScreen;