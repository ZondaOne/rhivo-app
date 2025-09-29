import { neon } from '@neondatabase/serverless';

// Create a connection using the DATABASE_URL from environment
export function getDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return neon(databaseUrl);
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

// Transaction helper
export async function withTransaction<T>(
  callback: (sql: DbClient) => Promise<T>
): Promise<T> {
  const client = getDbClient();

  try {
    await client`BEGIN`;
    const result = await callback(client);
    await client`COMMIT`;
    return result;
  } catch (error) {
    await client`ROLLBACK`;
    throw error;
  }
}