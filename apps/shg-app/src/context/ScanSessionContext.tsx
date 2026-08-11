import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axiosInstance';

export interface ScanSessionData {
  sessionId: string;
  userId: string;
  userRole: string;
  sessionType: 'PICKUP';
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
  loading: boolean;
  error: string | null;
  startSession: (type: 'PICKUP', orderIds: string[]) => Promise<void>;
  scanParcel: (type: 'PICKUP', sessionId: string, qrData: string) => Promise<void>;
  removeParcel: (type: 'PICKUP', sessionId: string, parcelId: string) => Promise<void>;
  confirmSession: (type: 'PICKUP', sessionId: string) => Promise<void>;
  confirmSessionOrder: (type: 'PICKUP', sessionId: string, orderId: string) => Promise<void>;
  cancelSession: (type?: 'PICKUP') => Promise<void>;
  refreshSession: (type?: 'PICKUP') => Promise<void>;
  clearError: () => void;
}

const ScanSessionContext = createContext<ScanSessionContextType | undefined>(undefined);

const SESSION_PICKUP_KEY = '@gmu_active_pickup_session';

export const ScanSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePickupSession, setActivePickupSession] = useState<ScanSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore sessions on boot
  useEffect(() => {
    restoreSessions();
  }, []);

  const restoreSessions = async () => {
    try {
      const pickupData = await AsyncStorage.getItem(SESSION_PICKUP_KEY);
      if (pickupData) {
        const parsed = JSON.parse(pickupData);
        try {
          const res = await axiosInstance.get(`/qr/pickup/session?sessionId=${parsed.sessionId}`);
          if (res.data && res.data.status === 'IN_PROGRESS') {
            setActivePickupSession(res.data);
          } else {
            setActivePickupSession(null);
            await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
          }
        } catch {
          setActivePickupSession(null);
          await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
        }
      }
    } catch (err) {
      console.log('Failed to restore scan sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (_type: 'PICKUP', orderIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/qr/pickup/session/start', { orderIds });
      if (response.data) {
        setActivePickupSession(response.data);
        await AsyncStorage.setItem(SESSION_PICKUP_KEY, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start scan session';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scanParcel = async (_type: 'PICKUP', sessionId: string, qrData: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/qr/pickup/scan', { sessionId, qrData });
      if (response.data) {
        setActivePickupSession(response.data);
        await AsyncStorage.setItem(SESSION_PICKUP_KEY, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to scan parcel';
      const errMsgStr = Array.isArray(msg) ? msg[0] : msg;

      // Auto self-healing if backend was reset
      if (errMsgStr.toLowerCase().includes('session expired') || err.response?.status === 404) {
        setActivePickupSession(null);
        await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
      }

      setError(errMsgStr);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeParcel = async (_type: 'PICKUP', sessionId: string, parcelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/qr/pickup/remove', { sessionId, parcelId });
      if (response.data) {
        setActivePickupSession(response.data);
        await AsyncStorage.setItem(SESSION_PICKUP_KEY, JSON.stringify(response.data));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to remove parcel';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSession = async (_type: 'PICKUP', sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosInstance.post('/qr/pickup/confirm', { sessionId });
      setActivePickupSession(null);
      await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm session';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmSessionOrder = async (_type: 'PICKUP', sessionId: string, orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.post('/qr/pickup/confirm-order', { sessionId, orderId });
      const sessionData = res.data?.session;
      if (sessionData) {
        setActivePickupSession(sessionData);
        await AsyncStorage.setItem(SESSION_PICKUP_KEY, JSON.stringify(sessionData));
      } else {
        setActivePickupSession(null);
        await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
      }
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm order';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async (_type?: 'PICKUP') => {
    setActivePickupSession(null);
    await AsyncStorage.removeItem(SESSION_PICKUP_KEY);
  };

  const refreshSession = async (_type?: 'PICKUP') => {
    await restoreSessions();
  };

  const clearError = () => setError(null);

  const activeSession = activePickupSession;

  return (
    <ScanSessionContext.Provider
      value={{
        activeSession,
        activePickupSession,
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
