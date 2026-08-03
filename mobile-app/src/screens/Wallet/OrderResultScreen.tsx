// ============================================
// FILE: src/screens/Wallet/OrderResultScreen.tsx
// Purchase success / failure screen
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import Button from '../../components/common/Button';
import { OrderContinueTarget } from '../../types';

type Params = {
  success: boolean;
  orderNumber: string;
  message: string;
  continueTo?: OrderContinueTarget;
};

const OrderResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const { success, orderNumber, message, continueTo } = route.params ?? ({} as Params);

  const handleContinue = () => {
    if (!continueTo) return;
    (navigation as any).navigate(continueTo.screen, continueTo.params);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, success ? styles.successIcon : styles.failIcon]}>
          <Ionicons
            name={success ? 'checkmark' : 'close'}
            size={48}
            color={success ? COLORS.secondary : COLORS.error}
          />
        </View>
        <Text style={styles.title}>{success ? 'Payment Successful' : 'Payment Not Completed'}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order</Text>
            <Text style={styles.detailValue}>{orderNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{orderNumber}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          {success
            ? continueTo
              ? 'Your Premium subscription is now active on this account.'
              : 'Credits and course access are applied automatically and may take a moment to appear.'
            : 'You can review your orders or try again from the checkout.'}
        </Text>

        <Button
          title={continueTo && success ? 'Continue' : 'View My Orders'}
          onPress={continueTo && success ? handleContinue : () => navigation.navigate('MyOrders' as never)}
          size="large"
          fullWidth
          icon={continueTo && success ? 'arrow-forward' : 'receipt'}
          style={styles.primaryButton}
        />
        <Button
          title={success ? 'Back to Plans' : 'Try Again'}
          onPress={() => {
            navigation.navigate('Plans' as never);
          }}
          variant="outline"
          size="large"
          fullWidth
          style={styles.secondaryButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.shadows.medium,
  },
  successIcon: {
    borderWidth: 4,
    borderColor: COLORS.secondary,
  },
  failIcon: {
    borderWidth: 4,
    borderColor: COLORS.error,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    ...LAYOUT.shadows.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  note: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: SPACING.xl,
  },
  secondaryButton: {
    marginTop: SPACING.sm,
  },
});

export default OrderResultScreen;
