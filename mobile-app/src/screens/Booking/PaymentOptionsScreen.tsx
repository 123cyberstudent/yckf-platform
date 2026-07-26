import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { bookingStyles } from '../../styles/bookingStyles';
import { BOOKING_FEE, COLORS, SPACING } from '../../utils/constants';
import { Specialist } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [paystackUrl, setPaystackUrl] = useState('');
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<'mobile_money' | 'card' | 'paypal' | null>(null);
  const [imageError, setImageError] = useState(false);

  const PAYSTACK_PUBLIC_KEY = 'pk_test_b8b5067fa6d7ba20b9efdd9ab37a936514b56713';

  // Save premium subscription status
  const savePremiumStatus = async (paymentReference: string, paymentMethod: string) => {
    try {
      const subscriptionData = {
        isPremium: true,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        paymentReference,
        paymentMethod,
      };
      
      await AsyncStorage.setItem('premium_subscription', JSON.stringify(subscriptionData));
      console.log('✅ Premium subscription saved:', subscriptionData);
      return true;
    } catch (error) {
      console.error('❌ Failed to save premium status:', error);
      return false;
    }
  };

  const handlePaystackPayment = () => {
    console.log('🔵 Paystack button clicked');
    setIsProcessing(true);

    const reference = `YCKF_${Date.now()}`;
    const amount = BOOKING_FEE.GHS * 100; // Convert to pesewas

    console.log('💰 Payment details:', { reference, amount, key: PAYSTACK_PUBLIC_KEY });

    // Create HTML page with Paystack inline script
    const paystackHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
        <script src="https://js.paystack.co/v1/inline.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
          .loading {
            text-align: center;
            color: #1E40AF;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <p>Loading payment gateway...</p>
          <p style="font-size: 14px; color: #666;">Please wait</p>
        </div>
        <script>
          console.log('🌐 Paystack HTML loaded');
          
          function initializePayment() {
            try {
              console.log('🚀 Initializing Paystack...');
              
              var handler = PaystackPop.setup({
                key: '${PAYSTACK_PUBLIC_KEY}',
                email: 'mypracticalworks@gmail.com',
                amount: ${amount},
                ref: '${reference}',
                currency: 'GHS',
                channels: ['card', 'mobile_money'],
                onClose: function(){
                  console.log('❌ Payment closed');
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'cancel',
                    message: 'Payment cancelled'
                  }));
                },
                callback: function(response){
                  console.log('✅ Payment success:', response);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'success',
                    reference: response.reference,
                    status: response.status
                  }));
                }
              });
              
              console.log('📱 Opening Paystack iframe...');
              handler.openIframe();
              
            } catch (error) {
              console.error('❌ Paystack error:', error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: error.toString()
              }));
            }
          }
          
          // Initialize after a short delay to ensure everything is loaded
          setTimeout(initializePayment, 500);
        </script>
      </body>
    </html>
  `;

    setPaystackUrl(paystackHtml);
    setShowPaystackModal(true);
    setIsProcessing(false);
    setIsWebViewLoading(true);
    
    console.log('✅ Modal opened, WebView will load');
  };

  const handlePaystackMessage = async (event: any) => {
    try {
      console.log('📨 Message received:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'success') {
        console.log('✅ Payment successful:', data.reference);
        setShowPaystackModal(false);
        
        // Save premium status
        const saved = await savePremiumStatus(data.reference, 'paystack');
        
        Alert.alert(
          'Payment Successful! 🎉',
          `Your payment of GHS ${BOOKING_FEE.GHS} was successful.\n\nReference: ${data.reference}\n\nYou now have access to all premium features for 1 year!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                if (fromSubscription) {
                  // Go back to home screen
                  navigation.navigate('Root');
                } else if (specialist) {
                  navigation.navigate('BookSession', {
                    specialist,
                    paymentReference: data.reference,
                    paymentMethod: 'paystack'
                  });
                } else {
                  navigation.navigate('Root');
                }
              },
            },
          ]
        );
      } else if (data.type === 'cancel') {
        console.log('❌ Payment cancelled');
        setShowPaystackModal(false);
        
        Alert.alert(
          'Payment Cancelled',
          'You cancelled the payment. You can try again or use manual mobile money transfer.',
          [{ text: 'OK' }]
        );
      } else if (data.type === 'error') {
        console.error('❌ Payment error:', data.message);
        setShowPaystackModal(false);
        
        Alert.alert(
          'Payment Error',
          'An error occurred. Please try again or use manual mobile money transfer.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Message parsing error:', error);
      setShowPaystackModal(false);
      Alert.alert('Error', 'Failed to process payment response.');
    }
  };

  const handleMobileMoneyConfirm = () => {
  // Navigate to payment confirmation form
  navigation.navigate('PaymentConfirmation', {
    paymentMethod: 'Mobile Money (GHS)',
    amount: 'GHS 100.00'
  });
};
  const handlePayPalPayment = () => {
    Alert.alert(
      'PayPal Payment',
      'PayPal integration coming soon! Please use Mobile Money or Card payment for now.',
      [{ text: 'OK' }]
    );
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
              <Text style={bookingStyles.featureText}>Find Park</Text>
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
            onPress={() => {
              if (selectedMethod === 'mobile_money') {
                // Show mobile money instructions
                Alert.alert(
                  'Mobile Money Payment',
                  'Send GHS 100 to:\n\nMTN: 0241111111\nTelcel: 0241111111\nAirtelTigo: 0501111111\n\nAdd your name as reference.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'I\'ve Paid', onPress: handleMobileMoneyConfirm }
                  ]
                );
              } else if (selectedMethod === 'card') {
                handlePaystackPayment();
              } else if (selectedMethod === 'paypal') {
                handlePayPalPayment();
              }
            }}
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

      {/* Paystack Modal */}
      <Modal
        visible={showPaystackModal}
        animationType="slide"
        onRequestClose={() => {
          setShowPaystackModal(false);
          Alert.alert('Payment Cancelled', 'You closed the payment window.');
        }}
      >
        <SafeAreaView style={bookingStyles.paystackModalOverlay}>
          <View style={bookingStyles.paystackModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowPaystackModal(false);
                Alert.alert('Payment Cancelled', 'You closed the payment window.');
              }}
              style={bookingStyles.backButton}
            >
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={bookingStyles.paystackModalTitle}>
              Complete Payment
            </Text>
          </View>
          
          {isWebViewLoading && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text style={{ marginTop: 10, color: '#666' }}>
                Loading payment gateway...
              </Text>
            </View>
          )}
          
          <WebView
            source={{ html: paystackUrl }}
            onMessage={handlePaystackMessage}
            onLoadEnd={() => {
              console.log('✅ WebView loaded');
              setIsWebViewLoading(false);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView error:', nativeEvent);
              Alert.alert('Error', 'Failed to load payment page.');
              setShowPaystackModal(false);
            }}
            style={bookingStyles.paystackWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            mixedContentMode="always"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default PaymentOptionsScreen;