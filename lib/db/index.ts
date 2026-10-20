import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { dataDir } from '../config';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;

function neon() {
 return drizzle(new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }), { schema });
}
export type Db = ReturnType<typeof neon>;

/** Without DATABASE_URL, local runs use Drizzle's embedded Postgres (PGlite)
 * stored in .data/postgres, migrated on first use and again whenever a
 * migration is added. Production always sets DATABASE_URL. */
async function local(): Promise<Db> {
 if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is not configured');
 const { PGlite } = await import('@electric-sql/pglite');
 const { drizzle: drizzleLite } = await import('drizzle-orm/pglite');
 const { join } = await import('node:path');
 const { mkdir } = await import('node:fs/promises');
 const dir = await dataDir();
 await mkdir(dir, { recursive: true });
 const client = new PGlite(join(dir, 'postgres'));
 return drizzleLite(client, { schema }) as unknown as Db;
}
async function migrationCount() {
 const { readFile } = await import('node:fs/promises');
 const { join } = await import('node:path');
 return (JSON.parse(await readFile(join(process.cwd(), 'drizzle/meta/_journal.json'), 'utf8')).entries as unknown[]).length;
}

// One database per process; dev re-runs migrations when the count changes.
const cache = globalThis as typeof globalThis & { swapDb?: Promise<Db>; swapMigrated?: Promise<number> };
export async function getDb(): Promise<Db> {
 if (process.env.DATABASE_URL) return (cache.swapDb ??= Promise.resolve(neon()));
 const db = await (cache.swapDb ??= local());
 const count = await migrationCount();
 if (await cache.swapMigrated !== count) {
  cache.swapMigrated = (async () => {
   const { migrate } = await import('drizzle-orm/pglite/migrator');
   const { join } = await import('node:path');
   await migrate(db as never, { migrationsFolder: join(process.cwd(), 'drizzle') });
   return count;
  })();
  await cache.swapMigrated;
 }
 return db;
}
