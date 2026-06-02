import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


let rawUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://slow-turtles-run.loca.lt').trim();
if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
  rawUrl = rawUrl.slice(1, -1);
}
if (rawUrl.startsWith("'") && rawUrl.endsWith("'")) {
  rawUrl = rawUrl.slice(1, -1);
}
export const BASE_URL = rawUrl.trim();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
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
      const { navigationRef } = require('../navigation/AppNavigator');
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }
    return Promise.reject(error);
  }
);

export const uploadFile = async (uri: string, base64?: string) => {
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

  // Use highly-stable Base64 JSON upload if base64 string is provided
  if (base64) {
    console.log('--- UPLOAD DEBUG (BASE64) ---');
    console.log('BASE_URL:', BASE_URL);
    console.log('Upload Endpoint:', `${BASE_URL}/upload/base64`);
    console.log('File Name:', filename);
    console.log('Base64 Length:', base64.length);

    try {
      const response = await api.post('/upload/base64', {
        base64,
        filename,
        mimeType: type,
      });
      console.log('Base64 Upload Success:', response.data);
      return response;
    } catch (err: any) {
      console.error('Base64 upload failed, falling back to XHR uploader...', err.message);
    }
  }

  const formData = new FormData();

  // Ensure URI is correctly formatted for Android
  let finalUri = uri;
  if (Platform.OS === 'android') {
    if (!uri.startsWith('file:') && !uri.startsWith('content:')) {
      finalUri = `file://${uri}`;
    } else if (uri.startsWith('file:/') && !uri.startsWith('file:///')) {
      // Fix file:/ prefix to be standard file:/// prefix
      finalUri = uri.replace('file:/', 'file:///');
    }
  }

  formData.append('file', {
    uri: finalUri,
    name: filename,
    type,
  } as any);

  console.log('--- UPLOAD DEBUG (XHR) ---');
  console.log('BASE_URL:', BASE_URL);
  console.log('Upload Endpoint:', `${BASE_URL}/upload`);
  console.log('File URI:', finalUri);
  console.log('File Name:', filename);
  console.log('File Type:', type);

  return new Promise<{ data: { url: string } }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload`);
    xhr.setRequestHeader('Connection', 'close');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('XHR Upload Success:', response);
            resolve({ data: response });
          } catch (e) {
            console.error('XHR parse response error:', e);
            reject(new Error(`Failed to parse upload response: ${xhr.responseText}`));
          }
        } else {
          console.error(`XHR Upload Failed with status ${xhr.status}:`, xhr.responseText);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = (e) => {
        console.error('XHR Upload Network Error details:', e);
        reject(new Error('Network request failed via XHR'));
      };

      xhr.ontimeout = () => {
        console.error('XHR Upload Timeout');
        reject(new Error('Upload request timed out'));
      };

      xhr.send(formData);
  });
};

export default api;
