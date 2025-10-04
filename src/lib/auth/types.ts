export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff' | 'customer';
  business_id?: string;
  requires_password_change?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OwnerSignupData {
  email: string;
  password: string;
  name: string;
  businessName: string;
  businessPhone?: string;
  timezone: string;
}

export interface CustomerSignupData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}