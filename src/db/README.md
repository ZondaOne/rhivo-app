# Rhivo Database Schema

This directory contains the database schema, migrations, and utilities for the Rhivo appointment platform.

## Database Structure

The database is designed with the following key principles:
- **Data consistency**: Enforced via DB constraints, triggers, and Row-Level Security (RLS)
- **Concurrency control**: Reservation system with TTL and optimistic locking
- **Multi-tenancy**: Business isolation via RLS policies
- **Audit trail**: Immutable history of all appointment changes

## Tables

### Core Entities
- **businesses**: Tenant/business records with subdomain and configuration
- **users**: Owners, staff, and customers (differentiated by role)
- **categories**: Service groupings for organizational display
- **services**: Bookable offerings with duration, price, and capacity

### Scheduling
- **availability**: Weekly recurring hours and date-specific exceptions
- **reservations**: Short-lived holds on timeslots (10-minute TTL)
- **appointments**: Committed bookings with status tracking

### Audit & Notifications
- **audit_logs**: Immutable history of appointment state changes
- **notification_logs**: Delivery tracking for email/SMS/webhooks

## Migration System

Migrations are SQL files in the `migrations/` directory, numbered sequentially:

```
001_foundation_tables.sql      - Core entities and enum types
002_availability_scheduling.sql - Availability rules
003_reservations_appointments.sql - Booking system with concurrency control
004_audit_notifications.sql    - Audit logs and notification tracking
005_rls_policies.sql           - Row-Level Security policies
006_performance_indexes.sql    - Additional performance indexes
007_seed_data.sql              - Demo business and sample data
```

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Rollback last migration (removes record only, manual schema rollback required)
npm run migrate:rollback
```

## Data Consistency Guarantees

### Preventing Overbooking

1. **Reservation System**: Clients create a short-lived reservation (10-minute TTL) before committing
2. **Unique Constraints**: Partial unique index prevents double-booking same slot
3. **Capacity Enforcement**: Trigger checks `max_simultaneous_bookings` before insert/update
4. **Idempotency Keys**: Safe client retries without duplicate bookings

### Concurrency Control

- **Optimistic Locking**: `version` field on appointments detects concurrent edits
- **Database Triggers**: Enforce capacity constraints at DB level
- **RLS Policies**: Prevent cross-tenant data access

## Row-Level Security (RLS)

JWT claims are used for RLS enforcement:

```typescript
interface JWTClaims {
  user_id?: string;          // Current user ID
  business_id?: string;      // Business scope for owners/staff
  role?: 'owner' | 'staff' | 'customer';
  cancellation_token?: string; // Guest cancellation access
}
```

### Access Patterns

- **Public (booking pages)**: Read businesses, services, categories, availability
- **Customers**: Read own appointments, create bookings, cancel own appointments
- **Guests**: Cancel via cancellation_token in JWT
- **Staff**: Full access to business data
- **Owners**: Full access + business configuration

## Database Client Usage

```typescript
import { sql } from '@/db/client';

// Simple query
const businesses = await sql`
  SELECT * FROM businesses
  WHERE status = 'active'
`;

// With parameters (automatic escaping)
const business = await sql`
  SELECT * FROM businesses
  WHERE subdomain = ${subdomain}
`;

// Transaction
import { withTransaction } from '@/db/client';

await withTransaction(async (sql) => {
  await sql`INSERT INTO reservations ...`;
  await sql`INSERT INTO appointments ...`;
});
```

## Environment Variables

Required in `.env`:

```bash
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require
JWT_SECRET=your-secret-key
```

## Cleanup Jobs

### Expired Reservations

Run periodically (every 60 seconds recommended):

```sql
DELETE FROM reservations WHERE expires_at < NOW();
```

Or via application:

```typescript
await sql`DELETE FROM reservations WHERE expires_at < NOW()`;
```

## Testing Data Consistency

See `docs/testing.md` for concurrency test scenarios to verify:
- No overbooking under concurrent load
- Idempotency key prevents duplicates
- RLS prevents cross-tenant access
- Optimistic locking detects conflicts

## Schema Validation

All migrations include:
- CHECK constraints for data integrity
- UNIQUE constraints for business rules
- Foreign keys with appropriate CASCADE/SET NULL
- Indexes for query performance
- Comments for documentation

## Backup & Recovery

- Enable point-in-time recovery on NeonDB
- Regular automated backups
- Test restore procedure monthly
- Keep audit_logs indefinitely for compliance