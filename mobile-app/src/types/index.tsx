// Core type definitions for YCKF Mobile App

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  EmergencyReport: undefined;
  CybercrimeReport: undefined;
  ContactForm: undefined;
  EvidenceSafeBox: undefined;
  CaseTracker: undefined;
  About: undefined;
  Settings: undefined;
  MyReports: undefined;
  // Commerce / Wallet screens
  Plans: undefined;
  CourseCatalog: undefined;
  Checkout: {
    orderType: 'COURSE' | 'CREDIT_PACKAGE';
    productId: number;
    productName: string;
    price: number;
    creditsPrice?: number;
    totalCredits?: number;
  };
  PaystackWebView: {
    orderNumber: string;
    authorizationUrl: string;
    mode?: 'order' | 'subscription';
    reference?: string;
    continueTo?: OrderContinueTarget;
  };
  OrderResult: {
    success: boolean;
    orderNumber: string;
    message: string;
    continueTo?: OrderContinueTarget;
  };
  MyOrders: undefined;
};

/**
 * Destination to hand off to after a successful premium subscription payment,
 * so the user resumes exactly where they left off.
 */
export type OrderContinueTarget = {
  screen: 'Root';
  params?: undefined;
};

// Report from backend
export interface Report {
  id: number;
  ticketNumber: string;
  incidentType: string;
  status: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
  updatedAt: string;
  cases?: {
    id: number;
    status: string;
    assignedInvestigator?: { id: number; fullName: string } | null;
    responses?: {
      id: number;
      message: string;
      author: { id: number; fullName: string; role: string };
      createdAt: string;
    }[];
  }[];
}

// Specialist from backend
export interface BackendSpecialist {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  avatarUrl: string;
  isActive: boolean;
}

// Booking from backend
export interface BackendBooking {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  caseDescription: string;
  specialist: string;
  status: string;
  assignedSpecialist?: BackendSpecialist | null;
  createdAt: string;
}

// Location Types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface LocationAddress {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  name?: string;
  district?: string;
  subregion?: string;
}

// Form Types
export interface CybercrimeReportForm {
  fullName: string;
  email: string;
  phoneNumber: string;
  city: string;
  dateOfIncident: Date;
  typeOfCybercrime: string;
  details: string;
  location?: LocationData;
  evidencePhotos?: string[];
  caseId?: string;
  timestamp?: number;
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
  timestamp?: number;
}

// Evidence SafeBox Types
export interface EvidenceItem {
  id: string;
  type: 'report' | 'photo' | 'document';
  title: string;
  description?: string;
  data: any;
  timestamp: number;
  isSubmitted: boolean;
  fileUri?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface SafeBoxData {
  items: EvidenceItem[];
  totalItems: number;
  totalSize: number;
  lastUpdated: number;
}

// Case Tracker Types
export interface CaseInfo {
  caseId: string;
  status: CaseStatus;
  title: string;
  description?: string;
  dateReported: Date;
  lastUpdated: Date;
  volunteer?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  updates: CaseUpdate[];
}

export interface CaseUpdate {
  id: string;
  date: Date;
  status: CaseStatus;
  message: string;
  updatedBy: string;
}

export type CaseStatus = 'received' | 'under_review' | 'investigating' | 'resolved' | 'closed';

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiResponse<T = any> extends ServiceResponse<T> {
  statusCode?: number;
  timestamp?: number;
}

// Permission Types
export interface PermissionStatus {
  granted: boolean;
  canAskAgain?: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface AppPermissions {
  location: PermissionStatus;
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
  notifications: PermissionStatus;
}

// File Types
export interface FileInfo {
  uri: string;
  name?: string;
  size?: number;
  type?: string;
  width?: number;
  height?: number;
}

export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
  orientation?: number;
  base64?: string;
}

// Network Types
export interface NetworkInfo {
  isConnected: boolean;
  type: string;
  isWifiEnabled?: boolean;
  strength?: number;
}

// App State Types
export interface AppState {
  isLoading: boolean;
  isOnline: boolean;
  permissions: AppPermissions;
  location?: LocationData;
  user?: UserProfile;
  settings: AppSettings;
}

export interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string;
  preferredContact?: 'email' | 'whatsapp';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  locationTracking: boolean;
  autoSave: boolean;
  language: string;
}

// Component Props Types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: any;
  testID?: string;
}

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  style?: any;
  testID?: string;
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: any;
  contentStyle?: any;
  shadow?: boolean;
  testID?: string;
}

// Quick Action Types
export interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  screen?: string;
  action?: string;
  color: string;
  disabled?: boolean;
}

// Validation Types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

// Storage Types
export interface StorageItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

// Hook Return Types
export interface UseLocationReturn {
  location: LocationData | null;
  address: LocationAddress | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationData | null>;
  getAddressFromLocation: (location: LocationData) => Promise<LocationAddress | null>;
}

export interface UseStorageReturn<T = any> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  setData: (data: T) => Promise<void>;
  clearData: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UsePermissionsReturn {
  permissions: AppPermissions;
  isLoading: boolean;
  requestPermission: (type: keyof AppPermissions) => Promise<PermissionStatus>;
  checkPermission: (type: keyof AppPermissions) => Promise<PermissionStatus>;
  requestAllPermissions: () => Promise<AppPermissions>;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp?: number;
  stack?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

// Event Types
export interface AppEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Booking Types (ADD TO END OF FILE)
export interface Specialist {
  id: number;
  name: string;
  iconName: string;
  color: string;
}

export interface BookingData {
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  caseDescription: string;
  specialist: string;
}

export type PaymentMethod = 'mobile_money' | 'visa' | 'paystack';

export interface PaymentProvider {
  name: string;
  logo: string;
  accountNumber: string;
}
//Ended here