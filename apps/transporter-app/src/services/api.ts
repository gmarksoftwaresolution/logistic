import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const getLocalDevelopmentUrl = (): string => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)(:\d+)?/);
      if (match) {
        const host = match[1];
        // The Transporter backend runs on port 3003
        return `http://${host}:3003`;
      }
    }
  } catch (e) {
    console.warn('Failed to resolve dynamic backend URL from scriptURL:', e);
  }

  // Fallbacks based on platform
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3003'; // Android emulator host loopback
  }
  return 'http://localhost:3003';
};

const getBackendUrl = (): string => {
  let envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (envUrl.startsWith('"') && envUrl.endsWith('"')) {
    envUrl = envUrl.slice(1, -1);
  }
  if (envUrl.startsWith("'") && envUrl.endsWith("'")) {
    envUrl = envUrl.slice(1, -1);
  }
  envUrl = envUrl.trim();

  // In development, if the environment URL is empty or uses the unstable localtunnel placeholder, fallback immediately
  if (isDev) {
    if (!envUrl || envUrl.includes('loca.lt')) {
      return getLocalDevelopmentUrl();
    }
  }

  return envUrl || getLocalDevelopmentUrl();
};

export const BASE_URL = getBackendUrl();
console.log('Transporter App BASE_URL resolved to:', BASE_URL);

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
    const originalRequest = error.config;

    // In development mode, if a request fails due to 503 Service Unavailable or Network Error on a tunnel URL,
    // automatically fall back to the direct local network IP/localhost address.
    if (isDev && originalRequest && !originalRequest._retry) {
      const currentBaseURL = api.defaults.baseURL || '';
      const isTunnelUrl = currentBaseURL.includes('.loca.lt') || 
                          currentBaseURL.includes('.ngrok') || 
                          currentBaseURL.includes('.trycloudflare.com');
                          
      const isConnectionFailure = !error.response || 
                                  error.response.status === 503 || 
                                  error.response.status === 502 || 
                                  error.response.status === 504;

      if (isTunnelUrl && isConnectionFailure) {
        originalRequest._retry = true;
        const fallbackUrl = getLocalDevelopmentUrl();
        console.warn(`[API Connection Fallback] Tunnel URL (${currentBaseURL}) is offline or returned status ${error.response?.status || 'network/timeout error'}. Falling back to direct local connection: ${fallbackUrl}`);
        
        // Update global Axios defaults for all subsequent requests
        api.defaults.baseURL = fallbackUrl;
        
        // Update current failed request config
        originalRequest.baseURL = fallbackUrl;
        if (originalRequest.url && originalRequest.url.startsWith(currentBaseURL)) {
          originalRequest.url = originalRequest.url.replace(currentBaseURL, fallbackUrl);
        }
        
        // Retry the request
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      const requestUrl = originalRequest?.url || '';
      const isAuthEndpoint = requestUrl.toLowerCase().includes('auth') || requestUrl.toLowerCase().includes('registration');

      if (!isAuthEndpoint) {
        const userPhone = await AsyncStorage.getItem('user_phone_number');
        if (userPhone && isDev && !originalRequest._retryLogin) {
          originalRequest._retryLogin = true;
          console.log(`[API Auto-Login] Received 401. Attempting background re-login for: ${userPhone}`);
          try {
            let accessToken = null;
            // Try /auth/verify-otp first
            try {
              const res = await axios.post(`${api.defaults.baseURL || BASE_URL}/auth/verify-otp`, {
                mobileNumber: userPhone,
                otp: '123456',
              });
              accessToken = res.data?.accessToken;
            } catch (authErr) {
              console.log('[API Auto-Login] /auth/verify-otp failed, trying /registration/verify-otp...');
              // Fall back to /registration/verify-otp
              const res = await axios.post(`${api.defaults.baseURL || BASE_URL}/registration/verify-otp`, {
                mobileNumber: userPhone,
                otp: '123456',
              });
              accessToken = res.data?.accessToken;
            }

            if (accessToken) {
              console.log('[API Auto-Login] Background re-login successful! Updating token and retrying request...');
              await AsyncStorage.setItem('access_token', accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          } catch (loginErr: any) {
            console.error('[API Auto-Login] Background re-login failed:', loginErr.message);
          }
        }

        // Handle unauthorized (e.g., clear token and redirect to login)
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('@gmu_active_pickup_session');
        await AsyncStorage.removeItem('@gmu_active_drop_session');
        const { navigationRef } = require('../navigation/AppNavigator');
        
        const navigateToLogin = () => {
          if (navigationRef.isReady()) {
            const currentRouteName = navigationRef.getCurrentRoute()?.name;
            if (currentRouteName === 'Login' || currentRouteName === 'SignUp') {
              // Already on Login or SignUp, do not reset stack to prevent infinite loops/flickering
              return true;
            }
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            return true;
          }
          return false;
        };

        if (!navigateToLogin()) {
          // If navigation container is not ready yet, retry periodically
          const intervalId = setInterval(() => {
            if (navigateToLogin()) {
              clearInterval(intervalId);
            }
          }, 100);
          
          // Safety timeout to clear interval after 5 seconds if navigation never becomes ready
          setTimeout(() => clearInterval(intervalId), 5000);
        }
      }
    }

    // Enrich message for network errors (no response received)
    if (!error.response) {
      const currentURL = api.defaults.baseURL || BASE_URL;
      error.message = `Network Error: Cannot connect to backend at ${currentURL}.\n\nTo fix this:\n1. Ensure the NestJS server is running on port 3001.\n2. If using a physical phone, ensure it's on the same Wi-Fi as your computer.\n3. Make sure Windows Defender Firewall allows Node.js on port 3001.`;
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
