'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  User,
  AuthState,
  LoginCredentials,
  OwnerSignupData,
  CustomerSignupData,
} from '@/lib/auth/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  signupOwner: (data: OwnerSignupData) => Promise<void>;
  signupCustomer: (data: CustomerSignupData) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Refresh access token using refresh token
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setState({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // Owner signup
  const signupOwner = useCallback(async (data: OwnerSignupData) => {
    const response = await fetch('/api/auth/signup/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    // Don't automatically log in - user needs to verify email
    return await response.json();
  }, []);

  // Customer signup
  const signupCustomer = useCallback(async (data: CustomerSignupData) => {
    const response = await fetch('/api/auth/signup/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    // Don't automatically log in - user needs to verify email
    return await response.json();
  }, []);

  // Try to refresh auth on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Set up token refresh interval (every 45 minutes, before 1h expiry)
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        refreshAuth();
      }, 45 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated, refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        signupOwner,
        signupCustomer,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}