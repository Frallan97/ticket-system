import { apiClient } from './client';
import { User, AuthResponse } from '@/types/user';

export const authApi = {
  // Get current user
  getMe: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
