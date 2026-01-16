import { apiClient } from './client';
import { User, AuthResponse } from '@/types/user';

export const authApi = {
  // Get current user
  getMe: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Refresh token (uses HTTP-only cookie)
  refresh: async () => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  // Logout
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
