// ============================================
// FILE: src/screens/Wallet/CheckoutScreen.tsx
// Order creation + Paystack payment
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney, formatCredits } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import OrdersService, { OrderSummary } from '../../services/OrdersService';
import { RootStackParamList } from '../../types';

type CheckoutParams = {
  orderType: 'COURSE';
  productId: number;
  productName: string;
  price: number;
};

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<Record<string, CheckoutParams>, string>>();
  const { orderType, productId, productName, price } = route.params ?? ({} as CheckoutParams);

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [creating, setCreating] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrderFor = useCallback(
    async (promoCode?: string) => {
      setCreating(true);
      setError(null);
      try {
        const created = await OrdersService.createOrder({
          orderType,
          productId,
          promoCode: promoCode || undefined,
        });
        setOrder(created);
        setPromoApplied(!!created.appliedCode);
        if (created.appliedCode) setPromoInput(created.appliedCode);
      } catch (err: any) {
        setError(err?.message || 'Failed to create order');
        setOrder(null);
      } finally {
        setCreating(false);
      }
    },
    [orderType, productId]
  );

  useEffect(() => {
    createOrderFor();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPromo = () => {
    const code = promoInput.trim();
    if (!code) return;
    createOrderFor(code);
  };

  const removePromo = () => {
    setPromoInput('');
    setPromoApplied(false);
    createOrderFor();
  };

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);
    try {
      const { payment } = await OrdersService.payWithPaystack(order.orderNumber);
      navigation.navigate('PaystackWebView', {
        orderNumber: order.orderNumber,
        authorizationUrl: payment.authorizationUrl,
      });
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const totalDisplay = formatMoney(order?.totalAmount ?? 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Checkout" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Product summary */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Order Summary</Text>
            <View style={styles.productRow}>
              <View style={styles.productIcon}>
                <Ionicons name="school" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{productName}</Text>
                <Text style={styles.productType}>Course</Text>
              </View>
              <Text style={styles.productPrice}>{formatMoney(price)}</Text>
            </View>

            {creating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Building your order...</Text>
              </View>
            ) : order ? (
              <>
                <View style={styles.totals}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>{formatMoney(order.subtotalAmount)}</Text>
                  </View>
                  {order.discountAmount > 0 ? (
                    <View style={styles.totalRow}>
                      <Text style={styles.discountLabel}>
                        Discount{order.appliedCode ? ` (${order.appliedCode})` : ''}
                      </Text>
                      <Text style={styles.discountValue}>−{formatMoney(order.discountAmount)}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.totalRow, styles.grandRow]}>
                    <Text style={styles.grandLabel}>Total to pay</Text>
                    <Text style={styles.grandValue}>{totalDisplay}</Text>
                  </View>
                  {order.bonusCredits > 0 ? (
                    <Text style={styles.bonusNote}>You will also receive {formatCredits(order.bonusCredits)} bonus</Text>
                  ) : null}
                </View>

                {/* Promo code */}
                <View style={styles.promoBox}>
                  {promoApplied && order.appliedCode ? (
                    <View style={styles.promoApplied}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
                      <Text style={styles.promoAppliedText}>Code {order.appliedCode} applied</Text>
                      <TouchableOpacity onPress={removePromo} hitSlop={12}>
                        <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={styles.promoInput}
                        placeholder="Promo / referral code"
                        placeholderTextColor={COLORS.text.light}
                        value={promoInput}
                        onChangeText={setPromoInput}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity style={styles.promoApply} onPress={applyPromo} disabled={!promoInput.trim()}>
                        <Text style={styles.promoApplyText}>Apply</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Payment method */}
                <Text style={styles.cardLabel}>Payment Method</Text>
                <TouchableOpacity style={[styles.methodRow, styles.methodRowSelected]}>
                  <View style={styles.methodIcon}>
                    <Ionicons name="card" size={20} color="#00C3F7" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Paystack</Text>
                    <Text style={styles.methodSubtitle}>Mobile money (MTN, Telcel, AirtelTigo), card & bank</Text>
                  </View>
                  <Ionicons name="radio-button-on" size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={`Pay ${formatMoney(order?.totalAmount ?? 0)}`}
            onPress={handlePay}
            loading={paying}
            disabled={!order || creating || paying}
            size="large"
            fullWidth
            icon="lock-closed"
            style={styles.payButton}
          />

          <Text style={styles.terms}>
            By paying you agree to YCKF terms. Orders expire after 30 minutes if unpaid.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    ...LAYOUT.shadows.small,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  productType: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  totals: {
    backgroundColor: '#F9FAFB',
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  discountLabel: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  grandValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bonusNote: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  promoBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
  },
  promoApply: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.borderRadius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  promoApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  promoApplied: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#ECFDF5',
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.sm,
  },
  promoAppliedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  methodRowSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  methodSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: LAYOUT.borderRadius.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },
  payButton: {
    marginTop: SPACING.lg,
  },
  terms: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 16,
  },
});

export default CheckoutScreen;
