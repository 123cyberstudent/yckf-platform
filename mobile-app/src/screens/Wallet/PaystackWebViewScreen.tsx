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
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView, WebViewNavigation } from 'react-native-webview';
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
  reference?: string;
  continueTo?: OrderContinueTarget;
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

const DONE_STATUSES = new Set(['FULFILLED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED']);

// Paystack checkout is served behind Cloudflare and blocks requests with a
// non-browser User-Agent. Use a real mobile browser UA so the payment page
// loads and stays interactive.
const BROWSER_USER_AGENT = Platform.select({
  android:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  default:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});

const PaystackWebViewScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const { orderNumber, authorizationUrl, mode, reference, continueTo } = route.params ?? ({} as Params);
  const isSubscription = mode === 'subscription';
  // For subscriptions the checkout is keyed by the Paystack reference, which
  // is passed both as `reference` and (from PlansScreen) as `orderNumber`.
  const subscriptionReference = reference || orderNumber;

  const [failed, setFailed] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const pollCount = useRef(0);
  const finishedRef = useRef(false);
  const didLoadOnce = useRef(false);

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
      const payment = await SubscriptionService.getPaymentStatus(subscriptionReference);
      // Terminal subscription statuses that conclude the checkout.
      if (payment.status === 'PAID' || payment.paid) {
        finish(true, 'Payment successful');
        return true;
      }
      if (payment.status === 'FAILED' || payment.status === 'CANCELLED' || payment.status === 'EXPIRED' || payment.status === 'REFUNDED') {
        finish(false, `Payment ${payment.status.replace(/_/g, ' ').toLowerCase()}`);
        return true;
      }
    } catch (err) {
      // transient network errors are ignored; polling continues
    }
    return false;
  }, [subscriptionReference, finish]);

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

  const handleNavigationChange = (navState: WebViewNavigation) => {
    const url = String(navState.url || '');

    // Track real page load progress. The payment form must stay interactive, so
    // never keep a full-screen loading layer up once the document has rendered.
    if (navState.loading) {
      setPageLoading(true);
    } else if (!navState.loading && url.startsWith('http')) {
      setPageLoading(false);
      didLoadOnce.current = true;
    }

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

  const [webViewKey, setWebViewKey] = useState(authorizationUrl);

  const reloadWebView = () => {
    setFailed(false);
    setWebViewKey((k) => (k === authorizationUrl ? `${authorizationUrl}#retry-${Date.now()}` : authorizationUrl));
  };

  const handleCancel = () => {
    Alert.alert('Cancel payment?', 'Your order will be cancelled if you continue.', [
      { text: 'Keep paying', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isSubscription) {
              await SubscriptionService.cancelPayment(subscriptionReference);
            } else {
              await OrdersService.cancelOrder(orderNumber);
            }
          } catch (err) {
            // payment may already be processing; still navigate away
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
            <Text style={styles.failedSubtitle}>
              Please check your connection and try again, or reopen this order to continue the payment.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={reloadWebView}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webView}>
            <WebView
              key={webViewKey}
              source={{ uri: authorizationUrl }}
              userAgent={BROWSER_USER_AGENT}
              style={styles.webView}
              originWhitelist={['*']}
              onNavigationStateChange={handleNavigationChange}
              onShouldStartLoadWithRequest={() => true}
              onError={() => {
                // Only treat the page as failed when nothing ever rendered.
                if (!didLoadOnce.current) setFailed(true);
              }}
              onHttpError={() => {
                if (!didLoadOnce.current) {
                  setTimeout(() => {
                    if (!didLoadOnce.current) setFailed(true);
                  }, 400);
                }
              }}
              onLoadEnd={() => {
                setPageLoading(false);
                didLoadOnce.current = true;
              }}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              mixedContentMode="always"
              textZoom={100}
              overScrollMode="never"
            />

            {pageLoading ? (
              <View style={[styles.webLoading, styles.webLoadingNonBlocking]} pointerEvents="none">
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.webLoadingText}>Opening secure payment page...</Text>
              </View>
            ) : null}
          </View>
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
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  webLoadingNonBlocking: {
    // The loading layer must NEVER intercept touches on the payment form.
    pointerEvents: 'none',
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
  failedSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
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
