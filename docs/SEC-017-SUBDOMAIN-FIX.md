# SEC-017: Subdomain Uniqueness & YAML Corruption Fix

## Summary

Fixed critical bugs in subdomain generation and YAML file management:

1. **Subdomain Collision Bug**: Multiple businesses with the same name would generate identical subdomains, causing database constraint violations
2. **Orphaned YAML Files**: YAML files created before database operations would remain if signup failed, causing subdomain to appear "taken"

## Issues Fixed

### Issue 1: Subdomain Collision in Owner Signup

**Location**: `/app/api/auth/signup/owner/route.ts:171-177`

**Problem**:
```typescript
// OLD CODE - NO COLLISION CHECK
function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);
}
```

If two businesses named "Blue's Barber" signed up:
- Both would get subdomain `blues-barber`
- Second signup would fail with database constraint error
- User would see generic 500 error

**Solution**:
```typescript
// NEW CODE - WITH COLLISION HANDLING
async function generateUniqueSubdomain(businessName: string): Promise<string> {
  const baseSubdomain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);

  // Check format validity
  const formatCheck = validateSubdomainFormat(baseSubdomain);
  if (!formatCheck.valid) {
    throw new Error(`Cannot generate valid subdomain: ${formatCheck.error}`);
  }

  // Check if base subdomain is available
  const availabilityCheck = await checkSubdomainAvailability(baseSubdomain);
  if (availabilityCheck.available) {
    return baseSubdomain;
  }

  // Base is taken - try with random suffix (max 10 attempts)
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.random().toString(36).substring(2, 6);
    const candidateSubdomain = `${baseSubdomain}-${suffix}`.substring(0, 63);

    const candidateCheck = await checkSubdomainAvailability(candidateSubdomain);
    if (candidateCheck.available) {
      return candidateSubdomain;
    }
  }

  // Fallback: use timestamp-based suffix
  const timestamp = Date.now().toString(36);
  return `${baseSubdomain}-${timestamp}`.substring(0, 63);
}
```

**Behavior**:
- First business: `blues-barber`
- Second business: `blues-barber-a3x9` (random 4-char suffix)
- Third business: `blues-barber-k2p7` (different random suffix)

### Issue 2: Orphaned YAML Files

**Location**: `/app/api/onboard/self-service/route.ts:69-86`

**Problem**:
```typescript
// OLD CODE - YAML WRITTEN BEFORE DB OPERATIONS
const yamlPath = `config/tenants/${formData.businessId}.yaml`;
await fs.writeFile(fullPath, yamlResult.yaml, 'utf-8');  // Written here

// ... later ...
await db`INSERT INTO businesses ...`;  // If this fails, YAML remains
```

Sequence of events:
1. User submits subdomain `my-salon`
2. YAML file `my-salon.yaml` created
3. Database insertion fails (e.g., password validation error)
4. Signup fails, but YAML file remains
5. Next user tries `my-salon` → validation says "subdomain taken"
6. But no business exists in database!

**Solution**:
```typescript
// NEW CODE - YAML WRITTEN AFTER SUCCESSFUL DB OPERATIONS
const yamlPath = `config/tenants/${formData.businessId}.yaml`;
// Don't write YAML yet...

// Create business in database first
await db`INSERT INTO businesses ...`;
await db`INSERT INTO users ...`;
// ... all database operations ...

// NOW save YAML file after successful database operations
try {
  await fs.writeFile(fullPath, yamlResult.yaml, 'utf-8');
  console.log('✅ YAML file saved:', yamlPath);
} catch (err) {
  console.error('❌ Failed to save YAML file:', err);
  // Don't fail the request - YAML can be regenerated from database
}
```

**Benefits**:
- YAML only created after successful database insertion
- If signup fails, no orphaned files
- If YAML write fails, business still created (YAML can be regenerated)

## New Utilities

### 1. YAML Cleanup Utility

**Location**: `/src/lib/utils/yaml-cleanup.ts`

Functions:
- `findOrphanedYAMLFiles()` - Scans directory, checks against database
- `cleanupOrphanedYAMLFiles()` - Removes orphaned files (with dry-run mode)
- `removeYAMLIfOrphaned()` - Removes specific file if orphaned

### 2. CLI Cleanup Tool

**Location**: `/scripts/cleanup-yaml.ts`

Usage:
```bash
# Preview orphaned files (dry run)
npm run cleanup-yaml

# Actually delete orphaned files
npm run cleanup-yaml --apply

# Show help
npm run cleanup-yaml --help

# Custom directory
npm run cleanup-yaml --dir=custom/path --apply
```

