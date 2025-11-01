# Security Improvements Applied

This document outlines the security hardening measures implemented on 2025-10-31.

## 🔒 Changes Applied

### 1. Production Rate Limiting
**File:** `src/lib/auth/rate-limit.ts`

**Before:**
- All rate limits set to 100 attempts (testing values)
- Vulnerable to brute force attacks

**After:**
- Login: 5 attempts per 15 minutes
- Password reset: 3 attempts per 60 minutes
- Guest token validation: 10 attempts per 60 minutes
- Email verification: 5 attempts per 60 minutes
- Test environment maintains higher limits (100) for testing

**Impact:** Prevents brute force attacks and credential stuffing

---

### 2. CORS Configuration
**File:** `next.config.ts` and `src/lib/cors/index.ts`

**Added:**
- Explicit CORS headers for API routes
- Allowed origins:
  - `https://rhivo.app`
  - `https://www.rhivo.app`
  - `https://*.rhivo.app` (all subdomains)
  - `http://localhost:*` (development only)
- Dynamic origin validation with pattern matching

**Impact:** Prevents unauthorized cross-origin requests

---

### 3. Security Headers
**File:** `next.config.ts`

**Added headers:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` - Enforces HTTPS
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Restricts API access

**Impact:** Protects against XSS, clickjacking, and MIME sniffing attacks

---

### 4. Cron Job Authentication
**File:** `app/api/cron/cleanup-reservations/route.ts`

**Before:**
- POST endpoint had no authentication
- Anyone could trigger cleanup operations

**After:**
- Requires `CRON_SECRET` in Authorization header
- Both GET and POST endpoints now authenticated
- `CRON_SECRET` is now required (not optional) in environment validation

**Impact:** Prevents unauthorized cleanup operations and potential DoS attacks

---

### 5. Environment Variable Security
**File:** `src/lib/env.ts`

**Changed:**
- `CRON_SECRET` is now required (minimum 32 characters)
- Application will not start without proper CRON_SECRET

**Impact:** Ensures critical security credentials are properly configured

---

## 📋 Required Actions for Deployment

### Before Production Deployment:

1. **Rotate ALL Secrets** (if .env was ever committed to git):
   ```bash
   # Check if .env is in git history
   git log --all --full-history -- .env

   # If found, rotate:
   # - DATABASE_URL (create new database or rotate credentials)
   # - JWT_SECRET (rotate and invalidate existing tokens)
   # - RESEND_API_KEY (regenerate in Resend dashboard)
   # - GOOGLE_PLACES_API_KEY (regenerate in Google Cloud Console)
   # - CRON_SECRET (already generated, but rotate if compromised)
   ```

2. **Set Environment Variables in Production:**
   - Add `CRON_SECRET` to your production environment (Vercel/Netlify)
   - Verify all secrets are set correctly
   - Test authentication endpoints

3. **Configure Cron Jobs:**
   - Update your cron job configuration to include Authorization header:
     ```bash
     Authorization: Bearer <CRON_SECRET>
     ```

4. **Verify CORS Settings:**
   - Test API calls from your production domain
   - Verify subdomain access works correctly

---

## 🧪 Testing the Changes

### Test Rate Limiting:
```bash
# Should fail after 5 attempts
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

### Test Cron Authentication:
```bash
# Without auth - should return 401
curl -X POST http://localhost:3001/api/cron/cleanup-reservations

# With auth - should succeed
curl -X POST http://localhost:3001/api/cron/cleanup-reservations \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### Test CORS:
```bash
# From allowed origin
curl http://localhost:3001/api/config/tenant \
  -H "Origin: https://rhivo.app" \
  -H "Access-Control-Request-Method: GET"
```

---

## 🔐 CORS Utility Usage

For new API routes that need CORS support:

```typescript
import { withCors } from '@/lib/cors';

async function handler(request: NextRequest) {
  // Your route logic
  return NextResponse.json({ data: 'example' });
}

// Wrap handler with CORS support
export const GET = withCors(handler);
export const POST = withCors(handler);
```

---

## 📊 Security Checklist

- [x] Rate limiting enabled for production
- [x] CORS configured for rhivo.app domains
- [x] Security headers added
- [x] Cron endpoints authenticated
- [x] CRON_SECRET required in environment
- [x] CORS utility created for API routes
- [ ] Production secrets rotated (if needed)
- [ ] Type errors fixed (remove ignoreBuildErrors)
- [ ] Run `npm audit fix` for dependency vulnerabilities

---

## 🚨 Remaining Security Items

These items were identified but not addressed in this update:

1. **Build Errors Ignored** (`next.config.ts:8-19`)
   - TypeScript and ESLint errors ignored
   - Should be addressed before production

2. **Dependency Vulnerabilities**
   - 1 moderate severity vulnerability in `tar@7.5.1`
   - Run: `npm audit fix`

3. **Secrets in .env File**
   - Verify `.env` is not in git history
   - Rotate all secrets if ever committed

4. **Content Security Policy**
   - Currently not implemented
   - Consider adding CSP for enhanced XSS protection

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [CORS Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Last Updated:** 2025-10-31
**Applied By:** Security Audit
