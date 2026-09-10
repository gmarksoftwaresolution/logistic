import axiosInstance from '../api/axiosInstance';

export const userService = {
  getProfile: async () => {
    const response = await axiosInstance.get('/user/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await axiosInstance.patch('/user/profile', data);
    return response.data;
  },
};
