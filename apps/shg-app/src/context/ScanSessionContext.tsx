import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

export interface ScanSessionData {
  sessionId: string;
  userId: string;
  userRole: string;
  sessionType: 'PICKUP' | 'DROP';
  status: string;
  orderIds: string[];
  totalExpected: number;
  totalScanned: number;
  scanned: any[];
  remaining: any[];
}

interface ScanSessionContextType {
  activeSession: ScanSessionData | null;
  activePickupSession: ScanSessionData | null;
  activeDropSession: ScanSessionData | null;
  loading: boolean;
  error: string | null;
  startSession: (type: 'PICKUP' | 'DROP', orderIds: string[]) => Promise<void>;
  scanParcel: (type: 'PICKUP' | 'DROP', sessionId: string, qrData: string) => Promise<void>;
  removeParcel: (type: 'PICKUP' | 'DROP', sessionId: string, parcelId: string) => Promise<void>;
  confirmSession: (type: 'PICKUP' | 'DROP', sessionId: string) => Promise<void>;
  confirmSessionOrder: (type: 'PICKUP' | 'DROP', sessionId: string, orderId: string) => Promise<void>;
  cancelSession: (type?: 'PICKUP' | 'DROP') => Promise<void>;
  refreshSession: (type?: 'PICKUP' | 'DROP') => Promise<void>;
  clearError: () => void;
}

const ScanSessionContext = createContext<ScanSessionContextType | undefined>(undefined);

const SESSION_PICKUP_KEY = '@gmu_active_pickup_session';
const SESSION_DROP_KEY = '@gmu_active_drop_session';

export const ScanSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePickupSession, setActivePickupSession] = useState<ScanSessionData | null>(null);
  const [activeDropSession, setActiveDropSession] = useState<ScanSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore sessions on boot
  useEffect(() => {
    restoreSessions();
  }, []);

  const restoreSessions = async () => {
    setLoading(true);
    try {
      // 1. Restore Pickup Session
      const storedPickup = await AsyncStorage.getItem(SESSION_PICKUP_KEY);
      if (storedPickup) {
        const parsed = JSON.parse(storedPickup) as ScanSessionData;
        try {
          const response = await axiosInstance.get(`/qr/pickup/session?sessionId=${parsed.sessionId}`);
          if (response.data) {
            setActivePickupSession(response.data);
            await AsyncStorage.setItem(SESSION_PICKUP_KEY, JSON.stringify(response.data));
          } else {
            await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
          }
        } catch {
          await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
        }
      }

      // 2. Restore Drop Session
      const storedDrop = await AsyncStorage.getItem(SESSION_DROP_KEY);
      if (storedDrop) {
        const parsed = JSON.parse(storedDrop) as ScanSessionData;
        try {
          const response = await axiosInstance.get(`/qr/drop/session?sessionId=${parsed.sessionId}`);
          if (response.data) {
            setActiveDropSession(response.data);
            await AsyncStorage.setItem(SESSION_DROP_KEY, JSON.stringify(response.data));
          } else {
            await AsyncStorage.removeItem(SESSION_DROP_KEY);
          }
        } catch {
          await AsyncStorage.removeItem(SESSION_DROP_KEY);
        }
      }
    } catch (err) {
      console.log('Failed to restore scan sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (type: 'PICKUP' | 'DROP', orderIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'PICKUP' ? '/qr/pickup/session/start' : '/qr/drop/session/start';
      const key = type === 'PICKUP' ? SESSION_PICKUP_KEY : SESSION_DROP_KEY;
      const response = await axiosInstance.post(endpoint, { orderIds });
      if (response.data) {
        if (type === 'PICKUP') {
          setActivePickupSession(response.data);
        } else {
          setActiveDropSession(response.data);
        }
        await AsyncStorage.setItem(key, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start scan session';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scanParcel = async (type: 'PICKUP' | 'DROP', sessionId: string, qrData: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'PICKUP' ? '/qr/pickup/scan' : '/qr/drop/scan';
      const key = type === 'PICKUP' ? SESSION_PICKUP_KEY : SESSION_DROP_KEY;
      const response = await axiosInstance.post(endpoint, { sessionId, qrData });
      if (response.data) {
        if (type === 'PICKUP') {
          setActivePickupSession(response.data);
        } else {
          setActiveDropSession(response.data);
        }
        await AsyncStorage.setItem(key, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to scan parcel';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeParcel = async (type: 'PICKUP' | 'DROP', sessionId: string, parcelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'PICKUP' ? '/qr/pickup/remove' : '/qr/drop/remove';
      const key = type === 'PICKUP' ? SESSION_PICKUP_KEY : SESSION_DROP_KEY;
      const response = await axiosInstance.post(endpoint, { sessionId, parcelId });
      if (response.data) {
        if (type === 'PICKUP') {
          setActivePickupSession(response.data);
        } else {
          setActiveDropSession(response.data);
        }
        await AsyncStorage.setItem(key, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to remove parcel';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSession = async (type: 'PICKUP' | 'DROP', sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'PICKUP' ? '/qr/pickup/confirm' : '/qr/drop/confirm';
      const key = type === 'PICKUP' ? SESSION_PICKUP_KEY : SESSION_DROP_KEY;
      await axiosInstance.post(endpoint, { sessionId });
      if (type === 'PICKUP') {
        setActivePickupSession(null);
      } else {
        setActiveDropSession(null);
      }
      await AsyncStorage.removeItem(key);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm session';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSessionOrder = async (type: 'PICKUP' | 'DROP', sessionId: string, orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'PICKUP' ? '/qr/pickup/confirm-order' : '/qr/drop/confirm-order';
      const key = type === 'PICKUP' ? SESSION_PICKUP_KEY : SESSION_DROP_KEY;
      await axiosInstance.post(endpoint, { sessionId, orderId });
      
      const response = await axiosInstance.get(
        type === 'PICKUP' ? `/qr/pickup/session?sessionId=${sessionId}` : `/qr/drop/session?sessionId=${sessionId}`
      );
      if (response.data) {
        if (type === 'PICKUP') {
          setActivePickupSession(response.data);
        } else {
          setActiveDropSession(response.data);
        }
        await AsyncStorage.setItem(key, JSON.stringify(response.data));
      } else {
        if (type === 'PICKUP') {
          setActivePickupSession(null);
        } else {
          setActiveDropSession(null);
        }
        await AsyncStorage.removeItem(key);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm order';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async (type?: 'PICKUP' | 'DROP') => {
    if (!type || type === 'PICKUP') {
      setActivePickupSession(null);
      await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
    }
    if (!type || type === 'DROP') {
      setActiveDropSession(null);
      await AsyncStorage.removeItem(SESSION_DROP_KEY);
    }
  };

  const refreshSession = async (type?: 'PICKUP' | 'DROP') => {
    await restoreSessions();
  };

  const clearError = () => setError(null);

  // activeSession returns fallback for backwards compatibility
  const activeSession = activePickupSession || activeDropSession;

  return (
    <ScanSessionContext.Provider
      value={{
        activeSession,
        activePickupSession,
        activeDropSession,
        loading,
        error,
        startSession,
        scanParcel,
        removeParcel,
        confirmSession,
        confirmSessionOrder,
        cancelSession,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </ScanSessionContext.Provider>
  );
};

export const useScanSession = () => {
  const context = useContext(ScanSessionContext);
  if (context === undefined) {
    throw new Error('useScanSession must be used within a ScanSessionProvider');
  }
  return context;
};
