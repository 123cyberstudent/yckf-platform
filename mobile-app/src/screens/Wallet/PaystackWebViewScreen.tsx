// ============================================
// FILE: src/screens/Wallet/PaystackWebViewScreen.tsx
// Secure Paystack checkout inside the app
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../utils/constants';
import OrdersService from '../../services/OrdersService';
import SubscriptionService from '../../services/SubscriptionService';
import { OrderContinueTarget, RootStackParamList } from '../../types';

type Params = {
  orderNumber: string;
  authorizationUrl: string;
  mode?: 'order' | 'subscription';
  continueTo?: OrderContinueTarget;
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

const DONE_STATUSES = new Set(['FULFILLED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED']);

const PaystackWebViewScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const { orderNumber, authorizationUrl, mode, continueTo } = route.params ?? ({} as Params);
  const isSubscription = mode === 'subscription';

  const [failed, setFailed] = useState(false);
  const pollCount = useRef(0);
  const finishedRef = useRef(false);

  const finish = useCallback(
    (success: boolean, message: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      navigation.navigate('OrderResult', { success, orderNumber, message, continueTo });
    },
    [navigation, orderNumber, continueTo]
  );

  const pollOrder = useCallback(async () => {
    if (finishedRef.current) return;
    try {
      const order = await OrdersService.getOrder(orderNumber);
      if (DONE_STATUSES.has(order.status)) {
        finish(order.status === 'FULFILLED' || order.status === 'PAID', `Order ${order.status}`);
        return true;
      }
    } catch (err) {
      // transient network errors are ignored; polling continues
    }
    return false;
  }, [orderNumber, finish]);

  const pollSubscription = useCallback(async () => {
    if (finishedRef.current) return;
    try {
      const status = await SubscriptionService.getStatus();
      if (status.isPremium) {
        finish(true, 'Payment successful');
        return true;
      }
    } catch (err) {
      // transient network errors are ignored; polling continues
    }
    return false;
  }, [finish]);

  const poll = useCallback(() => (isSubscription ? pollSubscription() : pollOrder()), [isSubscription, pollSubscription, pollOrder]);

  useEffect(() => {
    const timer = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        clearInterval(timer);
        if (!finishedRef.current) {
          finish(false, 'Payment is still processing. Check your orders for the latest status.');
        }
        return;
      }
      await poll();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll, finish]);

  const handleNavigationChange = (navState: any) => {
    const url = String(navState.url || '');
    if (navState.url && navState.url.startsWith('http')) {
      const hasReference = url.includes('reference=');
      const isCallback =
        url.includes('/paystack/return') ||
        url.includes('/paystack-callback') ||
        hasReference;
      if (isCallback && !finishedRef.current) {
        // The provider is redirecting back; poll now and keep the webview open.
        poll();
      }
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel payment?', 'Your order will be cancelled if you continue.', [
      { text: 'Keep paying', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          if (!isSubscription) {
            try {
              await OrdersService.cancelOrder(orderNumber);
            } catch (err) {
              // order may already be processing; still navigate away
            }
          }
          finish(false, 'Payment cancelled');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel} hitSlop={12}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.statusBar}>
        <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
        <Text style={styles.statusText}>Paystack · {orderNumber}</Text>
      </View>

      <View style={styles.webViewContainer}>
        {failed ? (
          <View style={styles.failedBox}>
            <Ionicons name="cloud-offline" size={40} color={COLORS.text.light} />
            <Text style={styles.failedTitle}>Payment page failed to load</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setFailed(false)}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            key={authorizationUrl}
            source={{ uri: authorizationUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationChange}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.webLoadingText}>Opening secure payment page...</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            textZoom={100}
            overScrollMode="never"
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  statusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  webLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  webLoadingText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  failedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.sm,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default PaystackWebViewScreen;
