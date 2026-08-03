// ============================================
// FILE: src/screens/Wallet/PlansScreen.tsx
// YCKF Premium subscription plans + status + checkout
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import AuthService from '../../services/AuthService';
import SubscriptionService, {
  SubscriptionPlan,
  SubscriptionStatus,
  PromoDefinition,
} from '../../services/SubscriptionService';
import { RootStackParamList } from '../../types';

const PlansScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promo, setPromo] = useState<{ show: boolean; promo?: PromoDefinition }>({ show: false });
  const [promoPlacement, setPromoPlacement] = useState<'signup' | 'subscriptions'>('signup');
  const [promoDismissed, setPromoDismissed] = useState(false);

  // Checkout state
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<{ checked: boolean; valid: boolean; message?: string }>({ checked: false, valid: false });
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const impressionTracked = useRef<string | null>(null);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setIsLoading(true);
    try {
      const token = await AuthService.getToken();
      const isAuth = Boolean(token);
      setLoggedIn(isAuth);

      const [planList] = await Promise.all([SubscriptionService.listPlans()]);
      setPlans(planList);

      if (isAuth) {
        try {
          const s = await SubscriptionService.getStatus();
          setStatus(s);
        } catch {
          setStatus(null);
        }
        const promoData = await SubscriptionService.getEligiblePromo('subscriptions');
        setPromoPlacement('subscriptions');
        setPromo({ show: promoData.show, promo: promoData.promo });
      } else {
        const promoData = await SubscriptionService.getEligiblePromo('signup');
        setPromoPlacement('signup');
        setPromo({ show: promoData.show, promo: promoData.promo });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  // Track promo impression once per session
  useFocusEffect(
    useCallback(() => {
      if (promo.show && promo.promo && impressionTracked.current !== promo.promo.key) {
        impressionTracked.current = promo.promo.key;
        SubscriptionService.trackPromoEngagement({
          promoKey: promo.promo.key,
          placement: promoPlacement,
          action: 'impression',
        }).catch(() => undefined);
      }
    }, [promo, promoPlacement])
  );

  const dismissPromo = useCallback(() => {
    setPromoDismissed(true);
    if (promo.promo) {
      SubscriptionService.trackPromoEngagement({
        promoKey: promo.promo.key,
        placement: promoPlacement,
        action: 'dismiss',
      }).catch(() => undefined);
    }
  }, [promo, promoPlacement]);

  const handleBuy = useCallback(
    (plan: SubscriptionPlan) => {
      if (!loggedIn) {
        Alert.alert('Log in required', 'Please create an account or log in to subscribe.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log in', onPress: () => navigation.navigate('Login' as never) },
        ]);
        return;
      }
      setReferralCode('');
      setReferralValid({ checked: false, valid: false });
      setCheckoutPlan(plan);
    },
    [loggedIn, navigation]
  );

  const handleValidateReferral = async () => {
    const code = referralCode.trim();
    if (!code) {
      setReferralValid({ checked: true, valid: false, message: 'Enter a referral code' });
      return;
    }
    setCheckingReferral(true);
    try {
      const result = await SubscriptionService.validateReferral(code);
      setReferralValid({
        checked: true,
        valid: result.valid,
        message: result.valid ? (result.ownerName ? `Referred by ${result.ownerName}` : 'Valid referral code') : result.message,
      });
    } catch (err: any) {
      setReferralValid({ checked: true, valid: false, message: err?.message || 'Invalid referral code' });
    } finally {
      setCheckingReferral(false);
    }
  };

  const handleProceed = async () => {
    if (!checkoutPlan) return;
    setInitializing(true);
    try {
      const result = await SubscriptionService.initialize({
        planCode: checkoutPlan.code,
        referralCode: referralCode.trim() && referralValid.valid ? referralCode.trim() : undefined,
        platform: 'MOBILE',
      });
      setCheckoutPlan(null);
      navigation.navigate('PaystackWebView', {
        orderNumber: result.reference,
        authorizationUrl: result.authorizationUrl,
        mode: 'subscription',
        reference: result.reference,
        continueTo: { screen: 'Root' },
      });
    } catch (err: any) {
      Alert.alert('Checkout failed', err?.message || 'Could not start payment. Please try again.');
    } finally {
      setInitializing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Premium Plans" showBack={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showPromo = promo.show && promo.promo && !promoDismissed;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Premium Plans" subtitle="Unlock everything YCKF offers" showBack={false} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Promo banner */}
        {showPromo && promo.promo ? (
          <View style={styles.promoCard}>
            <View style={styles.promoIcon}>
              <Ionicons name="sparkles" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.promoBody}>
              <Text style={styles.promoTitle}>{promo.promo.title}</Text>
              <Text style={styles.promoMessage}>{promo.promo.message}</Text>
              {promoPlacement === 'signup' ? (
                <TouchableOpacity
                  style={styles.promoCta}
                  onPress={() => navigation.navigate('Register' as never)}
                >
                  <Text style={styles.promoCtaText}>{promo.promo.ctaLabel}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.promoNote}>Added automatically on your first plan</Text>
              )}
            </View>
            <TouchableOpacity style={styles.promoClose} onPress={dismissPromo} hitSlop={10}>
              <Ionicons name="close" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Subscription status */}
        {loggedIn && status ? (
          <View style={[styles.statusCard, status.isPremium ? styles.statusCardActive : styles.statusCardInactive]}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={status.isPremium ? 'shield-checkmark' : 'lock-closed'}
                size={26}
                color={status.isPremium ? '#16A34A' : '#D97706'}
              />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {status.isPremium ? 'Premium active' : 'Not on Premium'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {status.isPremium
                  ? `Expires ${status.premiumExpiresAt ? new Date(status.premiumExpiresAt).toLocaleDateString() : ''}`
                  : 'Choose a plan below to upgrade'}
              </Text>
              {status.isPremium && status.plan ? (
                <Text style={styles.statusPlan}>{status.plan.name}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Plans */}
        <Text style={styles.sectionTitle}>Choose your plan</Text>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={40} color={COLORS.text.light} />
            <Text style={styles.emptyText}>No plans are available right now.</Text>
          </View>
        ) : (
          plans.map((plan) => {
            const isBest = plan.code === 'annual';
            return (
              <View key={plan.code} style={[styles.planCard, isBest && styles.planCardBest]}>
                {isBest ? (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>Best Value</Text>
                  </View>
                ) : null}
                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <Ionicons name="diamond" size={18} color={isBest ? COLORS.primary : COLORS.text.secondary} />
                    <Text style={styles.planName}>{plan.name}</Text>
                  </View>
                  {plan.description ? (
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  ) : null}
                </View>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>{formatMoney(plan.pricePesewas)}</Text>
                  <Text style={styles.planPeriod}>
                    / {plan.durationValue} {plan.durationUnit.toLowerCase() === 'year' ? 'year' : 'month'}
                    {plan.durationValue > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.buyButton, isBest && styles.buyButtonBest]}
                  onPress={() => handleBuy(plan)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.buyButtonText}>{loggedIn ? 'Get Premium' : 'Sign up to get Premium'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Referral code */}
        {loggedIn && status?.referralCode ? (
          <TouchableOpacity
            style={styles.referralCard}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert('Your referral code', status.referralCode!, [
                { text: 'OK' },
              ])
            }
          >
            <View style={styles.referralIcon}>
              <Ionicons name="gift" size={22} color={COLORS.accent} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralTitle}>Invite friends & earn</Text>
              <Text style={styles.referralCode}>{status.referralCode}</Text>
            </View>
            <Ionicons name="share-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : null}

        {/* Guest CTA */}
        {!loggedIn ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Ready to go Premium?</Text>
            <Text style={styles.guestText}>
              Create a free account to unlock your 12-hour Premium trial and start exploring everything YCKF has to offer.
            </Text>
            <TouchableOpacity
              style={styles.guestButton}
              onPress={() => navigation.navigate('Register' as never)}
            >
              <Text style={styles.guestButtonText}>Create free account</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Checkout modal */}
      <Modal visible={Boolean(checkoutPlan)} transparent animationType="slide" onRequestClose={() => setCheckoutPlan(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Get {checkoutPlan?.name} Premium</Text>
            <Text style={styles.modalSubtitle}>You&apos;ll be redirected to Paystack to complete your secure payment.</Text>

            {checkoutPlan ? (
              <View style={styles.modalPlanRow}>
                <View style={styles.modalPlanInfo}>
                  <Text style={styles.modalPlanName}>{checkoutPlan.name}</Text>
                  {checkoutPlan.description ? (
                    <Text style={styles.modalPlanDesc}>{checkoutPlan.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.modalPlanPrice}>{formatMoney(checkoutPlan.pricePesewas)}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Referral code (optional)</Text>
            <View style={styles.referralRow}>
              <TextInput
                style={styles.referralInput}
                placeholder="YCKF-XXXXXX"
                placeholderTextColor={COLORS.text.light}
                value={referralCode}
                onChangeText={(t) => {
                  setReferralCode(t.toUpperCase());
                  setReferralValid({ checked: false, valid: false });
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.validateButton}
                onPress={handleValidateReferral}
                disabled={checkingReferral || !referralCode.trim()}
              >
                {checkingReferral ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.validateButtonText}>Validate</Text>
                )}
              </TouchableOpacity>
            </View>
            {referralValid.checked ? (
              <Text style={[styles.referralHint, { color: referralValid.valid ? '#16A34A' : COLORS.error }]}>
                {referralValid.message}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCheckoutPlan(null)} disabled={initializing}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proceedButton, (initializing || (referralCode.trim() !== '' && !referralValid.valid)) && styles.proceedButtonDisabled]}
                onPress={handleProceed}
                disabled={initializing || (referralCode.trim() !== '' && !referralValid.valid)}
              >
                {initializing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.proceedButtonText}>Proceed to payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  promoBody: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  promoMessage: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  promoCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginTop: SPACING.sm,
  },
  promoCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  promoNote: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: SPACING.sm,
  },
  promoClose: {
    padding: 4,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  statusCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardInactive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statusPlan: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...LAYOUT.shadows.small,
  },
  planCardBest: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  bestBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderTopRightRadius: LAYOUT.borderRadius.lg - 2,
    borderBottomLeftRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  bestBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planHeader: {
    marginBottom: SPACING.sm,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  planDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  planPrice: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
  },
  planPeriod: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  buyButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buyButtonBest: {
    backgroundColor: COLORS.primary,
  },
  buyButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    ...LAYOUT.shadows.small,
  },
  referralIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  referralCode: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
    letterSpacing: 1,
  },
  guestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  guestText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 19,
  },
  guestButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 13,
    marginTop: SPACING.md,
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  modalPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  modalPlanInfo: {
    flex: 1,
  },
  modalPlanName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalPlanDesc: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  modalPlanPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  referralRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  referralInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },
  validateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  referralHint: {
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  proceedButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default PlansScreen;
