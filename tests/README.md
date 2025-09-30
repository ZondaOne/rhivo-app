# Rivo Test Suite

Comprehensive test suite for the Rivo appointment platform.

## Test Suites

1. **Database Tests** (`01-database.test.ts`)
   - Database connection verification
   - Schema validation
   - Constraints and indexes check

2. **Authentication Tests** (`02-auth.test.ts`)
   - Owner signup with business creation
   - Customer signup
   - Login functionality
   - Token refresh
   - Invalid credentials handling
   - Duplicate signup prevention

3. **Booking Tests** (`03-booking.test.ts`)
   - Capacity checking
   - Slot reservation
   - Reservation commit to appointment
   - Idempotency validation
   - Expired reservation handling
   - Concurrent booking scenarios

4. **Appointment Tests** (`04-appointments.test.ts`)
   - Manual appointment creation
   - Appointment retrieval
   - Appointment updates
   - Rescheduling
   - Cancellation
   - Guest access tokens

5. **Audit Log Tests** (`05-audit-logs.test.ts`)
   - Audit log creation
   - Update tracking
   - Cancellation logging
   - Full history verification
   - API retrieval

## Running Tests

### Run all tests:
```bash
npm run test
```

### Run individual test suites:
```bash
tsx tests/01-database.test.ts
tsx tests/02-auth.test.ts
tsx tests/03-booking.test.ts
tsx tests/04-appointments.test.ts
tsx tests/05-audit-logs.test.ts
```

### Run specific test with debug output:
All tests include detailed debug logging that shows:
- Database queries and results
- API requests and responses
- Validation checks
- Error messages with context

## Test Data

All tests use the prefix `test-` for easy identification and cleanup:
- Email: `test-{id}@test.com`
- Subdomain: `test-{id}`
- Business names: `Test {Purpose} Business`

Test data is automatically cleaned up after each test suite completes.

## Prerequisites

1. Environment variables configured in `.env`:
   - `DATABASE_URL`: NeonDB connection string
   - `JWT_SECRET`: Secret for JWT tokens
   - `BASE_URL`: Application URL (default: http://localhost:3000)

2. Database migrations run:
   ```bash
   npm run migrate:up
   ```

3. Development server running:
   ```bash
   npm run dev
   ```

## Debug Output

Each test includes detailed debug logging:
- `[DEBUG]`: Informational messages
- `[ERROR]`: Error conditions
- `[SUCCESS]`: Successful operations

Debug logs include:
- Timestamps
- Section identifiers
- Request/response data
- Database query results

## Test Strategy

1. **Sequential Execution**: Tests run sequentially to avoid conflicts
2. **Isolation**: Each test suite creates and cleans up its own data
3. **Comprehensive Coverage**: Tests cover happy paths and error scenarios
4. **Real API Calls**: Tests hit actual API endpoints (integration tests)
5. **Database Verification**: Tests verify database state after operations

## Adding New Tests

1. Create a new test file: `tests/0X-feature.test.ts`
2. Import setup utilities: `import { sql, debug, cleanupTestData, TEST_CONFIG } from './setup'`
3. Implement test functions following the pattern in existing tests
4. Add cleanup at the end: `await cleanupTestData(sql)`
5. Update `run-all.ts` to include the new test suite
6. Update this README with the new test suite description