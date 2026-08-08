// ============================================
// FILE: src/navigation/AppNavigator.tsx
// Complete Navigation with Auth + All Features
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SCREEN_NAMES } from '../utils/constants';

// ⭐ Auth Screens (NEW)
import SplashScreen from '../screens/Auth/SplashScreen';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import CouponRedemptionScreen from '../screens/CouponRedemptionScreen';
import AdminLoginScreen from '../screens/Auth/AdminLoginScreen';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import CybercrimeReportScreen from '../screens/CybercrimeReportScreen';
import ContactFormScreen from '../screens/ContactFormScreen';
import EvidenceSafeBoxScreen from '../screens/EvidenceSafeBoxScreen';
import CaseTrackerScreen from '../screens/CaseTrackerScreen';
import AboutScreen from '../screens/AboutScreen';
import LocationShareScreen from '../screens/LocationShareScreen';
import EmergencyReportScreen from '../screens/EmergencyReportScreen';
import PoliceStationScreen from '../screens/PoliceStationScreen';
import FireStationScreen from '../screens/FireStationScreen';
// Booking Module Screens
import SelectSpecialistScreen from '../screens/Booking/SelectSpecialistScreen';
import BookSessionScreen from '../screens/Booking/BookSessionScreen';

// ⭐ Profile Screen (NEW)
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyReportsScreen from '../screens/MyReportsScreen';

// CMS Content Screens
import NewsScreen from '../screens/NewsScreen';
import EventsScreen from '../screens/EventsScreen';
import CoursesScreen from '../screens/CoursesScreen';
import ResourcesScreen from '../screens/ResourcesScreen';

// Commerce / Wallet Screens
import PlansScreen from '../screens/Wallet/PlansScreen';
import CourseCatalogScreen from '../screens/Wallet/CourseCatalogScreen';
import CheckoutScreen from '../screens/Wallet/CheckoutScreen';
import PaystackWebViewScreen from '../screens/Wallet/PaystackWebViewScreen';
import OrderResultScreen from '../screens/Wallet/OrderResultScreen';
import MyOrdersScreen from '../screens/Wallet/MyOrdersScreen';

// Stolen Phone Protection Screens
import SecurityProtectionScreen from '../screens/Security/SecurityProtectionScreen';
import MyDevicesScreen from '../screens/Security/MyDevicesScreen';

// Placeholder for missing screens
const MissingScreenPlaceholder: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>Missing Screen</Text>
    <Text style={styles.placeholderText}>
      The screen "{name}" was not found or failed to import. Check the file and export.
    </Text>
  </View>
);

function ensureScreen(component: any, name: string) {
  if (!component) {
    console.warn(`[AppNavigator] Screen component for "${name}" is missing — using placeholder.`);
    return () => <MissingScreenPlaceholder name={name} />;
  }
  return component;
}


// Tab param list - Updated with Profile
type TabParamList = {
  [SCREEN_NAMES.HOME]: undefined;
  [SCREEN_NAMES.CYBERCRIME_REPORT]: undefined;
  [SCREEN_NAMES.CONTACT_FORM]: undefined;
  [SCREEN_NAMES.EVIDENCE_SAFEBOX]: undefined;
  Profile: undefined;
};

// ⭐ NEW - Root Stack Param List with all screen params
type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  AdminLogin: undefined;
  Root: undefined;
  [SCREEN_NAMES.ABOUT]: undefined;
  [SCREEN_NAMES.SETTINGS]: undefined;
  [SCREEN_NAMES.MY_REPORTS]: undefined;
  [SCREEN_NAMES.CASE_TRACKER]: undefined;
  [SCREEN_NAMES.POLICE_STATION]: undefined;
  [SCREEN_NAMES.FIRE_STATION]: undefined;
  [SCREEN_NAMES.SECURITY_PROTECTION]: undefined;
  [SCREEN_NAMES.ENABLE_THIEF_DETECTION]: undefined;
  [SCREEN_NAMES.DETECTION_RULES]: undefined;
  [SCREEN_NAMES.CAPTURING_EVIDENCE]: undefined;
  [SCREEN_NAMES.LAST_DETECTED_LOCATION]: undefined;
  [SCREEN_NAMES.SECURITY_ALERT_SENT]: undefined;
  [SCREEN_NAMES.INCIDENT_HISTORY]: undefined;
  LocationShare: undefined;
  EmergencyReport: undefined;
  SelectSpecialist: undefined;
  BookSession: {
    specialist: any;
    paymentReference: string;
    paymentMethod: string;
  };
  CouponRedemption: undefined;
  AdminDashboard: undefined;
  [SCREEN_NAMES.PLANS]: undefined;
  [SCREEN_NAMES.COURSE_CATALOG]: undefined;
  [SCREEN_NAMES.CHECKOUT]: undefined;
  [SCREEN_NAMES.PAYSTACK_WEBVIEW]: undefined;
  [SCREEN_NAMES.ORDER_RESULT]: undefined;
  [SCREEN_NAMES.MY_ORDERS]: undefined;
  News: undefined;
  Events: undefined;
  Courses: undefined;
  Resources: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>(); // ⭐ UPDATED - Added generic type
