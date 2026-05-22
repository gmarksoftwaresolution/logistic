import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  JWT_TOKEN: 'jwt_token',
  SIGNUP_DATA: 'signup_data',
  CURRENT_STEP: 'current_step',
};

export const setItem = async (key: string, value: any) => {
  try {
    if (!AsyncStorage) {
      throw new Error('AsyncStorage is not initialized');
    }
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  } catch (error: any) {
    console.error('Storage Error (Set):', error);
    throw error; // Re-throw to catch in UI
  }
};

export const getItem = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error('Storage Error (Get):', error);
    return null;
  }
};

export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Storage Error (Remove):', error);
  }
};

export const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Storage Error (Clear):', error);
  }
};
