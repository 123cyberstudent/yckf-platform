import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  Modal, // ← ADD THIS if missing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import authService from '../services/AuthService';
// NEW ADDED - Import for navigation functionality
import { useNavigation } from '@react-navigation/native';

// Services
import AudioRecordingService from '../services/AudioRecordingService';
import LocationService from '../services/LocationService';
import WhatsAppService from '../services/WhatsAppService';

// Data
import { POLICE_STATIONS, PoliceStation } from '../data/policeStations';
// Utils
import { findNearestStation } from '../utils/stationUtils';

// Types
import { LocationData } from '../types';

// Constants
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  isUser: boolean;
}

const EmergencyReportScreen: React.FC = () => {
  // State Management
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  // NEW ADDED - Initialize navigation hook
  const navigation = useNavigation();

  // Location & Police Station
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [nearestStation, setNearestStation] = useState<{ station: PoliceStation; distance: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Loading states
  const [isSending, setIsSending] = useState(false);

  // Privacy consent
  const [privacyConsented, setPrivacyConsented] = useState(false);

  // Refs
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Add these TWO new state variables:
  // WhatsApp 2 Modal State
  const [whatsapp2ModalVisible, setWhatsapp2ModalVisible] = useState(false);
  const [whatsapp2Number, setWhatsapp2Number] = useState('');
  // Send Options Modal State  
  const [sendOptionsModalVisible, setSendOptionsModalVisible] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      AudioRecordingService.cleanup();
    };
  }, []);

  // Show privacy notice on mount
  useEffect(() => {
    showPrivacyNotice();
  }, []);

  /**
   * Show privacy and security notice
   */
  const showPrivacyNotice = () => {
    Alert.alert(
      '🔒 Privacy & Security Notice',
      'This emergency reporting feature will:\n\n' +
      '• Capture your current GPS location\n' +
      '• Record audio (if using voice mode)\n' +
      '• Share this information with emergency contacts and police stations\n\n' +
      'Your data will only be used for emergency response purposes.\n\n' +
      'Do you consent to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            Alert.alert('Notice', 'Emergency reporting requires consent to proceed.');
          },
        },
        {
          text: 'I Consent',
          onPress: () => {
            setPrivacyConsented(true);
            captureLocationAutomatically();
          },
        },
      ]
    );
  };

  /**
   * Automatically capture location - FIXED coords access
   */
  const captureLocationAutomatically = async () => {
    setLocationLoading(true);

    try {
      console.log('🔍 Starting location capture...');

      // Check permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Permission status:', status);

      if (status !== 'granted') {
        Alert.alert(
          '⚠️ Permission Denied',
          'Location permission is required for emergency reporting.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setLocationLoading(false);
        return;
      }

      console.log('✅ Permission granted, getting location...');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      console.log('📍 Raw location object:', JSON.stringify(location, null, 2));

      // FIXED: Extract coords safely with type assertion
      const coords = location?.coords;
      console.log('🎯 Extracted coords:', coords);

      if (coords && coords.latitude && coords.longitude) {
        const { latitude, longitude } = coords;

        console.log('✅ Valid coordinates:', latitude, longitude);

        // Validate coordinates
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
          Alert.alert('Location Error', 'Invalid location coordinates. Please try again.');
          setLocationLoading(false);
          return;
        }

        // Set location immediately
        setCurrentLocation(location);

        // Find nearest police station
        console.log('🚔 Finding nearest police station...');
        const nearest = findNearestStation(latitude, longitude, POLICE_STATIONS);

        console.log('🎯 Nearest station:', nearest);

        if (nearest) {
          const MAX_REASONABLE_DISTANCE_KM = 100;

          // Set station immediately
          setNearestStation(nearest);

          if (nearest.distance > MAX_REASONABLE_DISTANCE_KM) {
            Alert.alert(
              '⚠️ Out of Service Area',
              `You appear to be ${nearest.distance.toFixed(1)} km away from the nearest police station.\n\n` +
              `This app currently serves Ghana only.\n\n` +
              `Nearest found: ${nearest.station.name}\n\n` +
              `You can still proceed, but consider calling:\n` +
              `• Ghana: 191\n` +
              `• Nigeria: 112 / 767\n` +
              `• USA/Canada: 911\n` +
              `• UK/EU: 112`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              '✅ Location Captured',
              `Nearest Police Station:\n${nearest.station.name}\n(${nearest.distance.toFixed(2)} km away)`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Notice', 'Could not find nearby police station. You can still proceed with your report.');
        }
      } else {
        console.error('❌ Invalid location structure:', location);
        Alert.alert(
          '⚠️ Location Error',
          'Could not capture location. Please:\n\n1. Enable GPS/Location Services\n2. Grant location permissions\n3. Try again',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => captureLocationAutomatically() }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Location capture failed:', error);
      console.error('Error details:', error.message, error.code);

      Alert.alert(
        '❌ Location Error',
        `Failed to capture location.\n\nError: ${error.message || 'Unknown error'}\n\nPlease check:\n1. GPS is enabled\n2. Location permissions granted\n3. You're not in airplane mode`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => captureLocationAutomatically() }
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  /**
   * Start voice recording
   */
  const startRecording = async () => {
    if (!privacyConsented) {
      showPrivacyNotice();
      return;
    }

    const result = await AudioRecordingService.startRecording();

    if (result.success) {
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioUri(null);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1000);
      }, 1000);

      // ALWAYS recapture location when recording starts
      if (!currentLocation) {
        console.log('No location found, capturing...');
        captureLocationAutomatically();
      } else {
        console.log('Location already captured:', currentLocation);
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to start recording');
    }
  };

  /**
   * Stop voice recording
   */
  const stopRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    const result = await AudioRecordingService.stopRecording();

    if (result.success && result.uri) {
      setIsRecording(false);
      setAudioUri(result.uri);

      // RECAPTURE LOCATION AFTER RECORDING STOPS
      if (!currentLocation) {
        console.log('Recapturing location after recording...');
        captureLocationAutomatically();
      }

      Alert.alert('✅ Recording Saved', 'You can now listen, send, or re-record.');
    } else {
      setIsRecording(false);
      Alert.alert('Error', result.error || 'Failed to save recording');
    }
  };

  /**
   * Play recorded audio
   */
  const playRecording = async () => {
    if (!audioUri) return;

    setIsPlaying(true);
    const result = await AudioRecordingService.playAudio(audioUri);

    if (!result.success) {
      Alert.alert('Error', 'Failed to play recording');
    }

    setTimeout(() => setIsPlaying(false), recordingDuration);
  };

  /**
   * Delete current recording
   */
  const deleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (audioUri) {
              await AudioRecordingService.deleteAudio(audioUri);
            }
            setAudioUri(null);
            setRecordingDuration(0);
          },
        },
      ]
    );
  };

  /**
   * Send chat message
   */
  const sendMessage = () => {
    if (!inputText.trim()) return;

    if (!privacyConsented) {
      showPrivacyNotice();
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      timestamp: Date.now(),
      isUser: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // ALWAYS recapture location when first message is sent
    if (!currentLocation) {
      console.log('Capturing location after first message...');
      captureLocationAutomatically();
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Emergency received. Help is being dispatched to your location.',
        timestamp: Date.now(),
        isUser: false,
      };
      setMessages(prev => [...prev, reply]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000);
  };

  /**
   * Prepare emergency message - FIXED coords access
   */
 const prepareEmergencyMessage = async (): Promise<string> => {
  // ⭐ DECLARE message FIRST
  let message = '🚨 EMERGENCY REPORT 🚨\n\n';

  const userData = await authService.getCurrentUser();
  // ⭐ ADD DEBUGGING
  console.log('📞 User data from authService:', JSON.stringify(userData, null, 2));
  
  // Get user contact details
  const userEmail = userData?.email || 'Not available';
  const userPhone = (userData as any)?.phoneNumber || (userData as any)?.phone_number || 'Not available';

  // ⭐ ADD MORE DEBUGGING
  console.log('📧 User Email:', userEmail);
  console.log('📱 User Phone:', userPhone);

  message += `👤 REPORTER INFORMATION:\n`;
  message += `Email: ${userEmail}\n`;
  message += `Phone: ${userPhone}\n\n`;

  
    // FIXED: Access coords with optional chaining
    const coords = currentLocation?.coords;
    if (coords && coords.latitude != null && coords.longitude != null) {
      message += `📍 LOCATION:\n`;
      message += `Coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}\n`;
      message += `Google Maps: https://maps.google.com/?q=${coords.latitude},${coords.longitude}\n`;
      message += `Accuracy: ${coords.accuracy?.toFixed(2) || 'N/A'} meters\n\n`;
    } else {
      message += `⚠️ Location not available\n\n`;
    }

    // if (currentLocation && currentLocation.coords) {
    //   message += `📍 LOCATION:\n`;
    //   message += `Coordinates: ${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}\n`;
    //   message += `Google Maps: https://maps.google.com/?q=${currentLocation.coords.latitude},${currentLocation.coords.longitude}\n`;
    //   message += `Accuracy: ${currentLocation.coords.accuracy?.toFixed(2) || 'N/A'} meters\n\n`;
    // } else {
    //   message += `⚠️ Location not available\n\n`;
    // }

    // Police Station
    if (nearestStation) {
      message += `🚔 NEAREST POLICE STATION:\n`;
      message += `Name: ${nearestStation.station.name}\n`;
      message += `Distance: ${nearestStation.distance.toFixed(2)} km\n`;
      message += `Phone: ${nearestStation.station.emergencyLine}\n`;
      message += `Address: ${nearestStation.station.address}\n\n`;
    }

    // Content
    if (mode === 'text' && messages.length > 0) {
      message += `💬 EMERGENCY DETAILS:\n`;
      messages.filter(m => m.isUser).forEach((m, idx) => {
        message += `${idx + 1}. ${m.text}\n`;
      });
      message += `\n`;
    } else if (mode === 'voice' && audioUri) {
      message += `🎤 VOICE RECORDING:\n`;
      message += `Duration: ${AudioRecordingService.formatDuration(recordingDuration)}\n`;

      try {
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (fileInfo.exists && fileInfo.size) {
          message += `Size: ${(fileInfo.size / 1024).toFixed(2)} KB\n`;
        }
      } catch (error) {
        console.log('Could not get file info');
      }

      message += `⚠️ Voice recording attached\n\n`;
    }

    message += `⏰ TIMESTAMP:\n`;
    message += `${new Date().toLocaleString()}\n\n`;
    message += `📱 Sent via YCKF Mobile App\n`;
    message += `Report ID: EMG-${Date.now().toString().slice(-8)}`;

    return message;
  };

  /**
   * Send emergency report
   */
  const sendEmergencyReport = () => {
    if (!currentLocation) {
      Alert.alert(
        '⚠️ Location Required',
        'Location not captured yet. Please wait or retry.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry Location', onPress: () => captureLocationAutomatically() }
        ]
      );
      return;
    }

    if (!nearestStation) {
      Alert.alert(
        '⚠️ No Police Station',
        'No police station found. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => showSendOptions() }
        ]
      );
      return;
    }

    if (mode === 'voice' && !audioUri) {
      Alert.alert('⚠️ No Recording', 'Please record your emergency message first.');
      return;
    }

    if (mode === 'text' && messages.length === 0) {
      Alert.alert('⚠️ No Message', 'Please type your emergency details first.');
      return;
    }

    // showSendOptions();
    showSendOptionsModal(); // NEW - Opens custom modal with all options
  };

  /**
   * Show send options
   */
  const showSendOptions = () => {
    const stationName = nearestStation?.station.name || 'Emergency Services';

    Alert.alert(
      '📤 Send Emergency Report',
      `Send to: ${stationName}\n\nChoose method:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          //modified to 'WhatsApp1'
          text: '📱 WhatsApp 1',
          onPress: () => sendViaWhatsApp(),
        },
        {
          text: '📧 Email',
          onPress: () => sendViaEmail(),
        },
        {
          text: '☎️ Call',
          onPress: () => callStation(),
        },
        {
          text: '📲 Share',
          onPress: () => sendViaShareMenu(),
        },
        {
          text: '📱 WhatsApp 2',
          onPress: () => promptWhatsApp2Number(), // NEW - Asks for phone number
        },
      ]
    );
  };

  // STEP 2: ADD THIS NEW FUNCTION after showSendOptions
  /**
   * Prompt user to enter WhatsApp number for forwarding
   */

  // const promptWhatsApp2Number = () => {
  //   Alert.prompt(
  //     '📱 WhatsApp 2 - Forward to Any Number',
  //     'Enter the WhatsApp number to send this emergency report:\n\n' +
  //     'Format: +233XXXXXXXXX or 0XXXXXXXXX',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Send',
  //         onPress: (phoneNumber) => {
  //           if (phoneNumber && phoneNumber.trim()) {
  //             sendViaWhatsApp2(phoneNumber.trim());
  //           } else {
  //             Alert.alert('⚠️ Invalid Number', 'Please enter a valid phone number.');
  //           }
  //         },
  //       },
  //     ],
  //     'plain-text',
  //     '', // Default value
  //     'phone-pad' // Keyboard type
  //   );
  // };

  //START: ADD THIS NEW FUNCTION after promptWhatsApp2Number

  /**
   * Show modal to enter custom WhatsApp number
   */
  
  const promptWhatsApp2Number = (): void => {
    setWhatsapp2Number('');
    setWhatsapp2ModalVisible(true);
  };

  /**
 * Send emergency report to custom WhatsApp number
 */
  const sendViaWhatsApp2 = async (inputNumber: string): Promise<void> => {
    setIsSending(true);

    try {
      // Clean phone number
      let phoneNumber = inputNumber.replace(/\D/g, '');

      // Validate length
      if (phoneNumber.length < 9 || phoneNumber.length > 15) {
        setIsSending(false);
        Alert.alert(
          '⚠️ Invalid Number',
          'Please enter a valid phone number with 9-15 digits.\n\nExample: +233505313578 or 0505313578'
        );
        return;
      }

      // Add Ghana country code if needed
      if (!phoneNumber.startsWith('233')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '233' + phoneNumber.substring(1);
        } else {
          phoneNumber = '233' + phoneNumber;
        }
      }

      console.log('📱 Sending to WhatsApp 2:', phoneNumber);

      // Prepare message
      const message = await prepareEmergencyMessage();
      let finalMessage = message;

      if (mode === 'voice' && audioUri) {
        finalMessage += '\n\n⚠️ Voice recording cannot be sent directly via WhatsApp deep link. Please attach manually.';
      }

      // Send via WhatsApp
      const result = await WhatsAppService.sendMessage(phoneNumber, finalMessage);
      setIsSending(false);

      if (result.success) {
        Alert.alert(
          '✅ WhatsApp 2 Opened',
          mode === 'voice' && audioUri
            ? `WhatsApp opened to:\n+${phoneNumber}\n\nPlease attach voice recording manually and send.`
            : `WhatsApp opened to:\n+${phoneNumber}\n\nPlease send the message.`,
          [{ text: 'OK', onPress: () => resetForm() }]
        );
      } else {
        Alert.alert('❌ Error', result.error || 'Failed to open WhatsApp 2');
      }
    } catch (error) {
      setIsSending(false);
      console.error('❌ WhatsApp 2 error:', error);
      Alert.alert('❌ Error', 'Failed to send via WhatsApp 2. Please try again.');
    }
  };

  /**
   * Show custom modal with all send options
   */
  const showSendOptionsModal = (): void => {
    setSendOptionsModalVisible(true);
  };

  // END: ADD THIS NEW FUNCTION after promptWhatsApp2Number


  /**
     * Send via WhatsApp - FIXED phone number validation
     */
  const sendViaWhatsApp = async () => {
    if (!nearestStation) {
      Alert.alert('Error', 'No police station selected');
      return;
    }

    setIsSending(true);
    const message = await prepareEmergencyMessage();

    // FIXED: Clean phone number properly - remove all non-digits
    let phoneNumber = nearestStation.station.phoneNumber.replace(/\D/g, '');

    // If number doesn't start with country code, add Ghana country code
    if (!phoneNumber.startsWith('233')) {
      // Remove leading 0 if present
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '233' + phoneNumber.substring(1);
      } else {
        phoneNumber = '233' + phoneNumber;
      }
    }

    console.log('Sending to WhatsApp number:', phoneNumber);

  
    // FIXED: Check if sendAudioMessage exists, otherwise use regular sendMessage
   let result;

    // Voice mode - WhatsApp deep link doesn't support audio attachments
    if (mode === 'voice' && audioUri) {
      const audioMessage = message + '\n\n⚠️ Voice recording cannot be sent directly via WhatsApp deep link. Please attach manually.';
      result = await WhatsAppService.sendMessage(phoneNumber, audioMessage);
    } else {
      result = await WhatsAppService.sendMessage(phoneNumber, message);
    }

    setIsSending(false);

    if (result.success) {
      Alert.alert(
        '✅ WhatsApp Opened',
        mode === 'voice' && audioUri
          ? 'WhatsApp opened. Please attach the voice recording manually and send.'
          : 'WhatsApp opened. Please send the message.',
        [{ text: 'OK', onPress: () => resetForm() }]
      );
    } else {
      Alert.alert('❌ Error', result.error || 'Failed to open WhatsApp');
    }
  };

  /**
   * Send via Email
   */
  const sendViaEmail = async () => {
    if (!nearestStation) return;

    setIsSending(true);

    try {
      const message = await prepareEmergencyMessage();
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        setIsSending(false);
        Alert.alert('❌ Email Not Available', 'Email not configured on this device.');
        return;
      }

      const emailOptions: any = {
        recipients: ['yckfadmin@youngcyberknightsfoundation.org'],
        subject: `🚨 EMERGENCY - ${new Date().toLocaleString()}`,
        body: message,
        isHtml: false,
      };

      if (mode === 'voice' && audioUri) {
        emailOptions.attachments = [audioUri];
      }

      const result = await MailComposer.composeAsync(emailOptions);

      setIsSending(false);

      if (result.status === 'sent') {
        Alert.alert('✅ Email Sent', 'Emergency report sent successfully.', [
          { text: 'OK', onPress: () => resetForm() }
        ]);
      }
    } catch (error) {
      setIsSending(false);
      Alert.alert('❌ Error', 'Failed to send email.');
    }
  };

  /**
 * Send via Email - AUTO-SEND VERSION (with fallback to manual)
 */
const sendViaEmailAuto = async () => {
  if (!nearestStation) {
    Alert.alert('Error', 'No park selected');
    return;
  }

  setIsSending(true);

  try {
    const message = await prepareEmergencyMessage();
    
    // ⭐ Get user contact details
    const userData = await authService.getCurrentUser();
    const userEmail = userData?.email || 'Not available';
    const userPhone = (userData as any)?.phoneNumber || (userData as any)?.phone_number || 'Not available';
    
    // Extract location data safely
    const locationData = currentLocation as any;
    
    // Prepare email data with user contact details
    const emailData: any = {
      emergencyId: `EMG-${Date.now().toString().slice(-8)}`,
      subject: `🚨 EMERGENCY REPORT - ${new Date().toLocaleString()}`,
      message: message,
      userEmail: userEmail,           // ⭐ ADD THIS
      userPhone: userPhone,           // ⭐ ADD THIS
      location: locationData?.coords ? {
        latitude: locationData.coords.latitude || 0,
        longitude: locationData.coords.longitude || 0,
        accuracy: locationData.coords.accuracy || 0
      } : null,
      stationInfo: nearestStation ? {
        name: nearestStation.station.name,
        distance: nearestStation.distance,
        phone: nearestStation.station.emergencyLine,
        address: nearestStation.station.address
      } : null,
      reportType: mode,
      timestamp: new Date().toISOString(),
      hasAudio: mode === 'voice' && audioUri ? true : false,
      audioDuration: mode === 'voice' && audioUri ? AudioRecordingService.formatDuration(recordingDuration) : null,
      textMessages: mode === 'text' && messages.length > 0 ? messages.filter(m => m.isUser).map(m => m.text) : null
    };

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';
    
    const response = await fetch(`${API_URL}/api/email/emergency-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    setIsSending(false);

    if (result.success) {
      Alert.alert(
        '✅ Emergency Reported',
        'Your emergency report has been sent automatically via email to the police station and YCKF admin.',
        [{ text: 'OK', onPress: () => resetForm() }]
      );
    } else {
      throw new Error(result.error || 'Failed to send email');
    }

  } catch (error) {
    setIsSending(false);
    console.error('Auto-email error:', error);
    
    Alert.alert(
      '⚠️ Auto-Send Failed',
      'Could not send email automatically. Would you like to use your email app instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Email App', 
          onPress: () => sendViaEmail()
        }
      ]
    );
  }
};
  
  /**
   * Call police station - FIXED phone number
   */
  const callStation = () => {
    if (!nearestStation) return;

    // FIXED: Use emergencyLine and clean it
    const phoneNumber = nearestStation.station.emergencyLine.replace(/\D/g, '');

    Alert.alert(
      '☎️ Call Police Station',
      `Calling: ${nearestStation.station.name}\n${nearestStation.station.emergencyLine}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: async () => {
            const url = `tel:${phoneNumber}`;
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              Linking.openURL(url);
            } else {
              Alert.alert('Error', 'Cannot make calls on this device');
            }
          },
        },
      ]
    );
  };

  /**
   * Send via share menu
   */
  const sendViaShareMenu = async () => {
    setIsSending(true);
    const message = await prepareEmergencyMessage();

    try {
      let shareResult;

      if (mode === 'voice' && audioUri) {
        shareResult = await Share.share({
          message: message,
          url: audioUri,
          title: '🚨 Emergency Report',
        });
      } else {
        shareResult = await Share.share({
          message: message,
          title: '🚨 Emergency Report',
        });
      }

      setIsSending(false);

      if (shareResult.action === Share.sharedAction) {
        Alert.alert('✅ Shared', 'Report shared successfully.', [
          { text: 'OK', onPress: () => resetForm() }
        ]);
      }
    } catch (error) {
      setIsSending(false);
      Alert.alert('❌ Error', 'Failed to share report.');
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setAudioUri(null);
    setRecordingDuration(0);
    setMessages([]);
    setInputText('');
    Alert.alert('🔄 Reset', 'Form cleared. You can submit a new report.');
  };


  // ============================================================================
  // MODAL COMPONENTS
  // ============================================================================

  // Start ← ADD WhatsApp2Modal HERE (see STEP 4)

  /**
     * Modal for entering custom WhatsApp number
     */
 /**
   * Modal for entering custom WhatsApp number - FIXED keyboard issue
   */
  const WhatsApp2Modal = (): JSX.Element => (
    <Modal
      visible={whatsapp2ModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setWhatsapp2ModalVisible(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.modalOverlay}
          onPress={() => setWhatsapp2ModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>📱 WhatsApp 2</Text>
            <Text style={styles.modalSubtitle}>
              Forward emergency report to any WhatsApp number
            </Text>

            <TextInput
              style={styles.modalInput}
              value={whatsapp2Number}
              onChangeText={setWhatsapp2Number}
              placeholder="Enter phone number"
              placeholderTextColor={COLORS.text.light}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
            />

            <Text style={styles.modalHint}>
              Format: +233XXXXXXXXX or 0XXXXXXXXX
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setWhatsapp2ModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={() => {
                  if (whatsapp2Number.trim()) {
                    setWhatsapp2ModalVisible(false);
                    sendViaWhatsApp2(whatsapp2Number.trim());
                  } else {
                    Alert.alert('⚠️ Invalid Number', 'Please enter a valid phone number.');
                  }
                }}
              >
                <Text style={styles.modalButtonTextSend}>Send</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
  // ENDING ← WhatsApp2Modal
  

  /**
  * START <=Custom Send Options Modal - Shows all 6 send options
  */
  const SendOptionsModal = (): JSX.Element => {
    const stationName = nearestStation?.station.name || 'Emergency Services';

    return (
      <Modal
        visible={sendOptionsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSendOptionsModalVisible(false)}
      >
        <View style={styles.sendModalOverlay}>
          <View style={styles.sendModalContainer}>
            {/* Header */}
            <View style={styles.sendModalHeader}>
              <Text style={styles.sendModalTitle}>📤 Send Emergency Report</Text>
              <Text style={styles.sendModalSubtitle}>Send to: {stationName}</Text>
            </View>

            {/* Options List */}
            <ScrollView style={styles.sendOptionsScroll}>
              {/* WhatsApp 1 Option */}
              <TouchableOpacity
                style={styles.sendOption}
                onPress={() => {
                  setSendOptionsModalVisible(false);
                  sendViaWhatsApp();
                }}
              >
                <View style={[styles.sendOptionIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="logo-whatsapp" size={28} color="#059669" />
                </View>
                <View style={styles.sendOptionText}>
                  <Text style={styles.sendOptionTitle}>WhatsApp 1</Text>
                  <Text style={styles.sendOptionSubtitle}>
                    Send to police station official number
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} />
              </TouchableOpacity>

              {/* WhatsApp 2 Option */}
              <TouchableOpacity
                style={styles.sendOption}
                onPress={() => {
                  setSendOptionsModalVisible(false);
                  promptWhatsApp2Number();
                }}
              >
                <View style={[styles.sendOptionIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="logo-whatsapp" size={28} color="#2563eb" />
                </View>
                <View style={styles.sendOptionText}>
                  <Text style={styles.sendOptionTitle}>WhatsApp 2 </Text>
                  <Text style={styles.sendOptionSubtitle}>
                    Forward to any WhatsApp number
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} />
              </TouchableOpacity>

             {/* Email Option - AUTO SEND with Manual Fallback */}
              <TouchableOpacity
                style={styles.sendOption}
                onPress={() => {
                  setSendOptionsModalVisible(false);
                  sendViaEmailAuto(); // Now uses auto-send with manual fallback
                }}
              >
                <View style={[styles.sendOptionIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="mail" size={28} color="#f59e0b" />
                </View>
                <View style={styles.sendOptionText}>
                  <Text style={styles.sendOptionTitle}>Email</Text>
                  <Text style={styles.sendOptionSubtitle}>
                    Auto-send to police station & YCKF admin
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} />
              </TouchableOpacity>


              {/* Call Option */}
              <TouchableOpacity
                style={styles.sendOption}
                onPress={() => {
                  setSendOptionsModalVisible(false);
                  callStation();
                }}
              >
                <View style={[styles.sendOptionIcon, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="call" size={28} color="#dc2626" />
                </View>
                <View style={styles.sendOptionText}>
                  <Text style={styles.sendOptionTitle}>Call Police Station</Text>
                  <Text style={styles.sendOptionSubtitle}>
                    Direct call to emergency line
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} />
              </TouchableOpacity>

              {/* Share Option */}
              <TouchableOpacity
                style={styles.sendOption}
                onPress={() => {
                  setSendOptionsModalVisible(false);
                  sendViaShareMenu();
                }}
              >
                <View style={[styles.sendOptionIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="share-social" size={28} color="#6366f1" />
                </View>
                <View style={styles.sendOptionText}>
                  <Text style={styles.sendOptionTitle}>Share via Apps</Text>
                  <Text style={styles.sendOptionSubtitle}>
                    Use system share menu
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.light} />
              </TouchableOpacity>
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.sendModalCancelButton}
              onPress={() => setSendOptionsModalVisible(false)}
            >
              <Text style={styles.sendModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  /**
     * ENDING  <=Custom Send Options Modal - Shows all 6 send options
     */

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      {/* Header - NEW ADDED: Back button included */}
      <View style={styles.header}>
        {/* NEW ADDED - Back button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.white} />
        </TouchableOpacity>        
        {/* NEW ADDED - Centered header content */}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🚨 Emergency Report</Text>
          <Text style={styles.headerSubtitle}>
            Voice or Text • Instant Emergency Alert
          </Text>
        </View>
      </View>
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>🚨 Emergency Report</Text>
        <Text style={styles.headerSubtitle}>
          Voice or Text • Instant Park Alert
        </Text>
      </View> */}



      {/* Mode Switcher */}
      <View style={styles.modeSwitcher}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]}
          onPress={() => setMode('voice')}
          disabled={isRecording || isSending}
        >
          <Ionicons
            name="mic"
            size={20}
            color={mode === 'voice' ? COLORS.text.white : COLORS.primary}
          />
          <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>
            Voice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
          onPress={() => setMode('text')}
          disabled={isRecording || isSending}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={mode === 'text' ? COLORS.text.white : COLORS.primary}
          />
          <Text style={[styles.modeButtonText, mode === 'text' && styles.modeButtonTextActive]}>
            Text
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Status */}
        {locationLoading && (
          <View style={styles.locationCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.locationText}>Capturing your location...</Text>
          </View>
        )}

        {currentLocation && nearestStation && (
          <View style={styles.stationCard}>
            <View style={styles.stationHeader}>
              <Ionicons name="location" size={24} color={COLORS.secondary} />
              <Text style={styles.stationTitle}>Nearest Police Station</Text>
            </View>
            <Text style={styles.stationName}>{nearestStation.station.name}</Text>
            <View style={styles.stationDetails}>
              <Ionicons name="navigate" size={16} color={COLORS.text.secondary} />
              <Text style={styles.stationDistance}>
                {nearestStation.distance.toFixed(2)} km away
              </Text>
            </View>
            <View style={styles.stationDetails}>
              <Ionicons name="call" size={16} color={COLORS.text.secondary} />
              <Text style={styles.stationPhone}>
                {nearestStation.station.emergencyLine}
              </Text>
            </View>
            <Text style={styles.stationAddress}>
              {nearestStation.station.address}
            </Text>
          </View>
        )}

        {/* Voice Mode UI */}
        {mode === 'voice' && (
          <View style={styles.voiceContainer}>
            <Text style={styles.voiceInstruction}>
              {!audioUri
                ? isRecording
                  ? '🔴 Recording... Tap to stop'
                  : 'Tap microphone to record'
                : '✅ Recording saved'}
            </Text>

            {!audioUri && (
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isSending}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isRecording ? "stop-circle" : "mic"}
                  size={80}
                  color={isRecording ? COLORS.error : COLORS.primary}
                />
              </TouchableOpacity>
            )}

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingDuration}>
                  {AudioRecordingService.formatDuration(recordingDuration)}
                </Text>
              </View>
            )}

            {audioUri && !isRecording && (
              <View style={styles.playbackContainer}>
                <View style={styles.savedIndicator}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.secondary} />
                  <Text style={styles.recordingLabel}>Recording Saved</Text>
                </View>

                <Text style={styles.recordingDuration}>
                  {AudioRecordingService.formatDuration(recordingDuration)}
                </Text>

                <View style={styles.playbackButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={playRecording}
                    disabled={isPlaying}
                  >
                    <View style={[styles.actionButtonCircle, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={32}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.actionButtonLabel}>
                      {isPlaying ? 'Playing' : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={deleteRecording}
                  >
                    <View style={[styles.actionButtonCircle, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="trash" size={32} color={COLORS.error} />
                    </View>
                    <Text style={styles.actionButtonLabel}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={startRecording}
                  >
                    <View style={[styles.actionButtonCircle, { backgroundColor: '#dcfce7' }]}>
                      <Ionicons name="mic" size={32} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.actionButtonLabel}>Re-record</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Text Mode UI */}
        {mode === 'text' && (
          <View style={styles.chatContainer}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={60} color={COLORS.text.light} />
                <Text style={styles.emptyChatText}>
                  Start typing your emergency details
                </Text>
                <Text style={styles.emptyChatSubtext}>
                  Describe what happened and any important information
                </Text>
              </View>
            ) : (
              messages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.userMessage : styles.systemMessage,
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    msg.isUser && { color: COLORS.text.white }
                  ]}>
                    {msg.text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    msg.isUser && { color: 'rgba(255,255,255,0.8)' }
                  ]}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Input (Text Mode) */}
      {mode === 'text' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your emergency..."
              placeholderTextColor={COLORS.text.light}
              multiline
              maxLength={500}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isSending}
            >
              <Ionicons
                name="send"
                size={24}
                color={!inputText.trim() || isSending ? COLORS.text.light : COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Send Report Button */}
      {((mode === 'voice' && audioUri) || (mode === 'text' && messages.length > 0)) && (
        <View style={styles.sendReportContainer}>
          <TouchableOpacity
            style={[
              styles.sendReportButton,
              (isSending || !currentLocation) && styles.sendReportButtonDisabled
            ]}
            onPress={sendEmergencyReport}
            disabled={isSending || !currentLocation}
            activeOpacity={0.8}
          >
            {isSending ? (
              <>
                <ActivityIndicator color={COLORS.text.white} />
                <Text style={styles.sendReportText}>Sending...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={24} color={COLORS.text.white} />
                <Text style={styles.sendReportText}>Send Emergency Report</Text>
              </>
            )}
          </TouchableOpacity>

          {!currentLocation && (
            <Text style={styles.sendWarning}>
              ⚠️ Waiting for location...
            </Text>
          )}
        </View>
      )}

      {/* WhatsApp 2 Modal */}
      <WhatsApp2Modal />

      {/* Send Options Modal */}
      <SendOptionsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    // NEW ADDED - Changed to row layout for back button
    flexDirection: 'row',
  },
  // NEW ADDED - Back button style
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  // NEW ADDED - Centered header content container
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  modeSwitcher: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modeButtonTextActive: {
    color: COLORS.text.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: SPACING.md,
  },
  locationCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  stationCard: {
    margin: SPACING.lg,
    marginTop: 0,
    padding: SPACING.lg,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  stationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  stationDistance: {
    fontSize: 15,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  stationPhone: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  stationAddress: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  voiceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    minHeight: 350,
  },
  voiceInstruction: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#fee2e2',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  recordingDuration: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  playbackContainer: {
    alignItems: 'center',
    width: '100%',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  recordingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  playbackButtons: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: SPACING.xl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonLabel: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  chatContainer: {
    padding: SPACING.lg,
    minHeight: 350,
    flex: 1,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
    flex: 1,
  },
  emptyChatText: {
    marginTop: SPACING.lg,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  emptyChatSubtext: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.light,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  systemMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    padding: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    marginRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    borderColor: COLORS.border,
  },
  sendReportContainer: {
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sendReportButton: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendReportButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#999',
  },
  sendReportText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  sendWarning: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  // ========================================================================
  // START <=WhatsApp 2 Modal Styles
  // ========================================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.text.light,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonSend: {
    backgroundColor: COLORS.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  modalButtonTextSend: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },

  // ========================================================================
  // Send Options Modal Styles
  // ========================================================================
  sendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sendModalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
    maxHeight: '80%',
  },
  sendModalHeader: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sendModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sendModalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  sendOptionsScroll: {
    maxHeight: 400,
  },
  sendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sendOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  sendOptionText: {
    flex: 1,
  },
  sendOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sendOptionSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  sendModalCancelButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  // ===================================
  // ENDING <=WhatsApp 2 Modal Styles
  // ===================================
});
export default EmergencyReportScreen;