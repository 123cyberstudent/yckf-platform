import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Ionicons } from '@expo/vector-icons';

// Components
import Button from '../components/common/Button';
import Input from '../components/common/Input';

// Services
import EmailService from '../services/EmailService';
import WhatsAppService from '../services/WhatsAppService';

// Contexts
import { useApp } from '../contexts/AppContext';

// Utils
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  SUCCESS_MESSAGES,
} from '../utils/constants';
// Backend API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';

// Types
import { ContactForm } from '../types';

// Validation schema
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email'),
  message: yup
    .string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters'),
});

const ContactFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ContactForm>({
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  const submitViaEmail = async (data: ContactForm) => {
  try {
    console.log('📧 Sending contact message to backend...');
    
    const response = await fetch(`${API_URL}/api/email/contact-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Contact message sent successfully');
      return true;
    } else {
      console.error('❌ Backend error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Email submission failed:', error);
    return false;
  }
};

  const submitViaWhatsApp = async (data: ContactForm) => {
  try {
    // Format message for WhatsApp
    const message = `
*YCKF Contact Form Message*

*Name:* ${data.name}
*Email:* ${data.email}

*Message:*
${data.message}

---
Sent via YCKF Mobile App
    `.trim();

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with pre-filled message to admin
    const whatsappUrl = `https://wa.me/233505313578?text=${encodedMessage}`;
    
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
      return false;
    }
  } catch (error) {
    console.error('WhatsApp submission failed:', error);
    return false;
  }
};
const onSubmit = async (data: ContactForm) => {
  if (!state.isOnline) {
    Alert.alert(
      'No Internet Connection',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Show options: Email or WhatsApp
  Alert.alert(
    'Send Message',
    'Choose how you would like to send your message:',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: '📧 Email',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const success = await submitViaEmail(data);
            
            if (success) {
              Alert.alert(
                'Success! ✅',
                'Your message has been sent successfully to YCKF via email. We will respond within 24-48 hours.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      reset();
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                'Error',
                'Failed to send message via email. Please try WhatsApp or contact us directly.',
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.error('Email error:', error);
            Alert.alert(
              'Error',
              'An error occurred. Please try again.',
              [{ text: 'OK' }]
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      },
      {
        text: '💬 WhatsApp',
        onPress: async () => {
          try {
            const success = await submitViaWhatsApp(data);
            
            if (success) {
              // Give user time to send the WhatsApp message
              setTimeout(() => {
                Alert.alert(
                  'WhatsApp Opened',
                  'Your message has been prepared in WhatsApp. Please review and tap Send to complete.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        reset();
                        navigation.goBack();
                      },
                    },
                  ]
                );
              }, 1000);
            }
          } catch (error) {
            console.error('WhatsApp error:', error);
            Alert.alert(
              'Error',
              'Could not open WhatsApp. Please try email instead.',
              [{ text: 'OK' }]
            );
          }
        },
      },
    ]
  );
};

  const openWebsite = () => {
    Linking.openURL('https://youngcyberknightsfoundation.org');
  };

  const sendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const openWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=233505313578');
  };

  const makeCall = () => {
    Linking.openURL('tel:+233505313578');
  };

  return (
  <View style={styles.container}>
    {/* Back Button Header - FIXED AT TOP */}
    <View style={styles.headerTop}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>

    {/* Scrollable Content */}
    <ScrollView 
  showsVerticalScrollIndicator={false}
  bounces={true}
  scrollEventThrottle={16}
  contentContainerStyle={{ paddingBottom: 100 }}
  keyboardShouldPersistTaps="handled"
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={21}
>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Contact YCKF</Text>
            <Text style={styles.subtitle}>
              Get in touch with our team. We're here to help with any questions or concerns.
            </Text>
          </View>

          {/* Founder Profile Card */}
          <View style={styles.founderCard}>
            <Text style={styles.founderCardTitle}>Meet Our Founder</Text>
            
            <View style={styles.founderContent}>
              {/* Founder Image */}
              <View style={styles.founderImageContainer}>
                <Image
                  source={require('../../assets/images/founder.png')}
                  style={styles.founderImage}
                  resizeMode="cover"
                />
              </View>

              {/* Founder Info */}
              <View style={styles.founderInfo}>
                <Text style={styles.founderName}>
                  Bright Peter Kwaku Boateng
                </Text>
                <Text style={styles.founderTitle}>
                  Founder & CEO, YCKF
                </Text>
                <Text style={styles.founderDescription}>
                  Digital Forensics and Cybercrime Investigator
                </Text>
                <Text style={styles.founderMission}>
                  Leading the fight against cybercrime in Ghana and empowering communities with cybersecurity knowledge and protection.
                </Text>
              </View>
            </View>
          </View>

          {/* Official Links Card */}
      {/* Official Links Card */}
<View style={styles.officialLinksCard}>
  <Text style={styles.officialLinksTitle}>Connect With Us</Text>

  <View style={styles.linkButtonsGrid}>
    {/* Website Button */}
    <TouchableOpacity 
      style={styles.linkButton}
      onPress={openWebsite}
      activeOpacity={0.7}
    >
      <View style={styles.linkButtonIcon}>
        <Ionicons name="globe-outline" size={28} color="#fff" />
      </View>
      <Text style={styles.linkButtonText}>Visit Website</Text>
    </TouchableOpacity>

    {/* Email Button */}
    <TouchableOpacity 
      style={styles.linkButton}
      onPress={() => sendEmail('yckfadmin@youngcyberknightsfoundation.org')}
      activeOpacity={0.7}
    >
      <View style={styles.linkButtonIcon}>
        <Ionicons name="mail-outline" size={28} color="#fff" />
      </View>
      <Text style={styles.linkButtonText}>Send Email</Text>
    </TouchableOpacity>
  </View>
</View>

          {/* Contact Methods Card */}
          {/* Contact Methods Card */}
<View style={styles.contactMethodsCard}>
  <Text style={styles.contactMethodsTitle}>Quick Contact</Text>
  
  <View style={styles.contactMethodsGrid}>
    {/* Call */}
    <TouchableOpacity 
      style={[styles.methodButton, { marginRight: SPACING.sm }]}
      onPress={makeCall}
      activeOpacity={0.7}
    >
      <View style={[styles.methodIconCircle, { backgroundColor: '#dcfce7' }]}>
        <Ionicons name="call" size={28} color={COLORS.secondary} />
      </View>
      <Text style={styles.methodLabel}>Call Us</Text>
    </TouchableOpacity>

    {/* WhatsApp */}
    <TouchableOpacity 
      style={[styles.methodButton, { marginLeft: SPACING.sm }]}
      onPress={openWhatsApp}
      activeOpacity={0.7}
    >
      <View style={[styles.methodIconCircle, { backgroundColor: '#dcfce7' }]}>
        <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
      </View>
      <Text style={styles.methodLabel}>WhatsApp</Text>
    </TouchableOpacity>
  </View>
</View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>📧 Send us a message</Text>
            <Text style={styles.sectionSubtitle}>
              Fill out the form below and we'll get back to you as soon as possible.
            </Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter your full name"
                  error={errors.name?.message}
                  required
                  testID="name-input"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email Address"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  required
                  testID="email-input"
                />
              )}
            />

            <Controller
              control={control}
              name="message"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Message"
                  value={value}
                  onChangeText={onChange}
                  placeholder="How can we help you? Please provide details about your inquiry..."
                  multiline
                  numberOfLines={6}
                  error={errors.message?.message}
                  required
                  testID="message-input"
                />
              )}
            />
          </View>

          {/* Submit Section */}
          <View style={styles.submitSection}>
            <Button
              title={isSubmitting ? 'Sending Message...' : 'Send Message'}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || isSubmitting || !state.isOnline}
              loading={isSubmitting}
              icon="send"
              fullWidth
              size="large"
              testID="submit-button"
            />

            {!state.isOnline && (
              <View style={styles.offlineNotice}>
                <Text style={styles.offlineText}>
                  ⚠️ You're offline. Please connect to the internet to send messages.
                </Text>
              </View>
            )}
          </View>

          {/* Response Time Notice */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>📬 Response Time</Text>
            <Text style={styles.noticeText}>
              We typically respond within 24-48 hours during business days. For urgent
              matters, please call our emergency hotline or use WhatsApp for faster response.
            </Text>
          </View>

          </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
 // Back Button Header
headerTop: {
  paddingHorizontal: SPACING.lg,
  paddingTop: Platform.OS === 'ios' ? 50 : 40,
  paddingBottom: SPACING.md,
  backgroundColor: COLORS.background,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
  zIndex: 1000,
  elevation: 5,
},
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
backButtonText: {
  fontSize: 15,
  fontWeight: '600',
  color: COLORS.primary,
  marginLeft: SPACING.xs,
},
  content: {
  padding: SPACING.md,
  paddingTop: SPACING.xs,
},

  // Header
  header: {
  paddingVertical: SPACING.md,
  alignItems: 'center',
  marginTop: SPACING.sm,
},
 title: {
  fontSize: 22,
  fontWeight: '700',
  color: COLORS.text.primary,
  marginBottom: SPACING.xs,
  textAlign: 'center',
},
 subtitle: {
  fontSize: 14,
  color: COLORS.text.secondary,
  textAlign: 'center',
  lineHeight: 20,
  paddingHorizontal: SPACING.md,
},

  // Founder Card
 founderCard: {
  backgroundColor: COLORS.surface,
  borderRadius: 16,
  padding: SPACING.lg,
  marginBottom: SPACING.lg,
  elevation: 2,
},
  founderCardTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: COLORS.text.primary,
  marginBottom: SPACING.md,
  textAlign: 'center',
},
  founderContent: {
    alignItems: 'center',
  },
 founderImageContainer: {
  width: 100,
  height: 100,
  borderRadius: 50,
  overflow: 'hidden',
  marginBottom: SPACING.md,
  borderWidth: 3,
  borderColor: COLORS.primary,
  elevation: 3,
},
  founderImage: {
    width: '100%',
    height: '100%',
  },
  founderInfo: {
    alignItems: 'center',
  },
 founderName: {
  fontSize: 17,
  fontWeight: '700',
  color: COLORS.text.primary,
  textAlign: 'center',
  marginBottom: SPACING.xs,
},
 founderTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: COLORS.primary,
  textAlign: 'center',
  marginBottom: SPACING.xs,
},
  founderDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  founderMission: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
  },

  // Official Links Card
 officialLinksCard: {
  backgroundColor: COLORS.primary,
  borderRadius: 16,
  padding: SPACING.md,
  marginBottom: SPACING.lg,
  elevation: 2,
},
 officialLinksTitle: {
  fontSize: 17,
  fontWeight: '700',
  color: COLORS.text.white,
  marginBottom: SPACING.md,
},
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  linkContent: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    fontWeight: '500',
  },
  linkValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: SPACING.sm,
  },

  // Contact Methods Card
  contactMethodsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    elevation: 2,
  },
  contactMethodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  contactMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  methodValue: {
  fontSize: 12,
  color: COLORS.text.secondary,
  textAlign: 'center',
  marginTop: 2,
},

  // Form
  formSection: {
    marginBottom: SPACING.xl,
  },
 sectionTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: COLORS.text.primary,
  marginBottom: SPACING.sm,
},
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  // Submit
  submitSection: {
    paddingVertical: SPACING.lg,
  },
  offlineNotice: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  offlineText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Notice Card
  noticeCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  noticeText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  // Link Buttons Grid (NEW)
linkButtonsGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: SPACING.md,
},
linkButton: {
  flex: 1,
  alignItems: 'center',
  padding: SPACING.md,
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.3)',
},
linkButtonIcon: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: 'rgba(255,255,255,0.25)',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: SPACING.sm,
},
linkButtonText: {
  fontSize: 13,
  fontWeight: '600',
  color: COLORS.text.white,
  textAlign: 'center',
},
});

export default ContactFormScreen;