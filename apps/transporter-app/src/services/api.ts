import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo public environment API URL or local transporter backend port fallback
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor for Auth Token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Error Handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., clear token and redirect to login)
      await AsyncStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

export const uploadFile = async (uri: string) => {
  const formData = new FormData();
  let filename = uri.split('/').pop() || 'upload.jpg';
  // Strip query parameters if present in the URI
  filename = filename.split('?')[0];

  const match = /\.(\w+)$/.exec(filename);
  let type = match ? `image/${match[1]}` : `image`;

  // If filename doesn't have an allowed extension, append '.jpg'
  if (!filename.match(/\.(jpg|jpeg|png|pdf)$/i)) {
    filename = filename + '.jpg';
    type = 'image/jpeg';
  }

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default api;
