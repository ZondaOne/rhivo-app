import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export interface JWTPayload {
  sub: string; // user_id
  role: 'owner' | 'staff' | 'customer';
  business_id?: string; // Present for owner/staff
  email: string;
  jti: string; // JWT ID for revocation
}

export interface GuestTokenPayload {
  appointment_id: string;
  cancellation_token: string;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'jti'>): string {
  const jti = nanoid();

  return jwt.sign(
    { ...payload, jti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token (random string)
 */
export function generateRefreshToken(): string {
  return nanoid(64);
}

/**
 * Generate guest token (random string for appointment access)
 */
export function generateGuestToken(): string {
  return nanoid(32);
}

/**
 * Verify and decode JWT
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash token for storage (SHA-256)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(): string {
  return nanoid(32);
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): string {
  return nanoid(32);
}

/**
 * Get refresh token expiry timestamp
 */
export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
}

/**
 * Get email verification expiry (24 hours)
 */
export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Get password reset expiry (1 hour)
 */
export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Get guest token expiry (appointment time + 24 hours)
 */
export function getGuestTokenExpiry(appointmentTime: Date): Date {
  return new Date(appointmentTime.getTime() + 24 * 60 * 60 * 1000);
}