Example output:
```
🧹 YAML Cleanup Tool
Mode: 🔍 DRY RUN (preview only)
Directory: config/tenants

📁 Found 10 YAML files in config/tenants
🔍 Orphaned file found: old-business.yaml (no matching business)
🔍 Orphaned file found: deleted-salon.yaml (business soft-deleted)

📊 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total orphaned files: 2

📁 Orphaned files:
  🔍 Would delete: old-business.yaml
  🔍 Would delete: deleted-salon.yaml

💡 To actually delete these files, run:
   npm run cleanup-yaml --apply
```

## Testing

### Automated Test Suite

**Location**: `/tests/subdomain-collision.test.ts`

Run with: `npm run test:subdomain`

Tests:
1. **First business creation** - Gets clean subdomain (e.g., `blues-barber-shop`)
2. **Second business collision** - Gets suffix (e.g., `blues-barber-shop-ki5a`)
3. **Subdomain uniqueness** - Verifies all subdomains are different
4. **Format validation** - Checks suffix pattern
5. **Multiple collisions** - Tests third+ businesses
6. **Orphan creation** - Creates YAML without database entry
7. **Dry-run cleanup** - Detects orphan without deleting
8. **Apply cleanup** - Removes orphaned file
9. **Verification** - Confirms file deletion

### Test Results

```
✅ All collision tests passed!
✅ All YAML cleanup tests passed!

Examples:
- Business 1: blues-barber-shop
- Business 2: blues-barber-shop-ki5a
- Business 3: blues-barber-shop-knos
```

## Architecture Decisions

### Why Path-Based Subdomains?

**Current**: `rhivo.app/{locale}/book/{subdomain}`
**Alternative**: `{subdomain}.rhivo.app/book`

**Reasons for Path-Based**:
1. ✅ **No DNS configuration** - works immediately
2. ✅ **No SSL wildcard certificates** - single cert
3. ✅ **Easier local development** - no hosts file
4. ✅ **Simpler deployment** - no infrastructure changes
5. ✅ **Better SEO** - all under one domain
6. ✅ **Tenant switching** - customers can browse discovery page
7. ✅ **No CORS issues** - same-origin requests
8. ✅ **Already implemented** - entire codebase uses this

**When DNS Subdomains Would Be Better**:
- White-labeling (businesses want their own domain feel)
- Complete isolation needed (separate apps)
- Different SSL certs per tenant

For a multi-tenant booking platform like Rhivo, path-based routing is the optimal choice.

## Migration Guide

### For Existing Installations

If you have orphaned YAML files from before this fix:

```bash
# 1. Check for orphaned files
npm run cleanup-yaml

# 2. Review the list carefully
# Files are orphaned if:
# - No matching business in database
# - Business is soft-deleted (deleted_at != NULL)

# 3. Remove orphaned files
npm run cleanup-yaml --apply
```

### For Developers

No action needed. The fix is automatic:
- New signups use collision-aware subdomain generation
- YAML files only created after successful database operations
- Existing businesses unaffected

## Security Impact

### Before Fix
- **Denial of Service**: Attacker could reserve popular subdomains by:
  1. Creating YAML files without completing signup
  2. Failing signup intentionally after subdomain check
  3. Preventing legitimate users from using those names

### After Fix
- **YAML files only created after full signup** - no way to reserve without completing
- **Automatic collision handling** - users always get a working subdomain
- **Cleanup utility** - admins can remove any orphaned files

## Performance Impact

- **Minimal**: Subdomain availability check adds ~10-50ms to signup
- **One-time cost**: Only checked during initial signup
- **Cached lookups**: Config loader already caches subdomain lookups for 5 minutes
- **Database index**: `businesses_subdomain_unique_idx` ensures fast lookups

## Files Changed

### Modified Files
1. `/app/api/auth/signup/owner/route.ts`
   - Added `generateUniqueSubdomain()` with collision handling
   - Imports from `/src/lib/validation/subdomain.ts`

2. `/app/api/onboard/self-service/route.ts`
   - Moved YAML file creation after database operations
   - Added error handling for YAML write failures

3. `/package.json`
   - Added `cleanup-yaml` script
   - Added `test:subdomain` script

### New Files
1. `/src/lib/utils/yaml-cleanup.ts`
   - YAML orphan detection and cleanup utilities

2. `/scripts/cleanup-yaml.ts`
   - CLI tool for manual cleanup

3. `/tests/subdomain-collision.test.ts`
   - Comprehensive test suite

4. `/docs/SEC-017-SUBDOMAIN-FIX.md` (this file)
   - Complete documentation

## References

- **Issue**: SEC-017 in `/pre-deploy-prompt.xml`
- **Database Schema**: `/src/db/migrations/001_foundation_tables.sql:29-32`
- **Validation Library**: `/src/lib/validation/subdomain.ts`
- **Config Loader**: `/src/lib/config/config-loader.ts`

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [Onboarding Guide](./ONBOARDING_GUIDE.md)
- [Auth Implementation](./AUTH_IMPLEMENTATION.md)
