#!/usr/bin/env tsx
/**
 * Business Onboarding CLI Tool
 *
 * Usage:
 *   npx tsx scripts/onboard-business.ts config/tenants/wellness-spa.yaml owner@example.com
 *   npx tsx scripts/onboard-business.ts <yaml-path> <owner-email> [owner-name]
 */

import { onboardBusiness, sendWelcomeEmail } from '../src/lib/onboarding/business-onboarding';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(`
❌ Invalid usage!

Usage:
  npx tsx scripts/onboard-business.ts <yaml-config-path> <owner-email> [owner-name]

Examples:
  npx tsx scripts/onboard-business.ts config/tenants/wellness-spa.yaml manager@tranquillospa.it
  npx tsx scripts/onboard-business.ts config/tenants/example-salon.yaml owner@salon.com "Salon Owner"

Arguments:
  yaml-config-path  - Path to the business YAML configuration file
  owner-email       - Email address for the business owner account
  owner-name        - (Optional) Full name of the business owner
    `);
    process.exit(1);
  }

  const [yamlFilePath, ownerEmail, ownerName] = args;

  console.log(`
🚀 Starting Business Onboarding Pipeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Config: ${yamlFilePath}
👤 Owner: ${ownerEmail}
${ownerName ? `📝 Name: ${ownerName}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  const result = await onboardBusiness({
    yamlFilePath,
    ownerEmail,
    ownerName,
    sendWelcomeEmail: true,
  });

  if (!result.success) {
    console.error('\n❌ Onboarding Failed!\n');
    console.error('Errors:');
    result.errors?.forEach(error => console.error(`  - ${error}`));

    if (result.warnings && result.warnings.length > 0) {
      console.warn('\nWarnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    process.exit(1);
  }

  console.log('\n✅ Onboarding Successful!\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏢 Business Details:');
  console.log(`   ID: ${result.businessId}`);
  console.log(`   Subdomain: ${result.subdomain}`);
  console.log('');
  console.log('👤 Owner Account:');
  console.log(`   Email: ${ownerEmail}`);
  console.log(`   Temporary Password: ${result.temporaryPassword}`);
  console.log('   ⚠️  Owner must change password on first login!');
  console.log('');
  console.log('🔗 URLs:');
  console.log(`   📧 Email Verification: ${result.verificationUrl}`);
  console.log(`   📅 Booking Page: ${result.bookingPageUrl}`);
  console.log(`   🏠 Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (result.warnings && result.warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('\n📧 Sending welcome email...');
  await sendWelcomeEmail(
    ownerEmail,
    result.subdomain!,
    result.temporaryPassword!,
    result.verificationUrl!,
    result.bookingPageUrl!
  );

  console.log('\n✨ All done! The business is ready to accept bookings.');
  console.log('\n📝 Next Steps for the Owner:');
  console.log('   1. Click the verification link above (or check email)');
  console.log('   2. Login with the temporary password');
  console.log('   3. Change password immediately');
  console.log('   4. Review business settings in dashboard');
  console.log('   5. Share booking page with customers\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
