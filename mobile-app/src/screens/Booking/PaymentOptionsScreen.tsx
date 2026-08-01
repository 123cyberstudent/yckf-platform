import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingStyles } from '../../styles/bookingStyles';
import { BOOKING_FEE } from '../../utils/constants';
import { Specialist, OrderContinueTarget } from '../../types';
import OrdersService from '../../services/OrdersService';

interface PaymentOptionsScreenProps {
  navigation: any;
  route: {
    params: {
      specialist?: Specialist;
      fromSubscription?: boolean; // Flag to identify if coming from subscription flow
    };
  };
}

const PaymentOptionsScreen: React.FC<PaymentOptionsScreenProps> = ({
  navigation,
  route,
}) => {
  const { specialist, fromSubscription = false } = route.params || {};
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'mobile_money' | 'card' | 'paypal' | null>(null);
  const [imageError, setImageError] = useState(false);

  // Pay via the real backend-backed Paystack checkout.
  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      const order = await OrdersService.createOrder({
        orderType: 'PREMIUM_SUBSCRIPTION',
      });
      const { payment } = await OrdersService.payWithPaystack(order.orderNumber);
      const continueTo: OrderContinueTarget = specialist
        ? {
            screen: 'BookSession',
            params: {
              specialist,
              paymentReference: order.orderNumber,
              paymentMethod: 'Paystack',
            },
          }
        : { screen: 'Root' };
      navigation.navigate('PaystackWebView', {
        orderNumber: order.orderNumber,
        authorizationUrl: payment.authorizationUrl,
        continueTo,
      });
    } catch (err: any) {
      console.error('❌ Failed to start premium payment:', err);
      Alert.alert(
        'Payment Error',
        err?.message || 'Could not start payment. Please try again or use mobile money.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobileMoneyConfirm = () => {
    navigation.navigate('PaymentConfirmation', {
      paymentMethod: 'Mobile Money (GHS)',
      amount: `GHS ${BOOKING_FEE.GHS}.00`,
    });
  };

  const handlePayPalPayment = () => {
    Alert.alert(
      'PayPal Payment',
      'PayPal integration coming soon! Please use Mobile Money or Card payment for now.',
      [{ text: 'OK' }]
    );
  };

  const handleUnlock = () => {
    if (selectedMethod === 'mobile_money') {
      Alert.alert(
        'Mobile Money Payment',
        `Send GHS ${BOOKING_FEE.GHS} to:\n\nMTN: 0241111111\nTelcel: 0241111111\nAirtelTigo: 0501111111\n\nAdd your name as reference.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'I\'ve Paid', onPress: handleMobileMoneyConfirm },
        ]
      );
    } else if (selectedMethod === 'card') {
      handleCardPayment();
    } else if (selectedMethod === 'paypal') {
      handlePayPalPayment();
    }
  };

  return (
    <SafeAreaView style={bookingStyles.container}>
      <ScrollView contentContainerStyle={bookingStyles.scrollContainer}>
        {/* Header */}
        <View style={bookingStyles.header}>
          <TouchableOpacity
            style={bookingStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={bookingStyles.headerLogoContainer}>
            {!imageError ? (
              <Image
                source={require('../../../assets/images/companylogo.png')}
                style={bookingStyles.headerLogo}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            )}
          </View>
          <Text style={bookingStyles.headerTitle}>Unlock Premium Features</Text>
        </View>

        {/* Content */}
        <View style={bookingStyles.content}>
          {/* Info Section */}
          <View style={bookingStyles.infoSection}>
            <Text style={bookingStyles.infoText}>
              Unlock exclusive access to our premium safety and expert services
            </Text>
          </View>

          {/* Premium Features List */}
          <View style={bookingStyles.featuresSection}>
            <View style={bookingStyles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={bookingStyles.featureText}>Emergency SOS</Text>
            </View>
            <View style={bookingStyles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={bookingStyles.featureText}>Find Police Station</Text>
            </View>
            <View style={bookingStyles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={bookingStyles.featureText}>Book Expert</Text>
            </View>
          </View>

          {/* Premium Badge */}
          <View style={bookingStyles.premiumBadgeContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#F59E0B" />
            <Text style={bookingStyles.premiumText}>Premium</Text>
          </View>

          {/* Payment Methods Title */}
          <Text style={bookingStyles.sectionTitle}>Select Payment Method</Text>

          {/* Payment Method Cards */}
          <TouchableOpacity
            style={[
              bookingStyles.paymentMethodCard,
              selectedMethod === 'mobile_money' && bookingStyles.paymentMethodCardSelected
            ]}
            onPress={() => setSelectedMethod('mobile_money')}
            activeOpacity={0.7}
          >
            <View style={bookingStyles.paymentMethodLeft}>
              <View style={bookingStyles.paymentMethodIconContainer}>
                <Text style={bookingStyles.paymentMethodIcon}>📱</Text>
              </View>
              <Text style={bookingStyles.paymentMethodText}>Mobile Money</Text>
            </View>
            <View style={bookingStyles.paymentMethodRight}>
              <Text style={bookingStyles.paymentMethodAmount}>🇬🇭 Ghc 100/yr</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              bookingStyles.paymentMethodCard,
              selectedMethod === 'card' && bookingStyles.paymentMethodCardSelected
            ]}
            onPress={() => setSelectedMethod('card')}
            activeOpacity={0.7}
          >
            <View style={bookingStyles.paymentMethodLeft}>
              <View style={bookingStyles.paymentMethodIconContainer}>
                <Ionicons name="card" size={24} color="#1E40AF" />
              </View>
              <Text style={bookingStyles.paymentMethodText}>Visa/MasterCard</Text>
            </View>
            <View style={bookingStyles.paymentMethodRight}>
              <Text style={bookingStyles.paymentMethodAmount}>🇺🇸 USD 9/year</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              bookingStyles.paymentMethodCard,
              selectedMethod === 'paypal' && bookingStyles.paymentMethodCardSelected
            ]}
            onPress={() => setSelectedMethod('paypal')}
            activeOpacity={0.7}
          >
            <View style={bookingStyles.paymentMethodLeft}>
              <View style={bookingStyles.paymentMethodIconContainer}>
                <Ionicons name="logo-paypal" size={24} color="#0070BA" />
              </View>
              <Text style={bookingStyles.paymentMethodText}>PayPal</Text>
            </View>
          </TouchableOpacity>

          {/* Total */}
          <View style={bookingStyles.totalContainer}>
            <Text style={bookingStyles.totalText}>Total: Ghc 100.00</Text>
          </View>

          {/* Unlock Button */}
          <TouchableOpacity
            style={[
              bookingStyles.primaryButton,
              !selectedMethod && bookingStyles.unlockButtonDisabled
            ]}
            onPress={handleUnlock}
            disabled={!selectedMethod || isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={bookingStyles.primaryButtonText}>Unlock Premium Features</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={bookingStyles.termsText}>
            By subscribing, you agree to the terms of service and privacy policy.
          </Text>

          {/* Total (Bottom) */}
          <View style={bookingStyles.totalContainerBottom}>
            <Text style={bookingStyles.totalTextBottom}>Total: Ghc 100.00</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentOptionsScreen;
