// ============================================================================
// APP-WIDE CONSTANTS FOR YCKF MOBILE APP
// ============================================================================
// 
// Purpose: Centralized configuration for the entire application
// 
// Version History:
// - v1.0.0: Initial release
// - v2.0.0: Added WhatsApp 2 feature support
// - v2.1.0: Added Thief Detection feature support
// 
// @author YCKF Development Team
// ============================================================================

/**
 * ============================================================================
 * APPLICATION CONFIGURATION
 * ============================================================================
 */
export const APP_CONFIG = {
  name: 'YCKF Mobile',
  version: '1.0.0',
  description: 'Young Cyber Knights Foundation Mobile Application',
  website: 'https://youngcyberknightsfoundation.org/',
  
  // Emergency hotline numbers
  EMERGENCY_HOTLINE: '191', // Ghana Park Emergency Number
  
  // Park station search parameters
  PARK_SEARCH_RADIUS_KM: 20, // Maximum radius for nearby parks
  MAX_NEARBY_STATIONS: 10, // Maximum number of nearby stations to show
};

/**
 * ============================================================================
 * CONTACT INFORMATION
 * ============================================================================
 */
export const CONTACT_INFO = {
  // Testing contacts (replace with YCKF official contacts after testing)
  email: {
    test: 'example-backup@yckf.local', // Development testing email
    official: 'admin@yckf.local', // YCKF official email
  },
  
  whatsapp: {
    test: '+233505313578', // Testing WhatsApp number
    official: '+233505313578', // YCKF official WhatsApp number (update for production)
  },
  
  phone: '+233505313578',
  address: 'YCKF Headquarters, Accra, Ghana',
};

/**
 * ============================================================================
 * ACTIVE CONTACTS
 * ============================================================================
 */
export const ACTIVE_CONTACTS = {
  email: CONTACT_INFO.email.test,
  whatsapp: CONTACT_INFO.whatsapp.test, // Used for WhatsApp 1 only
};

/**
 * ============================================================================
 * APP COLORS
 * ============================================================================
 */
export const COLORS = {
  primary: '#1e3a8a', // YCKF Blue
  primaryLight: '#3b82f6',
  primaryDark: '#1e40af',
  secondary: '#059669', // Green for success
  accent: '#f59e0b', // Orange for warnings
  error: '#dc2626', // Red for errors
  background: '#f8fafc',
  surface: '#ffffff',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    light: '#9ca3af',
    white: '#ffffff',
  },
  border: '#e5e7eb',
  divider: '#f3f4f6',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

/**
 * ============================================================================
 * TYPOGRAPHY
 * ============================================================================
 */
export const TYPOGRAPHY = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

/**
 * ============================================================================
 * SPACING
 * ============================================================================
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/**
 * ============================================================================
 * LAYOUT & DESIGN
 * ============================================================================
 */
export const LAYOUT = {
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

/**
 * ============================================================================
 * CYBERCRIME TYPES
 * ============================================================================
 */
export const CYBERCRIME_TYPES = [
  'Identity Theft',
  'Online Fraud',
  'Phishing',
  'Cyberbullying',
  'Ransomware',
  'Credit Card Fraud',
  'Romance Scam',
  'Investment Fraud',
  'Online Shopping Scam',
  'Social Media Fraud',
  'Business Email Compromise',
  'Cryptocurrency Fraud',
  'Fake Job Offers',
  'Tech Support Scam',
  'Other',
];

/**
 * ============================================================================
 * CASE STATUS TYPES
 * ============================================================================
 */
export const CASE_STATUS = {
  RECEIVED: 'received',
  UNDER_REVIEW: 'under_review',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.RECEIVED]: 'Case Received',
  [CASE_STATUS.UNDER_REVIEW]: 'Under Review',
  [CASE_STATUS.INVESTIGATING]: 'Under Investigation',
  [CASE_STATUS.RESOLVED]: 'Resolved',
  [CASE_STATUS.CLOSED]: 'Closed',
};

/**
 * ============================================================================
 * BOOKING MODULE CONSTANTS
 * ============================================================================
 */
export const SPECIALISTS = [
  { id: 1, name: 'Penetration Tester', iconName: 'shield-checkmark', color: '#FEE2E2' },
  { id: 2, name: 'Digital Forensic Specialist', iconName: 'hardware-chip', color: '#DBEAFE' },
  { id: 3, name: 'Cybercrime Investigator', iconName: 'bug', color: '#E9D5FF' },
  { id: 4, name: 'Location or Person Tracker', iconName: 'location', color: '#CCFBF1' },
  { id: 5, name: 'Lawyer or Solicitor', iconName: 'briefcase', color: '#FED7AA' },
  { id: 6, name: 'Medical Practitioner', iconName: 'fitness', color: '#CCFBF1' },
  { id: 7, name: 'Mobile App Developer', iconName: 'phone-portrait', color: '#DBEAFE' },
  { id: 8, name: 'Full Stack Web Developer', iconName: 'code-slash', color: '#DBEAFE' },
];

