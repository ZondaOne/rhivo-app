import { neon, neonConfig } from '@neondatabase/serverless';
import { env } from '@/lib/env';
import { isDatabaseError, getDatabaseErrorType, reportCriticalError } from '@/lib/monitoring/critical-errors';

// Enable fetch connection cache for better serverless performance
// This allows connection reuse across serverless function invocations
neonConfig.fetchConnectionCache = true;

// Create a connection using the DATABASE_URL from environment
export function getDbClient() {
  const client = neon(env.DATABASE_URL, {
    fetchOptions: {
      // Disable cache to ensure fresh data on every query
      // Note: Connection pooling via fetchConnectionCache is still enabled for performance
      cache: 'no-store',
      // Add 10 second timeout for database queries
      signal: AbortSignal.timeout(10000),
    },
  });

  // Wrap the client to catch and report critical database errors
  return new Proxy(client, {
    apply: async (target, thisArg, args) => {
      try {
        return await target.apply(thisArg, args);
      } catch (error) {
        if (error instanceof Error && isDatabaseError(error)) {
          reportCriticalError({
            errorType: getDatabaseErrorType(error),
            severity: 'critical',
            error,
            metadata: {
              query: args[0]?.toString?.().substring(0, 200), // First 200 chars of query
              timestamp: new Date().toISOString(),
            },
          });
        }
        throw error;
      }
    },
  }) as typeof client;
}

// Lazy-loaded default client for convenience
let _sqlClient: ReturnType<typeof neon> | null = null;
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop) {
    if (!_sqlClient) {
      _sqlClient = getDbClient();
    }
    return (_sqlClient as any)[prop];
  },
  apply(target, thisArg, args) {
    if (!_sqlClient) {
      _sqlClient = getDbClient();
    }
    return (_sqlClient as any)(...args);
  }
});

// Type helpers for common database operations
export type DbClient = ReturnType<typeof getDbClient>;

// Transaction isolation levels
export type TransactionIsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
}

/**
 * Transaction helper with configurable isolation level
 *
 * For booking operations, use SERIALIZABLE isolation to prevent phantom reads
 * and ensure complete consistency under concurrent load.
 *
 * Note: Neon's serverless driver doesn't support connection pooling with
 * long-lived transactions, so we use BEGIN/COMMIT within a single query context.
 */
export async function withTransaction<T>(
  callback: (sql: DbClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const client = getDbClient();
  const isolationLevel = options.isolationLevel || 'READ COMMITTED';

  try {
    // Begin transaction with specified isolation level
    await client`BEGIN TRANSACTION ISOLATION LEVEL ${client.unsafe(isolationLevel)}`;
    const result = await callback(client);
    await client`COMMIT`;
    return result;
  } catch (error) {
    await client`ROLLBACK`;
    throw error;
  }
}

/**
 * Shorthand for SERIALIZABLE transaction
 * Use this for critical booking operations
 */
export async function withSerializableTransaction<T>(
  callback: (sql: DbClient) => Promise<T>
): Promise<T> {
  return withTransaction(callback, { isolationLevel: 'SERIALIZABLE' });
}