const Tab = createBottomTabNavigator<TabParamList>();

// Main Tab Navigator - Updated with Profile
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName={SCREEN_NAMES.HOME}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let name: any = 'home';
          if (route.name === SCREEN_NAMES.HOME) name = 'home';
          else if (route.name === SCREEN_NAMES.CYBERCRIME_REPORT) name = 'document-text';
          else if (route.name === SCREEN_NAMES.CONTACT_FORM) name = 'chatbubble';
          else if (route.name === SCREEN_NAMES.EVIDENCE_SAFEBOX) name = 'archive';
          else if (route.name === 'Profile') name = 'person'; // ⭐ NEW
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text?.secondary ?? '#666',
        tabBarStyle: { backgroundColor: COLORS.surface },
      })}
    >
      <Tab.Screen
        name={SCREEN_NAMES.HOME}
        component={ensureScreen(HomeScreen, 'HomeScreen')}
        options={{ title: 'Home' }}
      />

      <Tab.Screen
        name={SCREEN_NAMES.CYBERCRIME_REPORT}
        component={ensureScreen(CybercrimeReportScreen, 'CybercrimeReportScreen')}
        options={{ title: 'Report' }}
      />

      <Tab.Screen
        name={SCREEN_NAMES.CONTACT_FORM}
        component={ensureScreen(ContactFormScreen, 'ContactFormScreen')}
        options={{ title: 'Contact' }}
      />

      <Tab.Screen
        name={SCREEN_NAMES.EVIDENCE_SAFEBOX}
        component={ensureScreen(EvidenceSafeBoxScreen, 'EvidenceSafeBoxScreen')}
        options={{ title: 'Evidence' }}
      />

      {/* ⭐ NEW - Profile Tab */}
      <Tab.Screen
        name="Profile"
        component={ensureScreen(ProfileScreen, 'ProfileScreen')}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash" // ⭐ CHANGED - Start with Splash instead of Root
      screenOptions={{ headerShown: false }}
    >
      {/* ⭐ Auth Flow (NEW) */}
      <Stack.Screen
        name="Splash"
        component={ensureScreen(SplashScreen, 'SplashScreen')}
      />
      <Stack.Screen
        name="Welcome"
        component={ensureScreen(WelcomeScreen, 'WelcomeScreen')}
      />
      <Stack.Screen
        name="Login"
        component={ensureScreen(LoginScreen, 'LoginScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={ensureScreen(RegisterScreen, 'RegisterScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminLogin"
        component={ensureScreen(AdminLoginScreen, 'AdminLoginScreen')}
        options={{ headerShown: false }}
      />

      {/* Main App */}
      <Stack.Screen name="Root" component={MainTabs} />

      {/* Other Screens */}
      <Stack.Screen
        name={SCREEN_NAMES.ABOUT}
        component={ensureScreen(AboutScreen, 'AboutScreen')}
        options={{ title: 'About' }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.SETTINGS}
        component={ensureScreen(SettingsScreen, 'SettingsScreen')}
        options={{ title: 'Settings' }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.MY_REPORTS}
        component={ensureScreen(MyReportsScreen, 'MyReportsScreen')}
        options={{ title: 'My Reports' }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.CASE_TRACKER}
        component={ensureScreen(CaseTrackerScreen, 'CaseTrackerScreen')}
        options={{ title: 'Case Tracker' }}
      />

      <Stack.Screen
        name="LocationShare"
        component={ensureScreen(LocationShareScreen, 'LocationShareScreen')}
        options={{ title: 'Share Location' }}
      />

      <Stack.Screen
        name="EmergencyReport"
        component={ensureScreen(EmergencyReportScreen, 'EmergencyReportScreen')}
        options={{
          headerShown: false,
          title: '🚨 Emergency SOS',
        }}
      />

      <Stack.Screen
        name={SCREEN_NAMES.POLICE_STATION}
        component={ensureScreen(PoliceStationScreen, 'PoliceStationScreen')}
        options={{
          headerShown: false,
          title: 'Find Police Station',
        }}
      />

      <Stack.Screen
  name={SCREEN_NAMES.FIRE_STATION}
  component={ensureScreen(FireStationScreen, 'FireStationScreen')}
  options={{
    headerShown: false,
    title: 'Find Fire Station',
  }}
/>

      {/* Booking Module */}
      <Stack.Screen
        name="SelectSpecialist"
        component={ensureScreen(SelectSpecialistScreen, 'SelectSpecialistScreen')}
        options={{
          headerShown: false,
          title: 'Book Expert Service',
        }}
      />
      <Stack.Screen
        name="BookSession"
        component={ensureScreen(BookSessionScreen, 'BookSessionScreen')}
        options={{
          headerShown: false,
          title: 'Book Your Session',
        }}
      />

      {/* ⭐ Coupon Redemption Screen (NEW) */}
      <Stack.Screen
        name="CouponRedemption"
        component={ensureScreen(CouponRedemptionScreen, 'CouponRedemptionScreen')}
        options={{
          headerShown: false,
          title: 'Activate Coupon',
        }}
      />
{/*  ⭐ NEW: Features Hub (Entry Point) */}
<Stack.Screen 
  name="YCKFMobileFeatures" 
  component={HomeScreen}
  options={{ headerShown: false }}
/>

{/* Admin Dashboard */}
<Stack.Screen
  name="AdminDashboard"
  component={ensureScreen(AdminDashboardScreen, 'AdminDashboardScreen')}
  options={{
    headerShown: false,
    title: 'Admin Dashboard',
  }}
/>

      {/* CMS Content Screens */}
      <Stack.Screen
        name="News"
        component={ensureScreen(NewsScreen, 'NewsScreen')}
        options={{ title: 'News' }}
      />
      <Stack.Screen
        name="Events"
        component={ensureScreen(EventsScreen, 'EventsScreen')}
        options={{ title: 'Events' }}
      />
      <Stack.Screen
        name="Courses"
        component={ensureScreen(CoursesScreen, 'CoursesScreen')}
        options={{ title: 'Courses' }}
      />
      <Stack.Screen
        name="Resources"
        component={ensureScreen(ResourcesScreen, 'ResourcesScreen')}
        options={{ title: 'Resources' }}
      />

      {/* Commerce / Wallet Screens */}
      <Stack.Screen
        name={SCREEN_NAMES.PLANS}
        component={ensureScreen(PlansScreen, 'PlansScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.COURSE_CATALOG}
        component={ensureScreen(CourseCatalogScreen, 'CourseCatalogScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.CHECKOUT}
        component={ensureScreen(CheckoutScreen, 'CheckoutScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.PAYSTACK_WEBVIEW}
        component={ensureScreen(PaystackWebViewScreen, 'PaystackWebViewScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.ORDER_RESULT}
        component={ensureScreen(OrderResultScreen, 'OrderResultScreen')}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MY_ORDERS}
        component={ensureScreen(MyOrdersScreen, 'MyOrdersScreen')}
        options={{ headerShown: false }}
      />

      {/* Stolen Phone Protection */}
      <Stack.Screen
        name={SCREEN_NAMES.SECURITY_PROTECTION}
        component={ensureScreen(SecurityProtectionScreen, 'SecurityProtectionScreen')}
        options={{ headerShown: false, title: 'Stolen Phone Protection' }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MY_DEVICES}
        component={ensureScreen(MyDevicesScreen, 'MyDevicesScreen')}
        options={{ headerShown: false, title: 'My Devices' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: COLORS?.background ?? '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS?.text?.primary ?? '#111',
  },
  placeholderText: {
    color: COLORS?.text?.secondary ?? '#666',
    textAlign: 'center',
  },
});
export default AppNavigator;