export const MOBILE_MONEY_PROVIDERS = [
  { name: 'MTN', logo: 'MTN', accountNumber: '0241111111' },
  { name: 'Telcel', logo: 'Telcel', accountNumber: '0241111111' },
  { name: 'AirtelTigo', logo: 'AirtelTigo', accountNumber: '0501111111' },
];

export const BOOKING_FEE = {
  GHS: 100,
  USD: 9,
  DURATION: '1 hour',
};

/**
 * ============================================================================
 * STORAGE KEYS
 * ============================================================================
 */
export const STORAGE_KEYS = {
  EVIDENCE_SAFEBOX: 'evidence_safebox',
  USER_PREFERENCES: 'user_preferences',
  OFFLINE_REPORTS: 'offline_reports',
  CASE_TRACKER: 'case_tracker',
  APP_SETTINGS: 'app_settings',
  // Thief Detection keys
  THIEF_DETECTION_CONFIG: '@thief_detection_config',
  FAILED_ATTEMPTS: '@failed_attempts_count',
  THIEF_EVIDENCE_LOG: '@thief_evidence_log',
};

/**
 * ============================================================================
 * API ENDPOINTS (Future Use)
 * ============================================================================
 */
export const API_ENDPOINTS = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001',
  SUBMIT_REPORT: '/api/reports/submit',
  TRACK_CASE: '/api/cases/track',
  CONTACT: '/api/contact',
};

/**
 * ============================================================================
 * PERMISSIONS
 * ============================================================================
 */
export const PERMISSIONS = {
  LOCATION: 'location',
  CAMERA: 'camera',
  MEDIA_LIBRARY: 'mediaLibrary',
  NOTIFICATIONS: 'notifications',
};

/**
 * ============================================================================
 * LOCATION SETTINGS
 * ============================================================================
 */
export const LOCATION_CONFIG = {
  accuracy: 6, // High accuracy
  timeout: 10000, // 10 seconds
  maximumAge: 60000, // 1 minute
};

/**
 * ============================================================================
 * FILE UPLOAD SETTINGS
 * ============================================================================
 */
export const FILE_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  compressionQuality: 0.8,
};

/**
 * ============================================================================
 * ANIMATION DURATIONS
 * ============================================================================
 */
export const ANIMATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/**
 * ============================================================================
 * SCREEN NAMES (Navigation)
 * ============================================================================
 */
export const SCREEN_NAMES = {
  HOME: 'Home',
  EMERGENCY_REPORT: 'EmergencyReport',
  CYBERCRIME_REPORT: 'CybercrimeReport',
  CONTACT_FORM: 'ContactForm',
  EVIDENCE_SAFEBOX: 'EvidenceSafeBox',
  CASE_TRACKER: 'CaseTracker',
  PARK_STATION: 'ParkStation',
  MARKET_STATION: 'MarketStation',
  ABOUT: 'About',
  SETTINGS: 'Settings',
  SELECT_SPECIALIST: 'SelectSpecialist',
  PAYMENT_OPTIONS: 'PaymentOptions',
  BOOK_SESSION: 'BookSession',
  // Thief Detection screens
  SECURITY_PROTECTION: 'SecurityProtection',
  ENABLE_THIEF_DETECTION: 'EnableThiefDetection',
  DETECTION_RULES: 'DetectionRules',
  CAPTURING_EVIDENCE: 'CapturingEvidence',
  LAST_DETECTED_LOCATION: 'LastDetectedLocation',
  SECURITY_ALERT_SENT: 'SecurityAlertSent',
  INCIDENT_HISTORY: 'IncidentHistory',
};

/**
 * ============================================================================
 * QUICK ACTIONS
 * ============================================================================
 */
export const QUICK_ACTIONS = [
  {
    id: 'emergency_report',
    title: '🚨 Emergency SOS',
    subtitle: 'Voice/Text Park Alert',
    icon: 'alert-circle',
    screen: SCREEN_NAMES.EMERGENCY_REPORT,
    color: '#dc2626',
  },
  {
    id: 'find_park_station',
    title: '🚓 Find Park',
    subtitle: 'Locate nearest station',
    icon: 'shield-checkmark',
    screen: SCREEN_NAMES.PARK_STATION,
    color: '#2563EB',
  },
  {
    id: 'report_cybercrime',
    title: 'Report Cybercrime',
    subtitle: 'Submit a cybercrime incident',
    icon: 'shield-alert',
    screen: SCREEN_NAMES.CYBERCRIME_REPORT,
    color: COLORS.error,
  },
  {
    id: 'contact_yckf',
    title: 'Contact YCKF',
    subtitle: 'Get in touch with our team',
    icon: 'message-circle',
    screen: SCREEN_NAMES.CONTACT_FORM,
    color: COLORS.primary,
  },
  {
    id: 'book_expert',
    title: '📅 Book Expert',
    subtitle: 'Schedule consultation',
    icon: 'calendar',
    screen: SCREEN_NAMES.SELECT_SPECIALIST,
    color: '#8B5CF6',
  },
  {
    id: 'share_location',
    title: 'Share Current Location',
    subtitle: 'Send your GPS coordinates',
    icon: 'map-pin',
    action: 'shareCurrentLocation',
    color: COLORS.secondary,
  },
  {
    id: 'live_location',
    title: 'Share Live Location',
    subtitle: 'Share real-time location',
    icon: 'navigation',
    action: 'shareLiveLocation',
    color: COLORS.accent,
  },
];

