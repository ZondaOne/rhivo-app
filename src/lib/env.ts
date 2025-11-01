import { z } from 'zod';

/**
 * Environment variable schema with validation
 * App will fail to start if any required variables are missing or invalid
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().startsWith('postgres://'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // Email
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).optional().default('onboarding@resend.dev'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Cron Job Security (Required for cleanup endpoints)
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters for security'),
});

// Parse and validate environment variables
// This will throw an error if validation fails, preventing app startup
export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Startup validation check
if (typeof window === 'undefined') {
  console.log('✅ Environment variables validated successfully');

  // Security check: ensure JWT_SECRET is not default value
  if (env.JWT_SECRET === 'your-secret-key-here-change-in-production') {
    throw new Error(
      '🚨 SECURITY ERROR: JWT_SECRET is still set to default value! ' +
      'Generate a secure secret with: openssl rand -base64 64'
    );
  }
}
