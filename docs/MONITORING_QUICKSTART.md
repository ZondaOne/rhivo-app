# Monitoring Quick Start (5 Minutes)

Get error tracking and uptime monitoring running in 5 minutes - 100% FREE.

## 🚀 Setup Steps

### 1. Sentry (Error Tracking)

```bash
# 1. Sign up at https://sentry.io/signup/
# 2. Create a Next.js project
# 3. Copy your DSN

# 4. Add to .env (and Netlify/Vercel)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/456

# 5. Deploy
git add .
git commit -m "Add Sentry error tracking"
git push
```

### 2. Configure Email Alerts

In Sentry dashboard:
1. **Settings → Alerts → Create Alert Rule**
2. Select **"Issues"**
3. When: **"An event is first seen"**
4. If: **`event.tags[critical] equals "true"`**
5. Then: **"Send notification to email"**
6. Save

### 3. BetterUptime (Uptime Monitoring)

```bash
# 1. Sign up at https://betteruptime.com/
# 2. Create monitor:
#    - Type: HTTP(S)
#    - URL: https://your-app.netlify.app/api/health
#    - Interval: 3 minutes
# 3. Add your email for alerts
```

## ✅ Test It Works

```bash
# Test health endpoint
curl https://your-app.netlify.app/api/health

# Test Sentry (in development only)
curl http://localhost:3000/api/sentry-test-error
```

Check your email in 1-2 minutes for the test alert.

## 📧 What You'll Get Alerted For

**YES - Critical issues:**
- ✅ Database connection failures
- ✅ Database timeouts
- ✅ Booking system errors
- ✅ App downtime

**NO - Normal errors:**
- ❌ Validation errors
- ❌ Wrong passwords
- ❌ 404 errors
- ❌ Rate limits

## 📖 Full Documentation

See [MONITORING_SETUP.md](./docs/MONITORING_SETUP.md) for detailed setup, configuration, and troubleshooting.

---

**Cost:** $0/month using free tiers
