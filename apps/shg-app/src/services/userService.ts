import axiosInstance from '../api/axiosInstance';

export const userService = {
  getProfile: async () => {
    const response = await axiosInstance.get('/user/profile');
    return response.data;
  },
  updateProfile: async (data: { name?: string; profileImage?: string | null; pincode?: string; stateName?: string; district?: string; taluka?: string; village?: string; homeAddress?: string; }) => {
    const response = await axiosInstance.patch('/user/profile', data);
    return response.data;
  },
};
