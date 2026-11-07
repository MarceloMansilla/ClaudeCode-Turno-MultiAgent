import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { aplicarMigraciones } from '../../src/db/migrar';

declare module 'vitest' {
  export interface ProvidedContext {
    urlBd: string;
  }
}

let contenedor: StartedPostgreSqlContainer | undefined;

/** Arranca un PostgreSQL 18 real, aplica las migraciones y comparte su URL con los tests. */
export default async function preparar(proyecto: TestProject) {
  contenedor = await new PostgreSqlContainer('postgres:18').start();
  const url = contenedor.getConnectionUri();
  await aplicarMigraciones(url);
  proyecto.provide('urlBd', url);

  return async () => {
    await contenedor?.stop();
  };
}
