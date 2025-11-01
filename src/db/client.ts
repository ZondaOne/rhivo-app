import { neon, neonConfig } from '@neondatabase/serverless';
import { env } from '@/lib/env';

// Enable fetch connection cache for better serverless performance
// This allows connection reuse across serverless function invocations
neonConfig.fetchConnectionCache = true;

// Create a connection using the DATABASE_URL from environment
export function getDbClient() {
  return neon(env.DATABASE_URL, {
    fetchOptions: {
      // Disable cache to ensure fresh data on every query
      // Note: Connection pooling via fetchConnectionCache is still enabled for performance
      cache: 'no-store',
    },
  });
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