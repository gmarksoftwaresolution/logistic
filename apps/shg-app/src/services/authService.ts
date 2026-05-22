import axiosInstance from '../api/axiosInstance';

export const authService = {
  // Login Flow
  sendLoginOtp: async (mobileNumber: string) => {
    const response = await axiosInstance.post('/auth/login/send-otp', { mobileNumber });
    return response.data;
  },

  verifyLoginOtp: async (mobileNumber: string, otp: string, language?: string) => {
    const response = await axiosInstance.post('/auth/login/verify-otp', { mobileNumber, otp, language });
    return response.data; // Should return { token, user, exists: boolean }
  },

  // Signup Flow
  sendSignupOtp: async (mobileNumber: string) => {
    const response = await axiosInstance.post('/signup/send-otp', { mobileNumber });
    return response.data;
  },

  verifySignupOtp: async (mobileNumber: string, otp: string, language?: string) => {
    const response = await axiosInstance.post('/signup/verify-otp', { mobileNumber, otp, language });
    return response.data; // Should return { token }
  },
};

