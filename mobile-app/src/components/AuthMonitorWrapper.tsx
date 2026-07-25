// ============================================
// FILE: src/components/AuthMonitorWrapper.tsx
// Monitors user activity and handles auto-logout
// ============================================

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../services/AuthService';

interface AuthMonitorWrapperProps {
  children: React.ReactNode;
}

/**
 * This component wraps the entire app and monitors user activity
 * It tracks touches, scrolls, and other interactions
 * When user is inactive for 2 minutes, it triggers auto-logout
 */
const AuthMonitorWrapper: React.FC<AuthMonitorWrapperProps> = ({ children }) => {
  const navigation = useNavigation();

  useEffect(() => {
    // ============================================
    // SET LOGOUT CALLBACK
    // This will be called when auto-logout is triggered
    // It navigates the user back to WelcomeScreen
    // ============================================
    AuthService.setLogoutCallback(() => {
      console.log('🔒 Auto-logout callback - Redirecting to Welcome screen');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' as never }],
      });
    });

    // Cleanup on unmount
    return () => {
      AuthService.setLogoutCallback(() => {});
    };
  }, [navigation]);

  // ============================================
  // TRACK USER ACTIVITY
  // Every time user touches the screen, update activity time
  // ============================================
  const handleUserActivity = () => {
    AuthService.updateActivity();
  };

  return (
    <TouchableWithoutFeedback 
      onPress={handleUserActivity}
      accessible={false}
    >
      <View style={styles.container} onTouchStart={handleUserActivity}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthMonitorWrapper;