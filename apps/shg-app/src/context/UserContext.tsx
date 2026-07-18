import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';
import { userService } from '../services/userService';

export interface UserProfile {
  id?: number;
  name: string;
  mobile: string;
  profileImage: string | null;
  // ... other existing fields
  gmuId: string;
  role: string;
  dob: string;
  aadhaar: string;
  joiningDate: string;
  pincode: string;
  stateName: string;
  district: string;
  taluka: string;
  village: string;
  homeAddress: string;
  shgUniqueId?: string;
  applicationStatus?: string;
}

export type ApplicationStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | null;

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;
  status: ApplicationStatus;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  updateStatus: (status: ApplicationStatus) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredData = async () => {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
      const storedUser = await AsyncStorage.getItem('user_profile');
      if (storedToken) {
        setToken(storedToken);
        try {
          setUser(storedUser ? JSON.parse(storedUser) : null);
        } catch (e) {
          console.error("Failed to parse stored user profile:", e);
          setUser(null);
          // Optional: clear corrupted data
          await AsyncStorage.removeItem('user_profile');
        }
      }
      setIsLoading(false);
    };
    loadStoredData();
  }, []);

  const login = async (newToken: string, profile: UserProfile) => {
    setToken(newToken);
    setUser(profile);
    await AsyncStorage.setItem(STORAGE_KEYS.JWT_TOKEN, newToken);
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setStatus(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
    await AsyncStorage.removeItem('user_profile');
    await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_DATA_SHG);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_STEP_SHG);
    await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_DATA_INDIVIDUAL);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_STEP_INDIVIDUAL);
    await AsyncStorage.removeItem('orders');
    await AsyncStorage.removeItem('orders_cache');
    await AsyncStorage.removeItem('scan_session_pickup');
    await AsyncStorage.removeItem('scan_session_drop');
  };

  const updateUser = async (data: Partial<UserProfile>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedUser));
      
      try {
        await userService.updateProfile({
          name: updatedUser.name,
          profileImage: updatedUser.profileImage,
          pincode: updatedUser.pincode,
          stateName: updatedUser.stateName,
          district: updatedUser.district,
          taluka: updatedUser.taluka,
          village: updatedUser.village,
          homeAddress: updatedUser.homeAddress,
        });
      } catch (err) {
        console.error('Failed to sync profile update to backend', err);
      }
    }
  };

  const updateStatus = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated: !!token, 
      token, 
      status, 
      login, 
      logout, 
      updateUser,
      updateStatus 
    }}>
      {!isLoading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