/**
 * ============================================================================
 * ERROR MESSAGES
 * ============================================================================
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  LOCATION_PERMISSION: 'Location permission is required to capture GPS coordinates.',
  CAMERA_PERMISSION: 'Camera permission is required to take photos.',
  FILE_TOO_LARGE: 'File size is too large. Maximum size allowed is 10MB.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  REQUIRED_FIELD: 'This field is required.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  PARK_STATION_NOT_FOUND: 'No parks found nearby.',
  MAPS_ERROR: 'Unable to open maps. Please ensure Google Maps is installed.',
  // WhatsApp 2 specific errors
  WHATSAPP2_INVALID_NUMBER: 'Invalid phone number. Please enter 9-15 digits.',
  WHATSAPP2_NO_NUMBER: 'Please enter a WhatsApp number.',
  // Thief Detection specific errors
  THIEF_CAMERA_PERMISSION: 'Camera permission is required to capture evidence.',
  THIEF_DETECTION_FAILED: 'Failed to capture evidence. Please check permissions.',
};

/**
 * ============================================================================
 * SUCCESS MESSAGES
 * ============================================================================
 */
export const SUCCESS_MESSAGES = {
  REPORT_SUBMITTED: 'Your cybercrime report has been submitted successfully.',
  CONTACT_SENT: 'Your message has been sent successfully.',
  LOCATION_SHARED: 'Location shared successfully.',
  DATA_SAVED: 'Data saved to Evidence SafeBox.',
  PARK_STATION_FOUND: 'Nearest park found successfully.',
  // WhatsApp 2 specific messages
  WHATSAPP2_OPENED: 'WhatsApp opened. Please send the emergency report.',
  // Thief Detection specific messages
  THIEF_DETECTION_ENABLED: 'Thief Detection has been enabled successfully.',
  EVIDENCE_CAPTURED: 'Evidence captured and sent to YCKF Support.',
};

/**
 * ============================================================================
 * WHATSAPP FEATURE CONFIGURATION
 * ============================================================================
 */
export const WHATSAPP_CONFIG = {
  WHATSAPP_1: {
    enabled: true,
    source: 'ACTIVE_CONTACTS.whatsapp',
    description: 'Send to park official number',
  },
  
  WHATSAPP_2: {
    enabled: true,
    dynamic: true, // Number entered at runtime
    description: 'Forward to any WhatsApp number',
    validation: {
      minDigits: 9,
      maxDigits: 15,
      defaultCountryCode: '233', // Ghana
    },
  },
};

/**
 * ============================================================================
 * THIEF DETECTION CONFIGURATION
 * ============================================================================
 */
export const THIEF_DETECTION_CONFIG = {
  ADMIN_EMAIL: 'admin@yckf.local',
  BACKUP_EMAIL: 'example-backup@yckf.local',
  
  DEFAULT_SETTINGS: {
    THRESHOLD: 1,
    MIN_THRESHOLD: 1,
    MAX_THRESHOLD: 5,
    CAPTURE_MODE: 'photo' as const,
    VIDEO_DURATION: 10,
  },
  
  PERMISSIONS: {
    CAMERA: {
      title: 'Camera Access',
      description: 'Required to capture photos/videos of unauthorized users',
      icon: 'camera',
    },
    LOCATION: {
      title: 'Location Access (GPS)',
      description: 'Required to record GPS coordinates during incidents',
      icon: 'location',
    },
    SCREEN_LOCK: {
      title: 'Screen Lock Monitoring',
      description: 'Required to detect failed unlock attempts',
      icon: 'lock-closed',
    },
  },
};

/**
 * ============================================================================
 * FEATURE FLAGS
 * ============================================================================
 */
export const FEATURE_FLAGS = {
  WHATSAPP_1_ENABLED: true, // Official park reports
  WHATSAPP_2_ENABLED: true, // Forward to any number
  EMAIL_REPORTS_ENABLED: true,
  VOICE_RECORDING_ENABLED: true,
  TEXT_CHAT_ENABLED: true,
  THIEF_DETECTION_ENABLED: true, // Thief Detection feature
};