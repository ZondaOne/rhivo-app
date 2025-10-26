#!/usr/bin/env tsx
/**
 * CLI tool to clean up orphaned YAML files
 *
 * Usage:
 *   npm run cleanup-yaml          # Dry run - show what would be deleted
 *   npm run cleanup-yaml --apply  # Actually delete orphaned files
 *   npm run cleanup-yaml --help   # Show help
 */

import 'dotenv/config';
import { cleanupOrphanedYAMLFiles, findOrphanedYAMLFiles } from '@/lib/utils/yaml-cleanup';

async function main() {
  const args = process.argv.slice(2);
  const showHelp = args.includes('--help') || args.includes('-h');
  const apply = args.includes('--apply') || args.includes('-a');
  const yamlDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || 'config/tenants';

  if (showHelp) {
    console.log(`
🧹 YAML Cleanup Tool
===================

This tool finds and removes YAML configuration files that have no corresponding
business record in the database.

Usage:
  npm run cleanup-yaml              # Dry run (show orphaned files)
  npm run cleanup-yaml --apply      # Actually delete orphaned files
  npm run cleanup-yaml --dir=path   # Specify custom YAML directory
  npm run cleanup-yaml --help       # Show this help

Examples:
  npm run cleanup-yaml                              # Preview what would be deleted
  npm run cleanup-yaml --apply                      # Delete orphaned files
  npm run cleanup-yaml --dir=custom/path --apply    # Use custom directory

Notes:
  - By default, runs in DRY RUN mode (no files are deleted)
  - Use --apply flag to actually delete files
  - Orphaned files occur when signup fails after YAML creation
  - Deleted business records (soft-deleted) are also considered orphaned
    `);
    process.exit(0);
  }

  console.log('🧹 YAML Cleanup Tool\n');
  console.log(`Mode: ${apply ? '⚠️  APPLY (will delete files)' : '🔍 DRY RUN (preview only)'}`);
  console.log(`Directory: ${yamlDir}\n`);

  if (apply) {
    console.log('⚠️  WARNING: This will permanently delete orphaned YAML files!');
    console.log('Press Ctrl+C now to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Run cleanup
  const result = await cleanupOrphanedYAMLFiles(yamlDir, !apply);

  console.log('\n📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total orphaned files: ${result.orphanedFiles.length}`);

  if (apply) {
    console.log(`Files removed: ${result.removedFiles.length}`);
    console.log(`Errors: ${result.errors.length}`);
  }

  if (result.orphanedFiles.length > 0) {
    console.log('\n📁 Orphaned files:');
    result.orphanedFiles.forEach(file => {
      const status = apply
        ? result.removedFiles.includes(file)
          ? '✅ Removed'
          : '❌ Failed'
        : '🔍 Would delete';
      console.log(`  ${status}: ${file}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (!apply && result.orphanedFiles.length > 0) {
    console.log('\n💡 To actually delete these files, run:');
    console.log('   npm run cleanup-yaml --apply');
  }

  if (apply && result.removedFiles.length > 0) {
    console.log('\n✅ Cleanup complete!');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
