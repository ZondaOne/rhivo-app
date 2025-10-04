# Rivo Database Schema Documentation

This document provides a comprehensive reference for the Rivo database schema. All tables, columns, constraints, and relationships are documented here.

**Generated:** 2025-10-04
**Database:** PostgreSQL 16.9 on NeonDB
**Migrations Status:** Up to date (migrations 001-013 ready)

---

## Table of Contents

- [Overview](#overview)
- [Enums](#enums)
- [Tables](#tables)
  - [businesses](#businesses)
  - [users](#users)
  - [business_owners](#business_owners)
  - [categories](#categories)
  - [services](#services)
  - [availability](#availability)
  - [reservations](#reservations)
  - [appointments](#appointments)
  - [audit_logs](#audit_logs)
  - [notification_logs](#notification_logs)
  - [refresh_tokens](#refresh_tokens)
  - [jwt_revocations](#jwt_revocations)
  - [rate_limits](#rate_limits)
- [Relationships](#relationships)
- [Indexes](#indexes)

---

## Overview

The Rivo database is designed for a multi-tenant appointment booking platform. Key features:

- **Multi-tenancy:** Each business is isolated via `business_id` foreign keys
- **Soft deletes:** Most tables use `deleted_at` for soft deletion
- **Audit trail:** All appointment changes are logged in `audit_logs`
- **Concurrency control:** Reservations system prevents double-booking
- **Security:** RLS policies, rate limiting, and token management

---

## Enums

### `user_role`
```sql
'owner' | 'staff' | 'customer'
```

### `business_status`
```sql
'active' | 'suspended' | 'deleted'
```

### `appointment_status`
```sql
'confirmed' | 'canceled' | 'completed' | 'no_show'
```

### `notification_channel`
```sql
'email' | 'sms' | 'webhook'
```

### `notification_status`
```sql
'pending' | 'sent' | 'failed' | 'retrying'
```

### `audit_action`
```sql
'created' | 'confirmed' | 'modified' | 'canceled' | 'completed' | 'no_show'
```

---

## Tables

### `businesses`

Core table for business/tenant information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `subdomain` | TEXT | NO | - | Unique subdomain (e.g., `acme.rivo.app`) |
| `name` | TEXT | NO | - | Business display name |
| `timezone` | TEXT | NO | - | IANA timezone (e.g., `America/New_York`) |
| `config_yaml_path` | TEXT | NO | - | Path to YAML configuration file |
| `config_version` | INTEGER | NO | `1` | Configuration version number |
| `status` | business_status | NO | `'active'` | Business account status |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Record update timestamp |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: `subdomain` (WHERE `deleted_at IS NULL`)

**Indexes:**
- `businesses_subdomain_unique_idx` - Unique subdomain for active businesses
- `businesses_status_idx` - Query by status

---

### `users`

User accounts (owners, staff, customers).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `email` | TEXT | NO | - | User email address |
| `name` | TEXT | YES | NULL | User full name |
| `phone` | TEXT | YES | NULL | User phone number |
| `role` | user_role | NO | - | User role |
| `business_id` | UUID | YES | NULL | Associated business (owners/staff) |
| `password_hash` | TEXT | YES | NULL | Bcrypt password hash |
| `email_verified` | BOOLEAN | NO | `FALSE` | Email verification status |
| `email_verification_token` | TEXT | YES | NULL | Hashed email verification token |
| `email_verification_expires_at` | TIMESTAMPTZ | YES | NULL | Token expiration |
| `password_reset_token` | TEXT | YES | NULL | Hashed password reset token |
| `password_reset_expires_at` | TIMESTAMPTZ | YES | NULL | Token expiration |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- UNIQUE: `email` (WHERE `deleted_at IS NULL`)
- CHECK: Password required for owners/staff

**Indexes:**
- `users_email_unique_idx` - Unique email for active users
- `users_email_lower_idx` - Case-insensitive email lookup
- `users_business_role_idx` - Query users by business and role

**Notes:**
- `business_id` column remains for backward compatibility and references primary business
- Use `business_owners` junction table for multi-business relationships (see below)

---

### `business_owners`

Junction table for many-to-many user-business ownership relationships.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | NO | - | Owner user |
| `business_id` | UUID | NO | - | Owned business |
| `is_primary` | BOOLEAN | NO | `false` | Default/primary business flag |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Relationship creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- UNIQUE: (`user_id`, `business_id`)
- UNIQUE: `user_id` WHERE `is_primary = true` (one primary per user)

**Indexes:**
- `business_owners_user_id_idx` - User's businesses lookup
- `business_owners_business_id_idx` - Business owners lookup
- `business_owners_user_primary_idx` - Find primary business
- `business_owners_one_primary_per_user_idx` - Enforce single primary

**Helper Functions:**
- `get_user_businesses(user_id)` - Returns all businesses for a user
- `user_owns_business(user_id, business_id)` - Check ownership
- `get_primary_business(user_id)` - Get primary business ID
- `set_primary_business(user_id, business_id)` - Set primary business

**Triggers:**
- `business_owners_sync_primary` - Syncs primary changes to `users.business_id`
- `users_sync_junction` - Syncs `users.business_id` changes to junction table

**Purpose:**
Enables multi-business ownership where a single owner can manage multiple businesses. The `is_primary` flag indicates the default business shown in the dashboard.

---

### `categories`

Service categories for organizing services.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `business_id` | UUID | NO | - | Owning business |
| `name` | TEXT | NO | - | Category name |
| `sort_order` | INTEGER | NO | `0` | Display order |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- UNIQUE: (`business_id`, `name`) WHERE `deleted_at IS NULL`

**Indexes:**
- `categories_business_name_unique_idx` - Unique category names per business
- `categories_business_sort_idx` - Ordered category listing

---

### `services`

Services offered by businesses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `business_id` | UUID | NO | - | Owning business |
| `category_id` | UUID | NO | - | Parent category |
| `name` | TEXT | NO | - | Service name |
| `duration_minutes` | INTEGER | NO | - | Service duration |
| `price_cents` | INTEGER | NO | - | Price in cents |
| `color` | TEXT | NO | - | Display color (hex) |
| `max_simultaneous_bookings` | INTEGER | NO | `1` | Concurrent booking limit |
| `sort_order` | INTEGER | NO | `0` | Display order |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- FOREIGN KEY: `category_id` REFERENCES `categories(id)` ON DELETE CASCADE
- UNIQUE: (`business_id`, `name`) WHERE `deleted_at IS NULL`

**Indexes:**
- `services_business_name_unique_idx` - Unique service names per business
- `services_business_category_sort_idx` - Ordered service listing
- `services_category_active_idx` - Active services by category

---

### `availability`

Business availability schedules and exceptions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `business_id` | UUID | NO | - | Owning business |
| `day_of_week` | INTEGER | YES | NULL | Day (0=Sunday, 6=Saturday) |
| `exception_date` | DATE | YES | NULL | Specific date override |
| `start_time` | TIME | NO | - | Opening time |
| `end_time` | TIME | NO | - | Closing time |
| `is_available` | BOOLEAN | NO | `TRUE` | Available or closed |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- CHECK: Either `day_of_week` OR `exception_date` must be set

**Indexes:**
- `availability_business_day_idx` - Regular schedule lookup
- `availability_business_exception_idx` - Exception date lookup

---

### `reservations`

Temporary time slot holds to prevent double-booking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `business_id` | UUID | NO | - | Owning business |
| `service_id` | UUID | NO | - | Reserved service |
| `slot_start` | TIMESTAMPTZ | NO | - | Reservation start time |
| `slot_end` | TIMESTAMPTZ | NO | - | Reservation end time |
| `idempotency_key` | TEXT | NO | - | Client-provided idempotency key |
| `expires_at` | TIMESTAMPTZ | NO | - | Reservation expiration (5-10 min) |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- FOREIGN KEY: `service_id` REFERENCES `services(id)` ON DELETE CASCADE
- UNIQUE: `idempotency_key`
- UNIQUE: (`business_id`, `service_id`, `slot_start`, `expires_at`)

**Indexes:**
- `reservations_idempotency_key_unique_idx` - Idempotency enforcement
- `reservations_slot_unique_idx` - Prevent overlapping reservations
- `reservations_expires_at_idx` - Cleanup expired reservations
- `reservations_business_time_idx` - Time-based queries
- `reservations_business_expires_idx` - Business + expiration queries

---

### `appointments`

Confirmed appointments/bookings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `business_id` | UUID | NO | - | Owning business |
| `service_id` | UUID | NO | - | Booked service |
| `customer_id` | UUID | YES | NULL | Customer user (if registered) |
| `guest_email` | TEXT | YES | NULL | Guest email (if not registered) |
| `guest_phone` | TEXT | YES | NULL | Guest phone |
| `slot_start` | TIMESTAMPTZ | NO | - | Appointment start time |
| `slot_end` | TIMESTAMPTZ | NO | - | Appointment end time |
| `status` | appointment_status | NO | `'confirmed'` | Appointment status |
| `idempotency_key` | TEXT | NO | - | Client-provided idempotency key |
| `reservation_id` | UUID | YES | NULL | Original reservation ID |
| `cancellation_token` | TEXT | YES | NULL | Guest cancellation token |
| `guest_token_hash` | TEXT | YES | NULL | Hashed guest access token |
| `guest_token_expires_at` | TIMESTAMPTZ | YES | NULL | Guest token expiration |
| `version` | INTEGER | NO | `1` | Optimistic locking version |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Record update timestamp |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `business_id` REFERENCES `businesses(id)` ON DELETE CASCADE
- FOREIGN KEY: `service_id` REFERENCES `services(id)` ON DELETE CASCADE
- FOREIGN KEY: `customer_id` REFERENCES `users(id)` ON DELETE SET NULL
- FOREIGN KEY: `reservation_id` REFERENCES `reservations(id)` ON DELETE SET NULL
- UNIQUE: `idempotency_key`
- UNIQUE: `cancellation_token` (WHERE NOT NULL)

**Indexes:**
- `appointments_idempotency_key_unique_idx` - Idempotency enforcement
- `appointments_cancellation_token_unique_idx` - Cancellation token lookup
- `appointments_business_time_idx` - Time-based queries
- `appointments_business_status_time_idx` - Status + time queries
- `appointments_customer_idx` - Customer appointment list
- `appointments_customer_time_idx` - Customer appointments by time
- `appointments_service_idx` - Service-based queries
- `appointments_global_time_idx` - Global time-based queries
- `appointments_guest_token_hash_idx` - Guest access lookup

---

### `audit_logs`

Immutable audit trail for appointment changes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `appointment_id` | UUID | NO | - | Related appointment |
| `actor_id` | UUID | YES | NULL | User who made the change |
| `action` | audit_action | NO | - | Type of change |
| `old_state` | JSONB | YES | NULL | Previous state (JSON) |
| `new_state` | JSONB | NO | - | New state (JSON) |
| `timestamp` | TIMESTAMPTZ | NO | `NOW()` | Change timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `appointment_id` REFERENCES `appointments(id)` ON DELETE CASCADE
- FOREIGN KEY: `actor_id` REFERENCES `users(id)` ON DELETE SET NULL

**Indexes:**
- `audit_logs_appointment_time_idx` - Appointment history
- `audit_logs_actor_idx` - Actor activity log
- `audit_logs_old_state_gin_idx` - JSON search on old state
- `audit_logs_new_state_gin_idx` - JSON search on new state

**Triggers:**
- `appointments_audit_log` - Auto-creates audit entries on appointment changes

---

### `notification_logs`

Notification delivery tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `appointment_id` | UUID | YES | NULL | Related appointment |
| `recipient_email` | TEXT | YES | NULL | Email recipient |
| `recipient_phone` | TEXT | YES | NULL | Phone recipient |
| `channel` | notification_channel | NO | - | Delivery channel |
| `status` | notification_status | NO | `'pending'` | Delivery status |
| `attempts` | INTEGER | NO | `0` | Delivery attempts |
| `last_attempt_at` | TIMESTAMPTZ | YES | NULL | Last attempt time |
| `error_message` | TEXT | YES | NULL | Error details |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `appointment_id` REFERENCES `appointments(id)` ON DELETE SET NULL

**Indexes:**
- `notification_logs_appointment_idx` - Appointment notifications
- `notification_logs_retry_idx` - Failed notifications needing retry
- `notification_logs_pending_retry_idx` - Pending retry queue

---

### `refresh_tokens`

Long-lived refresh tokens for JWT rotation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `user_id` | UUID | NO | - | Token owner |
| `token_hash` | TEXT | NO | - | Hashed refresh token |
| `device_fingerprint` | TEXT | YES | NULL | Device identifier |
| `issued_at` | TIMESTAMPTZ | NO | `NOW()` | Token issue time |
| `expires_at` | TIMESTAMPTZ | NO | - | Token expiration (30 days) |
| `revoked_at` | TIMESTAMPTZ | YES | NULL | Revocation timestamp |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- UNIQUE: `token_hash`

**Indexes:**
- `refresh_tokens_token_hash_unique_idx` - Token lookup
- `refresh_tokens_user_id_idx` - User's tokens
- `refresh_tokens_expires_at_idx` - Cleanup expired tokens

---

### `jwt_revocations`

Revoked JWT IDs for immediate access token invalidation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `jti` | TEXT | NO | - | JWT ID claim |
| `user_id` | UUID | NO | - | Token owner |
| `revoked_at` | TIMESTAMPTZ | NO | `NOW()` | Revocation timestamp |
| `expires_at` | TIMESTAMPTZ | NO | - | Original token expiration |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- UNIQUE: `jti`

**Indexes:**
- `jwt_revocations_jti_unique_idx` - JTI lookup during validation
- `jwt_revocations_expires_at_idx` - Cleanup old revocations

---

### `rate_limits`

Rate limiting for authentication operations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `uuid_generate_v4()` | Primary key |
| `identifier` | TEXT | NO | - | IP address, email, or token |
| `action` | TEXT | NO | - | Action type (login, etc.) |
| `attempts` | INTEGER | NO | `1` | Attempt count |
| `window_start` | TIMESTAMPTZ | NO | `NOW()` | Rate limit window start |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- UNIQUE: (`identifier`, `action`)

**Indexes:**
- `rate_limits_identifier_action_idx` - Lookup by identifier + action
- `rate_limits_window_start_idx` - Cleanup old windows

**Current Limits (TESTING - reduce for production):**
- `login`: 100 attempts per 15 minutes
- `guest_token_validation`: 100 per 60 minutes
- `password_reset`: 100 per 60 minutes
- `email_verification`: 100 per 60 minutes

---

## Relationships

### Business ↔ Users (Many-to-Many via business_owners)
- `business_owners.user_id` → `users.id`
- `business_owners.business_id` → `businesses.id`
- A user can own/manage multiple businesses
- A business can have multiple owners/staff
- `users.business_id` references primary business for backward compatibility

### Business → Categories (One-to-Many)
- `categories.business_id` → `businesses.id`
- Each business has multiple service categories

### Category → Services (One-to-Many)
- `services.category_id` → `categories.id`
- Services are organized by category

### Business → Services (One-to-Many)
- `services.business_id` → `businesses.id`
- Direct business → service relationship

### Business → Availability (One-to-Many)
- `availability.business_id` → `businesses.id`
- Business hours and exceptions

### Business → Reservations (One-to-Many)
- `reservations.business_id` → `businesses.id`
- Temporary slot holds

### Service → Reservations (One-to-Many)
- `reservations.service_id` → `services.id`
- Reservations for specific services

### Business → Appointments (One-to-Many)
- `appointments.business_id` → `businesses.id`
- All appointments for a business

### Service → Appointments (One-to-Many)
- `appointments.service_id` → `services.id`
- Appointments for specific services

### User → Appointments (One-to-Many)
- `appointments.customer_id` → `users.id`
- Customer's appointments

### Reservation → Appointment (One-to-One)
- `appointments.reservation_id` → `reservations.id`
- Reservation converted to appointment

### Appointment → Audit Logs (One-to-Many)
- `audit_logs.appointment_id` → `appointments.id`
- Change history

### User → Audit Logs (One-to-Many)
- `audit_logs.actor_id` → `users.id`
- Who made changes

### Appointment → Notifications (One-to-Many)
- `notification_logs.appointment_id` → `appointments.id`
- Notifications sent for appointment

### User → Refresh Tokens (One-to-Many)
- `refresh_tokens.user_id` → `users.id`
- User's active refresh tokens

### User → JWT Revocations (One-to-Many)
- `jwt_revocations.user_id` → `users.id`
- User's revoked tokens

---

## Indexes

### Performance Indexes
All major query patterns are indexed:

- **Time-based queries:** `slot_start`, `slot_end`, `expires_at`
- **Business isolation:** `business_id` + secondary columns
- **User lookups:** `email`, `customer_id`
- **Status filtering:** `status`, `deleted_at`
- **Unique constraints:** `subdomain`, `idempotency_key`, tokens

### Partial Indexes
- Active records only: `WHERE deleted_at IS NULL`
- Specific statuses: `WHERE status IN ('confirmed', 'completed')`
- Expiring records: `WHERE expires_at > NOW()`

### GIN Indexes
- JSONB audit states: `old_state`, `new_state`

---

## Maintenance Functions

### `cleanup_expired_auth_data()`
Automatic cleanup of expired authentication data:
- Expired JWT revocations (older than 1 hour)
- Expired refresh tokens (marked as revoked)
- Old rate limit records (older than 24 hours)
- Expired email verification tokens
- Expired password reset tokens

**Usage:**
```sql
SELECT cleanup_expired_auth_data();
```

**Recommended Schedule:** Run daily via cron job

---

## Notes

1. **Soft Deletes:** Most tables use `deleted_at` for soft deletion. Always include `WHERE deleted_at IS NULL` in queries for active records.

2. **Timestamps:** All timestamps are stored in UTC (`TIMESTAMPTZ`). Convert to business timezone in application layer.

3. **UUIDs:** All primary keys are UUIDs for security and distributed system compatibility.

4. **Optimistic Locking:** `appointments.version` supports optimistic concurrency control.

5. **Idempotency:** `idempotency_key` fields ensure safe retries for critical operations.

6. **Multi-tenancy:** Always filter by `business_id` to ensure data isolation.

7. **RLS Policies:** Row-Level Security policies enforce tenant isolation (see migration 009).

8. **Audit Trail:** All appointment changes are automatically logged via triggers.

---

## Migration History

| # | Name | Status | Description |
|---|------|--------|-------------|
| 001 | foundation_tables | ✅ Applied | Core tables (businesses, users, categories, services) |
| 002 | availability_scheduling | ✅ Applied | Availability and scheduling |
| 003 | reservations_appointments | ✅ Applied | Reservations and appointments |
| 004 | audit_notifications | ✅ Applied | Audit logs and notifications |
| 005 | rls_policies | ✅ Applied | Row-Level Security policies |
| 006 | performance_indexes | ✅ Applied | Performance optimization indexes |
| 007 | seed_data | ✅ Applied | Initial seed data |
| 008 | auth_tables | ✅ Applied | Authentication and security tables |
| 009 | auth_rls_policies | ✅ Applied | Auth RLS policies |
| 010 | fix_availability_audit_schema | ✅ Applied | Fix availability audit trigger |
| 011 | add_service_external_id | ✅ Applied | Add external_id to services |
| 012 | backfill_service_external_ids | ✅ Applied | Backfill external_id values |
| 013 | multi_business_ownership | 🆕 Ready | Multi-business ownership via junction table |

---

**Last Updated:** 2025-10-04
**Maintained By:** Development Team
**Source:** `/Users/lautaro-mac-mini/Projects/rivo-app/src/db/migrations/`