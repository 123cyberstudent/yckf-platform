import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import Button from '../components/common/Button';
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/youngcyberknightsfoundation',
  twitter: 'https://twitter.com/youngcyberknights',
  instagram: 'https://www.instagram.com/youngcyberknightsfoundation',
  linkedin: 'https://www.linkedin.com/company/youngcyberknightsfoundation',
};

const getFullUrl = (path: string) => {
  const base = APP_CONFIG.website.endsWith('/') ? APP_CONFIG.website : `${APP_CONFIG.website}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
};

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'Your device cannot open this link.');
      }
    } catch (err) {
      console.error('Open URL failed', err);
      Alert.alert('Error', 'Failed to open link.');
    }
  };

  const openWebsite = () => {
    openUrl(APP_CONFIG.website);
  };

  const openEmail = () => {
    openUrl('mailto:yckfadmin@youngcyberknightsfoundation.org');
  };

  const openPhone = () => {
    openUrl('tel:+233505313578');
  };

  const openWhatsApp = () => {
    openUrl('whatsapp://send?phone=233505313578');
  };

  const openSocial = (key: keyof typeof SOCIAL_LINKS) => {
    const url = SOCIAL_LINKS[key];
    openUrl(url);
  };

  const openPrivacyPolicy = () => {
    openUrl(getFullUrl('privacy-policy'));
  };

  const openTermsOfService = () => {
    openUrl(getFullUrl('terms-of-service'));
  };

  return (
    <View style={styles.container}>
      {/* Back Button Header - FIXED AT TOP */}
      <View style={styles.header}>
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        <View style={styles.content} pointerEvents="box-none">

          {/* Logo Section - Filled Circle with Tiny Border */}
          <View style={styles.logoSection} pointerEvents="box-none">
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/images/companylogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>{APP_CONFIG.name}</Text>
            <Text style={styles.version}>Version {APP_CONFIG.version}</Text>
          </View>

          {/* Mission Section */}
          <View style={styles.section} pointerEvents="box-none">
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.paragraph}>
              Young Cyber Knights Foundation (YCKF) is dedicated to protecting individuals
              and organizations from cyber threats. We provide education, support, and
              resources to combat cybercrime and promote digital safety.
            </Text>
          </View>

          {/* What We Do Section */}
          <View style={styles.section} pointerEvents="box-none">
            <Text style={styles.sectionTitle}>What We Do</Text>

            <View style={styles.featureItem} pointerEvents="box-none">
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Cybercrime Reporting</Text>
                <Text style={styles.featureText}>
                  Easy-to-use platform for reporting cybercrime incidents
                </Text>
              </View>
            </View>

            <View style={styles.featureItem} pointerEvents="box-none">
              <Ionicons name="school" size={24} color={COLORS.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Education & Awareness</Text>
                <Text style={styles.featureText}>
                  Programs to educate the public about cyber threats and prevention
                </Text>
              </View>
            </View>

            <View style={styles.featureItem} pointerEvents="box-none">
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Victim Support</Text>
                <Text style={styles.featureText}>
                  Assistance and guidance for cybercrime victims
                </Text>
              </View>
            </View>

            <View style={styles.featureItem} pointerEvents="box-none">
              <Ionicons name="globe" size={24} color={COLORS.primary} />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Advocacy</Text>
                <Text style={styles.featureText}>
                  Working with authorities to strengthen cybersecurity policies
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section} pointerEvents="box-none">
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.contactSubtitle}>
              Choose your preferred method to reach us
            </Text>

            <TouchableOpacity style={styles.contactButton} onPress={openWebsite}>
              <View style={styles.contactButtonIcon}>
                <Ionicons name="globe-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.contactButtonContent}>
                <Text style={styles.contactButtonTitle}>Visit Website</Text>
                <Text style={styles.contactButtonDesc}>Learn more about YCKF</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
              <View style={styles.contactButtonIcon}>
                <Ionicons name="mail-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.contactButtonContent}>
                <Text style={styles.contactButtonTitle}>Send Email</Text>
                <Text style={styles.contactButtonDesc}>Contact us via email</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={openPhone}>
              <View style={styles.contactButtonIcon}>
                <Ionicons name="call-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.contactButtonContent}>
                <Text style={styles.contactButtonTitle}>Call Us</Text>
                <Text style={styles.contactButtonDesc}>Speak with our team</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={openWhatsApp}>
              <View style={styles.contactButtonIcon}>
                <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
              </View>
              <View style={styles.contactButtonContent}>
                <Text style={styles.contactButtonTitle}>WhatsApp Chat</Text>
                <Text style={styles.contactButtonDesc}>Quick messaging support</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
            </TouchableOpacity>
          </View>

          {/* Social Media Section */}
          <View style={styles.section} pointerEvents="box-none">
            <Text style={styles.sectionTitle}>Follow Us</Text>
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('facebook')}
                accessibilityLabel="Open Facebook"
              >
                <Ionicons name="logo-facebook" size={28} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('twitter')}
                accessibilityLabel="Open Twitter"
              >
                <Ionicons name="logo-twitter" size={28} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('instagram')}
                accessibilityLabel="Open Instagram"
              >
                <Ionicons name="logo-instagram" size={28} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openSocial('linkedin')}
                accessibilityLabel="Open LinkedIn"
              >
                <Ionicons name="logo-linkedin" size={28} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info Section */}
          <View style={styles.section} pointerEvents="box-none">
            <Text style={styles.sectionTitle}>App Information</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                This app is designed to make cybercrime reporting faster and more accessible.
                All reports are securely transmitted to YCKF and relevant authorities.
              </Text>
            </View>

            <Button
              title="Visit Our Website"
              onPress={openWebsite}
              variant="primary"
              icon="open-outline"
              fullWidth
            />
          </View>

          {/* Legal Section */}
          <View style={styles.legalSection} pointerEvents="box-none">
            <Text style={styles.legalText}>© 2026 Young Cyber Knights Foundation</Text>
            <Text style={styles.legalText}>All rights reserved</Text>
            <Text style={styles.legalText}>Designed & Developed by: Bienvenu Gbeti DevPro</Text>

            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={openPrivacyPolicy}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>

              <Text style={styles.legalSeparator}>•</Text>

              <TouchableOpacity onPress={openTermsOfService}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
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
  header: {
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    flex: 1,
  },
  // Logo Section - Total Circle Fill with Tiny Border
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  version: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.text.secondary,
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  paragraph: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },

  // Features
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  featureContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  featureText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  // Contact Buttons
  contactSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  contactButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contactButtonContent: {
    flex: 1,
  },
  contactButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  contactButtonDesc: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // Social Media
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Info Card
  infoCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSizes.md,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },

  // Legal
  legalSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  legalText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.light,
    marginBottom: SPACING.xs,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  legalLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.text.light,
    marginHorizontal: SPACING.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  // Footer
  footer: {
    height: 20,
  },
});

export default AboutScreen;