import axiosInstance from '../api/axiosInstance';

export const userService = {
  updateProfile: async (data: { name?: string; profileImage?: string | null }) => {
    const response = await axiosInstance.patch('/user/profile', data);
    return response.data;
  },
};
