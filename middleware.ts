import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for API routes, static files, etc.
  matcher: [
    // Match all pathnames except for:
    // - API routes (/api/*)
    // - Static files (/_next/*, /favicon.ico, etc.)
    // - Images and public assets
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
