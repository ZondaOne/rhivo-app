#!/usr/bin/env tsx

/**
 * Migrate config_yaml (TEXT) to config_json (JSONB)
 *
 * This script:
 * 1. Reads all businesses with config_yaml
 * 2. Parses YAML to JSON
 * 3. Stores in config_json column
 */

import { getDbClient } from '../src/db/client';
import yaml from 'js-yaml';

const sql = getDbClient();

async function migrateYamlToJson() {
  console.log('Starting YAML to JSON migration...\n');

  try {
    // Get all businesses with config_yaml
    const businesses = await sql`
      SELECT id, subdomain, name, config_yaml
      FROM businesses
      WHERE config_yaml IS NOT NULL
        AND deleted_at IS NULL
    `;

    console.log(`Found ${businesses.length} businesses with config_yaml\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const business of businesses) {
      try {
        // Parse YAML to JSON
        const config = yaml.load(business.config_yaml);

        // Store as JSONB
        await sql`
          UPDATE businesses
          SET
            config_json = ${JSON.stringify(config)}::jsonb,
            updated_at = NOW()
          WHERE id = ${business.id}
        `;

        console.log(`✓ Migrated: ${business.subdomain} (${business.name})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to migrate ${business.subdomain}:`, error);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total: ${businesses.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✓ All configs migrated successfully!');
    } else {
      console.log(`\n⚠ ${errorCount} configs failed to migrate. Please review errors above.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateYamlToJson();
