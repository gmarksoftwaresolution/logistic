import axiosInstance from '../api/axiosInstance';

export const signupService = {
  submitProfile: async (data: any) => {
    const response = await axiosInstance.post('/signup/profile', data);
    return response.data;
  },

  submitShgDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/shg-details', data);
    return response.data;
  },

  submitNonShgRole: async (data: any) => {
    const response = await axiosInstance.post('/signup/non-shg-role', data);
    return response.data;
  },

  submitProducts: async (data: any) => {
    const response = await axiosInstance.post('/signup/products', data);
    return response.data;
  },

  submitAddress: async (data: any) => {
    const response = await axiosInstance.post('/signup/address', data);
    return response.data;
  },

  submitDocuments: async (data: any) => {
    const response = await axiosInstance.post('/signup/documents', data);
    return response.data;
  },

  submitBankDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/bank-details', data);
    return response.data;
  },

  submitOtherDetails: async (data: any) => {
    const response = await axiosInstance.post('/signup/other-details', data);
    return response.data;
  },

  getProgress: async () => {
    const response = await axiosInstance.get('/signup/progress');
    return response.data;
  },

  getApplicationStatus: async () => {
    const response = await axiosInstance.get('/application/status');
    return response.data;
  },

  getBankDetails: async (ifsc: string) => {
    const response = await axiosInstance.get(`/location/ifsc/${ifsc}`);
    return response.data;
  },

  getPincodeDetails: async (pincode: string) => {
    const response = await axiosInstance.get(`/location/pincode/${pincode}`);
    return response.data;
  },

  getStates: async () => {
    const response = await axiosInstance.get('/location/states');
    return response.data;
  },

  getDistricts: async (state: string) => {
    const response = await axiosInstance.get(`/location/districts?state=${encodeURIComponent(state)}`);
    return response.data;
  },

  getBlocks: async (state: string, district: string) => {
    const response = await axiosInstance.get(`/location/blocks?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    return response.data;
  },

  getVillages: async (state: string, district: string, block: string) => {
    const response = await axiosInstance.get(`/location/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&block=${encodeURIComponent(block)}`);
    return response.data;
  },

  getLocationDetails: async (state: string, district: string, block: string, village: string) => {
    const response = await axiosInstance.get(`/location/details?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&block=${encodeURIComponent(block)}&village=${encodeURIComponent(village)}`);
    return response.data;
  }
};
