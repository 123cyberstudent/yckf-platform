// ============================================
// FILE: src/screens/Wallet/MyOrdersScreen.tsx
// List of the user's orders
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT } from '../../utils/constants';
import { formatMoney, formatCredits } from '../../utils/money';
import ScreenHeader from '../../components/common/ScreenHeader';
import OrdersService, { OrderSummary } from '../../services/OrdersService';

const statusColor: Record<string, string> = {
  CREATED: COLORS.accent,
  PENDING_PAYMENT: COLORS.accent,
  PAID: COLORS.primary,
  FULFILLED: COLORS.secondary,
  FAILED: COLORS.error,
  CANCELLED: COLORS.text.secondary,
  EXPIRED: COLORS.text.secondary,
  REFUNDED: COLORS.error,
  PARTIALLY_REFUNDED: COLORS.error,
};

const statusLabel: Record<string, string> = {
  CREATED: 'Created',
  PENDING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  FULFILLED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
};

const MyOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setIsLoading(true);
    try {
      const items = await OrdersService.listOrders(100);
      setOrders(items);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="My Orders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="My Orders" />
      <FlatList
        data={orders}
        keyExtractor={(item) => item.orderNumber}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(false)} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.text.light} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Your course and credit purchases will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] || COLORS.text.secondary) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor[item.status] || COLORS.text.secondary }]}>
                  {statusLabel[item.status] || item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.productName}>
              {item.items.map((i) => i.productName).join(', ')}
            </Text>
            <View style={styles.orderFooter}>
              <Text style={styles.orderType}>{item.orderType === 'COURSE' ? 'Course' : 'Credit package'}</Text>
              <Text style={styles.orderTotal}>
                {item.appliedCode ? `${item.appliedCode} · ` : ''}
                {formatMoney(item.totalAmount)}
              </Text>
            </View>
            <Text style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...LAYOUT.shadows.small,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.secondary,
    flex: 1,
  },
  statusBadge: {
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  orderType: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.text.light,
    marginTop: SPACING.xs,
  },
});

export default MyOrdersScreen;
