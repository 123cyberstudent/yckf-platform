import authService, { API_BASE_URL } from '../services/AuthService';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import * as ImagePicker from 'expo-image-picker';

// Components
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import DatePicker from '../components/forms/DatePicker';
import DropdownPicker from '../components/forms/DropdownPicker';
import LocationPicker from '../components/forms/LocationPicker';

// Services & Contexts
import LocationService from '../services/LocationService';
import EmailService from '../services/EmailService';
import WhatsAppService from '../services/WhatsAppService';
import NotificationService from '../services/NotificationService';
import { useStorage } from '../contexts/StorageContext';
import { useLocation } from '../contexts/LocationContext';
import { useApp } from '../contexts/AppContext';

// Utils & Types
import {
  COLORS,
  SPACING,
  CYBERCRIME_TYPES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  FILE_CONFIG,
} from '../utils/constants';
import { CybercrimeReportForm, EvidenceItem } from '../types';

const validationSchema = yup.object().shape({
  fullName: yup.string().required('Full name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().required('Email is required').email('Please enter a valid email'),
  phoneNumber: yup.string().required('Phone number is required').min(7, 'Phone number seems short'),
  city: yup.string().required('City/Location is required').min(2, 'City must be at least 2 characters'),
 dateOfIncident: yup
    .date()
    .required('Date of incident is required')
    .test('max-date', 'Date cannot be in the future', function(value) {
      if (!value) return false;
      // Get start of today (midnight)
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today
      return value <= today;
    }),
  typeOfCybercrime: yup.string().required('Please select the type of cybercrime'),
  details: yup.string().required('Incident details are required').min(20, 'Please provide more details (min 20 chars)'),
});

// Helper function to convert image URI to base64
const convertImageToBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
};

const CybercrimeReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { saveEvidenceItem } = useStorage();
  const { getCurrentLocation } = useLocation();
  const { state } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [capturedLocation, setCapturedLocation] = useState<any>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<CybercrimeReportForm>({
    resolver: yupResolver(validationSchema),
    mode: 'all', // validate onBlur + onChange + onSubmit
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      city: '',
      dateOfIncident: new Date(),
      typeOfCybercrime: '',
      details: '',
    },
  });

  useEffect(() => {
    // Auto-capture location on mount
    handleCaptureLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCaptureLocation = useCallback(async () => {
    setIsCapturingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setCapturedLocation(loc);
        // Try reverse geocode for city
        const addr = await LocationService.getAddressFromLocation(loc);
        const currentCity = getValues('city');
        if (addr?.city && !currentCity) {
          setValue('city', addr.city);
        }
      }
    } catch (err) {
      console.error('Capture location failed', err);
    } finally {
      setIsCapturingLocation(false);
    }
  }, [getCurrentLocation, setValue, getValues]);

  const generateCaseId = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `YCKF${timestamp}${random}`;
  };

  const pickImages = useCallback(async () => {
  try {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload evidence photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: FILE_CONFIG.compressionQuality || 0.8,
      base64: false,
      allowsEditing: false,
    });

    // Check if user cancelled
    if (result.canceled) {
      return;
    }

    const uris: string[] = [];

    // Handle multiple selection (result.assets array)
    if (result.assets && Array.isArray(result.assets)) {
      result.assets.forEach((asset) => {
        if (asset?.uri) {
          uris.push(asset.uri);
        }
      });
    }

    // Filter out duplicates and invalid entries
    const filtered = uris.filter(
      (uri) => typeof uri === 'string' && uri.length > 0 && !selectedPhotos.includes(uri)
    );

    if (filtered.length === 0) {
      Alert.alert('No Photos Selected', 'Please select at least one photo.');
      return;
    }

    setSelectedPhotos((prev) => [...prev, ...filtered]);
    
    console.log(`Successfully added ${filtered.length} photo(s)`);
  } catch (err) {
    console.error('Image pick failed', err);
    Alert.alert('Photo Error', 'Unable to pick photo. Please try again.');
  }
}, [selectedPhotos]);

  const removePhoto = useCallback((uri: string) => {
    setSelectedPhotos(prev => prev.filter(u => u !== uri));
  }, []);

 const saveToEvidenceBox = useCallback(async (reportData: CybercrimeReportForm): Promise<string> => {
  
  // Get current user to tie report to their account
  const currentUser = await authService.getCurrentUser();
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  
  // Convert all photos to base64
  const base64Photos: string[] = [];
  for (const photoUri of selectedPhotos) {
    try {
      const base64 = await convertImageToBase64(photoUri);
      base64Photos.push(base64);
    } catch (error) {
      console.error('Failed to convert photo:', photoUri, error);
      // Continue with other photos even if one fails
    }
  }
  
  const caseId = generateCaseId();
  const evidenceItem: EvidenceItem = {
    id: caseId,
    type: 'report',
    title: `Cybercrime Report - ${reportData.typeOfCybercrime}`,
    description: `Report filed by ${reportData.fullName} on ${new Date(reportData.dateOfIncident).toLocaleDateString()}`,
    data: {
      ...reportData,
      caseId,
      evidencePhotos: base64Photos, // Use base64 instead of URIs
      location: capturedLocation,
      userId: currentUser.id,
    },
    timestamp: Date.now(),
    isSubmitted: false,
  };
  const ok = await saveEvidenceItem(evidenceItem);
  if (!ok) throw new Error('Failed to save evidence locally');
  await NotificationService.showDataSavedNotification('Cybercrime Report');
  return caseId;
}, [capturedLocation, selectedPhotos, saveEvidenceItem]);

  const submitViaEmail = useCallback(async (reportData: CybercrimeReportForm, caseId: string) => {
  try {
    // Convert photos to base64 if not already
    const base64Photos: string[] = [];
    for (const photo of selectedPhotos) {
      if (photo.startsWith('data:image')) {
        // Already base64
        base64Photos.push(photo);
      } else {
        // Convert URI to base64
        try {
          const base64 = await convertImageToBase64(photo);
          base64Photos.push(base64);
        } catch (error) {
          console.error('Failed to convert photo for email:', error);
        }
      }
    }
    
    const payload = {
      ...reportData,
      caseId,
      evidencePhotos: base64Photos,
      location: capturedLocation,
    };
    const res = await EmailService.sendCybercrimeReport(payload as any);
    return res?.success ?? false;
  } catch (err) {
    console.error('Email submission failed', err);
    return false;
  }
}, [capturedLocation, selectedPhotos]);


  const submitViaWhatsApp = useCallback(async (reportData: CybercrimeReportForm, caseId: string) => {
    try {
      const payload = {
        ...reportData,
        caseId,
        location: capturedLocation,
      };
      const res = await WhatsAppService.sendCybercrimeReport(payload as any);
      return res?.success ?? false;
    } catch (err) {
      console.error('WhatsApp submission failed', err);
      return false;
    }
  }, [capturedLocation]);

  const submitToAPI = useCallback(async (reportData: CybercrimeReportForm): Promise<boolean> => {
    try {
      const token = await authService.getToken();
      const locationStr = capturedLocation
        ? `${capturedLocation.latitude ?? ''},${capturedLocation.longitude ?? ''}`
        : '';

      const body = {
        fullName: reportData.fullName,
        email: reportData.email,
        phone: reportData.phoneNumber || '',
        address: reportData.city || '',
        incidentDate: reportData.dateOfIncident
          ? new Date(reportData.dateOfIncident).toISOString()
          : '',
        incidentType: reportData.typeOfCybercrime,
        description: reportData.details,
        location: locationStr,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.warn('Backend report submission failed:', response.status);
        return false;
      }

      console.log('Report submitted to backend API');
      return true;
    } catch (err) {
      console.warn('Backend API submission failed (non-blocking):', err);
      return false;
    }
  }, [capturedLocation]);

  const onSubmit = useCallback(async (data: CybercrimeReportForm) => {
    setIsSubmitting(true);
    try {
      // Save first to evidence box (local)
      const caseId = await saveToEvidenceBox(data);

      if (!state.isOnline) {
        Alert.alert(
          'Saved Offline',
          `Your report has been saved locally with Case ID: ${caseId}. It will be submitted when you are back online.`,
          [{
            text: 'OK', onPress: () => {
              reset(); // reset form
              navigation.goBack();
            }
          }]
        );
        return;
      }

      // Online -> ask submit method
      Alert.alert(
        'Submit Report',
        `Your report is saved locally (Case ID: ${caseId}). How would you like to submit it now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Email',
            onPress: async () => {
              setIsSubmitting(true);
              const [emailOk] = await Promise.all([
                submitViaEmail(data, caseId),
                submitToAPI(data),
              ]);
              setIsSubmitting(false);
              if (emailOk) {
                await NotificationService.showReportSubmittedNotification(caseId);
                Alert.alert('Success', SUCCESS_MESSAGES.REPORT_SUBMITTED, [{ text: 'OK', onPress: () => { reset(); navigation.goBack(); } }]);
              } else {
                Alert.alert('Email Failed', 'Saved offline. You can submit later from Evidence SafeBox.');
              }
            },
          },
          {
            text: 'WhatsApp',
            onPress: async () => {
              setIsSubmitting(true);
              const [waOk] = await Promise.all([
                submitViaWhatsApp(data, caseId),
                submitToAPI(data),
              ]);
              setIsSubmitting(false);
              if (waOk) {
                await NotificationService.showReportSubmittedNotification(caseId);
                Alert.alert('Success', SUCCESS_MESSAGES.REPORT_SUBMITTED, [{ text: 'OK', onPress: () => { reset(); navigation.goBack(); } }]);
              } else {
                Alert.alert('WhatsApp Failed', 'Saved offline. You can submit later from Evidence SafeBox.');
              }
            },
          },
          {
            text: 'Both',
            onPress: async () => {
              setIsSubmitting(true);
              const [emailOk, waOk] = await Promise.all([
                submitViaEmail(data, caseId),
                submitViaWhatsApp(data, caseId),
                submitToAPI(data),
              ]);
              setIsSubmitting(false);
              if (emailOk || waOk) {
                await NotificationService.showReportSubmittedNotification(caseId);
                Alert.alert('Success', SUCCESS_MESSAGES.REPORT_SUBMITTED, [{ text: 'OK', onPress: () => { reset(); navigation.goBack(); } }]);
              } else {
                Alert.alert('Submission Failed', 'Saved offline. You can submit later from Evidence SafeBox.');
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Report submission flow failed', err);
      Alert.alert('Error', ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }, [navigation, reset, saveToEvidenceBox, state.isOnline, submitViaEmail, submitViaWhatsApp, submitToAPI]);

  // Temporary debug watcher - remove in production if noisy
  useEffect(() => {
    const sub = watch((value, { name }) => {
      // NOTE: keep these logs for debugging during development only
      // eslint-disable-next-line no-console
      console.log('form watch ->', { name, value });
      // eslint-disable-next-line no-console
      console.log('errors ->', errors);
      // eslint-disable-next-line no-console
      console.log('isValid ->', isValid);
    });
    return () => sub.unsubscribe();
  }, [watch, errors, isValid]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Report Cybercrime</Text>
            <Text style={styles.subtitle}>Provide as much detail as possible — the more info, the better we can help.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
              <Input label="Full Name" value={value} onChangeText={onChange} placeholder="Your full name" error={errors.fullName?.message} required testID="fullName-input" />
            )} />

            <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
              <Input label="Email Address" value={value} onChangeText={onChange} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} required testID="email-input" />
            )} />
            <Controller control={control} name="phoneNumber" render={({ field: { onChange, value } }) => (
              <Input label="Phone Number" value={value} onChangeText={onChange} placeholder="+233 ..." keyboardType="phone-pad" error={errors.phoneNumber?.message} required testID="phoneNumber-input" />
            )} />

            <Controller control={control} name="city" render={({ field: { onChange, value } }) => (
              <Input label="City/Location" value={value} onChangeText={onChange} placeholder="City or area" error={errors.city?.message} required testID="city-input" />
            )} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Information</Text>

            <Controller control={control} name="dateOfIncident" render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Date of Incident"
                value={value}
                onChange={(val) => {
                  // Normalize: if val is string or number, convert to Date
                  let d: any = val;
                  if (typeof val === 'string' || typeof val === 'number') {
                    d = new Date(val);
                  }
                  onChange(d);
                }}
                error={errors.dateOfIncident?.message}
                required
                maxDate={new Date()}
                testID="dateOfIncident-picker"
              />
            )} />

            <Controller control={control} name="typeOfCybercrime" render={({ field: { onChange, value } }) => (
              <DropdownPicker label="Type of Cybercrime" value={value} onValueChange={onChange} items={CYBERCRIME_TYPES.map(t => ({ label: t, value: t }))} placeholder="Select type" error={errors.typeOfCybercrime?.message} required testID="type-picker" />
            )} />

            <Controller control={control} name="details" render={({ field: { onChange, value } }) => (
              <Input label="Incident Details" value={value} onChangeText={onChange} placeholder="Describe what happened (include links, amounts, phone numbers...)" multiline numberOfLines={6} error={errors.details?.message} required testID="details-input" />
            )} />
          </View>

          {/* Evidence / Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence (optional)</Text>

            <View style={styles.photoRow}>
              {selectedPhotos.map(uri => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(uri)} testID={`remove-photo-${uri}`}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages} testID="add-photos-btn" activeOpacity={0.7}>
                <Text style={styles.addPhotoText}>Add Photos</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <LocationPicker label="GPS Location" location={capturedLocation} onLocationCapture={handleCaptureLocation} isCapturing={isCapturingLocation} />
          </View>

          {/* Submit */}
          <View style={styles.submitSection}>
            <Button title={isSubmitting ? 'Submitting...' : 'Submit Report'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} loading={isSubmitting} icon="send" fullWidth size="large" testID="submit-button" />
          </View>
          <View style={styles.footer} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: SPACING.lg
  },

  header: {
    paddingVertical: SPACING.xl,
    alignItems: 'center'

  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md
  },

  section: {
    marginBottom: SPACING.xl
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  photoWrap: {
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    position: 'relative'
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  removePhotoBtn: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center'
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12
  },
  addPhotoBtn: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  addPhotoText: {
    color: COLORS.text.secondary,
    fontSize: 12,
    textAlign: 'center'
  },
  submitSection: {
    paddingVertical: SPACING.lg
  },
  footer: {
    height: SPACING.xl
  },
});
export default CybercrimeReportScreen;
