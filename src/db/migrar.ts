import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const carpetaMigraciones = fileURLToPath(new URL('./migraciones', import.meta.url));

/** Aplica todas las migraciones pendientes en la BD indicada. */
export async function aplicarMigraciones(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: carpetaMigraciones });
  } finally {
    await pool.end();
  }
}
