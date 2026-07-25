// src/screens/SubscriptionTermsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Utils
import { COLORS, SPACING } from '../utils/constants';

const SubscriptionTermsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAcceptAndContinue = () => {
    if (!agreedToTerms) {
      Alert.alert(
        'Agreement Required',
        'Please read and agree to the Terms of Service and Privacy Policy to continue.'
      );
      return;
    }

    // Navigate to payment screen with subscription flag
    // @ts-ignore - Navigation params
    navigation.navigate('PaymentOptions', { fromSubscription: true });
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.logoSmall}>
            {!imageError ? (
              <Image 
                source={require('../../assets/images/companylogo.png')} 
                style={{ width: 50, height: 50, borderRadius: 25 }}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Subscription & Payment</Text>
            <Text style={styles.headerSubtitle}>Policy and Terms</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
          onPress={() => setActiveTab('terms')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
          onPress={() => setActiveTab('privacy')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'terms' ? (
          <View style={styles.contentSection}>
            {/* Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Overview</Text>
              <Text style={styles.paragraph}>
                The Young Cyber Knights Foundation (YCKF) Mobile App provides both{' '}
                <Text style={styles.boldText}>Free Access</Text> and{' '}
                <Text style={styles.boldText}>Paid Access</Text> features. This policy governs 
                subscriptions, payments, renewals, access control, and administrative overrides 
                related to <Text style={styles.boldText}>Paid Access</Text> features.
              </Text>
              <Text style={styles.paragraph}>
                By subscribing, you agree to the terms set out in this Subscription & Payment Policy.
              </Text>
            </View>

            {/* Free Access Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Free Access Features</Text>
              <Text style={styles.paragraph}>
                The following features are available to all users at no cost:
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Emergency Hotline</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Report Cybercrime</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Share Current Location</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Contact YCKF</Text>
                </View>
              </View>
            </View>

            {/* Paid Access Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Paid Access Features</Text>
              <Text style={styles.paragraph}>
                The following features require an active{' '}
                <Text style={styles.boldText}>annual subscription</Text>:
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={20} color="#F57C00" />
                  <Text style={styles.featureText}>Emergency SOS (Voice/Text Park Alert)</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={20} color="#F57C00" />
                  <Text style={styles.featureText}>Find Park</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={20} color="#F57C00" />
                  <Text style={styles.featureText}>Book Expert Consultation</Text>
                </View>
              </View>
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>Subscription Cost:</Text> GHS 100 or USD 9 per year
              </Text>
            </View>

            {/* Payment & Renewal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Payment & Renewal</Text>
              <Text style={styles.paragraph}>
                • Subscriptions are billed annually and renew automatically unless canceled.
              </Text>
              <Text style={styles.paragraph}>
                • You will be notified 7 days before your renewal date.
              </Text>
              <Text style={styles.paragraph}>
                • Payment methods accepted include mobile money, credit/debit cards, and bank transfers.
              </Text>
            </View>

            {/* Cancellation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Cancellation & Refunds</Text>
              <Text style={styles.paragraph}>
                • You may cancel your subscription at any time through the app settings.
              </Text>
              <Text style={styles.paragraph}>
                • No refunds are provided for partial subscription periods.
              </Text>
              <Text style={styles.paragraph}>
                • Access to paid features will continue until the end of your billing period.
              </Text>
            </View>

            {/* Contact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Contact Us</Text>
              <Text style={styles.paragraph}>
                For questions about subscriptions or payments, please contact us at:
              </Text>
              <Text style={styles.paragraph}>
                Email: support@yckf.org{'\n'}
                Phone: +233 XX XXX XXXX
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.contentSection}>
            {/* Privacy Policy Content */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Information We Collect</Text>
              <Text style={styles.paragraph}>
                We collect information you provide directly to us, including your name, email address, 
                phone number, and payment information when you subscribe to our paid services.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
              <Text style={styles.paragraph}>
                We use the information we collect to provide, maintain, and improve our services, 
                process your transactions, send you technical notices and support messages, and 
                respond to your comments and questions.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Information Sharing</Text>
              <Text style={styles.paragraph}>
                We do not share your personal information with third parties except as necessary to 
                provide our services, comply with the law, or protect our rights.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Data Security</Text>
              <Text style={styles.paragraph}>
                We take reasonable measures to help protect your personal information from loss, 
                theft, misuse, unauthorized access, disclosure, alteration, and destruction.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Your Rights</Text>
              <Text style={styles.paragraph}>
                You have the right to access, update, or delete your personal information at any time. 
                You may also opt out of receiving promotional communications from us.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Changes to Privacy Policy</Text>
              <Text style={styles.paragraph}>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Footer with Checkbox and Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I have read and agree to the{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, !agreedToTerms && styles.acceptButtonDisabled]}
          onPress={handleAcceptAndContinue}
          activeOpacity={0.8}
          disabled={!agreedToTerms}
        >
          <Text style={styles.acceptButtonText}>Accept & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
  },
  contentSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Feature List
  featureList: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Footer
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  acceptButton: {
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
  acceptButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: SPACING.xl,
  },
});
export default SubscriptionTermsScreen;