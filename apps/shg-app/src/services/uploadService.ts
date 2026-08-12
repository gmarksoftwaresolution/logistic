import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';

const performUpload = async (endpoint: string, uri: string) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
    const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    const fullUrl = `${baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await FileSystem.uploadAsync(fullUrl, uri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
      headers,
    });

    if (response.status >= 200 && response.status < 300) {
      return JSON.parse(response.body);
    } else {
      let errorMessage = 'Upload failed';
      try {
        const errorData = JSON.parse(response.body);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // body is not JSON
      }
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error(`Upload error at ${endpoint}:`, error);
    throw new Error(error.message || 'Upload failed');
  }
};

export const uploadService = {
  uploadProfilePhoto: (uri: string) => performUpload('/uploads/profile-photo', uri),
  uploadAadhaarFront: (uri: string) => performUpload('/uploads/aadhaar-front', uri),
  uploadAadhaarBack: (uri: string) => performUpload('/uploads/aadhaar-back', uri),
  uploadPanCard: (uri: string) => performUpload('/uploads/pan-card', uri),
  uploadDrivingLicense: (uri: string) => performUpload('/uploads/driving-license', uri),
  uploadVehiclePhoto: (uri: string) => performUpload('/uploads/vehicle', uri),
};
