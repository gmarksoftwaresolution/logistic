import { Platform } from 'react-native';
import axiosInstance from '../api/axiosInstance';

const createFormData = (uri: string, fieldName: string) => {
  const fileName = uri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(fileName);
  const fileType = match ? match[1] : 'jpg';
  
  const formData = new FormData();
  
  // Ensure URI is correctly formatted for Android
  let finalUri = uri;
  if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
    finalUri = `file://${uri}`;
  }

  const fileToUpload = {
    uri: finalUri,
    name: fileName,
    type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
  };

  formData.append(fieldName, fileToUpload as any);
  return formData;
};

const performUpload = async (endpoint: string, uri: string) => {
  const formData = createFormData(uri, 'file');

  try {
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data, // Essential for FormData to work correctly with Axios in some environments
    });

    return response.data;
  } catch (error: any) {
    console.error(`Upload error at ${endpoint}:`, error);
    // Extract more meaningful error message from axios error
    const message = error.response?.data?.message || error.message || 'Upload failed';
    throw new Error(message);
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
