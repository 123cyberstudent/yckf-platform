import React, { createContext, useContext, useState, useCallback } from 'react';
import { LocationData, LocationAddress } from '../types';
import LocationService from '../services/LocationService';

interface LocationContextType {
  currentLocation: LocationData | null;
  currentAddress: LocationAddress | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationData | null>;
  getAddress: (location: LocationData) => Promise<LocationAddress | null>;
  startWatching: (callback: (location: LocationData) => void) => Promise<boolean>;
  stopWatching: () => void;
  clearError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [currentAddress, setCurrentAddress] = useState<LocationAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        // Also try to get address
        const address = await LocationService.getAddressFromLocation(location);
        setCurrentAddress(address);
      }
      return location;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAddress = useCallback(async (location: LocationData): Promise<LocationAddress | null> => {
    try {
      const address = await LocationService.getAddressFromLocation(location);
      if (currentLocation && 
          location.latitude === currentLocation.latitude && 
          location.longitude === currentLocation.longitude) {
        setCurrentAddress(address);
      }
      return address;
    } catch (err) {
      console.error('Failed to get address:', err);
      return null;
    }
  }, [currentLocation]);

  const startWatching = useCallback(async (callback: (location: LocationData) => void): Promise<boolean> => {
    try {
      const result = await LocationService.startWatchingLocation(callback);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start location watching';
      setError(errorMessage);
      return false;
    }
  }, []);

  const stopWatching = useCallback(() => {
    LocationService.stopWatchingLocation();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue: LocationContextType = {
    currentLocation,
    currentAddress,
    isLoading,
    error,
    getCurrentLocation,
    getAddress,
    startWatching,
    stopWatching,
    clearError,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};