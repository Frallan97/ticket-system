import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/user';
import { authApi } from '@/api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: 'customer' | 'organizer' | 'admin') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Fetch user details
    const userData = await authApi.getMe();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (role: 'customer' | 'organizer' | 'admin') => {
    // TODO: Implement proper role checking based on backend Casbin policies
    // For now, return true if user is authenticated
    // This needs to be updated to check user roles from JWT or user metadata
    return !!user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
