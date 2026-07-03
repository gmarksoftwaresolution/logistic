import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';

console.log("API URL =", process.env.EXPO_PUBLIC_API_URL);

const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT Token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized Error Handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response) {
      const serverMessage = error.response.data?.message;
      if (serverMessage) {
        error.message = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage;
      }
    } else {
      // Network error (no response received)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      console.warn(`Network Error: Cannot reach ${apiUrl}. Ensure backend is running and IP is correct.`);
      error.message = `Network Error: Cannot reach server. Please ensure your backend is running and your .env API URL is correct. Current URL: ${apiUrl}`;
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Handle token expiration if needed
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
