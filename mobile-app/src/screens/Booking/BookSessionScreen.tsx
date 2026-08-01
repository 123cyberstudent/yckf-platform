// ============================================
// FILE: src/screens/Booking/BookSessionScreen.tsx
// UPDATED: Date/Time Pickers, Backend Integration, No MoMo Fields
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { bookingStyles } from '../../styles/bookingStyles';
import { Specialist, BookingData } from '../../types';
import { CONTACT_INFO, API_ENDPOINTS } from '../../utils/constants';

interface BookSessionScreenProps {
  navigation: any;
  route: {
    params: {
      specialist: Specialist;
      paymentReference?: string;
      paymentMethod?: string;
    };
  };
}

const BookSessionScreen: React.FC<BookSessionScreenProps> = ({
  navigation,
  route,
}) => {
  const { specialist, paymentReference, paymentMethod } = route.params;
  
  // Form state
 // Form state
const [bookingData, setBookingData] = useState<BookingData>({
  fullName: '',
  email: '',
  phone: '',
  date: '',
  time: '',
  caseDescription: '',
  specialist: specialist.name,
});

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BACKEND_URL = API_ENDPOINTS.BASE_URL;

  const handleInputChange = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle date selection
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      if (event.type === 'set' && date) {
        setSelectedDate(date);
        const formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        handleInputChange('date', formattedDate);
      }
    } else {
      // iOS - update temp date
      if (date) {
        setTempDate(date);
      }
    }
  };

  // iOS Date Confirm
  const confirmIOSDate = () => {
    setSelectedDate(tempDate);
    const formattedDate = tempDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    handleInputChange('date', formattedDate);
    setShowDatePicker(false);
  };

  // iOS Date Cancel
  const cancelIOSDate = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  // Handle time selection
  const onTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      
      if (event.type === 'set' && time) {
        setSelectedTime(time);
        const formattedTime = time.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        handleInputChange('time', formattedTime);
      }
    } else {
      // iOS - update temp time
      if (time) {
        setTempTime(time);
      }
    }
  };

  // iOS Time Confirm
  const confirmIOSTime = () => {
    setSelectedTime(tempTime);
    const formattedTime = tempTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    handleInputChange('time', formattedTime);
    setShowTimePicker(false);
  };

  // iOS Time Cancel
  const cancelIOSTime = () => {
    setTempTime(selectedTime);
    setShowTimePicker(false);
  };

 const validateForm = (): boolean => {
  if (!bookingData.fullName.trim()) {
    Alert.alert('Required Field', 'Please enter your full name');
    return false;
  }
  
  // Email validation
  if (!bookingData.email.trim()) {
    Alert.alert('Required Field', 'Please enter your email address');
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(bookingData.email.trim())) {
    Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., name@example.com)');
    return false;
  }
  
  if (!bookingData.phone.trim()) {
    Alert.alert('Required Field', 'Please enter your phone number');
    return false;
  }
  if (bookingData.phone.trim().replace(/\D/g, '').length < 10) {
    Alert.alert('Invalid Phone', 'Please enter a valid phone number with at least 10 digits');
    return false;
  }
  if (!bookingData.date.trim()) {
    Alert.alert('Required Field', 'Please select your preferred date');
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    Alert.alert('Invalid Date', 'Preferred date cannot be in the past');
    return false;
  }
  if (!bookingData.time.trim()) {
    Alert.alert('Required Field', 'Please select your preferred time');
    return false;
  }
  if (!bookingData.caseDescription.trim()) {
    Alert.alert('Required Field', 'Please describe your case');
    return false;
  }
  if (bookingData.caseDescription.trim().length < 20) {
    Alert.alert('Case Description', 'Please provide more details about your case (at least 20 characters)');
    return false;
  }
  
  return true;
};

  const sendBookingToBackend = async () => {
    try {
      const bookingPayload = {
        fullName: bookingData.fullName.trim(),
        email: bookingData.email.trim(),
        phone: bookingData.phone.trim(),
        preferredDate: bookingData.date,
        preferredTime: bookingData.time,
        caseDescription: bookingData.caseDescription.trim(),
        specialist: specialist.name,
        paymentMethod: paymentMethod || 'Not specified',
        paymentReference: paymentReference || 'Pending',
      };

      console.log('Sending booking to backend:', bookingPayload);

      const response = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit booking');
      }

      return {
        success: true,
        ticketNumber: result.ticketNumber,
        bookingId: result.bookingId,
        status: result.status,
        createdAt: result.createdAt,
      };
    } catch (error: any) {
      console.error('Backend submission error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  };

  const handleSubmitBooking = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to backend
      const result = await sendBookingToBackend();

      if (result.success) {
        const ticketLabel = result.ticketNumber ? `Ticket: ${result.ticketNumber}` : '';
        Alert.alert(
          'Booking Submitted Successfully!',
          `Thank you ${bookingData.fullName}!\n\n${ticketLabel}\n\nSpecialist: ${specialist.name}\nDate: ${bookingData.date}\nTime: ${bookingData.time}\n\nWe will contact you at ${bookingData.phone} shortly to confirm your appointment.`,
          [
            {
              text: 'Done',
              onPress: () => {
                setBookingData({
                  fullName: '',
                  email: '',
                  phone: '',
                  date: '',
                  time: '',
                  caseDescription: '',
                  specialist: specialist.name,
                });
                setSelectedDate(new Date());
                setSelectedTime(new Date());
                setTempDate(new Date());
                setTempTime(new Date());
                navigation.navigate('Root' as never);
              },
            },
          ]
        );
      } else {
        // Error - show error message
        Alert.alert(
          'Submission Error',
          `We couldn't submit your booking at this time.\n\nError: ${result.error}\n\nPlease try again or contact us directly at:\n${CONTACT_INFO.phone}`,
          [
            { text: 'Retry', onPress: () => setIsSubmitting(false) },
            { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
          ]
        );
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again or contact support.',
        [{ text: 'OK', onPress: () => setIsSubmitting(false) }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={bookingStyles.container}>
      <ScrollView 
        contentContainerStyle={bookingStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={bookingStyles.contentContainer}>
          {/* Header */}
          <View style={[bookingStyles.header, bookingStyles.headerWithBack]}>
            <TouchableOpacity
              style={bookingStyles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={bookingStyles.headerTitle}>Book Your Session</Text>
            <Ionicons name="calendar" size={24} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
          </View>

          {/* Main Card */}
          <View style={bookingStyles.card}>
            <Text style={bookingStyles.screenTitle}>Book with {specialist.name}</Text>

            {/* Payment Confirmation Badge */}
            {paymentReference && (
              <View style={bookingStyles.paymentBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={bookingStyles.paymentBadgeText}>
                  Payment Confirmed ({paymentMethod})
                </Text>
              </View>
            )}

            {/* Booking Form */}
            <View style={bookingStyles.formContainer}>
              {/* Full Name */}
              {/* Full Name */}
<View style={bookingStyles.inputGroup}>
  <View style={bookingStyles.inputLabel}>
    <Ionicons name="person" size={20} color="#374151" />
    <Text style={bookingStyles.inputLabelText}>Full Name *</Text>
  </View>
  <TextInput
    style={bookingStyles.input}
    placeholder="Enter your full name"
    placeholderTextColor="#9CA3AF"
    value={bookingData.fullName}
    onChangeText={(value) => handleInputChange('fullName', value)}
    autoCapitalize="words"
  />
</View>

{/* Email Address */}
<View style={bookingStyles.inputGroup}>
  <View style={bookingStyles.inputLabel}>
    <Ionicons name="mail" size={20} color="#374151" />
    <Text style={bookingStyles.inputLabelText}>Preferred Contact Email Address *</Text>
  </View>
  <TextInput
    style={bookingStyles.input}
    placeholder="e.g., name@example.com"
    placeholderTextColor="#9CA3AF"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
    value={bookingData.email}
    onChangeText={(value) => handleInputChange('email', value)}
  />
</View>

{/* Phone Number */}

              {/* Phone Number */}
              <View style={bookingStyles.inputGroup}>
                <View style={bookingStyles.inputLabel}>
                  <Ionicons name="call" size={20} color="#374151" />
                  <Text style={bookingStyles.inputLabelText}>Phone Number *</Text>
                </View>
                <TextInput
                  style={bookingStyles.input}
                  placeholder="e.g., 0241234567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={bookingData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  maxLength={15}
                />
              </View>

              {/* Preferred Date */}
              <View style={bookingStyles.inputGroup}>
                <View style={bookingStyles.inputLabel}>
                  <Ionicons name="calendar" size={20} color="#374151" />
                  <Text style={bookingStyles.inputLabelText}>Preferred Date *</Text>
                </View>
                {Platform.OS === 'ios' ? (
                  <TextInput
                    style={bookingStyles.input}
                    placeholder="DD/MM/YYYY (e.g., 25/12/2024)"
                    placeholderTextColor="#9CA3AF"
                    value={bookingData.date}
                    onChangeText={(value) => handleInputChange('date', value)}
                    keyboardType="numbers-and-punctuation"
                  />
                ) : (
                  <TouchableOpacity
                    style={[bookingStyles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: bookingData.date ? '#000' : '#9CA3AF', fontSize: 15 }}>
                      {bookingData.date || 'Select a date'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Android Date Picker */}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Preferred Time */}
              <View style={bookingStyles.inputGroup}>
                <View style={bookingStyles.inputLabel}>
                  <Ionicons name="time" size={20} color="#374151" />
                  <Text style={bookingStyles.inputLabelText}>Preferred Time *</Text>
                </View>
                {Platform.OS === 'ios' ? (
                  <TextInput
                    style={bookingStyles.input}
                    placeholder="00:00 AM/PM (e.g., 2:30 PM)"
                    placeholderTextColor="#9CA3AF"
                    value={bookingData.time}
                    onChangeText={(value) => handleInputChange('time', value)}
                    keyboardType="numbers-and-punctuation"
                  />
                ) : (
                  <TouchableOpacity
                    style={[bookingStyles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: bookingData.time ? '#000' : '#9CA3AF', fontSize: 15 }}>
                      {bookingData.time || 'Select a time'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Android Time Picker */}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              {/* Case Description */}
              <View style={bookingStyles.inputGroup}>
                <View style={bookingStyles.inputLabel}>
                  <Ionicons name="document-text" size={20} color="#374151" />
                  <Text style={bookingStyles.inputLabelText}>Describe Your Case *</Text>
                </View>
                <TextInput
                  style={[bookingStyles.input, bookingStyles.textArea]}
                  placeholder="Please provide details about your case, situation, or what you need help with..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={5}
                  value={bookingData.caseDescription}
                  onChangeText={(value) => handleInputChange('caseDescription', value)}
                  textAlignVertical="top"
                />
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  {bookingData.caseDescription.length} characters (minimum 20)
                </Text>
              </View>
            </View>

            {/* Contact Info */}
            <View style={bookingStyles.whatsappContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#065F46" />
              <Text style={bookingStyles.whatsappText}>
                Secure & Confidential
              </Text>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#065F46"
                style={bookingStyles.whatsappVerified}
              />
            </View>

            {/* Info Box */}
            <View style={bookingStyles.infoBox}>
              <Text style={bookingStyles.infoBoxText}>
                📧 Your booking will be automatically sent to YCKF via email. We'll review and contact you within 24 hours to confirm your appointment.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                bookingStyles.primaryButton,
                isSubmitting && { opacity: 0.6 }
              ]}
              onPress={handleSubmitBooking}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[bookingStyles.primaryButtonText, { marginLeft: 10 }]}>
                    Submitting...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={[bookingStyles.primaryButtonText, { marginLeft: 8 }]}>
                    Submit Booking Request
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={bookingStyles.footer}>
              <Text style={bookingStyles.footerText}>
                Need immediate assistance?{'\n'}
                Call us: <Text style={bookingStyles.footerEmail}>{CONTACT_INFO.phone}</Text>
                {'\n'}Email: <Text style={bookingStyles.footerEmail}>{CONTACT_INFO.email.official}</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookSessionScreen;