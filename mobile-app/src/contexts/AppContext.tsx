import React, { createContext, useContext, useReducer, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppSettings, UserProfile, AppPermissions } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initial state
const initialState: AppState = {
  isLoading: false,
  isOnline: true,
  permissions: {
    location: { granted: false, status: 'undetermined' },
    camera: { granted: false, status: 'undetermined' },
    mediaLibrary: { granted: false, status: 'undetermined' },
    notifications: { granted: false, status: 'undetermined' },
  },
  settings: {
    theme: 'system',
    notifications: true,
    locationTracking: true,
    autoSave: true,
    language: 'en',
  },
};

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_PERMISSIONS'; payload: Partial<AppPermissions> }
  | { type: 'SET_LOCATION'; payload: any }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_SETTING'; payload: { key: keyof AppSettings; value: any } };

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    
    case 'SET_PERMISSIONS':
      return {
        ...state,
        permissions: { ...state.permissions, ...action.payload },
      };
    
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    
    case 'SET_USER_PROFILE':
      return { ...state, user: action.payload };
    
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case 'UPDATE_SETTING':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value,
        },
      };
    
    default:
      return state;
  }
};

// Context type
interface AppContextType {
  state: AppState;
  setLoading: (loading: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  setPermissions: (permissions: Partial<AppPermissions>) => void;
  setLocation: (location: any) => void;
  setUserProfile: (user: UserProfile) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: state.isConnected || false });
    });

    return () => unsubscribe();
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Actions
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setOnlineStatus = (online: boolean) => {
    dispatch({ type: 'SET_ONLINE_STATUS', payload: online });
  };

  const setPermissions = (permissions: Partial<AppPermissions>) => {
    dispatch({ type: 'SET_PERMISSIONS', payload: permissions });
  };

  const setLocation = (location: any) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
  };

  const setUserProfile = (user: UserProfile) => {
    dispatch({ type: 'SET_USER_PROFILE', payload: user });
  };

  const setSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key, value } });
    // Auto-save settings after update
    setTimeout(() => saveSettings(), 100);
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(state.settings)
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (savedSettings) {
        const settings: AppSettings = JSON.parse(savedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const contextValue: AppContextType = {
    state,
    setLoading,
    setOnlineStatus,
    setPermissions,
    setLocation,
    setUserProfile,
    setSettings,
    updateSetting,
    saveSettings,
    loadSettings,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};