/**
 * Migration Script: Import YAML configs from filesystem to database
 *
 * This script reads all YAML files from config/tenants/ and stores them
 * in the businesses.config_yaml column for their corresponding businesses.
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const TENANTS_DIR = join(process.cwd(), 'config/tenants');

async function migrateYAMLsToDatabase() {
  console.log('🔄 Migrating YAML configs to database...\n');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Get all YAML files
    const yamlFiles = readdirSync(TENANTS_DIR).filter(f => f.endsWith('.yaml'));
    console.log(`Found ${yamlFiles.length} YAML files in ${TENANTS_DIR}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const filename of yamlFiles) {
      const subdomain = filename.replace('.yaml', '');
      const filePath = join(TENANTS_DIR, filename);

      try {
        // Read YAML content
        const yamlContent = readFileSync(filePath, 'utf-8');

        // Check if business exists
        const business = await sql`
          SELECT id, subdomain, config_yaml
          FROM businesses
          WHERE subdomain = ${subdomain}
          AND deleted_at IS NULL
          LIMIT 1
        `;

        if (business.length === 0) {
          console.log(`⚠️  ${filename}: Business not found in database (skipping)`);
          skipped++;
          continue;
        }

        const businessId = business[0].id;
        const existingConfig = business[0].config_yaml;

        if (existingConfig) {
          console.log(`⏭️  ${filename}: Already has database config (skipping)`);
          skipped++;
          continue;
        }

        // Update business with YAML content
        await sql`
          UPDATE businesses
          SET config_yaml = ${yamlContent}
          WHERE id = ${businessId}
        `;

        console.log(`✅ ${filename}: Migrated to database`);
        migrated++;

      } catch (err) {
        console.error(`❌ ${filename}: Error - ${err instanceof Error ? err.message : 'Unknown error'}`);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log(`   📁 Total:    ${yamlFiles.length}`);

    if (migrated > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Test that your businesses still load correctly');
      console.log('   2. Once confirmed, you can optionally delete the YAML files');
      console.log('   3. The app will now use database-stored configs');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateYAMLsToDatabase()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
