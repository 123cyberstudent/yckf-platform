// ============================================
// FILE: src/screens/Booking/SelectSpecialistScreen.tsx
// UPDATED: Direct navigation to BookSessionScreen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingStyles } from '../../styles/bookingStyles';
import { SPECIALISTS, BOOKING_FEE } from '../../utils/constants';
import { Specialist } from '../../types';

interface SelectSpecialistScreenProps {
  navigation: any;
}

const SelectSpecialistScreen: React.FC<SelectSpecialistScreenProps> = ({ navigation }) => {
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);

  const handleSelectSpecialist = (specialist: Specialist) => {
    setSelectedSpecialist(specialist);
  };

  const handleBookNow = () => {
    if (selectedSpecialist) {
      // Direct navigation to BookSessionScreen, bypassing payment
      navigation.navigate('BookSession', { 
        specialist: selectedSpecialist,
        paymentMethod: 'manual', // Set default payment method
      });
    } else {
      Alert.alert('Selection Required', 'Please select a specialist first');
    }
  };

  return (
    <SafeAreaView style={bookingStyles.container}>
      <ScrollView contentContainerStyle={bookingStyles.scrollContainer}>
        <View style={bookingStyles.contentContainer}>
          {/* Header */}
          {/* Header - NEW ADDED: Back button included */}
          <View style={bookingStyles.header}>
            {/* NEW ADDED - Back button */}
            <TouchableOpacity 
              style={bookingStyles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* NEW ADDED - Centered header content */}
            <View style={bookingStyles.headerContent}>
              <Text style={bookingStyles.headerTitle}>YCKF Expert Service</Text>
            </View>
            
            <Ionicons name="headset" size={24} color="#FFFFFF" />
          </View>

          {/* Content Card */}
          <View style={bookingStyles.card}>
            <Text style={bookingStyles.screenTitle}>Select a Specialist</Text>

            {/* Specialist Grid */}
            <View style={bookingStyles.specialistGrid}>
              {SPECIALISTS.map((specialist) => (
                <TouchableOpacity
                  key={specialist.id}
                  style={[
                    bookingStyles.specialistCard,
                    selectedSpecialist?.id === specialist.id && bookingStyles.specialistCardActive,
                  ]}
                  onPress={() => handleSelectSpecialist(specialist)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      bookingStyles.specialistIconContainer,
                      { backgroundColor: specialist.color },
                    ]}
                  >
                    <Ionicons name={specialist.iconName as any} size={32} color="#1E40AF" />
                  </View>
                  <Text style={bookingStyles.specialistName}>{specialist.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Book Now Button */}
            <TouchableOpacity
              style={bookingStyles.primaryButton}
              onPress={handleBookNow}
              activeOpacity={0.8}
            >
              <Text style={bookingStyles.primaryButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SelectSpecialistScreen;