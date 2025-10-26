# Authentication Implementation Guide

This document describes the complete authentication system implementation for Rhivo.

## Overview

The authentication system implements:
- **Owner authentication**: Business owners managing their dashboard
- **Customer authentication**: Optional accounts for customers
- **Guest tokens**: Single-use tokens for appointment management without accounts
- **JWT-based access tokens**: Short-lived (1h) tokens for API access
- **Refresh tokens**: Long-lived (30d) tokens stored in httpOnly cookies
- **Row-Level Security (RLS)**: Database-level access control based on JWT claims
- **Rate limiting**: Protection against brute force attacks
- **Email verification**: Required before login

## Architecture

### Token Flow

```
1. User Login
   └─> Validate credentials
       └─> Generate JWT (1h) + Refresh Token (30d)
           └─> Store refresh token in DB (hashed)
               └─> Return JWT + set httpOnly cookie

2. API Request
   └─> Client sends JWT in Authorization header
       └─> Middleware verifies JWT
           └─> Extract claims (user_id, role, business_id)
               └─> Set headers for downstream handlers
                   └─> Query DB with RLS enforcement

3. Token Refresh
   └─> Client sends refresh token (httpOnly cookie)
       └─> Validate refresh token from DB
           └─> Revoke old token
               └─> Generate new JWT + Refresh Token
                   └─> Return new JWT + update cookie
```

### Database Schema

#### Auth Tables

**users** (extended)
- `email_verified`: boolean
- `email_verification_token`: text (hashed)
- `email_verification_expires_at`: timestamptz
- `password_reset_token`: text (hashed)
- `password_reset_expires_at`: timestamptz
- `name`: text

**refresh_tokens**
- `id`: uuid (PK)
- `user_id`: uuid (FK → users)
- `token_hash`: text (SHA-256 hash)
- `device_fingerprint`: text
- `issued_at`: timestamptz
- `expires_at`: timestamptz
- `revoked_at`: timestamptz

**jwt_revocations**
- `id`: uuid (PK)
- `jti`: text (unique JWT ID)
- `user_id`: uuid (FK → users)
- `revoked_at`: timestamptz
- `expires_at`: timestamptz

**rate_limits**
- `id`: uuid (PK)
- `identifier`: text (IP:email for login, IP for other actions)
- `action`: text (login, guest_token_validation, etc.)
- `attempts`: integer
- `window_start`: timestamptz

#### RLS Policies

All tables have RLS enabled. Key policies:

- **businesses**: Owners read/update their own business, public reads active businesses
- **users**: Users read themselves, owners manage users in their business
- **appointments**: Owners see all for their business, customers see their own, guests via token
- **services/categories**: Public read, owners manage
- **refresh_tokens**: Users manage their own tokens
- **rate_limits**: System-only access

## API Endpoints

### Public Endpoints

#### POST /api/auth/signup/owner
Create business owner account.

**Request:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "businessName": "Acme Salon",
  "businessPhone": "+1234567890",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "message": "Account created successfully. Please verify your email.",
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "John Doe",
    "role": "owner"
  },
  "business": {
    "id": "uuid",
    "subdomain": "acme-salon"
  },
  "verificationUrl": "http://localhost:3000/auth/verify-email?token=..."
}
```

#### POST /api/auth/signup/customer
Create customer account.

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "name": "Jane Smith",
  "phone": "+1234567890"
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "John Doe",
    "role": "owner",
    "business_id": "uuid"
  }
}
```

**Sets Cookie:** `refresh_token` (httpOnly, secure, 30d)

#### POST /api/auth/refresh
Refresh access token using refresh token cookie.

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### POST /api/auth/logout
Logout and revoke refresh token.

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### POST /api/auth/verify-email
Verify email address.

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

### Protected Endpoints

All protected endpoints require `Authorization: Bearer <jwt>` header.

