// ============================================
// FILE: src/styles/bookingStyles.ts
// ============================================

import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { COLORS, SPACING, LAYOUT } from '../utils/constants';

const { width, height } = Dimensions.get('window');

export const bookingStyles = StyleSheet.create({
  // Container Styles - FIXED
  container: {
    flex: 1,
    backgroundColor: COLORS.primary, // Blue background to cover top
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },

  // Header Styles - FIXED TO COVER TOP
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerWithBack: {
    justifyContent: 'flex-start',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    marginRight: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Card Styles - IMPROVED PORTABILITY
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: height * 0.7,
    marginTop: -10, // Overlap with header for seamless look
  },

  // Title Styles - COMPACT & CENTERED
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },

  // Specialist Grid - RESPONSIVE & PORTABLE
  specialistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  specialistCard: {
    width: width > 400 ? '48%' : '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  specialistCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  specialistIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  specialistName: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    lineHeight: 18,
    paddingHorizontal: 4,
  },

  // Booking Fee Section - CLEAN & COMPACT
  feeSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  feeAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  feeDuration: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Button Styles - PROMINENT
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Payment Section Styles
  paymentSection: {
    marginBottom: 24,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIconContainer: {
    backgroundColor: '#F97316',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },

  // Mobile Money Providers
  providerGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  providerCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mtnCard: {
    backgroundColor: '#FACC15',
  },
  telcelCard: {
    backgroundColor: '#2563EB',
  },
  airtelCard: {
    backgroundColor: '#DC2626',
  },
  providerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mtnText: {
    color: '#000000',
  },
  telcelText: {
    color: '#FFFFFF',
  },
  airtelText: {
    color: '#FFFFFF',
  },

  // Payment Info
  paymentInfo: {
    backgroundColor: COLORS.divider,
    padding: 12,
    borderRadius: LAYOUT.borderRadius.md,
    marginBottom: 16,
  },
  paymentInfoText: {
    fontSize: 13,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  paymentInfoBold: {
    fontWeight: 'bold',
  },
  paymentNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: LAYOUT.borderRadius.md,
    marginTop: 8,
  },
  paymentNoteText: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },

  // Payment Options Screen Styles
  content: {
    padding: SPACING.lg,
    backgroundColor: '#F5F7FA',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  featuresSection: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  premiumBadgeContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  premiumText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentMethodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  paymentMethodIcon: {
    fontSize: 20,
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  paymentMethodRight: {
    alignItems: 'flex-end',
  },
  paymentMethodAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  totalContainer: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: 0,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  unlockButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 1,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  totalContainerBottom: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: 0,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  totalTextBottom: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // Paystack Section
  paystackSection: {
    marginBottom: 24,
  },
  paystackButton: {
    backgroundColor: '#00C3F7',
    paddingVertical: 14,
    borderRadius: LAYOUT.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paystackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  paystackSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },

  // Warning Banner
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: LAYOUT.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    marginLeft: 8,
  },

  // Form Styles
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Upload Button (for MoMo Screenshot)
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },

  // Screenshot Preview
  screenshotPreview: {
    marginTop: 12,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeScreenshot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },

  // Payment Badge
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  paymentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
  },

  // WhatsApp Contact
  whatsappContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  whatsappText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  whatsappVerified: {
    marginLeft: 'auto',
  },

  // Info Box
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
  },

  // Footer
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerEmail: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Paystack Modal Styles
  paystackModalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  paystackModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  paystackModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 12,
  },
  paystackWebView: {
    flex: 1,
  },


  // iOS Date/Time Picker Modal Styles
  iosPickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iosPickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  iosPickerCancel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  iosPickerConfirm: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
  },
});