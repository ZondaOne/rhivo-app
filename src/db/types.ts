// Database schema types

export type UserRole = 'owner' | 'staff' | 'customer';
export type BusinessStatus = 'active' | 'suspended' | 'deleted';
export type AppointmentStatus = 'confirmed' | 'canceled' | 'completed' | 'no_show';
export type NotificationChannel = 'email' | 'sms' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying';
export type AuditAction = 'created' | 'confirmed' | 'modified' | 'canceled' | 'completed' | 'no_show';

export interface Business {
  id: string;
  subdomain: string;
  name: string;
  timezone: string;
  config_yaml_path: string;
  config_version: number;
  status: BusinessStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  business_id: string | null;
  password_hash: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  sort_order: number;
  deleted_at: Date | null;
}

export interface Service {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string;
  max_simultaneous_bookings: number;
  sort_order: number;
  deleted_at: Date | null;
}

export interface Availability {
  id: string;
  business_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  exception_date: string | null;
  is_closed: boolean;
  deleted_at: Date | null;
}

export interface Reservation {
  id: string;
  business_id: string;
  service_id: string;
  slot_start: Date;
  slot_end: Date;
  idempotency_key: string;
  expires_at: Date;
  created_at: Date;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  slot_start: Date;
  slot_end: Date;
  status: AppointmentStatus;
  idempotency_key: string;
  reservation_id: string | null;
  cancellation_token: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AuditLog {
  id: string;
  appointment_id: string;
  actor_id: string | null;
  action: AuditAction;
  old_state: Record<string, any> | null;
  new_state: Record<string, any>;
  timestamp: Date;
}

export interface NotificationLog {
  id: string;
  appointment_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: NotificationChannel;
  template_name: string;
  status: NotificationStatus;
  attempts: number;
  last_attempt_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

// JWT Claims structure for RLS
export interface JWTClaims {
  user_id?: string;
  business_id?: string;
  role?: UserRole;
  cancellation_token?: string;
  exp?: number;
  iat?: number;
}