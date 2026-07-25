import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EvidenceItem, SafeBoxData } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import authService from '../services/AuthService';

interface StorageContextType {
  safeBoxData: SafeBoxData | null;
  isLoading: boolean;
  error: string | null;
  loadSafeBoxData: () => Promise<void>;
  saveEvidenceItem: (item: EvidenceItem) => Promise<boolean>;
  removeEvidenceItem: (itemId: string) => Promise<boolean>;
  clearSafeBox: () => Promise<boolean>;
  getStorageInfo: () => Promise<{ used: number; available: number }>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [safeBoxData, setSafeBoxData] = useState<SafeBoxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * Helper function to get user-specific storage key
   */
  const getUserSafeBoxKey = useCallback((userId: string | null): string => {
    if (!userId) {
      // Fallback to global key if no user (shouldn't happen in production)
      return STORAGE_KEYS.EVIDENCE_SAFEBOX;
    }
    return `${STORAGE_KEYS.EVIDENCE_SAFEBOX}_${userId}`;
  }, []);

  /**
   * Effect: Monitor auth state and update currentUserId
   * This runs periodically to check if user has logged in/out
   */
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const user = await authService.getCurrentUser();
        const userId = user?.id || null;
        
        // Only update if userId has changed
        setCurrentUserId(prevUserId => {
          if (prevUserId !== userId) {
            return userId;
          }
          return prevUserId;
        });
      } catch (err) {
        console.error('Failed to check auth state:', err);
      }
    };

    // Check immediately
    checkAuthState();

    // Set up interval to check auth state every 5 seconds
    const interval = setInterval(checkAuthState, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load SafeBox data for current user
   */
  const loadSafeBoxData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user ID from AuthService
      const user = await authService.getCurrentUser();
      const userId = user?.id || null;

      // If no user is logged in, clear the safebox
      if (!userId) {
        const emptySafeBox: SafeBoxData = {
          items: [],
          totalItems: 0,
          totalSize: 0,
          lastUpdated: Date.now(),
        };
        setSafeBoxData(emptySafeBox);
        setIsLoading(false);
        return;
      }

      // Load user-specific data
      const userKey = getUserSafeBoxKey(userId);
      const data = await AsyncStorage.getItem(userKey);
      
      if (data) {
        const safeBox: SafeBoxData = JSON.parse(data);
        setSafeBoxData(safeBox);
      } else {
        // Initialize empty safe box for this user
        const emptySafeBox: SafeBoxData = {
          items: [],
          totalItems: 0,
          totalSize: 0,
          lastUpdated: Date.now(),
        };
        setSafeBoxData(emptySafeBox);
        await AsyncStorage.setItem(userKey, JSON.stringify(emptySafeBox));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load safe box data';
      setError(errorMessage);
      console.error('Storage loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getUserSafeBoxKey]);

  /**
   * Save evidence item to current user's SafeBox
   */
  const saveEvidenceItem = useCallback(async (item: EvidenceItem): Promise<boolean> => {
    try {
      setError(null);

      // Get current user ID from AuthService
      const user = await authService.getCurrentUser();
      const userId = user?.id || null;

      // Ensure user is logged in
      if (!userId) {
        setError('No user logged in');
        console.error('Attempted to save evidence without logged in user');
        return false;
      }
      
      const currentData = safeBoxData || {
        items: [],
        totalItems: 0,
        totalSize: 0,
        lastUpdated: Date.now(),
      };

      // Check if item already exists (update scenario)
      const existingIndex = currentData.items.findIndex(existing => existing.id === item.id);
      
      let updatedItems: EvidenceItem[];
      if (existingIndex >= 0) {
        // Update existing item
        updatedItems = [...currentData.items];
        updatedItems[existingIndex] = item;
      } else {
        // Add new item
        updatedItems = [...currentData.items, item];
      }

      // Calculate total size
      const totalSize = updatedItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);

      const updatedSafeBox: SafeBoxData = {
        items: updatedItems,
        totalItems: updatedItems.length,
        totalSize,
        lastUpdated: Date.now(),
      };

      // Save to user-specific key
      const userKey = getUserSafeBoxKey(userId);
      await AsyncStorage.setItem(userKey, JSON.stringify(updatedSafeBox));
      setSafeBoxData(updatedSafeBox);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save evidence item';
      setError(errorMessage);
      console.error('Storage save error:', err);
      return false;
    }
  }, [safeBoxData, getUserSafeBoxKey]);

  /**
   * Remove evidence item from current user's SafeBox
   */
  const removeEvidenceItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      setError(null);

      // Get current user ID from AuthService
      const user = await authService.getCurrentUser();
      const userId = user?.id || null;

      // Ensure user is logged in
      if (!userId) {
        setError('No user logged in');
        return false;
      }
      
      if (!safeBoxData) {
        return false;
      }

      const updatedItems = safeBoxData.items.filter(item => item.id !== itemId);
      const totalSize = updatedItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);

      const updatedSafeBox: SafeBoxData = {
        items: updatedItems,
        totalItems: updatedItems.length,
        totalSize,
        lastUpdated: Date.now(),
      };

      // Save to user-specific key
      const userKey = getUserSafeBoxKey(userId);
      await AsyncStorage.setItem(userKey, JSON.stringify(updatedSafeBox));
      setSafeBoxData(updatedSafeBox);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove evidence item';
      setError(errorMessage);
      console.error('Storage remove error:', err);
      return false;
    }
  }, [safeBoxData, getUserSafeBoxKey]);

  /**
   * Clear current user's SafeBox
   */
  const clearSafeBox = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Get current user ID from AuthService
      const user = await authService.getCurrentUser();
      const userId = user?.id || null;

      // Ensure user is logged in
      if (!userId) {
        setError('No user logged in');
        return false;
      }
      
      const emptySafeBox: SafeBoxData = {
        items: [],
        totalItems: 0,
        totalSize: 0,
        lastUpdated: Date.now(),
      };

      // Clear user-specific data
      const userKey = getUserSafeBoxKey(userId);
      await AsyncStorage.setItem(userKey, JSON.stringify(emptySafeBox));
      setSafeBoxData(emptySafeBox);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear safe box';
      setError(errorMessage);
      console.error('Storage clear error:', err);
      return false;
    }
  }, [getUserSafeBoxKey]);

  /**
   * Get storage information (UPDATED: increased limit to 100MB)
   */
  const getStorageInfo = useCallback(async (): Promise<{ used: number; available: number }> => {
    try {
      // This is a rough estimation since AsyncStorage doesn't provide exact storage info
      const allKeys = await AsyncStorage.getAllKeys();
      let totalUsed = 0;

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalUsed += new Blob([value]).size;
        }
      }

      // UPDATED: Increased storage limit from 50MB to 100MB
      const estimatedLimit = 100 * 1024 * 1024; // 100MB
      const available = Math.max(0, estimatedLimit - totalUsed);

      return {
        used: totalUsed,
        available,
      };
    } catch (err) {
      console.error('Failed to get storage info:', err);
      return {
        used: 0,
        available: 0,
      };
    }
  }, []);

  /**
   * Effect: Reload SafeBox data when user changes
   * This ensures data isolation between different user sessions
   */
  useEffect(() => {
    // When user changes (login/logout), reload the appropriate data
    if (currentUserId !== null) {
      // User is logged in, load their data
      loadSafeBoxData();
    } else {
      // User is logged out, clear data
      setSafeBoxData({
        items: [],
        totalItems: 0,
        totalSize: 0,
        lastUpdated: Date.now(),
      });
    }
  }, [currentUserId, loadSafeBoxData]);

  const contextValue: StorageContextType = {
    safeBoxData,
    isLoading,
    error,
    loadSafeBoxData,
    saveEvidenceItem,
    removeEvidenceItem,
    clearSafeBox,
    getStorageInfo,
  };

  return (
    <StorageContext.Provider value={contextValue}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};