/**
 * Utility to clean up orphaned YAML files
 *
 * Orphaned YAML files can occur when:
 * 1. Database insertion fails after YAML file creation
 * 2. Subdomain is taken but file was created
 * 3. Manual file creation without corresponding database entry
 *
 * This utility finds and removes YAML files that have no corresponding business in the database.
 */

import { getDbClient } from '@/db/client';
import fs from 'fs/promises';
import path from 'path';

export interface CleanupResult {
  success: boolean;
  orphanedFiles: string[];
  removedFiles: string[];
  errors: string[];
}

/**
 * Find YAML files that have no corresponding business in the database
 */
export async function findOrphanedYAMLFiles(yamlDir: string = 'config/tenants'): Promise<{
  orphans: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const orphans: string[] = [];
  const db = getDbClient();

  try {
    const fullPath = path.resolve(process.cwd(), yamlDir);

    // Check if directory exists
    try {
      await fs.access(fullPath);
    } catch {
      return { orphans: [], errors: [`Directory does not exist: ${yamlDir}`] };
    }

    // Read all YAML files
    const files = await fs.readdir(fullPath);
    const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    console.log(`📁 Found ${yamlFiles.length} YAML files in ${yamlDir}`);

    // Check each file against database
    for (const file of yamlFiles) {
      const subdomain = file.replace(/\.(yaml|yml)$/, '');

      try {
        // Check if business exists in database
        const business = await db`
          SELECT id, subdomain, deleted_at
          FROM businesses
          WHERE subdomain = ${subdomain}
          LIMIT 1
        `;

        if (business.length === 0) {
          // No business found - this is an orphan
          orphans.push(file);
          console.log(`🔍 Orphaned file found: ${file} (no matching business)`);
        } else if (business[0].deleted_at !== null) {
          // Business was soft-deleted - YAML is orphaned
          orphans.push(file);
          console.log(`🔍 Orphaned file found: ${file} (business soft-deleted)`);
        }
      } catch (dbError) {
        errors.push(`Failed to check ${file}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    }

    return { orphans, errors };
  } catch (error) {
    errors.push(`Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { orphans, errors };
  }
}

/**
 * Remove orphaned YAML files
 * @param dryRun If true, only reports what would be deleted without actually deleting
 */
export async function cleanupOrphanedYAMLFiles(
  yamlDir: string = 'config/tenants',
  dryRun: boolean = false
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    orphanedFiles: [],
    removedFiles: [],
    errors: [],
  };

  try {
    // Find orphaned files
    const { orphans, errors } = await findOrphanedYAMLFiles(yamlDir);
    result.orphanedFiles = orphans;
    result.errors = errors;

    if (orphans.length === 0) {
      console.log('✅ No orphaned YAML files found');
      return result;
    }

    console.log(`🧹 Found ${orphans.length} orphaned YAML file(s)`);

    // Remove orphaned files (unless dry run)
    if (!dryRun) {
      const fullPath = path.resolve(process.cwd(), yamlDir);

      for (const file of orphans) {
        try {
          const filePath = path.join(fullPath, file);
          await fs.unlink(filePath);
          result.removedFiles.push(file);
          console.log(`🗑️  Removed orphaned file: ${file}`);
        } catch (deleteError) {
          const errorMsg = `Failed to delete ${file}: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`✅ Cleanup complete: ${result.removedFiles.length}/${orphans.length} files removed`);
    } else {
      console.log('🔍 DRY RUN - No files were actually deleted');
      console.log('Orphaned files that would be deleted:', orphans);
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Remove a specific YAML file if it's orphaned
 */
export async function removeYAMLIfOrphaned(
  subdomain: string,
  yamlDir: string = 'config/tenants'
): Promise<{ removed: boolean; reason: string }> {
  const db = getDbClient();

  try {
    // Check if business exists
    const business = await db`
      SELECT id, deleted_at
      FROM businesses
      WHERE subdomain = ${subdomain}
      LIMIT 1
    `;

    const isOrphaned = business.length === 0 || business[0].deleted_at !== null;

    if (!isOrphaned) {
      return { removed: false, reason: 'Business exists in database' };
    }

    // Remove the file
    const fullPath = path.resolve(process.cwd(), yamlDir, `${subdomain}.yaml`);

    try {
      await fs.unlink(fullPath);
      return { removed: true, reason: 'Orphaned file removed successfully' };
    } catch (error) {
      // Try .yml extension
      const ymlPath = path.resolve(process.cwd(), yamlDir, `${subdomain}.yml`);
      try {
        await fs.unlink(ymlPath);
        return { removed: true, reason: 'Orphaned file removed successfully' };
      } catch {
        return { removed: false, reason: 'File not found or already removed' };
      }
    }
  } catch (error) {
    return {
      removed: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
