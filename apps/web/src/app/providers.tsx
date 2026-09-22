import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User, LoginDto, RegisterDto } from '@syncboard/shared-types';
import { apiClient } from '../shared/api/client';
import { socketManager } from '../shared/realtime/socket';
import { loginApi, registerApi, logoutApi, getMeApi, refreshApi } from '../features/auth/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sb_access_token'));
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('sb_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('sb_access_token');
      if (storedToken) {
        apiClient.setToken(storedToken);
        const me = await getMeApi();
        setUser(me);
        setToken(storedToken);
        socketManager.connect(storedToken);
      } else {
        // Try refreshing via cookie
        const refreshed = await refreshApi();
        if (refreshed?.accessToken) {
          apiClient.setToken(refreshed.accessToken);
          setToken(refreshed.accessToken);
          localStorage.setItem('sb_access_token', refreshed.accessToken);
          const me = await getMeApi();
          setUser(me);
          socketManager.connect(refreshed.accessToken);
        }
      }
    } catch {
      // Unauthenticated or expired
      setToken(null);
      setUser(null);
      apiClient.setToken(null);
      socketManager.disconnect();
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Periodic silent refresh every 12 minutes (token expires in 15m)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const refreshed = await refreshApi();
        if (refreshed?.accessToken) {
          setToken(refreshed.accessToken);
          apiClient.setToken(refreshed.accessToken);
          localStorage.setItem('sb_access_token', refreshed.accessToken);
        }
      } catch {
        // Refresh token failed
      }
    }, 12 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]);

  const login = async (dto: LoginDto) => {
    const auth = await loginApi(dto);
    setToken(auth.accessToken);
    setUser(auth.user);
    apiClient.setToken(auth.accessToken);
    localStorage.setItem('sb_access_token', auth.accessToken);
    localStorage.setItem('sb_user', JSON.stringify(auth.user));
    socketManager.connect(auth.accessToken);
  };

  const register = async (dto: RegisterDto) => {
    const auth = await registerApi(dto);
    setToken(auth.accessToken);
    setUser(auth.user);
    apiClient.setToken(auth.accessToken);
    localStorage.setItem('sb_access_token', auth.accessToken);
    localStorage.setItem('sb_user', JSON.stringify(auth.user));
    socketManager.connect(auth.accessToken);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    apiClient.setToken(null);
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_user');
    socketManager.disconnect();
    queryClient.clear();
  };

  const refreshProfile = async () => {
    try {
      const me = await getMeApi();
      setUser(me);
      localStorage.setItem('sb_user', JSON.stringify(me));
    } catch {
      // Profile fetch failed
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
