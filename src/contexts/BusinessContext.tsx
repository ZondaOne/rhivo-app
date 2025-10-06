'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getAccessToken } from '@/lib/auth/api-client';
import { useAuth } from './AuthContext';

export interface Business {
  id: string;
  subdomain: string;
  name: string;
  isPrimary: boolean;
  joinedAt: string;
}

interface BusinessContextType {
  businesses: Business[];
  selectedBusiness: Business | null;
  selectedBusinessId: string | null;
  isLoading: boolean;
  error: string | null;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Fetch user's businesses
  const fetchBusinesses = useCallback(async () => {
    // Don't fetch if not authenticated or auth is still loading
    if (!isAuthenticated || authLoading) {
      setIsLoading(false);
      return;
    }

    // Check if user has owner role
    if (user?.role !== 'owner') {
      setBusinesses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await apiRequest<{ businesses: Business[] }>('/api/me/businesses');
      setBusinesses(data.businesses || []);

      // Auto-select primary business or first business
      if (data.businesses && data.businesses.length > 0) {
        const primary = data.businesses.find((b: Business) => b.isPrimary);
        const businessToSelect = primary || data.businesses[0];
        
        // Load from localStorage if available
        const savedBusinessId = localStorage.getItem('selectedBusinessId');
        const savedBusiness = data.businesses.find((b: Business) => b.id === savedBusinessId);
        
        if (savedBusiness) {
          setSelectedBusinessId(savedBusiness.id);
        } else {
          setSelectedBusinessId(businessToSelect.id);
          localStorage.setItem('selectedBusinessId', businessToSelect.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, user]);

  // Initialize on mount and when auth state changes
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Select business handler
  const selectBusiness = useCallback((businessId: string) => {
    setSelectedBusinessId(businessId);
    localStorage.setItem('selectedBusinessId', businessId);
  }, []);

  // Refresh businesses
  const refreshBusinesses = useCallback(async () => {
    await fetchBusinesses();
  }, [fetchBusinesses]);

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

  const value: BusinessContextType = {
    businesses,
    selectedBusiness,
    selectedBusinessId,
    isLoading,
    error,
    selectBusiness,
    refreshBusinesses,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