#### GET /api/me
Get current user profile.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "owner",
    "emailVerified": true,
    "business": {
      "id": "uuid",
      "name": "Acme Salon",
      "subdomain": "acme-salon"
    }
  }
}
```

### Guest Token Endpoints

#### POST /api/appointments/[id]/guest-access
Validate guest token and get appointment details.

**Request:**
```json
{
  "token": "guest-token-from-email"
}
```

**Response:**
```json
{
  "appointment": {
    "id": "uuid",
    "start": "2025-10-01T10:00:00Z",
    "end": "2025-10-01T11:00:00Z",
    "status": "confirmed",
    "service": {
      "name": "Haircut",
      "duration": 60,
      "price": 5000
    },
    "business": {
      "name": "Acme Salon"
    },
    "customer": {
      "email": "guest@example.com",
      "name": "Guest User"
    }
  }
}
```

#### DELETE /api/appointments/[id]/guest-access
Cancel appointment using guest token.

**Request:**
```json
{
  "token": "guest-token-from-email"
}
```

## Frontend Integration

### Setup

Wrap your app with `AuthProvider`:

```tsx
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Using the Auth Hook

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, user, isAuthenticated, isLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        email: 'owner@example.com',
        password: 'SecurePass123!',
      });
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return <div>Welcome {user?.name}</div>;

  return <form onSubmit={handleLogin}>...</form>;
}
```

### Protected Routes

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  // Only owners can access
  if (user?.role !== 'owner') {
    return <div>Access denied</div>;
  }

  return <div>Dashboard content</div>;
}
```

### Making Authenticated API Requests

```tsx
import { apiRequest, setAccessToken } from '@/lib/auth/api-client';
import { useAuth } from '@/contexts/AuthContext';

export function useAppointments() {
  const { accessToken } = useAuth();

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  const fetchAppointments = async () => {
    const data = await apiRequest('/api/appointments');
    return data;
  };

  return { fetchAppointments };
}
```

## Security Considerations

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Enforced by `validatePasswordStrength()` in `src/lib/auth/password.ts`.

### Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Guest token validation | 10 attempts | 60 minutes |
| Password reset | 3 attempts | 60 minutes |
| Email verification | 5 attempts | 60 minutes |

### Token Security

- **JWT Secret**: Must be at least 32 characters in production
- **Refresh tokens**: Stored hashed (SHA-256) in database
- **Guest tokens**: Stored hashed (SHA-256) in appointments table
- **Email verification tokens**: Stored hashed (SHA-256)
- **Refresh token rotation**: Old token revoked when new one issued
- **Replay detection**: If revoked token used, all user sessions revoked

### RLS Enforcement

Database queries automatically enforce access control based on JWT claims:

```sql
-- Owner can only see their business's appointments
SELECT * FROM appointments WHERE business_id = current_setting('request.jwt.claims')::json->>'business_id';

-- Customer can only see their own appointments
SELECT * FROM appointments WHERE customer_id = current_setting('request.jwt.claims')::json->>'user_id';
```

## Testing

### Manual Testing

1. **Owner Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup/owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User",
    "businessName": "Test Business",
    "timezone": "America/New_York"
  }'
```

2. **Verify Email:**
Use the `verificationUrl` from signup response.

3. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }' \
  -c cookies.txt
```

4. **Get Profile:**
```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <access_token>"
```

5. **Refresh Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt
```

6. **Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## Environment Variables

Required variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database

# JWT (MUST be 32+ chars in production)
JWT_SECRET=your-secret-key-change-in-production-min-32-chars

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node environment
NODE_ENV=development
```

## Migration Steps

1. Run new migrations:
```bash
npm run migrate:up
```

2. Verify tables created:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%token%';
```

3. Test RLS policies:
```sql
-- Should fail (no JWT claims set)
SELECT * FROM users;

-- Set mock claims
SET LOCAL request.jwt.claims = '{"user_id": "uuid-here", "role": "owner"}';
SELECT * FROM users WHERE id = 'uuid-here';
```

## Troubleshooting

### "Invalid or expired token"
- Check JWT_SECRET matches between token creation and verification
- Verify token hasn't expired (1h lifetime)
- Check token format: `Bearer <token>`

### "Refresh token not found"
- Ensure cookies are sent with requests (`credentials: 'include'`)
- Check cookie settings (httpOnly, secure in production)
- Verify refresh token not expired (30d)

### RLS denying access
- Verify JWT claims are being set correctly
- Check RLS policies match your use case
- Test policies in isolation with SET LOCAL commands

### Rate limiting blocking legitimate requests
- Use different IP/identifier for testing
- Adjust rate limits in `src/lib/auth/rate-limit.ts`
- Clear rate_limits table: `DELETE FROM rate_limits`

## Next Steps

1. **Email notifications**: Integrate email service for verification and notifications
2. **Password reset flow**: Implement forgot password endpoint
3. **MFA**: Add two-factor authentication for enhanced security
4. **OAuth**: Add social login (Google, Apple)
5. **Session management**: Add UI for viewing/revoking active sessions
6. **Audit logging**: Enhanced logging for all auth events